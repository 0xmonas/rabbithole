// File: RabbitHole.sol


// author: @0xmonas
pragma solidity ^0.8.20;







contract RabbitHole is ERC721, ERC2981, Ownable {
    using Counters for Counters.Counter;
    using Strings for uint256;

    Counters.Counter private _tokenIds;
    uint256 public constant MAX_SUPPLY = 1000;
    uint256 public constant MAX_SIZE = 1000;
    uint256 public constant MIN_SIZE = 1;
    uint256 public constant DAILY_COOLDOWN = 1 days;

    struct CircleData {
        uint256 size;
        uint256 lastGrowTime;
        uint256 lastShrinkTime;
    }

    mapping(uint256 => CircleData) public circleData;
    mapping(address => bool) public hasMinted;
    mapping(uint256 => string) private _specialMetadata;

    event CircleGrown(uint256 tokenId, uint256 newSize);
    event CircleShrunk(uint256 tokenId, uint256 newSize);
    event CirclesMerged(uint256[] mergedTokenIds, uint256 newTokenId, uint256 remainderTokenId);
    event SpecialMetadataSet(uint256 tokenId, string metadata);

    constructor(address initialOwner) ERC721("Rabbit Hole", "O") Ownable(initialOwner) {
        _setDefaultRoyalty(initialOwner, 100); // 100 = 1%
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    function mint() public {
        require(!hasMinted[msg.sender], "Address has already minted");
        require(_tokenIds.current() < MAX_SUPPLY, "Max supply reached");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _safeMint(msg.sender, newTokenId);
        
        circleData[newTokenId] = CircleData({
            size: MIN_SIZE,
            lastGrowTime: 0,
            lastShrinkTime: 0
        });

        hasMinted[msg.sender] = true;
    }

    function grow(uint256 tokenId) public {
        require(_exists(tokenId), "Token does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(block.timestamp >= circleData[tokenId].lastGrowTime + DAILY_COOLDOWN, "Daily grow already used");
        require(circleData[tokenId].size < MAX_SIZE, "Circle has reached maximum size");

        CircleData storage data = circleData[tokenId];
        data.size += 1;
        data.lastGrowTime = block.timestamp;

        emit CircleGrown(tokenId, data.size);
    }

    function shrink(uint256 tokenId) public {
        require(_exists(tokenId), "Token does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(block.timestamp >= circleData[tokenId].lastShrinkTime + DAILY_COOLDOWN, "Daily shrink already used");
        require(circleData[tokenId].size > MIN_SIZE, "Circle is at minimum size");

        CircleData storage data = circleData[tokenId];
        data.size -= 1;
        data.lastShrinkTime = block.timestamp;

        emit CircleShrunk(tokenId, data.size);
    }

    function mergeTokens(uint256[] memory tokenIds) public {
        require(tokenIds.length > 1, "Must merge at least two tokens");
        
        uint256 totalSize = 0;
        uint256 lastGrowTime = 0;
        uint256 lastShrinkTime = 0;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(_exists(tokenIds[i]), "Token does not exist");
            require(ownerOf(tokenIds[i]) == msg.sender, "Must own all tokens");
            CircleData memory data = circleData[tokenIds[i]];
            totalSize += data.size;
            lastGrowTime = (data.lastGrowTime > lastGrowTime) ? data.lastGrowTime : lastGrowTime;
            lastShrinkTime = (data.lastShrinkTime > lastShrinkTime) ? data.lastShrinkTime : lastShrinkTime;
        }
        
        uint256 newTokenId = _createMergedToken(
            totalSize > MAX_SIZE ? MAX_SIZE : totalSize,
            lastGrowTime,
            lastShrinkTime
        );
        uint256 remainderTokenId = 0;

        if (totalSize > MAX_SIZE) {
            uint256 remainderSize = totalSize - MAX_SIZE;
            if (remainderSize > 0) {
                remainderTokenId = _createMergedToken(remainderSize, lastGrowTime, lastShrinkTime);
            }
        }

        for (uint256 i = 0; i < tokenIds.length; i++) {
            _burnToken(tokenIds[i]);
        }

        emit CirclesMerged(tokenIds, newTokenId, remainderTokenId);
    }

    function _createMergedToken(uint256 size, uint256 lastGrowTime, uint256 lastShrinkTime) private returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _safeMint(msg.sender, newTokenId);

        circleData[newTokenId] = CircleData({
            size: size,
            lastGrowTime: lastGrowTime,
            lastShrinkTime: lastShrinkTime
        });

        return newTokenId;
    }

    function setSpecialMetadata(uint256 tokenId, string memory newMetadata) public onlyOwner {
        require(_exists(tokenId), "Token does not exist");
        require(circleData[tokenId].size == MAX_SIZE, "Token is not at maximum size");
        _specialMetadata[tokenId] = newMetadata;
        emit SpecialMetadataSet(tokenId, newMetadata);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        
        if (bytes(_specialMetadata[tokenId]).length > 0) {
            return _specialMetadata[tokenId];
        }
        
        CircleData memory data = circleData[tokenId];
        string memory svg = generateSVG(data.size);
        
        string memory json = Base64.encode(
            bytes(string(
                abi.encodePacked(
                    '{"name": "rh #', tokenId.toString(), 
                    '", "description": "Which way? Which way?", ',
                    '"attributes": [',
                    '{"trait_type": "Size", "value": "', data.size.toString(), '"}',
                    '], "image": "data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
                )
            ))
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

function generateSVG(uint256 size) internal pure returns (string memory) {
    uint256 radius = size / 2;
    return string(
        abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">',
            '<rect width="1000" height="1000" fill="white"/>',
            '<circle cx="500" cy="500" r="', radius.toString(), 
            '" fill="black" stroke="black" stroke-width="2"/>',
            '</svg>'
            )
        );
    }

    function _burnToken(uint256 tokenId) internal {
        _burn(tokenId);
        delete circleData[tokenId];
        delete _specialMetadata[tokenId];
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

# RabbitHole Smart Contract Documentation

## Contract Overview

**Contract Name:** RabbitHole  
**Author:** @0xmonas  
**Solidity Version:** ^0.8.20  
**License:** Not specified  
**Inheritance:** ERC721, ERC2981, Ownable  

**Contract Address:** `0xCA38813D69409E4E50F1411A0CAB2570E570C75A`  
**Network:** Shape L2 (Chain ID: 360)  

## Constants

```solidity
uint256 public constant MAX_SUPPLY = 1000;    // Maximum number of NFTs
uint256 public constant MAX_SIZE = 1000;      // Maximum circle size
uint256 public constant MIN_SIZE = 1;         // Minimum circle size  
uint256 public constant DAILY_COOLDOWN = 1 days; // 24 hours between actions
```

## Data Structures

### CircleData Struct
```solidity
struct CircleData {
    uint256 size;           // Current size of the circle
    uint256 lastGrowTime;   // Timestamp of last grow action
    uint256 lastShrinkTime; // Timestamp of last shrink action
}
```

## State Variables

- `mapping(uint256 => CircleData) public circleData` - Stores circle data for each token
- `mapping(address => bool) public hasMinted` - Tracks which addresses have minted
- `mapping(uint256 => string) private _specialMetadata` - Custom metadata for size 1000 tokens

## Events

```solidity
event CircleGrown(uint256 tokenId, uint256 newSize);
event CircleShrunk(uint256 tokenId, uint256 newSize);
event CirclesMerged(uint256[] mergedTokenIds, uint256 newTokenId, uint256 remainderTokenId);
event SpecialMetadataSet(uint256 tokenId, string metadata);
```

## Public Functions

### mint()
```solidity
function mint() public
```
- **Purpose:** Mint a new circle NFT
- **Requirements:** 
  - Address hasn't minted before
  - Max supply not reached
- **Initial State:** Creates circle with size 1, no previous action timestamps
- **Access:** Public (one per address)

### grow(uint256 tokenId)
```solidity
function grow(uint256 tokenId) public
```
- **Purpose:** Increase circle size by 1
- **Requirements:**
  - Token exists
  - Caller owns the token
  - Daily cooldown has passed since last grow
  - Circle size < MAX_SIZE (1000)
- **Effects:** Increments size, updates lastGrowTime
- **Access:** Token owner only

### shrink(uint256 tokenId)
```solidity
function shrink(uint256 tokenId) public  
```
- **Purpose:** Decrease circle size by 1
- **Requirements:**
  - Token exists
  - Caller owns the token
  - Daily cooldown has passed since last shrink
  - Circle size > MIN_SIZE (1)
- **Effects:** Decrements size, updates lastShrinkTime
- **Access:** Token owner only

### mergeTokens(uint256[] memory tokenIds)
```solidity
function mergeTokens(uint256[] memory tokenIds) public
```
- **Purpose:** Combine multiple tokens into one or two new tokens
- **Requirements:**
  - At least 2 tokens to merge
  - All tokens exist and owned by caller
- **Logic:**
  - Sums all token sizes
  - Creates new token with min(totalSize, MAX_SIZE)
  - If totalSize > MAX_SIZE, creates remainder token
  - Burns all input tokens
  - Preserves most recent action timestamps
- **Access:** Token owner only

## Owner-Only Functions

### setSpecialMetadata(uint256 tokenId, string memory newMetadata)
```solidity
function setSpecialMetadata(uint256 tokenId, string memory newMetadata) public onlyOwner
```
- **Purpose:** Set custom metadata for maximum size tokens
- **Requirements:**
  - Token exists
  - Token size equals MAX_SIZE (1000)
- **Effects:** Stores custom metadata URI
- **Access:** Contract owner only

## View Functions

### tokenURI(uint256 tokenId)
```solidity
function tokenURI(uint256 tokenId) public view override returns (string memory)
```
- **Purpose:** Generate token metadata (on-chain)
- **Logic:**
  - Returns special metadata if set
  - Otherwise generates dynamic SVG-based metadata
  - Includes size as trait
- **Format:** Base64-encoded JSON with embedded SVG

### generateSVG(uint256 size)
```solidity
function generateSVG(uint256 size) internal pure returns (string memory)
```
- **Purpose:** Generate SVG representation of circle
- **Logic:** Creates circle with radius = size/2, centered in 1000x1000 viewport
- **Style:** Black circle on white background

## Internal Functions

### _createMergedToken(uint256 size, uint256 lastGrowTime, uint256 lastShrinkTime)
- **Purpose:** Create new token during merge operation
- **Access:** Internal only

### _burnToken(uint256 tokenId)  
- **Purpose:** Burn token and clean up all associated data
- **Access:** Internal only

## Security Features

1. **Ownership Validation:** All actions require token ownership
2. **Cooldown System:** Prevents spam with 24-hour delays
3. **Size Constraints:** Enforces min/max size limits
4. **Single Mint:** Each address can only mint once
5. **Supply Cap:** Limited to 1000 total NFTs

## Gas Optimization Notes

- Uses `Counters` library for token ID management
- Efficient data packing in CircleData struct
- Batch operations in mergeTokens function
- On-chain SVG generation (no external dependencies)

## Integration Notes

### Missing Helper Functions
⚠️ **Important:** The contract does NOT include a `tokensOfOwner(address)` function commonly used by dApps to enumerate user tokens. This must be implemented separately or queried via events.

### Royalty Support
- Implements ERC2981 standard
- Set to 1% (100 basis points) to contract owner
- Automatically configured in constructor

---

**Last Updated:** 2025-01-27  
**Contract Analysis:** Complete