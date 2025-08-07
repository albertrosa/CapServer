// routes/meta.js
const { pool } = require('../config/database.js');

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


const metaLookUpHandler = async (req, res) => {
    const { send, rule } = req.query;

    if (req.session[rule] == null) {

        try {
            const result = await get_meta_data(send, rule);
            if (result) {
                res.send(JSON.stringify({ data: result }));
                return;
            }
        } catch (err) {
            console.error(err);
        }

        res.send(JSON.stringify({ error: 'META ERROR: NO Data', login: 0 }));
    } else if (req.session[rule] != null) {
        console.info("Using Session");
        res.send(req.session[rule]);
    }
    return;
}

const metaSaveHandler = async (req, res) => {
    try {
        const { params } = req.body

        try {
            const result = await save_meta_data(params.send, params.rule, params.data);
            if (result) {
                res.send(JSON.stringify({ status: 'Saved' }));
            } else {
                res.send(JSON.stringify({ error: 'Save META ERROR' }));
            }
        } catch (err) {
            console.error(err);
            res.send(JSON.stringify({ error: 'Save META ERROR' }));
        }
    } catch (err) {
        console.error(err)
        res.send(JSON.stringify({ error: 'META ERROR' }));
    }
    return;
}

const metaDeleteHandler = async (req, res) => {
    try {
        const { send } = req.body
        try {
            const result = await remove_meta_data(send);
            if (result) {
                res.send(JSON.stringify({ status: 'Removed' }));
            } else {
                res.send(JSON.stringify({ error: 'Removal META ERROR' }));
            }
        } catch (err) {
            res.send(JSON.stringify({ error: 'Removal META ERROR' }));
            console.error(err);
        }
    } catch (err) {
        console.error(err)
        res.send(JSON.stringify({ error: 'META ERROR' }));
        return;
    }



    return;
}



module.exports = {
    save_meta_data,
    get_meta_data,
    remove_meta_data,
    metaLookUpHandler,
    metaSaveHandler,
    metaDeleteHandler
};