/* eslint-disable comma-dangle */
const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

const CONTRACT_NAME = 'Voting'
const SUPPLY = ethers.utils.parseEther('100000')
const DEPOSIT = ethers.utils.parseEther('1000')
const INPUT_DATA = ethers.utils.solidityPack(
  ['uint8', 'uint8', 'uint8'],
  [23, 45, 67]
)

describe('Voting', function () {
  let Voting, voting, Color, color, Token, token, dev, voter1, voter2, voter3

  beforeEach(async function () {
    ;[dev, voter1, voter2, voter3] = await ethers.getSigners()
    Voting = await ethers.getContractFactory(CONTRACT_NAME)
    voting = await Voting.connect(dev).deploy(SUPPLY)
    await voting.deployed()

    Color = await ethers.getContractFactory('Color')
    color = await Color.connect(dev).deploy(voting.address)
    await color.deployed()

    const tokenAddress = await voting.governanceTokenAddress()
    Token = await ethers.getContractFactory('GovernanceToken')
    token = await Token.attach(tokenAddress)

    await token.transfer(voter1.address, SUPPLY.div(10))
    await token.transfer(voter2.address, SUPPLY.div(10))
    await token.transfer(voter3.address, SUPPLY.div(10))
  })

  describe('Deployment', function () {
    it('should mint the supply to the owner [ERC777]', async function () {
      expect(await token.balanceOf(dev.address)).to.equal(SUPPLY.div(10).mul(7))
    })

    it('should set the default operator to Voting.sol [ERC777]', async function () {
      const operatorsTab = await token.defaultOperators()
      for (const elem of operatorsTab) {
        expect(elem, `${elem}`).to.equal(voting.address)
      }
    })

    it('should set Voting.sol as the owner of [Color.sol]', async function () {
      expect(await color.owner()).to.equal(voting.address)
    })
  })

  describe('Stake some token to make a proposition', function () {
    beforeEach(async function () {
      await voting.connect(voter1).deposit(DEPOSIT)
    })

    it('should allow user to stake token in the contract', async function () {
      expect(await voting.votesBalanceOf(voter1.address)).to.equal(DEPOSIT)
    })

    it('should allow user to withdraw their stake', async function () {
      expect(await voting.votesBalanceOf(voter1.address), 'deposited').to.equal(
        DEPOSIT
      )
      await voting.connect(voter1).withdraw(DEPOSIT)
      expect(await voting.votesBalanceOf(voter1.address), 'withdraw').to.equal(
        0
      )
    })

    it('should revert if user attempt to make a proposition without stake', async function () {
      await expect(
        voting.propose(color.address, 'signature', INPUT_DATA, 'proposition')
      ).to.be.revertedWith('Voting: not enouth token to propose something.')
    })

    it('should allow user to make a proposition', async function () {
      // get the timestamp for the call of propose()
      let proposeCall = await voting
        .connect(voter1)
        .propose(color.address, 'signature', INPUT_DATA, 'proposition')
      proposeCall = await proposeCall.wait()
      const proposeCallBlock = await proposeCall.events[0].getBlock()
      const timestamp = BigNumber.from(proposeCallBlock.timestamp.toString())

      // inspect the struct
      const proposalStruct = await voting.proposalById(1)
      expect(proposalStruct.status, 'status').to.equal(1)
      expect(proposalStruct.proposer, 'proposer').to.equal(voter1.address)
      expect(proposalStruct.target, 'target').to.equal(color.address)
      expect(proposalStruct.signature, 'signature').to.equal('signature')
      expect(proposalStruct.nbYes, 'nbYes').to.equal(BigNumber.from('0'))
      expect(proposalStruct.nbNo, 'nbNo').to.equal(BigNumber.from('0'))
      expect(proposalStruct.createdAt, 'createdAt').to.equal(timestamp)
      expect(proposalStruct.inputData, 'inputData').to.equal(INPUT_DATA)
      expect(proposalStruct.proposition, 'proposition').to.equal('proposition')
    })

    it('should emit corresponding events', async function () {
      await expect(voting.connect(voter1).deposit(DEPOSIT))
        .to.emit(voting, 'TokenStaked')
        .withArgs(voter1.address, DEPOSIT)

      await expect(
        voting
          .connect(voter1)
          .propose(color.address, 'signature', INPUT_DATA, 'proposition')
      )
        .to.emit(voting, 'ProposalCreated')
        .withArgs(voter1.address, 1)

      await expect(voting.connect(voter1).withdraw(DEPOSIT))
        .to.emit(voting, 'TokenUnstaked')
        .withArgs(voter1.address, DEPOSIT)
    })
  })

  describe('Vote for a proposition and see the resolution', function () {
    let voteCall
    let proposalState
    beforeEach(async function () {
      await voting.connect(voter1).deposit(DEPOSIT)
      await voting
        .connect(voter1)
        .propose(
          color.address,
          'setColor(uint8,uint8,uint8)',
          INPUT_DATA,
          'set the color #234623'
        )
      voteCall = await voting.connect(voter1).vote(1, 0)
      await voting.connect(voter2).vote(1, 1)
      proposalState = await voting.proposalById(1)
      // make a real proposition for color.sol
      // take the signature, input data, ...
    })

    it('should increment the vote count', async function () {
      expect(proposalState.nbYes.toString(), 'nbYes').to.equal(
        '1000000000000000000000'
      )
      expect(proposalState.nbNo.toString(), 'nbNo').to.equal('0')
    })

    it('should emit a HasVoted event', async function () {
      expect(voteCall)
        .to.emit(voting, 'HasVoted')
        .withArgs(voter1.address, 0, 1)
      expect(voting.connect(voter3).vote(1, 1))
        .to.emit(voting, 'HasVoted')
        .withArgs(voter3.address, 1, 1)
    })

    it('should revert if the proposal is not running', async function () {
      await expect(voting.connect(voter1).vote(2, 1)).to.be.revertedWith(
        'Voting: the proposal is not running.'
      )
    })

    it('should revert if the voter has voted', async function () {
      await expect(voting.connect(voter1).vote(1, 0)).to.be.revertedWith(
        'Voting: you already voted for this proposal.'
      )
    })

    it('should run the function', async function () {
      await ethers.provider.send('evm_increaseTime', [1210000]) // one week = 604800 second
      await ethers.provider.send('evm_mine')
      proposalState = await voting.proposalById(1)
      expect(proposalState.status, 'still running').to.equal(1)
      voteCall = await voting.connect(voter3).vote(1, 1)
      proposalState = await voting.proposalById(1)
      expect(proposalState.status, 'approved').to.equal(2)
      expect(await color.seeRed(), 'color red').to.equal(23) // REVERTED :(
    })
  })
})
