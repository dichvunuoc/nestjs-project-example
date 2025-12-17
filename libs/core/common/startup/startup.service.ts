import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { HealthService } from '../health/health.service';

/**
 * Startup Service
 * 
 * Validates application startup và performs initialization checks
 * 
 * Usage:
 * Import vào AppModule - sẽ tự động chạy onModuleInit
 */
@Injectable()
export class StartupService implements OnModuleInit {
  private readonly logger = new Logger(StartupService.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly healthService: HealthService,
  ) {}

  async onModuleInit() {
    await this.validateStartup();
  }

  /**
   * Validate application startup
   */
  private async validateStartup(): Promise<void> {
    this.logger.log('Starting application validation...');

    try {
      // Validate configuration
      this.validateConfiguration();

      // Validate health checks
      await this.validateHealthChecks();

      this.logger.log('✅ Application validation passed');
    } catch (error) {
      this.logger.error(
        '❌ Application validation failed',
        error instanceof Error ? error.stack : String(error),
      );
      // In production, you might want to exit here
      // process.exit(1);
      throw error;
    }
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(): void {
    this.logger.debug('Validating configuration...');

    // Check required config values
    if (!this.config.database.writeUrl) {
      throw new Error('DATABASE_URL is required');
    }

    if (!this.config.redis.url) {
      throw new Error('REDIS_URL is required');
    }

    this.logger.debug('Configuration validation passed');
  }

  /**
   * Validate health checks
   */
  private async validateHealthChecks(): Promise<void> {
    this.logger.debug('Validating health checks...');

    try {
      const health = await this.healthService.checkHealth();

      if (health.status === 'DOWN') {
        const failedChecks = Object.entries(health.checks)
          .filter(([_, result]) => result.status === 'DOWN')
          .map(([name]) => name);

        throw new Error(
          `Health checks failed: ${failedChecks.join(', ')}`,
        );
      }

      this.logger.debug('Health checks validation passed');
    } catch (error) {
      this.logger.warn(
        'Health checks validation failed (non-critical)',
        error instanceof Error ? error.message : String(error),
      );
      // Don't throw - health checks might not be ready yet
    }
  }

  /**
   * Get startup information
   */
  getStartupInfo(): Record<string, any> {
    return {
      nodeEnv: this.config.nodeEnv,
      port: this.config.port,
      isProduction: this.config.isProduction,
      timestamp: new Date().toISOString(),
    };
  }
}
