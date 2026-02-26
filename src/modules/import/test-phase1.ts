/**
 * Phase 1 Test: Parse WordPress XML locally (no DB/server needed)
 *
 * Usage: npx ts-node -r tsconfig-paths/register src/modules/import/test-phase1.ts
 */
import {
  parseWordPressXml,
  extractContentImageUrls,
} from './utils/wordpress-xml-parser';
import * as fs from 'fs';
import * as path from 'path';

const XML_PATH = path.resolve(
  __dirname,
  '../../../docs/theworldambassador.WordPress.2026-02-14.xml',
);
const POSTS_JSON_PATH = path.resolve(
  __dirname,
  '../../../docs/theworldambassador_posts.json',
);

console.log('═══════════════════════════════════════════════════');
console.log('  Phase 1 Test: WordPress XML Parser');
console.log('═══════════════════════════════════════════════════\n');

// ─── Step 1: Parse the XML ────────────────────────────────────────────────

console.log(`📄 XML File: ${XML_PATH}`);
console.log(`   Size: ${(fs.statSync(XML_PATH).size / 1024 / 1024).toFixed(2)} MB\n`);

console.log('⏳ Parsing XML (this may take a moment for large files)...\n');
const startTime = Date.now();

const result = parseWordPressXml(XML_PATH);

const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
console.log(`✅ Parsed in ${elapsed}s\n`);

// ─── Step 2: Display Stats ────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════');
console.log('  STATS');
console.log('═══════════════════════════════════════════════════');
console.log(`  Total items in XML:            ${result.stats.totalItems}`);
console.log(`  Total posts:                   ${result.stats.totalPosts}`);
console.log(`  Total attachments:             ${result.stats.totalAttachments}`);
console.log(
  `  Posts with featured image:     ${result.stats.totalPostsWithFeaturedImage}`,
);
console.log('');

// ─── Step 3: Sample Attachments ───────────────────────────────────────────

console.log('═══════════════════════════════════════════════════');
console.log('  SAMPLE ATTACHMENTS (first 10)');
console.log('═══════════════════════════════════════════════════');

const attachments = Array.from(result.attachmentMap.values());
for (const att of attachments.slice(0, 10)) {
  console.log(`  [WP ID: ${att.wpId}]`);
  console.log(`    File:   ${att.filename}`);
  console.log(`    URL:    ${att.url}`);
  console.log(`    Type:   ${att.mimeType}`);
  console.log(`    Parent: ${att.postParent}`);
  console.log('');
}

// ─── Step 4: Sample Featured Image Mappings ───────────────────────────────

console.log('═══════════════════════════════════════════════════');
console.log('  SAMPLE FEATURED IMAGE MAPPINGS (first 10)');
console.log('═══════════════════════════════════════════════════');

const featuredEntries = Array.from(result.featuredImageMap.entries());
for (const [postWpId, attachmentWpId] of featuredEntries.slice(0, 10)) {
  const att = result.attachmentMap.get(attachmentWpId);
  console.log(`  Post WP ID: ${postWpId} → Attachment WP ID: ${attachmentWpId}`);
  if (att) {
    console.log(`    → ${att.url}`);
  } else {
    console.log(`    ⚠️  Attachment not found in attachmentMap!`);
  }
  console.log('');
}

// ─── Step 5: Validate featured image references ──────────────────────────

console.log('═══════════════════════════════════════════════════');
console.log('  FEATURED IMAGE VALIDATION');
console.log('═══════════════════════════════════════════════════');

let resolved = 0;
let unresolved = 0;
const unresolvedIds: string[] = [];

for (const [postWpId, attachmentWpId] of result.featuredImageMap) {
  if (result.attachmentMap.has(attachmentWpId)) {
    resolved++;
  } else {
    unresolved++;
    unresolvedIds.push(`Post ${postWpId} → Attachment ${attachmentWpId}`);
  }
}

console.log(`  ✅ Resolved:   ${resolved}/${featuredEntries.length}`);
console.log(`  ❌ Unresolved: ${unresolved}/${featuredEntries.length}`);
if (unresolvedIds.length > 0) {
  console.log('  Unresolved references:');
  for (const id of unresolvedIds.slice(0, 10)) {
    console.log(`    - ${id}`);
  }
  if (unresolvedIds.length > 10) {
    console.log(`    ... and ${unresolvedIds.length - 10} more`);
  }
}
console.log('');

// ─── Step 6: Analyze content image URLs from posts JSON ───────────────────

console.log('═══════════════════════════════════════════════════');
console.log('  CONTENT IMAGE ANALYSIS (from posts JSON)');
console.log('═══════════════════════════════════════════════════');

if (fs.existsSync(POSTS_JSON_PATH)) {
  const postsData = JSON.parse(fs.readFileSync(POSTS_JSON_PATH, 'utf-8'));
  const posts: Array<{ content: string }> = postsData.posts || postsData;
  const contents = posts.map((p) => p.content).filter(Boolean);

  console.log(`  Posts with content: ${contents.length}`);

  const { allUrls, variantToOriginalUrl } = extractContentImageUrls(contents);

  console.log(`  Unique WordPress upload URLs in content: ${allUrls.size}`);
  console.log(`  Variant URLs (with -WxH suffix): ${variantToOriginalUrl.size}`);
  console.log(
    `  Original URLs (no variant suffix): ${allUrls.size - variantToOriginalUrl.size}`,
  );
  console.log('');

  // Check how many content URLs match an attachment
  let matchedToAttachment = 0;
  let unmatched = 0;

  for (const url of allUrls) {
    // Check if URL or its stripped version matches any attachment
    const matched = attachments.some((att) => {
      const normalizedAttUrl = att.url.replace(/^http:\/\//, 'https://');
      const normalizedUrl = url.replace(/^http:\/\//, 'https://');
      return normalizedAttUrl === normalizedUrl;
    });

    if (matched) {
      matchedToAttachment++;
    } else {
      unmatched++;
    }
  }

  console.log(
    `  Content URLs matching an attachment: ${matchedToAttachment}/${allUrls.size}`,
  );
  console.log(
    `  Content URLs NOT matching (variants/other): ${unmatched}/${allUrls.size}`,
  );

  // Show a few unmatched URLs as sample
  const unmatchedSamples: string[] = [];
  for (const url of allUrls) {
    if (unmatchedSamples.length >= 5) break;
    const matched = attachments.some((att) => {
      const normalizedAttUrl = att.url.replace(/^http:\/\//, 'https://');
      const normalizedUrl = url.replace(/^http:\/\//, 'https://');
      return normalizedAttUrl === normalizedUrl;
    });
    if (!matched) {
      unmatchedSamples.push(url);
    }
  }
  if (unmatchedSamples.length > 0) {
    console.log('\n  Sample unmatched URLs:');
    for (const u of unmatchedSamples) {
      console.log(`    - ${u}`);
    }
  }
} else {
  console.log(`  ⚠️  Posts JSON not found at: ${POSTS_JSON_PATH}`);
}

// ─── Step 7: Mime type distribution ───────────────────────────────────────

console.log('\n═══════════════════════════════════════════════════');
console.log('  ATTACHMENT MIME TYPE DISTRIBUTION');
console.log('═══════════════════════════════════════════════════');

const mimeCount = new Map<string, number>();
for (const att of attachments) {
  mimeCount.set(att.mimeType, (mimeCount.get(att.mimeType) || 0) + 1);
}
for (const [mime, count] of Array.from(mimeCount.entries()).sort(
  (a, b) => b[1] - a[1],
)) {
  console.log(`  ${mime}: ${count}`);
}

console.log('\n═══════════════════════════════════════════════════');
console.log('  ✅ Phase 1 Test Complete!');
console.log('═══════════════════════════════════════════════════\n');
