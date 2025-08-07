const request = require('supertest');
const express = require('express');

// Mock all external dependencies for E2E tests
jest.mock('@solana/web3.js', () => ({
  Keypair: {
    ...jest.fn(() => ({
      publicKey: { toBase58: jest.fn(() => 'test_public_key') },
      secretKey: new Uint8Array(32)
    })),
    fromSeed: jest.fn(() => ({
      publicKey: { toBase58: jest.fn(() => 'test_public_key') },
      secretKey: new Uint8Array(32)
    }))
  },
  Transaction: jest.fn(),
  PublicKey: jest.fn(),
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
    createInstructionWithPublicKey: jest.fn(() => ({ test: 'instruction' }))
  }
}));

jest.mock('tweetnacl', () => ({
  sign: {
    detached: jest.fn(() => new Uint8Array(64))
  },
  util: require('tweetnacl-util')
}));

jest.mock('bs58', () => ({
  encode: jest.fn(() => 'test_signature'),
  decode: jest.fn(() => new Uint8Array(64))
}));

jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({
    data: {
      data: {
        id: '12345',
        username: 'testuser',
        name: 'Test User',
        profile_image_url: 'https://example.com/avatar.jpg',
        created_at: '2020-01-01T00:00:00.000Z',
        public_metrics: {
          followers_count: 100,
          following_count: 50
        },
        verified: true,
        verified_type: 'blue'
      }
    }
  })),
  post: jest.fn(() => Promise.resolve({ data: { success: true } }))
}));

jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn(() => Promise.resolve([{ id: 1, data: 'test' }])),
    end: jest.fn()
  },
  sessionStore: {
    get: jest.fn(),
    set: jest.fn(),
    destroy: jest.fn(),
    on: jest.fn()
  }
}));

// Mock environment variables
process.env.SOL_SECRET = JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
process.env.SUGAR_DADDY_SECRET = JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
process.env.X_BEARER_TOKEN = 'test_bearer_token';
process.env.BEEF_URI = 'http://localhost:3000';

// Import the app after mocking
const app = require('../../app');

describe('End-to-End Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete User Authentication Flow', () => {
    test('should handle complete Twitter OAuth flow', async () => {
      // Step 1: Check initial status (not authenticated)
      let response = await request(app)
        .get('/status')
        .expect(200);
      
      let data = JSON.parse(response.text);
      expect(data.error).toBe('Login');
      expect(data.login).toBe(1);

      // Step 2: Initiate login
      response = await request(app)
        .get('/twitter/login')
        .expect(302); // Should redirect to Twitter OAuth

      // Step 3: Handle callback (simulated)
      response = await request(app)
        .get('/twitter/callback?code=test_code&state=test_state')
        .expect(200);

      // Step 4: Check status after authentication
      response = await request(app)
        .get('/status')
        .expect(200);
      
      data = JSON.parse(response.text);
      // Note: In a real scenario, this would show user data after successful auth
    });

    test('should handle logout flow', async () => {
      // Step 1: Logout
      const response = await request(app)
        .get('/logout')
        .expect(302);
      
      expect(response.headers.location).toBe('/status');

      // Step 2: Verify logged out status
      const statusResponse = await request(app)
        .get('/status')
        .expect(200);
      
      const data = JSON.parse(statusResponse.text);
      expect(data.error).toBe('Login');
      expect(data.login).toBe(1);
    });
  });

  describe('Complete Transaction Processing Flow', () => {
    test('should handle complete transaction validation and processing', async () => {
      const testTransaction = Buffer.from('test_transaction_data').toString('base64');
      const ruleType = 'post';

      // Step 1: Validate transaction format
      let response = await request(app)
        .post('/validate-transaction')
        .send({ encodedTransaction: testTransaction })
        .expect(200);
      
      let data = JSON.parse(response.text);
      expect(data.status).toBe('Valid');

      // Step 2: Process transaction
      response = await request(app)
        .post('/process-transaction')
        .send({ 
          encodedTransaction: testTransaction,
          rule_type: ruleType
        })
        .expect(200);
      
      data = JSON.parse(response.text);
      expect(data.status).toBe('Success');
      expect(data.publicKey).toBeDefined();
      expect(data.signature).toBeDefined();
      expect(data.messageInfo).toBeDefined();

      // Step 3: Process and send transaction
      response = await request(app)
        .post('/process-and-send-transaction')
        .send({ 
          encodedTransaction: testTransaction,
          rule_type: ruleType,
          network: 'mainnet-beta',
          options: { skipPreflight: false }
        })
        .expect(200);
      
      data = JSON.parse(response.text);
      expect(data.status).toBe('Success');
      expect(data.publicKey).toBeDefined();
      expect(data.signature).toBeDefined();
      expect(data.transactionId).toBeDefined();
    });

    test('should handle transaction with custom options', async () => {
      const testTransaction = Buffer.from('test_transaction_data').toString('base64');
      const signature = 'test_signature';

      // Step 1: Send signed transaction
      let response = await request(app)
        .post('/send-signed-transaction')
        .send({ 
          encodedTransaction: testTransaction,
          signature: signature,
          network: 'devnet',
          options: { 
            skipPreflight: true,
            maxRetries: 5
          }
        })
        .expect(200);
      
      let data = JSON.parse(response.text);
      expect(data.status).toBe('Success');
      expect(data.publicKey).toBeDefined();
      expect(data.transactionId).toBeDefined();

      // Step 2: Send versioned message
      response = await request(app)
        .post('/send-versioned-message')
        .send({ 
          encodedTransaction: testTransaction,
          network: 'testnet',
          options: { 
            waitForConfirmation: false
          }
        })
        .expect(200);
      
      data = JSON.parse(response.text);
      expect(data.status).toBe('Success');
      expect(data.publicKey).toBeDefined();
      expect(data.signature).toBeDefined();
      expect(data.transactionId).toBeDefined();
    });
  });

  describe('Complete Twitter API Integration Flow', () => {
    test('should handle complete Twitter search and user lookup flow', async () => {
      // Step 1: Search for users
      let response = await request(app)
        .get('/twitter/users?usernames=testuser1,testuser2')
        .expect(200);
      
      expect(response.body.message).toBe('User search results');

      // Step 2: Search for posts
      response = await request(app)
        .get('/twitter/search?q=test_query&limit=10')
        .expect(200);
      
      expect(response.body.message).toBe('Search results');

      // Step 3: Get recent follows
      response = await request(app)
        .get('/twitter/follows')
        .expect(200);
      
      expect(response.body.message).toBe('Recent search results');

      // Step 4: Search for specific posts
      response = await request(app)
        .get('/twitter/post?query=specific_post')
        .expect(200);
      
      expect(response.body.message).toBe('Post search results');
    });
  });

  describe('Complete Meta Data Flow', () => {
    test('should handle complete meta data CRUD operations', async () => {
      const testMetaData = {
        userId: '12345',
        metadata: {
          preferences: { theme: 'dark', notifications: true },
          lastLogin: new Date().toISOString()
        }
      };

      // Step 1: Save meta data
      let response = await request(app)
        .post('/meta')
        .send(testMetaData)
        .expect(200);
      
      expect(response.body.message).toBe('Meta save handler');

      // Step 2: Lookup meta data
      response = await request(app)
        .get('/meta')
        .expect(200);
      
      expect(response.body.message).toBe('Meta lookup handler');

      // Step 3: Delete meta data
      response = await request(app)
        .delete('/meta')
        .expect(200);
      
      expect(response.body.message).toBe('Meta delete handler');
    });
  });

  describe('Complete Validation Flow', () => {
    test('should handle complete verification process', async () => {
      const testVerificationData = {
        rule: 'post',
        value: 'Hello world!',
        userData: {
          post: 'Hello world! This is a test post.',
          verified: true,
          followers: 1000
        }
      };

      // Step 1: Verify rule
      const response = await request(app)
        .post('/verify')
        .send(testVerificationData)
        .expect(200);
      
      expect(response.body.message).toBe('Verify handler');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle missing required parameters gracefully', async () => {
      // Test missing encodedTransaction
      let response = await request(app)
        .post('/validate-transaction')
        .send({})
        .expect(400);
      
      let data = JSON.parse(response.text);
      expect(data.error).toBe('Missing required parameter: encodedTransaction');

      // Test missing rule_type
      response = await request(app)
        .post('/process-transaction')
        .send({ encodedTransaction: 'test' })
        .expect(400);
      
      data = JSON.parse(response.text);
      expect(data.error).toBe('Missing required parameters: encodedTransaction and rule_type');

      // Test missing signature
      response = await request(app)
        .post('/send-signed-transaction')
        .send({ encodedTransaction: 'test' })
        .expect(400);
      
      data = JSON.parse(response.text);
      expect(data.error).toBe('Missing required parameters: encodedTransaction and signature');
    });

    test('should handle invalid transaction data gracefully', async () => {
      const response = await request(app)
        .post('/process-transaction')
        .send({ 
          encodedTransaction: 'invalid_base64_data',
          rule_type: 'post'
        })
        .expect(400);
      
      const data = JSON.parse(response.text);
      expect(data.error).toBe('Transaction processing failed');
      expect(data.details).toBeDefined();
    });

    test('should handle network errors gracefully', async () => {
      // Mock network error
      const { Connection } = require('@solana/web3.js');
      Connection.mockImplementation(() => ({
        sendTransaction: jest.fn(() => Promise.reject(new Error('Network error'))),
        confirmTransaction: jest.fn(() => Promise.reject(new Error('Network error')))
      }));

      const response = await request(app)
        .post('/send-versioned-message')
        .send({ 
          encodedTransaction: Buffer.from('test').toString('base64')
        })
        .expect(400);
      
      const data = JSON.parse(response.text);
      expect(data.error).toBe('Versioned message sending failed');
      expect(data.details).toBeDefined();
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle multiple concurrent requests', async () => {
      const testTransaction = Buffer.from('test_data').toString('base64');
      const requests = [];

      // Create 10 concurrent requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post('/process-transaction')
            .send({ 
              encodedTransaction: testTransaction,
              rule_type: 'post'
            })
        );
      }

      // Wait for all requests to complete
      const responses = await Promise.all(requests);
      
      // Verify all requests succeeded
      responses.forEach(response => {
        expect(response.status).toBe(200);
        const data = JSON.parse(response.text);
        expect(data.status).toBe('Success');
      });
    });

    test('should handle rapid successive requests', async () => {
      const testTransaction = Buffer.from('test_data').toString('base64');
      
      // Send 5 rapid successive requests
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/validate-transaction')
          .send({ encodedTransaction: testTransaction });
        
        expect(response.status).toBe(200);
        const data = JSON.parse(response.text);
        expect(data.status).toBe('Valid');
      }
    });
  });

  describe('Security and Validation', () => {
    test('should validate CORS headers correctly', async () => {
      const allowedOrigins = [
        'http://localhost:5173',
        'https://captainfunfe.onrender.com',
        'https://captain.fun'
      ];

      for (const origin of allowedOrigins) {
        const response = await request(app)
          .get('/health')
          .set('Origin', origin)
          .expect(200);
        
        expect(response.headers['access-control-allow-origin']).toBe(origin);
      }
    });

    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/process-transaction')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
      
      // Should handle JSON parsing errors
      expect(response.status).toBe(400);
    });

    test('should handle oversized payloads gracefully', async () => {
      const largePayload = 'x'.repeat(1000000); // 1MB payload
      
      const response = await request(app)
        .post('/process-transaction')
        .send({ 
          encodedTransaction: largePayload,
          rule_type: 'post'
        })
        .expect(400);
      
      const data = JSON.parse(response.text);
      expect(data.error).toBe('Transaction processing failed');
    });
  });
}); 