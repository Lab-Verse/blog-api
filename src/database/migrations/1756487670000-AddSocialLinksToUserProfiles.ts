import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddSocialLinksToUserProfiles1756487670000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('user_profiles', [
      new TableColumn({
        name: 'twitter_url',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'facebook_url',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'instagram_url',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'linkedin_url',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'github_url',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'youtube_url',
        type: 'varchar',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('user_profiles', 'youtube_url');
    await queryRunner.dropColumn('user_profiles', 'github_url');
    await queryRunner.dropColumn('user_profiles', 'linkedin_url');
    await queryRunner.dropColumn('user_profiles', 'instagram_url');
    await queryRunner.dropColumn('user_profiles', 'facebook_url');
    await queryRunner.dropColumn('user_profiles', 'twitter_url');
  }
}
