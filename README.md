# BrewBid ☕ - Decentralized Auction Platform

**Stellar Journey to Mastery — Blue Belt (Level 5) Submission**

A production-ready decentralized auction platform built on Stellar blockchain with Soroban smart contracts. BrewBid enables secure, transparent, and automated auctions with instant refunds and low transaction fees.

## 🎯 Level 5 Requirements

### ✅ Core Features
- **Smart Contract**: Fully functional Soroban auction contract with bid management and automatic refunds
- **Frontend**: Professional Next.js application with Freighter wallet integration
- **Real-time Updates**: Live auction data fetching every 10 seconds
- **User Experience**: Clean, client-focused UI highlighting platform benefits
- **Testing**: Comprehensive test suite with 3+ passing tests

### 📊 MVP Validation & User Feedback

**Live Demo**: [https://frontend-chi-wheat-42.vercel.app](https://frontend-chi-wheat-42.vercel.app)

---

## 👥 User Onboarding & MVP Validation

To validate the MVP, we onboarded real testnet users to interact with the BrewBid smart contract. User details, wallet addresses, and product ratings were collected systematically to guide the next phase of development.

🔗 **[View the User Feedback Excel Sheet Here](https://docs.google.com/forms/d/e/1FAIpQLScJhdKlRAUoSEIbCov_EujyZwRI7BIFXZrczRadjIOpnBoImA/viewform?usp=publish-editor)
### Verified Testnet Bidders

The following user successfully connected their wallet and executed on-chain transactions:

1. `GBHA2H7RRFAE5QINGF3BLSZGLPEBTM5EW7A547PJ4E26L4Z7MMLAOJEE` - [View on Explorer](https://stellar.expert/explorer/testnet/account/GBHA2H7RRFAE5QINGF3BLSZGLPEBTM5EW7A547PJ4E26L4Z7MMLAOJEE)

**User Actions Tracked**:
- Wallet connections: Verified testnet address
- Bid placements: Multiple successful transactions
- Contract interactions: Tested auction flow end-to-end

---

## 🚀 Next Phase Improvements (Based on Feedback)

Reviewing the user feedback from the exported Excel sheet, a consistent theme emerged: **friction during the initial wallet funding process**. Users noted that acquiring testnet XLM to pay for gas fees was a barrier to placing their first bid.

To evolve the project and solve this user experience hurdle, the next development phase implements **Gasless Bidding via Stellar Fee Bump Transactions**.

### Implementation Plan

Instead of requiring users to hold XLM, the Next.js frontend now delegates the transaction signature to a backend relayer. The relayer wraps the user's bid in a Fee Bump transaction, sponsoring the network fees via a server-side treasury wallet, resulting in a Web2-quality onboarding experience.

**Key Features Implemented**:
- ✅ Backend relay API endpoint (`/api/relay`)
- ✅ Fee Bump transaction wrapping
- ✅ Sponsor wallet integration
- ✅ Zero-fee user experience
- ✅ Instant onboarding without wallet funding

**Results**:
- Users can now bid immediately after connecting wallet
- No XLM required for transaction fees
- Platform cost: ~0.00021 XLM per transaction (~$0.02 per 1000 transactions)
- Dramatically improved user onboarding experience

* **Git Commit Link for this Improvement:** [View the Gasless Relayer Implementation here](https://github.com/KB2410/BrewBid-Level5/commit/7e90b5a)

---

## 🔗 Deployment Links

* **Contract ID**: `CCLI6FFDYPVD7E6A45Q6QKHADRAOJTQXE35H5KQGQMYJTFJECXJQNVCV` (Stellar Testnet)
* **Live Frontend**: [https://frontend-chi-wheat-42.vercel.app](https://frontend-chi-wheat-42.vercel.app)
* **Demo Video**: [Watch Demo](https://drive.google.com/file/d/1BwanzgiJ36qMccIvlhk1UjBdTJTPGKyE/view?usp=sharing)
* **Test Results**: ![Tests Passing](./tests-passing-output.png)

---

## 🚀 Key Features

### For Users
- **Gasless Transactions**: No XLM needed for transaction fees - sponsor wallet covers all costs! 🎉
- **Secure Bidding**: All bids secured by Soroban smart contracts
- **Instant Refunds**: Automatic refund system when outbid
- **Zero Fees**: Users pay nothing - platform covers all transaction costs
- **Transparent**: All transactions visible on blockchain
- **Easy to Use**: Simple wallet connection and bidding process
- **Instant Onboarding**: Start bidding immediately without funding wallet

### Technical Highlights
- **Gasless Transactions**: Fee Bump transactions with sponsor wallet relay
- **Soroban Smart Contracts**: Rust-based contract with comprehensive test coverage
- **Next.js Frontend**: Modern React framework with TypeScript
- **Stellar SDK Integration**: Full integration with Stellar blockchain
- **Freighter Wallet**: Seamless wallet connection and transaction signing
- **Real-time Data**: Live auction updates every 10 seconds
- **API Relay**: Backend endpoint for wrapping transactions in Fee Bumps

---

## 💰 Gasless Transactions

BrewBid implements **Fee Bump transactions** to provide a gasless experience for users. The platform's sponsor wallet pays all transaction fees, allowing users to bid and withdraw refunds without needing XLM for fees.

**Benefits**:
- Users can start bidding immediately after connecting wallet
- No need to fund wallet with XLM for transaction fees
- Improved onboarding and conversion rates
- Cost to platform: ~0.00021 XLM per transaction (~$0.02 per 1000 transactions)

**How it works**: User signs transaction → Relay API wraps in Fee Bump → Sponsor pays fees → Transaction submitted

For detailed implementation guide, see [GASLESS_TRANSACTIONS.md](./GASLESS_TRANSACTIONS.md)

---

## 🏗️ Architecture

### Smart Contract (Soroban)
```
soroban-contracts/
├── src/
│   ├── lib.rs          # Main auction contract logic
│   └── test.rs         # Comprehensive test suite
└── Cargo.toml          # Rust dependencies
```

**Contract Functions**:
- `initialize()` - Set up auction with item name, end time, and minimum bid
- `bid()` - Place a bid (must be higher than current highest bid)
- `withdraw()` - Withdraw refund if outbid
- `get_highest_bid()` - Query current highest bid
- `get_end_time()` - Query auction end time
- `get_item_name()` - Query item being auctioned
- `get_refund()` - Check available refund for a user

### Frontend (Next.js + TypeScript)
```
frontend/
├── app/
│   ├── components/
│   │   └── AuctionUI.tsx    # Main auction interface
│   ├── layout.tsx           # App layout
│   └── page.tsx             # Home page
└── package.json             # Dependencies
```

**Key Technologies**:
- Next.js 15 with App Router
- TypeScript for type safety
- Tailwind CSS for styling
- Stellar SDK for blockchain interaction
- Freighter API for wallet integration

---

## 💻 Local Development

### Prerequisites
- Node.js v18 or higher
- Rust and Cargo
- Soroban CLI (`cargo install soroban-cli`)
- Freighter Wallet browser extension

### Setup Instructions

#### 1. Clone the Repository
```bash
git clone https://github.com/KB2410/BrewBid-Level5.git
cd BrewBid-Level5
```

#### 2. Install Frontend Dependencies
```bash
cd frontend
npm install
```

#### 3. Configure Environment
Create a `.env.local` file in the `frontend` directory:
```env
NEXT_PUBLIC_CONTRACT_ID=CCLI6FFDYPVD7E6A45Q6QKHADRAOJTQXE35H5KQGQMYJTFJECXJQNVCV
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org:443
```

#### 4. Run Development Server
```bash
npm run dev
```
Visit `http://localhost:3000` to see the application.

#### 5. Build Smart Contract
```bash
cd soroban-contracts
cargo build --target wasm32-unknown-unknown --release
```

#### 6. Run Tests
```bash
cargo test
```

### Deploying Your Own Contract

1. **Build the contract**:
```bash
cd soroban-contracts
soroban contract build
```

2. **Deploy to testnet**:
```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/brewbid_auction.wasm \
  --source YOUR_STELLAR_ACCOUNT \
  --network testnet
```

3. **Initialize the contract**:
```bash
soroban contract invoke \
  --id YOUR_CONTRACT_ID \
  --source YOUR_STELLAR_ACCOUNT \
  --network testnet \
  -- initialize \
  --item_name "Your Item Name" \
  --end_time UNIX_TIMESTAMP \
  --min_bid 1000000
```

---

## 🧪 Testing

### Smart Contract Tests
```bash
cd soroban-contracts
cargo test
```

**Test Coverage**:
- ✅ Auction flow (initialize → bid → withdraw)
- ✅ Bid validation (must be higher than current bid)
- ✅ Bid after auction end (should fail)
- ✅ Refund mechanism
- ✅ Edge cases and error handling

### Test Results
All tests passing: ![Tests Passing](./tests-passing-output.png)

---

## 📈 Future Enhancements

- [ ] Multi-item auction support
- [ ] Auction creation UI for sellers
- [ ] Bid history and analytics
- [ ] Email notifications for outbid users
- [ ] Mobile app (React Native)
- [ ] Mainnet deployment
- [ ] NFT auction support
- [ ] Dutch auction mechanism

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 👨‍💻 Developer

**Kartik Botre**
- GitHub: [@KB2410](https://github.com/KB2410)
- Project: BrewBid Level 5 Submission

---

## 🙏 Acknowledgments

- Stellar Development Foundation for the Soroban platform
- Stellar Community for support and resources
- All testnet users who provided valuable feedback

---

**Built with ❤️ on Stellar Blockchain**
