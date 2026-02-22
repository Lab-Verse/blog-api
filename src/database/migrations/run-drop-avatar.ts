import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'blog_api',
  entities: [],
  synchronize: false,
  logging: true,
});

async function dropAvatarColumn() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    console.log('📋 Dropping avatar column from user_profiles table...');
    console.log('═'.repeat(80));

    // Check if column exists
    const columnCheck = await AppDataSource.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' AND column_name = 'avatar'
    `);

    if (columnCheck.length === 0) {
      console.log('ℹ️  Avatar column does not exist. Nothing to drop.');
    } else {
      // Drop the column
      await AppDataSource.query(`ALTER TABLE user_profiles DROP COLUMN avatar`);
      console.log('✅ Avatar column dropped successfully!');
    }

    // Show updated table structure
    console.log('\n📋 Updated user_profiles table structure:');
    console.log('═'.repeat(80));
    const columns = await AppDataSource.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' 
      ORDER BY ordinal_position
    `);

    columns.forEach((col: any) => {
      const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)';
      console.log(`  ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${nullable}`);
    });
    console.log('═'.repeat(80));

    await AppDataSource.destroy();
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

dropAvatarColumn();
