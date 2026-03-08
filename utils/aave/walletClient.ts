import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const walletClient = createWalletClient({
  account: privateKeyToAccount(process.env.PRIVATE_KEY!),
  transport: http(),
});
