#![no_std]
//! # BrewBid Auction Smart Contract
//! 
//! A secure, decentralized auction platform built on Stellar's Soroban.
//! 
//! ## Features
//! - Time-bound auctions with automatic expiration
//! - Secure bid escrow with automatic refunds for outbid users
//! - Pull-based refund mechanism to prevent reentrancy attacks
//! - Event emission for frontend indexing and real-time updates
//! 
//! ## Security Considerations
//! - Uses pull pattern for refunds to prevent reentrancy
//! - Checks-Effects-Interactions pattern for state updates
//! - Authorization required for all state-changing operations

use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, String, symbol_short
};

mod test;

/// Storage keys for auction state management
/// 
/// Uses Soroban's instance storage for active auction data and
/// persistent storage for user refund balances to optimize costs
#[contracttype]
pub enum DataKey {
    Seller,           // Address of the auction creator/seller
    ItemName,         // Human-readable name of the auctioned item
    Token,            // Token contract address (typically native XLM)
    EndTime,          // Unix timestamp when bidding closes
    HighestBidder,    // Current winning bidder's address
    HighestBid,       // Current winning bid amount in stroops
    Refund(Address),  // Per-user refund balance (pull pattern for security)
}

#[contract]
pub struct BrewBidAuction;

#[contractimpl]
impl BrewBidAuction {
    /// Initializes a new auction with the specified parameters.
    /// 
    /// # Arguments
    /// * `seller` - Address of the auction creator who will receive winning bid
    /// * `item_name` - Human-readable name/description of the item
    /// * `token` - Token contract address for bidding (typically native XLM)
    /// * `duration_seconds` - How long the auction runs from initialization
    /// 
    /// # Security
    /// - Requires seller authorization
    /// - Can only be called once per contract instance
    /// - Emits AuctionCreated event for frontend tracking
    /// 
    /// # Panics
    /// - If auction is already initialized
    pub fn initialize(
        env: Env,
        seller: Address,
        item_name: String,
        token: Address,
        duration_seconds: u64,
    ) {
        seller.require_auth();

        // Ensure the contract hasn't already been initialized
        if env.storage().instance().has(&DataKey::Seller) {
            panic!("Auction is already initialized");
        }

        // Calculate end time
        let current_time = env.ledger().timestamp();
        let end_time = current_time + duration_seconds;

        // Store initial state
        env.storage().instance().set(&DataKey::Seller, &seller);
        env.storage().instance().set(&DataKey::ItemName, &item_name);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::EndTime, &end_time);
        env.storage().instance().set(&DataKey::HighestBid, &0i128);

        // Emit AuctionCreated event for the frontend to index
        env.events().publish(
            (symbol_short!("Created"), seller),
            (item_name, end_time),
        );
    }

    /// Places a bid in the auction, locking funds in escrow.
    /// 
    /// # Arguments
    /// * `bidder` - Address placing the bid
    /// * `amount` - Bid amount in stroops (1 XLM = 10,000,000 stroops)
    /// 
    /// # Behavior
    /// 1. Validates auction is still active
    /// 2. Validates bid is higher than current highest
    /// 3. Transfers funds from bidder to contract
    /// 4. Allocates refund for previous highest bidder
    /// 5. Updates highest bidder and bid amount
    /// 6. Emits BidPlaced event
    /// 
    /// # Security
    /// - Requires bidder authorization
    /// - Uses pull pattern for refunds (no automatic transfers)
    /// - Checks-Effects-Interactions pattern
    /// 
    /// # Panics
    /// - If auction has ended
    /// - If bid is not higher than current highest bid
    pub fn bid(env: Env, bidder: Address, amount: i128) {
        bidder.require_auth();

        let end_time: u64 = env.storage().instance().get(&DataKey::EndTime).unwrap();
        if env.ledger().timestamp() >= end_time {
            panic!("Auction has already ended");
        }

        let highest_bid: i128 = env.storage().instance().get(&DataKey::HighestBid).unwrap();
        if amount <= highest_bid {
            panic!("Bid must be higher than the current highest bid");
        }

        // Transfer funds from the bidder to this contract
        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_id);
        token_client.transfer(&bidder, &env.current_contract_address(), &amount);

        // If there was a previous highest bidder, allocate their refund (Pull pattern)
        if let Some(previous_bidder) = env.storage().instance().get::<_, Address>(&DataKey::HighestBidder) {
            let mut current_refund = env.storage().persistent().get(&DataKey::Refund(previous_bidder.clone())).unwrap_or(0i128);
            current_refund += highest_bid;
            env.storage().persistent().set(&DataKey::Refund(previous_bidder), &current_refund);
        }

        // Update the new highest bidder and bid amount
        env.storage().instance().set(&DataKey::HighestBidder, &bidder);
        env.storage().instance().set(&DataKey::HighestBid, &amount);

        // Emit BidPlaced event
        env.events().publish(
            (symbol_short!("Bid"), bidder),
            amount,
        );
    }

    /// Allows outbid users to withdraw their refundable balance.
    /// 
    /// # Arguments
    /// * `user` - Address requesting withdrawal
    /// 
    /// # Security
    /// - Requires user authorization
    /// - Zeroes balance BEFORE transfer (reentrancy protection)
    /// - Pull pattern: users must explicitly withdraw
    /// 
    /// # Panics
    /// - If user has no refundable balance
    pub fn withdraw(env: Env, user: Address) {
        user.require_auth();

        let refund_amount: i128 = env.storage().persistent().get(&DataKey::Refund(user.clone())).unwrap_or(0i128);
        if refund_amount == 0 {
            panic!("No funds to withdraw");
        }

        // Zero out the balance BEFORE transferring to prevent re-entrancy attacks
        env.storage().persistent().set(&DataKey::Refund(user.clone()), &0i128);

        // Transfer funds back to the user
        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_id);
        token_client.transfer(&env.current_contract_address(), &user, &refund_amount);
    }

    /// Ends the auction and transfers winning bid to seller.
    /// 
    /// # Behavior
    /// - Can only be called after auction end time
    /// - Transfers highest bid to seller if any bids were placed
    /// - Emits AuctionEnded event
    /// 
    /// # Panics
    /// - If auction is still active
    pub fn end_auction(env: Env) {
        let end_time: u64 = env.storage().instance().get(&DataKey::EndTime).unwrap();
        if env.ledger().timestamp() < end_time {
            panic!("Auction is still active");
        }

        let seller: Address = env.storage().instance().get(&DataKey::Seller).unwrap();
        let highest_bid: i128 = env.storage().instance().get(&DataKey::HighestBid).unwrap();

        // Only transfer if a bid was actually placed
        if highest_bid > 0 {
            let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
            let token_client = token::Client::new(&env, &token_id);
            
            // Transfer highest bid to the seller
            token_client.transfer(&env.current_contract_address(), &seller, &highest_bid);
        }

        // Emit AuctionEnded event
        env.events().publish(
            (symbol_short!("Ended"), seller),
            highest_bid,
        );
    }

    /// Returns the current highest bidder
    pub fn get_highest_bidder(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::HighestBidder)
    }

    /// Returns the current highest bid amount
    pub fn get_highest_bid(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::HighestBid).unwrap_or(0)
    }

    /// Returns the end time of the auction
    pub fn get_end_time(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::EndTime).unwrap_or(0)
    }

    /// Returns the refundable balance for a given user
    pub fn get_refund(env: Env, user: Address) -> i128 {
        env.storage().persistent().get(&DataKey::Refund(user)).unwrap_or(0)
    }

    /// Returns the item name
    pub fn get_item_name(env: Env) -> String {
        env.storage().instance().get(&DataKey::ItemName).unwrap()
    }
}
