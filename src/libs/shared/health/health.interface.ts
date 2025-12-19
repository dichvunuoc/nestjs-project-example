/**
 * Health Status enum
 */
export enum HealthStatus {
  UP = 'up',
  DOWN = 'down',
  DEGRADED = 'degraded',
}

/**
 * Health check result interface
 */
export interface HealthCheckResult {
  status: HealthStatus;
  message?: string;
  error?: string;
  timestamp?: string;
  [key: string]: any;
}

/**
 * Health indicator interface
 * Implement this interface to create custom health indicators
 */
export interface IHealthIndicator {
  check(): Promise<HealthCheckResult>;
}

/**
 * Overall health check response
 */
export interface HealthCheckResponse {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  checks: Record<string, HealthCheckResult>;
}
