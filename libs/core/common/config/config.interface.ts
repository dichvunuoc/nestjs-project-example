/**
 * Configuration Interface
 * 
 * Base interface cho configuration classes
 */
export interface IConfig {
  [key: string]: any;
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
}
