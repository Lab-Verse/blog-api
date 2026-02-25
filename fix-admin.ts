import 'dotenv/config';
import { DataSource } from 'typeorm';

const ds = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

async function main() {
  await ds.initialize();
  
  // Get super_admin role
  const role = await ds.query(`SELECT id FROM roles WHERE slug = 'super_admin'`);
  if (role.length > 0) {
    const roleId = role[0].id;
    console.log('Super Admin role ID:', roleId);
    
    // Update the admin user
    await ds.query(`UPDATE users SET role_id = $1 WHERE email = $2`, [roleId, 'abidchaudhry063@gmail.com']);
    console.log('Updated abidchaudhry063@gmail.com with role_id');
  } else {
    console.log('Super admin role not found!');
  }
  
  // Verify
  const user = await ds.query(`SELECT email, role, role_id FROM users WHERE email = $1`, ['abidchaudhry063@gmail.com']);
  console.log('User:', user[0]);
  
  await ds.destroy();
}

main().catch(console.error);
