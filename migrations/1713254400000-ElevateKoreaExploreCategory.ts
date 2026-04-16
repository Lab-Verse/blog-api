import { MigrationInterface, QueryRunner } from 'typeorm';

export class ElevateKoreaExploreCategory1713254400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Elevate "Korea Explore" to a parent category (remove parent_id)
    // Also create it if it doesn't exist yet
    const existing = await queryRunner.query(
      `SELECT id FROM categories WHERE slug = 'korea-explore' LIMIT 1`,
    );

    if (existing.length === 0) {
      await queryRunner.query(
        `INSERT INTO categories (id, name, slug, parent_id, is_active, display_order, created_at, updated_at)
         VALUES (gen_random_uuid(), 'Korea Explore', 'korea-explore', NULL, true, 50, NOW(), NOW())`,
      );
    } else {
      // If it exists but is a child, promote it to parent
      await queryRunner.query(
        `UPDATE categories SET parent_id = NULL, updated_at = NOW() WHERE slug = 'korea-explore'`,
      );
    }

    // Move related Korea subcategories under it
    const parent = await queryRunner.query(
      `SELECT id FROM categories WHERE slug = 'korea-explore' LIMIT 1`,
    );
    if (parent.length > 0) {
      const parentId = parent[0].id;
      await queryRunner.query(
        `UPDATE categories SET parent_id = $1, updated_at = NOW()
         WHERE slug IN ('south-korea', 'korea-embassy') AND parent_id IS DISTINCT FROM $1`,
        [parentId],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: remove parent_id from subcategories and delete Korea Explore if we created it
    await queryRunner.query(
      `UPDATE categories SET parent_id = NULL, updated_at = NOW()
       WHERE slug IN ('south-korea', 'korea-embassy')`,
    );
  }
}
