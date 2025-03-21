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
const { auth } = require("twitter-api-sdk");
const express = require("express");
const isMobile = require('is-mobile');
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");
const session = require('express-session');
const MySQLStore = require("express-mysql-session")(session);

const VERSION = "v0.2.1";

const port = process.env.PORT || 3000;
const mysql_options = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE,
  createDatabaseTable: true,
}

const sessionStore = new MySQLStore(mysql_options);
dotenv.config();
const app = express();
app.use(cors());


//12 hours reset
app.use(session({
  key: 'cap_oracle_session',
  secret: process.env.session,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { secured: process.env.session_secured, maxAge: 1000 * 60 * 60 * 2 } // 2 Hour session limit to match X API lifetime
}))

const beefDap = process.env.BEEF_URI;

const authClient = new auth.OAuth2User({
  client_id: process.env.X_ACCOUNT,
  client_secret: process.env.X_SECRET,
  callback: process.env.BASE_URL + "/twitter/callback",
  scopes: ["tweet.read", "users.read"],
});

const STATE = "my-state";

const userSearchFields = "user.fields=created_at,name,id,profile_image_url,verified";

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
      });
    return JSON.stringify(searchResponse.data);
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
      });
    return JSON.stringify(searchResponse.data);
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

    console.log(req.headers['user-agent']);
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

app.get('/twitter/follows', async function (req, res) {

  const { xt, search } = req.query;

  if ((req.session.at || xt) && req.session[search] == null) {

    try {
      //  v2 Auth Pattern          
      const searchResponse = await axios.get("https://api.x.com/2/tweets/search/recent?query=" + search + "&tweet.fields=created_at&expansions=author_id&user.fields=created_at,name,verified,&max_results=100", {
        headers: {
          "User-Agent": "v2RecentSearchJS",
          "Content-Type": "application/json",
          Authorization: `Bearer ${xt}`,
        },
      });

      req.session[search] == JSON.stringify(searchResponse.data);
      res.send(JSON.stringify(JSON.stringify(searchResponse.data)));
      return;

    } catch (err) { console.error('Search Error', err); }
    res.send(JSON.stringify({ error: 'X SEARCH ERROR: API Error', login: 1 }));
    return;
  } else if (req.session[search] != null) {
    console.info("Using Session");
    res.send(req.session[search]);
  } else {
    res.send(JSON.stringify({ error: 'X SEARCH ERROR: Error', login: 0 }));
  }
}



);

app.get('/twitter/users', async function (req, res) {
  const { users } = req.query;

  if ((req.session.at) && req.session[users] == null) {

    if (users && users.length > 0) {
      try {
        const searched = await performUserSearch(users)
        req.session[users] = searched;
        res.send(searched);
      } catch (err) {
        res.send(JSON.stringify({ error: 'X SEARCH ERROR: Login', login: 1 }));
      }

    } else {
      res.send(JSON.stringify({ error: 'X SEARCH ERROR: NO Params', login: 0 }));
    }

  } else if (req.session[users] != null) {
    console.info("loading from cache");
    // saved as JSON STRING
    res.send(req.session[users]);
  } else {
    if (users && users.length > 0) {
      // User Search Application Search
      const searched = await performUserSearch(users, false);
      req.session[users] = searched;
      res.send(searched);
    } else {
      res.send(JSON.stringify({ error: 'X SEARCH ERROR: NO Params', login: 0 }));
    }
  }
});

app.use(
  cors(
    { origin: '*' }
  )
);

app.listen(port, () => {
  console.log(`Go here to login: ${beefDap}\n${VERSION}`);
});