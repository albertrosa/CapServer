// routes/user.js
const { getXUserData, handleXAPIErrors } = require('../routes/auth');
const { performUserSearch } = require('./twitter');

module.exports = {
    getXUserData,
    handleXAPIErrors,
};