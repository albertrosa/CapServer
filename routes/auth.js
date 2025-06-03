// routes/auth.js
const { auth } = require("twitter-api-sdk");
const authClient = new auth.OAuth2User({
    client_id: process.env.X_ACCOUNT,
    client_secret: process.env.X_SECRET,
    callback: process.env.BASE_URL + "/twitter/callback",
    scopes: ["tweet.read", "users.read"],
});

const STATE = "my-state";

module.exports = {
    authClient,
    STATE,
};