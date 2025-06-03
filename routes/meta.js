// routes/meta.js
const cryptoUtils = require('../utils/cryptoUtils');

const { pool } = require('./config/database.js');


async function save_meta_data(send_key, rule_key, data) {
    const [rows] = await pool.execute(
        'INSERT INTO rule_metas (send, rule, data, created) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [send_key, rule_key, data]
    );
    return rows
}


async function remove_meta_data(send_key) {
    const [rows] = await pool.execute(
        'DELETE FROM rule_metas where send = ?',
        [send_key]
    );
    return rows
}

async function get_meta_data(send_key, rule_key) {
    const sql = 'SELECT * FROM rule_metas where send = ? and rule = ?';
    const data = await pool.query(sql, [send_key, rule_key]);

    return result_handler(data);
}

function result_handler([row, fields]) {
    if (row && row.length > 1) return row;
    if (row && row.length == 1) return row[0];
}



module.exports = {
    save_meta_data,
    get_meta_data,
    remove_meta_data,
    generateMD5Hash: cryptoUtils.generateMD5Hash,
};