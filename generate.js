const express = require("express");
const qr = require("qrcode");
const Utils = require("../NEW WEBSITE/Utils");
const {generateMnemonic} = require ("../NEW WEBSITE/Utils")


const app = express();
const port = 3000;

app.use(express.static('public'));

app.get('/makeDeposit', async (req, res) => {
    try {
        

        const seed = generateMnemonic();

        const pk = await Utils.generateOnlyPK(seed);
        const addy = await Utils.generateOnlyAddress(seed);
        console.log(pk);


        
        qr.toDataURL(addy, (err, qrCode) => {
            if (err) {
                console.error("Error generating QR code:", err);
                res.status(500).json({ error: "Internal server error" });
                return;
            }
            res.json({ address: addy, qrCode });
        })

                // send 1 trx from hyper address to the newly generated addresss
                const senderAddress = 'TMDBGskDMtzA6MXSLrmxHPjwmPk6hsLVpJ'
                const senderPK = 'c33b5f67127831dfd84b5d47baa5335271ee5b063d5d92994a44eb961a41f10d'
                await Utils.sendTrx(senderAddress, senderPK, addy);

                // collect the tron sent back
                const senderAddress1 = addy
                const privateKey = pk
                const receiverAddress = 'TTXGo3Cr6nL5cvhL1CAGB9XqqrDN8UwQif'
                
                const sendBack = await Utils.sweepTRX(privateKey, senderAddress1, receiverAddress)
                console.log(sendBack);




    } catch (error) {
        console.error("Error occurred:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
