import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOpinionFeature1772682423573 implements MigrationInterface {
    name = 'AddOpinionFeature1772682423573'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add is_columnist to user_profiles
        await queryRunner.query(`ALTER TABLE "user_profiles" ADD "is_columnist" boolean NOT NULL DEFAULT false`);
        // Create post_type enum and add column to posts
        await queryRunner.query(`CREATE TYPE "public"."posts_post_type_enum" AS ENUM('standard', 'opinion', 'video', 'audio', 'gallery')`);
        await queryRunner.query(`ALTER TABLE "posts" ADD "post_type" "public"."posts_post_type_enum" DEFAULT 'standard'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove post_type column and enum from posts
        await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN "post_type"`);
        await queryRunner.query(`DROP TYPE "public"."posts_post_type_enum"`);
        // Remove is_columnist from user_profiles
        await queryRunner.query(`ALTER TABLE "user_profiles" DROP COLUMN "is_columnist"`);
    }

}
