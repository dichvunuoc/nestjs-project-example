import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { AppConfigService } from './config.service';
import { validateConfigOrThrow } from './config.validation';

/**
 * Configuration Module
 * 
 * Provides type-safe configuration với validation
 * 
 * Usage:
 * ```typescript
 * @Module({
 *   imports: [
 *     ConfigModule.forRoot({
 *       isGlobal: true,
 *       validate: validateConfigOrThrow,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateConfigOrThrow,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
