# Quick Setup Guide: Gasless Transactions

## 🚀 Get Started in 5 Minutes

Follow these steps to enable gasless transactions for your BrewBid platform.

## Step 1: Generate Sponsor Wallet (2 minutes)

### Option A: Using Stellar Laboratory (Recommended)
1. Visit: https://laboratory.stellar.org/#account-creator?network=test
2. Click "Generate keypair"
3. **Save both keys securely**:
   - Public Key: `G...` (you'll need this for funding)
   - Secret Key: `S...` (you'll add this to .env.local)

### Option B: Using Node.js
```bash
node -e "const StellarSdk = require('@stellar/stellar-sdk'); const pair = StellarSdk.Keypair.random(); console.log('Public:', pair.publicKey()); console.log('Secret:', pair.secret());"
```

## Step 2: Fund Sponsor Wallet (1 minute)

### For Testnet (Development)
```bash
# Replace with your sponsor's public key
curl "https://friendbot.stellar.org?addr=YOUR_SPONSOR_PUBLIC_KEY"
```

This gives you 10,000 XLM on testnet (enough for ~47 million transactions!)

### For Mainnet (Production)
1. Send XLM from an exchange or another wallet
2. Recommended starting balance: 100 XLM
3. This covers ~476,000 transactions

## Step 3: Configure Environment (1 minute)

Add to `frontend/.env.local`:

```env
# Sponsor wallet secret key
SPONSOR_SECRET_KEY=S...YOUR_SECRET_KEY_HERE

# Network configuration (already set)
NEXT_PUBLIC_CONTRACT_ID=CCLI6FFDYPVD7E6A45Q6QKHADRAOJTQXE35H5KQGQMYJTFJECXJQNVCV
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org:443
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

**⚠️ IMPORTANT**: Never commit `.env.local` to git! It's already in `.gitignore`.

## Step 4: Test Locally (1 minute)

```bash
cd frontend
npm run dev
```

Visit http://localhost:3000 and:
1. Connect your Freighter wallet
2. Place a bid (you don't need XLM for fees!)
3. Check the success message: "Gasless - fees paid by sponsor"

## Step 5: Deploy to Production (Optional)

### Vercel Deployment

1. **Push to GitHub** (already done ✅)

2. **Deploy to Vercel**:
```bash
cd frontend
vercel --prod
```

3. **Add Environment Variable**:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add `SPONSOR_SECRET_KEY` with your secret key
   - Redeploy

4. **Verify**:
   - Visit your production URL
   - Test a gasless transaction
   - Check sponsor wallet on Stellar Expert

## Verification Checklist

- [ ] Sponsor wallet generated
- [ ] Sponsor wallet funded with XLM
- [ ] `SPONSOR_SECRET_KEY` added to `.env.local`
- [ ] Local development server running
- [ ] Test bid placed successfully
- [ ] Success message shows "Gasless - fees paid by sponsor"
- [ ] Transaction visible on Stellar Expert
- [ ] Sponsor wallet balance decreased by ~0.0002 XLM

## Testing the Implementation

### Test 1: Health Check
```bash
curl http://localhost:3000/api/relay
```

Expected response:
```json
{
  "service": "BrewBid Fee Bump Relayer",
  "status": "online",
  "sponsorConfigured": true,
  "network": "Test SDF Network ; September 2015",
  "rpcUrl": "https://soroban-testnet.stellar.org:443"
}
```

### Test 2: Place a Bid
1. Connect wallet (no XLM needed for fees!)
2. Enter bid amount
3. Click "Place Bid"
4. Sign with Freighter
5. Wait for success message
6. Verify transaction on Stellar Expert

### Test 3: Withdraw Refund
1. Get outbid by another user
2. Click "Withdraw Refund"
3. Sign with Freighter
4. Wait for success message
5. Verify refund received

## Monitoring

### Check Sponsor Balance
```bash
# Testnet
curl "https://horizon-testnet.stellar.org/accounts/YOUR_SPONSOR_PUBLIC_KEY"

# Mainnet
curl "https://horizon.stellar.org/accounts/YOUR_SPONSOR_PUBLIC_KEY"
```

### View Transactions
Visit Stellar Expert:
- Testnet: `https://stellar.expert/explorer/testnet/account/YOUR_SPONSOR_PUBLIC_KEY`
- Mainnet: `https://stellar.expert/explorer/public/account/YOUR_SPONSOR_PUBLIC_KEY`

### Set Up Alerts (Optional)
Create a script to alert when balance is low:

```bash
#!/bin/bash
SPONSOR_KEY="YOUR_SPONSOR_PUBLIC_KEY"
MIN_BALANCE=10

BALANCE=$(curl -s "https://horizon-testnet.stellar.org/accounts/$SPONSOR_KEY" | jq -r '.balances[] | select(.asset_type=="native") | .balance')

if (( $(echo "$BALANCE < $MIN_BALANCE" | bc -l) )); then
  echo "⚠️ Sponsor wallet balance low: $BALANCE XLM"
  # Add notification logic here (email, Slack, etc.)
fi
```

## Troubleshooting

### Issue: "Sponsor wallet not configured"
**Solution**: 
- Check `SPONSOR_SECRET_KEY` is in `.env.local`
- Restart development server: `npm run dev`

### Issue: "Invalid sponsor wallet key"
**Solution**:
- Verify secret key starts with 'S'
- Check for extra spaces or line breaks
- Regenerate keypair if needed

### Issue: "Insufficient balance"
**Solution**:
- Check sponsor wallet balance
- Fund with more XLM using Friendbot (testnet) or transfer (mainnet)

### Issue: Transaction fails
**Solution**:
- Check user's bid amount is valid
- Verify contract is initialized
- Check network connectivity
- View detailed error in browser console

## Cost Calculator

Calculate your monthly costs:

```
Transactions per month: ___________
Cost per transaction: 0.00021 XLM
Monthly cost: ___________ XLM

Example:
- 1,000 transactions = 0.21 XLM (~$0.02 USD)
- 10,000 transactions = 2.1 XLM (~$0.20 USD)
- 100,000 transactions = 21 XLM (~$2.00 USD)
```

## Security Best Practices

1. **Never commit secret keys**
   - `.env.local` is in `.gitignore`
   - Use environment variables in production

2. **Rotate keys periodically**
   - Generate new sponsor wallet every 3-6 months
   - Transfer remaining balance to new wallet

3. **Monitor for abuse**
   - Set up alerts for unusual activity
   - Implement rate limiting if needed

4. **Separate testnet and mainnet**
   - Use different sponsor wallets
   - Never use testnet keys on mainnet

5. **Backup secret keys**
   - Store securely (password manager, vault)
   - Have recovery plan if keys are lost

## Next Steps

After setup is complete:

1. **Test thoroughly** on testnet
2. **Monitor costs** for a week
3. **Implement rate limiting** if needed
4. **Set up balance alerts**
5. **Deploy to mainnet** when ready
6. **Document for your team**

## Support

If you encounter issues:

1. Check [GASLESS_TRANSACTIONS.md](./GASLESS_TRANSACTIONS.md) for detailed docs
2. Review browser console for errors
3. Check Stellar Expert for transaction details
4. Verify sponsor wallet has sufficient balance

## Success! 🎉

You've successfully implemented gasless transactions! Your users can now:
- ✅ Bid without XLM for fees
- ✅ Withdraw refunds without XLM for fees
- ✅ Onboard instantly
- ✅ Enjoy a seamless experience

**Total setup time**: ~5 minutes
**Cost**: ~$0.02 per 1000 transactions
**User experience**: Dramatically improved! 🚀

---

**Questions?** Check the full documentation in [GASLESS_TRANSACTIONS.md](./GASLESS_TRANSACTIONS.md)
