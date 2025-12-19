import { Module, Global, DynamicModule, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from './database.service';
import {
  DATABASE_READ_TOKEN,
  DATABASE_WRITE_TOKEN,
  createDrizzleProvider,
} from './database.provider';

export interface DatabaseModuleOptions<
  TSchema extends Record<string, unknown>,
> {
  schema: TSchema;
  writeEnvVar?: string;
  readEnvVar?: string;
  unitOfWorkProvider?: Provider;
}

/**
 * Database Module
 *
 * Shared database module for Drizzle ORM with PostgreSQL.
 * Provides read/write database connections and optional unit of work.
 *
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [
 *     DrizzleDatabaseModule.forRoot({
 *       schema: mySchema,
 *       unitOfWorkProvider: {
 *         provide: UNIT_OF_WORK_TOKEN,
 *         useClass: DrizzleUnitOfWork,
 *       },
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({})
export class DrizzleDatabaseModule {
  static forRoot<TSchema extends Record<string, unknown>>(
    options: DatabaseModuleOptions<TSchema>,
  ): DynamicModule {
    const providers: Provider[] = [
      DatabaseService,
      createDrizzleProvider(
        DATABASE_WRITE_TOKEN,
        'WRITE',
        options.schema,
        options.writeEnvVar || 'DATABASE_URL',
      ),
      createDrizzleProvider(
        DATABASE_READ_TOKEN,
        'READ',
        options.schema,
        options.readEnvVar || 'DATABASE_URL',
      ),
    ];

    const exports: (symbol | typeof DatabaseService)[] = [
      DatabaseService,
      DATABASE_WRITE_TOKEN,
      DATABASE_READ_TOKEN,
    ];

    if (options.unitOfWorkProvider) {
      providers.push(options.unitOfWorkProvider);
      const provider = options.unitOfWorkProvider as {
        provide?: string | symbol;
      };
      const token = provider.provide;
      if (token) {
        exports.push(token as symbol | typeof DatabaseService);
      }
    }

    return {
      module: DrizzleDatabaseModule,
      imports: [ConfigModule],
      providers,
      exports,
    };
  }
}
