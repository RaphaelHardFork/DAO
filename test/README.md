# Testing DAO contracts

## ERC777 Governance Token

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
