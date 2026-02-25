import * as dotenv from 'dotenv';
dotenv.config();
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserStatus } from '../../modules/users/entities/user.entity';
import { Role } from '../../modules/roles/entities/role.entity';
import { Permission } from '../../modules/permissions/entities/permission.entity';
import { RolePermission } from '../../modules/role-permissions/entities/role-permission.entity';
import { Role as RoleEnum } from '../../common/enums/role.enum';
import { dataSourceOptions } from '../../config/database.config';

const dataSource = new DataSource(dataSourceOptions);

async function seed() {
  console.log('🌱 Starting basic database seeding...\n');

  try {
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    const userRepo = dataSource.getRepository(User);
    const roleRepo = dataSource.getRepository(Role);
    const permissionRepo = dataSource.getRepository(Permission);
    const rolePermissionRepo = dataSource.getRepository(RolePermission);

    // Basic Permissions
    const permissionsData = [
      { name: 'Auth Register', slug: 'auth_register' },
      { name: 'Auth Login', slug: 'auth_login' },
      { name: 'Posts Create', slug: 'posts_create' },
      { name: 'Posts List', slug: 'posts_list' },
    ];

    await permissionRepo
      .createQueryBuilder()
      .insert()
      .into(Permission)
      .values(permissionsData)
      .orIgnore()
      .execute();

    const allPermissions = await permissionRepo.find();
    console.log(`✓ Seeded ${allPermissions.length} permissions`);

    // Roles
    let superAdminRole = await roleRepo.findOne({
      where: { slug: 'super_admin' },
    });
    if (!superAdminRole) {
      superAdminRole = await roleRepo.save({
        name: 'Super Admin',
        slug: 'super_admin',
      });
    }

    let userRole = await roleRepo.findOne({ where: { slug: 'user' } });
    if (!userRole) {
      userRole = await roleRepo.save({ name: 'User', slug: 'user' });
    }
    console.log('✓ Roles created');

    // Role-Permissions
    const existing = await rolePermissionRepo.find({
      where: { role_id: superAdminRole.id },
    });
    const existingIds = existing.map((rp) => rp.permission_id);
    const newRP = allPermissions
      .filter((p) => !existingIds.includes(p.id))
      .map((p) => ({ role_id: superAdminRole.id, permission_id: p.id }));

    if (newRP.length > 0) {
      await rolePermissionRepo.save(newRP);
    }
    console.log('✓ Role-Permissions assigned');

    // Admin User
    const adminEmail = 'abidchaudhry063@gmail.com';
    const adminExists = await userRepo.findOne({
      where: { email: adminEmail },
    });

    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await userRepo.save({
        username: 'admin',
        email: adminEmail,
        password: hashedPassword,
        role: RoleEnum.SUPER_ADMIN,
        role_id: superAdminRole.id,
        status: UserStatus.ACTIVE,
      });
      console.log('✓ Admin created: abidchaudhry063@gmail.com / password123');
    } else {
      console.log('✓ Admin already exists');
    }

    console.log('\n✅ Basic seeding completed!');
    console.log('ℹ️  For comprehensive seeding, use: npm run seed');
    console.log('   (This runs comprehensive-seed.ts with all 24 tables)\n');
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

if (require.main === module) {
  seed();
}

export default seed;
