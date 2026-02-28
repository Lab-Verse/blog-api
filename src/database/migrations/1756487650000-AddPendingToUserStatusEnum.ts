import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPendingToUserStatusEnum1756487650000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'pending' value to the existing users_status_enum in PostgreSQL
    await queryRunner.query(
      `ALTER TYPE "users_status_enum" ADD VALUE IF NOT EXISTS 'pending'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing a value from an enum directly.
    // To revert, we recreate the enum without 'pending' and cast existing rows.
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "status" TYPE varchar USING "status"::text`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "users_status_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "users_status_enum" RENAME TO "users_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "users_status_enum" AS ENUM ('active', 'inactive', 'banned')`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "status" = NULL WHERE "status" = 'pending'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "status" TYPE "users_status_enum" USING "status"::"users_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "users_status_enum_old"`);
  }
}
