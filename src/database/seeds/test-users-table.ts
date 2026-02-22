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
  logging: false,
});

async function testUsersTable() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    // Get table structure
    console.log('📋 Users table structure:');
    console.log('═'.repeat(80));
    const columns = await AppDataSource.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    columns.forEach((col: any) => {
      const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(NOT NULL)';
      const defaultVal = col.column_default ? ` [default: ${col.column_default}]` : '';
      console.log(`  ${col.column_name.padEnd(20)} ${col.data_type.padEnd(25)} ${nullable}${defaultVal}`);
    });
    console.log('═'.repeat(80));

    // Query users
    console.log('\n📊 Sample users data:');
    console.log('═'.repeat(80));
    const users = await AppDataSource.query(`
      SELECT id, username, email, role, status, created_at
      FROM users 
      WHERE role != 'super_admin'
      LIMIT 3
    `);
    
    console.log(`Total non-admin users: ${users.length}`);
    users.forEach((user: any, i: number) => {
      console.log(`\n${i + 1}. ${user.username}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Created: ${user.created_at}`);
    });
    console.log('═'.repeat(80));

    // Test count
    const countResult = await AppDataSource.query(`
      SELECT COUNT(*) as total FROM users WHERE role != 'super_admin'
    `);
    console.log(`\n✅ Total users (excluding super_admin): ${countResult[0].total}`);

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testUsersTable();
