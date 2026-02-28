import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsersTable1756487300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'username',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          { name: 'email', type: 'varchar', isUnique: true, isNullable: false },
          { name: 'password', type: 'varchar', isNullable: false },
          {
            name: 'role',
            type: 'varchar',
            isNullable: true,
            default: "'user'",
          },
          { name: 'role_id', type: 'uuid', isNullable: true },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'active', 'inactive', 'banned'],
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.query(
      'CREATE INDEX "IDX_users_role_id" ON "users" ("role_id")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_users_role_id"');
    await queryRunner.dropTable('users');
  }
}
