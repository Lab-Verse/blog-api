"""
WordPress XML Export to JSON Extractor
Extracts all posts with categories and authors from WordPress XML export file.
"""

import xml.etree.ElementTree as ET
import json
import re
from html import unescape


def extract_cdata(text):
    """Extract text from CDATA sections and clean it."""
    if text is None:
        return ""
    # Remove CDATA markers if present
    text = re.sub(r'<!\[CDATA\[(.*?)\]\]>', r'\1', text, flags=re.DOTALL)
    return unescape(text.strip())


def parse_wordpress_export(xml_file):
    """Parse WordPress XML export and extract posts, categories, and authors."""
    
    # Define namespaces used in WordPress export
    namespaces = {
        'wp': 'http://wordpress.org/export/1.2/',
        'dc': 'http://purl.org/dc/elements/1.1/',
        'content': 'http://purl.org/rss/1.0/modules/content/',
        'excerpt': 'http://wordpress.org/export/1.2/excerpt/',
    }
    
    print(f"Parsing XML file: {xml_file}")
    
    # Parse the XML file
    tree = ET.parse(xml_file)
    root = tree.getroot()
    
    # Find the channel element
    channel = root.find('channel')
    
    # Extract authors
    authors = {}
    for author in channel.findall('wp:author', namespaces):
        author_id = author.find('wp:author_id', namespaces)
        author_login = author.find('wp:author_login', namespaces)
        author_email = author.find('wp:author_email', namespaces)
        author_display_name = author.find('wp:author_display_name', namespaces)
        author_first_name = author.find('wp:author_first_name', namespaces)
        author_last_name = author.find('wp:author_last_name', namespaces)
        
        if author_login is not None and author_login.text:
            login = extract_cdata(author_login.text)
            authors[login] = {
                'id': extract_cdata(author_id.text) if author_id is not None else '',
                'login': login,
                'email': extract_cdata(author_email.text) if author_email is not None else '',
                'display_name': extract_cdata(author_display_name.text) if author_display_name is not None else '',
                'first_name': extract_cdata(author_first_name.text) if author_first_name is not None else '',
                'last_name': extract_cdata(author_last_name.text) if author_last_name is not None else '',
            }
    
    print(f"Found {len(authors)} authors")
    
    # Extract posts
    posts = []
    all_categories = set()
    
    for item in channel.findall('item'):
        # Check if this is a post (not page, attachment, etc.)
        post_type = item.find('wp:post_type', namespaces)
        post_type_text = extract_cdata(post_type.text) if post_type is not None else ''
        
        # Only process posts (you can modify this to include pages if needed)
        if post_type_text != 'post':
            continue
        
        # Extract basic post information
        title = item.find('title')
        link = item.find('link')
        pub_date = item.find('pubDate')
        creator = item.find('dc:creator', namespaces)
        guid = item.find('guid')
        description = item.find('description')
        content = item.find('content:encoded', namespaces)
        excerpt = item.find('excerpt:encoded', namespaces)
        post_id = item.find('wp:post_id', namespaces)
        post_date = item.find('wp:post_date', namespaces)
        post_date_gmt = item.find('wp:post_date_gmt', namespaces)
        post_modified = item.find('wp:post_modified', namespaces)
        post_modified_gmt = item.find('wp:post_modified_gmt', namespaces)
        status = item.find('wp:status', namespaces)
        post_name = item.find('wp:post_name', namespaces)
        
        # Extract categories and tags
        categories = []
        tags = []
        for category in item.findall('category'):
            domain = category.get('domain', '')
            nicename = category.get('nicename', '')
            category_name = extract_cdata(category.text) if category.text else ''
            
            if domain == 'category':
                categories.append({
                    'name': category_name,
                    'slug': nicename
                })
                all_categories.add(category_name)
            elif domain == 'post_tag':
                tags.append({
                    'name': category_name,
                    'slug': nicename
                })
        
        # Get author information
        creator_login = extract_cdata(creator.text) if creator is not None else ''
        author_info = authors.get(creator_login, {'login': creator_login})
        
        # Build post object
        post = {
            'id': extract_cdata(post_id.text) if post_id is not None else '',
            'title': extract_cdata(title.text) if title is not None else '',
            'link': link.text if link is not None else '',
            'pub_date': pub_date.text if pub_date is not None else '',
            'post_date': extract_cdata(post_date.text) if post_date is not None else '',
            'post_date_gmt': extract_cdata(post_date_gmt.text) if post_date_gmt is not None else '',
            'post_modified': extract_cdata(post_modified.text) if post_modified is not None else '',
            'post_modified_gmt': extract_cdata(post_modified_gmt.text) if post_modified_gmt is not None else '',
            'status': extract_cdata(status.text) if status is not None else '',
            'post_name': extract_cdata(post_name.text) if post_name is not None else '',
            'guid': guid.text if guid is not None else '',
            'description': extract_cdata(description.text) if description is not None else '',
            'content': extract_cdata(content.text) if content is not None else '',
            'excerpt': extract_cdata(excerpt.text) if excerpt is not None else '',
            'author': author_info,
            'categories': categories,
            'tags': tags,
        }
        
        posts.append(post)
    
    print(f"Found {len(posts)} posts")
    print(f"Found {len(all_categories)} unique categories")
    
    return {
        'site_info': {
            'title': extract_cdata(channel.find('title').text) if channel.find('title') is not None else '',
            'link': channel.find('link').text if channel.find('link') is not None else '',
            'description': extract_cdata(channel.find('description').text) if channel.find('description') is not None else '',
            'language': channel.find('language').text if channel.find('language') is not None else '',
        },
        'authors': list(authors.values()),
        'categories': sorted(list(all_categories)),
        'total_posts': len(posts),
        'posts': posts
    }


def main():
    # Input and output files
    xml_file = r'c:\Users\artte\Downloads\theworldambassador.WordPress.2026-02-14.xml'
    json_file = r'c:\Users\artte\Downloads\theworldambassador_posts.json'
    
    # Parse the XML file
    data = parse_wordpress_export(xml_file)
    
    # Save to JSON file
    print(f"\nSaving to JSON file: {json_file}")
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\nExtraction complete!")
    print(f"Total posts extracted: {data['total_posts']}")
    print(f"Total authors: {len(data['authors'])}")
    print(f"Total unique categories: {len(data['categories'])}")
    
    # Print summary of posts by status
    status_counts = {}
    for post in data['posts']:
        status = post['status']
        status_counts[status] = status_counts.get(status, 0) + 1
    
    print(f"\nPosts by status:")
    for status, count in sorted(status_counts.items()):
        print(f"  {status}: {count}")
    
    # Print summary of posts by author
    author_counts = {}
    for post in data['posts']:
        author = post['author'].get('display_name') or post['author'].get('login', 'Unknown')
        author_counts[author] = author_counts.get(author, 0) + 1
    
    print(f"\nPosts by author:")
    for author, count in sorted(author_counts.items(), key=lambda x: -x[1]):
        print(f"  {author}: {count}")


if __name__ == '__main__':
    main()
