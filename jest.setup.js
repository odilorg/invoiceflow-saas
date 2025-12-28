// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NEXTAUTH_SECRET = 'test-secret-for-testing-only'
process.env.NEXTAUTH_URL = 'http://localhost:3005'
process.env.RESEND_API_KEY = 'test-resend-key'
process.env.EMAIL_FROM = 'test@example.com'
