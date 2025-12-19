/**
 * Pagination Request DTO
 * Used for query parameters in list endpoints
 */
export class PaginationDto {
  page?: number = 1;
  limit?: number = 10;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc' = 'asc';

  constructor(partial?: Partial<PaginationDto>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  getSkip(): number {
    return ((this.page || 1) - 1) * (this.limit || 10);
  }

  getTake(): number {
    return this.limit || 10;
  }

  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.page !== undefined && this.page < 1) {
      errors.push('Page must be greater than 0');
    }

    if (this.limit !== undefined) {
      if (this.limit < 1) {
        errors.push('Limit must be greater than 0');
      }
      if (this.limit > 100) {
        errors.push('Limit cannot exceed 100');
      }
    }

    if (
      this.sortOrder &&
      !['asc', 'desc'].includes(this.sortOrder.toLowerCase())
    ) {
      errors.push("Sort order must be 'asc' or 'desc'");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Pagination Metadata
 */
export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginated Response DTO
 */
export class PaginatedResponseDto<T> {
  data: T[];
  meta: PaginationMetadata;

  constructor(data: T[], total: number, page: number = 1, limit: number = 10) {
    this.data = data;
    this.meta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPreviousPage: page > 1,
    };
  }

  static create<T>(
    data: T[],
    total: number,
    pagination: PaginationDto,
  ): PaginatedResponseDto<T> {
    return new PaginatedResponseDto(
      data,
      total,
      pagination.page || 1,
      pagination.limit || 10,
    );
  }
}
