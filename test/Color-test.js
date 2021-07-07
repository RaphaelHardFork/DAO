/* eslint-disable comma-dangle */
const { expect } = require('chai')
const { ethers } = require('hardhat')

const CONTRACT_NAME = 'Color'

describe('Color', function () {
  let Color, color, dev, owner

  beforeEach(async function () {
    ;[dev, owner] = await ethers.getSigners()
    Color = await ethers.getContractFactory(CONTRACT_NAME)
    color = await Color.connect(dev).deploy(owner.address)
    await color.deployed()
  })

  describe('Deployment', function () {
    it('should set the owner', async function () {
      expect(await color.owner()).to.equal(owner.address)
    })
  })

  describe('Change the color', function () {
    beforeEach(async function () {
      await color.connect(owner).setColor(23, 45, 23)
    })

    it('should change the color', async function () {
      expect(await color.seeRed(), 'red').to.equal(23)
      expect(await color.seeGreen(), 'green').to.equal(45)
      expect(await color.seeBlue(), 'blue').to.equal(23)
    })

    it('should revert if its not the owner', async function () {
      await expect(color.connect(dev).setColor(34, 56, 54)).to.be.revertedWith(
        'Ownable:'
      )
    })
  })
})
