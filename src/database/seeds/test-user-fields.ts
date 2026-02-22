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

async function testUserFields() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    console.log('📋 Testing User Fields:');
    console.log('═'.repeat(80));
    
    // Get latest user
    const users = await AppDataSource.query(`
      SELECT id, username, display_name, email, password, role, status, created_at
      FROM users 
      WHERE role != 'super_admin'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log(`\nFound ${users.length} recent users:\n`);
    
    users.forEach((user: any, i: number) => {
      console.log(`${i + 1}. User: ${user.username}`);
      console.log(`   Display Name: ${user.display_name || '[NULL]'}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Password Hash: ${user.password.substring(0, 20)}... (${user.password.length} chars)`);
      console.log(`   Is Hashed: ${user.password.startsWith('$2') ? '✅ YES' : '❌ NO (Plain text!)'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });
    
    console.log('═'.repeat(80));

    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testUserFields();
