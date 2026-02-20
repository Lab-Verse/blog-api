import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAuthorFieldsToUsers1756487580000 implements MigrationInterface {
  name = 'AddAuthorFieldsToUsers1756487580000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add display_name column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'display_name',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // Add first_name column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'first_name',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // Add last_name column
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'last_name',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // Add login column (for WordPress compatibility)
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'login',
        type: 'varchar',
        isNullable: true,
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'login');
    await queryRunner.dropColumn('users', 'last_name');
    await queryRunner.dropColumn('users', 'first_name');
    await queryRunner.dropColumn('users', 'display_name');
  }
}
