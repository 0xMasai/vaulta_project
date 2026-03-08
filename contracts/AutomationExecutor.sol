// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISavingsVault {
    function pause() external;
    function unpause() external;
    function paused() external view returns (bool);
}

interface IPriceFeed {
    function latestRoundData()
        external
        view
        returns (
            uint80,
            int256 answer,
            uint256,
            uint256 updatedAt,
            uint80
        );
}

contract AutomationExecutor {
    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/

    event VaultPaused(uint256 price);
    event VaultUnpaused(uint256 price);

    /*//////////////////////////////////////////////////////////////
                                STORAGE
    //////////////////////////////////////////////////////////////*/

    ISavingsVault public immutable vault;
    IPriceFeed public immutable priceFeed;

    uint256 public immutable pausePrice;    // e.g., 0.985 * 1e8
    uint256 public immutable unpausePrice;  // e.g., 0.997 * 1e8

    /*//////////////////////////////////////////////////////////////
                                CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _vault,
        address _priceFeed,
        uint256 _pausePrice,
        uint256 _unpausePrice
    ) {
        require(_vault != address(0), "Invalid vault");
        require(_priceFeed != address(0), "Invalid price feed");

        vault = ISavingsVault(_vault);
        priceFeed = IPriceFeed(_priceFeed);
        pausePrice = _pausePrice;
        unpausePrice = _unpausePrice;
    }

    /*//////////////////////////////////////////////////////////////
                        CHAINLINK AUTOMATION FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// Called by Chainlink Automation registry to check if upkeep is needed
    function checkUpkeep(bytes calldata)
        external
        view
        returns (bool upkeepNeeded, bytes memory)
    {
        (, int256 price,,,) = priceFeed.latestRoundData();
        if (price <= 0) return (false, "");

        uint256 p = uint256(price);
        bool isPaused = vault.paused();

        if (!isPaused && p < pausePrice) {
            return (true, "");
        }

        if (isPaused && p > unpausePrice) {
            return (true, "");
        }

        return (false, "");
    }

    /// Called by Chainlink Automation registry to perform the action
    function performUpkeep(bytes calldata) external {
        (, int256 price,,,) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");

        uint256 p = uint256(price);
        bool isPaused = vault.paused();

        if (!isPaused && p < pausePrice) {
            vault.pause();
            emit VaultPaused(p);

        } else if (isPaused && p > unpausePrice) {
            vault.unpause();
            emit VaultUnpaused(p);
        }
    }
}