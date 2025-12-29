/**
 * Form Components - Unified Form System
 *
 * Exports all form primitives for easy importing:
 * import { FormField, FormInput, FormTextarea, ... } from '@/components/form';
 */

export { default as FormField } from './FormField';
export type { FormFieldProps } from './FormField';

export { default as FormInput } from './FormInput';
export type { FormInputProps } from './FormInput';

export { default as FormAmountInput } from './FormAmountInput';
export type { FormAmountInputProps } from './FormAmountInput';

export { default as FormTextarea } from './FormTextarea';
export type { FormTextareaProps } from './FormTextarea';

export { default as FormSelect } from './FormSelect';
export type { FormSelectProps, FormSelectOption } from './FormSelect';

export { default as FormDateInput } from './FormDateInput';
export type { FormDateInputProps } from './FormDateInput';

export { default as FormCheckbox } from './FormCheckbox';
export type { FormCheckboxProps } from './FormCheckbox';

export { default as FormToggle } from './FormToggle';
export type { FormToggleProps } from './FormToggle';

export { default as FormModalShell } from './FormModalShell';
export type { FormModalShellProps } from './FormModalShell';

export { default as FormSection } from './FormSection';
export type { FormSectionProps } from './FormSection';

export { default as FormActions } from './FormActions';
export type { FormActionsProps } from './FormActions';

export { default as FormErrorBanner } from './FormErrorBanner';
export type { FormErrorBannerProps } from './FormErrorBanner';

export { useFormValidation } from './useFormValidation';
export type { UseFormValidationReturn } from './useFormValidation';
