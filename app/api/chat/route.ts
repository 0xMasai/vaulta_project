import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  createPublicClient,
  http,
  formatUnits,
  getAddress,
  AbiEvent,
} from "viem";
import { baseSepolia } from "viem/chains";
import savingsAbiJson from "@/abi/savingsAbi.json";

/* =========================
Environment Variables
========================= */

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS;
const RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC;

/* =========================
Clients
========================= */

const groq = GROQ_API_KEY
  ? new OpenAI({
      apiKey: GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    })
  : null;

const CONTRACT_ADDRESS = VAULT_ADDRESS
  ? getAddress(VAULT_ADDRESS)
  : undefined;

const publicClient = RPC_URL
  ? createPublicClient({
      chain: baseSepolia,
      transport: http(RPC_URL),
    })
  : null;

/* =========================
Vault Deployment Block
(important for performance)
========================= */

const DEPLOYMENT_BLOCK = 5000000n;

/* =========================
Fetch Last Transactions
========================= */

async function fetchLastTransactions(address: string, limit = 5) {
  if (!publicClient || !CONTRACT_ADDRESS) return [];

  try {
    const depositEvent = savingsAbiJson.abi.find(
      (e: any) => e.type === "event" && e.name === "Deposit"
    ) as AbiEvent;

    const withdrawEvent = savingsAbiJson.abi.find(
      (e: any) => e.type === "event" && e.name === "Withdraw"
    ) as AbiEvent;

    if (!depositEvent || !withdrawEvent) return [];

    const depositLogs = await publicClient.getLogs({
      address: CONTRACT_ADDRESS,
      event: depositEvent,
      fromBlock: DEPLOYMENT_BLOCK,
      toBlock: "latest",
      args: { user: address },
    });

    const withdrawLogs = await publicClient.getLogs({
      address: CONTRACT_ADDRESS,
      event: withdrawEvent,
      fromBlock: DEPLOYMENT_BLOCK,
      toBlock: "latest",
      args: { user: address },
    });

    const allEvents = [...depositLogs, ...withdrawLogs].sort(
      (a, b) => Number(b.blockNumber) - Number(a.blockNumber)
    );

    const events = allEvents.slice(0, limit);

    const parsed = await Promise.all(
      events.map(async (e: any) => {
        const block = await publicClient.getBlock({
          blockNumber: e.blockNumber,
        });

        return {
          type: e.eventName,
          amount: Number(
            formatUnits(BigInt(e.args.amount), 6)
          ).toFixed(2),
          date: new Date(Number(block.timestamp) * 1000)
            .toISOString()
            .split("T")[0],
        };
      })
    );

    return parsed;
  } catch (err) {
    console.error("Transaction fetch failed:", err);
    return [];
  }
}

/* =========================
POST Handler
========================= */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const message = body?.message;
    const rawAddress = body?.address;

    if (!message)
      return NextResponse.json(
        { reply: "No message provided." },
        { status: 400 }
      );

    if (!rawAddress)
      return NextResponse.json(
        { reply: "No wallet connected." },
        { status: 400 }
      );

    let userAddress: string;

    try {
      userAddress = getAddress(rawAddress);
    } catch {
      return NextResponse.json(
        { reply: "Invalid wallet address." },
        { status: 400 }
      );
    }

    /* =========================
    Fetch Vault Balance
    ========================= */

    let vaultBalance = "0.00";

    if (publicClient && CONTRACT_ADDRESS) {
      try {
        const raw = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: savingsAbiJson.abi,
          functionName: "balanceOf",
          args: [userAddress],
        });

        const rawBigInt =
          typeof raw === "bigint"
            ? raw
            : BigInt(raw as any);

        vaultBalance = Number(
          formatUnits(rawBigInt, 6)
        ).toFixed(2);
      } catch (err) {
        console.error("Balance read failed:", err);
      }
    }

    /* =========================
    Transaction History
    ========================= */

    const lastTransactions = await fetchLastTransactions(
      userAddress
    );

    const totalDeposits = lastTransactions
      .filter((t) => t.type === "Deposit")
      .reduce((acc, t) => acc + Number(t.amount), 0);

    const totalWithdrawals = lastTransactions
      .filter((t) => t.type === "Withdraw")
      .reduce((acc, t) => acc + Number(t.amount), 0);

    const transactionsText =
      lastTransactions.length > 0
        ? lastTransactions
            .map(
              (t) =>
                `${t.type} • ${t.amount} USDC • ${t.date}`
            )
            .join("\n")
        : "No recent transactions.";

    const lower = message.toLowerCase();

    /* =========================
    Deterministic Responses
    ========================= */

    if (lower.includes("balance")) {
      return NextResponse.json({
        reply: `Your vault balance is ${vaultBalance} USDC.`,
      });
    }

    if (
      lower.includes("wallet") ||
      lower.includes("address")
    ) {
      return NextResponse.json({
        reply: `Your connected wallet address is ${userAddress}.`,
      });
    }

    if (
      lower.includes("transaction") ||
      lower.includes("history") ||
      lower.includes("activity")
    ) {
      return NextResponse.json({
        reply: `Recent transactions:\n${transactionsText}`,
      });
    }

    if (lower.includes("total deposit")) {
      return NextResponse.json({
        reply: `Your total deposits are ${totalDeposits.toFixed(
          2
        )} USDC.`,
      });
    }

    if (lower.includes("total withdraw")) {
      return NextResponse.json({
        reply: `Your total withdrawals are ${totalWithdrawals.toFixed(
          2
        )} USDC.`,
      });
    }

    if (
      lower.includes("summary") ||
      lower.includes("analytics")
    ) {
      const net = totalDeposits - totalWithdrawals;

      return NextResponse.json({
        reply: `
Vault Summary

Balance: ${vaultBalance} USDC
Total Deposits: ${totalDeposits.toFixed(2)} USDC
Total Withdrawals: ${totalWithdrawals.toFixed(2)} USDC
Net Position: ${net.toFixed(2)} USDC
`,
      });
    }

    if (
      lower.includes("yield") ||
      lower.includes("interest") ||
      lower.includes("earn")
    ) {
      return NextResponse.json({
        reply:
          "Your vault earns yield by supplying USDC to a lending pool. Borrowers pay interest, and that interest increases your vault balance over time.",
      });
    }

    /* =========================
    AI Assistant
    ========================= */

    if (!groq) {
      return NextResponse.json({
        reply: `Your vault balance is ${vaultBalance} USDC.`,
      });
    }

    const systemPrompt = `
You are Vaulta AI, an assistant for a decentralized savings vault.

User wallet: ${userAddress}

Vault data:
Balance: ${vaultBalance} USDC
Total Deposits: ${totalDeposits.toFixed(2)} USDC
Total Withdrawals: ${totalWithdrawals.toFixed(2)} USDC

Recent transactions:
${transactionsText}

Your job:
- Explain vault activity
- Explain DeFi yield
- Help users understand their savings

Never invent balances or transactions.
Use the data provided.
Be concise and friendly.
`;

    const completion = await groq.chat.completions.create({
      model: "llama3-13b-8192",
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
    });

    const aiReply =
      completion.choices?.[0]?.message?.content ??
      "Sorry, I couldn't process that.";

    return NextResponse.json({ reply: aiReply });
  } catch (error) {
    console.error("Vaulta AI error:", error);

    return NextResponse.json(
      { reply: "Vaulta AI encountered an error." },
      { status: 500 }
    );
  }
}