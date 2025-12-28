import { FREE_INVOICE_LIMIT, MAX_FOLLOWUPS_PER_DAY_PER_INVOICE } from '@/lib/constants';

describe('Constants', () => {
  describe('FREE_INVOICE_LIMIT', () => {
    it('should be defined', () => {
      expect(FREE_INVOICE_LIMIT).toBeDefined();
    });

    it('should be a positive number', () => {
      expect(FREE_INVOICE_LIMIT).toBeGreaterThan(0);
    });

    it('should have expected value', () => {
      expect(FREE_INVOICE_LIMIT).toBe(5);
    });
  });

  describe('MAX_FOLLOWUPS_PER_DAY_PER_INVOICE', () => {
    it('should be defined', () => {
      expect(MAX_FOLLOWUPS_PER_DAY_PER_INVOICE).toBeDefined();
    });

    it('should be a positive number', () => {
      expect(MAX_FOLLOWUPS_PER_DAY_PER_INVOICE).toBeGreaterThan(0);
    });

    it('should have expected value', () => {
      expect(MAX_FOLLOWUPS_PER_DAY_PER_INVOICE).toBe(1);
    });
  });
});
