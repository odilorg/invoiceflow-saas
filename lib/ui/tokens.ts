/**
 * SPACING + TYPOGRAPHY TOKENS
 * App-wide rhythm and consistency
 *
 * RULE: Use these tokens to reduce random spacing + font decisions.
 * Simple string exports - no over-engineering.
 */

// ============================================================================
// LAYOUT SPACING
// ============================================================================

/**
 * Horizontal padding for page containers
 * Usage: <div className={PAGE_X}>
 */
export const PAGE_X = 'px-4 sm:px-6';

/**
 * Vertical padding for page containers
 * Usage: <div className={PAGE_Y}>
 */
export const PAGE_Y = 'py-6';

/**
 * Vertical spacing between sections
 * Usage: <div className={SECTION_GAP}>
 */
export const SECTION_GAP = 'space-y-6';

/**
 * Card padding with responsive adjustment
 * Usage: <div className={CARD_PAD}>
 */
export const CARD_PAD = 'p-4 md:p-5';

/**
 * Gap between items in a list/stack
 * Usage: <div className={STACK_GAP}>
 */
export const STACK_GAP = 'space-y-4';

/**
 * Gap between items in a horizontal flex
 * Usage: <div className={FLEX_GAP}>
 */
export const FLEX_GAP = 'gap-4';

// ============================================================================
// CONTROL DIMENSIONS
// ============================================================================

/**
 * Minimum height for buttons (touch-friendly)
 * Usage: <button className={BTN_MIN_H}>
 */
export const BTN_MIN_H = 'min-h-[44px]';

/**
 * Standard input height
 * Usage: <input className={INPUT_H}>
 */
export const INPUT_H = 'h-11';

/**
 * Icon button size (square, touch-friendly)
 * Usage: <button className={ICON_BTN}>
 */
export const ICON_BTN = 'w-11 h-11';

// ============================================================================
// TYPOGRAPHY
// ============================================================================

/**
 * Page heading (h1)
 * Usage: <h1 className={H1}>
 */
export const H1 = 'text-xl font-semibold';

/**
 * Section heading (h2)
 * Usage: <h2 className={H2}>
 */
export const H2 = 'text-base font-semibold';

/**
 * Subsection heading (h3)
 * Usage: <h3 className={H3}>
 */
export const H3 = 'text-sm font-semibold';

/**
 * Standard body text
 * Usage: <p className={BODY}>
 */
export const BODY = 'text-[15px] leading-6';

/**
 * Subtle/muted text
 * Usage: <p className={SUBTLE}>
 */
export const SUBTLE = 'text-sm text-muted-foreground';

/**
 * Field labels (uppercase, small)
 * Usage: <label className={LABEL}>
 */
export const LABEL = 'text-xs uppercase tracking-wide text-muted-foreground';

/**
 * Field values (medium weight)
 * Usage: <span className={VALUE}>
 */
export const VALUE = 'text-sm font-medium';

/**
 * Caption text (smallest)
 * Usage: <span className={CAPTION}>
 */
export const CAPTION = 'text-xs text-muted-foreground';

/**
 * Error message text
 * Usage: <p className={ERROR}>
 */
export const ERROR = 'text-sm text-destructive';

/**
 * Success message text
 * Usage: <p className={SUCCESS}>
 */
export const SUCCESS = 'text-sm text-success';
