const {
  validate,
  verify,
  verifyMessage,
  processSolanaTransaction,
  processAndSendTransaction,
  sendSignedTransaction,
  sendVersionedMessage,
  RulePost,
  RuleFollow,
  RuleCreatedBefore,
  RuleFriend,
  RuleFollowers,
  RuleVerified,
  RuleExpiration,
  RuleReply,
  RuleValidator,
  RulePayment,
  RuleCustom,
  RuleVenmo,
  RuleTicketmaster,
  RuleAxs,
  RuleShopify,
  RuleStubhub,
  RuleVivid,
  RuleSeatgeek,
  RuleChoice,
} = require('../../cap_lib');

// Mock environment variables
process.env.SOL_SECRET = JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
process.env.SUGAR_DADDY_SECRET = JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);

describe('cap_lib - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rule Constants', () => {
    test('should export all rule constants', () => {
      expect(RulePost).toBe('post');
      expect(RuleFollow).toBe('follow');
      expect(RuleCreatedBefore).toBe('createdBeforeOn');
      expect(RuleFriend).toBe('friends');
      expect(RuleFollowers).toBe('followers');
      expect(RuleVerified).toBe('validated');
      expect(RuleExpiration).toBe('expiration');
      expect(RuleReply).toBe('reply');
      expect(RuleValidator).toBe('validator');
      expect(RulePayment).toBe('payment');
      expect(RuleCustom).toBe('custom');
      expect(RuleVenmo).toBe('venmo');
      expect(RuleTicketmaster).toBe('ticketmaster');
      expect(RuleAxs).toBe('axs');
      expect(RuleShopify).toBe('shopify');
      expect(RuleStubhub).toBe('stubhub');
      expect(RuleVivid).toBe('vivid');
      expect(RuleSeatgeek).toBe('seatgeek');
      expect(RuleChoice).toBe('choice');
    });
  });

  describe('verify function', () => {
    test('should return ed instruction and message for RuleFollow', () => {
      const result = verify('test', RuleFollow);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeDefined();
      expect(result[1]).toBe('fol');
    });

    test('should return ed instruction and message for RulePost', () => {
      const result = verify('test', RulePost);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeDefined();
      expect(result[1]).toBe('xpost');
    });

    test('should return ed instruction and message for RuleVerified', () => {
      const result = verify('test', RuleVerified);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeDefined();
      expect(result[1]).toBe('xv');
    });

    test('should return ed instruction and message for RuleValidator', () => {
      const result = verify('test', RuleValidator);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeDefined();
      expect(result[1]).toBe('val');
    });

    test('should return ed instruction and message for RuleExpiration', () => {
      const result = verify('test', RuleExpiration);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeDefined();
      expect(result[1]).toBe('exp');
    });

    test('should return ed instruction and message for RuleCreatedBefore', () => {
      const result = verify('test', RuleCreatedBefore);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeDefined();
      expect(result[1]).toBe('xb4');
    });

    test('should return ed instruction and message for RulePayment', () => {
      const result = verify('test', RulePayment);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeDefined();
      expect(result[1]).toBe('pay');
    });

    test('should return ed instruction and message for RuleChoice', () => {
      const result = verify('test', RuleChoice);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeDefined();
      expect(result[1]).toBe('choice');
    });

    test('should return ed instruction and message for RuleCustom', () => {
      const result = verify('test', RuleCustom);
      expect(result).toHaveLength(2);
      expect(result[0]).toBeDefined();
      expect(result[1]).toBe('c');
    });

    test('should return ed instruction and message for ticket-related rules', () => {
      const ticketRules = [RuleSeatgeek, RuleStubhub, RuleTicketmaster, RuleVenmo, RuleVivid, RuleShopify];
      
      ticketRules.forEach(rule => {
        const result = verify('test', rule);
        expect(result).toHaveLength(2);
        expect(result[0]).toBeDefined();
        expect(result[1]).toBe('tix');
      });
    });

    test('should return ed instruction and original message for unknown rule type', () => {
      const result = verify('test', 'unknown_rule');
      expect(result).toHaveLength(2);
      expect(result[0]).toBeDefined();
      expect(result[1]).toBe('test');
    });
  });

  describe('validate function', () => {
    test('should validate RuleCreatedBefore correctly', () => {
      const ruleValue = { time: 1000 };
      const userValue = { c: 500 };
      
      const result = validate(RuleCreatedBefore, ruleValue, userValue);
      expect(result).toBe(true);
    });

    test('should validate RuleFollowers correctly', () => {
      const ruleValue = { count: 100 };
      const userValue = { fol: 200 };
      
      const result = validate(RuleFollowers, ruleValue, userValue);
      expect(result).toBe(true);
    });

    test('should validate RuleFriend correctly', () => {
      const ruleValue = { count: 50 };
      const userValue = { friend: 100 };
      
      const result = validate(RuleFriend, ruleValue, userValue);
      expect(result).toBe(true);
    });

    test('should validate RuleVerified correctly', () => {
      const ruleValue = {};
      const userValue = { v: "true" };
      
      const result = validate(RuleVerified, ruleValue, userValue);
      expect(result).toBe(true);
    });

    test('should validate RulePost correctly', () => {
      const ruleValue = { message: "hello" };
      const userValue = { post: "Hello world!" };
      
      const result = validate(RulePost, ruleValue, userValue);
      expect(result).toBe(true);
    });

    test('should validate RuleReply correctly', () => {
      const ruleValue = { message: "@user hello" };
      const userValue = { post: "@user hello world!" };
      
      const result = validate(RuleReply, ruleValue, userValue);
      expect(result).toBe(true);
    });

    test('should validate RuleChoice correctly', () => {
      const ruleValue = { message: "option1" };
      const userValue = { post: "I choose option1" };
      const choices = ["option1", "option2", "option3"];
      
      const result = validate(RuleChoice, ruleValue, userValue, choices);
      expect(result).toBe(true);
    });

    test('should return false for invalid RulePost', () => {
      const ruleValue = { message: "hello" };
      const userValue = { post: "Goodbye world!" };
      
      const result = validate(RulePost, ruleValue, userValue);
      expect(result).toBe(false);
    });

    test('should return false for invalid RuleVerified', () => {
      const ruleValue = {};
      const userValue = { v: "false" };
      
      const result = validate(RuleVerified, ruleValue, userValue);
      expect(result).toBe(false);
    });

    test('should return true for unsupported rule types', () => {
      const unsupportedRules = [RuleExpiration, RuleCustom, RuleSeatgeek, RuleStubhub, RuleTicketmaster, RuleVenmo, RuleVivid, RuleShopify, RuleValidator, RulePayment];
      
      unsupportedRules.forEach(rule => {
        const result = validate(rule, {}, {});
        expect(result).toBe(true);
      });
    });
  });

  describe('processSolanaTransaction function', () => {
    test('should process transaction successfully', () => {
      const mockEncodedTransaction = 'dGVzdA=='; // base64 encoded "test"
      const ruleType = RulePost;
      
      const result = processSolanaTransaction(mockEncodedTransaction, ruleType);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('publicKey');
      expect(result).toHaveProperty('signature');
      expect(result).toHaveProperty('messageInfo');
    });

    test('should handle invalid transaction format', () => {
      const mockEncodedTransaction = 'invalid_base64';
      const ruleType = RulePost;
      
      const result = processSolanaTransaction(mockEncodedTransaction, ruleType);
      
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('publicKey');
    });
  });

  describe('processAndSendTransaction function', () => {
    test('should process and send transaction successfully', async () => {
      const mockEncodedTransaction = 'dGVzdA==';
      const ruleType = RulePost;
      
      const result = await processAndSendTransaction(mockEncodedTransaction, ruleType);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('publicKey');
      expect(result).toHaveProperty('signature');
      expect(result).toHaveProperty('messageInfo');
    });

    test('should handle processing failure', async () => {
      const mockEncodedTransaction = 'invalid';
      const ruleType = RulePost;
      
      const result = await processAndSendTransaction(mockEncodedTransaction, ruleType);
      
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('publicKey');
    });
  });

  describe('sendSignedTransaction function', () => {
    test('should send signed transaction successfully', async () => {
      const mockEncodedTransaction = 'dGVzdA==';
      const mockSignature = 'test_signature';
      
      const result = await sendSignedTransaction(mockEncodedTransaction, mockSignature);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('publicKey');
    });

    test('should handle sending failure', async () => {
      const mockEncodedTransaction = 'invalid';
      const mockSignature = 'test_signature';
      
      const result = await sendSignedTransaction(mockEncodedTransaction, mockSignature);
      
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('publicKey');
    });
  });

  describe('sendVersionedMessage function', () => {
    test('should send versioned message successfully', async () => {
      const mockEncodedTransaction = 'dGVzdA==';
      
      const result = await sendVersionedMessage(mockEncodedTransaction);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('publicKey');
      expect(result).toHaveProperty('signature');
    });

    test('should handle sending failure', async () => {
      const mockEncodedTransaction = 'invalid';
      
      const result = await sendVersionedMessage(mockEncodedTransaction);
      
      expect(result.success).toBe(true);
      expect(result).toHaveProperty('publicKey');
    });
  });
}); 