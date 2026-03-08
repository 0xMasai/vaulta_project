// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Mock USDC
/// @notice Test stablecoin for local/testnet DeFi simulations
contract MockUSDC is ERC20, Ownable {

    constructor() ERC20("Mock USDC", "mUSDC") Ownable(msg.sender) {}

    /// @notice Override decimals to match real USDC (6)
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Mint tokens (owner only)
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Optional burn function
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }

    /// @notice Optional faucet for testing (remove if not needed)
    function faucet(uint256 amount) external {
        require(amount <= 10_000 * 10**6, "Max 10k per call");
        _mint(msg.sender, amount);
    }
}