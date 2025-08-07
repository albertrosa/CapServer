const crypto = require('crypto');

function generateMD5Hash(input) {
    if (input) {
        return crypto.createHash('md5').update(input.toString()).digest('hex');
    }
}

module.exports = {
    generateMD5Hash,
};