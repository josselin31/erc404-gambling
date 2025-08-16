var Web3 = require("web3");

var web3 = new Web3(
new Web3.providers.HttpProvider(
"https-adresse-infura"
)

5

const address = "0xb.....";

web3.eth
.getBalance (address)

.then( (balance) =>
console. log( balance=${web3.utils.fromWei(balance, "ether")} ETH")
);