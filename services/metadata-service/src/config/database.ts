import { DataSource } from 'typeorm';
import { 
  MetaObject, 
  MetaField, 
  MetaRelation, 
  MetaLayout, 
  MetaPage, 
  MetaWorkflow 
} from '../entities';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'platform',
  password: process.env.DB_PASSWORD || 'platform123',
  database: process.env.DB_NAME || 'platform',
  synchronize: true,
  logging: process.env.NODE_ENV === 'development',
  entities: [
    MetaObject,
    MetaField,
    MetaRelation,
    MetaLayout,
    MetaPage,
    MetaWorkflow,
  ],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
});

export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log('Database connection established successfully');
  } catch (error) {
    console.error('Error during database initialization:', error);
    process.exit(1);
  }
};
