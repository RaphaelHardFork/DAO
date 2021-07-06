# Decentralized autonomous organisation

## Hand made DAO

To create a **hand made DAO** we will use the [ERC777 token standard](https://github.com/OpenZeppelin/openzeppelin-contracts/tree/master/contracts/token/ERC777).

---

### **The governance token**

We basically use the contract from OpenZeppelin:

```js
//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC777/ERC777.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777.sol";

contract GovernanceToken is ERC777 {
    constructor(
        uint256 totalSupply_,
        address owner_,
        address[] memory defaultOperators_
    ) ERC777("GovernanceToken", "GVT", defaultOperators_) {
        _mint(owner_, totalSupply_, "", "");
    }
}
```

Here we can use either the ERC777 or the IERC777 to write this contract. So we set up the `total supply`, the `owner` and `defaults operators`.  
So at the deployment of this token we have to specify these three informations. **But we will use another contract to deploy this latter.**

---

### **The voting contract:**

This contract need to import several contract:

```js

//SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777.sol";
import "@openzeppelin/contracts/token/ERC777/IERC777Recipient.sol";
import "@openzeppelin/contracts/utils/introspection/IERC1820Registry.sol";
import "./GovernanceToken.sol";
```

**Counters.sol:** used to have unique ID for each proposals.  
**IERC777.sol:** used to have access to functions of an ERC777.  
**IERC777Recipient.sol:** needed to receive token in the contract (like ERC721).  
**IERC1820Registry.sol:** needed as a standard (see below).  
**GovernanceToken.sol:** it is our governance token.

We define two `enum` and one `struct` in the contract:

```c
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
        uint256 nbYes;
        uint256 nbNo;
        uint256 createdAt;
        address proposer;
        address target;
        bytes inputData;
        string signature;
        string proposition;
    }
    Counters.Counter private _id;

    {...}

}
```

We have an `enum` for the descision (yes or no) and one the status of the proposal, this latter start with an _Inactive_ status to prevent people to vote for an inexistant proposals.  
Then we have the `struct`, let's focus on this one:

**Proposal:**

- status: Inactive / Running / Approved / Rejected
- nbYes & nbNo: are set to count votes
- createdAt: save the date and hours of creation
- proposer: is the address of the proposer
- target: is the address of the contract to interact after the vote
- inputData: that are the datas needed to activate a function of a contract (compose the callData)
- signature: this the function to activate (compose the callData)
- proposition: this is the sentence corresponding to the proposition

We come back later on this `struct` to understand **Low Level Call**

We need to implement the ERC1820 interface to ... I don't know, such is life...

```c
    IERC1820Registry private _erc1820 = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
    bytes32 public constant TOKENS_RECIPIENT_INTERFACE_HASH = keccak256("ERC777TokensRecipient");

    {...}

    constructor() {
        _erc1820.setInterfaceImplementer(address(this), _TOKENS_RECIPIENT_INTERFACE_HASH, address(this));

        {...}
    }
```

We always use the address `0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24` and the hash `keccak256("ERC777TokensRecipient")` to set up the implementation.

In the constructor we set the `default operator` as the contract just deployed and deploy the `ERC777`:

```c
    IERC777 private _token;

    constructor(uint256 totalSupply_) {
        {...}

        address[] memory defaultOperators = new address[](1);
        defaultOperators[0] = address(this);
        _token = new GovernanceToken(totalSupply_, msg.sender, defaultOperators);
    }
```

Then we have to **override** the `tokensReceived` function:

```c
   function tokensReceived(
        address operator,
        address from,
        address to,
        uint256 amount,
        bytes calldata userData,
        bytes calldata operatorData
    ) external override {}
```

So far we only implement contracts we need to set up this DAO, now let's focus on features of our DAO:  
**Deposit and withdraw to initiate proposal:**

```c
    mapping(address => uint256) private _votesBalances;

    {...}

    function deposit(uint256 amount) public {
        _votesBalances[msg.sender] += amount;
        _gouverno.operatorSend(msg.sender, address(this), amount, "", "");
    }

    function withdraw(uint256 amount) public {
        require(_votesBalances[msg.sender] >= amount, "DAO: amount exceed balance");
        _votesBalances[msg.sender] -= amount;
        _gouverno.send(msg.sender, amount, "");
    }
```

We set up a `mapping` to save the voting power of each address. This voting power is used to prevent a **sybil attack** where a malicious agent create thousand of address to influence the vote direction.

For the function `propose` we need another `mapping` to save the Proposal `struct`:

```js
    uint256 public constant MIN_BALANCE_PROPOSE = 1000 * 10**18;
    mapping(uint256 => Proposal) private _proposals;

    {...}

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
```

And finally we have the `vote` function:

```c
    uint256 public constant TIME_LIMIT = 3 days;
    mapping(address => mapping(uint256 => bool)) private _hasVote;

    {...}

    event HasVoted(address indexed voter, Vote vote_, uint256 proposalId);

    {...}

    function vote(uint256 id, Vote vote_) public {
        require(_hasVote[msg.sender][id] == false, "DAO: Already voted");
        require(_proposals[id].status == Status.Running, "DAO: Not a running proposal");

        if (block.timestamp > _proposals[id].createdAt + TIME_LIMIT) {
            if (_proposals[id].nbYes > _proposals[id].nbNo) {
                _proposals[id].status = Status.Approved;
                Proposal memory proposal = _proposals[id];
                bytes memory callData;

                //Check ce if
                if (bytes(proposal.signature).length == 0) {
                    callData = proposal.callData;
                } else {
                    callData = abi.encodePacked(bytes4(keccak256(bytes(proposal.signature))), proposal.callData);
                }
                (bool success, bytes memory data) = (proposal.target).call(callData);
                require(success, "DAO: Transaction execution reverted.");
            } else {
                _proposals[id].status = Status.Rejected;
            }
        } else {
            if (vote_ == Vote.Yes) {
                _proposals[id].nbYes += _votesBalances[msg.sender];
            } else {
                _proposals[id].nbNo += _votesBalances[msg.sender];
            }
            _hasVote[msg.sender][id] = true;
        }
    }
```

TODO:

- use token in the voting process (nb token X nbYes/No) (done)
- governance via low level call for Color
- front for these contracts => governance for the background color
- registry erc 1820
- ERC777 explaination
