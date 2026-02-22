import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveFirstLastNameFromUsers1756487610000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if columns exist before dropping
    const table = await queryRunner.getTable('users');
    
    if (table?.findColumnByName('first_name')) {
      await queryRunner.dropColumn('users', 'first_name');
      console.log('✅ Dropped first_name column from users table');
    }
    
    if (table?.findColumnByName('last_name')) {
      await queryRunner.dropColumn('users', 'last_name');
      console.log('✅ Dropped last_name column from users table');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "first_name" varchar;
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "last_name" varchar;
    `);
  }
}
