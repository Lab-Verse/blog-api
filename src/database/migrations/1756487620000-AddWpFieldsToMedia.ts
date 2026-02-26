import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWpFieldsToMedia1756487620000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add wp_attachment_id for idempotent imports
    await queryRunner.query(
      `ALTER TABLE "media" ADD COLUMN "wp_attachment_id" varchar NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_media_wp_attachment_id" ON "media" ("wp_attachment_id")`,
    );

    // Add original_url to track the source WordPress URL
    await queryRunner.query(
      `ALTER TABLE "media" ADD COLUMN "original_url" varchar NULL`,
    );

    console.log('✅ Added wp_attachment_id and original_url columns to media table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('media');

    if (table?.findColumnByName('wp_attachment_id')) {
      await queryRunner.query(`DROP INDEX "IDX_media_wp_attachment_id"`);
      await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "wp_attachment_id"`);
    }

    if (table?.findColumnByName('original_url')) {
      await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "original_url"`);
    }

    console.log('✅ Removed wp_attachment_id and original_url columns from media table');
  }
}
