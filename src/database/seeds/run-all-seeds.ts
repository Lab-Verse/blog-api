import * as dotenv from 'dotenv';
dotenv.config();
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../../config/database.config';
import seed from './seed';
import visitorPermissionsSeed from './visitor-permissions-seed';
import seedCategories from './categories-seed';
import seedPosts from './posts-seed';

async function cleanDatabase() {
  console.log('🧹 Cleaning database...\n');

  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();

  try {
    // Get all table names from the public schema
    const tables: { tablename: string }[] = await dataSource.query(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'migrations'`,
    );

    if (tables.length > 0) {
      const tableNames = tables.map((t) => `"${t.tablename}"`).join(', ');
      await dataSource.query(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE`);
      console.log(`✓ Truncated ${tables.length} tables (kept migrations table)`);
    } else {
      console.log('✓ No tables to clean');
    }

    console.log('✅ Database cleaned!\n');
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

async function runAllSeeds() {
  console.log('🚀 Running all seed files...\n');

  try {
    // Step 1: Clean the database
    await cleanDatabase();

    // Step 2: Run all seeds on a fresh database
    await seed();
    await visitorPermissionsSeed();
    await seedCategories();
    await seedPosts();

    console.log('\n✅ All seeds completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error running seeds:', error);
    process.exit(1);
  }
}

runAllSeeds();
