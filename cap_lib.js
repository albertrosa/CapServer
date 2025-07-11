const { Keypair, Transaction, PublicKey, VersionedTransaction, VersionedMessage, Connection, clusterApiUrl } = require("@solana/web3.js");
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

    console.log("Public Key:", keypair.publicKey.toBase58());
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
                console.log(rule_value);
                if (rule_value.message && rule_value.message.toLowerCase().indexOf(c.toLowerCase()) > -1) {
                    validatorMatch = c;
                }

                if (user_value.post && user_value.post.toLowerCase().indexOf(c.toLowerCase()) > -1) {
                    userMatch = c;
                }
            });

            console.log('validator Match: ' + validatorMatch);
            console.log('user Match: ' + userMatch);

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
            console.log("UNSUPPORTED:" + rule_type);
            valid = true;
            break;

    }

    return valid;
}


function processSolanaTransaction(encodedTransaction, rule_type, options = {}) {
    try {
        
        // Get the cap server keypair
        const hex_key = JSON.parse(process.env.SOL_SECRET).slice(0, 32);
        const secret = Uint8Array.from(hex_key);
        const keypair = Keypair.fromSeed(secret);        
        
        console.log("Public Key:", keypair.publicKey.toBase58());

        
                // Decode the base64 message
        const decodedMessage = Buffer.from(encodedTransaction, 'base64');
        console.log("Decoded message length:", decodedMessage.length);
        console.log("Decoded message (first 100 bytes):", decodedMessage.slice(0, 100));
        
        // Try to deserialize as a versioned message
        let versionedMessage;
        try {
            versionedMessage = VersionedMessage.deserialize(decodedMessage);
            console.log("Successfully deserialized versioned message");
            console.log("Message header:", versionedMessage.header);
            console.log("Static account keys:", versionedMessage.staticAccountKeys.length);
            console.log("Required signatures:", versionedMessage.header.numRequiredSignatures);
            console.log("Read-only signatures:", versionedMessage.header.numReadonlySignedAccounts);
            console.log("Read-only unsigned:", versionedMessage.header.numReadonlyUnsignedAccounts);
        } catch (e) {
            console.error("Failed to deserialize as versioned message:", e.message);
            console.error("Error stack:", e.stack);
            throw new Error("Invalid versioned message format: " + e.message);
        }
        
        // Get the message to sign (serialize the message)
        const messageToSign = versionedMessage.serialize();
        console.log("Message to sign length:", messageToSign.length);
        
        // Sign the message
        const signature = nacl.sign.detached(messageToSign, keypair.secretKey);
        const signatureBase58 = bs58.encode(signature);
        
        console.log("Signature:", signatureBase58);
        
        // Return the signature and message info
        const messageInfo = {
            header: versionedMessage.header,
            staticAccountKeys: versionedMessage.staticAccountKeys.map(key => key.toBase58()),
            recentBlockhash: versionedMessage.recentBlockhash,
            compiledInstructions: versionedMessage.compiledInstructions
        };
        
        return {
            success: true,                        
            publicKey: keypair.publicKey.toBase58(),
            ogSignature: signature,
            signature: signatureBase58,
            messageInfo: messageInfo
        };
    } catch (error) {
        console.error('Error processing Solana transaction:', error);
        return {
            success: false,
            error: error.message,
            stack: error.stack
        };
    }
}

async function processAndSendTransaction(encodedTransaction, rule_type, network = 'mainnet-beta', options = {}) {
    try {
        // First, process the transaction to get the signature
        const processResult = processSolanaTransaction(encodedTransaction, rule_type, options);
        
        if (!processResult.success) {
            return processResult;
        }
        
        // Get the cap server keypair
        const hex_key = JSON.parse(process.env.SOL_SECRET).slice(0, 32);
        const secret = Uint8Array.from(hex_key);
        const keypair = Keypair.fromSeed(secret);
        
        // Decode the original message
        const decodedMessage = Buffer.from(encodedTransaction, 'base64');
        const versionedMessage = VersionedMessage.deserialize(decodedMessage);
        
        // Create the signed transaction with proper signature array
        const signatureBytes = bs58.decode(processResult.signature);
        
        // Create a properly sized signature array
        const signatures = new Array(versionedMessage.header.numRequiredSignatures);
        signatures.fill(new Uint8Array(64)); // Fill with empty signatures
        signatures[0] = signatureBytes; // Set our signature at the first position
        
        // Create the signed transaction
        const signedTransaction = new VersionedTransaction(versionedMessage, signatures);
        
        // // Connect to Solana network
        // const connection = new Connection(clusterApiUrl(network));
        
        // // Send the transaction
        // const txid = await connection.sendTransaction(signedTransaction, {
        //     skipPreflight: options.skipPreflight || false,
        //     preflightCommitment: options.preflightCommitment || 'confirmed',
        //     maxRetries: options.maxRetries || 3
        // });
        
        // console.log('Transaction sent:', txid);
        
        // // Wait for confirmation if requested
        // let confirmation = null;
        // if (options.waitForConfirmation !== false) {
        //     confirmation = await connection.confirmTransaction(txid, options.preflightCommitment || 'confirmed');
        //     console.log('Transaction confirmation:', confirmation);
        // }
        
        return {
            success: true,
            publicKey: processResult.publicKey,
            signature: processResult.signature,
            messageInfo: processResult.messageInfo,
            // transactionId: txid,
            // confirmation: confirmation
        };
        
    } catch (error) {
        console.error('Error processing and sending Solana transaction:', error);
        return {
            success: false,
            error: error.message,
            stack: error.stack
        };
    }
}

async function sendSignedTransaction(encodedTransaction, signature, network = 'mainnet-beta', options = {}) {
    try {
        // Get the cap server keypair
        const hex_key = JSON.parse(process.env.SOL_SECRET).slice(0, 32);
        const secret = Uint8Array.from(hex_key);
        const keypair = Keypair.fromSeed(secret);
        
        // Decode the original message
        const decodedMessage = Buffer.from(encodedTransaction, 'base64');
        const versionedMessage = VersionedMessage.deserialize(decodedMessage);
        
        // Create the signed transaction with proper signature array
        const signatureBytes = bs58.decode(signature);
        
        // Create a properly sized signature array
        const signatures = new Array(versionedMessage.header.numRequiredSignatures);
        signatures.fill(new Uint8Array(64)); // Fill with empty signatures
        signatures[0] = signatureBytes; // Set our signature at the first position
        
        // Create the signed transaction
        const signedTransaction = new VersionedTransaction(versionedMessage, signatures);
        
        // Connect to Solana network
        const connection = new Connection(clusterApiUrl(network));
        
        // Send the transaction
        const txid = await connection.sendTransaction(signedTransaction, {
            skipPreflight: options.skipPreflight || false,
            preflightCommitment: options.preflightCommitment || 'confirmed',
            maxRetries: options.maxRetries || 3
        });
        
        console.log('Transaction sent:', txid);
        
        // Wait for confirmation if requested
        let confirmation = null;
        if (options.waitForConfirmation !== false) {
            confirmation = await connection.confirmTransaction(txid, options.preflightCommitment || 'confirmed');
            console.log('Transaction confirmation:', confirmation);
        }
        
        return {
            success: true,
            publicKey: keypair.publicKey.toBase58(),
            transactionId: txid,
            confirmation: confirmation
        };
        
    } catch (error) {
        console.error('Error sending signed transaction:', error);
        return {
            success: false,
            error: error.message,
            stack: error.stack
        };
    }
}

async function sendVersionedMessage(encodedMessage, network = 'mainnet-beta', options = {}) {
    try {
        console.log('Starting sendVersionedMessage');
        console.log('Network:', network);
        console.log('Options:', options);
        
        // Get the cap server keypair
        const hex_key = JSON.parse(process.env.SOL_SECRET).slice(0, 32);
        const secret = Uint8Array.from(hex_key);
        const keypair = Keypair.fromSeed(secret);
        
        console.log('Cap server public key:', keypair.publicKey.toBase58());
        
        // Decode the base64 message
        const decodedMessage = Buffer.from(encodedMessage, 'base64');
        console.log('Decoded message length:', decodedMessage.length);
        
        // Deserialize the versioned message
        let versionedMessage;
        try {
            versionedMessage = VersionedMessage.deserialize(decodedMessage);
            console.log('Successfully deserialized versioned message');
            console.log('Message header:', versionedMessage.header);
            console.log('Static account keys:', versionedMessage.staticAccountKeys.length);
            console.log('Required signatures:', versionedMessage.header.numRequiredSignatures);
            console.log('First account key:', versionedMessage.staticAccountKeys[0].toBase58());
        } catch (e) {
            console.error('Failed to deserialize versioned message:', e.message);
            throw new Error('Invalid versioned message format: ' + e.message);
        }
        
        // // Verify the first account key matches our public key
        // if (versionedMessage.staticAccountKeys[0].toBase58() !== keypair.publicKey.toBase58()) {
        //     console.error('First account key mismatch:');
        //     console.error('Expected (cap server):', keypair.publicKey.toBase58());
        //     console.error('Found in message:', versionedMessage.staticAccountKeys[0].toBase58());
        //     throw new Error('First account key does not match cap server public key');
        // }
        
        // Get the message to sign
        const messageToSign = versionedMessage.serialize();
        console.log('Message to sign length:', messageToSign.length);
        
        // Sign the message
        const signature = nacl.sign.detached(messageToSign, keypair.secretKey);
        const signatureBase58 = bs58.encode(signature);
        
        console.log('Signature created:', signatureBase58);
        console.log('Signature length:', signature.length);
        
        // Create the signature array with proper length
        const signatures = [];        
        for (let i = 0; i < versionedMessage.header.numRequiredSignatures; i++) {
            
            signatures.push(new Uint8Array(64));
        }
        signatures[0] = signature;
        
        console.log('Signature array length:', signatures.length);
        console.log('First signature length:', signatures[0].length);
        
        // Create the signed transaction
        const signedTransaction = new VersionedTransaction(versionedMessage, signatures);
        
        // Connect to Solana network
        const connection = new Connection(clusterApiUrl(network));
        
        // Simulate the transaction first (optional, for debugging)
        // if (options.simulateFirst !== false) {
        //     try {
        //         console.log('Simulating transaction...');
        //         const simulation = await connection.simulateTransaction(signedTransaction);
        //         console.log('Simulation result:', simulation);
        //         if (simulation.value.err) {
        //             console.error('Simulation failed:', simulation.value.err);
        //             throw new Error('Transaction simulation failed: ' + JSON.stringify(simulation.value.err));
        //         }
        //     } catch (simError) {
        //         console.error('Simulation error:', simError);
        //         throw simError;
        //     }
        // }
        
        // Send the transaction
        let txid;
        try {
            console.log('Sending transaction...');
            txid = await connection.sendTransaction(signedTransaction, {
                skipPreflight: options.skipPreflight || false,
                preflightCommitment: options.preflightCommitment || 'confirmed',
                maxRetries: options.maxRetries || 3
            });
            console.log('Transaction sent successfully:', txid);
        } catch (error) {
            console.error('SendTransactionError details:', {
                signature: error.signature,
                transactionMessage: error.transactionMessage,
                transactionLogs: error.transactionLogs
            });
            throw error;
        }
        
        // Wait for confirmation if requested
        let confirmation = null;
        if (options.waitForConfirmation !== false) {
            console.log('Waiting for confirmation...');
            confirmation = await connection.confirmTransaction(txid, options.preflightCommitment || 'confirmed');
            console.log('Transaction confirmation:', confirmation);
        }
        
        // Prepare message info
        const messageInfo = {
            header: versionedMessage.header,
            staticAccountKeys: versionedMessage.staticAccountKeys.map(key => key.toBase58()),
            recentBlockhash: versionedMessage.recentBlockhash,
            compiledInstructions: versionedMessage.compiledInstructions
        };
        
        return {
            success: true,
            publicKey: keypair.publicKey.toBase58(),
            signature: signatureBase58,
            transactionId: txid,
            confirmation: confirmation,
            messageInfo: messageInfo
        };
        
    } catch (error) {
        console.error('Error in sendVersionedMessage:', error);
        return {
            success: false,
            error: error.message,
            stack: error.stack
        };
    }
}

/** END OF  CAPSERVER */

module.exports = {
    validate,
    verify,
    verifyMessage,
    processSolanaTransaction,
    processAndSendTransaction,
    sendSignedTransaction,
    sendVersionedMessage,
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