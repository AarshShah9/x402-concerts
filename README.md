# x402 Concerts

An Express API that integrates music providers (Spotify supported for now) listening data with Ticketmaster to find concerts for artists you follow. Uses X402 protocol for micropayments to access the API.

## Overview

This API combines your music streaming habits with concert discovery:
- Links user Spotify accounts via OAuth
- Retrieves followed artists from Spotify
- Finds nearby concerts using Ticketmaster API
- Secures API access with X402 micropayments on Base Sepolia testnet
- Manages encrypted OAuth tokens with automatic refresh

## Tech Stack

- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM
- Spotify API (OAuth + Following data)
- Ticketmaster Discovery API
- X402 protocol (EVM-based micropayments)

## Prerequisites

- Node.js 18+
- PostgreSQL 16+
- Spotify Developer credentials
- Ticketmaster API key
- ngrok account (for OAuth callback)
- Base Sepolia testnet wallet with USDC

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables (create `.env` file):
`cp .env.example .env`

3. Start infrastructure:
```bash
docker-compose up -d
```

4. Run database migrations:
```bash
npx prisma migrate dev
```

5. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Link Spotify Account
```
POST /api/v1/link/init
Body: { "provider": "SPOTIFY", "client_type": "AI_AGENT" }
Response: { "auth_url": "...", "link_session_token": "..." }
```

### OAuth Callback
```
GET /api/v1/link/callback?code=...&state=...
```

### Get Concerts (X402 Protected)
```
GET /api/v1/concert?link_session_token=...&lat=51.5074&lng=-0.1278&radius_km=50
Headers: X402 payment headers required
```

## Testing

Run integration tests (includes X402 payment flow example):
```bash
npm test
```

## Development

Build for production:
```bash
npm run build
npm start
```

## Wallet Setup & Testnet Funding

This project requires a Base Sepolia testnet wallet with USDC for testing X402 micropayments.

### Getting a Wallet

**Option 1: Coinbase Developer Platform (CDP)**
1. Create a wallet at https://portal.cdp.coinbase.com/
2. Navigate to "Wallets" and create a new wallet
3. Export your wallet's private key
4. Add to `.env`: `X402_PAY_TO=0xYourWalletAddress`

**Option 2: MetaMask**
1. Install MetaMask browser extension: https://metamask.io/
2. Create a new wallet and save your seed phrase securely
3. Add Base Sepolia network:
   - Network Name: Base Sepolia
   - RPC URL: https://sepolia.base.org
   - Chain ID: 84532
   - Currency Symbol: ETH
   - Block Explorer: https://sepolia.basescan.org
4. Copy your wallet address and add to `.env`: `X402_PAY_TO=0xYourWalletAddress`

### Funding Your Wallet

You need both ETH (for gas) and USDC (for X402 payments) on Base Sepolia:

1. **Get Sepolia ETH**: Throught CDP: https://portal.cdp.coinbase.com/products/faucet or https://sepoliafaucet.com/
   - Enter your wallet address
   - Request test ETH

2. **Get USDC on Base Sepolia**: https://faucet.circle.com/
   - Connect your wallet
   - Select Base Sepolia network
   - Request test USDC

For testing, add your wallet's private key to `.env`:
```env
TEST_WALLET_PRIVATE_KEY=0xYourPrivateKeyHere
```
