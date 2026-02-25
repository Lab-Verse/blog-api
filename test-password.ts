import * as dotenv from 'dotenv';
dotenv.config();
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from './src/config/database.config';

async function test() {
  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();
  
  const users = await ds.query(`
    SELECT email, password FROM users WHERE email = 'veryfinaltest@example.com'
  `);
  
  const user = users[0];
  console.log('User:', user.email);
  console.log('Password hash:', user.password);
  
  const password = 'TestPassword123';
  const match = await bcrypt.compare(password, user.password);
  console.log('Password:', password);
  console.log('Match:', match);
  
  await ds.destroy();
}

test();
