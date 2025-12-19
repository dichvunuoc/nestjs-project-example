/**
 * Standardized API Response DTO
 *
 * All API responses should follow this format for consistency
 */
export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  timestamp: string;
  path?: string;
  method?: string;
  data?: T;
  message?: string;
}

/**
 * Success Response DTO
 */
export class SuccessResponseDto<T = any> implements ApiResponse<T> {
  success: boolean = true;
  statusCode: number;
  timestamp: string;
  path?: string;
  method?: string;
  data?: T;
  message?: string;

  constructor(
    data?: T,
    statusCode: number = 200,
    message?: string,
    path?: string,
    method?: string,
  ) {
    this.data = data;
    this.statusCode = statusCode;
    this.message = message;
    this.timestamp = new Date().toISOString();
    this.path = path;
    this.method = method;
  }

  static ok<T>(data?: T, message?: string): SuccessResponseDto<T> {
    return new SuccessResponseDto(data, 200, message);
  }

  static created<T>(data?: T, message?: string): SuccessResponseDto<T> {
    return new SuccessResponseDto(
      data,
      201,
      message || 'Resource created successfully',
    );
  }

  static accepted<T>(data?: T, message?: string): SuccessResponseDto<T> {
    return new SuccessResponseDto(data, 202, message || 'Request accepted');
  }

  static noContent(message?: string): SuccessResponseDto {
    return new SuccessResponseDto(undefined, 204, message);
  }
}
