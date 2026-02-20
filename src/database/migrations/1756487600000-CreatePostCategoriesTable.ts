import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreatePostCategoriesTable1756487600000
  implements MigrationInterface
{
  name = 'CreatePostCategoriesTable1756487600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create post_categories junction table
    await queryRunner.createTable(
      new Table({
        name: 'post_categories',
        columns: [
          {
            name: 'post_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'category_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Add foreign key for post_id
    await queryRunner.createForeignKey(
      'post_categories',
      new TableForeignKey({
        columnNames: ['post_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'posts',
        onDelete: 'CASCADE',
      }),
    );

    // Add foreign key for category_id
    await queryRunner.createForeignKey(
      'post_categories',
      new TableForeignKey({
        columnNames: ['category_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'categories',
        onDelete: 'CASCADE',
      }),
    );

    // Migrate existing post.category_id relationships to junction table
    await queryRunner.query(`
      INSERT INTO post_categories (post_id, category_id, created_at)
      SELECT id, category_id, created_at
      FROM posts
      WHERE category_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    const table = await queryRunner.getTable('post_categories');
    
    if (!table) {
      return;
    }

    const postForeignKey = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('post_id') !== -1,
    );
    const categoryForeignKey = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('category_id') !== -1,
    );

    if (postForeignKey) {
      await queryRunner.dropForeignKey('post_categories', postForeignKey);
    }
    if (categoryForeignKey) {
      await queryRunner.dropForeignKey('post_categories', categoryForeignKey);
    }

    // Drop table
    await queryRunner.dropTable('post_categories');
  }
}
