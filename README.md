Vaulta — Automated Risk-Aware DeFi Savings Vault

Vaulta is an automated DeFi savings vault that monitors risk conditions and triggers onchain protection to keep users’ funds safe. Using Chainlink CRE and price feeds, Vaulta continuously evaluates stablecoin markets and reacts automatically to protect deposits.

Table of Contents

Overview

Problem

Solution

Features

Architecture

Demo

Technology Stack

Setup & Usage

Contributing

License

Overview

Vaulta allows users to deposit USDC into a secure DeFi vault.
It continuously monitors risk conditions using Chainlink CRE workflows and oracle data. If risk thresholds are breached (e.g., stablecoin price < 0.97), Vaulta automatically pauses the vault to protect user funds.

Problem

DeFi users face hidden risks when depositing assets:

Stablecoin depegs

Liquidity shocks

Rapid market volatility

Most users cannot monitor these conditions 24/7, exposing them to potential losses.

Solution

Vaulta addresses these problems by:

Providing an automated DeFi savings vault

Continuously monitoring stablecoin prices via Chainlink CRE

Triggering automated onchain protection when risk occurs

This transforms passive yield into a self-protecting financial system.

Features

Deposit and withdraw USDC safely

Continuous risk monitoring via Chainlink CRE

Automated vault pause on risky conditions

Dashboard showing vault status and monitoring

Ready for integration with DeFi protocols (Aave, Compound)

Architecture
User
 ↓
Vaulta Frontend (Next.js)
 ↓
Savings Vault Smart Contract
 ↓
Chainlink CRE Workflow
 ↓
Automation Executor
 ↓
Vault Paused (if risk detected)

Frontend: User interface to deposit, monitor, and withdraw funds

Smart Contract: Manages deposits, withdrawals, and vault state

CRE Monitoring: Monitors oracle price feeds continuously

Automation Executor: Pauses vault automatically during risk events

Demo

Connect wallet (Coinbase OnchainKit)

Deposit USDC

Dashboard displays vault balance and monitoring status

CRE monitors stablecoin price

Vault pauses automatically if risk occurs

Visual demo available in the screenshots/ folder or link to live demo.

Technology Stack

Smart Contracts: Solidity

Automation & Monitoring: Chainlink CRE

Oracle Data: Chainlink Price Feeds

Frontend: Next.js + React

Web3 Integration: viem + Coinbase OnchainKit Wallet

AI Assistant: Optional Groq API integration

Testnet: Base Sepolia

Setup & Usage

Clone the repo:

git clone https://github.com/<username>/vaulta.git
cd vaulta

Install frontend dependencies:

cd frontend
npm install

Deploy smart contracts on Base Sepolia:

cd contracts
# Compile & deploy using Hardhat or Foundry

Start frontend:

npm run dev

Connect wallet and interact with the vault.
