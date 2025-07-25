// routes/xp.js
const CAPSERVER = require('../cap_lib');

const validateTransactionHandler = async (req, res) => {
  try {
    const { encodedTransaction } = req.body;

    if (!encodedTransaction) {
      res.status(400).send(JSON.stringify({ 
        error: 'Missing required parameter: encodedTransaction' 
      }));
      return;
    }

    // Validate the transaction format
    const result = CAPSERVER.validateTransactionFormat(encodedTransaction);
    
    if (result.valid) {
      res.send(JSON.stringify({
        status: 'Valid',
        instructionCount: result.instructionCount,
        signatureCount: result.signatureCount
      }));
    } else {
      res.status(400).send(JSON.stringify({
        error: 'Invalid transaction format',
        details: result.error
      }));
    }
    
    return;
  } catch (err) {
    console.error('Transaction validation error:', err);
    res.status(500).send(JSON.stringify({ 
      error: 'Internal server error during transaction validation',
      details: err.message
    }));
    return;
  }
};

const processTransactionHandler = async (req, res) => {
  console.log(JSON.parse(req.body));
  try {
    const { encodedTransaction, rule_type } = req.body;

    if (!encodedTransaction || !rule_type) {
      res.status(400).send(JSON.stringify({ 
        error: 'Missing required parameters: encodedTransaction and rule_type' 
      }));
      return;
    }

    // Process the transaction using the cap server
    const result = CAPSERVER.processSolanaTransaction(encodedTransaction, rule_type, {});
    
    if (result.success) {
      res.send(JSON.stringify({
        status: 'Success',                
        publicKey: result.publicKey,
        signature: result.signature,
        messageInfo: result.messageInfo
      }));
    } else {
      res.status(400).send(JSON.stringify({
        error: 'Transaction processing failed',
        details: result.error,
        stack: result.stack
      }));
    }
    
    return;
  } catch (err) {
    console.error('Transaction processing error:', err);
    console.log('Transaction processing error:', err);
    res.status(500).send(JSON.stringify({ 
      error: 'Internal server error during transaction processing',
      details: err.message
    }));
    return;
  }
};

const processAndSendTransactionHandler = async (req, res) => {
  try {
    const { encodedTransaction, rule_type, network, options } = req.body;

    if (!encodedTransaction || !rule_type) {
      res.status(400).send(JSON.stringify({ 
        error: 'Missing required parameters: encodedTransaction and rule_type' 
      }));
      return;
    }

    // Process and send the transaction using the cap server
    const result = await CAPSERVER.processAndSendTransaction(
      encodedTransaction, 
      rule_type, 
      network || 'mainnet-beta', 
      options || {}
    );
    
    if (result.success) {
      res.send(JSON.stringify({
        status: 'Success',                
        publicKey: result.publicKey,
        signature: result.signature,
        messageInfo: result.messageInfo,
        transactionId: result.transactionId,
        confirmation: result.confirmation
      }));
    } else {
      res.status(400).send(JSON.stringify({
        error: 'Transaction processing and sending failed',
        details: result.error,
        stack: result.stack
      }));
    }
    
    return;
  } catch (err) {
    console.error('Transaction processing and sending error:', err);
    res.status(500).send(JSON.stringify({ 
      error: 'Internal server error during transaction processing and sending',
      details: err.message
    }));
    return;
  }
};

const sendSignedTransactionHandler = async (req, res) => {
  try {
    const { encodedTransaction, signature, network, options } = req.body;

    if (!encodedTransaction || !signature) {
      res.status(400).send(JSON.stringify({ 
        error: 'Missing required parameters: encodedTransaction and signature' 
      }));
      return;
    }

    // Send the signed transaction using the cap server
    const result = await CAPSERVER.sendSignedTransaction(
      encodedTransaction, 
      signature, 
      network || 'mainnet-beta', 
      options || {}
    );
    
    if (result.success) {
      res.send(JSON.stringify({
        status: 'Success',                
        publicKey: result.publicKey,
        transactionId: result.transactionId,
        confirmation: result.confirmation
      }));
    } else {
      res.status(400).send(JSON.stringify({
        error: 'Transaction sending failed',
        details: result.error,
        stack: result.stack
      }));
    }
    
    return;
  } catch (err) {
    console.error('Transaction sending error:', err);
    res.status(500).send(JSON.stringify({ 
      error: 'Internal server error during transaction sending',
      details: err.message
    }));
    return;
  }
};

const sendVersionedMessageHandler = async (req, res) => {
  try {
    const { encodedTransaction, network, options } = req.body;

    if (!encodedTransaction) {
      res.status(400).send(JSON.stringify({ 
        error: 'Missing required parameter: encodedTransaction' 
      }));
      return;
    }

    console.log('Received versioned message request');
    console.log('Network:', network || 'mainnet-beta');
    console.log('Options:', options || {});

    // Send the versioned message using the cap server
    const result = await CAPSERVER.sendVersionedMessage(
      encodedTransaction, 
      network || 'mainnet-beta', 
      options || {}
    );
    
    if (result.success) {
      res.send(JSON.stringify({
        status: 'Success',                
        publicKey: result.publicKey,
        signature: result.signature,
        transactionId: result.transactionId,
        confirmation: result.confirmation,
        messageInfo: result.messageInfo
      }));
    } else {
      res.status(400).send(JSON.stringify({
        error: 'Versioned message sending failed',
        details: result.error,
        stack: result.stack
      }));
    }
    
    return;
  } catch (err) {
    console.error('Versioned message sending error:', err);
    res.status(500).send(JSON.stringify({ 
      error: 'Internal server error during versioned message sending',
      details: err.message
    }));
    return;
  }
};

module.exports = {
  validateTransactionHandler,
  processTransactionHandler,
  processAndSendTransactionHandler,
  sendSignedTransactionHandler,
  sendVersionedMessageHandler
}; 