const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Gambling Platform", function () {
  let GamblingToken;
  let GamblingGame;
  let gamblingToken;
  let gamblingGame;
  let owner;
  let player;
  let vrfCoordinator;

  const MOCK_VRF_COORDINATOR = "0x0000000000000000000000000000000000000001";
  const MOCK_SUBSCRIPTION_ID = 1;
  const MOCK_KEY_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";

  beforeEach(async function () {
    [owner, player, vrfCoordinator] = await ethers.getSigners();

    // Deploy GamblingToken
    GamblingToken = await ethers.getContractFactory("GamblingToken");
    gamblingToken = await GamblingToken.deploy();
    await gamblingToken.waitForDeployment();

    // Deploy GamblingGame
    GamblingGame = await ethers.getContractFactory("GamblingGame");
    gamblingGame = await GamblingGame.deploy(
      MOCK_VRF_COORDINATOR,
      await gamblingToken.getAddress(),
      MOCK_SUBSCRIPTION_ID,
      MOCK_KEY_HASH
    );
    await gamblingGame.waitForDeployment();

    // Mint tokens to player
    const mintAmount = ethers.parseEther("100");
    await gamblingToken.mint(player.address, mintAmount);
  });

  describe("GamblingToken", function () {
    it("Should have correct name and symbol", async function () {
      expect(await gamblingToken.name()).to.equal("Gambling Token");
      expect(await gamblingToken.symbol()).to.equal("GAMB");
    });

    it("Should mint tokens correctly", async function () {
      const amount = ethers.parseEther("1");
      await gamblingToken.mint(player.address, amount);
      expect(await gamblingToken.balanceOf(player.address)).to.equal(amount.add(ethers.parseEther("100")));
    });

    it("Should mint NFTs when minting whole tokens", async function () {
      const amount = ethers.parseEther("1");
      await gamblingToken.mint(player.address, amount);
      const tokenId = await gamblingToken.minted() + 10000;
      expect(await gamblingToken.ownerOf(tokenId)).to.equal(player.address);
    });
  });

  describe("GamblingGame", function () {
    beforeEach(async function () {
      // Approve tokens for gambling
      await gamblingToken.connect(player).approve(
        await gamblingGame.getAddress(),
        ethers.parseEther("100")
      );
    });

    it("Should allow placing bets", async function () {
      const betAmount = ethers.parseEther("1");
      const gameType = 0; // Coin Flip
      const choice = 1; // Heads

      await expect(
        gamblingGame.connect(player).placeBet(betAmount, gameType, choice)
      ).to.emit(gamblingGame, "BetPlaced")
        .withArgs(player.address, expect.any(Number), betAmount, gameType, choice);
    });

    it("Should reject invalid bet amounts", async function () {
      const betAmount = ethers.parseEther("1000"); // More than player has
      const gameType = 0;
      const choice = 1;

      await expect(
        gamblingGame.connect(player).placeBet(betAmount, gameType, choice)
      ).to.be.revertedWith("Token transfer failed");
    });

    it("Should reject invalid game types", async function () {
      const betAmount = ethers.parseEther("1");
      const gameType = 3; // Invalid game type
      const choice = 1;

      await expect(
        gamblingGame.connect(player).placeBet(betAmount, gameType, choice)
      ).to.be.revertedWith("Invalid game type");
    });

    it("Should allow owner to update game config", async function () {
      const newMinBet = ethers.parseEther("0.1");
      const newMaxBet = ethers.parseEther("10");
      const newHouseEdge = 300; // 3%

      await expect(
        gamblingGame.updateGameConfig(newMinBet, newMaxBet, newHouseEdge)
      ).to.emit(gamblingGame, "GameConfigUpdated")
        .withArgs(newMinBet, newMaxBet, newHouseEdge);

      expect(await gamblingGame.minBet()).to.equal(newMinBet);
      expect(await gamblingGame.maxBet()).to.equal(newMaxBet);
      expect(await gamblingGame.houseEdge()).to.equal(newHouseEdge);
    });
  });
}); 