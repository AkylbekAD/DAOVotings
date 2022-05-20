import hre from 'hardhat';
const ethers = hre.ethers;

let ExampleTokenAddress = "0x58Dea97d56BAF80aFec00B48A2FC158E7703Fe80";
let Quorum = 1000000000000000

const contracAddress = "0xB3b8657204E78d7cd4b44c4a33802D6f1A7f7546"

async function main() {
    const [owner] = await ethers.getSigners()

    const DAOVotings = await ethers.getContractFactory('DAOVotings', owner)
    const daovotings = await DAOVotings.deploy(ExampleTokenAddress, Quorum)
    await daovotings.deployed()
    console.log(daovotings.address)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });