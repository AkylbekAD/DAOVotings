import chai from "chai"
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { Contract } from "ethers"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { solidity } from "ethereum-waffle"
import { IERC20 } from "../typechain-types/@openzeppelin/contracts/token/ERC20/IERC20"
import { JsonRpcSigner } from "@ethersproject/providers/lib/json-rpc-provider";

chai.use(solidity);

describe("DAOVotings contract", function() {
  let DAOVotings;
  let DAOVotingsInterface: Contract;
  let ExampleToken: Contract;
  let TokenOwner: JsonRpcSigner;
  let Admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let ERC20address: string = "0x58Dea97d56BAF80aFec00B48A2FC158E7703Fe80";

  beforeEach(async function() {
    await ethers.provider.send("hardhat_impersonateAccount", ["0xa162b39f86a7341948a2e0a8dac3f0dff071d509"]);
    TokenOwner = ethers.provider.getSigner("0xa162b39f86a7341948a2e0a8dac3f0dff071d509")

    ExampleToken = <IERC20>(await ethers.getContractAt("IERC20", ERC20address));

    DAOVotings = await ethers.getContractFactory("DAOVotings");
    [Admin, user1, user2] = await ethers.getSigners();
    DAOVotingsInterface = await DAOVotings.deploy(ERC20address, 3000000000000000);
    await DAOVotingsInterface.deployed(); 

    await ExampleToken.connect(TokenOwner).transfer(Admin.address, 1000000000000000);
    await ExampleToken.connect(TokenOwner).transfer(user1.address, 1000000000000000);
    await ExampleToken.connect(TokenOwner).transfer(user2.address, 1000000000000000);
  });

  afterEach(async function() {
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
            blockNumber: 10698627
          },
        },
      ],
    });
  })

  async function passDurationTime() {
    await ethers.provider.send("evm_increaseTime", [259201]) // pass duration time
    await ethers.provider.send("evm_mine", [])
  }

  async function getLastBlockTime() {
    const blockNumAfter = await ethers.provider.getBlockNumber();
    const blockAfter = await ethers.provider.getBlock(blockNumAfter);
    return blockAfter.timestamp;
  }

  describe("Public getter functions", function() {
    it("Should return chairman address", async function() {
      expect(await DAOVotingsInterface.chairman()).to.equal(Admin.address)
    })

    it("Should return minimumDuration", async function() {
      expect(await DAOVotingsInterface.minimumDuration()).to.equal(60*60*24*3)
    })

    it("Should return ERC20 address", async function() {
      expect(await DAOVotingsInterface.erc20address()).to.equal(ERC20address)
    })

    it("Should return minimum quorum value", async function() {
      expect(await DAOVotingsInterface.minimumQuorum()).to.equal("3000000000000000")
    })

    it("Should return current voting index '0' ", async function() {
      expect(await DAOVotingsInterface.getLastIndex()).to.equal("0")
    })
  })

  describe("setMinimumQuorum function", function() {
    it("Should throw error 'SenderDontHasRights' with args", async function() {
      expect(DAOVotingsInterface.connect(user1).setMinimumQuorum(100)).to.be.revertedWith(`SenderDontHasRights("${user1.address}")`)
    })

    it("Chairman or Admin can change minumumQuorum value", async function() {
      await DAOVotingsInterface.setMinimumQuorum(100)
      expect(await DAOVotingsInterface.minimumQuorum()).to.equal("100")
    })
  })

  describe("setERC20address function", function() {
    it("Should throw error 'SenderDontHasRights' with args", async function() {
      expect(DAOVotingsInterface.connect(user1).setERC20address(user1.address)).to.be.revertedWith(`SenderDontHasRights("${user1.address}")`)
    })

    it("Chairman or Admin can change ERC20 token address", async function() {
      await DAOVotingsInterface.setERC20address(user1.address)
      expect(await DAOVotingsInterface.erc20address()).to.equal(user1.address)
    })
  })

  describe("deposit function", function() {
    it("Anyone can deposit approved tokens to DAOVotings", async function() {
      await ExampleToken.connect(user1).approve(DAOVotingsInterface.address, 1000000000000000)
      await DAOVotingsInterface.connect(user1).deposit(1000000000000000)
      const info = await DAOVotingsInterface.voterInfo(user1.address)
      expect(ethers.utils.formatUnits(info[0],0)).to.be.equal("1000000000000000")
    })
  })


  describe("addProposal function", function() {
    it("Should throw error 'SenderDontHasRights' with args if sender is not Admin or Chairman", async function() {
      const iface = new ethers.utils.Interface(["function transfer(address to, uint256 amount)"])
      const callData = iface.encodeFunctionData('transfer',[user1.address,100])
      expect(DAOVotingsInterface.connect(user1).addProposal(
        "Give me 100 tokens",
        0,
        ERC20address,
        callData
      )).to.be.revertedWith(`SenderDontHasRights("${user1.address}")`)
    })

    it("Should add a new proposal voting with certain parameters", async function() {
      const iface = new ethers.utils.Interface(["function transfer(address to, uint256 amount)"])
      const callData = iface.encodeFunctionData('transfer',[user1.address,100])
      await DAOVotingsInterface.connect(Admin).addProposal(
        "Give me 100 tokens",
        259200,
        ERC20address,
        callData
      )
      const proposal = await DAOVotingsInterface.getProposal(1)

      const timestampAfter = await getLastBlockTime()

      expect(proposal[0]).to.be.equal("Give me 100 tokens")
      expect(proposal[3]).to.be.equal(`${259200 + timestampAfter}`)
      expect(proposal[4]).to.be.equal(ERC20address)
      expect(proposal[5]).to.be.equal(callData)
    })

    it("If duration is less then minimumDuration value, it would be set", async function() {
      const iface = new ethers.utils.Interface(["function transfer(address to, uint256 amount)"])
      const callData = iface.encodeFunctionData('transfer',[user1.address,100])
      await DAOVotingsInterface.connect(Admin).addProposal(
        "Give me 100 tokens",
        0,
        ERC20address,
        callData
      )
      const proposal = await DAOVotingsInterface.getProposal(1)
      const timestampAfter = await getLastBlockTime()
      expect(proposal[3]).to.be.equal(`${259200 + timestampAfter}`)
    })
  })

  describe("startChairmanElection function", function() {
    it("Should throw error 'SenderDontHasRights' with args", async function() {
      expect(DAOVotingsInterface.connect(user1).changeChairman(user1.address)).to.be.revertedWith("Must called throw proposal")
    })

    it("Admin can start election for a new Chairman, and it would change after finishProposal", async function() {
      await DAOVotingsInterface.startChairmanElection(user1.address, 259200)

      await ExampleToken.connect(user1).approve(DAOVotingsInterface.address, 1000000000000000)
      await DAOVotingsInterface.connect(user1).deposit(1000000000000000)
      await DAOVotingsInterface.connect(user1).vote(1, 1000000000000000, true)

      await ExampleToken.connect(user2).approve(DAOVotingsInterface.address, 1000000000000000)
      await DAOVotingsInterface.connect(user2).deposit(1000000000000000)
      await DAOVotingsInterface.connect(user2).vote(1, 1000000000000000, true)

      await ExampleToken.connect(Admin).approve(DAOVotingsInterface.address, 1000000000000000)
      await DAOVotingsInterface.connect(Admin).deposit(1000000000000000)
      await DAOVotingsInterface.connect(Admin).vote(1, 1000000000000000, true)

      await passDurationTime();
      
      await DAOVotingsInterface.connect(user2).finishProposal(1)

      expect(await DAOVotingsInterface.chairman()).to.equal(user1.address)
    })
  })

  describe("deposit function", function() {
    it("Anyone can deposit approved tokens", async function() {
      await ExampleToken.connect(user1).approve(DAOVotingsInterface.address, 1000000000000000)
      await DAOVotingsInterface.connect(user1).deposit(1000000000000000)

      const info = await DAOVotingsInterface.voterInfo(user1.address)
      expect(ethers.utils.formatUnits(info[0],0)).to.be.equal("1000000000000000")
    })
  })

  describe("vote function", function() {
    beforeEach(async function() {
      await DAOVotingsInterface.startChairmanElection(user1.address, 259200)

      await ExampleToken.connect(user1).approve(DAOVotingsInterface.address, 1000000000000000)
      await DAOVotingsInterface.connect(user1).deposit(1000000000000000)
      
      await ExampleToken.connect(user2).approve(DAOVotingsInterface.address, 1000000000000000)
      await DAOVotingsInterface.connect(user2).deposit(1000000000000000)
      
      await ExampleToken.connect(Admin).approve(DAOVotingsInterface.address, 1000000000000000)
      await DAOVotingsInterface.connect(Admin).deposit(1000000000000000)
    });

    it("Amount can not be more then voting power(deposited tokens) of voter", async function() {
      expect(DAOVotingsInterface.connect(user1).vote(1, 1000000000000000, true)).to.be.revertedWith("Not enough deposited tokens")
    })

    it("User can not vote in already ended votings", async function() {
      await ExampleToken.connect(TokenOwner).approve(DAOVotingsInterface.address, 1000000000000000)
      await DAOVotingsInterface.connect(TokenOwner).deposit(1000000000000000)

      await DAOVotingsInterface.connect(TokenOwner).vote(1, 1000000000000000, false)
      await DAOVotingsInterface.connect(user2).vote(1, 1000000000000000, true)
      await DAOVotingsInterface.connect(Admin).vote(1, 1000000000000000, true)
      
      await passDurationTime();
      await DAOVotingsInterface.connect(user2).finishProposal(1)

      expect(DAOVotingsInterface.connect(user1).vote(1, 1000000000000000, true)).to.be.revertedWith("Voting have been ended")
    })

    it("Deposit duration of user should be equal to the block.timestamp when deposit", async function() {
      const voterInfo = await DAOVotingsInterface.voterInfo(Admin.address)
      
      expect(+ethers.utils.formatUnits(voterInfo[1],0)).to.be.equal(await getLastBlockTime())
    })

    it("Deposit duration of user should be equal to the last voted proposal debating duration period", async function() {
      await DAOVotingsInterface.connect(user1).vote(1, 1000000000000000, true)
      const voterInfo = await DAOVotingsInterface.voterInfo(user1.address)
      const lastBlockTime = await getLastBlockTime()
      
      expect(+ethers.utils.formatUnits(voterInfo[1],0)).to.be.equal(259193 + lastBlockTime)
    })

    it("User can not vote twice at one poposal voting", async function() {
      await DAOVotingsInterface.connect(user1).vote(1, 1000000000000000, true)

      expect(DAOVotingsInterface.connect(user1).vote(1, 1000000000000000, true)).to.be.revertedWith("You have already voted")
    })

    it("If conditions are met, user can vote 'true' or 'false' in each proposals with all voting power", async function() {
      const iface = new ethers.utils.Interface(["function transfer(address to, uint256 amount)"])
      const callData = iface.encodeFunctionData('transfer',[user1.address,100])
      await DAOVotingsInterface.addProposal(
        "Give me 100 tokens",
        259200,
        ERC20address,
        callData
      )

      await DAOVotingsInterface.startChairmanElection(user1.address, 259200)
      await DAOVotingsInterface.connect(user1).vote(1, 1000000000000000, true)
      await DAOVotingsInterface.connect(user1).vote(2, 1000000000000000, true)

      expect(await DAOVotingsInterface.getVotes(1, user1.address)).to.be.equal("1000000000000000")
      expect(await DAOVotingsInterface.getVotes(2, user1.address)).to.be.equal("1000000000000000")
    })
  })

  describe("finishProposal function", function() {
    beforeEach(async function() {
      await DAOVotingsInterface.startChairmanElection(user1.address, 259200)

      const iface = new ethers.utils.Interface(["function transfer(address to, uint256 amount)"])
      const callData = iface.encodeFunctionData('transfer',[user1.address,100])
      await DAOVotingsInterface.addProposal(
        "Give me 100 tokens",
        259200,
        ERC20address,
        callData
      )

      await ExampleToken.connect(user1).approve(DAOVotingsInterface.address, 1000000000000000)
      await DAOVotingsInterface.connect(user1).deposit(1000000000000000)
      
      await ExampleToken.connect(user2).approve(DAOVotingsInterface.address, 1000000000000000)
      await DAOVotingsInterface.connect(user2).deposit(1000000000000000)
      
      await ExampleToken.connect(Admin).approve(DAOVotingsInterface.address, 1000000000000000)
      await DAOVotingsInterface.connect(Admin).deposit(1000000000000000)
      
    });

    it("Revert if debationg period didnt pass", async function() {
      expect(DAOVotingsInterface.connect(user1).finishProposal(1)).to.be.revertedWith("Debating period didnt pass")
    })

    it("Revert if proposal was already finished and called", async function() {
      await DAOVotingsInterface.connect(user1).vote(2, 1000000000000000, true)
      await DAOVotingsInterface.connect(user2).vote(2, 1000000000000000, true)
      await DAOVotingsInterface.connect(Admin).vote(2, 1000000000000000, true)

      await passDurationTime();
      await DAOVotingsInterface.connect(user2).finishProposal(2)

      expect(DAOVotingsInterface.connect(user2).finishProposal(2)).to.be.revertedWith("Proposal voting was already finished or not accepted")
    })

    it("Revert with custom error 'MinimalVotingQuorum(1, 2000000000000000)' if voting quorum is less then minimal", async function() {
      await DAOVotingsInterface.connect(user1).vote(2, 1000000000000000, true)
      await DAOVotingsInterface.connect(user2).vote(2, 1000000000000000, true)

      await passDurationTime();

      expect(DAOVotingsInterface.connect(user2).finishProposal(2)).to.be.revertedWith("MinimalVotingQuorum(2, 2000000000000000)")
    })

    it("If conditions are met proposal would be called with callData", async function() {
      await ExampleToken.connect(TokenOwner).transfer(DAOVotingsInterface.address, 100)

      await DAOVotingsInterface.connect(user1).vote(2, 1000000000000000, true)
      await DAOVotingsInterface.connect(user2).vote(2, 1000000000000000, true)
      await DAOVotingsInterface.connect(Admin).vote(2, 1000000000000000, true)

      await passDurationTime();
      await DAOVotingsInterface.connect(user2).finishProposal(2)

      expect(await ExampleToken.balanceOf(user1.address)).to.be.equal("100")
    })
  })

  describe("returnDeposit function", function() {
    beforeEach(async function() {
      await DAOVotingsInterface.startChairmanElection(user1.address, 259200)

      await ExampleToken.connect(user1).approve(DAOVotingsInterface.address, 1000000000000000)
      await DAOVotingsInterface.connect(user1).deposit(1000000000000000)
      
      await ExampleToken.connect(user2).approve(DAOVotingsInterface.address, 1000000000000000)
      await DAOVotingsInterface.connect(user2).deposit(1000000000000000)
    });

    it("Depositor can not return deposit if deposit duration time did not pass", async function() {
      await DAOVotingsInterface.connect(user1).vote(1, 1000000000000000, true)

      expect(DAOVotingsInterface.connect(user1).returnDeposit()).to.be.revertedWith("Deposit duration does not pass")
    })

    it("Depositor can return deposit if deposit duration time have passed", async function() {
      await DAOVotingsInterface.connect(user1).vote(1, 1000000000000000, true)

      await passDurationTime()
      await DAOVotingsInterface.connect(user1).returnDeposit()
      expect(await ExampleToken.balanceOf(user1.address)).to.be.equal("1000000000000000")
    })
  })

})