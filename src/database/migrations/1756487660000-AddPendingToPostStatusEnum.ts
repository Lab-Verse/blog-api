import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPendingToPostStatusEnum1756487660000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'pending' value to the existing posts_status_enum in PostgreSQL
    await queryRunner.query(
      `ALTER TYPE "posts_status_enum" ADD VALUE IF NOT EXISTS 'pending'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing a value from an enum directly.
    // To revert, we recreate the enum without 'pending' and cast existing rows.
    await queryRunner.query(
      `ALTER TABLE "posts" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ALTER COLUMN "status" TYPE varchar USING "status"::text`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "posts_status_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "posts_status_enum" RENAME TO "posts_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "posts_status_enum" AS ENUM ('draft', 'published', 'archived')`,
    );
    await queryRunner.query(
      `UPDATE "posts" SET "status" = 'draft' WHERE "status" = 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "posts" ALTER COLUMN "status" TYPE "posts_status_enum" USING "status"::"posts_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "posts_status_enum_old"`);
  }
}
