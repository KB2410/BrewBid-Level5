# BrewBid System Architecture

BrewBid is a decentralized auction application (dApp) built on the Stellar network using Soroban smart contracts. The architecture is designed around a trustless escrow pattern, utilizing a decoupled frontend-backend structure with real-time state synchronization via the Soroban RPC.

## 🏗️ System Components

### 1. Smart Contract (Soroban / Rust)
The core logic resides in a compiled `.wasm` Soroban smart contract deployed to the Stellar network.
- **Asset Integration:** Interacts directly with the native Stellar Asset Contract (SAC) to securely transfer and hold XLM.
- **Escrow Mechanics:** Locks the current highest bid within the contract's own balance.
- **State Management:** Utilizes Soroban's `instance` storage for active auction parameters (`Seller`, `EndTime`, `HighestBid`, and `HighestBidder`).
- **Pull-Based Refunds:** Employs a secure pull mechanism for outbid users. Refund balances are mapped in `persistent` storage, requiring outbid users to actively invoke `withdraw()`. This mitigates push-based reentrancy vectors and prevents gas exhaustion attacks.

### 2. Frontend Client (Next.js & TypeScript)
A stateless client application that acts as the user interface and transaction builder.
- **Blockchain Integration:** Utilizes `@stellar/stellar-sdk` to build and encode transactions (XDR) and communicates with the network via a Soroban RPC URL.
- **Wallet Provider:** Integrates `@stellar/freighter-api` to request user signatures and handle key management without exposing private keys to the DOM.
- **State Synchronization:** Implements a polling mechanism (10-second intervals) that queries the contract's read-only getter functions to keep the UI synchronized with the ledger state.
- **Data Hydration:** Safely deserializes Soroban `ScVal` responses, strictly handling 128-bit integers (`i128`) via BigInt to prevent JavaScript Number precision loss.

## 🔄 Transaction Lifecycle & Data Flow

```mermaid
sequenceDiagram
    participant U as User (Bidder)
    participant F as Frontend (Next.js)
    participant W as Wallet (Freighter)
    participant S as Soroban RPC
    participant C as Smart Contract

    U->>F: Enter Bid Amount
    F->>S: Simulate Transaction (stellar-sdk)
    S-->>F: Gas Estimates & Auth Requirements
    F->>W: Request Signature (Pass XDR)
    W-->>F: Return Signed Transaction
    F->>S: Submit Transaction to Network
    S->>C: Execute "bid" Invocation
    C->>C: Validate Expiration & Minimum Bid
    C->>C: Transfer XLM via SAC & Update Escrow
    F->>S: Poll Contract State (get_highest_bid)
    S-->>F: Return Updated State (ScVal)
    F-->>U: Rehydrate UI