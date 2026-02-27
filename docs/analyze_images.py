"""
Analyze extracted-images folder against WordPress XML attachments.
Shows how many XML attachments have corresponding local files.
"""

import xml.etree.ElementTree as ET
import os
from html import unescape
from urllib.parse import unquote

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
XML_FILE = os.path.join(SCRIPT_DIR, "theworldambassador.WordPress.2026-02-14.xml")
IMAGES_DIR = os.path.join(SCRIPT_DIR, "..", "extracted-images")

WP_NS = {
    'wp': 'http://wordpress.org/export/1.2/',
    'content': 'http://purl.org/rss/1.0/modules/content/',
}


def extract_cdata(element, tag, ns=None):
    if ns:
        el = element.find(tag, ns)
    else:
        el = element.find(tag)
    if el is not None and el.text:
        return unescape(el.text.strip())
    return ""


def main():
    # Index all local files
    print(f"Indexing local files in: {os.path.abspath(IMAGES_DIR)}")
    local_files = {}  # relative path -> full path
    local_filenames = {}  # filename only -> list of full paths
    for root, dirs, files in os.walk(IMAGES_DIR):
        for f in files:
            full = os.path.join(root, f)
            rel = os.path.relpath(full, IMAGES_DIR).replace("\\", "/")
            local_files[rel] = full
            local_filenames.setdefault(f, []).append(full)

    print(f"Total local files: {len(local_files)}")

    # Parse XML attachments
    print(f"\nParsing XML: {XML_FILE}")
    tree = ET.parse(XML_FILE)
    root = tree.getroot()
    channel = root.find('channel')

    found = 0
    missing = 0
    found_by_name = 0
    missing_list = []
    attachments = []

    for item in channel.findall('item'):
        post_type = extract_cdata(item, 'wp:post_type', WP_NS)
        if post_type != 'attachment':
            continue

        wp_id = extract_cdata(item, 'wp:post_id', WP_NS)
        url = extract_cdata(item, 'wp:attachment_url', WP_NS)
        if not url:
            continue

        # Extract relative path from URL: 2024/04/filename.jpg
        rel = url.replace('https://twa.com.pk/wp-content/uploads/', '')
        rel = rel.replace('http://twa.com.pk/wp-content/uploads/', '')
        filename = unquote(os.path.basename(rel))

        # Try exact path match
        rel_decoded = unquote(rel)
        # Also try without 2023/ prefix (folders 10,11,12 are at root)
        rel_no_2023 = rel_decoded.replace('2023/', '', 1) if rel_decoded.startswith('2023/') else None

        local_path = None
        if rel_decoded in local_files:
            local_path = local_files[rel_decoded]
            found += 1
        elif rel_no_2023 and rel_no_2023 in local_files:
            local_path = local_files[rel_no_2023]
            found += 1
        elif filename in local_filenames:
            local_path = local_filenames[filename][0]
            found_by_name += 1
        else:
            missing += 1
            if len(missing_list) < 20:
                missing_list.append(rel_decoded)

        attachments.append({
            'wpId': wp_id,
            'url': url,
            'filename': filename,
            'relPath': rel_decoded,
            'localPath': local_path,
        })

    print(f"\n{'='*60}")
    print(f"  XML Attachments:     {len(attachments)}")
    print(f"  Found (exact path):  {found}")
    print(f"  Found (by filename): {found_by_name}")
    print(f"  Missing:             {missing}")
    print(f"  Coverage:            {(found + found_by_name) / len(attachments) * 100:.1f}%")
    print(f"{'='*60}")

    if missing_list:
        print(f"\nSample missing files ({min(20, missing)} shown):")
        for m in missing_list:
            print(f"  {m}")

    # Check which months have files
    print(f"\nMonth folders available:")
    for d in sorted(os.listdir(IMAGES_DIR)):
        full_d = os.path.join(IMAGES_DIR, d)
        if os.path.isdir(full_d):
            sub_count = sum(len(files) for _, _, files in os.walk(full_d))
            subdirs = [s for s in os.listdir(full_d) if os.path.isdir(os.path.join(full_d, s))]
            if subdirs:
                print(f"  {d}/ ({sub_count} files) -> months: {', '.join(sorted(subdirs))}")
            else:
                print(f"  {d}/ ({sub_count} files)")


if __name__ == '__main__':
    main()
