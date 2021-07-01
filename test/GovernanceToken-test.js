/* eslint-disable no-unused-vars */
const { expect } = require('chai')
const { ethers } = require('hardhat')

// some tests: https://github.com/RaphaelHardFork/ico-hardhat

const CONTRACT_NAME = 'GovernanceToken'

describe('GovernanceToken', function () {
  let GovernanceToken, governanceToken, dev, owner

  const SUPPLY = ethers.utils.parseEther('100000')
  const ADDRESS_ZERO = ethers.constants.AddressZero

  beforeEach(async function () {
    ;[dev, owner] = await ethers.getSigners()
    GovernanceToken = await ethers.getContractFactory(CONTRACT_NAME)
    governanceToken = await GovernanceToken.connect(dev).deploy(
      SUPPLY,
      dev.address,
      [dev.address]
    )
    await governanceToken.deployed()
  })

  it('should set the name', async function () {
    expect(await governanceToken.name()).to.equal('GovernanceToken')
  })
})
