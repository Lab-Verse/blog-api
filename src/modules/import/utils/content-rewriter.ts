/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { load } from 'cheerio';
import type { AnyNode } from 'domhandler';

// ─── Variant Suffix Pattern ─────────────────────────────────────────────────
// Matches WordPress thumbnail suffixes like -300x200, -1024x682, -2048x405-1
const VARIANT_SUFFIX_REGEX = /-(\d+)x(\d+)(-\d+)?\.(jpg|jpeg|png|gif|webp)$/i;

// WordPress upload URL pattern (both http and https)
const WP_UPLOAD_URL_REGEX =
  /https?:\/\/twa\.com\.pk\/wp-content\/uploads\/[^\s"'<>)]+/gi;

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface RewriteResult {
  content: string;
  urlsRewritten: number;
  captionsConverted: number;
  videosConverted: number;
}

// ─── Caption Shortcode Converter ─────────────────────────────────────────────
// [caption id="attachment_XXXXX" align="aligncenter" width="NNN"]<img .../>Caption text[/caption]

function convertCaptionShortcodes(html: string): {
  html: string;
  count: number;
} {
  let count = 0;

  const converted = html.replace(
    /\[caption([^\]]*)\]([\s\S]*?)\[\/caption\]/gi,
    (_match, attrs: string, innerContent: string) => {
      count++;

      // Extract attributes
      const alignMatch = attrs.match(/align="([^"]*)"/);
      const widthMatch = attrs.match(/width="(\d+)"/);

      const align = alignMatch?.[1] || 'alignnone';
      const width = widthMatch?.[1] || '';

      // Split inner content into <img> tag and caption text
      const imgMatch = innerContent.match(/<img[^>]*\/?>/i);
      const imgTag = imgMatch ? imgMatch[0] : '';
      const captionText = innerContent.replace(/<img[^>]*\/?>/i, '').trim();

      const styleAttr = width ? ` style="max-width:${width}px"` : '';

      return (
        `<figure class="wp-caption ${align}"${styleAttr}>` +
        `${imgTag}` +
        (captionText ? `<figcaption>${captionText}</figcaption>` : '') +
        `</figure>`
      );
    },
  );

  return { html: converted, count };
}

// ─── Video Shortcode Converter ───────────────────────────────────────────────
// [video width="W" height="H" mp4="URL"][/video]

function convertVideoShortcodes(
  html: string,
  urlRewriteMap: Map<string, string>,
): { html: string; count: number } {
  let count = 0;

  const converted = html.replace(
    /\[video([^\]]*)\]\[\/video\]/gi,
    (_match, attrs: string) => {
      count++;

      const widthMatch = attrs.match(/width="(\d+)"/);
      const heightMatch = attrs.match(/height="(\d+)"/);
      const mp4Match = attrs.match(/mp4="([^"]*)"/);

      const width = widthMatch?.[1] || '';
      const height = heightMatch?.[1] || '';
      let mp4Url = mp4Match?.[1] || '';

      // Rewrite the video URL if we have a mapping
      if (mp4Url) {
        const normalized = mp4Url.replace(/^http:\/\//, 'https://');
        mp4Url =
          urlRewriteMap.get(normalized) || urlRewriteMap.get(mp4Url) || mp4Url;
      }

      const widthAttr = width ? ` width="${width}"` : '';
      const heightAttr = height ? ` height="${height}"` : '';

      return (
        `<video${widthAttr}${heightAttr} controls>` +
        `<source src="${mp4Url}" type="video/mp4" />` +
        `Your browser does not support the video tag.` +
        `</video>`
      );
    },
  );

  return { html: converted, count };
}

// ─── URL Rewrite Helper ─────────────────────────────────────────────────────

/**
 * Given a WordPress URL, find its replacement in the rewrite map.
 * Handles:
 * 1. Exact match (including variant URLs that were downloaded)
 * 2. Strip variant suffix → match original
 * 3. http:// ↔ https:// normalization
 */
function findReplacementUrl(
  originalUrl: string,
  urlRewriteMap: Map<string, string>,
): string | null {
  // Try exact match
  const exact = urlRewriteMap.get(originalUrl);
  if (exact) return exact;

  // Normalize http → https and try again
  const normalized = originalUrl.replace(/^http:\/\//, 'https://');
  const normalizedMatch = urlRewriteMap.get(normalized);
  if (normalizedMatch) return normalizedMatch;

  // Strip variant suffix and try the original
  const variantMatch = normalized.match(VARIANT_SUFFIX_REGEX);
  if (variantMatch) {
    const strippedUrl = normalized.replace(
      VARIANT_SUFFIX_REGEX,
      `.${variantMatch[4]}`,
    );
    const originalMatch = urlRewriteMap.get(strippedUrl);
    if (originalMatch) return originalMatch;
  }

  return null;
}

// ─── Main Content Rewriter ───────────────────────────────────────────────────

/**
 * Rewrites WordPress post content:
 * 1. Converts [caption] shortcodes → <figure>/<figcaption>
 * 2. Converts [video] shortcodes → <video> tags
 * 3. Rewrites all <img src> URLs from WordPress to Cloudflare
 * 4. Rewrites <a href> URLs pointing to WordPress uploads
 * 5. Strips Gutenberg block comments (<!-- wp:image --> etc.)
 */
export function rewritePostContent(
  content: string,
  urlRewriteMap: Map<string, string>,
): RewriteResult {
  if (!content || urlRewriteMap.size === 0) {
    return {
      content,
      urlsRewritten: 0,
      captionsConverted: 0,
      videosConverted: 0,
    };
  }

  let urlsRewritten = 0;

  // Phase 1: Convert shortcodes BEFORE DOM parsing (they're not valid HTML)
  const captionResult = convertCaptionShortcodes(content);
  let html = captionResult.html;

  const videoResult = convertVideoShortcodes(html, urlRewriteMap);
  html = videoResult.html;

  // Phase 2: Use cheerio for DOM-based URL rewriting
  const $ = load(html, { xmlMode: false });

  // Rewrite <img> src attributes
  $('img').each((_i: number, el: AnyNode) => {
    const $el = $(el);
    const src = $el.attr('src');
    if (src && src.includes('twa.com.pk/wp-content/uploads')) {
      const newUrl = findReplacementUrl(src, urlRewriteMap);
      if (newUrl) {
        $el.attr('src', newUrl);
        urlsRewritten++;
      }
    }

    // Also handle srcset if present (future-proofing)
    const srcset = $el.attr('srcset');
    if (srcset && srcset.includes('twa.com.pk/wp-content/uploads')) {
      const newSrcset = srcset.replace(
        WP_UPLOAD_URL_REGEX,
        (url: string) => findReplacementUrl(url, urlRewriteMap) || url,
      );
      if (newSrcset !== srcset) {
        $el.attr('srcset', newSrcset);
        urlsRewritten++;
      }
    }
  });

  // Rewrite <a href> attributes pointing to WordPress uploads
  $('a').each((_i: number, el: AnyNode) => {
    const $el = $(el);
    const href = $el.attr('href');
    if (href && href.includes('twa.com.pk/wp-content/uploads')) {
      const newUrl = findReplacementUrl(href, urlRewriteMap);
      if (newUrl) {
        $el.attr('href', newUrl);
        urlsRewritten++;
      }
    }
  });

  // Rewrite <source src> inside <video> tags
  $('source').each((_i: number, el: AnyNode) => {
    const $el = $(el);
    const src = $el.attr('src');
    if (src && src.includes('twa.com.pk/wp-content/uploads')) {
      const newUrl = findReplacementUrl(src, urlRewriteMap);
      if (newUrl) {
        $el.attr('src', newUrl);
        urlsRewritten++;
      }
    }
  });

  // Phase 3: Strip Gutenberg block comments
  let finalHtml = $.html();
  finalHtml = finalHtml.replace(
    /<!--\s*\/?wp:[a-z-]+(?:\s+\{[^}]*\})?\s*-->/gi,
    '',
  );

  // Also handle any remaining raw WordPress URLs in text/attributes
  // that cheerio might not have caught (e.g., in inline styles)
  finalHtml = finalHtml.replace(WP_UPLOAD_URL_REGEX, (url: string) => {
    const replacement = findReplacementUrl(url, urlRewriteMap);
    if (replacement && replacement !== url) {
      urlsRewritten++;
      return replacement;
    }
    return url;
  });

  return {
    content: finalHtml,
    urlsRewritten,
    captionsConverted: captionResult.count,
    videosConverted: videoResult.count,
  };
}
