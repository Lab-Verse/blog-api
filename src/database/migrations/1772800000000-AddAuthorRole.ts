import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuthorRole1772800000000 implements MigrationInterface {
    name = 'AddAuthorRole1772800000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Insert 'author' role into roles table (if not exists)
        await queryRunner.query(`
            INSERT INTO "roles" ("name", "slug")
            SELECT 'Author', 'author'
            WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE "slug" = 'author')
        `);

        // 2. Get the author role ID
        const authorRole = await queryRunner.query(`SELECT "id" FROM "roles" WHERE "slug" = 'author' LIMIT 1`);
        if (!authorRole || authorRole.length === 0) {
            throw new Error('Failed to create or find author role');
        }
        const authorRoleId = authorRole[0].id;

        // 3. Update all users who have role='user' AND have authored at least one post
        //    Change their role string to 'author' and link their role_id
        await queryRunner.query(`
            UPDATE "users"
            SET "role" = 'author', "role_id" = $1
            WHERE "role" = 'user'
            AND "id" IN (SELECT DISTINCT "user_id" FROM "posts" WHERE "user_id" IS NOT NULL)
        `, [authorRoleId]);

        // Log how many users were updated
        const updatedCount = await queryRunner.query(`
            SELECT COUNT(*) as count FROM "users" WHERE "role" = 'author'
        `);
        console.log(`✓ Migrated ${updatedCount[0].count} users to 'author' role`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Get author role ID
        const authorRole = await queryRunner.query(`SELECT "id" FROM "roles" WHERE "slug" = 'author' LIMIT 1`);

        if (authorRole && authorRole.length > 0) {
            const authorRoleId = authorRole[0].id;

            // Get user role ID to revert role_id
            const userRole = await queryRunner.query(`SELECT "id" FROM "roles" WHERE "slug" = 'user' LIMIT 1`);
            const userRoleId = userRole && userRole.length > 0 ? userRole[0].id : null;

            // Revert all 'author' role users back to 'user'
            await queryRunner.query(`
                UPDATE "users"
                SET "role" = 'user', "role_id" = $1
                WHERE "role" = 'author'
            `, [userRoleId]);
        }

        // Remove author role from roles table
        await queryRunner.query(`DELETE FROM "roles" WHERE "slug" = 'author'`);
    }
}
