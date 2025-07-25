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



// Import XP route handlers
const xpRoutes = require('./routes/xp');

// Register XP routes
app.post('/validate-transaction', xpRoutes.validateTransactionHandler);
app.post('/process-transaction', xpRoutes.processTransactionHandler);
app.post('/process-and-send-transaction', xpRoutes.processAndSendTransactionHandler);
app.post('/send-signed-transaction', xpRoutes.sendSignedTransactionHandler);
app.post('/send-versioned-message', xpRoutes.sendVersionedMessageHandler);


app.listen(port, () => {
  console.log(`Go here to login: ${beefDap}\n${VERSION} \n ${port}`);
});