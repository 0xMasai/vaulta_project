
---

# Vaulta — Automated Risk-Aware DeFi Savings Vault

**Vaulta** is an automated DeFi savings vault that monitors stablecoin risks and protects user funds. Using **Chainlink CRE**, it automatically pauses the vault if risky conditions occur.

---

## Problem

DeFi users face risks they can’t monitor 24/7:

* Stablecoin depegs
* Liquidity shocks
* Rapid market volatility

---

## Solution

Vaulta solves this by:

* Accepting **USDC deposits**
* **Monitoring price feeds** continuously via Chainlink CRE
* **Pausing the vault automatically** if risks are detected

---

## Impact

* Makes DeFi savings safer
* Protects users without manual monitoring
* Enables participation in DeFi for all

---

## How It Works

1. User deposits USDC into the Vaulta vault
2. CRE monitors price feeds continuously
3. Automation executor triggers vault pause if thresholds are breached

**Architecture:**

```text
User → Vaulta Frontend → Vault Contract → CRE Workflow → Automation → Vault Paused
```

---

## Demo

* Connect wallet
* Deposit USDC
* Dashboard shows vault balance & monitoring
* Vault pauses automatically if risk occurs

---

## Tech Stack

* Solidity smart contracts
* Chainlink CRE + Price Feeds
* Next.js + React frontend
* viem + Coinbase OnchainKit wallet
* Base Sepolia testnet

---

## Usage Guidelines

1. Clone the repo:

```bash
git clone https://github.com/<username>/vaulta.git
cd vaulta
```

2. Install dependencies:

```bash
npm install
```

3. Deploy contracts (Hardhat) to Base Sepolia:

```bash
cd contracts
# Compile & deploy
```

4. Start:

```bash
npm run dev
```

5. Connect wallet, deposit USDC, and watch Vaulta monitor risk automatically.


---

## License

MIT © Masai

---

