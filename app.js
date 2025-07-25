// This is the Express server that will handle OAuth flow
// and will receive the access token from Twitter
// and will also be responsible for fetching the user's followers
// and will be used by the client to make requests to Twitter API
//
// The server is created to separate the logic of handling the OAuth flow
// and the logic of fetching the user's followers and to avoid
// potential security issues that can arise from mixing the two
//
// The server is also responsible for setting up CORS to allow
// the frontend to make requests to the server

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const session = require('express-session');
const { pool, sessionStore } = require('./config/database.js');
const { twitterLogInHandler, twitterLoginCallbackHandler, twitterRevokeHandler,
  twitterRecentSearchHandler, twitterSearchHandler, twitterPostSearchHandler, twitterUserSearchHandler
} = require('./routes/twitter.js');
const { metaLookUpHandler, metaSaveHandler, metaDeleteHandler } = require("./routes/meta.js");
const { verifyHandler } = require("./routes/validator.js");

dotenv.config();
const port = process.env.PORT || 3000;
const beefDap = process.env.BEEF_URI;
const VERSION = "v0.4.0";

process.on('SIGINT', async () => {
  await pool.end();
  console.log("\n\nDatabase connection pool closed");
  process.exit(0);
});


const app = express();
app.use(cors({
  origin: ['http://localhost:5173', 'https://captainfunfe.onrender.com', 'https://captain.fun', 'https://capserver-3eyf.onrender.com', 'https://node.captain.fun', 
          'http://localhost:5174', 'https://xp.xyz', 'https://stagehand-react.xp.xyz', 'https://alpha.ticketdex.xyz'

  ], // Allow requests from a specific origin

  // suggestions from claude
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'If-None-Match', 'If-Modified-Since'], // Include cache-related headers
  exposedHeaders: ['ETag', 'Cache-Control', 'Last-Modified'], // Expose cache headers to the client
  maxAge: 7200, // 2 hours
  credentials: true, // Send credentials with the request,
  console: (error) => {
    if (error.request) {
      console.log(
        "CORS ERROR: ", error.request.url
      );
    }
  }
}));
app.use(express.urlencoded({ extended: true }))
app.use(express.json());

//2 hours reset
app.use(session({
  key: 'cap_oracle_session',
  secret: process.env.session,
  store: sessionStore,
  resave: false,
  saveUninitialized: true,
  cookie: { secured: process.env.session_secured, maxAge: 1000 * 60 * 60 * 2, sameSite: 'lax', httpOnly: false, secure: true }, // 2 Hour session limit to match X API lifetime
  clearExpired: true,
}))


app.get('/health', function (req, res) {
  res.send(`OK`);
});
app.get('/status', async function (req, res) {
  if (req.session.userId) {
    const tmp = {
      id: req.session.userId,
    }
    res.send(JSON.stringify(tmp));
  } else {
    res.send(JSON.stringify({ error: 'Login', login: 1 }));
  }
});
app.get('/logout', async function (req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect('/status');
  });
});
app.get("/twitter/callback", twitterLoginCallbackHandler);
app.get("/twitter/login", twitterLogInHandler);
app.get("/twitter/revoke", twitterRevokeHandler);
app.get('/twitter/follows', twitterRecentSearchHandler);
app.get('/twitter/search', twitterSearchHandler);
app.get('/twitter/users', twitterUserSearchHandler);
app.get('/twitter/post', twitterPostSearchHandler)
app.get('/meta', metaLookUpHandler);
app.post('/meta', metaSaveHandler);
app.delete('/meta', metaDeleteHandler);
app.post('/verify', verifyHandler);



app.post('/validate-transaction', async function (req, res) {
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
});

app.post('/process-transaction', async function (req, res) {
  
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
    const result = CAPSERVER.processSolanaTransaction(encodedTransaction, rule_type,  {});
    
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
});

app.post('/process-and-send-transaction', async function (req, res) {
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
});

app.post('/send-signed-transaction', async function (req, res) {
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
});

app.post('/send-versioned-message', async function (req, res) {
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
});

app.post('/validate', async function (req, res) { });


app.listen(port, () => {
  console.log(`Go here to login: ${beefDap}\n${VERSION} \n ${port}`);
});