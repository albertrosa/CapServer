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

const VERSION = "v0.4.0";
const express = require("express");
const isMobile = require('is-mobile');
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");
const session = require('express-session');
const CAPSERVER = require('./cap_lib.js');
const { pool, sessionStore } = require('./config/database.js');
const { performUserSearch, handleXAPIErrors, getXUserData, twitterLogInHandler } = require('./routes/twitter.js');

dotenv.config();
const port = process.env.PORT || 3000;

process.on('SIGINT', async () => {
  await pool.end();
  console.log("\n\nDatabase connection pool closed");
  process.exit(0);
});


const app = express();
app.use(cors({
  origin: ['http://localhost:5173', 'https://captainfunfe.onrender.com', 'https://captain.fun', 'https://capserver-3eyf.onrender.com', 'https://node.captain.fun'], // Allow requests from a specific origin

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


app.get('/health', function (req, res) {
  res.send(`OK`);
});


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

app.get("/twitter/login", twitterLogInHandler);

app.get("/twitter/revoke", async function (req, res) {
  try {
    const response = await authClient.revokeAccessToken();
    res.send(response);
  } catch (error) {
    console.error(error);
  }
  res.send('OK');
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
      res.send(JSON.stringify(handleXAPIErrors(err)));
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

app.get('/twitter/search', async function (req, res) {

  const { xt, search, start, end } = req.query;

  if ((req.session.at || xt) && req.session[generateMD5Hash(search)] == null) {


    //  v2 Auth Pattern         
    const timeRange = (start ? '&' + start : '') + (end ? '&' + end : '');
    const searchResponse = await axios.get("https://api.x.com/2/tweets/search/all?query=" + search + timeRange + "&tweet.fields=created_at&expansions=author_id&max_results=100&" + userSearchFields, {
      headers: {
        "User-Agent": "v2RecentSearchJS",
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.X_BEARER_TOKEN}`,
      },
    }).catch((err) => {
      res.send(JSON.stringify(handleXAPIErrors(err)));
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
      res.send(JSON.stringify(handleXAPIErrors(err)));
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

app.post('/validate', async function (req, res) { });

app.listen(port, () => {
  console.log(`Go here to login: ${beefDap}\n${VERSION} \n ${port}`);
});