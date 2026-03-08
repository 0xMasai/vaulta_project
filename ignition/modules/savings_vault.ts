import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { getAddress } from "viem";

export default buildModule("SavingsVaultModule", (m) => {

  // 1️⃣ Deploy MockUSDC
  const mockUSDC = m.contract("MockUSDC");

  // 2️⃣ Deploy MockAavePool using MockUSDC
  const mockAavePool = m.contract("MockAavePool", [
    mockUSDC,
    500n, // 5% APY (500 bps)
  ]);

  // 3️⃣ Deploy SavingsVault using MockUSDC + MockAavePool
  const vault = m.contract("SavingsVault", [
    mockUSDC,
    mockAavePool,
  ]);

  // 4️⃣ Real Chainlink USDC/USD price feed on Base Sepolia
  const usdcUsdFeed = getAddress(
    "0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165" // <-- replace with actual Base Sepolia feed
  );

  // 5️⃣ Deploy AutomationExecutor (monitors price feed)
  const pausePrice = 98500000n;   // 0.985 USD
  const unpausePrice = 99700000n; // 0.997 USD

  const executor = m.contract("AutomationExecutor", [
    vault,
    usdcUsdFeed,
    pausePrice,
    unpausePrice,
  ]);

  // 6️⃣ Transfer ownership of vault to executor
  m.call(vault, "transferOwnership", [executor], { id: "vaultTransferOwnership" });

  // 7️⃣ Mint 1,000,000 mUSDC to deployer
  m.call(mockUSDC, "mint", [
    m.getAccount(0),
    1_000_000n * 10n**6n,
  ], { id: "mintDeployer" });

  // 8️⃣ Seed MockAavePool with 200,000 mUSDC for yield liquidity
  m.call(mockUSDC, "mint", [
    mockAavePool,
    200_000n * 10n**6n,
  ], { id: "mintPoolLiquidity" });

  // 9️⃣ Return deployed contracts
  return { mockUSDC, mockAavePool, vault, executor };
});