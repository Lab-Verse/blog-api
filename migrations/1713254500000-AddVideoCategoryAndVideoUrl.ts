import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVideoCategoryAndVideoUrl1713254500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add video_url column to posts table
    await queryRunner.query(
      `ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_url VARCHAR NULL`,
    );

    // Create "Video" parent category
    const existing = await queryRunner.query(
      `SELECT id FROM categories WHERE slug = 'video' LIMIT 1`,
    );

    if (existing.length === 0) {
      await queryRunner.query(
        `INSERT INTO categories (id, name, slug, parent_id, is_active, display_order, created_at, updated_at)
         VALUES (gen_random_uuid(), 'Video', 'video', NULL, true, 55, NOW(), NOW())`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE posts DROP COLUMN IF EXISTS video_url`);
    await queryRunner.query(`DELETE FROM categories WHERE slug = 'video'`);
  }
}
