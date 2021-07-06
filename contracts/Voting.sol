//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";
import "@openzeppelin/contracts/utils/introspection/IERC1820Registry.sol";
import "./GovernanceToken.sol";

// contracts: https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts
// docs: https://docs.openzeppelin.com/contracts/4.x/

contract Voting is IERC777Recipient {
    using Counters for Counters.Counter;

    enum Vote {
        Yes,
        No
    }
    enum Status {
        Inactive,
        Running,
        Approved,
        Rejected
    }
    struct Proposal {
        Status status;
        address proposer;
        address target;
        string signature; // "function(address,address,uint256,bytes)" => bytes => bytes32 => bytes4
        uint256 nbYes;
        uint256 nbNo;
        uint256 createdAt;
        bytes inputData; //  ethers.utlis.solidityPack(["type","type",...],[value,value,...]) => bytes
        string proposition;
    }
    Counters.Counter private _id;

    IERC1820Registry private _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
    bytes32 public constant TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient");

    IERC777 private _token;
    mapping(uint256 => Proposal) private _proposals;
    mapping(address => mapping(uint256 => bool)) private _hasVote;
    mapping(address => uint256) private _votesBalances;

    uint256 public constant TIME_LIMIT = 3 days;
    uint256 public constant MIN_BALANCE_PROPOSE = 1000 * 10**18;

    event HasVoted(address indexed voter, Vote vote_, uint256 proposalId);

    constructor(uint256 totalSupply_) {
        _erc1820.setInterfaceImplementer(address(this), TOKENS_RECIPIENT_INTERFACE_HASH, address(this));
        address[] memory defaultOperators = new address[](1);
        defaultOperators[0] = address(this);
        _token = new GovernanceToken(totalSupply_, msg.sender, defaultOperators);
    }

    function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external override {}

    function deposit(uint256 amount) public {
        _votesBalances[msg.sender] += amount;
        _token.operatorSend(msg.sender, address(this), amount, "", "");
    }

    function withdraw(uint256 amount) public {
        require(_votesBalances[msg.sender] >= amount, "Voting: amount exeed balance");
        _votesBalances[msg.sender] -= amount;
        _token.send(msg.sender, amount, "");
    }

    function propose(
        address target_,
        string memory signature_,
        bytes memory callData_,
        string memory proposition_
    ) public returns (uint256) {
        require(_votesBalances[msg.sender] >= MIN_BALANCE_PROPOSE, "Voting: not enouth token to propose something.");
        _id.increment();
        uint256 proposalId = _id.current();
        _proposals[proposalId] = Proposal({
            status: Status.Running,
            proposer: msg.sender,
            target: target_,
            signature: signature_,
            inputData: callData_,
            createdAt: block.timestamp,
            nbYes: 0,
            nbNo: 0,
            proposition: proposition_
        });
        return proposalId;
    }

    function vote(uint256 proposalId, Vote vote_) public returns (bool) {
        require(_proposals[proposalId].status == Status.Running, "Voting: the proposal is not running.");
        require(_hasVote[msg.sender][proposalId] == false, "Voting: you already voted for this proposal.");

        if (block.timestamp > _proposals[proposalId].createdAt + TIME_LIMIT) {
            if (_proposals[proposalId].nbYes > _proposals[proposalId].nbNo) {
                _proposals[proposalId].status = Status.Approved;

                Proposal memory proposal = _proposals[proposalId];
                bytes memory callData;
                if (bytes(proposal.signature).length == 0) {
                    callData = proposal.inputData;
                } else {
                    callData = abi.encodePacked(bytes4(keccak256(bytes(proposal.signature))), proposal.inputData);
                }
                (bool success, bytes memory data) = (proposal.target).call(callData);
                require(success, "Voting: Transaction execution reverted");
            } else {
                _proposals[proposalId].status = Status.Rejected;
            }
        } else {
            if (vote_ == Vote.Yes) {
                _proposals[proposalId].nbYes += _votesBalances[msg.sender];
            } else {
                _proposals[proposalId].nbNo += _votesBalances[msg.sender];
            }
            _hasVote[msg.sender][proposalId] = true;
        }

        emit HasVoted(msg.sender, vote_, proposalId);
        return true;
    }

    function lastProposalId() public view returns (uint256) {
        return _id.current();
    }

    function proposalById(uint256 id) public view returns (Proposal memory) {
        return _proposals[id];
    }

    function hasVoteFor(address account, uint256 propositionId) public view returns (bool) {
        return _hasVote[account][propositionId];
    }

    function governanceTokenAddress() public view returns (address) {
        return address(_token);
    }

    function votesBalanceOf(address account) public view returns (uint256) {
        return _votesBalances[account];
    }
}
