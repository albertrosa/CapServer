# CapServer Test Suite

This directory contains a comprehensive test suite for the CapServer project, covering unit tests, integration tests, and end-to-end tests.

## Test Structure

```
test/
├── package.json          # Test dependencies and scripts
├── setup.js             # Jest configuration and global mocks
├── unit/                # Unit tests for individual modules
│   ├── cap_lib.test.js  # Tests for cap_lib.js functions
│   └── utils.test.js    # Tests for utility functions
├── integration/         # Integration tests
│   ├── app.test.js      # Tests for Express app endpoints
│   └── routes.test.js   # Tests for route handlers
├── e2e/                 # End-to-end tests
│   └── end-to-end.test.js # Complete workflow tests
└── README.md            # This file
```

## Prerequisites

Before running the tests, make sure you have:

1. Node.js installed (version 14 or higher)
2. All project dependencies installed (`npm install` in the root directory)
3. Test dependencies installed (`npm install` in the test directory)

## Installation

```bash
# Install test dependencies
cd test
npm install
```

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Types
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# End-to-end tests only
npm run test:e2e
```

### Watch Mode
```bash
# Run tests in watch mode (re-runs on file changes)
npm run test:watch
```

### Coverage Report
```bash
# Generate coverage report
npm run test:coverage
```

The coverage report will be generated in the `test/coverage/` directory.

## Test Categories

### Unit Tests (`test/unit/`)

Unit tests focus on testing individual functions and modules in isolation:

- **cap_lib.test.js**: Tests for the core CapServer library functions
  - Rule constants validation
  - `verify()` function for different rule types
  - `validate()` function for various validation scenarios
  - Solana transaction processing functions
  - Error handling and edge cases

- **utils.test.js**: Tests for utility functions
  - MD5 hash generation
  - Input validation
  - Error handling

### Integration Tests (`test/integration/`)

Integration tests verify that different parts of the application work together:

- **app.test.js**: Tests for Express app endpoints
  - Health and status endpoints
  - Twitter OAuth endpoints
  - Meta data endpoints
  - Transaction processing endpoints
  - CORS configuration
  - Error handling

- **routes.test.js**: Tests for route handlers
  - Twitter API integration
  - Meta data CRUD operations
  - Validation endpoints
  - Request/response handling
  - Error scenarios

### End-to-End Tests (`test/e2e/`)

End-to-end tests simulate complete user workflows:

- **end-to-end.test.js**: Complete workflow tests
  - Full Twitter OAuth flow
  - Complete transaction processing pipeline
  - Twitter API integration flows
  - Meta data management flows
  - Performance and load testing
  - Security validation

## Mocking Strategy

The test suite uses comprehensive mocking to isolate the code under test:

### External Dependencies
- **@solana/web3.js**: Mocked Solana Web3 functions
- **tweetnacl**: Mocked cryptographic functions
- **bs58**: Mocked base58 encoding/decoding
- **axios**: Mocked HTTP requests
- **Database**: Mocked MySQL connections and queries

### Environment Variables
- Test environment variables are set in `setup.js`
- Sensitive data is mocked with test values

## Test Data

The tests use various types of test data:

- **Valid transactions**: Base64-encoded test transaction data
- **User data**: Mock Twitter user profiles
- **Rule data**: Various rule types and values
- **Error scenarios**: Invalid inputs and edge cases

## Writing New Tests

### Adding Unit Tests

1. Create a new test file in `test/unit/`
2. Import the module to test
3. Write test cases using Jest syntax
4. Mock external dependencies as needed

Example:
```javascript
const { myFunction } = require('../../path/to/module');

describe('myFunction', () => {
  test('should handle valid input', () => {
    const result = myFunction('valid input');
    expect(result).toBe('expected output');
  });

  test('should handle invalid input', () => {
    expect(() => myFunction(null)).toThrow('Invalid input');
  });
});
```

### Adding Integration Tests

1. Create a new test file in `test/integration/`
2. Mock the necessary dependencies
3. Test the interaction between components
4. Verify request/response handling

### Adding E2E Tests

1. Create a new test file in `test/e2e/`
2. Test complete user workflows
3. Verify end-to-end functionality
4. Include error scenarios and edge cases

## Best Practices

### Test Organization
- Group related tests using `describe()` blocks
- Use descriptive test names
- Follow the Arrange-Act-Assert pattern

### Mocking
- Mock external dependencies consistently
- Use realistic mock data
- Reset mocks between tests

### Error Testing
- Test both success and failure scenarios
- Verify error messages and status codes
- Test edge cases and invalid inputs

### Performance
- Keep tests fast and focused
- Use appropriate timeouts
- Avoid unnecessary async operations

## Troubleshooting

### Common Issues

1. **Test failures due to missing mocks**
   - Check that all external dependencies are mocked
   - Verify mock implementations are correct

2. **Environment variable issues**
   - Ensure test environment variables are set in `setup.js`
   - Check that sensitive data is properly mocked

3. **Async test failures**
   - Use `async/await` for asynchronous tests
   - Set appropriate timeouts for long-running operations

4. **Coverage issues**
   - Ensure all code paths are tested
   - Add tests for error handling scenarios

### Debugging

To debug failing tests:

1. Run tests with verbose output:
   ```bash
   npm test -- --verbose
   ```

2. Run a specific test file:
   ```bash
   npm test -- test/unit/cap_lib.test.js
   ```

3. Run tests in watch mode for development:
   ```bash
   npm run test:watch
   ```

## Continuous Integration

The test suite is designed to run in CI/CD environments:

- All tests should pass before merging code
- Coverage reports are generated automatically
- Tests run on multiple Node.js versions
- Performance benchmarks are included

## Contributing

When adding new features or fixing bugs:

1. Write tests for new functionality
2. Ensure existing tests still pass
3. Update test documentation as needed
4. Maintain test coverage above 80%

## Support

For questions about the test suite:

1. Check this README for common issues
2. Review existing test examples
3. Consult Jest documentation
4. Contact the development team 