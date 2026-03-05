import 'reflect-metadata';
import { AppDataSource } from '../config/database';

export const initializeTestDb = async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
};

export const closeTestDb = async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
};

beforeAll(async () => {
  // Initialize test database
  await initializeTestDb();
});

afterAll(async () => {
  // Close database connection
  await closeTestDb();
});
