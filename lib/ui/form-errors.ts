/**
 * Form Error Handling Utilities
 *
 * Standardized error handling for all forms in the application.
 * Supports both field-level validation errors and server errors.
 */

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  /** General error message (shown in banner) */
  error: string;
  /** Optional detailed message */
  message?: string;
  /** Field-specific validation errors */
  fieldErrors?: Record<string, string>;
  /** Whether error requires upgrade (for billing) */
  upgradeRequired?: boolean;
}

/**
 * Form validation errors state
 */
export interface FormErrors {
  /** Server error message (shown in banner) */
  serverError?: string;
  /** Field-level errors (shown under inputs) */
  fieldErrors: Record<string, string>;
}

/**
 * Validation rule functions
 */
export type ValidationRule = (value: any) => string | undefined;

/**
 * Common validation rules
 */
export const validators = {
  /** Validate required field */
  required: (fieldName: string): ValidationRule => {
    return (value: any) => {
      if (!value || (typeof value === 'string' && !value.trim())) {
        return `${fieldName} is required`;
      }
      return undefined;
    };
  },

  /** Validate email format */
  email: (): ValidationRule => {
    return (value: string) => {
      if (!value) return undefined; // Use required validator separately
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
      }
      return undefined;
    };
  },

  /** Validate minimum length */
  minLength: (min: number, fieldName: string): ValidationRule => {
    return (value: string) => {
      if (!value) return undefined;
      if (value.length < min) {
        return `${fieldName} must be at least ${min} characters`;
      }
      return undefined;
    };
  },

  /** Validate maximum length */
  maxLength: (max: number, fieldName: string): ValidationRule => {
    return (value: string) => {
      if (!value) return undefined;
      if (value.length > max) {
        return `${fieldName} must be less than ${max} characters`;
      }
      return undefined;
    };
  },

  /** Validate minimum number */
  min: (min: number, fieldName: string): ValidationRule => {
    return (value: number) => {
      if (value === undefined || value === null) return undefined;
      if (value < min) {
        return `${fieldName} must be at least ${min}`;
      }
      return undefined;
    };
  },

  /** Validate maximum number */
  max: (max: number, fieldName: string): ValidationRule => {
    return (value: number) => {
      if (value === undefined || value === null) return undefined;
      if (value > max) {
        return `${fieldName} must be at most ${max}`;
      }
      return undefined;
    };
  },

  /** Validate pattern (regex) */
  pattern: (regex: RegExp, message: string): ValidationRule => {
    return (value: string) => {
      if (!value) return undefined;
      if (!regex.test(value)) {
        return message;
      }
      return undefined;
    };
  },

  /** Custom validator */
  custom: (fn: (value: any) => boolean, message: string): ValidationRule => {
    return (value: any) => {
      if (!fn(value)) {
        return message;
      }
      return undefined;
    };
  },
};

/**
 * Validate a single field against multiple rules
 */
export function validateField(value: any, rules: ValidationRule[]): string | undefined {
  for (const rule of rules) {
    const error = rule(value);
    if (error) {
      return error;
    }
  }
  return undefined;
}

/**
 * Validate entire form data against validation schema
 */
export function validateForm<T extends Record<string, any>>(
  data: T,
  schema: Record<keyof T, ValidationRule[]>
): FormErrors {
  const fieldErrors: Record<string, string> = {};

  for (const fieldName in schema) {
    const rules = schema[fieldName];
    const value = data[fieldName];
    const error = validateField(value, rules);
    if (error) {
      fieldErrors[fieldName as string] = error;
    }
  }

  return {
    fieldErrors,
  };
}

/**
 * Parse API error response into FormErrors
 */
export function parseApiError(error: unknown): FormErrors {
  // Handle ApiErrorResponse format
  if (error && typeof error === 'object' && 'error' in error) {
    const apiError = error as ApiErrorResponse;
    return {
      serverError: apiError.message || apiError.error,
      fieldErrors: apiError.fieldErrors || {},
    };
  }

  // Handle Error object
  if (error instanceof Error) {
    return {
      serverError: error.message,
      fieldErrors: {},
    };
  }

  // Handle string error
  if (typeof error === 'string') {
    return {
      serverError: error,
      fieldErrors: {},
    };
  }

  // Unknown error
  return {
    serverError: 'An unexpected error occurred. Please try again.',
    fieldErrors: {},
  };
}

/**
 * Merge validation errors with API errors
 */
export function mergeErrors(
  validationErrors: FormErrors,
  apiErrors: FormErrors
): FormErrors {
  return {
    serverError: apiErrors.serverError || validationErrors.serverError,
    fieldErrors: {
      ...validationErrors.fieldErrors,
      ...apiErrors.fieldErrors,
    },
  };
}

/**
 * Check if form has any errors
 */
export function hasErrors(errors: FormErrors): boolean {
  return !!(errors.serverError || Object.keys(errors.fieldErrors).length > 0);
}

/**
 * Clear all errors
 */
export function clearErrors(): FormErrors {
  return {
    fieldErrors: {},
  };
}

/**
 * Clear specific field error
 */
export function clearFieldError(
  errors: FormErrors,
  fieldName: string
): FormErrors {
  const { [fieldName]: _, ...rest } = errors.fieldErrors;
  return {
    ...errors,
    fieldErrors: rest,
  };
}

/**
 * Set server error
 */
export function setServerError(message: string): FormErrors {
  return {
    serverError: message,
    fieldErrors: {},
  };
}

/**
 * Set field error
 */
export function setFieldError(fieldName: string, message: string): FormErrors {
  return {
    fieldErrors: {
      [fieldName]: message,
    },
  };
}
