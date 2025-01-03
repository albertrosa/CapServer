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

const { Client, auth } = require("twitter-api-sdk");
const express = require("express");
const isMobile = require('is-mobile');
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");
const session = require('express-session');


let accessToken = "";
dotenv.config();

const app = express();
app.use(cors());

app.use(session({
  secret: process.env.session,
  resave: false,
  saveUninitialized: false, 
  cookie: {secured: process.env.session_secured}
}))

const beefDap = process.env.BEEF_URI;

const authClient = new auth.OAuth2User({
  client_id: process.env.X_ACCOUNT,
  client_secret: process.env.X_SECRET,
  callback: process.env.BASE_URL + "/twitter/callback",
  scopes: ["tweet.read", "users.read"],
});

const max = 100;
const min = 1;

const client = new Client(authClient);

const STATE = "my-state";

app.get("/twitter/callback", async function (req, res) {
  try {
    let tmp;
    if (req.session.userId) {
      tmp = {
        t: req.session.at,
        n: req.session.name,
        u: req.session.username,
        i: req.session.xId,
        f: req.session.xFollowers
      }
      // res.send(JSON.stringify(tmp));
    } else {
      // fresh login
      const { code, state } = req.query;    
      const accessToken = (await authClient.requestAccessToken(code)).token.access_token;

      const userResponse = await axios.get("https://api.twitter.com/2/users/me", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });

      tmp = {
        t: accessToken,
        n: userResponse.data.data.name,
        u: userResponse.data.data.username,
        i: userResponse.data.data.id,
        f: Math.ceil(Math.random() * (max - min) + min)
      }

      req.session.userId =  Math.ceil(Math.random() * 100)
      req.session.name = tmp.n;
      req.session.username = tmp.u;
      req.session.at = accessToken;
      req.session.xUsername = tmp.u;
      req.session.xId = tmp.i;
      req.session.xFollowers = tmp.f;
    }

    // let followersResponse;
    // try {
    //   followersResponse = await axios.get("https://api.twitter.com/2/users/"+tmp.i+"/followers?user.fields=username,verified", {
    //     headers: {
    //       "Content-Type": "application/json",
    //       Authorization: `Bearer ${accessToken}`,
    //     },
    //   });
    // } catch(err) {
    //   console.log("Expected Error when doing user look up for free :-)")
    // }

    if (isMobile(req.headers['user-agent'])) {

      
      res.send(`
        <html>
        <body>
          <p>Redirection to App</p>        
          <h1><a href="${beefDap}/t/?i=${encodeURIComponent(JSON.stringify(tmp))}">Not Redirected<a/></h1>
          
          <script>
            // Pass the access token and status to the parent window
            window.location.href="${beefDap}/t/?i=${encodeURIComponent(JSON.stringify(tmp))}";
            

            // Close the window after a delay
            setTimeout(() => {
              try {
                window.location.href="${beefDap}/t/?i=${encodeURIComponent(JSON.stringify(tmp))}";            
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
              window.location.href="${beefDap}/t/?i=${encodeURIComponent(JSON.stringify(tmp))}";
            }

            try {
              // Temp this is required to evaluate the player auth for testing on Phantom
              window.close();
            } catch(err) {
              window.location.href="${beefDap}/t/?i=${encodeURIComponent(JSON.stringify(tmp))}";
            }

            window.location.href="${beefDap}/t/?i=${encodeURIComponent(JSON.stringify(tmp))}";

            // Close the window after a delay
            setTimeout(() => {
              try {                
                window.close();
              } catch(err) {
                
            window.location.href="${beefDap}/t/?i=${encodeURIComponent(JSON.stringify(tmp))}";
              }
            }, 3000); // 3 seconds delay
          </script>
        </body>
        </html>
       `);
  }
  } catch (error) {
    console.log(error);
  }
});

app.get("/twitter/login", async function (req, res) {
  
  if (req.session.userId) {
    res.redirect('/twitter/callback')  
  } else {

    const authUrl = authClient.generateAuthURL({
      state: STATE,
      code_challenge_method: "s256",
    });
    res.redirect(authUrl);
  }



});

app.get("/twitter/revoke", async function (req, res) {
  try {
    const response = await authClient.revokeAccessToken();
    res.send(response);
  } catch (error) {
    console.log(error);
  }
});

app.get('/health', function(req, res) {
  res.send(`OK`);
});

app.get("/login", async function(req, res){
  req.session.userId =  Math.ceil(Math.random() * 100)
  req.session.name = 'not me';
  req.session.username = '@not_me';
  req.session.at = 'token';
  req.session.xUsername = 'XusName';
  req.session.xId = '123213';
  req.session.xFollowers = Math.ceil(Math.random() * (max - min) + min);
  res.send('OK');
});

app.get('/status', async function (req, res) {
  
  if (req.session.userId) {
    const tmp = {
      t: req.session.at,
      n: req.session.name,
      u: req.session.username,
      i: req.session.xId,
      f: req.session.xFollowers
    }
    res.send(JSON.stringify(tmp));
  } else {
    res.send("LOGIN");
  }  
});

app.get('/logout', async function (req, res) {
  // try {
  //   await authClient.revokeAccessToken();    
  // } catch (error) {
  //   console.log(error);
  // }

  req.session.destroy((err) => {
    if (err) {
      console.error(err);
    }
    res.redirect('/status');
  });
});

app.get('/twitter/follows', async function (req, res){

  const { xt, xid, follows, search, followers, tweets } = req.query;    

  if (req.session.userId || xt) {
  // const accessToken = req.session.at;
  // const xid =  req.session.xId;

    const accessToken = xt; 

    if (search)  {
      try {
          const searchResponse = await axios.get("https://api.x.com/2/tweets/search/recent?query="+search+"&tweet.fields=created_at&expansions=author_id&user.fields=created_at,name&max_results=100", {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          });

          res.send(JSON.stringify(searchResponse.data));
        } catch(err) {console.log('Me Error', err);}      
    }

    if(follows) {

      try{
          let pgToken = null; // this is for pagination purposeses only
          const followingResponse = await axios.get("https://api.x.com/2/users/"+xid+"/following?user.fields=id,name,profile_image_url,username,verified&max_results=1000&pagination_token="+pgToken, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
          });
        
          res.send(JSON.stringify(followingResponse.data));
      } catch(err) {console.log('Followers Error',  err.error);}
    }

    if (followers) {

      try{
        const followersResponse = await axios.get("https://api.twitter.com/2/users/"+xid+"/followers?user.fields=id,name,profile_image_url,username,verified", {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });
      
        console.log('Followers Response: ',JSON.stringify(followersResponse.data));
        res.send(JSON.stringify(followersResponse));
      } catch(err) {console.log('Followers Error',  err.error);}
  
    }

    const tmp = {
      t: req.session.at,
      n: req.session.name,
      u: req.session.username,
      i: req.session.xId,
      f: req.session.xFollowers,
    }
    res.send(JSON.stringify(tmp));
  } else {
    res.send("LOGIN");
  }  
});




app.use(
  cors(
     {origin: '*' } 
    )
);

app.listen(8080, () => {
  console.log(`Go here to login: ${beefDap}`);
});