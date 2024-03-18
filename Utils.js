const crypto = require('crypto');
const bip39 =require('bip39');
// const bip32 =require('bip32');
const TronWeb =require('tronweb');
const pbkdf2 =require('pbkdf2');
const aesjs =require("aes-js");
const { isAddressValid,pkToAddress } =require("@tronscan/client/src/utils/crypto");
const {utils} =require('ethers');
const TronWebNode = require('tronweb');
const ecc = require('tiny-secp256k1')
const { BIP32Factory } = require('bip32')
// You must wrap a tiny-secp256k1 compatible implementation
const bip32 = BIP32Factory(ecc)

const Utils = {
    generateMnemonic() {
        return bip39.generateMnemonic(128);
    },

    async generateAccountsWithMnemonic(mnemonic, index=1) {
        try{
            if(this.validateMnemonic(mnemonic)==false){
                throw new Error("Invalid mnemonic seed provided")
            }
        const seed = await bip39.mnemonicToSeed(mnemonic);
        const node = await bip32.fromSeed(seed);
        const addresses=[];
        for(let i=0;i<index;i++){
        const child = await node.derivePath(`m/44'/195'/${ i }'/0/0`);
        const privateKey = await child.privateKey.toString('hex');
        const address = await TronWeb.address.fromPrivateKey(privateKey);
        let addressDetails={
            privateKey,
            address
        };
        addresses.push(addressDetails);
        }
        return addresses;
    }
    catch(error){
        throw error;
    }   
    },

    async generateOnlyPK(mnemonic, index=1) {
        try{
            if(this.validateMnemonic(mnemonic)==false){
                throw new Error("Invalid mnemonic seed provided")
            }
        const seed = await bip39.mnemonicToSeed(mnemonic);
        const node = await bip32.fromSeed(seed);
        const PK = []

        for(let i=0;i<index;i++){
        const child = await node.derivePath(`m/44'/195'/${ i }'/0/0`);
        const privateKey = await child.privateKey.toString('hex');
        const address = await TronWeb.address.fromPrivateKey(privateKey);
    
        PK.push(privateKey);
        }
        return PK[0];
    }
    catch(error){
        throw error;
    }   
    },

    async generateOnlyAddress(mnemonic, index=1) {
        try{
            if(this.validateMnemonic(mnemonic)==false){
                throw new Error("Invalid mnemonic seed provided")
            }
        const seed = await bip39.mnemonicToSeed(mnemonic);
        const node = await bip32.fromSeed(seed);
        const ADDY = []

        for(let i=0;i<index;i++){
        const child = await node.derivePath(`m/44'/195'/${ i }'/0/0`);
        const privateKey = await child.privateKey.toString('hex');
        const address = await TronWeb.address.fromPrivateKey(privateKey);
    
        ADDY.push(address);
        }
        return ADDY[0];
    }
    catch(error){
        throw error;
    }   
    },



    validateMnemonic(mnemonic) {
        return bip39.validateMnemonic(mnemonic);
    },
    async getAccountAtIndex(mnemonic, index = 0) {
        try{
        if(this.validateMnemonic(mnemonic)==false){

            throw new Error("Invalid mnemonic seed provided")
        }
        const seed = await bip39.mnemonicToSeed(mnemonic);
        const node = await bip32.fromSeed(seed);
        const child = await node.derivePath(`m/44'/195'/${ index }'/0/0`);
        const privateKey = await child.privateKey.toString('hex');
        const address = await TronWeb.address.fromPrivateKey(privateKey);
        return {
            privateKey,
            address
        };
    }
    catch(error){
        throw error;
    }
    },
    
    validatePrivateKey(privateKey){
        try {
            let address = pkToAddress(privateKey);
            return isAddressValid(address);
        } catch (e) {
            return false;
        }
    },

    async getAccountFromPrivateKey(privateKey){
        try {
            const address = await TronWeb.address.fromPrivateKey(privateKey);
            if(isAddressValid(address)){
                return address;
            }
            else{
                throw new Error("Invalid private key provided!");
            }
        } catch (error) {
          throw error;
        }
    },

    async sendTrx(senderAddress, senderPK, receiverAddress, amount = 20) {
        try {
            // initialize tron instance
            const tronWeb = new TronWeb({
                fullHost: 'https://api.nileex.io',
                privateKey: senderPK
            });

            // convert amount to sun (1 sun = 1,000,000 TRX)
            const amountSun = tronWeb.toSun(amount)
            
            // create txn
            const transaction = await tronWeb.transactionBuilder.sendTrx(
                receiverAddress,
                amountSun,
                senderAddress
            );

            // sign the txn
            const signedTransaction = await tronWeb.trx.sign(transaction);

            // Broadcast the txn
            const result = await tronWeb.trx.sendRawTransaction(signedTransaction);

            // Transaction successful
            return result
        } catch (error) {
            throw error;
        }
    },


    async sweepTRX(walletSweepKey, walletSweepAddress, walletDestAddress, trxMinSweep = 10) {
        const tronWeb = new TronWeb({
            fullNode: 'https://api.nileex.io',
            solidityNode: 'https://api.nileex.io',
            eventServer: 'https://api.nileex.io',
        });
    
        let counter = 0;
        let done = 0;
        let errors = 0;
    
        while (true) {
            try {
                counter++;
                const balance = await tronWeb.trx.getBalance(walletSweepAddress);
                console.log(`Checked: ${counter}, Balance: ${balance} SUN`);
    
                if (balance > trxMinSweep) {
                    const unsignedTx = await tronWeb.transactionBuilder.sendTrx(
                        walletDestAddress,
                        balance - trxMinSweep,
                        walletSweepAddress
                    );
                    const signedTx = await tronWeb.trx.sign(unsignedTx, walletSweepKey);
                    const broadcastTx = await tronWeb.trx.sendRawTransaction(signedTx);
                    console.log(`Transferred: ${balance - trxMinSweep} TRX, TX Hash: ${broadcastTx.txid}`);
                    done++;
                } else {
                    console.log('Balance is below the minimum sweep amount.');
                }
            } catch (error) {
                console.error('Error:', error);
                errors++;
            }
    
            // Sleep for 1 minute
            await this.sleep(60);
        }
    },
    
    async sleep(seconds) {
        return new Promise(resolve => setTimeout(resolve, seconds * 1000));
    },
    

    async sweepUSDT(walletSweepKey, walletSweepAddress, walletDestAddress, usdtMinSweep = 10) {
    const tronWeb = new TronWeb({
        fullNode: 'https://api.nileex.io',
        solidityNode: 'https://api.nileex.io',
        eventServer: 'https://api.nileex.io',
    });

    const usdtContractAddress = 'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj'; // Replace with USDT contract address on Tron

    let counter = 0;
    let done = 0;
    let errors = 0;

    while (true) {
        try {
            counter++;
            const balance = await tronWeb.trx.getBalance(walletSweepAddress);
            console.log(`Checked: ${counter}, Balance: ${balance} SUN`);

            if (balance > usdtMinSweep) {
                const usdtInstance = await tronWeb.contract().at(usdtContractAddress);
                const decimals = await usdtInstance.decimals().call();
                const amountToSend = balance - usdtMinSweep;

                const amountInDecimal = amountToSend / Math.pow(10, decimals);

                const unsignedTx = await usdtInstance.transfer(walletDestAddress, amountInDecimal).send({
                    from: walletSweepAddress,
                    feeLimit: 100000000,
                });


                console.log(`Transferred: ${amountInDecimal} USDT, TX Hash: ${unsignedTx.txid}`);
                done++;
            } else {
                console.log('Balance is below the minimum sweep amount.');
            }
        } catch (error) {
            console.error('Error:', error);
            errors++;
        }

        // Sleep for 1 minute
        await this.sleep(60);
    }
},

   async getBalance(sender) {
      const CA = 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf'
      const tronWeb = new TronWeb({
        fullNode: 'https://api.nileex.io',
        solidityNode: 'https://api.nileex.io',
        eventServer: 'https://api.nileex.io',
    });

      try {
        const contractInstance = await tronWeb.contract().at(CA)
        const balance = await contractInstance.balanceOf(sender).call()
        console.log(`Balance of ${walletAddress} in contract ${contractAddress}:`, balance);

      } catch (error) {
        console.log(error);
      }
   },

   
   async triggerSmartContract(sender, privateKey) {

    const tronWeb = new TronWeb({
      fullNode: 'https://api.nileex.io',
      solidityNode: 'https://api.nileex.io',
      eventServer: 'https://api.nileex.io',
      privateKey: 'c33b5f67127831dfd84b5d47baa5335271ee5b063d5d92994a44eb961a41f10d'
    })
       const trc20ContractAddress = "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj"; // Contract address
       const recipientAddress = sender; // Replace with recipient's address
   
       try {
           let contract = await tronWeb.contract().at(trc20ContractAddress);
           let result = await contract.transfer(
               recipientAddress,
               100 // Amount to transfer
           ).send({
               feeLimit: 100000000
           }).then(output => {console.log('- Output:', output, '\n');});
           console.log('result: ', result);
       } catch(error) {
           console.error("Trigger smart contract error:", error);
       }
   },
   

   





    
    

    validateAddress(address){
        return TronWeb.isAddress(address);
    }
};
module.exports=Utils
