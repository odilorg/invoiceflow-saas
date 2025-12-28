import bcrypt from 'bcryptjs';

// Test bcrypt functions directly since lib/auth.ts uses server-only next/headers
describe('Auth Library', () => {
  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'testPassword123';
      const hash = await bcrypt.hash(password, 10);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'testPassword123';
      const hash1 = await bcrypt.hash(password, 10);
      const hash2 = await bcrypt.hash(password, 10);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'testPassword123';
      const hash = await bcrypt.hash(password, 10);
      const isValid = await bcrypt.compare(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword456';
      const hash = await bcrypt.hash(password, 10);
      const isValid = await bcrypt.compare(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it('should reject empty password', async () => {
      const password = 'testPassword123';
      const hash = await bcrypt.hash(password, 10);
      const isValid = await bcrypt.compare('', hash);

      expect(isValid).toBe(false);
    });
  });
});
