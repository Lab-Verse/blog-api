/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { XMLParser } from 'fast-xml-parser';
import * as fs from 'fs';
import { Logger } from '@nestjs/common';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface WpAttachment {
  wpId: string;
  url: string;
  filename: string;
  title: string;
  mimeType: string;
  postParent: string;
  postDate: string;
}

export interface WpParseResult {
  /** wp_post_id → WpAttachment */
  attachmentMap: Map<string, WpAttachment>;
  /** post wp_post_id → attachment wp_post_id (from _thumbnail_id) */
  featuredImageMap: Map<string, string>;
  /** wp_post_id → guid URL (for matching with imported posts) */
  postGuidMap: Map<string, string>;
  /** Total items parsed */
  stats: {
    totalItems: number;
    totalAttachments: number;
    totalPostsWithFeaturedImage: number;
    totalPosts: number;
  };
}

// ─── Helper: Normalize to Array ──────────────────────────────────────────────

function toArray<T>(val: T | T[] | undefined | null): T[] {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}

// ─── Helper: Extract CDATA text ──────────────────────────────────────────────

function cdataText(val: unknown): string {
  if (val === undefined || val === null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object' && val !== null) {
    // fast-xml-parser with cdataPropName stores CDATA as { __cdata: "text" }
    const obj = val as Record<string, unknown>;
    if ('__cdata' in obj) {
      const cdata = obj.__cdata;
      return typeof cdata === 'string' ? cdata : '';
    }
    if ('#text' in obj) {
      const text = obj['#text'];
      return typeof text === 'string'
        ? text
        : typeof text === 'number'
          ? String(text)
          : '';
    }
  }
  return typeof val === 'string' ? val : '';
}

// ─── Main Parser ─────────────────────────────────────────────────────────────

export function parseWordPressXml(xmlFilePath: string): WpParseResult {
  const logger = new Logger('WordPressXmlParser');
  logger.log(`Parsing WordPress XML: ${xmlFilePath}`);

  const xmlContent = fs.readFileSync(xmlFilePath, 'utf-8');

  const parser = new XMLParser({
    ignoreAttributes: false,
    cdataPropName: '__cdata',
    // Preserve namespace prefixes so wp:post_id becomes wp:post_id
    removeNSPrefix: false,
    isArray: (name) => {
      // Ensure items and postmeta are always arrays
      return name === 'item' || name === 'wp:postmeta';
    },
  });

  const parsed = parser.parse(xmlContent);
  const channel = parsed?.rss?.channel;

  if (!channel) {
    throw new Error('Invalid WordPress WXR XML: missing rss > channel');
  }

  const items: any[] = toArray(channel.item);

  const attachmentMap = new Map<string, WpAttachment>();
  const featuredImageMap = new Map<string, string>();
  const postGuidMap = new Map<string, string>();

  let totalPosts = 0;

  for (const item of items) {
    const postType = cdataText(item['wp:post_type']);
    const wpPostId = String(cdataText(item['wp:post_id']) || '');
    // Extract GUID for all items
    const guidRaw = item.guid;
    let guid = '';
    if (typeof guidRaw === 'string') {
      guid = guidRaw;
    } else if (typeof guidRaw === 'object' && guidRaw !== null) {
      const textVal = (guidRaw as Record<string, unknown>)['#text'];
      guid = typeof textVal === 'string' ? textVal : '';
    }

    if (postType === 'attachment') {
      // ─── Build Attachment Entry ──────────────────────────────────────
      const attachmentUrl = cdataText(item['wp:attachment_url']);
      const title = cdataText(item.title) || '';
      const postParent = String(cdataText(item['wp:post_parent']) || '0');
      const postDate = cdataText(item['wp:post_date']) || '';

      // Derive filename from URL
      const filename = attachmentUrl
        ? decodeURIComponent(attachmentUrl.split('/').pop() || '')
        : '';

      // Try to infer mime type from filename
      const ext = filename.split('.').pop()?.toLowerCase() || '';
      const mimeMap: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        mp4: 'video/mp4',
        mov: 'video/quicktime',
        avi: 'video/x-msvideo',
        pdf: 'application/pdf',
      };
      const mimeType = mimeMap[ext] || 'application/octet-stream';

      if (attachmentUrl) {
        attachmentMap.set(wpPostId, {
          wpId: wpPostId,
          url: attachmentUrl,
          filename,
          title,
          mimeType,
          postParent,
          postDate,
        });
      }
    } else if (postType === 'post') {
      totalPosts++;
      postGuidMap.set(wpPostId, guid);

      // ─── Extract _thumbnail_id from postmeta ──────────────────────────
      const postmetas: any[] = toArray(item['wp:postmeta']);
      for (const meta of postmetas) {
        const metaKey = cdataText(meta['wp:meta_key']);
        const metaValue = cdataText(meta['wp:meta_value']);

        if (metaKey === '_thumbnail_id' && metaValue) {
          featuredImageMap.set(wpPostId, metaValue);
        }
      }
    }
  }

  const stats = {
    totalItems: items.length,
    totalAttachments: attachmentMap.size,
    totalPostsWithFeaturedImage: featuredImageMap.size,
    totalPosts,
  };

  logger.log(
    `Parsed: ${stats.totalItems} items, ${stats.totalAttachments} attachments, ` +
      `${stats.totalPosts} posts, ${stats.totalPostsWithFeaturedImage} posts with featured images`,
  );

  return { attachmentMap, featuredImageMap, postGuidMap, stats };
}

// ─── Extract all unique image URLs from post content ─────────────────────────

/**
 * Scans an array of HTML content strings and extracts all unique
 * WordPress wp-content/uploads URLs, including variant-to-original mapping.
 */
export function extractContentImageUrls(contents: string[]): {
  /** All unique wp-content/uploads URLs found in content */
  allUrls: Set<string>;
  /** variant URL → stripped original URL (for URLs with -WxH suffix) */
  variantToOriginalUrl: Map<string, string>;
} {
  const allUrls = new Set<string>();
  const variantToOriginalUrl = new Map<string, string>();

  // Match both http:// and https:// WordPress upload URLs
  const wpUrlRegex =
    /https?:\/\/twa\.com\.pk\/wp-content\/uploads\/[^\s"'<>)]+/gi;

  // Variant suffix regex: -300x200.jpg, -1024x682.png, -2048x405-1.png
  const variantSuffixRegex = /-(\d+x\d+)(-\d+)?\.(jpg|jpeg|png|gif|webp)$/i;

  for (const content of contents) {
    if (!content) continue;

    const matches = content.match(wpUrlRegex);
    if (!matches) continue;

    for (const url of matches) {
      // Normalize to https
      const normalizedUrl = url.replace(/^http:\/\//, 'https://');
      allUrls.add(normalizedUrl);

      // Check if this is a variant URL
      const variantMatch = normalizedUrl.match(variantSuffixRegex);
      if (variantMatch) {
        // Strip the variant suffix to get the original URL
        const originalUrl = normalizedUrl.replace(
          variantSuffixRegex,
          `.${variantMatch[3]}`,
        );
        variantToOriginalUrl.set(normalizedUrl, originalUrl);
      }
    }
  }

  return { allUrls, variantToOriginalUrl };
}
