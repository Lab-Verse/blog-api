export class ImportMediaDto {
  /** Absolute path to the WordPress WXR XML file */
  xmlFilePath: string;

  /** User ID to assign as owner of imported media */
  userId: string;

  /** Number of images to process in parallel (default: 10) */
  batchSize?: number;

  /** If true, parse only — don't download/upload anything */
  dryRun?: boolean;
}

export class ImportMediaParseResultDto {
  totalAttachments: number;
  totalPostsWithFeaturedImage: number;
  totalPosts: number;
  attachments: Array<{
    wpId: string;
    url: string;
    filename: string;
    postParent: string;
  }>;
  featuredImageMappings: Array<{
    postWpId: string;
    attachmentWpId: string;
    attachmentUrl?: string;
  }>;
}

export class ImportMediaSyncResultDto {
  success: boolean;
  message: string;
  total: number;
  synced: number;
  skipped: number;
  failed: number;
  failedUrls: string[];
}

export class ImportMediaRewriteResultDto {
  success: boolean;
  message: string;
  postsProcessed: number;
  postsModified: number;
  urlsRewritten: number;
  captionsConverted: number;
  videosConverted: number;
  errors: string[];
}

export class ImportMediaFeaturedResultDto {
  success: boolean;
  message: string;
  postsUpdated: number;
  postMediaCreated: number;
  errors: string[];
}

export class ImportMediaFullResultDto {
  parse: ImportMediaParseResultDto;
  sync: ImportMediaSyncResultDto;
  rewrite: ImportMediaRewriteResultDto;
  featured: ImportMediaFeaturedResultDto;
}
