const request = require('supertest');
const express = require('express');

// Mock the database and external dependencies
jest.mock('../../config/database', () => ({
  pool: {
    query: jest.fn(),
    end: jest.fn()
  },
  sessionStore: {
    get: jest.fn(),
    set: jest.fn(),
    destroy: jest.fn(),
    on: jest.fn()
  }
}));

jest.mock('../../routes/twitter', () => ({
  twitterLogInHandler: jest.fn((req, res) => res.status(200).json({ message: 'Login handler' })),
  twitterLoginCallbackHandler: jest.fn((req, res) => res.status(200).json({ message: 'Callback handler' })),
  twitterRevokeHandler: jest.fn((req, res) => res.status(200).json({ message: 'Revoke handler' })),
  twitterRecentSearchHandler: jest.fn((req, res) => res.status(200).json({ message: 'Recent search handler' })),
  twitterSearchHandler: jest.fn((req, res) => res.status(200).json({ message: 'Search handler' })),
  twitterUserSearchHandler: jest.fn((req, res) => res.status(200).json({ message: 'User search handler' })),
  twitterPostSearchHandler: jest.fn((req, res) => res.status(200).json({ message: 'Post search handler' }))
}));

jest.mock('../../routes/meta', () => ({
  metaLookUpHandler: jest.fn((req, res) => res.status(200).json({ message: 'Meta lookup handler' })),
  metaSaveHandler: jest.fn((req, res) => res.status(200).json({ message: 'Meta save handler' })),
  metaDeleteHandler: jest.fn((req, res) => res.status(200).json({ message: 'Meta delete handler' }))
}));

jest.mock('../../routes/validator', () => ({
  verifyHandler: jest.fn((req, res) => res.status(200).json({ message: 'Verify handler' }))
}));

// Mock CAPSERVER
const mockCAPSERVER = {
  validateTransactionFormat: jest.fn(),
  processSolanaTransaction: jest.fn(),
  processAndSendTransaction: jest.fn(),
  sendSignedTransaction: jest.fn(),
  sendVersionedMessage: jest.fn()
};

jest.mock('../../cap_lib', () => mockCAPSERVER);

// Import the app after mocking
const app = require('../../app');

describe('App - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health and Status Endpoints', () => {
    test('GET /health should return OK', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.text).toBe('OK');
    });

    test('GET /status should return login error when not authenticated', async () => {
      const response = await request(app)
        .get('/status')
        .expect(200);
      
      const data = JSON.parse(response.text);
      expect(data.error).toBe('Login');
      expect(data.login).toBe(1);
    });

    test('GET /logout should redirect to status', async () => {
      const response = await request(app)
        .get('/logout')
        .expect(302);
      
      expect(response.headers.location).toBe('/status');
    });
  });

  describe('Twitter Endpoints', () => {
    test('GET /twitter/login should call login handler', async () => {
      const response = await request(app)
        .get('/twitter/login')
        .expect(200);
      
      expect(response.body.message).toBe('Login handler');
    });

    test('GET /twitter/callback should call callback handler', async () => {
      const response = await request(app)
        .get('/twitter/callback')
        .expect(200);
      
      expect(response.body.message).toBe('Callback handler');
    });

    test('GET /twitter/revoke should call revoke handler', async () => {
      const response = await request(app)
        .get('/twitter/revoke')
        .expect(200);
      
      expect(response.body.message).toBe('Revoke handler');
    });

    test('GET /twitter/follows should call recent search handler', async () => {
      const response = await request(app)
        .get('/twitter/follows')
        .expect(200);
      
      expect(response.body.message).toBe('Recent search handler');
    });

    test('GET /twitter/search should call search handler', async () => {
      const response = await request(app)
        .get('/twitter/search')
        .expect(200);
      
      expect(response.body.message).toBe('Search handler');
    });

    test('GET /twitter/users should call user search handler', async () => {
      const response = await request(app)
        .get('/twitter/users')
        .expect(200);
      
      expect(response.body.message).toBe('User search handler');
    });

    test('GET /twitter/post should call post search handler', async () => {
      const response = await request(app)
        .get('/twitter/post')
        .expect(200);
      
      expect(response.body.message).toBe('Post search handler');
    });
  });

  describe('Meta Endpoints', () => {
    test('GET /meta should call meta lookup handler', async () => {
      const response = await request(app)
        .get('/meta')
        .expect(200);
      
      expect(response.body.message).toBe('Meta lookup handler');
    });

    test('POST /meta should call meta save handler', async () => {
      const response = await request(app)
        .post('/meta')
        .send({ test: 'data' })
        .expect(200);
      
      expect(response.body.message).toBe('Meta save handler');
    });

    test('DELETE /meta should call meta delete handler', async () => {
      const response = await request(app)
        .delete('/meta')
        .expect(200);
      
      expect(response.body.message).toBe('Meta delete handler');
    });
  });

  describe('Validator Endpoints', () => {
    test('POST /verify should call verify handler', async () => {
      const response = await request(app)
        .post('/verify')
        .send({ test: 'data' })
        .expect(200);
      
      expect(response.body.message).toBe('Verify handler');
    });
  });

  describe('Transaction Endpoints', () => {
    describe('POST /validate-transaction', () => {
      test('should return 400 when encodedTransaction is missing', async () => {
        const response = await request(app)
          .post('/validate-transaction')
          .send({})
          .expect(400);
        
        const data = JSON.parse(response.text);
        expect(data.error).toBe('Missing required parameter: encodedTransaction');
      });

      test('should return success when transaction is valid', async () => {
        mockCAPSERVER.validateTransactionFormat.mockReturnValue({
          valid: true,
          instructionCount: 2,
          signatureCount: 1
        });

        const response = await request(app)
          .post('/validate-transaction')
          .send({ encodedTransaction: 'dGVzdA==' })
          .expect(200);
        
        const data = JSON.parse(response.text);
        expect(data.status).toBe('Valid');
        expect(data.instructionCount).toBe(2);
        expect(data.signatureCount).toBe(1);
      });

      test('should return error when transaction is invalid', async () => {
        mockCAPSERVER.validateTransactionFormat.mockReturnValue({
          valid: false,
          error: 'Invalid format'
        });

        const response = await request(app)
          .post('/validate-transaction')
          .send({ encodedTransaction: 'invalid' })
          .expect(400);
        
        const data = JSON.parse(response.text);
        expect(data.error).toBe('Invalid transaction format');
        expect(data.details).toBe('Invalid format');
      });
    });

    describe('POST /process-transaction', () => {
      test('should return 400 when required parameters are missing', async () => {
        const response = await request(app)
          .post('/process-transaction')
          .send({})
          .expect(400);
        
        const data = JSON.parse(response.text);
        expect(data.error).toBe('Missing required parameters: encodedTransaction and rule_type');
      });

      test('should return success when transaction processing succeeds', async () => {
        mockCAPSERVER.processSolanaTransaction.mockReturnValue({
          success: true,
          publicKey: 'test_public_key',
          signature: 'test_signature',
          messageInfo: { test: 'info' }
        });

        const response = await request(app)
          .post('/process-transaction')
          .send({ 
            encodedTransaction: 'dGVzdA==',
            rule_type: 'post'
          })
          .expect(200);
        
        const data = JSON.parse(response.text);
        expect(data.status).toBe('Success');
        expect(data.publicKey).toBe('test_public_key');
        expect(data.signature).toBe('test_signature');
        expect(data.messageInfo).toEqual({ test: 'info' });
      });

      test('should return error when transaction processing fails', async () => {
        mockCAPSERVER.processSolanaTransaction.mockReturnValue({
          success: false,
          error: 'Processing failed',
          stack: 'Error stack'
        });

        const response = await request(app)
          .post('/process-transaction')
          .send({ 
            encodedTransaction: 'invalid',
            rule_type: 'post'
          })
          .expect(400);
        
        const data = JSON.parse(response.text);
        expect(data.error).toBe('Transaction processing failed');
        expect(data.details).toBe('Processing failed');
      });
    });

    describe('POST /process-and-send-transaction', () => {
      test('should return 400 when required parameters are missing', async () => {
        const response = await request(app)
          .post('/process-and-send-transaction')
          .send({})
          .expect(400);
        
        const data = JSON.parse(response.text);
        expect(data.error).toBe('Missing required parameters: encodedTransaction and rule_type');
      });

      test('should return success when transaction processing and sending succeeds', async () => {
        mockCAPSERVER.processAndSendTransaction.mockResolvedValue({
          success: true,
          publicKey: 'test_public_key',
          signature: 'test_signature',
          messageInfo: { test: 'info' },
          transactionId: 'test_tx_id',
          confirmation: { status: 'confirmed' }
        });

        const response = await request(app)
          .post('/process-and-send-transaction')
          .send({ 
            encodedTransaction: 'dGVzdA==',
            rule_type: 'post',
            network: 'mainnet-beta',
            options: { skipPreflight: false }
          })
          .expect(200);
        
        const data = JSON.parse(response.text);
        expect(data.status).toBe('Success');
        expect(data.publicKey).toBe('test_public_key');
        expect(data.signature).toBe('test_signature');
        expect(data.transactionId).toBe('test_tx_id');
      });
    });

    describe('POST /send-signed-transaction', () => {
      test('should return 400 when required parameters are missing', async () => {
        const response = await request(app)
          .post('/send-signed-transaction')
          .send({})
          .expect(400);
        
        const data = JSON.parse(response.text);
        expect(data.error).toBe('Missing required parameters: encodedTransaction and signature');
      });

      test('should return success when signed transaction sending succeeds', async () => {
        mockCAPSERVER.sendSignedTransaction.mockResolvedValue({
          success: true,
          publicKey: 'test_public_key',
          transactionId: 'test_tx_id',
          confirmation: { status: 'confirmed' }
        });

        const response = await request(app)
          .post('/send-signed-transaction')
          .send({ 
            encodedTransaction: 'dGVzdA==',
            signature: 'test_signature',
            network: 'mainnet-beta',
            options: { skipPreflight: false }
          })
          .expect(200);
        
        const data = JSON.parse(response.text);
        expect(data.status).toBe('Success');
        expect(data.publicKey).toBe('test_public_key');
        expect(data.transactionId).toBe('test_tx_id');
      });
    });

    describe('POST /send-versioned-message', () => {
      test('should return 400 when encodedTransaction is missing', async () => {
        const response = await request(app)
          .post('/send-versioned-message')
          .send({})
          .expect(400);
        
        const data = JSON.parse(response.text);
        expect(data.error).toBe('Missing required parameter: encodedTransaction');
      });

      test('should return success when versioned message sending succeeds', async () => {
        mockCAPSERVER.sendVersionedMessage.mockResolvedValue({
          success: true,
          publicKey: 'test_public_key',
          signature: 'test_signature',
          transactionId: 'test_tx_id',
          confirmation: { status: 'confirmed' },
          messageInfo: { test: 'info' }
        });

        const response = await request(app)
          .post('/send-versioned-message')
          .send({ 
            encodedTransaction: 'dGVzdA==',
            network: 'mainnet-beta',
            options: { skipPreflight: false }
          })
          .expect(200);
        
        const data = JSON.parse(response.text);
        expect(data.status).toBe('Success');
        expect(data.publicKey).toBe('test_public_key');
        expect(data.signature).toBe('test_signature');
        expect(data.transactionId).toBe('test_tx_id');
      });
    });
  });

  describe('CORS Configuration', () => {
    test('should allow requests from allowed origins', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:5173')
        .expect(200);
      
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    test('should handle preflight requests', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Content-Type')
        .expect(200);
      
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
    });
  });
}); 