// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract GamblingToken is IERC20, IERC721, Ownable {
    using Strings for uint256;

    string public name = "Gambling Token";
    string public symbol = "GAMB";
    uint8 public constant decimals = 18;

    uint256 public constant UNIT = 10**18;
    uint256 public constant MAX_SUPPLY = 10000 * UNIT;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(uint256 => address) internal _ownerOf;
    mapping(address => mapping(address => bool)) internal _operatorApprovals;
    mapping(uint256 => address) internal _tokenApprovals;

    uint256 public totalSupply;
    uint256 public minted;
    string public baseTokenURI;

    event TokenMinted(address indexed to, uint256 tokenId);
    event TokenBurned(address indexed from, uint256 tokenId);

    constructor() Ownable(msg.sender) {
        baseTokenURI = "https://api.gambling-token.com/token/";
    }

    function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
        return
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC20).interfaceId;
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _ownerOf[tokenId];
        require(owner != address(0), "Token does not exist");
        return owner;
    }

    function approve(address spender, uint256 amountOrTokenId) public returns (bool) {
        if (amountOrTokenId <= MAX_SUPPLY) {
            allowance[msg.sender][spender] = amountOrTokenId;
            emit Approval(msg.sender, spender, amountOrTokenId);
        } else {
            require(msg.sender == ownerOf(amountOrTokenId) || isApprovedForAll(ownerOf(amountOrTokenId), msg.sender), "Not token owner");
            _tokenApprovals[amountOrTokenId] = spender;
            emit Approval(ownerOf(amountOrTokenId), spender, amountOrTokenId);
        }
        return true;
    }

    function setApprovalForAll(address operator, bool approved) public {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) public view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function getApproved(uint256 tokenId) public view returns (address) {
        require(_ownerOf[tokenId] != address(0), "Token does not exist");
        return _tokenApprovals[tokenId];
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        return transferFrom(msg.sender, to, amount);
    }

    function transferFrom(address from, address to, uint256 amountOrTokenId) public returns (bool) {
        if (amountOrTokenId <= MAX_SUPPLY) {
            require(balanceOf[from] >= amountOrTokenId, "Insufficient balance");
            require(msg.sender == from || allowance[from][msg.sender] >= amountOrTokenId, "Not approved");

            if (allowance[from][msg.sender] != type(uint256).max) {
                allowance[from][msg.sender] -= amountOrTokenId;
            }

            _transfer(from, to, amountOrTokenId);
            emit Transfer(from, to, amountOrTokenId);
        } else {
            require(_isApprovedOrOwner(msg.sender, amountOrTokenId), "Not approved");
            require(ownerOf(amountOrTokenId) == from, "Not token owner");
            
            _transfer(from, to, UNIT);
            _ownerOf[amountOrTokenId] = to;
            delete _tokenApprovals[amountOrTokenId];
            
            emit Transfer(from, to, amountOrTokenId);
        }
        return true;
    }

    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        address owner = ownerOf(tokenId);
        return (spender == owner || isApprovedForAll(owner, spender) || getApproved(tokenId) == spender);
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "Transfer to zero address");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(from, to, amount);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        require(totalSupply + amount <= MAX_SUPPLY, "Exceeds max supply");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        uint256 newTokens = amount / UNIT;
        for (uint256 i = 0; i < newTokens; i++) {
            uint256 tokenId = minted + MAX_SUPPLY + 1;
            _ownerOf[tokenId] = to;
            minted++;
            emit TokenMinted(to, tokenId);
        }
        
        emit Transfer(address(0), to, amount);
    }

    function burn(uint256 amount) public {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        uint256 tokensToBurn = amount / UNIT;
        for (uint256 i = 0; i < tokensToBurn; i++) {
            uint256 tokenId = minted + MAX_SUPPLY;
            require(_ownerOf[tokenId] == msg.sender, "Not token owner");
            delete _ownerOf[tokenId];
            minted--;
            emit TokenBurned(msg.sender, tokenId);
        }
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Transfer(msg.sender, address(0), amount);
    }

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(_ownerOf[tokenId] != address(0), "Token does not exist");
        return string(abi.encodePacked(baseTokenURI, tokenId.toString()));
    }

    function setBaseURI(string memory newBaseURI) public onlyOwner {
        baseTokenURI = newBaseURI;
    }
} 