// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./GamblingToken.sol";

contract GamblingGame is VRFConsumerBaseV2, Ownable {
    VRFCoordinatorV2Interface COORDINATOR;
    GamblingToken public token;

    // Chainlink VRF configuration
    uint64 private subscriptionId;
    bytes32 private keyHash;
    uint32 private callbackGasLimit = 100000;
    uint16 private requestConfirmations = 3;
    uint32 private numWords = 1;

    // Game configuration
    uint256 public minBet;
    uint256 public maxBet;
    uint256 public houseEdge; // in basis points (1/100 of a percent)
    
    struct Bet {
        address player;
        uint256 amount;
        uint256 gameType;
        uint256 choice;
        bool resolved;
        bool won;
    }

    mapping(uint256 => Bet) public bets;
    mapping(address => uint256[]) public playerBets;

    event BetPlaced(address indexed player, uint256 indexed betId, uint256 amount, uint256 gameType, uint256 choice);
    event BetResolved(uint256 indexed betId, bool won, uint256 payout);
    event GameConfigUpdated(uint256 minBet, uint256 maxBet, uint256 houseEdge);

    constructor(
        address _vrfCoordinator,
        address _token,
        uint64 _subscriptionId,
        bytes32 _keyHash
    ) VRFConsumerBaseV2(_vrfCoordinator) Ownable(msg.sender) {
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        token = GamblingToken(_token);
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        
        minBet = 0.01 ether;
        maxBet = 100 ether;
        houseEdge = 250; // 2.5%
    }

    function placeBet(uint256 amount, uint256 gameType, uint256 choice) external returns (uint256) {
        require(amount >= minBet && amount <= maxBet, "Invalid bet amount");
        require(gameType < 3, "Invalid game type"); // 0: Coin Flip, 1: Dice Roll, 2: Number Guess
        
        // Validate choice based on game type
        if (gameType == 0) {
            require(choice < 2, "Invalid choice for coin flip");
        } else if (gameType == 1) {
            require(choice < 6, "Invalid choice for dice roll");
        } else if (gameType == 2) {
            require(choice < 100, "Invalid choice for number guess");
        }

        // Transfer tokens from player to contract
        require(token.transferFrom(msg.sender, address(this), amount), "Token transfer failed");

        // Request random number from Chainlink VRF
        uint256 requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            numWords
        );

        // Store bet details
        bets[requestId] = Bet({
            player: msg.sender,
            amount: amount,
            gameType: gameType,
            choice: choice,
            resolved: false,
            won: false
        });

        playerBets[msg.sender].push(requestId);

        emit BetPlaced(msg.sender, requestId, amount, gameType, choice);
        return requestId;
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        Bet storage bet = bets[requestId];
        require(!bet.resolved, "Bet already resolved");

        uint256 randomResult = randomWords[0];
        bool won = false;
        uint256 payout = 0;

        // Determine win/loss based on game type
        if (bet.gameType == 0) { // Coin Flip
            won = (randomResult % 2) == bet.choice;
            payout = won ? bet.amount * 198 / 100 : 0; // 1.98x payout (accounting for house edge)
        } else if (bet.gameType == 1) { // Dice Roll
            won = (randomResult % 6) == bet.choice;
            payout = won ? bet.amount * 594 / 100 : 0; // 5.94x payout
        } else if (bet.gameType == 2) { // Number Guess
            won = (randomResult % 100) == bet.choice;
            payout = won ? bet.amount * 9900 / 100 : 0; // 99x payout
        }

        bet.resolved = true;
        bet.won = won;

        if (won) {
            require(token.transfer(bet.player, payout), "Payout transfer failed");
        }

        emit BetResolved(requestId, won, payout);
    }

    function getPlayerBets(address player) external view returns (uint256[] memory) {
        return playerBets[player];
    }

    function getBetDetails(uint256 betId) external view returns (
        address player,
        uint256 amount,
        uint256 gameType,
        uint256 choice,
        bool resolved,
        bool won
    ) {
        Bet storage bet = bets[betId];
        return (bet.player, bet.amount, bet.gameType, bet.choice, bet.resolved, bet.won);
    }

    function updateGameConfig(
        uint256 _minBet,
        uint256 _maxBet,
        uint256 _houseEdge
    ) external onlyOwner {
        require(_minBet < _maxBet, "Invalid bet limits");
        require(_houseEdge <= 1000, "House edge too high"); // Max 10%
        
        minBet = _minBet;
        maxBet = _maxBet;
        houseEdge = _houseEdge;
        
        emit GameConfigUpdated(_minBet, _maxBet, _houseEdge);
    }

    function withdrawHouseBalance(uint256 amount) external onlyOwner {
        require(token.transfer(owner(), amount), "Withdrawal failed");
    }
} 