import { Module, Global, OnModuleInit } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DatabaseHealthIndicator } from './health-indicators/database.health-indicator';
import { RedisHealthIndicator } from './health-indicators/redis.health-indicator';

/**
 * Health Check Module
 * Provides health check endpoints and indicators
 *
 * This module is marked as @Global() so it can be imported once and used throughout the app
 */
@Global()
@Module({
  controllers: [HealthController],
  providers: [HealthService, DatabaseHealthIndicator, RedisHealthIndicator],
  exports: [HealthService, DatabaseHealthIndicator, RedisHealthIndicator],
})
export class HealthModule implements OnModuleInit {
  constructor(
    private readonly healthService: HealthService,
    private readonly databaseIndicator: DatabaseHealthIndicator,
    private readonly redisIndicator: RedisHealthIndicator,
  ) {}

  onModuleInit() {
    // Register all indicators when module initializes
    this.healthService.registerIndicator('database', this.databaseIndicator);
    this.healthService.registerIndicator('redis', this.redisIndicator);
  }
}
