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

const sugMamaExchangeHandler = async (req, res) => {
// Parse the JSON string back to array
const mamaKeyPair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.SUGAR_MAMMA_SECRET)));
const daddyKeyPair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.SUGAR_DADDY_SECRET)));
const mamaTokenPubkey = mamaKeyPair.publicKey;
const daddyTokenPubkey = daddyKeyPair.publicKey;

//Devnet 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
//mainnet: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
//Devnet: HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr
//mainnet:  2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo
const PYUSDC_MINT = new PublicKey("2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo");
//Devnet: TOKEN_PROGRAM_ID
//mainnet: TOKEN_2022_PROGRAM_ID
const PYUSD_PROGID = TOKEN_2022_PROGRAM_ID

try {
  const { wallet, amount, payoutWallet} = req.body;

  if (!wallet || !amount || !payoutWallet) {
    res.status(400).send(JSON.stringify({ 
      error: 'Missing required parameters: wallet, amount, payoutWallet' 
    }));
    return;
  }
  const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');
  console.log("connection.rpcEndpoint: ", connection.rpcEndpoint);
  const walletPubkey = new PublicKey(wallet);
  const payoutPubkey = new PublicKey(payoutWallet);
  /** transaction construction */

    // Helper function to safely get or create token account
    const getOrCreateTokenAccount = async (owner, mint, tokenProgramId=TOKEN_PROGRAM_ID) => {
      try {
        // First try to get the existing token account
        const tokenAccount = await splToken.getAssociatedTokenAddress(
          mint,
          owner,
          false,
          tokenProgramId
        );
        
        // Check if the account exists
        const accountInfo = await connection.getAccountInfo(tokenAccount);
        
        if (accountInfo) {
          return [tokenAccount, null];
        } else {
            console.log(`Creating token account for ${owner.toString()}`);            
            const instruction = createAssociatedTokenAccountInstruction(
              daddyTokenPubkey, // payer
              tokenAccount, // associated token account
              owner, // owner
              mint, // mint
              tokenProgramId
            )
          return [tokenAccount, instruction];
        }
      } catch (error) {
        console.error(`Error getting/creating token account for ${owner.toString()}:`, error);
        throw error;
      }
    };

    const [UserUSDCTokenAccount, createInstructionUserUSDC] = await getOrCreateTokenAccount(
      walletPubkey,
      USDC_MINT
    );

    const [MamaUSDCTokenAccount, createInstructionMamaUSDC] = await getOrCreateTokenAccount(
      mamaTokenPubkey,
      USDC_MINT
    );
    
    const [UserEURCTokenAccount, createInstructionUserEURC] = await getOrCreateTokenAccount(
      payoutPubkey,
      PYUSDC_MINT,
      PYUSD_PROGID
    );

    const [MamaEURCTokenAccount, createInstructionMamaEURC] = await getOrCreateTokenAccount(
      mamaTokenPubkey,
      PYUSDC_MINT,
      PYUSD_PROGID
    );

    const transaction = new Transaction();
    if (createInstructionUserUSDC) {
      transaction.add(createInstructionUserUSDC);
    }
    if(createInstructionMamaUSDC) {
      transaction.add(createInstructionMamaUSDC);
    }
    if (createInstructionUserEURC) {
      transaction.add(createInstructionUserEURC);
    }
    if (createInstructionMamaEURC) {
      transaction.add(createInstructionMamaEURC);
    }     
    transaction.add(
      createTransferCheckedInstruction(
        UserUSDCTokenAccount,
        USDC_MINT,
        MamaUSDCTokenAccount,
        walletPubkey,
        amount * Math.pow(10, 6),
        6, // USDC decimals
        [],
        TOKEN_PROGRAM_ID
      )
    );
    transaction.add(              
      createTransferCheckedInstruction(
        MamaEURCTokenAccount,
        PYUSDC_MINT,
        UserEURCTokenAccount,
        mamaTokenPubkey,
        amount * Math.pow(10, 6),
        6, // PYUSDC decimals
        [],
        PYUSD_PROGID
      )
    );
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = daddyTokenPubkey;

  const encodedTransaction2 = transaction.serializeMessage();
  /** end transaction construction */

  

  // Process and send the transaction using the cap server

      const result = await CAPSERVER.processAndSendSugaMamaTransaction(encodedTransaction2);
      const payerResult = await CAPSERVER.processAndSendTransaction(encodedTransaction2, null, null);

      if (result.success) {
        res.send(JSON.stringify({
          status: 'Success',                
          publicKey: mamaTokenPubkey,
          signature: result.signature,
          messageInfo: result.messageInfo,
          transactionId: result.transactionId,
          confirmation: result.confirmation,
          payerPublicKey: daddyTokenPubkey,
          payerSignature: payerResult.signature,
          encodedTransaction:encodedTransaction2
        }));
      } else {
        res.status(400).send(JSON.stringify({
          error: 'Transaction processing and sending failed',
          details: result.error,
          stack: result.stack
        }));
      }


} catch (err) {
  console.error('Sugar Mama Exchange error:', err);
  res.status(500).send(JSON.stringify({ 
    error: 'Internal server error during exchange',
    details: err.message
  }));
}

};

module.exports = {
  validateTransactionHandler,
  processTransactionHandler,
  processAndSendTransactionHandler,
  sendSignedTransactionHandler,
  sendVersionedMessageHandler,
  sugMamaExchangeHandler
}; 