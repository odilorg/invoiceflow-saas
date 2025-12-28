import { renderTemplate } from '@/lib/followups';

describe('Follow-ups Library', () => {
  describe('renderTemplate', () => {
    it('should replace single variable', () => {
      const template = 'Hello {name}!';
      const variables = { name: 'John' };
      const result = renderTemplate(template, variables);

      expect(result).toBe('Hello John!');
    });

    it('should replace multiple variables', () => {
      const template = 'Invoice {invoiceNumber} for {amount} {currency} is due on {dueDate}';
      const variables = {
        invoiceNumber: 'INV-001',
        amount: '1000',
        currency: 'USD',
        dueDate: '2025-01-15',
      };
      const result = renderTemplate(template, variables);

      expect(result).toBe('Invoice INV-001 for 1000 USD is due on 2025-01-15');
    });

    it('should replace same variable multiple times', () => {
      const template = 'Dear {name}, your invoice {name} has been sent.';
      const variables = { name: 'John' };
      const result = renderTemplate(template, variables);

      expect(result).toBe('Dear John, your invoice John has been sent.');
    });

    it('should handle empty template', () => {
      const template = '';
      const variables = { name: 'John' };
      const result = renderTemplate(template, variables);

      expect(result).toBe('');
    });

    it('should handle template with no variables', () => {
      const template = 'This is a static message';
      const variables = { name: 'John' };
      const result = renderTemplate(template, variables);

      expect(result).toBe('This is a static message');
    });

    it('should handle missing variable (leave placeholder)', () => {
      const template = 'Hello {name}, your order {orderId} is ready';
      const variables = { name: 'John' };
      const result = renderTemplate(template, variables);

      expect(result).toBe('Hello John, your order {orderId} is ready');
    });

    it('should handle special characters in template', () => {
      const template = 'Amount: ${amount} USD (including {tax}% tax)';
      const variables = { amount: '100', tax: '10' };
      const result = renderTemplate(template, variables);

      expect(result).toBe('Amount: $100 USD (including 10% tax)');
    });
  });
});
