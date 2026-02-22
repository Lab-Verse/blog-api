import { DataSource } from 'typeorm';
import { config } from 'dotenv';

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

async function makeCategoryIdNullable() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    console.log('📋 Making category_id nullable in posts and questions tables...');
    
    await AppDataSource.query(`
      ALTER TABLE posts ALTER COLUMN category_id DROP NOT NULL;
    `);
    console.log('✅ Posts table updated');
    
    await AppDataSource.query(`
      ALTER TABLE questions ALTER COLUMN category_id DROP NOT NULL;
    `);
    console.log('✅ Questions table updated');
    
    console.log('\n✅ Migration completed successfully!');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

makeCategoryIdNullable();
