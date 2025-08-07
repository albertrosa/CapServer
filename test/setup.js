// Test setup file for Jest
require('dotenv').config({ path: '../.env' });

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.SOL_SECRET = JSON.stringify(new Array(64).fill(1));

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
  Keypair: {
    ...jest.fn(),
    fromSeed: jest.fn(() => ({
      publicKey: { 
        toBase58: jest.fn(() => 'test_public_key'),
        toBytes: jest.fn(() => new Uint8Array(32))
      },
      secretKey: new Uint8Array(32)
    }))
  },
  Transaction: jest.fn(),
  PublicKey: jest.fn(() => ({
    toBytes: jest.fn(() => new Uint8Array(32))
  })),
  VersionedTransaction: jest.fn(),
  VersionedMessage: {
    deserialize: jest.fn(() => ({
      header: { numRequiredSignatures: 1 },
      staticAccountKeys: [{ toBase58: jest.fn(() => 'test_public_key') }],
      recentBlockhash: 'test_blockhash',
      compiledInstructions: [],
      serialize: jest.fn(() => Buffer.from('test_message'))
    }))
  },
  Connection: jest.fn(() => ({
    sendTransaction: jest.fn(() => Promise.resolve('test_transaction_id')),
    confirmTransaction: jest.fn(() => Promise.resolve({ status: 'confirmed' })),
    simulateTransaction: jest.fn(() => Promise.resolve({ value: { err: null } }))
  })),
  clusterApiUrl: jest.fn(() => 'https://api.mainnet-beta.solana.com'),
  Ed25519Program: {
    createInstructionWithPublicKey: jest.fn(() => ({
      programId: { toBase58: jest.fn(() => 'test_program_id') },
      keys: [],
      data: Buffer.from('test_instruction')
    }))
  }
}));

jest.mock('tweetnacl', () => ({
  sign: {
    detached: jest.fn(() => new Uint8Array(64)),
    verify: jest.fn(() => true)
  },
  util: require('tweetnacl-util')
}));

jest.mock('bs58', () => ({
  encode: jest.fn(() => 'test_signature'),
  decode: jest.fn(() => new Uint8Array(64))
})); 