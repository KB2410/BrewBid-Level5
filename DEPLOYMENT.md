# Deployment Guide

## Overview
This guide covers deploying BrewBid to production environments, including smart contract deployment to Stellar testnet/mainnet and frontend deployment to Vercel.

## Prerequisites
- Stellar account with XLM for deployment fees
- Soroban CLI installed
- Node.js v18+ installed
- Vercel account (for frontend deployment)
- Freighter wallet configured

## Smart Contract Deployment

### Step 1: Build the Contract
```bash
cd soroban-contracts
cargo build --target wasm32-unknown-unknown --release
```

### Step 2: Optimize the WASM (Optional but Recommended)
```bash
soroban contract optimize \
  --wasm target/wasm32-unknown-unknown/release/brewbid_auction.wasm
```

### Step 3: Deploy to Testnet
```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/brewbid_auction.wasm \
  --source YOUR_STELLAR_ACCOUNT \
  --network testnet
```

**Output**: You'll receive a contract ID like:
```
CCLI6FFDYPVD7E6A45Q6QKHADRAOJTQXE35H5KQGQMYJTFJECXJQNVCV
```

### Step 4: Initialize the Contract
```bash
soroban contract invoke \
  --id YOUR_CONTRACT_ID \
  --source YOUR_STELLAR_ACCOUNT \
  --network testnet \
  -- initialize \
  --item_name "BrewBid Special Roast" \
  --end_time 1735689600 \
  --min_bid 1000000
```

**Parameters**:
- `item_name`: Name of the item being auctioned (string)
- `end_time`: Unix timestamp when auction ends (u64)
- `min_bid`: Minimum bid in stroops (i128, 1 XLM = 10,000,000 stroops)

### Step 5: Verify Deployment
```bash
# Check highest bid
soroban contract invoke \
  --id YOUR_CONTRACT_ID \
  --source YOUR_STELLAR_ACCOUNT \
  --network testnet \
  -- get_highest_bid

# Check end time
soroban contract invoke \
  --id YOUR_CONTRACT_ID \
  --source YOUR_STELLAR_ACCOUNT \
  --network testnet \
  -- get_end_time

# Check item name
soroban contract invoke \
  --id YOUR_CONTRACT_ID \
  --source YOUR_STELLAR_ACCOUNT \
  --network testnet \
  -- get_item_name
```

## Frontend Deployment

### Step 1: Configure Environment Variables
Create `.env.local` in the `frontend` directory:

```env
NEXT_PUBLIC_CONTRACT_ID=YOUR_CONTRACT_ID_HERE
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org:443
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

For mainnet:
```env
NEXT_PUBLIC_CONTRACT_ID=YOUR_MAINNET_CONTRACT_ID
NEXT_PUBLIC_RPC_URL=https://soroban-mainnet.stellar.org:443
NEXT_PUBLIC_NETWORK_PASSPHRASE=Public Global Stellar Network ; September 2015
```

### Step 2: Test Locally
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` and test all functionality.

### Step 3: Build for Production
```bash
npm run build
```

Verify the build completes without errors.

### Step 4: Deploy to Vercel

#### Option A: Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

#### Option B: GitHub Integration
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Configure environment variables in Vercel dashboard
6. Deploy

### Step 5: Configure Environment Variables in Vercel
1. Go to your project settings in Vercel
2. Navigate to "Environment Variables"
3. Add the following variables:
   - `NEXT_PUBLIC_CONTRACT_ID`
   - `NEXT_PUBLIC_RPC_URL`
   - `NEXT_PUBLIC_NETWORK_PASSPHRASE`
4. Redeploy if necessary

## Post-Deployment Verification

### Smart Contract Checks
- [ ] Contract deployed successfully
- [ ] Contract initialized with correct parameters
- [ ] All getter functions return expected values
- [ ] Test bid transaction works
- [ ] Refund mechanism works

### Frontend Checks
- [ ] Application loads without errors
- [ ] Wallet connection works
- [ ] Auction data displays correctly
- [ ] Bid placement works
- [ ] Refund withdrawal works
- [ ] Real-time updates function properly
- [ ] Mobile responsiveness verified

## Monitoring & Maintenance

### Smart Contract Monitoring
- Monitor contract interactions on [Stellar Expert](https://stellar.expert)
- Track transaction success rates
- Monitor gas costs and optimize if needed

### Frontend Monitoring
- Use Vercel Analytics for performance metrics
- Monitor error rates in browser console
- Track user engagement metrics
- Set up alerts for deployment failures

## Troubleshooting

### Common Issues

#### Contract Deployment Fails
- **Issue**: Insufficient XLM balance
- **Solution**: Fund your account with testnet XLM from [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test)

#### Frontend Can't Connect to Contract
- **Issue**: Wrong contract ID or RPC URL
- **Solution**: Verify environment variables match deployed contract

#### Transactions Fail
- **Issue**: Network congestion or insufficient fees
- **Solution**: Increase fee in transaction builder or retry

#### Wallet Connection Issues
- **Issue**: Freighter not installed or not configured
- **Solution**: Install Freighter extension and configure for testnet

## Security Considerations

### Smart Contract
- Audit contract code before mainnet deployment
- Test thoroughly on testnet with real users
- Consider formal verification for critical functions
- Monitor for unusual activity

### Frontend
- Never expose private keys in frontend code
- Use environment variables for sensitive data
- Implement rate limiting for API calls
- Keep dependencies updated

## Mainnet Deployment Checklist

Before deploying to mainnet:
- [ ] Complete security audit
- [ ] Extensive testnet testing (100+ transactions)
- [ ] User acceptance testing completed
- [ ] Documentation finalized
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery plan in place
- [ ] Legal and compliance review completed
- [ ] Customer support process established

## Cost Estimates

### Testnet (Free)
- Contract deployment: Free (testnet XLM)
- Transactions: Free (testnet XLM)
- Frontend hosting: Free (Vercel hobby plan)

### Mainnet
- Contract deployment: ~1-5 XLM
- Per transaction: ~0.00001 XLM
- Frontend hosting: Free (Vercel hobby plan) or $20/month (Pro)

## Support & Resources

- **Stellar Documentation**: https://developers.stellar.org
- **Soroban Documentation**: https://soroban.stellar.org
- **Vercel Documentation**: https://vercel.com/docs
- **Community Support**: Stellar Discord

---

**Last Updated**: Level 5 Submission
**Deployment Status**: Live on Testnet
**Current Contract ID**: `CCLI6FFDYPVD7E6A45Q6QKHADRAOJTQXE35H5KQGQMYJTFJECXJQNVCV`
**Live URL**: https://frontend-chi-wheat-42.vercel.app
