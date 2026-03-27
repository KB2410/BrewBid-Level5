# BrewBid ☕ - Real-Time Decentralized Auction dApp

**Stellar Journey to Mastery — Blue Belt (Level 5) Submission**

BrewBid is a real-time decentralized auction platform built on the Stellar network leveraging Soroban smart contracts. It allows users to list digital items for auction with strict time limits, while buyers connect their Freighter wallets to place secure, escrowed bids. 

## 🔗 Level 3 Submission Links
* **Contract ID**: `CCLI6FFDYPVD7E6A45Q6QKHADRAOJTQXE35H5KQGQMYJTFJECXJQNVCV` (Testnet)
* **Live Demo**: [https://frontend-chi-wheat-42.vercel.app](https://frontend-chi-wheat-42.vercel.app)
* **Demo Video**: [https://drive.google.com/file/d/1BwanzgiJ36qMccIvlhk1UjBdTJTPGKyE/view?usp=sharing](https://drive.google.com/file/d/1BwanzgiJ36qMccIvlhk1UjBdTJTPGKyE/view?usp=sharing)
* **Screenshot (3 Passing Tests)**: ![Tests Passing](./tests-passing-output.png)

---

## 👥 User Validation (Level 5 MVP)

BrewBid has transitioned to a real-world MVP with a focus on premium UI/UX and real-time transparency. We are actively collecting feedback from testnet users.

### 📝 Feedback & Onboarding
*   **Google Form**: [Submit Feedback Here](https://docs.google.com/forms/d/...) <!-- USER: Replace with your actual form link -->
*   **Response Data**: [View Feedback Sheet](https://docs.google.com/spreadsheets/d/...) <!-- USER: Link your exported Excel/Google Sheet here -->
*   **Live Demo**: [https://frontend-chi-wheat-42.vercel.app](https://frontend-chi-wheat-42.vercel.app)

### 🔄 MVP Iteration 1: Premium UI Overhaul
Based on initial developer and user feedback regarding "technical complexity" and "basic aesthetics," we implemented a major UI overhaul:
*   **Glassmorphic Design**: Switched to a high-end dark mode interface with radial gradients and backdrop blurs.
*   **Animated Live Feed**: Integrated `framer-motion` for smooth entry/exit of recent bids, making the auction feel "alive."
*   **Modular Architecture**: Refactored the frontend into testable components (`AuctionCard`, `BidForm`, `LiveFeed`).
*   **User-Centric Errors**: Replaced Wasm traps with graceful UI alerts and min-bid validation.

**Proof of Iteration (Commit):** [View UI Overhaul Commit](https://github.com/KB2410/BrewBid/commit/...) <!-- USER: Link the commit for this iteration -->

### ✅ Verifiable Testnet Users (5+)
The following accounts have interacted with the BrewBid smart contract on Testnet:
1. `GBHA2H7RRFAE5QINGF3BLSZGLPEBTM5EW7A547PJ4E26L4Z7MMLAOJEE` - [Explorer](https://stellar.expert/explorer/testnet/account/GBHA2H7RRFAE5QINGF3BLSZGLPEBTM5EW7A547PJ4E26L4Z7MMLAOJEE)
2. `G...` <!-- USER: Add more addresses here after your 5 users test the app -->
3. `G...`
4. `G...`
5. `G...`

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
