# Testing DAO contracts

## ERC777, GovernanceToken.sol

We test the informations at the deployment:

- name
- symbol
- supply
- default operators

```js
const { expect } = require("chai");
const { ethers } = require("hardhat");

const CONTRACT_NAME = "GovernanceToken";

describe("GovernanceToken", function () {
  let GovernanceToken, governanceToken, dev, owner;

  const SUPPLY = ethers.utils.parseEther("100000");
  const ADDRESS_ZERO = ethers.constants.AddressZero;

  beforeEach(async function () {
    [dev, owner] = await ethers.getSigners();
    GovernanceToken = await ethers.getContractFactory(CONTRACT_NAME);
    governanceToken = await GovernanceToken.connect(dev).deploy(
      SUPPLY,
      dev.address,
      [dev.address]
    );
    await governanceToken.deployed();
  });

  it("should set the name & symbol", async function () {
    expect(await governanceToken.name(), "name").to.equal("GovernanceToken");
    expect(await governanceToken.symbol(), "symbol").to.equal("GVT");
  });

  it("should mint the supply to the owner", async function () {
    expect(await governanceToken.balanceOf(dev.address)).to.equal(SUPPLY);
  });

  it("should set the default operator", async function () {
    const operatorsTab = await governanceToken.defaultOperators();
    for (const elem of operatorsTab) {
      expect(elem, `${elem}`).to.equal(dev.address);
    }
  });
});
```

## The executed contract, Color.sol

We test the executed contract before the DAO one, to be sure that it's work.

```js
const { expect } = require("chai");
const { ethers } = require("hardhat");

const CONTRACT_NAME = "Color";

describe("Color", function () {
  let Color, color, dev, owner;

  beforeEach(async function () {
    [dev, owner] = await ethers.getSigners();
    Color = await ethers.getContractFactory(CONTRACT_NAME);
    color = await Color.connect(dev).deploy(owner.address);
    await color.deployed();
  });

  describe("Deployment", function () {
    it("should set the owner", async function () {
      expect(await color.owner()).to.equal(owner.address);
    });
  });

  describe("Change the color", function () {
    beforeEach(async function () {
      await color.connect(owner).setColor(23, 45, 23);
    });

    it("should change the color", async function () {
      expect(await color.seeRed(), "red").to.equal(23);
      expect(await color.seeGreen(), "green").to.equal(45);
      expect(await color.seeBlue(), "blue").to.equal(23);
    });

    it("should revert if its not the owner", async function () {
      await expect(color.connect(dev).setColor(34, 56, 54)).to.be.revertedWith(
        "Ownable:"
      );
    });
  });
});
```

## The DAO contract, Voting.sol

Now we will test the Voting.sol contract, this latter will deploy the ERC777 and use the `Color.sol` contract address to make a proposal. Let's go through some essentials unit test:

### Use the ERC777 functions

After we have deployed the `Color.sol` and the `Voting.sol` contracts we have to get the ERC777 token contracts:

```js
const { expect } = require('chai')
const { ethers } = require('hardhat')

const SUPPLY = ethers.utils.parseEther('100000')

describe('Voting', function () {
  let Voting,
    voting,
    Color,
    color,
    Token,
    token,
    dev,
    owner,
    voter1,
    voter2,
    voter3

  beforeEach(async function () {
    ;[dev, owner, voter1, voter2, voter3] = await ethers.getSigners()

    // [1]
    Voting = await ethers.getContractFactory('Voting')
    voting = await Voting.connect(dev).deploy(SUPPLY)
    await voting.deployed()

    Color = await ethers.getContractFactory('Color')
    color = await Color.connect(dev).deploy(voting.address)
    await color.deployed()

    // [2]
    const tokenAddress = await voting.governanceTokenAddress()
    Token = await ethers.getContractFactory('GovernanceToken')
    token = await Token.attach(tokenAddress)
  })

  describe('ERC777 function', function () {
    it('should transfer token', async function () {

      // [3]
      await token.connect(dev).transfer(voter1.address, SUPPLY.div(10))
      expect(await token.balanceOf(voter1.address)).to.equal(SUPPLY.div(10))
    })
  })

  {...}
})
```

This test is here to see how we get access to functions of the ERC777 deployed by the `Voting.sol`:

- **[1]** Deploy the `Voting.sol` contract.
- **[2]** Get the address of the token contract and attach it.
- **[3]** Use the token contract to execute function like `transfer`.

Here we see that we also deploy `Color.sol`

### Testing the deployment of `Voting.sol`

We check all parameters input in the constructor of `Voting.sol`, the supply, the default operator of the ERC777 and the owner of `Color.sol`.

```js
describe("Deployment", function () {
  it("should mint the supply to the owner [ERC777]", async function () {
    expect(await token.balanceOf(dev.address)).to.equal(SUPPLY);
  });

  it("should set the default operator to Voting.sol [ERC777]", async function () {
    const operatorsTab = await token.defaultOperators();
    for (const elem of operatorsTab) {
      expect(elem, `${elem}`).to.equal(voting.address);
    }
  });

  it("should set Voting.sol as the owner of [Color.sol]", async function () {
    expect(await color.owner()).to.equal(voting.address);
  });
});
```

### Testing the make a proposition function

```js
describe("Stake some token to make a proposition", function () {
  const DEPOSIT = ethers.utils.parseEther("1000");
  const INPUT_DATA = ethers.utils.solidityPack(
    ["uint8", "uint8", "uint8"],
    [23, 45, 67]
  );
  beforeEach(async function () {
    await token.transfer(voter1.address, SUPPLY.div(10));
    await token.transfer(voter2.address, SUPPLY.div(10));
    await token.transfer(voter3.address, SUPPLY.div(10));
  });

  it("should allow user to stake token in the contract", async function () {
    await voting.connect(voter1).deposit(DEPOSIT);
    expect(await voting.votesBalanceOf(voter1.address)).to.equal(DEPOSIT);
  });

  it("should allow user to withdraw their stake", async function () {
    await voting.connect(voter1).deposit(DEPOSIT);
    expect(await voting.votesBalanceOf(voter1.address), "deposited").to.equal(
      DEPOSIT
    );
    await voting.connect(voter1).withdraw(DEPOSIT);
    expect(await voting.votesBalanceOf(voter1.address), "withdraw").to.equal(0);
  });

  it("should revert if user attempt to make a proposition without stake", async function () {
    await expect(
      voting.propose(color.address, "signature", INPUT_DATA, "proposition")
    ).to.be.revertedWith("Voting: not enouth token to propose something.");
  });

  it("should allow user to make a proposition", async function () {
    await voting.connect(voter1).deposit(DEPOSIT);

    // get the timestamp for the call of propose()
    let proposeCall = await voting
      .connect(voter1)
      .propose(color.address, "signature", INPUT_DATA, "proposition");
    proposeCall = await proposeCall.wait();
    const proposeCallBlock = await proposeCall.events[0].getBlock();
    const timestamp = BigNumber.from(proposeCallBlock.timestamp.toString());

    // inspect the struct
    const proposalStruct = await voting.proposalById(1);
    expect(proposalStruct.status, "status").to.equal(1);
    expect(proposalStruct.proposer, "proposer").to.equal(voter1.address);
    expect(proposalStruct.target, "target").to.equal(color.address);
    expect(proposalStruct.signature, "signature").to.equal("signature");
    expect(proposalStruct.nbYes, "nbYes").to.equal(BigNumber.from("0"));
    expect(proposalStruct.nbNo, "nbNo").to.equal(BigNumber.from("0"));
    expect(proposalStruct.createdAt, "createdAt").to.equal(timestamp);
    expect(proposalStruct.inputData, "inputData").to.equal(INPUT_DATA);
    expect(proposalStruct.proposition, "proposition").to.equal("proposition");
  });

  it("should emit corresponding events", async function () {
    await expect(voting.connect(voter1).deposit(DEPOSIT))
      .to.emit(voting, "TokenStaked")
      .withArgs(voter1.address, DEPOSIT);

    await expect(
      voting
        .connect(voter1)
        .propose(color.address, "signature", INPUT_DATA, "proposition")
    )
      .to.emit(voting, "ProposalCreated")
      .withArgs(voter1.address, 1);

    await expect(voting.connect(voter1).withdraw(DEPOSIT))
      .to.emit(voting, "TokenUnstaked")
      .withArgs(voter1.address, DEPOSIT);
  });
});
```

### Problems with testing the contract

CAREFUL: a proposer can create a proposal and then withdraw his stake amount!!
