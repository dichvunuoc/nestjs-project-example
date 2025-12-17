import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  DATABASE_READ_TOKEN,
  DRIZZLE_DB_READ_PROVIDER,
  DATABASE_WRITE_TOKEN,
  DRIZZLE_DB_WRITE_PROVIDER,
} from './database.provider';
import { DatabaseService } from './database.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    DatabaseService,
    DRIZZLE_DB_READ_PROVIDER,
    DRIZZLE_DB_WRITE_PROVIDER,
  ],
  exports: [DATABASE_WRITE_TOKEN, DATABASE_READ_TOKEN, DatabaseService],
})
export class DatabaseModule {}
