import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDisplayOrderToCategories1756910000000 implements MigrationInterface {
  name = 'AddDisplayOrderToCategories1756910000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "categories"
      ADD COLUMN IF NOT EXISTS "display_order" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "categories" DROP COLUMN IF EXISTS "display_order"
    `);
  }
}
