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
const mysql = require('mysql2/promise');
const VERSION = "v0.3.0";

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
  queueLimit: 0
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


const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }))


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

  const { xt, search, start, end } = req.query;

  if ((req.session.at || xt) && req.session[search] == null) {

    try {
      //  v2 Auth Pattern         

      const timeRange = (start ? '&' + start : '') + (end ? '&' + end : '');

      const searchResponse = await axios.get("https://api.x.com/2/tweets/search/recent?query=" + search + "&tweet.fields=created_at&expansions=author_id&user.fields=created_at,name,verified&max_results=100" + timeRange, {
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




app.use(
  cors(
    { origin: '*' }
  )
);

app.listen(port, () => {
  console.log(`Go here to login: ${beefDap}\n${VERSION}`);
});