const axios = require('axios');

// Example usage of the new transaction processing endpoints
async function testTransactionProcessing() {
    const baseUrl = 'http://localhost:3000'; // Adjust to your server URL
    
    // Example encoded transaction (this is just a placeholder - you'd need a real transaction)
    const exampleEncodedTransaction = 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAEDBQYHCAkKCwwNDg8QERITFBUWFxgZGhscHR4fICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVpbXF1eX2BhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ent8fX5/gIGCg4SFhoeIiYqLjI2Oj5CRkpOUlZaXmJmam5ydnp+goaKjpKWmp6ipqqusra6vsLGys7S1tre4ubq7vL2+v8DBwsPExcbHyMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5ufo6err7O3u7/Dx8vP09fb3+Pn6+/z9/v8AAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w==';
    
    try {
        // Test 1: Validate transaction format
        console.log('Testing transaction validation...');
        const validationResponse = await axios.post(`${baseUrl}/validate-transaction`, {
            encodedTransaction: exampleEncodedTransaction
        });
        console.log('Validation result:', validationResponse.data);
        
        // Test 2: Process transaction with default settings
        console.log('\nTesting transaction processing with default settings...');
        const processResponse = await axios.post(`${baseUrl}/process-transaction`, {
            encodedTransaction: exampleEncodedTransaction,
            rule_type: 'post' // Using the post rule type
        });
        console.log('Processing result:', processResponse.data);
        
        // Test 3: Process transaction with partial signing
        console.log('\nTesting transaction processing with partial signing...');
        const partialResponse = await axios.post(`${baseUrl}/process-transaction`, {
            encodedTransaction: exampleEncodedTransaction,
            rule_type: 'follow',
            options: {
                signMode: 'partial',
                requireAllSignatures: false,
                verifySignatures: false
            }
        });
        console.log('Partial signing result:', partialResponse.data);
        
    } catch (error) {
        console.error('Error during testing:', error.response?.data || error.message);
    }
}

// Example of how to create a simple transaction for testing
function createTestTransaction() {
    const { Transaction, SystemProgram, PublicKey, Keypair } = require('@solana/web3.js');
    
    // Create a test transaction
    const transaction = new Transaction();
    
    // Add a simple transfer instruction (this is just for testing)
    const fromPubkey = new PublicKey('11111111111111111111111111111111');
    const toPubkey = new PublicKey('22222222222222222222222222222222');
    
    transaction.add(
        SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports: 1000000
        })
    );
    
    // Serialize the transaction
    const serialized = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false
    });
    
    return serialized.toString('base64');
}

// Run the test if this file is executed directly
if (require.main === module) {
    console.log('Creating test transaction...');
    const testTx = createTestTransaction();
    console.log('Test transaction created:', testTx.substring(0, 50) + '...');
    
    console.log('\nStarting transaction processing tests...');
    testTransactionProcessing();
}

module.exports = {
    testTransactionProcessing,
    createTestTransaction
}; 