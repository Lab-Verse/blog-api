import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateEMagazinesTable1756800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'e_magazines',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'title',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'slug',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'cover_image_url',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'pdf_url',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'issue_number',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'published_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'draft'",
          },
          {
            name: 'page_count',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'file_size',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'category_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'uploaded_by',
            type: 'uuid',
            isNullable: false,
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

    // FK: uploaded_by → users
    await queryRunner.createForeignKey(
      'e_magazines',
      new TableForeignKey({
        columnNames: ['uploaded_by'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // FK: category_id → categories
    await queryRunner.createForeignKey(
      'e_magazines',
      new TableForeignKey({
        columnNames: ['category_id'],
        referencedTableName: 'categories',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Join table for e-magazine ↔ tags (many-to-many)
    await queryRunner.createTable(
      new Table({
        name: 'e_magazine_tags',
        columns: [
          {
            name: 'e_magazine_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'tag_id',
            type: 'uuid',
            isPrimary: true,
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'e_magazine_tags',
      new TableForeignKey({
        columnNames: ['e_magazine_id'],
        referencedTableName: 'e_magazines',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'e_magazine_tags',
      new TableForeignKey({
        columnNames: ['tag_id'],
        referencedTableName: 'tags',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('e_magazine_tags', true);
    await queryRunner.dropTable('e_magazines', true);
  }
}
