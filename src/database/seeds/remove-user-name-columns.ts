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

async function removeColumns() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    // Check if columns exist
    const columns = await AppDataSource.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('first_name', 'last_name')
    `);

    if (columns.length === 0) {
      console.log('✅ Columns first_name and last_name do not exist in users table');
      await AppDataSource.destroy();
      return;
    }

    console.log(`Found ${columns.length} columns to drop:`, columns.map((c: any) => c.column_name));

    // Drop columns if they exist
    for (const col of columns) {
      const columnName = col.column_name;
      console.log(`\n🗑️  Dropping column: ${columnName}`);
      await AppDataSource.query(`ALTER TABLE users DROP COLUMN IF EXISTS ${columnName}`);
      console.log(`✅ Successfully dropped ${columnName}`);
    }

    console.log('\n🎉 All specified columns have been removed from users table!');
    
    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

removeColumns();
