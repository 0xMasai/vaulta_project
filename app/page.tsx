"use client";

import { useState, useEffect, useCallback } from "react";
import { Wallet } from "@coinbase/onchainkit/wallet";
import { useAccount, useWalletClient } from "wagmi";
import {
  createPublicClient,
  http,
  parseUnits,
  formatUnits,
  Abi,
  parseAbi,
  getAddress,
} from "viem";
import { baseSepolia } from "viem/chains";
import { toast } from "sonner";
import { DollarSign } from "lucide-react";

import savingsAbiJson from "../abi/savingsAbi.json";
import VaultaChat from "./components/VaultaChat";

/* ───────────── CONFIG ───────────── */

const SAVINGS_ABI = savingsAbiJson.abi as Abi;

const ERC20_ABI = parseAbi([
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

const CONTRACT_ADDRESS = getAddress(process.env.NEXT_PUBLIC_VAULT_ADDRESS!);
const USDC_ADDRESS = getAddress(process.env.NEXT_PUBLIC_USDC!);

const RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC!;
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

/* ───────────── MAIN COMPONENT ───────────── */

export default function Home() {
  const { address, chain } = useAccount();
  const { data: walletClient } = useWalletClient();

  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState("0.00");
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [vaultPaused, setVaultPaused] = useState(false);
  const [usdcPrice, setUsdcPrice] = useState("1.0000");
  const [lastUpdated, setLastUpdated] = useState("");
  const [isDepegged, setIsDepegged] = useState(false);

  /* ───────────── FETCH VAULT BALANCE (FIXED) ───────────── */

  const fetchBalance = useCallback(async () => {
    if (!address) return;

    setIsBalanceLoading(true);
    try {
      const raw = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: SAVINGS_ABI,
        functionName: "balanceOf", // ✅ FIXED
        args: [address],
      });

      const formatted = Number(formatUnits(raw as bigint, 6)).toFixed(2);
      setBalance(formatted);
    } catch (err) {
      console.error("Balance fetch error:", err);
      setBalance("0.00");
    } finally {
      setIsBalanceLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const PRICE_FEED_ADDRESS = getAddress(
  process.env.NEXT_PUBLIC_USDC_USD_FEED!
);

  const PRICE_FEED_ABI = parseAbi([
    "function decimals() view returns (uint8)",
    "function latestRoundData() view returns (uint80, int256, uint256, uint256, uint80)",
  ]);

  const fetchPrice = useCallback(async () => {
  try {
    const decimals = await publicClient.readContract({
      address: PRICE_FEED_ADDRESS,
      abi: PRICE_FEED_ABI,
      functionName: "decimals",
    });

    const roundData = await publicClient.readContract({
      address: PRICE_FEED_ADDRESS,
      abi: PRICE_FEED_ABI,
      functionName: "latestRoundData",
    });

    const answer = roundData[1] as bigint;
    const updatedAt = roundData[3] as bigint;

    const formatted =
      Number(answer) / 10 ** Number(decimals);

    const price = formatted.toFixed(4);

    setUsdcPrice(price);
    setIsDepegged(Number(price) < 0.999);

    const date = new Date(Number(updatedAt) * 1000);
    setLastUpdated(date.toLocaleTimeString());

  } catch (err) {
    console.error("USDC price fetch error:", err);
  }
}, []);

useEffect(() => {
  fetchPrice();

  const interval = setInterval(() => {
    fetchPrice();
  }, 15000); // refresh every 15s

  return () => clearInterval(interval);
}, [fetchPrice]);



  /* ───────────── AUTO REFRESH FOR YIELD ───────────── */

  useEffect(() => {
    if (!address) return;

    const interval = setInterval(() => {
      fetchBalance();
    }, 10000); // every 10 seconds

    return () => clearInterval(interval);
  }, [address, fetchBalance]);

  /* ───────────── FETCH ALLOWANCE ───────────── */

  const checkAllowance = useCallback(async () => {
    if (!address) return;

    try {
      const value = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, CONTRACT_ADDRESS],
      });

      setAllowance(value as bigint);
    } catch (err) {
      console.error("Allowance fetch error:", err);
    }
  }, [address]);

  useEffect(() => {
    checkAllowance();
  }, [checkAllowance]);

  /* ───────────── HANDLE TX ───────────── */

  const handleTx = async (action: "deposit" | "withdraw") => {
    if (!walletClient || !address) {
      toast.error("Connect wallet");
      return;
    }

    if (chain?.id !== baseSepolia.id) {
      toast.error("Switch to Base Sepolia");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      toast.error("Enter valid amount");
      return;
    }

    try {
      setIsLoading(true);
      const parsedAssets = parseUnits(amount, 6);
      let txHash: `0x${string}`;

      /* ───────────── DEPOSIT ───────────── */

      if (action === "deposit") {
        const currentAllowance = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, CONTRACT_ADDRESS],
        });

        if ((currentAllowance as bigint) < parsedAssets) {
          toast.loading("Approving USDC...");

          const approveHash = await walletClient.writeContract({
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [CONTRACT_ADDRESS, parsedAssets],
            account: address,
          });

          await publicClient.waitForTransactionReceipt({
            hash: approveHash,
          });

          toast.success("USDC approved");
        }

        toast.loading("Depositing...");

        txHash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: SAVINGS_ABI,
          functionName: "deposit",
          args: [parsedAssets],
          account: address,
        });
      }

      /* ───────────── WITHDRAW ───────────── */

      else {
        toast.loading("Preparing withdraw...");

        const totalShares = (await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: SAVINGS_ABI,
          functionName: "totalShares",
        })) as bigint;

        const totalAssets = (await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: SAVINGS_ABI,
          functionName: "totalAssets",
        })) as bigint;

        const userShares = (await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: SAVINGS_ABI,
          functionName: "userShares",
          args: [address],
        })) as bigint;

        if (totalShares === 0n || totalAssets === 0n) {
          toast.error("Vault empty");
          return;
        }

        const sharesToWithdraw =
          (parsedAssets * totalShares) / totalAssets;

        if (sharesToWithdraw === 0n) {
          toast.error("Amount too small");
          return;
        }

        if (sharesToWithdraw > userShares) {
          toast.error("Not enough balance");
          return;
        }

        toast.loading("Withdrawing...");

        txHash = await walletClient.writeContract({
          address: CONTRACT_ADDRESS,
          abi: SAVINGS_ABI,
          functionName: "withdraw",
          args: [sharesToWithdraw],
          account: address,
        });
      }

      await publicClient.waitForTransactionReceipt({ hash: txHash });

      toast.success("Transaction confirmed");

      setAmount("");
      await fetchBalance();
      await checkAllowance();
    } catch (err: any) {
      console.error("TX Error:", err);
      toast.error(err?.shortMessage || "Transaction failed");
    } finally {
      setIsLoading(false);
    }
  };

  /* ───────────── UI ───────────── */

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200/80">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-semibold">V</span>
            </div>
            <span className="font-semibold text-gray-900">Vaulta</span>
          </div>
          <Wallet />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-5 py-8">
        {/* USDC/USD Price Feed */}
        <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100 mb-6">
          <div className="flex items-center justify-between">
            <div>

              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-medium text-gray-600">
                  USDC / USD
                </p>
              </div>

              <p
                className={`text-3xl font-bold tabular-nums ${
                  isDepegged ? "text-red-600" : "text-gray-900"
                }`}
              >
                ${usdcPrice}
              </p>

              {isDepegged && (
                <p className="text-xs text-red-600 mt-1 font-medium">
                  ⚠ Depeg detected
                </p>
              )}

              <p className="text-xs text-gray-500 mt-1">
                Updated: {lastUpdated} via Chainlink
              </p>

            </div>
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200/80 mb-8">

          {/* Vault Status */}
          <p className="text-sm font-medium text-gray-500 uppercase mb-2">
            Vault Status
          </p>

          <div className="flex items-center gap-2 mb-6">
            <span
              className={`w-3 h-3 rounded-full ${
                vaultPaused ? "bg-red-500" : "bg-green-500"
              }`}
            />

            <p
              className={`text-lg font-semibold ${
                vaultPaused ? "text-red-600" : "text-green-600"
              }`}
            >
              {vaultPaused ? "Paused" : "Active"}
            </p>
          </div>

          {/* Balance */}

          <p className="text-sm font-medium text-gray-500 mb-3 uppercase">
            Your Balance
          </p>

          <div className="flex items-baseline justify-between">
            <p className="text-5xl font-semibold text-gray-900 tabular-nums">
              {isBalanceLoading ? "..." : balance}
            </p>

            {/* <button
              onClick={() => setAmount(balance)}
              className="text-sm text-blue-600 font-medium"
            >
              Max
            </button> */}
          </div>

          <p className="text-xl font-medium text-gray-500 mt-1">
            USDC
          </p>

        </div>

        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          className="w-full px-5 text-black py-4 text-lg bg-white border-2 border-gray-300 rounded-xl mb-5"
        />

        <div className="grid grid-cols-2 gap-3">
          <button
            disabled={isLoading}
            onClick={() => handleTx("deposit")}
            className="py-4 bg-blue-600 text-white font-semibold rounded-xl disabled:opacity-50"
          >
            {isLoading ? "Processing..." : "Deposit"}
          </button>
          <button
            disabled={isLoading}
            onClick={() => handleTx("withdraw")}
            className="py-4 bg-red-600 text-white font-semibold rounded-xl disabled:opacity-50"
          >
            {isLoading ? "Processing..." : "Withdraw"}
          </button>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200/80 mt-8">
          <h2 className="font-semibold text-gray-900 mb-4">
            Ask Vaulta AI
          </h2>
          <VaultaChat address={address} />
        </div>
      </main>
    </div>
  );
}