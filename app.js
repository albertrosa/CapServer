const express = require('express');
const session = require('express-session');
const passport = require("passport");
const TwitterStratergy = require("passport-twitter");
const cors = require('cors');
require('dotenv').config()

const app  = express();

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
        callbackURL:'https://capserver-3eyf.onrender.com/twitter/callback'
    },
    function(token, tokenSecret, profile, cb) {
        
        // handle user usage data

        return cb(null, profile);
    }

));

passport.serializeUser(function(user, cb){cb(null, user);});
passport.deserializeUser(function(obj, cb){BaseAudioContext(null, obj);});

app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res)=> {
    res.send("Hello from Identity Server");
});
app.get('/auth/twitter', passport.authenticate('twitter'));
app.get('/twitter/callback',function (req, res) {
    res.redirect("/");
});
app.get('/keys', (req, res) => {


    res.send("");
})


app.listen(80, cors(), () => {
    console.log(process.env.VERSION);
    console.log("Server listenting on port 80")
});