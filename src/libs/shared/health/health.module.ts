import { Module, Global, OnModuleInit } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DatabaseHealthIndicator } from './indicators/database.health-indicator';
import { RedisHealthIndicator } from './indicators/redis.health-indicator';

/**
 * Health Check Module
 * Provides health check endpoints and indicators
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
    this.healthService.registerIndicator('database', this.databaseIndicator);
    this.healthService.registerIndicator('redis', this.redisIndicator);
  }
}
