#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Test configuration
const testConfig = {
  unit: {
    pattern: 'unit/**/*.test.js',
    description: 'Unit tests for individual modules'
  },
  integration: {
    pattern: 'integration/**/*.test.js',
    description: 'Integration tests for component interactions'
  },
  e2e: {
    pattern: 'e2e/**/*.test.js',
    description: 'End-to-end tests for complete workflows'
  },
  all: {
    pattern: '**/*.test.js',
    description: 'All tests'
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runJest(testPattern, options = {}) {
  return new Promise((resolve, reject) => {
    const args = [
      '--testPathPattern', testPattern,
      '--verbose',
      '--no-cache'
    ];

    if (options.watch) {
      args.push('--watch');
    }

    if (options.coverage) {
      args.push('--coverage');
    }

    if (options.ci) {
      args.push('--ci');
      args.push('--coverage');
      args.push('--watchAll=false');
    }

    const jestProcess = spawn('npx', ['jest', ...args], {
      stdio: 'inherit',
      shell: true,
      cwd: __dirname
    });

    jestProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Jest exited with code ${code}`));
      }
    });

    jestProcess.on('error', (error) => {
      reject(error);
    });
  });
}

function showHelp() {
  log('CapServer Test Runner', 'bright');
  log('====================\n', 'bright');
  
  log('Usage:', 'cyan');
  log('  node run-tests.js [test-type] [options]\n', 'reset');
  
  log('Test Types:', 'cyan');
  Object.entries(testConfig).forEach(([type, config]) => {
    log(`  ${type.padEnd(12)} - ${config.description}`, 'yellow');
  });
  
  log('\nOptions:', 'cyan');
  log('  --watch     Run tests in watch mode', 'yellow');
  log('  --coverage  Generate coverage report', 'yellow');
  log('  --ci        Run in CI mode (no watch, with coverage)', 'yellow');
  log('  --help      Show this help message', 'yellow');
  
  log('\nExamples:', 'cyan');
  log('  node run-tests.js unit', 'green');
  log('  node run-tests.js integration --watch', 'green');
  log('  node run-tests.js e2e --coverage', 'green');
  log('  node run-tests.js all --ci', 'green');
}

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  const testType = args[0];
  const options = {
    watch: args.includes('--watch'),
    coverage: args.includes('--coverage'),
    ci: args.includes('--ci'),
    help: args.includes('--help')
  };

  // Show help if requested
  if (options.help || !testType) {
    showHelp();
    return;
  }

  // Validate test type
  if (!testConfig[testType]) {
    log(`Error: Unknown test type '${testType}'`, 'red');
    log('Run with --help to see available test types', 'yellow');
    process.exit(1);
  }

  // CI mode overrides other options
  if (options.ci) {
    options.watch = false;
    options.coverage = true;
  }

  const config = testConfig[testType];
  
  log(`Running ${testType} tests...`, 'bright');
  log(`Pattern: ${config.pattern}`, 'cyan');
  log(`Description: ${config.description}`, 'cyan');
  
  if (options.watch) {
    log('Mode: Watch', 'yellow');
  } else if (options.coverage) {
    log('Mode: Coverage', 'yellow');
  } else if (options.ci) {
    log('Mode: CI', 'yellow');
  } else {
    log('Mode: Standard', 'yellow');
  }
  
  log('', 'reset');

  try {
    await runJest(config.pattern, options);
    log(`\n✅ ${testType} tests completed successfully!`, 'green');
  } catch (error) {
    log(`\n❌ ${testType} tests failed!`, 'red');
    log(error.message, 'red');
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n\nTest run interrupted by user', 'yellow');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('\n\nTest run terminated', 'yellow');
  process.exit(0);
});

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    log(`\n❌ Test runner failed!`, 'red');
    log(error.message, 'red');
    process.exit(1);
  });
}

module.exports = {
  runJest,
  testConfig,
  showHelp
}; 