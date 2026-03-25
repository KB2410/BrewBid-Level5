# BrewBid ☕ - Real-Time Decentralized Auction dApp

**Stellar Journey to Mastery — Blue Belt (Level 5) Submission**

BrewBid is a real-time decentralized auction platform built on the Stellar network leveraging Soroban smart contracts. It allows users to list digital items for auction with strict time limits, while buyers connect their Freighter wallets to place secure, escrowed bids. 

## 🔗 Level 3 Submission Links
* **Contract ID**: `CCLI6FFDYPVD7E6A45Q6QKHADRAOJTQXE35H5KQGQMYJTFJECXJQNVCV` (Testnet)
* **Live Demo**: [https://frontend-chi-wheat-42.vercel.app](https://frontend-chi-wheat-42.vercel.app)
* **Demo Video**: [https://drive.google.com/file/d/1BwanzgiJ36qMccIvlhk1UjBdTJTPGKyE/view?usp=sharing](https://drive.google.com/file/d/1BwanzgiJ36qMccIvlhk1UjBdTJTPGKyE/view?usp=sharing)
* **Screenshot (3 Passing Tests)**: ![Tests Passing](./tests-passing-output.png)

---

## 👥 User Validation (Level 5 Milestone)

BrewBid is currently undergoing user validation to reach MVP status. We are collecting feedback from 5+ real testnet users to refine the bidding experience.

### 📝 Feedback & Iteration
*   **Google Form**: [Link to Feedback Form] (User: Create your form and link here!)
*   **Responses & Data**: [Link to Exported Excel Sheet]
*   **Initial Improvement**: Replaced technical Wasm traps with user-friendly error messages (e.g., "Bid too low").
*   **Proof of Iteration (Commit)**: [View Commit](https://github.com/KB2410/BrewBid/commit/e2e0db3)

### 📈 Future Roadmap
Based on initial developer feedback, we plan to implement a **Live Transaction Feed** to display the most recent bids on the UI, increasing transparency and excitement in the auction flow.

---

## 🏗️ Architecture & Documentation
Detailed system design and logic flow can be found in [ARCHITECTURE.md](./ARCHITECTURE.md).

## 👥 User Validation (Level 3 Requirement)

To ensure a polished and frictionless user experience, BrewBid was tested by testnet users who executed both the "Seller" and "Bidder" flows. 

### Verifiable Testnet Users
1. `GBHA2H7RRFAE5QINGF3BLSZGLPEBTM5EW7A547PJ4E26L4Z7MMLAOJEE` - [View on Stellar.Expert](https://stellar.expert/explorer/testnet/account/GBHA2H7RRFAE5QINGF3BLSZGLPEBTM5EW7A547PJ4E26L4Z7MMLAOJEE)

### 🔄 Feedback Iteration & Improvement
Based on user feedback, we implemented a loading state on the bidding button that disables input and provides visual feedback during RPC simulation and network submission.

**Proof of Work (Git Commit):** [View Commit](https://github.com/KB2410/BrewBid/commit/...) <!-- TODO: User, link the specific commit here -->

---

## 💻 Local Setup & Deployment

### Prerequisites
* Node.js (v18+)
* Rust & Soroban CLI
* Freighter Wallet Browser Extension

### Running the Frontend
```bash
cd frontend
npm install
npm run dev
```

### Running Smart Contract Tests
Ensure you are in the `soroban-contracts` directory:
```bash
cd soroban-contracts
cargo test
```

### Contract Deployment (Testnet)
```bash
soroban contract build
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/brewbid_auction.wasm \
  --source [YOUR_TESTNET_IDENTITY] \
  --network testnet
```
