import { task } from "hardhat/config";

// const DAOVotingsAddress = "0xB3b8657204E78d7cd4b44c4a33802D6f1A7f7546" // for rinkeby
const DAOVotingsAddress = "0x42c3aE95999a5c26C016D81768B03F670b649F29" // for localhost

task("addProposal", "Add DAO proposal voting")
    .addParam("desc", "Short description for proposal")
    .addParam("time", "Set debatig period time for proposal")
    .addParam("contract", "Contract address for proposal call")
    .addParam("call", "CallData in 'bytes' to call at contract")
    .setAction(async (taskArgs, hre) => {
        const DAOVotingsInterface = await hre.ethers.getContractAt("DAOVotings", DAOVotingsAddress)
        await DAOVotingsInterface.addProposal(taskArgs.desc, taskArgs.time, taskArgs.contract, taskArgs.call)
        const currentIndex = await DAOVotingsInterface.getLastIndex();
        console.log(await DAOVotingsInterface.getProposal(currentIndex))
    })

task("getProposal", "Get info about exisiting proposal by id")
    .addParam("id", "Proposal id at contract")
    .setAction(async (taskArgs, hre) => {
        const DAOVotingsInterface = await hre.ethers.getContractAt("DAOVotings", DAOVotingsAddress)
        console.log(await DAOVotingsInterface.getProposal(taskArgs.id))
    })

task("vote", "Vote at proposal voting with your votes amount or 'votingPower'")
    .addParam("id", "Id of proposal voting")
    .addParam("votes", "Amount of your deposited tokens or 'votingPower'")
    .addParam("bool", "Set 'true' if you support proposal or 'false' if you disagree with it")
    .setAction(async (taskArgs, hre) => {
        const DAOVotingsInterface = await hre.ethers.getContractAt("DAOVotings", DAOVotingsAddress)
        await DAOVotingsInterface.vote(taskArgs.id, taskArgs.votes, taskArgs.bool)
        console.log(`You have voted ${taskArgs.bool? 'FOR': 'AGAINST'} at proposal №${taskArgs.id} with ${taskArgs.votes} votes amount`)
    })

task("deposit", "Deposit ERC20 tokens to contract to get votes or 'votingPower'")
    .addParam("amount", "Amount of ERC20 tokens you want to deposit")
    .setAction(async (taskArgs, hre) => {
        const DAOVotingsInterface = await hre.ethers.getContractAt("DAOVotings", DAOVotingsAddress)
        await DAOVotingsInterface.deposit(taskArgs.amount)
        console.log(`You have deposit ${taskArgs.amount} tokens`)
    })

task("finishProposal", "Finish proposal voting and initialize callData if votes 'FOR' are more then 'AGAINST'")
    .addParam("id", "ID of proposal voting at contract you want to finish")
    .setAction(async (taskArgs, hre) => {
        const DAOVotingsInterface = await hre.ethers.getContractAt("DAOVotings", DAOVotingsAddress)
        await DAOVotingsInterface.finishProposal(taskArgs.id)
        console.log(`You have finished ${taskArgs.id} proposal`)
    })

task("setERC20address", "ERC20 contract address you want to set for other to deposit")
    .addParam("address", "Address you want to give admin rights")
    .setAction(async (taskArgs, hre) => {
        const DAOVotingsInterface = await hre.ethers.getContractAt("DAOVotings", DAOVotingsAddress)
        await DAOVotingsInterface.setERC20address(taskArgs.address)
        console.log(`You have give Admin rights to ${taskArgs.address}`)
    })

task("setMinimumQuorum", "Set minimal quorum proposal must to get in votes to be acomplished")
    .addParam("amount", "Amount of votes to set as minimal quorum")
    .setAction(async (taskArgs, hre) => {
        const DAOVotingsInterface = await hre.ethers.getContractAt("DAOVotings", DAOVotingsAddress)
        await DAOVotingsInterface.setMinimumQuorum(taskArgs.amount)
        console.log(`You have set minimal quorum equal ${taskArgs.amount}`)
    })

    