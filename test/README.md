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

Now we will test the Voting.sol contract, this latter will deploy the ERC777 and use the Color.sol contract address to make a proposal. Let's go through some essentials unit test:
