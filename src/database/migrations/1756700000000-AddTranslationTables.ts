import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTranslationTables1756700000000 implements MigrationInterface {
  name = 'AddTranslationTables1756700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Post translations
    await queryRunner.query(`
      CREATE TABLE "post_translations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "post_id" uuid NOT NULL,
        "locale" character varying(5) NOT NULL,
        "title" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "content" text NOT NULL,
        "excerpt" text,
        "description" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_post_translations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_post_translations_post_locale" UNIQUE ("post_id", "locale"),
        CONSTRAINT "UQ_post_translations_slug_locale" UNIQUE ("slug", "locale"),
        CONSTRAINT "FK_post_translations_post" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_post_translations_locale" ON "post_translations" ("locale")`);
    await queryRunner.query(`CREATE INDEX "IDX_post_translations_slug" ON "post_translations" ("slug")`);

    // Category translations
    await queryRunner.query(`
      CREATE TABLE "category_translations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "category_id" uuid NOT NULL,
        "locale" character varying(5) NOT NULL,
        "name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_category_translations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_category_translations_cat_locale" UNIQUE ("category_id", "locale"),
        CONSTRAINT "UQ_category_translations_slug_locale" UNIQUE ("slug", "locale"),
        CONSTRAINT "FK_category_translations_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_category_translations_locale" ON "category_translations" ("locale")`);

    // Tag translations
    await queryRunner.query(`
      CREATE TABLE "tag_translations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tag_id" uuid NOT NULL,
        "locale" character varying(5) NOT NULL,
        "name" character varying NOT NULL,
        "slug" character varying NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tag_translations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tag_translations_tag_locale" UNIQUE ("tag_id", "locale"),
        CONSTRAINT "UQ_tag_translations_slug_locale" UNIQUE ("slug", "locale"),
        CONSTRAINT "FK_tag_translations_tag" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_tag_translations_locale" ON "tag_translations" ("locale")`);

    // Draft translations
    await queryRunner.query(`
      CREATE TABLE "draft_translations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "draft_id" uuid NOT NULL,
        "locale" character varying(5) NOT NULL,
        "title" character varying,
        "content" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_draft_translations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_draft_translations_draft_locale" UNIQUE ("draft_id", "locale"),
        CONSTRAINT "FK_draft_translations_draft" FOREIGN KEY ("draft_id") REFERENCES "drafts"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_draft_translations_locale" ON "draft_translations" ("locale")`);

    // Seed English translations from existing data
    await queryRunner.query(`
      INSERT INTO "post_translations" ("post_id", "locale", "title", "slug", "content", "excerpt", "description")
      SELECT "id", 'en', "title", "slug", "content", "excerpt", "description"
      FROM "posts"
    `);

    await queryRunner.query(`
      INSERT INTO "category_translations" ("category_id", "locale", "name", "slug")
      SELECT "id", 'en', "name", "slug"
      FROM "categories"
    `);

    await queryRunner.query(`
      INSERT INTO "tag_translations" ("tag_id", "locale", "name", "slug")
      SELECT "id", 'en', "name", "slug"
      FROM "tags"
    `);

    await queryRunner.query(`
      INSERT INTO "draft_translations" ("draft_id", "locale", "title", "content")
      SELECT "id", 'en', "title", "content"
      FROM "drafts"
      WHERE "title" IS NOT NULL OR "content" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "draft_translations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tag_translations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "category_translations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "post_translations"`);
  }
}
