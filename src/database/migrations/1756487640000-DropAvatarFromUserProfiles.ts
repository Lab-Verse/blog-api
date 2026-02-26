import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropAvatarFromUserProfiles1756487640000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('user_profiles');
    if (table?.findColumnByName('avatar')) {
      await queryRunner.query(
        `ALTER TABLE "user_profiles" DROP COLUMN "avatar"`,
      );
      console.log('✅ Dropped avatar column from user_profiles');
    } else {
      console.log('ℹ️  Avatar column does not exist in user_profiles. Skipping.');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('user_profiles');
    if (!table?.findColumnByName('avatar')) {
      await queryRunner.query(
        `ALTER TABLE "user_profiles" ADD COLUMN "avatar" varchar NULL`,
      );
      console.log('✅ Re-added avatar column to user_profiles');
    }
  }
}
