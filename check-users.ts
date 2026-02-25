import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

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
  
  // Create admin user if not exists
  const adminEmail = 'abidchaudhry063@gmail.com';
  const existing = await ds.query(`SELECT id FROM users WHERE email = $1`, [adminEmail]);
  
  if (existing.length === 0) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    await ds.query(`
      INSERT INTO users (id, username, email, password, role, status, created_at, updated_at)
      VALUES (gen_random_uuid(), 'abidadmin', $1, $2, 'super_admin', 'active', NOW(), NOW())
    `, [adminEmail, hashedPassword]);
    console.log(`✅ Admin user created: ${adminEmail} / password123`);
  } else {
    console.log(`Admin user already exists: ${adminEmail}`);
  }
  
  // Get pending users
  const pending = await ds.query(`SELECT id, username, email, status FROM users WHERE status = 'pending' LIMIT 5`);
  console.log('\nPending users:');
  pending.forEach((u: any) => console.log(`  - ID: ${u.id} | ${u.username} | ${u.email}`));
  
  // Show admins
  const admins = await ds.query(`SELECT username, email, role, status FROM users WHERE role IN ('admin', 'super_admin')`);
  console.log('\nAdmin users:');
  admins.forEach((u: any) => console.log(`  - ${u.username} | ${u.email} | ${u.role}`));
  
  await ds.destroy();
}

main().catch(console.error);
