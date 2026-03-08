
---

# Vaulta — Automated Risk-Aware DeFi Savings Vault

**Vaulta** is an automated DeFi savings vault that monitors stablecoin risks and protects user funds. Using **Chainlink CRE**, it automatically pauses the vault if risky conditions occur, while earning yield in an Aave-like pool.

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
* Allocating funds to an **Aave-like yield pool**
* **Monitoring price feeds continuously** via Chainlink CRE
* **Pausing the vault automatically** if risk thresholds are crossed

---

## Impact

* Makes DeFi savings safer
* Protects users without manual monitoring
* Enables wider participation in DeFi

---

## How It Works

1. User deposits USDC into the Vaulta vault
2. CRE workflow monitors Chainlink price feeds continuously
3. AutomationExecutor contract pauses/unpauses the vault if thresholds are breached

**Architecture:**

```text
User → Vaulta Frontend → Vault Contract → CRE Workflow → AutomationExecutor → Vault (Paused/Active)
```

---

## Chainlink Integration

Vaulta leverages Chainlink for automation and risk monitoring:

1. **Price Feeds** – USDC/USD price feed monitors stablecoin value.
2. **CRE Workflow / AutomationExecutor Contract** – Automatically pauses/unpauses the vault when thresholds are crossed.

See the contract here: [AutomationExecutor.sol](https://github.com/0xMasai/vaulta_project/contracts/AutomationExecutor.sol)

---

## Demo

### Connect Wallet

User connects their wallet using **Coinbase OnchainKit**.

### Deposit USDC

User deposits USDC into the **Vaulta savings vault**.

### Vault Monitoring

The dashboard displays:

* User vault balance
* Earned yield
* Risk monitoring status via **Chainlink Price Feeds**

### Automated Protection & Vault Status

* Vaulta continuously monitors USDC/USD via Chainlink Price Feeds.
* **Vault State: Active** — vault operating normally and generating yield.
* **Vault State: Paused** — vault automatically paused if risk conditions are detected.

### Withdraw Funds

User withdraws their **USDC along with accumulated yield**.

### Demo Video

Watch Vaulta in action: [Demo Video](https://drive.google.com/file/d/1eRmtu5xypaNHxIffm9VUbcI8mIzI939f/view?usp=sharing)

---

## System Flow

```
User
  ↓
Vaulta Frontend
  ↓
Deposit USDC
  ↓
Savings Vault Contract
  ↓
Mock Aave Pool (yield generation)
  ↓
Vault (user assets + earned yield)
  ↓
Withdraw
  ↓
User
```

---

## Automated Risk Monitoring Flow

```
Chainlink Price Feed
        ↓
AutomationExecutor Contract
        ↓
Checks Stablecoin Price
        ↓
If price < safety threshold
        ↓
Vault.pause()

If price recovers
        ↓
Vault.unpause()
```

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
git clone https://github.com/0xMasai/vaulta.git
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

4. Start the frontend:

```bash
npm run dev
```

5. Connect your wallet, deposit USDC, and Vaulta allocates funds to an Aave-like yield pool while continuously monitoring the USDC/USD price via Chainlink Price Feeds to automatically pause the vault if risk conditions occur.

---

## License

MIT © Felix Masai

---

