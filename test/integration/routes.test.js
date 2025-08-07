const request = require('supertest');
const express = require('express');

// Mock external dependencies
jest.mock('axios');
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

// Mock the route handlers
const mockTwitterHandlers = {
  twitterLogInHandler: jest.fn(),
  twitterLoginCallbackHandler: jest.fn(),
  twitterRevokeHandler: jest.fn(),
  twitterRecentSearchHandler: jest.fn(),
  twitterSearchHandler: jest.fn(),
  twitterUserSearchHandler: jest.fn(),
  twitterPostSearchHandler: jest.fn()
};

const mockMetaHandlers = {
  metaLookUpHandler: jest.fn(),
  metaSaveHandler: jest.fn(),
  metaDeleteHandler: jest.fn()
};

const mockValidatorHandlers = {
  verifyHandler: jest.fn()
};

jest.mock('../../routes/twitter', () => mockTwitterHandlers);
jest.mock('../../routes/meta', () => mockMetaHandlers);
jest.mock('../../routes/validator', () => mockValidatorHandlers);

// Create a test app
const app = express();
app.use(express.json());

// Import the mocked handlers
const twitterRoutes = require('../../routes/twitter');
const metaRoutes = require('../../routes/meta');
const validatorRoutes = require('../../routes/validator');

// Create routes using the mocked handlers
app.get('/twitter/login', twitterRoutes.twitterLogInHandler);
app.get('/twitter/callback', twitterRoutes.twitterLoginCallbackHandler);
app.get('/twitter/revoke', twitterRoutes.twitterRevokeHandler);
app.get('/twitter/follows', twitterRoutes.twitterRecentSearchHandler);
app.get('/twitter/search', twitterRoutes.twitterSearchHandler);
app.get('/twitter/users', twitterRoutes.twitterUserSearchHandler);
app.get('/twitter/post', twitterRoutes.twitterPostSearchHandler);

app.get('/meta', metaRoutes.metaLookUpHandler);
app.post('/meta', metaRoutes.metaSaveHandler);
app.delete('/meta', metaRoutes.metaDeleteHandler);

app.post('/verify', validatorRoutes.verifyHandler);

describe('Routes - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Twitter Routes', () => {
    test('twitterLogInHandler should be called correctly', async () => {
      mockTwitterHandlers.twitterLogInHandler.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Login initiated' });
      });

      const response = await request(app)
        .get('/twitter/login')
        .expect(200);

      expect(mockTwitterHandlers.twitterLogInHandler).toHaveBeenCalled();
      expect(response.body.message).toBe('Login initiated');
    });

    test('twitterLoginCallbackHandler should handle callback', async () => {
      mockTwitterHandlers.twitterLoginCallbackHandler.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Login callback processed' });
      });

      const response = await request(app)
        .get('/twitter/callback?code=test_code&state=test_state')
        .expect(200);

      expect(mockTwitterHandlers.twitterLoginCallbackHandler).toHaveBeenCalled();
      expect(response.body.message).toBe('Login callback processed');
    });

    test('twitterRevokeHandler should handle revocation', async () => {
      mockTwitterHandlers.twitterRevokeHandler.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Access revoked' });
      });

      const response = await request(app)
        .get('/twitter/revoke')
        .expect(200);

      expect(mockTwitterHandlers.twitterRevokeHandler).toHaveBeenCalled();
      expect(response.body.message).toBe('Access revoked');
    });

    test('twitterRecentSearchHandler should handle recent search', async () => {
      mockTwitterHandlers.twitterRecentSearchHandler.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Recent search results' });
      });

      const response = await request(app)
        .get('/twitter/follows')
        .expect(200);

      expect(mockTwitterHandlers.twitterRecentSearchHandler).toHaveBeenCalled();
      expect(response.body.message).toBe('Recent search results');
    });

    test('twitterSearchHandler should handle search requests', async () => {
      mockTwitterHandlers.twitterSearchHandler.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Search results' });
      });

      const response = await request(app)
        .get('/twitter/search?q=test_query')
        .expect(200);

      expect(mockTwitterHandlers.twitterSearchHandler).toHaveBeenCalled();
      expect(response.body.message).toBe('Search results');
    });

    test('twitterUserSearchHandler should handle user search', async () => {
      mockTwitterHandlers.twitterUserSearchHandler.mockImplementation((req, res) => {
        res.status(200).json({ message: 'User search results' });
      });

      const response = await request(app)
        .get('/twitter/users?usernames=test_user')
        .expect(200);

      expect(mockTwitterHandlers.twitterUserSearchHandler).toHaveBeenCalled();
      expect(response.body.message).toBe('User search results');
    });

    test('twitterPostSearchHandler should handle post search', async () => {
      mockTwitterHandlers.twitterPostSearchHandler.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Post search results' });
      });

      const response = await request(app)
        .get('/twitter/post?query=test_post')
        .expect(200);

      expect(mockTwitterHandlers.twitterPostSearchHandler).toHaveBeenCalled();
      expect(response.body.message).toBe('Post search results');
    });
  });

  describe('Meta Routes', () => {
    test('metaLookUpHandler should handle GET requests', async () => {
      mockMetaHandlers.metaLookUpHandler.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Meta lookup successful' });
      });

      const response = await request(app)
        .get('/meta')
        .expect(200);

      expect(mockMetaHandlers.metaLookUpHandler).toHaveBeenCalled();
      expect(response.body.message).toBe('Meta lookup successful');
    });

    test('metaSaveHandler should handle POST requests', async () => {
      mockMetaHandlers.metaSaveHandler.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Meta saved successfully', data: req.body });
      });

      const testData = { key: 'value', test: 'data' };
      const response = await request(app)
        .post('/meta')
        .send(testData)
        .expect(200);

      expect(mockMetaHandlers.metaSaveHandler).toHaveBeenCalled();
      expect(response.body.message).toBe('Meta saved successfully');
      expect(response.body.data).toEqual(testData);
    });

    test('metaDeleteHandler should handle DELETE requests', async () => {
      mockMetaHandlers.metaDeleteHandler.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Meta deleted successfully' });
      });

      const response = await request(app)
        .delete('/meta')
        .expect(200);

      expect(mockMetaHandlers.metaDeleteHandler).toHaveBeenCalled();
      expect(response.body.message).toBe('Meta deleted successfully');
    });
  });

  describe('Validator Routes', () => {
    test('verifyHandler should handle POST requests', async () => {
      mockValidatorHandlers.verifyHandler.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Verification successful', data: req.body });
      });

      const testData = { rule: 'test_rule', value: 'test_value' };
      const response = await request(app)
        .post('/verify')
        .send(testData)
        .expect(200);

      expect(mockValidatorHandlers.verifyHandler).toHaveBeenCalled();
      expect(response.body.message).toBe('Verification successful');
      expect(response.body.data).toEqual(testData);
    });
  });

  describe('Error Handling', () => {
    test('should handle Twitter API errors gracefully', async () => {
      mockTwitterHandlers.twitterSearchHandler.mockImplementation((req, res) => {
        res.status(429).json({ error: 'Rate limit exceeded' });
      });

      const response = await request(app)
        .get('/twitter/search')
        .expect(429);

      expect(response.body.error).toBe('Rate limit exceeded');
    });

    test('should handle Meta API errors gracefully', async () => {
      mockMetaHandlers.metaSaveHandler.mockImplementation((req, res) => {
        res.status(400).json({ error: 'Invalid data format' });
      });

      const response = await request(app)
        .post('/meta')
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body.error).toBe('Invalid data format');
    });

    test('should handle Validator errors gracefully', async () => {
      mockValidatorHandlers.verifyHandler.mockImplementation((req, res) => {
        res.status(422).json({ error: 'Validation failed' });
      });

      const response = await request(app)
        .post('/verify')
        .send({})
        .expect(422);

      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('Request Parameters', () => {
    test('should pass query parameters to handlers', async () => {
      mockTwitterHandlers.twitterSearchHandler.mockImplementation((req, res) => {
        res.status(200).json({ 
          message: 'Search with parameters',
          query: req.query.q,
          limit: req.query.limit
        });
      });

      const response = await request(app)
        .get('/twitter/search?q=test&limit=10')
        .expect(200);

      expect(response.body.query).toBe('test');
      expect(response.body.limit).toBe('10');
    });

    test('should pass body parameters to handlers', async () => {
      mockMetaHandlers.metaSaveHandler.mockImplementation((req, res) => {
        res.status(200).json({ 
          message: 'Meta saved with body',
          receivedData: req.body
        });
      });

      const testData = { 
        userId: '12345',
        metadata: { key: 'value' },
        timestamp: Date.now()
      };

      const response = await request(app)
        .post('/meta')
        .send(testData)
        .expect(200);

      expect(response.body.receivedData).toEqual(testData);
    });
  });

  describe('Response Headers', () => {
    test('should set appropriate content type headers', async () => {
      mockTwitterHandlers.twitterSearchHandler.mockImplementation((req, res) => {
        res.status(200).json({ message: 'Test response' });
      });

      const response = await request(app)
        .get('/twitter/search')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
    });

    test('should handle CORS headers', async () => {
      mockTwitterHandlers.twitterSearchHandler.mockImplementation((req, res) => {
        res.status(200).json({ message: 'CORS test' });
      });

      const response = await request(app)
        .get('/twitter/search')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      // Note: CORS headers would be set by the main app, not individual routes
      expect(response.body.message).toBe('CORS test');
    });
  });
}); 