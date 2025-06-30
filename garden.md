pragma solidity ^0.8.20;

interface rhi { 

    struct CircleData {
        uint256 size;
        uint256 lastGrowTime;
        uint256 lastShrinkTime;
    }

    function circleData(uint256 _index) external view returns (CircleData memory);
    function ownerOf(uint256 tokenId) external view returns (address);
    function balanceOf(address owner) external view returns (uint256);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function approve(address to, uint256 tokenId) external;
    function grow(uint256 tokenId) external;

}

/**
 * @title ERC-721 token receiver interface
 * @dev Interface for any contract that wants to support safeTransfers
 * from ERC-721 asset contracts.
 */
interface IERC721Receiver {
    /**
     * @dev Whenever an {IERC721} `tokenId` token is transferred to this contract via {IERC721-safeTransferFrom}
     * by `operator` from `from`, this function is called.
     *
     * It must return its Solidity selector to confirm the token transfer.
     * If any other value is returned or the interface is not implemented by the recipient, the transfer will be
     * reverted.
     *
     * The selector can be obtained in Solidity with `IERC721Receiver.onERC721Received.selector`.
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

contract rh_garden {
    rhi rh = rhi(0xca38813d69409E4E50F1411A0CAb2570e570c75a);

    mapping (address => uint256[]) public seeds;

    /**
     * Input: _max sets max token ID to check
     * Result: loops through all token IDs owned by sender
     *         and sends them to garden contract (this)
     *         approves owner for emergency resend, and
     *         saves which tokens they sent this way...
     */
    function plant_seeds(uint256 _max) public {
        require(rh.balanceOf(msg.sender) > 0, "You have no RH tokens in your wallet.");        
        // _max sets upper bound for loop
        for (uint i = 0; i <= _max; i++) {
            try rh.ownerOf(i) returns (address _owner) {
                if (_owner == msg.sender) {              
                    // let's plant the hole in the garden
                    rh.safeTransferFrom(msg.sender, address(this), i);
                    // only approve for each token individually
                    rh.approve(msg.sender, i); // just in case!
                    // let's keep track of seeds for sender
                    seeds[msg.sender].push(i);
                }
            } catch {
                continue;
            }            
        }        
    }

    /**
     * Result: loops through saved token IDs sent by prior owner
     *         and sends these back if possible
     */
    function uproot() public {
        require(seeds[msg.sender].length > 0, "No planted RH tokens found.");
        for (uint i = 0; i < seeds[msg.sender].length; i++) {
            // send it back to owner; should be individually approved token
            if (rh.ownerOf(seeds[msg.sender][i]) == address(this)) {
                rh.safeTransferFrom(address(this), msg.sender, seeds[msg.sender][i]);
            }            
        }
        delete seeds[msg.sender];
    }

    /**
     * Input: _max sets max token ID to check
     * Result: grows RH tokens that have waited long enough
     */
    function work_garden(uint256 _max) public {
        // _max sets upper bound for loop
        for (uint i = 0; i <= _max; i++) {
            try rh.ownerOf(i) returns (address _owner) {
                if (_owner == address(this)) { // contract own it?      
                    // is it beyond a day? let's check
                    if (block.timestamp - rh.circleData(i).lastGrowTime > 1 days) {
                        rh.grow(i);
                    }
                }
            } catch {
                continue;
            }            
        }        
    }

    /**
     * Note: ERC-721 standard for safe transfer to contract:
     * Has to return selector from interface to be approved when receiving
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
    
}
