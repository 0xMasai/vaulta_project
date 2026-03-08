import {
  CronCapability,
  handler,
  Runner,
  type Runtime,
} from "@chainlink/cre-sdk";

import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

/*//////////////////////////////////////////////////////////////
                          CONFIG
//////////////////////////////////////////////////////////////*/

type Config = {
  schedule: string;
  rpcUrl: string;
  usdcUsdFeed: `0x${string}`;
  vault: `0x${string}`;
};

/*//////////////////////////////////////////////////////////////
                        ABIs
//////////////////////////////////////////////////////////////*/

const priceFeedAbi = [
  {
    name: "latestRoundData",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { type: "uint80" },
      { type: "int256" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint80" },
    ],
  },
] as const;

const vaultAbi = [
  {
    name: "paused",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
] as const;

/*//////////////////////////////////////////////////////////////
                        HANDLER
//////////////////////////////////////////////////////////////*/

const onCronTrigger = async (runtime: Runtime<Config>): Promise<string> => {
  runtime.log("USDC depeg monitoring triggered");

  // ---------- PUBLIC CLIENT ----------
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(runtime.config.rpcUrl),
  });

  // ---------- ORACLE READ ----------
  const [, price] = await publicClient.readContract({
    address: runtime.config.usdcUsdFeed,
    abi: priceFeedAbi,
    functionName: "latestRoundData",
  }) as readonly [bigint, bigint, bigint, bigint, bigint];

  const formattedPrice = Number(price) / 1e8;
  runtime.log(`USDC/USD price: ${formattedPrice}`);

  // ---------- VAULT STATE ----------
  const isPaused = await publicClient.readContract({
    address: runtime.config.vault,
    abi: vaultAbi,
    functionName: "paused",
  });

  runtime.log(`Vault paused: ${isPaused}`);

  // ---------- CIRCUIT BREAKER LOG ----------
  if (formattedPrice < 0.9) {
    runtime.log("⚠ WARNING: USDC is critically depegged!");
  }

  // ---------- DECISION LOG ----------
  if (formattedPrice < 0.985) {
    runtime.log("USDC below 0.985 — monitor closely (manual action recommended)");
  } else if (formattedPrice > 0.997) {
    runtime.log("USDC recovered above 0.997 — safe range");
  } else {
    runtime.log("USDC in neutral band — no immediate action");
  }

  return `Price: ${formattedPrice}, Paused: ${isPaused}`;
};

/*//////////////////////////////////////////////////////////////
                      WORKFLOW INIT
//////////////////////////////////////////////////////////////*/

const initWorkflow = (config: Config) => {
  const cron = new CronCapability();

  return [
    handler(
      cron.trigger({ schedule: config.schedule }),
      onCronTrigger
    ),
  ];
};

/*//////////////////////////////////////////////////////////////
                      RUNNER
//////////////////////////////////////////////////////////////*/

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}