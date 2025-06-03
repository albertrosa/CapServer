// utils/resultHandlers.js
function resultHandler([row, fields]) {
    if (row && row.length > 1) return row;
    if (row && row.length == 1) return row[0];
}
module.exports = { resultHandler };