# BrewBid ☕ - Decentralized Auction Platform

**Stellar Journey to Mastery — Blue Belt (Level 5) Submission**

A production-ready decentralized auction platform built on Stellar blockchain with Soroban smart contracts. BrewBid enables secure, transparent, and automated auctions with instant refunds, low transaction fees, and **DeFi-powered yield generation**.

## 🎯 Level 5 Requirements

### ✅ Core Features
- **Smart Contract**: Fully functional Soroban auction contract with bid management and automatic refunds
- **Frontend**: Professional Next.js application with Freighter wallet integration
- **Real-time Updates**: Live auction data fetching every 10 seconds
- **User Experience**: Clean, client-focused UI highlighting platform benefits
- **Testing**: Comprehensive test suite with 4+ passing tests
- **🆕 Yield Generation**: SEP-56 vault integration for capital-efficient auctions

### 📊 MVP Validation & User Feedback

**Live Demo**: [https://frontend-chi-wheat-42.vercel.app](https://frontend-chi-wheat-42.vercel.app)

---

## 👥 User Onboarding & MVP Validation

To validate the MVP, we onboarded real testnet users to interact with the BrewBid smart contract. User details, wallet addresses, and product ratings were collected systematically to guide the next phase of development.

🔗 **[View User Feedback Responses (Google Sheets)](https://docs.google.com/spreadsheets/d/1ySM0mqjic7pOBtXX3J9YPymcwDM9oUq7hNCouGiCr70/edit?usp=sharing)**

### Verified Testnet Bidders

The following users successfully connected their wallets and executed on-chain transactions:

1. `GBHA2H7RRFAE5QINGF3BLSZGLPEBTM5EW7A547PJ4E26L4Z7MMLAOJEE` - [View on Explorer](https://stellar.expert/explorer/testnet/account/GBHA2H7RRFAE5QINGF3BLSZGLPEBTM5EW7A547PJ4E26L4Z7MMLAOJEE)

**User Actions Tracked**:
- Wallet connections: 5+ unique testnet addresses
- Bid placements: Multiple successful transactions
- Refund withdrawals: Tested withdrawal functionality
- Contract interactions: End-to-end auction flow validation

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

## 💎 Latest Innovation: Yield-Bearing Auctions (DeFi Integration)

**Transforming Idle Capital into Productive Assets**

BrewBid has evolved from a simple auction platform into a **capital-efficient DeFi application** by integrating SEP-56 compliant yield-generating vaults. Instead of bid amounts sitting idle in escrow, they now generate yield while locked, creating additional revenue for sellers.

### 🌟 Key Innovation Features

**SEP-56 Vault Integration**:
- ✅ Bid amounts automatically deposited into yield-generating vaults (Blend Protocol compatible)
- ✅ Share-based accounting for accurate principal tracking
- ✅ All accrued interest flows to the seller as additional revenue
- ✅ Bidders receive their full principal back when outbid
- ✅ Maintains security guarantees (pull-based refunds, reentrancy protection)

**How It Works**:
1. **Bid Placement**: User bids → Tokens deposited to vault → Contract receives shares
2. **Yield Accrual**: While auction is active, locked capital generates interest in the vault
3. **Outbid Withdrawal**: User withdraws → Vault redeems shares → User receives principal only
4. **Auction End**: Seller receives winning bid principal + ALL accumulated interest from all bids

**Benefits**:
- **For Sellers**: Earn additional revenue beyond the winning bid through yield generation
- **For Bidders**: Full principal protection - always get your original bid back
- **For Platform**: Capital efficiency - idle funds generate returns instead of sitting dormant
- **For DeFi**: Demonstrates real-world utility of yield-bearing protocols

### 📊 Technical Implementation

**Architecture**:
- SEP-56 compliant vault interface using Soroban's `contractimport!`
- Instance storage for vault address (gas-optimized)
- Persistent storage for bid shares (user-specific tracking)
- Helper functions: `deposit_to_vault()`, `withdraw_from_vault()`

**Smart Contract Updates**:
- `initialize()` - Now accepts vault address parameter with SEP-56 validation
- `bid()` - Deposits to vault and tracks shares instead of raw amounts
- `withdraw()` - Redeems shares, separates principal from interest
- `end_auction()` - Distributes principal + accumulated interest to seller

**Query Functions**:
- `get_vault_address()` - Returns configured vault contract
- `get_vault_shares(bidder)` - Returns bidder's vault shares
- `get_accumulated_interest()` - Returns total interest for seller
- `preview_current_yield()` - Estimates current yield on active auction

**Test Coverage**:
- ✅ Complete auction flow with vault integration
- ✅ Principal preservation on withdrawal
- ✅ Interest accumulation and distribution
- ✅ Seller receives principal + interest
- ✅ 4 comprehensive tests passing (100% success rate)

**Spec-Driven Development**:
This feature was built using a rigorous spec-driven workflow:
- 10 comprehensive requirements with EARS notation
- 18 formally specified correctness properties
- Detailed design document with architecture diagrams
- 11 implementation tasks executed sequentially
- Full documentation in `.kiro/specs/yield-generation-vault/`

### 🎯 Real-World Impact

This innovation positions BrewBid as a **next-generation auction platform** that:
- Maximizes capital efficiency for all participants
- Demonstrates practical DeFi integration beyond speculation
- Provides measurable value (yield) to sellers
- Maintains trust and security expected in decentralized applications

**Example Scenario**:
- Auction with 5 bids totaling 10,000 XLM locked for 7 days
- Vault APY: 8%
- Interest generated: ~15 XLM (~$1.50 at current prices)
- Seller receives: Winning bid + 15 XLM bonus
- All bidders get their full principal back

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
- **Yield-Bearing Auctions**: Sellers earn interest on locked bids automatically 💰
- **Secure Bidding**: All bids secured by Soroban smart contracts
- **Instant Refunds**: Automatic refund system when outbid
- **Principal Protection**: Bidders always receive their full original bid back
- **Zero Fees**: Users pay nothing - platform covers all transaction costs
- **Transparent**: All transactions visible on blockchain
- **Easy to Use**: Simple wallet connection and bidding process
- **Instant Onboarding**: Start bidding immediately without funding wallet

### Technical Highlights
- **SEP-56 Vault Integration**: Industry-standard yield-generating vault protocol
- **Gasless Transactions**: Fee Bump transactions with sponsor wallet relay
- **Soroban Smart Contracts**: Rust-based contract with comprehensive test coverage
- **Share-Based Accounting**: Accurate principal/interest separation
- **Next.js Frontend**: Modern React framework with TypeScript
- **Stellar SDK Integration**: Full integration with Stellar blockchain
- **Freighter Wallet**: Seamless wallet connection and transaction signing
- **Real-time Data**: Live auction updates every 10 seconds
- **API Relay**: Backend endpoint for wrapping transactions in Fee Bumps
- **Capital Efficiency**: Idle funds generate yield instead of sitting dormant

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
- `initialize()` - Set up auction with item name, end time, minimum bid, and vault address
- `bid()` - Place a bid (deposits to vault and receives shares)
- `withdraw()` - Withdraw refund if outbid (redeems shares, returns principal only)
- `end_auction()` - End auction and transfer principal + interest to seller
- `get_highest_bid()` - Query current highest bid shares
- `get_end_time()` - Query auction end time
- `get_item_name()` - Query item being auctioned
- `get_vault_address()` - Query configured vault contract
- `get_vault_shares()` - Query bidder's vault shares
- `get_accumulated_interest()` - Query total interest for seller
- `preview_current_yield()` - Estimate current yield on active auction

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
- ✅ Auction flow (initialize → bid → withdraw → end with vault integration)
- ✅ Bid validation (must be higher than current bid)
- ✅ Bid after auction end (should fail)
- ✅ Vault deposit and redemption mechanism
- ✅ Principal preservation on withdrawal
- ✅ Interest accumulation and distribution to seller
- ✅ Seller receives principal + accumulated interest
- ✅ Edge cases and error handling

### Test Results
All tests passing (4 tests): 
- `test_auction_flow` - Complete vault-integrated auction lifecycle
- `test_seller_receives_principal_plus_interest` - Seller compensation validation
- `test_low_bid_fails` - Bid validation
- `test_bid_after_end_fails` - Time-based validation

---

## 📈 Future Enhancements

- [ ] Frontend UI for yield display and APY tracking
- [ ] Multi-vault support (Blend, custom vaults)
- [ ] Dynamic yield allocation (configurable seller/bidder split)
- [ ] Yield reinvestment strategies
- [ ] Multi-item auction support
- [ ] Auction creation UI for sellers
- [ ] Bid history and analytics with yield tracking
- [ ] Email notifications for outbid users
- [ ] Mobile app (React Native)
- [ ] Mainnet deployment with production vaults
- [ ] NFT auction support
- [ ] Dutch auction mechanism
- [ ] Cross-chain vault integration

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
