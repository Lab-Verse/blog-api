import * as dotenv from 'dotenv';
dotenv.config();
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../../config/database.config';

async function checkUsers() {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();
  
  console.log('\n=== Checking testuser2026 ===');
  const testUser = await dataSource.query(`
    SELECT id, username, email, role, status, password 
    FROM users 
    WHERE email = 'testuser2026@example.com'
  `);
  console.table(testUser);
  console.log('Password hash:', testUser[0]?.password);
  
  await dataSource.destroy();
}

checkUsers().catch(console.error);
