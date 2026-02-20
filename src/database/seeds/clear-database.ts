import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const clearDatabase = async () => {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

  try {
    await dataSource.initialize();
    console.log('🔌 Connected to database');

    const queryRunner = dataSource.createQueryRunner();
    
    console.log('🗑️  Clearing all tables...');
    
    await queryRunner.query('SET session_replication_role = replica;');
    
    const tables = await queryRunner.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    
    for (const { tablename } of tables) {
      await queryRunner.query(`TRUNCATE TABLE "${tablename}" CASCADE;`);
      console.log(`   ✅ Cleared: ${tablename}`);
    }
    
    await queryRunner.query('SET session_replication_role = DEFAULT;');
    
    console.log('✅ Database cleared successfully!');
    
    await queryRunner.release();
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

clearDatabase();
