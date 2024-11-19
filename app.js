const express = require('express');
const session = require('express-session');
const passport = require("passport");
const TwitterStratergy = require("passport-twitter");
const cors = require('cors');
require('dotenv').config()

const TwitterApi = require('twitter-api-v2');

// import { TwitterApi } from 'twitter-api-v2';

const app  = express();
const PORT = process.env.PORT ||8080;

app.use(cors());
app.use(session({
    secret: 'asdfaeaeq25q0wedsvaf4-ta4ta32ocyn307rtap4t', // Replace with a strong secret key
    resave: false,
    saveUninitialized: true,
    cookie: { 
      secure: false, // Set to true if using HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours 
    }
  }));

passport.use(
    new TwitterStratergy({
        consumerKey: process.env.CONSUMER_API_KEY,
        consumerSecret: process.env.CONSUME_API_SECRET,
        callbackURL: 'https://captainbeef.onrender.com/twitter/callback'
    },
    function(token, tokenSecret, profile, cb) {        
        // handle user usage data
        return cb(null, profile);
    }

));

app.use(passport.initialize());
app.use(passport.session());


passport.serializeUser(function(user, cb){cb(null, user);});
passport.deserializeUser(function(obj, cb){BaseAudioContext(null, obj);});

app.get('/', (req, res)=> {
    res.send("Hello from Identity Server");
});
app.get('/auth/twitter', cors(), passport.authenticate('twitter'));


app.get('/me', cors(), async function (req, res) {
    const auth = req.headers['authorization'];
    console.log(auth);

    const client = new TwitterApi.TwitterApi(auth);
    const readonly = client.readOnly;
    const user = await readonly.v2.me();
    // const user = undefined;
    console.log(user);


    res.send({'name':'name', 'id': 'id', 'username':'username', 'auth': auth, "user": user});
});



app.get('/twitter/callback',function (req, res) {
    res.redirect("/");
});
app.get('/keys', (req, res) => {
    passport.

    res.send("");
})


app.listen(PORT, cors(), () => {
    console.log(process.env.VERSION);
    console.log("Server listenting on port " + PORT)
});