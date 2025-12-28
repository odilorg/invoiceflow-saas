# Testing Guide - Invoice Follow-up SaaS

## Quick Start

```bash
# Run all tests
pnpm test

# Run tests in watch mode (re-run on file changes)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage
```

## Test Organization

### Directory Structure

```
__tests__/
├── api/                    # API endpoint integration tests
│   └── cron-followups.test.ts
├── components/             # React component tests
│   └── LoginPage.test.tsx
└── lib/                    # Business logic unit tests
    ├── auth.test.ts
    ├── constants.test.ts
    ├── followups.test.ts
    └── validation.test.ts
```

### Test Types

#### Unit Tests (lib/)
Test individual functions in isolation:
- Password hashing/verification
- Template rendering
- Schema validation
- Constants verification

#### Integration Tests (api/)
Test complex workflows and business logic:
- Cron job execution
- Follow-up scheduling
- Rate limiting
- Email processing

#### Component Tests (components/)
Test React components and user interactions:
- Form rendering
- User input handling
- Loading states
- Error handling
- Navigation

## Writing New Tests

### Example: Testing a Utility Function

```typescript
// __tests__/lib/example.test.ts
import { myFunction } from '@/lib/example';

describe('myFunction', () => {
  it('should return expected result', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });

  it('should handle edge cases', () => {
    expect(myFunction('')).toBe('default');
    expect(myFunction(null)).toBe('default');
  });
});
```

### Example: Testing an API Route

```typescript
// __tests__/api/example.test.ts
describe('Example API', () => {
  it('should validate input', () => {
    const invalidData = { missing: 'required field' };
    // Test validation logic
    expect(validateInput(invalidData)).toBe(false);
  });

  it('should process valid requests', () => {
    const validData = { all: 'fields present' };
    // Test success path
    expect(processRequest(validData)).toBeTruthy();
  });
});
```

### Example: Testing a React Component

```typescript
// __tests__/components/Example.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import ExampleComponent from '@/app/example/page';

describe('ExampleComponent', () => {
  it('should render correctly', () => {
    render(<ExampleComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    render(<ExampleComponent />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Updated')).toBeInTheDocument();
    });
  });
});
```

## Common Testing Patterns

### 1. Async Testing

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### 2. Error Testing

```typescript
it('should handle errors', () => {
  expect(() => functionThatThrows()).toThrow('Error message');
});
```

### 3. Mock Functions

```typescript
const mockFn = jest.fn();
mockFn.mockReturnValue('mocked value');
expect(mockFn()).toBe('mocked value');
expect(mockFn).toHaveBeenCalledTimes(1);
```

### 4. Testing React State

```typescript
const input = screen.getByLabelText('Email') as HTMLInputElement;
fireEvent.change(input, { target: { value: 'test@example.com' } });
expect(input.value).toBe('test@example.com');
```

## Debugging Tests

### Run Specific Test File

```bash
pnpm test auth.test.ts
```

### Run Specific Test Suite

```bash
pnpm test -- -t "Auth Library"
```

### Run Specific Test

```bash
pnpm test -- -t "should hash a password"
```

### Verbose Output

```bash
pnpm test -- --verbose
```

### Debug Mode

Add `debugger;` statement in test:

```typescript
it('should debug this', () => {
  debugger; // Node will pause here
  const result = myFunction();
  expect(result).toBe('expected');
});
```

Then run:
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Test Coverage

### Generate Coverage Report

```bash
pnpm test:coverage
```

### Coverage Output

```
----------------------------|---------|----------|---------|---------|
File                        | % Stmts | % Branch | % Funcs | % Lines |
----------------------------|---------|----------|---------|---------|
All files                   |   XX.XX |    XX.XX |   XX.XX |   XX.XX |
 lib/                       |   XX.XX |    XX.XX |   XX.XX |   XX.XX |
  auth.ts                   |   XX.XX |    XX.XX |   XX.XX |   XX.XX |
  followups.ts              |   XX.XX |    XX.XX |   XX.XX |   XX.XX |
----------------------------|---------|----------|---------|---------|
```

### Improving Coverage

1. Identify uncovered lines in coverage report
2. Add tests for edge cases
3. Test error handling paths
4. Test all conditional branches

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm test
```

### Pre-commit Hook

```bash
# .husky/pre-commit
#!/bin/sh
pnpm test
```

## Best Practices

### ✅ DO

- Write descriptive test names
- Test one thing per test
- Use `beforeEach` for setup
- Mock external dependencies
- Test edge cases and errors
- Keep tests independent
- Use async/await for promises

### ❌ DON'T

- Test implementation details
- Share state between tests
- Mock everything
- Write flaky tests
- Skip error cases
- Use arbitrary timeouts
- Couple tests together

## Troubleshooting

### "Cannot find module '@/lib/...'"

Ensure `tsconfig.json` has correct paths:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### "next/headers" Error

Don't import server-only modules in tests. Test the logic separately or use mocks.

### "act(...)" Warnings

These are normal for async React component tests. Ensure you use `waitFor` for async updates.

### Tests Timing Out

Increase Jest timeout:

```typescript
jest.setTimeout(10000); // 10 seconds
```

Or for specific test:

```typescript
it('slow test', async () => {
  // test code
}, 10000);
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Next.js Testing](https://nextjs.org/docs/testing)

---

**Current Test Stats**: 53 passing tests across 6 test suites
