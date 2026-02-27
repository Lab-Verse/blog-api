"""
WordPress Media → Cloudflare R2 Uploader
Downloads all attachment images from WordPress XML export and uploads to Cloudflare R2.
Outputs media_mapping.json for server-side DB import.

Usage:
    pip install boto3 requests
    python upload_media_to_r2.py

Resumable: Already-uploaded files (in output JSON) are skipped on re-run.
"""

import xml.etree.ElementTree as ET
import json
import os
import re
import time
import mimetypes
from concurrent.futures import ThreadPoolExecutor, as_completed
from html import unescape
from urllib.parse import unquote

import boto3
import requests

# ─── Configuration ────────────────────────────────────────────────────────────

# Cloudflare R2 credentials
R2_ENDPOINT = "https://1522db3fc1503c10025a19f02b1fbc38.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID = "19d7c223e2ab9af4d42494482326beef"
R2_SECRET_ACCESS_KEY = "2451deb760b65bfc23bfc00d6b34f6dc7b6f28cb883dd09044104d03e3b82bdf"
R2_BUCKET_NAME = "blog"
R2_PUBLIC_URL = "https://pub-b3abd4448aa7438db921404307c0e985.r2.dev"

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
XML_FILE = os.path.join(SCRIPT_DIR, "theworldambassador.WordPress.2026-02-14.xml")
DOWNLOAD_DIR = os.path.join(SCRIPT_DIR, "wp_media_downloads")
OUTPUT_JSON = os.path.join(SCRIPT_DIR, "media_mapping.json")

# Upload config
R2_FOLDER = "wordpress-media"
R2_VARIANT_FOLDER = "wordpress-media/variants"
BATCH_SIZE = 5  # Concurrent downloads/uploads
REQUEST_TIMEOUT = 60  # seconds

# WordPress XML namespaces
WP_NS = {
    'wp': 'http://wordpress.org/export/1.2/',
    'dc': 'http://purl.org/dc/elements/1.1/',
    'content': 'http://purl.org/rss/1.0/modules/content/',
    'excerpt': 'http://wordpress.org/export/1.2/excerpt/',
}


# ─── S3 Client ────────────────────────────────────────────────────────────────

s3_client = boto3.client(
    's3',
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    region_name='auto',
)


# ─── Parse WordPress XML ─────────────────────────────────────────────────────

def extract_cdata(element, tag, ns=None):
    """Extract text from an XML element, handling CDATA."""
    if ns:
        el = element.find(tag, ns)
    else:
        el = element.find(tag)
    if el is not None and el.text:
        return unescape(el.text.strip())
    return ""


def parse_attachments(xml_file):
    """Parse WordPress XML and return list of attachment dicts + featured image map."""
    print(f"📄 Parsing XML: {xml_file}")
    tree = ET.parse(xml_file)
    root = tree.getroot()
    channel = root.find('channel')

    attachments = []
    featured_image_map = {}  # post_wp_id -> attachment_wp_id
    post_contents = {}  # wp_id -> content (for variant URL extraction)

    for item in channel.findall('item'):
        post_type = extract_cdata(item, 'wp:post_type', WP_NS)
        wp_post_id = extract_cdata(item, 'wp:post_id', WP_NS)

        if post_type == 'attachment':
            url = extract_cdata(item, 'wp:attachment_url', WP_NS)
            if not url:
                continue

            title_el = item.find('title')
            title = title_el.text if title_el is not None and title_el.text else ""

            post_parent = extract_cdata(item, 'wp:post_parent', WP_NS) or "0"
            post_date = extract_cdata(item, 'wp:post_date', WP_NS) or ""

            # Derive filename from URL
            filename = os.path.basename(url.split('?')[0])
            try:
                filename = unquote(filename)
            except Exception:
                pass

            # Infer MIME type
            ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
            mime_map = {
                'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
                'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml',
                'mp4': 'video/mp4', 'mov': 'video/quicktime', 'avi': 'video/x-msvideo',
                'pdf': 'application/pdf',
            }
            mime_type = mime_map.get(ext, 'application/octet-stream')

            attachments.append({
                'wpId': wp_post_id,
                'url': url,
                'filename': filename,
                'title': title,
                'mimeType': mime_type,
                'postParent': post_parent,
                'postDate': post_date,
            })

        elif post_type == 'post':
            # Extract _thumbnail_id for featured images
            for meta in item.findall('wp:postmeta', WP_NS):
                meta_key = extract_cdata(meta, 'wp:meta_key', WP_NS)
                meta_value = extract_cdata(meta, 'wp:meta_value', WP_NS)
                if meta_key == '_thumbnail_id' and meta_value:
                    featured_image_map[wp_post_id] = meta_value

            # Extract post content for variant URL detection
            content = extract_cdata(item, 'content:encoded', WP_NS)
            if content:
                post_contents[wp_post_id] = content

    print(f"   Found {len(attachments)} attachments, "
          f"{len(featured_image_map)} featured image mappings, "
          f"{len(post_contents)} posts with content")

    return attachments, featured_image_map, post_contents


def extract_variant_urls(post_contents):
    """Extract variant image URLs from post content that aren't in the attachment list."""
    wp_url_regex = re.compile(
        r'https?://twa\.com\.pk/wp-content/uploads/[^\s"\'<>)]+', re.IGNORECASE
    )
    variant_suffix_regex = re.compile(
        r'-(\d+x\d+)(-\d+)?\.(jpg|jpeg|png|gif|webp)$', re.IGNORECASE
    )

    all_urls = set()
    variant_to_original = {}

    for content in post_contents.values():
        matches = wp_url_regex.findall(content)
        for url in matches:
            normalized = re.sub(r'^http://', 'https://', url)
            all_urls.add(normalized)

            variant_match = variant_suffix_regex.search(normalized)
            if variant_match:
                original = variant_suffix_regex.sub(
                    f'.{variant_match.group(3)}', normalized
                )
                variant_to_original[normalized] = original

    return all_urls, variant_to_original


# ─── Download + Upload ────────────────────────────────────────────────────────

def safe_filename(filename):
    """Sanitize filename for R2 storage."""
    return re.sub(r'[^a-zA-Z0-9._-]', '_', filename).lower()


def download_file(url):
    """Download a file from URL. Returns bytes or None."""
    headers = {'User-Agent': 'Mozilla/5.0 (compatible; BlogImporter/1.0)'}
    for scheme_url in [url, url.replace('https://', 'http://'), url.replace('http://', 'https://')]:
        try:
            resp = requests.get(scheme_url, timeout=REQUEST_TIMEOUT, headers=headers)
            if resp.status_code == 200:
                return resp.content
        except requests.RequestException:
            continue
    return None


def upload_to_r2(data, filename, folder):
    """Upload bytes to Cloudflare R2. Returns public URL."""
    key = f"{folder}/{filename}"

    # Infer content type
    content_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'

    s3_client.put_object(
        Bucket=R2_BUCKET_NAME,
        Key=key,
        Body=data,
        ContentType=content_type,
    )

    return f"{R2_PUBLIC_URL}/{key}"


def process_attachment(att, existing_mapping):
    """Download attachment from WP and upload to R2. Returns mapping entry or None."""
    wp_id = att['wpId']

    # Skip if already processed (resumability)
    if wp_id in existing_mapping:
        return existing_mapping[wp_id], 'skipped'

    url = att['url']
    filename = att['filename']

    # Download
    data = download_file(url)
    if data is None:
        return None, f'download_failed: {url}'

    # Upload to R2
    timestamp = int(time.time() * 1000)
    upload_filename = f"{timestamp}-{safe_filename(filename)}"
    r2_url = upload_to_r2(data, upload_filename, R2_FOLDER)

    # Save locally too (backup)
    local_path = os.path.join(DOWNLOAD_DIR, upload_filename)
    os.makedirs(os.path.dirname(local_path), exist_ok=True)
    with open(local_path, 'wb') as f:
        f.write(data)

    mapping_entry = {
        'wpId': wp_id,
        'originalUrl': att['url'],
        'r2Url': r2_url,
        'filename': att['filename'],
        'filePath': f"{R2_FOLDER}/{upload_filename}",
        'mimeType': att['mimeType'],
        'fileSize': len(data),
        'title': att.get('title', ''),
    }

    return mapping_entry, 'synced'


def process_variant(variant_url, original_url, attachment_mappings, existing_variants):
    """Process a variant URL — either map to original's R2 URL or download separately."""

    # Skip if already processed
    if variant_url in existing_variants:
        return existing_variants[variant_url], 'skipped'

    # Check if the original was already uploaded — if so, reuse its R2 URL
    for entry in attachment_mappings.values():
        orig_normalized = re.sub(r'^http://', 'https://', entry['originalUrl'])
        if orig_normalized == original_url or entry['originalUrl'] == original_url:
            variant_entry = {
                'variantUrl': variant_url,
                'originalUrl': original_url,
                'r2Url': entry['r2Url'],
                'mappedToOriginal': True,
            }
            return variant_entry, 'mapped'

    # Original not found — download variant directly
    data = download_file(variant_url)
    if data is None:
        return None, f'download_failed: {variant_url}'

    filename = os.path.basename(variant_url.split('?')[0])
    timestamp = int(time.time() * 1000)
    upload_filename = f"{timestamp}-{safe_filename(filename)}"
    r2_url = upload_to_r2(data, upload_filename, R2_VARIANT_FOLDER)

    variant_entry = {
        'variantUrl': variant_url,
        'originalUrl': original_url,
        'r2Url': r2_url,
        'mappedToOriginal': False,
        'fileSize': len(data),
    }

    return variant_entry, 'uploaded'


# ─── Save Progress ────────────────────────────────────────────────────────────

def save_mapping(attachments_map, variants_map, featured_image_map, failed_urls):
    """Save mapping to JSON file (called after each batch for resumability)."""
    output = {
        'generatedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'totalAttachments': len(attachments_map),
        'totalVariants': len(variants_map),
        'totalFailed': len(failed_urls),
        'featuredImageMap': featured_image_map,
        'attachments': list(attachments_map.values()),
        'variants': list(variants_map.values()),
        'failedUrls': failed_urls,
    }

    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    # Load existing mapping for resumability
    existing_mapping = {}
    existing_variants = {}
    if os.path.exists(OUTPUT_JSON):
        with open(OUTPUT_JSON, 'r') as f:
            existing = json.load(f)
            for entry in existing.get('attachments', []):
                existing_mapping[entry['wpId']] = entry
            for entry in existing.get('variants', []):
                existing_variants[entry['variantUrl']] = entry
        print(f"📂 Loaded existing mapping: {len(existing_mapping)} attachments, "
              f"{len(existing_variants)} variants")

    os.makedirs(DOWNLOAD_DIR, exist_ok=True)

    # Phase 1: Parse XML
    attachments, featured_image_map, post_contents = parse_attachments(XML_FILE)

    # Phase 2A: Download + Upload attachments
    print(f"\n🚀 Processing {len(attachments)} attachments (batch size: {BATCH_SIZE})...")
    synced = 0
    skipped = 0
    failed = 0
    failed_urls = []

    for i in range(0, len(attachments), BATCH_SIZE):
        batch = attachments[i:i + BATCH_SIZE]

        with ThreadPoolExecutor(max_workers=BATCH_SIZE) as executor:
            futures = {
                executor.submit(process_attachment, att, existing_mapping): att
                for att in batch
            }

            for future in as_completed(futures):
                att = futures[future]
                try:
                    result, status = future.result()
                    if status == 'synced':
                        existing_mapping[att['wpId']] = result
                        synced += 1
                    elif status == 'skipped':
                        skipped += 1
                    else:
                        failed += 1
                        failed_urls.append(status)
                except Exception as e:
                    failed += 1
                    failed_urls.append(f"{att['url']}: {str(e)}")

        # Progress update
        total_done = synced + skipped + failed
        print(f"   Batch {i // BATCH_SIZE + 1}: "
              f"{total_done}/{len(attachments)} "
              f"(synced={synced}, skipped={skipped}, failed={failed})")

        # Save progress after each batch (resumability)
        save_mapping(existing_mapping, existing_variants, featured_image_map, failed_urls)

    print(f"\n✅ Attachments done: synced={synced}, skipped={skipped}, failed={failed}")

    # Phase 2B: Handle variant URLs from post content
    all_content_urls, variant_to_original = extract_variant_urls(post_contents)

    # Filter variants that aren't already covered by attachment mappings
    attachment_urls = set()
    for entry in existing_mapping.values():
        attachment_urls.add(re.sub(r'^http://', 'https://', entry['originalUrl']))
        attachment_urls.add(entry['originalUrl'])

    variants_to_process = []
    for variant_url, original_url in variant_to_original.items():
        if variant_url not in attachment_urls:
            variants_to_process.append((variant_url, original_url))

    if variants_to_process:
        print(f"\n🔗 Processing {len(variants_to_process)} variant URLs...")
        v_mapped = 0
        v_uploaded = 0
        v_skipped = 0
        v_failed = 0

        for i in range(0, len(variants_to_process), BATCH_SIZE):
            batch = variants_to_process[i:i + BATCH_SIZE]

            with ThreadPoolExecutor(max_workers=BATCH_SIZE) as executor:
                futures = {
                    executor.submit(
                        process_variant, vurl, ourl,
                        existing_mapping, existing_variants
                    ): (vurl, ourl)
                    for vurl, ourl in batch
                }

                for future in as_completed(futures):
                    vurl, ourl = futures[future]
                    try:
                        result, status = future.result()
                        if status == 'mapped':
                            existing_variants[vurl] = result
                            v_mapped += 1
                        elif status == 'uploaded':
                            existing_variants[vurl] = result
                            v_uploaded += 1
                        elif status == 'skipped':
                            v_skipped += 1
                        else:
                            v_failed += 1
                    except Exception as e:
                        v_failed += 1

            save_mapping(existing_mapping, existing_variants, featured_image_map, failed_urls)

        print(f"   Variants: mapped={v_mapped}, uploaded={v_uploaded}, "
              f"skipped={v_skipped}, failed={v_failed}")

    # Final save
    save_mapping(existing_mapping, existing_variants, featured_image_map, failed_urls)

    print(f"\n{'='*60}")
    print(f"  ✅ COMPLETE!")
    print(f"  Attachments: {len(existing_mapping)}")
    print(f"  Variants:    {len(existing_variants)}")
    print(f"  Failed:      {len(failed_urls)}")
    print(f"  Output:      {OUTPUT_JSON}")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
