"""
Upload extracted WordPress images to Cloudflare R2.
Reads local extracted-images/ folder, matches against WordPress XML attachments,
uploads to R2, and outputs media_mapping.json for server-side DB import.

Usage:
    pip install boto3
    python upload_local_to_r2.py

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

# ─── Configuration ────────────────────────────────────────────────────────────

# Cloudflare R2 credentials
R2_ENDPOINT = "https://1522db3fc1503c10025a19f02b1fbc38.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID = "19d7c223e2ab9af4d42494482326beef"
R2_SECRET_ACCESS_KEY = "2451deb760b65bfc23bfc00d6b34f6dc7b6f28cb883dd09044104d03e3b82bdf"
R2_BUCKET_NAME = "bolg"
R2_PUBLIC_URL = "https://pub-b3abd4448aa7438db921404307c0e985.r2.dev"

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
XML_FILE = os.path.join(SCRIPT_DIR, "theworldambassador.WordPress.2026-02-14.xml")
IMAGES_DIR = os.path.join(SCRIPT_DIR, "..", "extracted-images")
OUTPUT_JSON = os.path.join(SCRIPT_DIR, "media_mapping.json")

# Upload config
R2_FOLDER = "wordpress-media"
R2_VARIANT_FOLDER = "wordpress-media/variants"
BATCH_SIZE = 10  # Concurrent uploads
UPLOAD_ORIGINALS_ONLY = False  # Set True to skip variant files

# WordPress XML namespaces
WP_NS = {
    'wp': 'http://wordpress.org/export/1.2/',
    'content': 'http://purl.org/rss/1.0/modules/content/',
}

# Variant suffix regex
VARIANT_SUFFIX_RE = re.compile(r'-\d+x\d+(-\d+)?\.(jpg|jpeg|png|gif|webp|bmp)$', re.IGNORECASE)


# ─── S3 Client ────────────────────────────────────────────────────────────────

s3_client = boto3.client(
    's3',
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    region_name='auto',
)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def extract_cdata(element, tag, ns=None):
    if ns:
        el = element.find(tag, ns)
    else:
        el = element.find(tag)
    if el is not None and el.text:
        return unescape(el.text.strip())
    return ""


def safe_filename(filename):
    return re.sub(r'[^a-zA-Z0-9._-]', '_', filename).lower()


def get_mime_type(filename):
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    mime_map = {
        'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
        'gif': 'image/gif', 'webp': 'image/webp', 'svg': 'image/svg+xml',
        'mp4': 'video/mp4', 'mov': 'video/quicktime', 'avi': 'video/x-msvideo',
        'pdf': 'application/pdf', 'bmp': 'image/bmp',
    }
    return mime_map.get(ext, mimetypes.guess_type(filename)[0] or 'application/octet-stream')


def upload_to_r2(local_path, r2_filename, folder):
    """Upload a local file to R2. Returns public URL."""
    key = f"{folder}/{r2_filename}"
    content_type = get_mime_type(r2_filename)

    with open(local_path, 'rb') as f:
        s3_client.put_object(
            Bucket=R2_BUCKET_NAME,
            Key=key,
            Body=f,
            ContentType=content_type,
        )

    return f"{R2_PUBLIC_URL}/{key}"


# ─── Parse XML ────────────────────────────────────────────────────────────────

def parse_xml():
    """Parse WordPress XML, return attachments list and featured image map."""
    print(f"📄 Parsing XML: {XML_FILE}")
    tree = ET.parse(XML_FILE)
    root = tree.getroot()
    channel = root.find('channel')

    attachments = []
    featured_image_map = {}
    post_contents = {}

    for item in channel.findall('item'):
        post_type = extract_cdata(item, 'wp:post_type', WP_NS)
        wp_id = extract_cdata(item, 'wp:post_id', WP_NS)

        if post_type == 'attachment':
            url = extract_cdata(item, 'wp:attachment_url', WP_NS)
            if not url:
                continue
            title_el = item.find('title')
            title = title_el.text if title_el is not None and title_el.text else ""
            post_parent = extract_cdata(item, 'wp:post_parent', WP_NS) or "0"

            filename = unquote(os.path.basename(url.split('?')[0]))
            mime_type = get_mime_type(filename)

            attachments.append({
                'wpId': wp_id,
                'url': url,
                'filename': filename,
                'title': title,
                'mimeType': mime_type,
                'postParent': post_parent,
            })

        elif post_type == 'post':
            for meta in item.findall('wp:postmeta', WP_NS):
                mk = extract_cdata(meta, 'wp:meta_key', WP_NS)
                mv = extract_cdata(meta, 'wp:meta_value', WP_NS)
                if mk == '_thumbnail_id' and mv:
                    featured_image_map[wp_id] = mv

            content = extract_cdata(item, 'content:encoded', WP_NS)
            if content:
                post_contents[wp_id] = content

    print(f"   {len(attachments)} attachments, {len(featured_image_map)} featured, {len(post_contents)} posts")
    return attachments, featured_image_map, post_contents


# ─── Index Local Files ────────────────────────────────────────────────────────

def index_local_files():
    """Build lookup maps for local files."""
    print(f"📂 Indexing local files: {os.path.abspath(IMAGES_DIR)}")

    # rel_path -> full_path
    by_path = {}
    # filename -> list of full_paths
    by_name = {}

    for root, dirs, files in os.walk(IMAGES_DIR):
        for f in files:
            full = os.path.join(root, f)
            rel = os.path.relpath(full, IMAGES_DIR).replace("\\", "/")
            by_path[rel] = full
            by_name.setdefault(f, []).append(full)

    print(f"   {len(by_path)} files indexed")
    return by_path, by_name


def find_local_file(url, by_path, by_name):
    """Find local file for a WordPress URL. Returns (local_path, rel_path) or (None, None)."""
    rel = url.replace('https://twa.com.pk/wp-content/uploads/', '')
    rel = rel.replace('http://twa.com.pk/wp-content/uploads/', '')
    rel = unquote(rel)
    filename = os.path.basename(rel)

    # Try exact path
    if rel in by_path:
        return by_path[rel], rel

    # Try without 2023/ prefix (folders 10,11,12 at root level)
    if rel.startswith('2023/'):
        rel_no_year = rel[5:]  # strip "2023/"
        if rel_no_year in by_path:
            return by_path[rel_no_year], rel_no_year

    # Try by filename only
    if filename in by_name:
        full = by_name[filename][0]
        found_rel = os.path.relpath(full, IMAGES_DIR).replace("\\", "/")
        return full, found_rel

    return None, None


# ─── Extract Variant URLs from Content ────────────────────────────────────────

def extract_content_variants(post_contents):
    """Find variant image URLs in post content and map to originals."""
    wp_url_re = re.compile(r'https?://twa\.com\.pk/wp-content/uploads/[^\s"\'<>)]+', re.IGNORECASE)
    variant_re = re.compile(r'-(\d+x\d+)(-\d+)?\.(jpg|jpeg|png|gif|webp)$', re.IGNORECASE)

    all_urls = set()
    variant_to_original = {}

    for content in post_contents.values():
        for url in wp_url_re.findall(content):
            normalized = re.sub(r'^http://', 'https://', url)
            all_urls.add(normalized)
            m = variant_re.search(normalized)
            if m:
                original = variant_re.sub(f'.{m.group(3)}', normalized)
                variant_to_original[normalized] = original

    return all_urls, variant_to_original


# ─── Upload Worker ────────────────────────────────────────────────────────────

def upload_attachment(att, by_path, by_name, existing_mapping):
    """Upload a single attachment to R2. Returns (mapping_entry, status)."""
    wp_id = att['wpId']

    # Skip if already uploaded
    if wp_id in existing_mapping:
        return existing_mapping[wp_id], 'skipped'

    local_path, rel = find_local_file(att['url'], by_path, by_name)
    if not local_path:
        return None, f'not_found: {att["url"]}'

    file_size = os.path.getsize(local_path)
    timestamp = int(time.time() * 1000)
    upload_name = f"{timestamp}-{safe_filename(att['filename'])}"

    try:
        r2_url = upload_to_r2(local_path, upload_name, R2_FOLDER)
    except Exception as e:
        return None, f'upload_failed: {att["url"]}: {str(e)}'

    entry = {
        'wpId': wp_id,
        'originalUrl': att['url'],
        'r2Url': r2_url,
        'filename': att['filename'],
        'filePath': f"{R2_FOLDER}/{upload_name}",
        'mimeType': att['mimeType'],
        'fileSize': file_size,
        'title': att.get('title', ''),
    }
    return entry, 'synced'


def upload_variant_file(variant_url, original_url, by_path, by_name, att_mapping, existing_variants):
    """Upload a variant image or map to original's R2 URL."""
    if variant_url in existing_variants:
        return existing_variants[variant_url], 'skipped'

    # If the original was uploaded, map variant to original's R2 URL
    for entry in att_mapping.values():
        orig_norm = re.sub(r'^http://', 'https://', entry['originalUrl'])
        if orig_norm == original_url or entry['originalUrl'] == original_url:
            return {
                'variantUrl': variant_url,
                'originalUrl': original_url,
                'r2Url': entry['r2Url'],
                'mappedToOriginal': True,
            }, 'mapped'

    # Try to find and upload the variant file locally
    local_path, rel = find_local_file(variant_url, by_path, by_name)
    if not local_path:
        return None, f'not_found: {variant_url}'

    filename = os.path.basename(variant_url.split('?')[0])
    timestamp = int(time.time() * 1000)
    upload_name = f"{timestamp}-{safe_filename(filename)}"

    try:
        r2_url = upload_to_r2(local_path, upload_name, R2_VARIANT_FOLDER)
    except Exception as e:
        return None, f'upload_failed: {variant_url}: {str(e)}'

    return {
        'variantUrl': variant_url,
        'originalUrl': original_url,
        'r2Url': r2_url,
        'mappedToOriginal': False,
        'fileSize': os.path.getsize(local_path),
    }, 'uploaded'


# ─── Save Progress ────────────────────────────────────────────────────────────

def save_mapping(att_map, var_map, featured_map, failed_urls):
    output = {
        'generatedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'totalAttachments': len(att_map),
        'totalVariants': len(var_map),
        'totalFailed': len(failed_urls),
        'featuredImageMap': featured_map,
        'attachments': list(att_map.values()),
        'variants': list(var_map.values()),
        'failedUrls': failed_urls,
    }
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    # Load existing mapping for resumability
    existing_att = {}
    existing_var = {}
    if os.path.exists(OUTPUT_JSON):
        with open(OUTPUT_JSON, encoding='utf-8') as f:
            existing = json.load(f)
            for e in existing.get('attachments', []):
                existing_att[e['wpId']] = e
            for e in existing.get('variants', []):
                existing_var[e['variantUrl']] = e
        print(f"📂 Loaded existing: {len(existing_att)} attachments, {len(existing_var)} variants")

    # Parse XML
    attachments, featured_image_map, post_contents = parse_xml()

    # Index local files
    by_path, by_name = index_local_files()

    # ─── Upload Attachments ───────────────────────────────────────────────
    print(f"\n🚀 Uploading {len(attachments)} attachments to R2 (batch size: {BATCH_SIZE})...")
    synced = 0
    skipped = 0
    not_found = 0
    failed = 0
    failed_urls = []

    for i in range(0, len(attachments), BATCH_SIZE):
        batch = attachments[i:i + BATCH_SIZE]

        with ThreadPoolExecutor(max_workers=BATCH_SIZE) as executor:
            futures = {
                executor.submit(upload_attachment, att, by_path, by_name, existing_att): att
                for att in batch
            }
            for future in as_completed(futures):
                att = futures[future]
                try:
                    result, status = future.result()
                    if status == 'synced':
                        existing_att[att['wpId']] = result
                        synced += 1
                    elif status == 'skipped':
                        skipped += 1
                    elif status.startswith('not_found'):
                        not_found += 1
                        failed_urls.append(status)
                    else:
                        failed += 1
                        failed_urls.append(status)
                except Exception as e:
                    failed += 1
                    failed_urls.append(f"error: {att['url']}: {str(e)}")

        total = synced + skipped + not_found + failed
        print(f"   Batch {i // BATCH_SIZE + 1}: {total}/{len(attachments)} "
              f"(uploaded={synced}, skipped={skipped}, not_found={not_found}, failed={failed})")

        # Save after each batch
        save_mapping(existing_att, existing_var, featured_image_map, failed_urls)

    print(f"\n✅ Attachments: uploaded={synced}, skipped={skipped}, not_found={not_found}, failed={failed}")

    # ─── Upload Variant Images ────────────────────────────────────────────
    all_content_urls, variant_to_original = extract_content_variants(post_contents)

    # URLs already covered by attachments
    covered = set()
    for e in existing_att.values():
        covered.add(re.sub(r'^http://', 'https://', e['originalUrl']))
        covered.add(e['originalUrl'])

    variants_to_do = [(v, o) for v, o in variant_to_original.items() if v not in covered]

    if variants_to_do:
        print(f"\n🔗 Processing {len(variants_to_do)} variant URLs...")
        v_mapped = v_uploaded = v_skipped = v_not_found = v_failed = 0

        for i in range(0, len(variants_to_do), BATCH_SIZE):
            batch = variants_to_do[i:i + BATCH_SIZE]

            with ThreadPoolExecutor(max_workers=BATCH_SIZE) as executor:
                futures = {
                    executor.submit(upload_variant_file, vurl, ourl, by_path, by_name, existing_att, existing_var): (vurl, ourl)
                    for vurl, ourl in batch
                }
                for future in as_completed(futures):
                    vurl, ourl = futures[future]
                    try:
                        result, status = future.result()
                        if status == 'mapped':
                            existing_var[vurl] = result
                            v_mapped += 1
                        elif status == 'uploaded':
                            existing_var[vurl] = result
                            v_uploaded += 1
                        elif status == 'skipped':
                            v_skipped += 1
                        elif 'not_found' in status:
                            v_not_found += 1
                        else:
                            v_failed += 1
                    except Exception as e:
                        v_failed += 1

            save_mapping(existing_att, existing_var, featured_image_map, failed_urls)

        print(f"   Variants: mapped={v_mapped}, uploaded={v_uploaded}, "
              f"skipped={v_skipped}, not_found={v_not_found}, failed={v_failed}")

    # Final save
    save_mapping(existing_att, existing_var, featured_image_map, failed_urls)

    print(f"\n{'='*60}")
    print(f"  ✅ COMPLETE!")
    print(f"  Attachments uploaded: {len(existing_att)}")
    print(f"  Variants mapped:     {len(existing_var)}")
    print(f"  Not found locally:   {not_found}")
    print(f"  Failed:              {failed}")
    print(f"  Output:              {OUTPUT_JSON}")
    print(f"{'='*60}")
    print(f"\n  Next step: Copy {OUTPUT_JSON} to server and run:")
    print(f'  curl -X POST http://localhost:3000/import/media/import-mapping \\')
    print(f'    -H "Content-Type: application/json" \\')
    print(f'    -d \'{{')
    print(f'      "mappingJsonPath": "/path/to/media_mapping.json",')
    print(f'      "xmlFilePath": "/path/to/theworldambassador.WordPress.2026-02-14.xml",')
    print(f'      "userId": "YOUR_ADMIN_UUID"')
    print(f"    }}'")


if __name__ == '__main__':
    main()
