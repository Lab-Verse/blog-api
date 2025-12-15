import * as dotenv from 'dotenv';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

import { DataSource, DataSourceOptions } from 'typeorm/data-source/index.js';

dotenv.config();

console.log('DB Configuration:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  username: process.env.DB_USERNAME,
  database: process.env.DB_DATABASE,  // This should log 'blog_db'
});

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,


  

  // This matches all .entity.ts/.js files inside all modules/entities folders
  entities: [
    __dirname + '/../modules/**/entities/*.entity.{ts,js}',
    'src/modules/**/entities/*.entity.{ts,js}',
  ],

  // This matches migration files in src/database/migrations folder
  migrations: [__dirname + '/../database/migrations/*.{ts,js}'],

  // Always use migrations in production!
  synchronize: false,

  logging: process.env.TYPEORM_LOGGING === 'true',

  // Use snake_case everywhere in DB
  namingStrategy: new SnakeNamingStrategy(),
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
