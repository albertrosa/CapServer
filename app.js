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


const crypto = require('crypto');
const { auth } = require("twitter-api-sdk");
const express = require("express");
const isMobile = require('is-mobile');
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");

const session = require('express-session');
const MySQLStore = require("express-mysql-session")(session);
const mysql = require('mysql2/promise');
const VERSION = "v0.3.1";
const CAPSERVER = require('./cap_lib.js');
const { Connection, PublicKey, Transaction, Token, ASSOCIATED_TOKEN_PROGRAM_ID, Keypair } = require('@solana/web3.js');
const { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferCheckedInstruction, createTransferInstruction } = require("@solana/spl-token");
const splToken = require("@solana/spl-token");
const BN = require('bn.js');




dotenv.config();
const port = process.env.PORT || 3000;

/** SESSIONS */
const mysql_options = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE,
  createDatabaseTable: true,
}

const sessionStore = new MySQLStore(mysql_options);
/** END SESSIONS */


/** DB INTERACTIONS */
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

});

process.on('SIGINT', async () => {
  await pool.end();
  console.log("\n\nDatabase connection pool closed");
  process.exit(0);
});

async function save_meta_data(send_key, rule_key, data) {
  const [rows] = await pool.execute(
    'INSERT INTO rule_metas (send, rule, data, created) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
    [send_key, rule_key, data]
  );
  return rows
}


async function remove_meta_data(send_key) {
  const [rows] = await pool.execute(
    'DELETE FROM rule_metas where send = ?',
    [send_key]
  );
  return rows
}

async function get_meta_data(send_key, rule_key) {
  const sql = 'SELECT * FROM rule_metas where send = ? and rule = ?';
  const data = await pool.query(sql, [send_key, rule_key]);

  return result_handler(data);
}

function result_handler([row, fields]) {
  if (row && row.length > 1) return row;
  if (row && row.length == 1) return row[0];
}
/** DB INTRERACTIONS */

/* crypt */
function generateMD5Hash(input) {
  if (input) {
    return crypto.createHash('md5').update(input.toString()).digest('hex');
  }
}
/* end crypt */

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

const beefDap = process.env.BEEF_URI;

const authClient = new auth.OAuth2User({
  client_id: process.env.X_ACCOUNT,
  client_secret: process.env.X_SECRET,
  callback: process.env.BASE_URL + "/twitter/callback",
  scopes: ["tweet.read", "users.read"],
});

const STATE = "my-state";

const userSearchFields = "user.fields=created_at,name,id,profile_image_url,verified,verified_type";

const performUserSearch = async (users, useSession = true) => {

  const token = useSession ? req.session.at : process.env.X_BEARER_TOKEN;

  if (users.indexOf(',') > 0) {
    const searchResponse = await axios.get("https://api.x.com/2/users/by?usernames=" + users
      + "&" + userSearchFields
      , {
        headers: {
          "User-Agent": "v2UsersByJS",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).catch((err) => {
        return JSON.stringify(handleXAPIErrors(err.status));
      });
    if (searchResponse) {
      return JSON.stringify(searchResponse.data);
    }
  } else {
    // Single Username flow        
    const searchResponse = await axios.get("https://api.x.com/2/users/by/username/" + users
      + "?" + userSearchFields
      , {
        headers: {
          "User-Agent": "v2UsersByJS",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).catch((err) => {
        return JSON.stringify(handleXAPIErrors(err.status));
      });
    if (searchResponse) {
      return JSON.stringify(searchResponse.data);
    }
  }
}

const getXUserData = async (accessToken, req) => {
  const userResponse = await axios.get("https://api.twitter.com/2/users/me?user.fields=verified,verified_type,profile_image_url,public_metrics,id,username,name,created_at&expansions=pinned_tweet_id&tweet.fields=author_id,created_at", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  tmp = {
    t: req.session.at,
    n: userResponse.data.data.name,
    u: userResponse.data.data.username,
    i: userResponse.data.data.id,
    x_img: userResponse.data.data.profile_image_url,
    created_at: userResponse.data.data.created_at,
    s: null,
    fol_cnt: userResponse.data.data.public_metrics.followers_count,
    friend_cnt: userResponse.data.data.public_metrics.following_count,
    verified: userResponse.data.data.verified,
    verified_type: userResponse.data.data.verified_type,
  }

  return tmp;
}


const handleXAPIErrors = (XAPIResponseCode) => {
  switch (XAPIResponseCode) {
    case 401:
      return { error: 'Authenticate', login: 1, code: XAPIResponseCode }
    case 429:
      return { error: 'Too Many Request', login: 0, code: XAPIResponseCode }
    default:
      console.log(XAPIResponseCode);
      return { error: 'X SEARCH ERROR', login: 0, code: XAPIResponseCode }
  }

}

app.get("/twitter/callback", async function (req, res) {
  try {
    let tmp;
    // fresh login
    const { code, state } = req.query;

    // V2 Stuff
    const accessToken = (await authClient.requestAccessToken(code)).token.access_token;

    req.session.at = accessToken;
    console.log('Session created');

    tmp = await getXUserData(accessToken, req);
    req.session.me = JSON.stringify(tmp);

    const dat = encodeURIComponent(JSON.stringify(tmp));


    if (isMobile(req.headers['user-agent'])) {
      res.send(`
        <html>
        <body>
          <p>Redirection to App</p>        
          <h1><a href="${beefDap}/t/?i=${dat}">Not Redirected<a/></h1>
          
          <script>
            // Pass the access token and status to the parent window
            window.location.href="${beefDap}/t/?i=${dat}";
            

            // Close the window after a delay
            setTimeout(() => {
              try {
                window.location.href="${beefDap}/t/?i=${dat}";            
              } catch(err) {
                
              }
            }, 3000); // 3 seconds delay
          </script>
        </body>
        </html> `);
    } else {

      res.send(`
        <html>
        <body>
          <p>You have been authenticated with this platform. You can close the window now.</p>        
          <script>
            // Pass the access token and status to the parent window
            try {
              window.opener.postMessage(
              { token: ${JSON.stringify(accessToken)}, 
              user: ${JSON.stringify(tmp)},
              status: "Login successful" }, "*");
            } catch(err) {
              window.location.href="${beefDap}/t/?i=${dat}";
            }

            try {              
              window.close();
            } catch(err) {
              window.location.href="${beefDap}/t/?i=${dat}";
            }

            window.location.href="${beefDap}/t/?i=${dat}";

            // Close the window after a delay
            setTimeout(() => {
              try {                
                window.close();
              } catch(err) {
                
            window.location.href="${beefDap}/t/?i=${dat}";
              }
            }, 3000); // 3 seconds delay
          </script>
        </body>
        </html>
       `);
    }
  } catch (error) {
    console.error(error);
    res.send({ error: 'X CALLBACK ERROR: Login', login: 1 })
  }
});

app.get("/twitter/login", async function (req, res) {
  // V2 Auth
  const authUrl = authClient.generateAuthURL({
    state: STATE,
    code_challenge_method: "s256",
  });
  res.redirect(authUrl);
});

app.get("/twitter/revoke", async function (req, res) {
  try {
    const response = await authClient.revokeAccessToken();
    res.send(response);
  } catch (error) {
    console.error(error);
  }
  res.send('OK');
});

app.get('/health', function (req, res) {
  res.send(`OK`);
});

app.get("/login", async function (req, res) {
  const { xt } = req.query;
  req.session.at = xt;
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

app.get('/twitter/follows', async function (req, res) {

  const { xt, search, start, end } = req.query;

  if ((req.session.at || xt) && req.session[generateMD5Hash(search)] == null) {
    //  v2 Auth Pattern         
    const timeRange = (start ? '&' + start : '') + (end ? '&' + end : '');
    const searchResponse = await axios.get("https://api.x.com/2/tweets/search/recent?query=" + search + timeRange + "&tweet.fields=created_at&expansions=author_id&max_results=100&" + userSearchFields, {
      headers: {
        "User-Agent": "v2RecentSearchJS",
        "Content-Type": "application/json",
        Authorization: `Bearer ${xt}`,
      },
    }).catch((err) => {
      res.send(JSON.stringify(handleXAPIErrors(err.status)));
      return
    });

    if (searchResponse) {
      req.session[generateMD5Hash(search)] = JSON.stringify(searchResponse.data);
      res.send(JSON.stringify(searchResponse.data));
    }
    return;


  } else if (req.session[generateMD5Hash(search)] != null) {
    console.info("Using Session");
    res.send(req.session[generateMD5Hash(search)]);
  } else {
    res.send(JSON.stringify({ error: 'X SEARCH ERROR: Error', login: 0 }));
  }
}



);

app.get('/twitter/users', async function (req, res) {
  const { users } = req.query;

  if ((req.session.at) && req.session[generateMD5Hash(users)] == null) {

    if (users && users.length > 0) {
      try {
        const searched = await performUserSearch(users)
        req.session[generateMD5Hash(users)] = searched;
        res.send(searched);
      } catch (err) {
        res.send(JSON.stringify({ error: 'X SEARCH ERROR: Login', login: 1 }));
      }

    } else {
      res.send(JSON.stringify({ error: 'X SEARCH ERROR: NO Params', login: 0 }));
    }

  } else if (req.session[generateMD5Hash(users)] != null) {
    console.info("loading from cache");
    // saved as JSON STRING
    res.send(req.session[generateMD5Hash(users)]);
  } else {
    if (users && users.length > 0) {
      // User Search Application Search
      const searched = await performUserSearch(users, false);
      req.session[generateMD5Hash(users)] = searched;
      res.send(searched);
    } else {
      res.send(JSON.stringify({ error: 'X SEARCH ERROR: NO Params', login: 0 }));
    }
  }
});

app.get('/twitter/post', async function (req, res) {

  const { xt, id } = req.query;
  // Keep for Session saver for dev purposes
  // req.session[generateMD5Hash(id)] = { "data": { "id": "1910392237394972890", "edit_history_tweet_ids": ["1910392237394972890"], "author_id": "1393563533820977159", "text": "CASTLES ARE BETTER", "created_at": "2025-04-10T17:59:37.000Z" }, "includes": { "users": [{ "profile_image_url": "https://pbs.twimg.com/profile_images/1415399629622059012/7J2sLEPz_normal.jpg", "verified": false, "verified_type": "none", "name": "WOBInteractive", "created_at": "2021-05-15T13:47:17.000Z", "id": "1393563533820977159", "username": "webofblood1" }] } };

  if ((req.session.at || xt) && id && req.session[generateMD5Hash(id)] == null) {
    const searchResponse = await axios.get("https://api.x.com/2/tweets/" + id + "?tweet.fields=created_at,text&expansions=author_id&" + userSearchFields, {
      headers: {
        "User-Agent": "v2RecentSearchJS",
        "Content-Type": "application/json",
        Authorization: `Bearer ${xt}`,
      },
    }).catch((err) => {
      res.send(JSON.stringify(handleXAPIErrors(err.status)));
    });

    if (searchResponse) {
      req.session[generateMD5Hash(id)] = searchResponse.data;
      req.session.t = xt;
      res.send(JSON.stringify(searchResponse.data));
    }
  } else if (id && req.session[generateMD5Hash(id)] != null) {
    console.info("Using Session");
    res.send(req.session[generateMD5Hash(id)]);
  } else {
    res.send(JSON.stringify({ error: 'X SEARCH ERROR', login: xt ? 0 : 1, code: 401 })); // unauth'd
  }
  return
}

)

app.get('/meta', async function (req, res) {
  const { send, rule } = req.query;

  if (req.session[rule] == null) {

    try {
      const result = await get_meta_data(send, rule);
      if (result) {
        res.send(JSON.stringify({ data: result }));
        return;
      }
    } catch (err) {
      console.error(err);
    }

    res.send(JSON.stringify({ error: 'META ERROR: NO Data', login: 0 }));
  } else if (req.session[rule] != null) {
    console.info("Using Session");
    res.send(req.session[rule]);
  }
  return;
});

app.post('/meta', async function (req, res) {
  try {
    const { params } = req.body

    try {
      const result = await save_meta_data(params.send, params.rule, params.data);
      if (result) {
        res.send(JSON.stringify({ status: 'Saved' }));
      } else {
        res.send(JSON.stringify({ error: 'Save META ERROR' }));
      }
    } catch (err) {
      console.error(err);
      res.send(JSON.stringify({ error: 'Save META ERROR' }));
    }
  } catch (err) {
    console.error(err)
    res.send(JSON.stringify({ error: 'META ERROR' }));
  }
  return;
});

app.delete('/meta', async function (req, res) {
  try {
    const { send } = req.body
    try {
      const result = await remove_meta_data(send);
      if (result) {
        res.send(JSON.stringify({ status: 'Removed' }));
      } else {
        res.send(JSON.stringify({ error: 'Removal META ERROR' }));
      }
    } catch (err) {
      res.send(JSON.stringify({ error: 'Removal META ERROR' }));
      console.error(err);
    }
  } catch (err) {
    console.error(err)
    res.send(JSON.stringify({ error: 'META ERROR' }));
    return;
  }



  return;
});

app.post('/verify', async function (req, res) {
  try {
    const { params } = req.body

    let rul = '';
    const passed = CAPSERVER.validate(params.style, params.data, params.user, params.choices)

    // the rule has passed second tier validation
    if (passed) {
      const [validIns, validMessage] = CAPSERVER.verify(params.u, params.style);
      console.log(validMessage, validIns);

      res.send(JSON.stringify({ status: 'Done', msg: rul, message: validMessage, instruction: validIns }));
    } else {
      res.send(JSON.stringify({ status: 'Done', msg: rul, message: 'Invalid', instruction: null }));
    }
    return;
  } catch (err) {
    console.error(err)
    res.send(JSON.stringify({ error: 'Verification ERROR' }));
    return;
  }

});

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
  console.log('HI how you doing?');
  console.log(req.body);
  // console.log(JSON.parse(req.body));
  // try {
    
    const { encodedTransaction, rule_type } = req.body;

    console.log(encodedTransaction);
    console.log(rule_type);


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
  // } catch (err) {
  //   console.error('Transaction processing error:', err);
  //   console.log('Transaction processing error:', err);
  //   res.status(500).send(JSON.stringify({ 
  //     error: 'Internal server error during transaction processing',
  //     details: err.message
  //   }));
  //   return;
  // }
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
    const { wallet, amount, payoutWallet, pyusdc} = req.body;

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
      
      const [UserPYUSDCTokenAccount, createInstructionUserPYUSDC] = await getOrCreateTokenAccount(
        payoutPubkey,
        PYUSDC_MINT,
        PYUSD_PROGID
      );

      
      const [UserUSDCPayoutTokenAccount, createInstructionUserUSDCPayout] = await getOrCreateTokenAccount(
        payoutPubkey,
        USDC_MINT
      );

      const [MamaPYUSDCTokenAccount, createInstructionMamaPYUSDC] = await getOrCreateTokenAccount(
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
      if (createInstructionUserPYUSDC) {
        transaction.add(createInstructionUserPYUSDC);
      }
      if (createInstructionMamaPYUSDC) {
        transaction.add(createInstructionMamaPYUSDC);
      }  
      if(createInstructionUserUSDCPayout) {
        transaction.add(createInstructionUserUSDCPayout);
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
      if(pyusdc !== 0){
        transaction.add(              
          createTransferCheckedInstruction(
            MamaPYUSDCTokenAccount,
            PYUSDC_MINT,
            UserPYUSDCTokenAccount,
            mamaTokenPubkey,
            amount * Math.pow(10, 6),
            6, // PYUSDC decimals
            [],
            PYUSD_PROGID
          )
        );
      } else {
        // this portion will be used to send the USDC to the user
        transaction.add(
          createTransferCheckedInstruction(
            MamaUSDCTokenAccount,
            USDC_MINT,
            UserUSDCPayoutTokenAccount,
            payoutPubkey,
            amount * Math.pow(10, 6),
            6, // USDC decimals
            [],
            TOKEN_PROGRAM_ID
          )
        );
      }



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
