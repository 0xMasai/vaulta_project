import assert from "node:assert";
import test from "node:test";
import hre from "hardhat";

test("Deposit moves funds to pool", async () => { /* … existing deposit test … */ });

test("Withdraw returns funds to user", async () => { /* … existing withdraw test … */ });

test("Deposit should fail when vault is paused", async () => { 
  const { viem } = await hre.network.connect();
  const [owner, user] = await viem.getWalletClients();

  const usdc = await viem.deployContract("MockUSDC");
  const pool = await viem.deployContract("MockAavePool", [
    usdc.address,
    500n,
  ]);
  const vault = await viem.deployContract("SavingsVault", [
    usdc.address,
    pool.address,
  ]);

  const amount = 1000n * 10n ** 6n;

  // Pause vault
  await vault.write.pause({ account: owner.account });

  // Mint + approve
  await usdc.write.mint([user.account.address, amount]);
  await usdc.write.approve([vault.address, amount], {
    account: user.account,
  });

  let failed = false;
  try {
    await vault.write.deposit([amount], {
      account: user.account,
    });
  } catch {
    failed = true;
  }

  assert.equal(failed, true);
});