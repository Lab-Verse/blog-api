import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImageUrlAndCanPublish1756487660000 implements MigrationInterface {
  name = 'AddImageUrlAndCanPublish1756487660000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add image_url to categories table
    await queryRunner.query(`
      ALTER TABLE "categories" 
      ADD COLUMN IF NOT EXISTS "image_url" varchar NULL
    `);

    // Add can_publish to users table
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "can_publish" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "can_publish"
    `);
    await queryRunner.query(`
      ALTER TABLE "categories" DROP COLUMN IF EXISTS "image_url"
    `);
  }
}
