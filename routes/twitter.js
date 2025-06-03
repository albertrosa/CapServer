// routes/twitter.js
const axios = require("axios");

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





module.exports = {
    performUserSearch,
    getXUserData,
    handleXAPIErrors,
    STATE,
};