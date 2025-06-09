const { Keypair } = require("@solana/web3.js");
const bs58 = require("bs58");
const nacl = require("tweetnacl");
nacl.util = require("tweetnacl-util");
const { Ed25519Program } = require("@solana/web3.js");

const RulePost = 'post';
const RuleFollow = 'follow';
const RuleCreatedBefore = 'createdBeforeOn';
const RuleFriend = 'friends';
const RuleFollowers = 'followers';
const RuleVerified = 'validated';
const RuleExpiration = 'expiration';
const RuleReply = 'reply';
const RuleValidator = 'validator';
const RulePayment = 'payment';
const RuleCustom = 'custom';
const RuleVenmo = 'venmo';
const RuleTicketmaster = 'ticketmaster';
const RuleAxs = 'axs';
const RuleShopify = 'shopify';
const RuleStubhub = 'stubhub';
const RuleVivid = 'vivid';
const RuleSeatgeek = 'seatgeek';
const RuleChoice = 'choice';

function signMessage(message, keypair) {
    const messageBytes = nacl.util.decodeUTF8(message);
    const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
    return bs58.encode(signature)
}

function verifyMessage(message, signature, pubkey) {
    const messageBytes = nacl.util.decodeUTF8(message);
    const result = nacl.sign.detached.verify(
        messageBytes,
        bs58.decode(signature),
        pubkey.toBytes(),
    );

    return result;
}

function makeEdInstruct(singerPubKey, message, signature) {

    const edInst = Ed25519Program.createInstructionWithPublicKey(
        {
            publicKey: singerPubKey.toBytes(),
            message: message,
            signature: signature,
        }
    )

    return edInst;
}

const verify = (messageVer, rule_type) => {

    hex_key = JSON.parse(process.env.SOL_SECRET).slice(0, 32);
    secret = Uint8Array.from(hex_key);
    const keypair = Keypair.fromSeed(secret);

    let msg;
    switch (rule_type) {
        case RuleFollow:
        case RuleFollowers:
        case RuleFriend:
            msg = 'fol';
            break;
        case RulePost:
        case RuleReply:
            msg = 'xpost';
            break;
        case RuleVerified:
            msg = 'xv';
            break;
        case RuleValidator:
            msg = 'val';
            break;
        case RuleExpiration:
            msg = 'exp';
            break;
        case RuleCreatedBefore:
            msg = 'xb4';
            break;
        case RulePayment:
            msg = 'pay';
            break;
        case RuleChoice:
            msg = 'choice';
            break;
        case RuleCustom:
            msg = 'c';
            break;
        case RuleSeatgeek:
        case RuleSeatgeek:
        case RuleStubhub:
        case RuleTicketmaster:
        case RuleVenmo:
        case RuleVivid:
        case RuleShopify:
            msg = 'tix';
            break;

    }


    let OK_MESSAGE = msg ? msg : messageVer.toString();

    const signature = signMessage(OK_MESSAGE.toString(), keypair);
    const edInst = makeEdInstruct(keypair.publicKey, OK_MESSAGE, bs58.decode(signature));

    return [edInst, OK_MESSAGE];
}


const validate = (rule_type, rule_value, user_value, choices) => {

    let valid = false;
    switch (rule_type) {
        case RuleFollow: // not used
            break;
        case RuleCreatedBefore:
            valid = Number(rule_value.time) >= Number(user_value.c);
            break;
        case RuleFollowers:
            valid = Number(rule_value.count) <= Number(user_value.fol);
            break;
        case RuleFriend:
            valid = Number(rule_value.count) <= Number(user_value.friend);
            break;
        case RuleVerified:
            valid = user_value.v.toString() === "true";
            break;
        case RulePost:
            if (user_value.post &&
                user_value.post.toLowerCase().indexOf(rule_value.message.toLowerCase()) > -1
            ) {
                valid = true;
            }
            break;
        case RuleReply:
            const replyTo = rule_value.message.toLowerCase().split(' ')[0];
            const content = rule_value.message.toLowerCase().replace(replyTo, '').trim();
            if (user_value.post &&
                user_value.post.toLowerCase().indexOf(replyTo) > -1 &&
                user_value.post.toLowerCase().indexOf(content) > -1
            ) {
                valid = true;
            }

            if (user_value.post &&
                !isNaN(Number(replyTo)) &&
                user_value.post.toLowerCase().indexOf(content) > -1
            ) {
                valid = true;
            }


            break;
        case RuleChoice:
            let userMatch, validatorMatch;

            choices.forEach(c => {
                if (rule_value.message && rule_value.message.toLowerCase().indexOf(c.toLowerCase()) > -1) {
                    validatorMatch = c;
                }

                if (user_value.post && user_value.post.toLowerCase().indexOf(c.toLowerCase()) > -1) {
                    userMatch = c;
                }
            });


            if (userMatch == validatorMatch) {
                valid = true;
            }


            break;
        // defaults
        case RuleExpiration:
        case RuleCustom:
        case RuleSeatgeek:
        case RuleSeatgeek:
        case RuleStubhub:
        case RuleTicketmaster:
        case RuleVenmo:
        case RuleVivid:
        case RuleShopify:
        case RuleValidator: // on-chain verification
        case RulePayment: // on-chain verification
        default:
            console.error("UNSUPPORTED: " + rule_type);
            valid = true;
            break;

    }

    return valid;
}

/** END OF  CAPSERVER */

module.exports = {
    validate,
    verify,
    verifyMessage,
    RulePost,
    RuleFollow,
    RuleCreatedBefore,
    RuleFriend,
    RuleFollowers,
    RuleVerified,
    RuleExpiration,
    RuleReply,
    RuleValidator,
    RulePayment,
    RuleCustom,
    RuleVenmo,
    RuleTicketmaster,
    RuleAxs,
    RuleShopify,
    RuleStubhub,
    RuleVivid,
    RuleSeatgeek,
    RuleChoice,
}