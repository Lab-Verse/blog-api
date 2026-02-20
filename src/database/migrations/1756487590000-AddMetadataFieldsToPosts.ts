import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddMetadataFieldsToPosts1756487590000
  implements MigrationInterface
{
  name = 'AddMetadataFieldsToPosts1756487590000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add excerpt column
    await queryRunner.addColumn(
      'posts',
      new TableColumn({
        name: 'excerpt',
        type: 'text',
        isNullable: true,
      }),
    );

    // Add description column (for SEO meta description)
    await queryRunner.addColumn(
      'posts',
      new TableColumn({
        name: 'description',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // Add guid column (WordPress compatibility)
    await queryRunner.addColumn(
      'posts',
      new TableColumn({
        name: 'guid',
        type: 'varchar',
        isNullable: true,
      }),
    );

    // Add post_date_gmt column
    await queryRunner.addColumn(
      'posts',
      new TableColumn({
        name: 'post_date_gmt',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    // Add post_modified_gmt column
    await queryRunner.addColumn(
      'posts',
      new TableColumn({
        name: 'post_modified_gmt',
        type: 'timestamp',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('posts', 'post_modified_gmt');
    await queryRunner.dropColumn('posts', 'post_date_gmt');
    await queryRunner.dropColumn('posts', 'guid');
    await queryRunner.dropColumn('posts', 'description');
    await queryRunner.dropColumn('posts', 'excerpt');
  }
}
