
const CAPSERVER = require("../cap_lib.js");


const verifyHandler = async (req, res) => {
    try {
        const { params } = req.body

        let rul = '';
        const passed = CAPSERVER.validate(params.style, params.data, params.user, params.choices)

        // the rule has passed second tier validation
        if (passed) {
            const [validIns, validMessage] = CAPSERVER.verify(params.u, params.style);
            console.log(validMessage, validIns);

            res.send(JSON.stringify({ status: 'Done', msg: rul, message: validMessage, instruction: validIns }));
        } else {
            res.send(JSON.stringify({ status: 'Done', msg: rul, message: 'Invalid', instruction: null }));
        }
        return;
    } catch (err) {
        console.error(err)
        res.send(JSON.stringify({ error: 'Verification ERROR' }));
        return;
    }

}



module.exports = {
    verifyHandler,
};