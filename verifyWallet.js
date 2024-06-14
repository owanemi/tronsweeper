const TronWeb = require('tronweb');

const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io'
});

function verifyTronAddress(address) {
    return tronWeb.isAddress(address);
}

const address = 'TR3odNht9F2wVbs1NjqvMEHxo3Ha7KHfn4';
console.log(`Is the address valid? ${verifyTronAddress(address)}`);
