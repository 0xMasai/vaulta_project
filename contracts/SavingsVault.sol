// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IPool {
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);

    function balanceOf(address user) external view returns (uint256);
}

contract SavingsVault is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    IPool public immutable aavePool;

    mapping(address => uint256) public userShares;
    uint256 public totalShares;

    event Deposited(address indexed user, uint256 assets, uint256 shares);
    event Withdrawn(address indexed user, uint256 assets, uint256 shares);
    event VaultPaused();
    event VaultUnpaused();

    constructor(
        address _usdc,
        address _aavePool
    ) Ownable(msg.sender) {
        require(_usdc != address(0), "Invalid USDC");
        require(_aavePool != address(0), "Invalid Pool");

        usdc = IERC20(_usdc);
        aavePool = IPool(_aavePool);

        // Approve pool once
        usdc.approve(_aavePool, type(uint256).max);
    }

    /* ========== CORE LOGIC ========== */

    function deposit(uint256 assets)
        external
        nonReentrant
        whenNotPaused
    {
        require(assets > 0, "Zero assets");

        uint256 shares = _convertToShares(assets);
        require(shares > 0, "Zero shares");

        // Pull USDC from user
        usdc.safeTransferFrom(msg.sender, address(this), assets);

        // Supply to pool
        aavePool.supply(address(usdc), assets, address(this), 0);

        // Mint shares
        userShares[msg.sender] += shares;
        totalShares += shares;

        emit Deposited(msg.sender, assets, shares);
    }

    /// Withdraw is intentionally NOT blocked by pause
    /// Users should always be able to exit during depeg
   function withdrawAssets(uint256 assets)
    external
    nonReentrant
    {
        require(shareAmount > 0, "Zero shares");
        require(userShares[msg.sender] >= shareAmount, "Insufficient shares");

        uint256 assets = _convertToAssets(shareAmount);
        require(assets > 0, "Zero assets");

        // Burn shares
        userShares[msg.sender] -= shareAmount;
        totalShares -= shareAmount;

        // Withdraw from pool
        uint256 withdrawn = aavePool.withdraw(
            address(usdc),
            assets,
            address(this)
        );

        require(withdrawn >= assets, "Unexpected shortfall");

        // Transfer to user
        usdc.safeTransfer(msg.sender, withdrawn);

        emit Withdrawn(msg.sender, withdrawn, shareAmount);
    }

    /* ========== VIEW FUNCTIONS ========== */

    /// Returns vault-owned assets only
    function totalAssets() public view returns (uint256) {
        return aavePool.balanceOf(address(this));
    }

    function balanceOf(address user) public view returns (uint256) {
        return _convertToAssets(userShares[user]);
    }

    /* ========== SHARE MATH ========== */

    function _convertToShares(uint256 assets)
        internal
        view
        returns (uint256)
    {
        uint256 _totalAssets = totalAssets();

        if (totalShares == 0 || _totalAssets == 0) {
            return assets;
        }

        return (assets * totalShares) / _totalAssets;
    }

    function _convertToAssets(uint256 shares)
        internal
        view
        returns (uint256)
    {
        uint256 _totalAssets = totalAssets();

        if (totalShares == 0 || _totalAssets == 0) {
            return shares;
        }

        return (shares * _totalAssets) / totalShares;
    }

    /* ========== ADMIN ========== */

    function pause() external onlyOwner {
        _pause();
        emit VaultPaused();
    }

    function unpause() external onlyOwner {
        _unpause();
        emit VaultUnpaused();
    }
}