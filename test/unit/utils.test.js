const { generateMD5Hash } = require('../../utils/cryptoUtils');

describe('Utils - Unit Tests', () => {
  describe('cryptoUtils', () => {
    describe('generateMD5Hash', () => {
      test('should generate MD5 hash for simple string', () => {
        const input = 'test';
        const hash = generateMD5Hash(input);
        
        expect(hash).toBeDefined();
        expect(typeof hash).toBe('string');
        expect(hash.length).toBe(32); // MD5 hash is 32 characters
      });

      test('should generate consistent hash for same input', () => {
        const input = 'hello world';
        const hash1 = generateMD5Hash(input);
        const hash2 = generateMD5Hash(input);
        
        expect(hash1).toBe(hash2);
      });

      test('should generate different hashes for different inputs', () => {
        const input1 = 'hello';
        const input2 = 'world';
        
        const hash1 = generateMD5Hash(input1);
        const hash2 = generateMD5Hash(input2);
        
        expect(hash1).not.toBe(hash2);
      });

      test('should handle empty string', () => {
        const input = '';
        const hash = generateMD5Hash(input);
        
        expect(hash).toBeDefined();
        expect(typeof hash).toBe('string');
        expect(hash.length).toBe(32);
      });

      test('should handle special characters', () => {
        const input = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        const hash = generateMD5Hash(input);
        
        expect(hash).toBeDefined();
        expect(typeof hash).toBe('string');
        expect(hash.length).toBe(32);
      });

      test('should handle unicode characters', () => {
        const input = 'Hello 世界 🌍';
        const hash = generateMD5Hash(input);
        
        expect(hash).toBeDefined();
        expect(typeof hash).toBe('string');
        expect(hash.length).toBe(32);
      });
    });
  });
}); 