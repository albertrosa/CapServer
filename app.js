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
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");
let accessToken = "";
dotenv.config();

const app = express();
app.use(cors());


const authClient = new auth.OAuth2User({
  client_id: process.env.X_ACCOUNT,
  client_secret: process.env.X_SECRET,
  callback: "https://capserver-3eyf.onrender.com/twitter/callback",
  scopes: ["tweet.read", "users.read"],
});


const dappTwitterUrl = "https://capbeef.onrender.com/t/";

const client = new Client(authClient);

const STATE = "my-state";

app.get("/twitter/callback", async function (req, res) {
  try {
    const { code, state } = req.query;    
    accessToken = (await authClient.requestAccessToken(code)).token
      .access_token;
    // console.log("AccessToken: " + JSON.stringify(accessToken));
    // console.log(req.user);

    const userResponse = await axios.get("https://api.twitter.com/2/users/me", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

    // const token = JSON.stringify(accessToken);
    // const user = JSON.stringify(userResponse.data);

    const tmp = {
      t: accessToken,
      n: userResponse.data.data.name,
      u: userResponse.data.data.username,
      i: userResponse.data.data.id,
    }

    const followersResponse = await axios.get("https://api.twitter.com/2/users/"+tmp.i+"/followers?user.fields=username,verified", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    });

    
    res.send(`
      <html>
      <body>
        <p>You have been authenticated with this platform. You can close the window now.</p>
        ${JSON.stringify(tmp)}
        <a href="https://capbeef.onrender.com/t/?i=${encodeURIComponent(JSON.stringify(tmp))}">Tap if not closed<a/>
        <p>
        ${JSON.stringify(followersResponse)}
        </p>
        <script>
          // Pass the access token and status to the parent window
          window.opener.postMessage(
          { token: ${JSON.stringify(accessToken)}, 
           user: ${JSON.stringify(userResponse.data)},
           status: "Login successful" }, "*");

          // Close the window after a delay
          setTimeout(() => {
            window.close();
          }, 3000); // 3 seconds delay
        </script>
      </body>
      </html>
    // `);
  } catch (error) {
    console.log(error);
  }
});

app.get("/twitter/login", async function (req, res) {
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
    console.log(error);
  }
});

app.get('/health', function(req, res) {
  res.send(`OK`);
});


app.use(
  cors(
     {origin: '*' } // "https://capserver-3eyf.onrender.com",// "https://localhost:8080",}
    )
);

app.listen(8080, () => {
  console.log(`Go here to login: http://localhost:8080/twitter/login`);
});