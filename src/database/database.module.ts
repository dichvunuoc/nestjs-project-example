import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  DATABASE_READ_TOKEN,
  DRIZZLE_DB_READ_PROVIDER,
  DATABASE_WRITE_TOKEN,
  DRIZZLE_DB_WRITE_PROVIDER,
} from './database.provider';
import { DatabaseService } from './database.service';
import { DrizzleUnitOfWork, UNIT_OF_WORK_TOKEN } from '@core';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    DatabaseService,
    DRIZZLE_DB_READ_PROVIDER,
    DRIZZLE_DB_WRITE_PROVIDER,
    // Unit of Work for transaction management
    DrizzleUnitOfWork,
    {
      provide: UNIT_OF_WORK_TOKEN,
      useExisting: DrizzleUnitOfWork,
    },
  ],
  exports: [
    DATABASE_WRITE_TOKEN,
    DATABASE_READ_TOKEN,
    DatabaseService,
    DrizzleUnitOfWork,
    UNIT_OF_WORK_TOKEN,
  ],
})
export class DatabaseModule {}
