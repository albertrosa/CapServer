// Test setup file for Jest
require('dotenv').config({ path: '../.env' });

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test timeout
jest.setTimeout(30000);

// Mock external dependencies
jest.mock('@solana/web3.js', () => ({
  Keypair: jest.fn(),
  Transaction: jest.fn(),
  PublicKey: jest.fn(),
  VersionedTransaction: jest.fn(),
  VersionedMessage: jest.fn(),
  Connection: jest.fn(),
  clusterApiUrl: jest.fn(),
  Ed25519Program: {
    createInstructionWithPublicKey: jest.fn()
  }
}));

jest.mock('tweetnacl', () => ({
  sign: {
    detached: jest.fn()
  },
  util: require('tweetnacl-util')
}));

jest.mock('bs58', () => ({
  encode: jest.fn(),
  decode: jest.fn()
})); 