/**
 * Standardized API response helpers
 * Ensures consistent response format across all endpoints
 */

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Create a successful API response
 */
export function apiSuccess<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Create an error API response
 */
export function apiError(error: string, details?: unknown): ApiErrorResponse {
  const response: ApiErrorResponse = {
    success: false,
    error,
  };
  if (details !== undefined) {
    response.details = details;
  }
  return response;
}

/**
 * Common error responses
 */
export const commonErrors = {
  unauthorized: () => apiError('Unauthorized'),
  forbidden: () => apiError('Forbidden'),
  notFound: (resource = 'Resource') => apiError(`${resource} not found`),
  validation: (details?: unknown) => apiError('Validation failed', details),
  rateLimit: (reset?: number) =>
    apiError('Too many requests. Please try again later.', { reset }),
  internal: () => apiError('Internal server error'),
};
