"""
Rebuild media_mapping.json by listing objects already on R2 and matching them
to WordPress XML attachments. Does NOT re-upload anything.
"""

import xml.etree.ElementTree as ET
import json
import os
import re
from html import unescape
from urllib.parse import unquote

import boto3

# ─── Configuration ────────────────────────────────────────────────────────────

R2_ENDPOINT = "https://1522db3fc1503c10025a19f02b1fbc38.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID = "19d7c223e2ab9af4d42494482326beef"
R2_SECRET_ACCESS_KEY = "2451deb760b65bfc23bfc00d6b34f6dc7b6f28cb883dd09044104d03e3b82bdf"
R2_BUCKET_NAME = "bolg"
R2_PUBLIC_URL = "https://pub-b3abd4448aa7438db921404307c0e985.r2.dev"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
XML_FILE = os.path.join(SCRIPT_DIR, "theworldambassador.WordPress.2026-02-14.xml")
IMAGES_DIR = os.path.join(SCRIPT_DIR, "..", "extracted-images")
OUTPUT_JSON = os.path.join(SCRIPT_DIR, "media_mapping.json")

R2_FOLDER = "wordpress-media"
R2_VARIANT_FOLDER = "wordpress-media/variants"

WP_NS = {
    'wp': 'http://wordpress.org/export/1.2/',
    'content': 'http://purl.org/rss/1.0/modules/content/',
}

# ─── S3 Client ────────────────────────────────────────────────────────────────

s3_client = boto3.client(
    's3',
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    region_name='auto',
)


def extract_cdata(element, tag, ns=None):
    el = element.find(tag, ns) if ns else element.find(tag)
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
        'mp4': 'video/mp4', 'mov': 'video/quicktime', 'pdf': 'application/pdf',
        'bmp': 'image/bmp',
    }
    return mime_map.get(ext, 'application/octet-stream')


# ─── List all R2 objects ──────────────────────────────────────────────────────

def list_r2_objects():
    """List all objects in wordpress-media/ on R2."""
    print("📡 Listing R2 objects...")
    objects = {}
    continuation_token = None

    while True:
        kwargs = {'Bucket': R2_BUCKET_NAME, 'Prefix': R2_FOLDER + '/', 'MaxKeys': 1000}
        if continuation_token:
            kwargs['ContinuationToken'] = continuation_token

        resp = s3_client.list_objects_v2(**kwargs)
        for obj in resp.get('Contents', []):
            key = obj['Key']
            size = obj['Size']
            # Extract the safe filename part (after timestamp-)
            basename = key.split('/')[-1]
            # Remove timestamp prefix: "1772165141236-filename.ext" -> "filename.ext"
            match = re.match(r'^\d+-(.+)$', basename)
            safe_name = match.group(1) if match else basename
            objects[safe_name] = {
                'key': key,
                'size': size,
                'url': f"{R2_PUBLIC_URL}/{key}",
            }

        if resp.get('IsTruncated'):
            continuation_token = resp['NextContinuationToken']
        else:
            break

    print(f"   Found {len(objects)} objects on R2")
    return objects


# ─── Parse XML ────────────────────────────────────────────────────────────────

def parse_xml():
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
            filename = unquote(os.path.basename(url.split('?')[0]))
            mime_type = get_mime_type(filename)

            attachments.append({
                'wpId': wp_id,
                'url': url,
                'filename': filename,
                'title': title,
                'mimeType': mime_type,
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


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    attachments, featured_image_map, post_contents = parse_xml()
    r2_objects = list_r2_objects()

    matched_attachments = []
    not_found = []

    for att in attachments:
        safe_name = safe_filename(att['filename'])

        if safe_name in r2_objects:
            r2_obj = r2_objects[safe_name]
            matched_attachments.append({
                'wpId': att['wpId'],
                'originalUrl': att['url'],
                'r2Url': r2_obj['url'],
                'filename': att['filename'],
                'filePath': r2_obj['key'],
                'mimeType': att['mimeType'],
                'fileSize': r2_obj['size'],
                'title': att.get('title', ''),
            })
        else:
            not_found.append(f"not_found: {att['url']}")

    print(f"\n✅ Matched {len(matched_attachments)} attachments to R2 objects")
    print(f"❌ Not found on R2: {len(not_found)}")

    # ─── Variant mapping ─────────────────────────────────────────────────
    wp_url_re = re.compile(r'https?://twa\.com\.pk/wp-content/uploads/[^\s"\'<>)]+', re.IGNORECASE)
    variant_re = re.compile(r'-(\d+x\d+)(-\d+)?\.(jpg|jpeg|png|gif|webp)$', re.IGNORECASE)

    # Build lookup: originalUrl -> r2Url
    orig_to_r2 = {}
    for a in matched_attachments:
        norm = re.sub(r'^http://', 'https://', a['originalUrl'])
        orig_to_r2[norm] = a['r2Url']
        orig_to_r2[a['originalUrl']] = a['r2Url']

    variants = []
    seen_variants = set()

    for content in post_contents.values():
        for url in wp_url_re.findall(content):
            normalized = re.sub(r'^http://', 'https://', url)
            if normalized in seen_variants or normalized in orig_to_r2:
                continue
            seen_variants.add(normalized)

            m = variant_re.search(normalized)
            if m:
                original = variant_re.sub(f'.{m.group(3)}', normalized)
                if original in orig_to_r2:
                    variants.append({
                        'variantUrl': normalized,
                        'originalUrl': original,
                        'r2Url': orig_to_r2[original],
                        'mappedToOriginal': True,
                    })
                else:
                    # Check if variant itself exists on R2
                    vname = safe_filename(unquote(os.path.basename(normalized.split('?')[0])))
                    if vname in r2_objects:
                        r2_obj = r2_objects[vname]
                        variants.append({
                            'variantUrl': normalized,
                            'originalUrl': original,
                            'r2Url': r2_obj['url'],
                            'mappedToOriginal': False,
                            'fileSize': r2_obj['size'],
                        })

    print(f"🔗 Mapped {len(variants)} variant URLs")

    # ─── Save ─────────────────────────────────────────────────────────────
    import time
    output = {
        'generatedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'totalAttachments': len(matched_attachments),
        'totalVariants': len(variants),
        'totalFailed': len(not_found),
        'featuredImageMap': featured_image_map,
        'attachments': matched_attachments,
        'variants': variants,
        'failedUrls': not_found,
    }
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*60}")
    print(f"  ✅ Mapping rebuilt!")
    print(f"  Attachments: {len(matched_attachments)}")
    print(f"  Variants:    {len(variants)}")
    print(f"  Not found:   {len(not_found)}")
    print(f"  Output:      {OUTPUT_JSON}")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()
