import { PaginationDto } from './pagination.dto';

/**
 * Pagination Utilities
 */
export class PaginationUtils {
  /**
   * Parse pagination from query parameters
   */
  static fromQuery(query: Record<string, any>): PaginationDto {
    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 10;
    const sortBy = query.sortBy || undefined;
    const sortOrder = (query.sortOrder || 'asc').toLowerCase() as
      | 'asc'
      | 'desc';

    return new PaginationDto({
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 10 : limit,
      sortBy,
      sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
    });
  }

  /**
   * Validate and normalize pagination
   */
  static normalize(pagination: Partial<PaginationDto>): PaginationDto {
    const normalized = new PaginationDto({
      page: pagination.page && pagination.page > 0 ? pagination.page : 1,
      limit:
        pagination.limit && pagination.limit > 0 && pagination.limit <= 100
          ? pagination.limit
          : 10,
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder === 'desc' ? 'desc' : 'asc',
    });

    return normalized;
  }

  /**
   * Get database offset (skip)
   */
  static getOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Calculate total pages
   */
  static getTotalPages(total: number, limit: number): number {
    return Math.ceil(total / limit);
  }
}
