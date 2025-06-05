// routes/twitter.js
const axios = require("axios");
const { authClient, STATE } = require("./auth");

const {generateMD5Hash} = require("./utils/cryptoUtils");
const isMobile = require('is-mobile');


const dotenv = require("dotenv");
dotenv.config();
const beefDap = process.env.BEEF_URI;

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

const twitterRecentSearchHandler = async (req, res) => {

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

const twitterSearchHandler = async (req, res) => {

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

const twitterUserSearchHandler = async (req, res) => {
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
}

const twitterPostSearchHandler = async (req, res) => {

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


module.exports = {
    performUserSearch,
    getXUserData,
    handleXAPIErrors,
    twitterLogInHandler,
    twitterLoginCallbackHandler,
    twitterRevokeHandler,
    twitterRecentSearchHandler,
    twitterSearchHandler,
    twitterUserSearchHandler,
    twitterPostSearchHandler
};