import "reflect-metadata";
import { AppDataSource } from '../config/database';

const initDatabase = async () => {
  try {
    console.log('🔧 Initializing database connection...');
    
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    console.log('🏗️ Running database migrations...');
    
    // Synchronize schema (creates tables)
    await AppDataSource.synchronize();
    
    console.log('✅ Database initialized successfully!');
    console.log('📊 Tables created:');
    
    // List all tables
    const queryRunner = AppDataSource.createQueryRunner();
    const tables = await queryRunner.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    tables.forEach((table: any) => {
      console.log(`  - ${table.table_name}`);
    });
    
    await queryRunner.release();
    
    console.log('\n🎉 Database is ready for seeding!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
};

// Run if called directly
if (require.main === module) {
  initDatabase().catch(console.error);
}

export { initDatabase };
