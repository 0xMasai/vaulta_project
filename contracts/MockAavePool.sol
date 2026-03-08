// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Mock Aave Pool (Auto-Yield Version)
/// @notice Simulates time-based yield accrual like Aave
contract MockAavePool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    /// @dev Yield rate in basis points (100 = 1% annually)
    uint256 public yieldBps;

    struct DepositInfo {
        uint256 principal;
        uint256 depositTime;
    }

    /// @dev Tracks deposits per vault
    mapping(address => DepositInfo) public deposits;

    event Supplied(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event YieldUpdated(uint256 newYieldBps);

    constructor(address _usdc, uint256 _yieldBps) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC address");

        usdc = IERC20(_usdc);
        yieldBps = _yieldBps;
    }

    /* ========== CORE FUNCTIONS ========== */

    /// @notice Supply USDC (called by Vault)
    function supply(
        address asset,
        uint256 amount,
        address,
        uint16
    ) external nonReentrant {
        require(asset == address(usdc), "Invalid asset");
        require(amount > 0, "Zero amount");

        usdc.safeTransferFrom(msg.sender, address(this), amount);

        DepositInfo storage info = deposits[msg.sender];

        // First update accrued balance before adding new deposit
        uint256 updatedBalance = balanceOf(msg.sender);

        info.principal = updatedBalance + amount;
        info.depositTime = block.timestamp;

        emit Supplied(msg.sender, amount);
    }

    /// @notice Withdraw USDC including accrued yield
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external nonReentrant returns (uint256) {
        require(asset == address(usdc), "Invalid asset");
        require(amount > 0, "Zero amount");

        uint256 currentBalance = balanceOf(msg.sender);
        require(currentBalance >= amount, "Insufficient balance");

        DepositInfo storage info = deposits[msg.sender];

        uint256 remaining = currentBalance - amount;

        info.principal = remaining;
        info.depositTime = block.timestamp;

        require(
            usdc.balanceOf(address(this)) >= amount,
            "Insufficient liquidity"
        );

        usdc.safeTransfer(to, amount);

        emit Withdrawn(msg.sender, amount);

        return amount;
    }

    /* ========== VIEW FUNCTIONS ========== */

    /// @notice Returns balance with accrued yield
    function balanceOf(address user) public view returns (uint256) {
        DepositInfo memory info = deposits[user];

        if (info.principal == 0) return 0;

        uint256 timeElapsed = block.timestamp - info.depositTime;

        // Annual yield
        uint256 yearlyYield = (info.principal * yieldBps) / 10000;

        // Linear time-based accrual
        uint256 accruedYield = (yearlyYield * timeElapsed) / 365 days;

        return info.principal + accruedYield;
    }

    /// @notice Total assets in pool
    function totalAssets() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    /* ========== ADMIN ========== */

    function setYieldBps(uint256 _bps) external onlyOwner {
        require(_bps <= 5000, "Yield too high"); // max 50% safeguard
        yieldBps = _bps;

        emit YieldUpdated(_bps);
    }
}