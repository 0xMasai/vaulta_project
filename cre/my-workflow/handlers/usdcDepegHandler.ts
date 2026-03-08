// usdcDepegHandler.ts
export const handler = async (context: any) => {
  // Safe environment variable access
  const USDC_ADDRESS = context.env.USDC_ADDRESS || "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // fallback

  console.log("USDC depeg check triggered");
  console.log("TEST MODE: handler invoked");

  try {
    // Example: fetch USDC price from some API
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=usd");
    const data = await res.json();
    const price = data["usd-coin"].usd;

    console.log("Current USDC price:", price);

    if (price < 0.95) {
      console.log("⚠️ USDC depeg detected!");
      // You can trigger alerts or other workflow actions here
      return { alert: "USDC depeg detected", price };
    } else {
      console.log("USDC is fine.");
      return { alert: "USDC stable", price };
    }
  } catch (err: any) {
    console.error("Error checking USDC price:", err.message);
    return { error: err.message };
  }
};
