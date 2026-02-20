export class ImportCategoryDto {
  name: string;
  slug: string;
}

export class ImportAuthorDto {
  id: string;
  login: string;
  email: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
}

export class ImportPostDto {
  id: string;
  title: string;
  link: string;
  pub_date?: string | null;
  post_date: string;
  post_date_gmt: string;
  post_modified: string;
  post_modified_gmt: string;
  status: string;
  post_name: string;
  guid: string;
  description?: string;
  content: string;
  excerpt?: string;
  author: ImportAuthorDto;
  categories: ImportCategoryDto[];
  tags: Array<{ name: string; slug: string }>;
}

export class ImportDataDto {
  site_info: {
    title: string;
    link: string;
    description: string;
    language: string;
  };
  authors: ImportAuthorDto[];
  categories: string[];
  total_posts: number;
  posts: ImportPostDto[];
}

export class ImportResponseDto {
  success: boolean;
  message: string;
  imported?: number;
  skipped?: number;
  errors?: string[];
}

export class ValidateResponseDto {
  valid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    total_posts: number;
    total_categories: number;
    total_authors: number;
    draft_posts: number;
    published_posts: number;
    posts_without_title: number;
    posts_without_slug: number;
  };
}
