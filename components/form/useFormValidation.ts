import { useState, useCallback } from 'react';
import {
  FormErrors,
  ValidationRule,
  validateField,
  validateForm,
  parseApiError,
  clearErrors,
  clearFieldError,
  hasErrors,
} from '@/lib/ui/form-errors';

/**
 * useFormValidation - React hook for form validation state management
 *
 * Features:
 * - Client-side validation with custom rules
 * - Server error handling
 * - Field-level error management
 * - Blur validation support
 * - Loading state management
 *
 * Usage:
 * ```tsx
 * const {
 *   errors,
 *   isLoading,
 *   validateOnSubmit,
 *   validateOnBlur,
 *   handleApiError,
 *   clearAllErrors,
 * } = useFormValidation();
 *
 * const handleSubmit = async () => {
 *   const validationErrors = validateOnSubmit(formData, schema);
 *   if (hasErrors(validationErrors)) return;
 *
 *   try {
 *     await api.submit(formData);
 *   } catch (error) {
 *     handleApiError(error);
 *   }
 * };
 * ```
 */
export function useFormValidation() {
  const [errors, setErrors] = useState<FormErrors>({
    fieldErrors: {},
  });
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Validate entire form on submit
   */
  const validateOnSubmit = useCallback(
    <T extends Record<string, any>>(
      data: T,
      schema: Record<keyof T, ValidationRule[]>
    ): FormErrors => {
      const validationErrors = validateForm(data, schema);
      setErrors(validationErrors);
      return validationErrors;
    },
    []
  );

  /**
   * Validate single field on blur
   */
  const validateOnBlur = useCallback(
    (fieldName: string, value: any, rules: ValidationRule[]) => {
      const error = validateField(value, rules);
      setErrors((prev) => {
        if (error) {
          return {
            ...prev,
            fieldErrors: {
              ...prev.fieldErrors,
              [fieldName]: error,
            },
          };
        } else {
          // Clear field error if valid
          const { [fieldName]: _, ...rest } = prev.fieldErrors;
          return {
            ...prev,
            fieldErrors: rest,
          };
        }
      });
    },
    []
  );

  /**
   * Handle API error response
   */
  const handleApiError = useCallback((error: unknown) => {
    const apiErrors = parseApiError(error);
    setErrors(apiErrors);
  }, []);

  /**
   * Clear all errors
   */
  const clearAllErrors = useCallback(() => {
    setErrors(clearErrors());
  }, []);

  /**
   * Clear specific field error
   */
  const clearError = useCallback((fieldName: string) => {
    setErrors((prev) => clearFieldError(prev, fieldName));
  }, []);

  /**
   * Set loading state
   */
  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  /**
   * Check if form has errors
   */
  const hasFormErrors = useCallback(() => {
    return hasErrors(errors);
  }, [errors]);

  return {
    errors,
    isLoading,
    setLoading,
    validateOnSubmit,
    validateOnBlur,
    handleApiError,
    clearAllErrors,
    clearError,
    hasFormErrors,
  };
}

export type UseFormValidationReturn = ReturnType<typeof useFormValidation>;
