import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeCategoryIdNullable1756487630000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make category_id nullable in posts table
    const postsTable = await queryRunner.getTable('posts');
    if (postsTable) {
      const categoryCol = postsTable.findColumnByName('category_id');
      if (categoryCol && !categoryCol.isNullable) {
        await queryRunner.query(
          `ALTER TABLE "posts" ALTER COLUMN "category_id" DROP NOT NULL`,
        );
        console.log('✅ Posts table: category_id is now nullable');
      } else {
        console.log('ℹ️  Posts table: category_id is already nullable or does not exist');
      }
    }

    // Make category_id nullable in questions table
    const questionsTable = await queryRunner.getTable('questions');
    if (questionsTable) {
      const categoryCol = questionsTable.findColumnByName('category_id');
      if (categoryCol && !categoryCol.isNullable) {
        await queryRunner.query(
          `ALTER TABLE "questions" ALTER COLUMN "category_id" DROP NOT NULL`,
        );
        console.log('✅ Questions table: category_id is now nullable');
      } else {
        console.log('ℹ️  Questions table: category_id is already nullable or does not exist');
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const postsTable = await queryRunner.getTable('posts');
    if (postsTable?.findColumnByName('category_id')) {
      await queryRunner.query(
        `ALTER TABLE "posts" ALTER COLUMN "category_id" SET NOT NULL`,
      );
    }

    const questionsTable = await queryRunner.getTable('questions');
    if (questionsTable?.findColumnByName('category_id')) {
      await queryRunner.query(
        `ALTER TABLE "questions" ALTER COLUMN "category_id" SET NOT NULL`,
      );
    }
  }
}
