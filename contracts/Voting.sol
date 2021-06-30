//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";

// contracts: https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts
// docs: https://docs.openzeppelin.com/contracts/4.x/

contract Voting {
    using Counters for Counters.Counter;

    enum Vote {
        Yes,
        No
    }
    enum Status {
        Running,
        Approved,
        Rejected
    }
    struct Proposal {
        Status status;
        address author;
        uint256 nbYes;
        uint256 nbNo;
        uint256 createdAt;
        string proposition;
    }
    uint256 public constant TIME_LIMIT = 3 days;

    Counters.Counter private _id;
    mapping(uint256 => Proposal) private _proposals;
    mapping(address => mapping(uint256 => bool)) private _hasVote;

    function createProposal(string memory proposition_) public returns (uint256) {
        _id.increment();
        uint256 propositionId = _id.current();
        _proposals[propositionId] = Proposal({
            status: Status.Running,
            author: msg.sender,
            createdAt: block.timestamp,
            nbYes: 0,
            nbNo: 0,
            proposition: proposition_
        });
        return propositionId;
    }

    function vote(uint256 propositionId, Vote vote_) public returns (bool) {
        require(_proposals[propositionId].status == Status.Running, "Voting: the proposal is not running.");
        require(_hasVote[msg.sender][propositionId] == false, "Voting: you already voted for this proposal.");

        if (block.timestamp > _proposals[propositionId].createdAt + TIME_LIMIT) {
            if (_proposals[propositionId].nbYes > _proposals[propositionId].nbNo) {
                _proposals[propositionId].status = Status.Approved;
            } else {
                _proposals[propositionId].status = Status.Rejected;
            }
        } else {
            if (vote_ == Vote.Yes) {
                _proposals[propositionId].nbYes += 1;
            } else {
                _proposals[propositionId].nbNo += 1;
            }
        }

        _hasVote[msg.sender][propositionId] = true;
        // emit Event
        return true;
    }

    function proposalById(uint256 id) public view returns (Proposal memory) {
        return _proposals[id];
    }

    function hasVoteFor(address account, uint256 propositionId) public view returns (bool) {
        return _hasVote[account][propositionId];
    }
}
