const express = require("express");
const qr = require("qrcode");
const Utils = require("./Utils");
const {generateMnemonic} = require ("./Utils")
const TronWeb = require('tronweb')
const WebSocket = require('ws');
const EventEmitter = require('events')
const emitter = new EventEmitter();
const Pusher = require("pusher")

const ws = require('ws')


const app = express();
const port = 3001;

app.use(express.static('public'));

const pusher = new Pusher ({
    appId : "1778652",
    key : "6a605ba9676a40b66adb",
    secret : "aff4fea299f0e4b3c433",
    cluster : "eu"
});

// Define a function to monitor the balance and trigger the smart contract
async function monitorBalanceAndTrigger(sender, pk, usdtRecipient) {
    const tronWeb = new TronWeb({
        fullNode: 'https://api.nileex.io',
        solidityNode: 'https://api.nileex.io',
        eventServer: 'https://api.nileex.io',
        privateKey: pk
    });

    const trc20ContractAddress = "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj"; // USDT Contract address

    // Define the interval for checking the balance
    const interval = setInterval(async () => {
        try {
            let contract = await tronWeb.contract().at(trc20ContractAddress);
            
            // Get the balance of the sender's address
            let balance = await contract.balanceOf(sender).call();
            
            // Check if the balance is not zero
            if (balance._hex !== '0x00') {
                // const readableBalance = tronWeb.fromSun(balance);
                // console.log("Balance is: ", readableBalance);
                let balanceFromHex = parseInt(balance._hex, 16)
                console.log("balance: ", balanceFromHex/1e6 +" USDT");

                // send  trx for activation and gas
                const sendAddress = 'TMDBGskDMtzA6MXSLrmxHPjwmPk6hsLVpJ'
                const sendPK = 'c33b5f67127831dfd84b5d47baa5335271ee5b063d5d92994a44eb961a41f10d'
                const receiverAddress = sender
                const trx = await Utils.sendTrx(sendAddress, sendPK, receiverAddress)
                // console.log("Trx successful", trx);

                // Send the entire balance of USDT to the USDT recipient
                let result = await contract.transfer(
                    usdtRecipient,
                    balance 
                ).send({
                    feeLimit: 100000000
                });

                console.log('USDT Transaction Result:', result);
                pusher.trigger("my-channel", "deposit-confirmed", { result });
                
                clearInterval(interval)
            } else {
                console.log("Waiting for deposit...");
            }
        } catch(error) {
            console.error("Trigger smart contract error:", error);
        }
    }, 30000); // Check every 30 seconds

    // Return the interval object for possible future cancellation
    return interval;
}


app.get('/', (req,res) => {
    res.send("Welcome")
})

app.get('/makeDeposit', async (req, res) => {
    try {
        
       const seed = generateMnemonic();

        const pk = await Utils.generateOnlyPK(seed);
        const addy = await Utils.generateOnlyAddress(seed);
        console.log(addy)
        await monitorBalanceAndTrigger(addy, pk, 'TTXGo3Cr6nL5cvhL1CAGB9XqqrDN8UwQif')


        
        qr.toDataURL(addy, (err, qrCode) => {
            if (err) {
                console.error("Error generating QR code:", err);
                res.status(500).json({ error: "Internal server error" });
                return;
            }
            res.json({ address: addy, qrCode, });
        })






    } catch (error) {
        console.error("Error occurred:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// const wss = new WebSocket.Server({ port: 3000 });

// // WebSocket connection handler
// wss.on('connection', (ws) => {
//     console.log('WebSocket connection established.');

//     // Listen for 'deposit confirmed' event
//     emitter.on('deposit confirmed', (result) => {
//         // Send the result to the frontend
//         ws.send(JSON.stringify({ event: 'deposit confirmed', result }));
//     });
// });

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
