import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/modules/**/infrastructure/persistence/drizzle/schema/*.ts',
  out: './drizzle',
  dialect: 'postgresql', // hoặc 'mysql', 'sqlite' tùy database bạn dùng
  dbCredentials: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'nestjs_project',
  },
});
