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
const { Connection, PublicKey, Transaction, Token, ASSOCIATED_TOKEN_PROGRAM_ID, Keypair } = require('@solana/web3.js');
const { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferCheckedInstruction, createTransferInstruction } = require("@solana/spl-token");
const splToken = require("@solana/spl-token");
const BN = require('bn.js');

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
  origin: '*', // Allow requests from any origin

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



// Import XP route handlers
const xpRoutes = require('./routes/xp');

// Register XP routes
app.post('/validate-transaction', xpRoutes.validateTransactionHandler);
app.post('/process-transaction', xpRoutes.processTransactionHandler);
app.post('/process-and-send-transaction', xpRoutes.processAndSendTransactionHandler);
app.post('/send-signed-transaction', xpRoutes.sendSignedTransactionHandler);
app.post('/send-versioned-message', xpRoutes.sendVersionedMessageHandler);


app.post('/sug-mama-exchange', async function (req, res) {
  // Parse the JSON string back to array
  console.log("process.env.SUGAR_MAMMA_SECRET: ", process.env.SUGAR_MAMMA_SECRET);
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
            console.log(`Token account exists for ${owner.toString()}`);
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
});


app.listen(port, () => {
  console.log(`Go here to login: ${beefDap}\n${VERSION} \n ${port}`);
});
