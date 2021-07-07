/* eslint-disable comma-dangle */
const { expect } = require('chai')
const { ethers } = require('hardhat')

const CONTRACT_NAME = 'Voting'
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
    Voting = await ethers.getContractFactory(CONTRACT_NAME)
    voting = await Voting.connect(dev).deploy(SUPPLY)
    await voting.deployed()

    Color = await ethers.getContractFactory('Color')
    color = await Color.connect(dev).deploy(voting.address)
    await color.deployed()
  })

  describe('ERC777 function', function () {
    it('should transfer token', async function () {
      /*
      COMMENT SE SERVIR DES FONCTIONS DE L'ERC777 ??
      */
      await voting.connect(dev).transfer(voter1.address, SUPPLY.div(10))
      expect(await voting.balanceOf(voter1.address)).to.equal(SUPPLY.div(10))
    })
  })
})
