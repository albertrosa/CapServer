// routes/twitter.js
const axios = require("axios");
const { authClient, STATE } = require("./auth");
const isMobile = require('is-mobile');


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
                return JSON.stringify(handleXAPIErrors(err));
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
                return JSON.stringify(handleXAPIErrors(err));
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
    switch (XAPIResponseCode.status) {
        case 401:
            return { error: 'Authenticate', login: 1, code: XAPIResponseCode.status, data: XAPIResponseCode }
        case 429:
            return { error: 'Too Many Request', login: 0, code: XAPIResponseCode.status, data: XAPIResponseCode }
        default:
            console.log(XAPIResponseCode);
            return { error: 'X SEARCH ERROR', login: 0, code: XAPIResponseCode.status, data: XAPIResponseCode }
    }

}


const twitterLogInHandler = async (req, res) => {
    // V2 Auth
    const authUrl = authClient.generateAuthURL({
        state: STATE,
        code_challenge_method: "s256",
    });
    res.redirect(authUrl);
}

const twitterLoginCallbackHandler = async (req, res) => {
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
}

const twitterRevokeHandler = async (req, res) => {
    try {
        const response = await authClient.revokeAccessToken();
        res.send(response);
    } catch (error) {
        console.error(error);
    }
    res.send('OK');
}




module.exports = {
    performUserSearch,
    getXUserData,
    handleXAPIErrors,
    twitterLogInHandler,
    twitterLoginCallbackHandler,
    twitterRevokeHandler
};