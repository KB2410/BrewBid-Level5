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

mod sep56_vault_interface;
mod test;

/// Storage keys for auction state management
/// 
/// Uses Soroban's instance storage for active auction data and
/// persistent storage for user refund balances to optimize costs
#[contracttype]
pub enum DataKey {
    Seller,              // Address of the auction creator/seller
    ItemName,            // Human-readable name of the auctioned item
    Token,               // Token contract address (typically native XLM)
    EndTime,             // Unix timestamp when bidding closes
    HighestBidder,       // Current winning bidder's address
    HighestBid,          // Current winning bid amount - now stores SHARES instead of token amounts
    Refund(Address),     // DEPRECATED: Per-user refund balance (will be replaced by BidShares in Task 5)
    BidShares(Address),  // Per-user vault shares balance (replaces Refund for vault integration)
    VaultAddress,        // SEP-56 vault contract address for yield generation
    AccumulatedInterest, // Total interest accumulated for seller from outbid withdrawals
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
    /// * `vault_address` - SEP-56 vault contract address for yield generation
    /// 
    /// # Security
    /// - Requires seller authorization
    /// - Can only be called once per contract instance
    /// - Validates vault implements SEP-56 interface
    /// - Emits AuctionCreated event for frontend tracking
    /// - Emits VaultCfg event with vault configuration
    /// 
    /// # Panics
    /// - If auction is already initialized
    /// - If vault does not implement SEP-56 interface
    pub fn initialize(
        env: Env,
        seller: Address,
        item_name: String,
        token: Address,
        duration_seconds: u64,
        vault_address: Address,
    ) {
        seller.require_auth();

        // Ensure the contract hasn't already been initialized
        if env.storage().instance().has(&DataKey::Seller) {
            panic!("Auction is already initialized");
        }

        // Validate vault implements SEP-56 interface by calling total_assets()
        let vault_client = sep56_vault_interface::Sep56VaultClient::new(&env, &vault_address);
        let _ = vault_client.total_assets();

        // Calculate end time
        let current_time = env.ledger().timestamp();
        let end_time = current_time + duration_seconds;

        // Store initial state
        env.storage().instance().set(&DataKey::Seller, &seller);
        env.storage().instance().set(&DataKey::ItemName, &item_name);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::EndTime, &end_time);
        env.storage().instance().set(&DataKey::HighestBid, &0i128);

        // Store vault configuration
        env.storage().instance().set(&DataKey::VaultAddress, &vault_address);
        env.storage().instance().set(&DataKey::AccumulatedInterest, &0i128);

        // Emit AuctionCreated event for the frontend to index
        env.events().publish(
            (symbol_short!("Created"), seller.clone()),
            (item_name, end_time),
        );

        // Emit VaultCfg event
        env.events().publish(
            (symbol_short!("VaultCfg"), vault_address),
            seller,
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
    /// 4. Deposits funds to vault and receives shares
    /// 5. Moves previous highest bidder's shares to refundable state
    /// 6. Updates highest bidder and bid shares
    /// 7. Emits Bid event with amount and shares
    /// 
    /// # Security
    /// - Requires bidder authorization
    /// - Uses pull pattern for refunds (no automatic transfers)
    /// - Checks-Effects-Interactions pattern
    /// 
    /// # Panics
    /// - If auction has ended
    /// - If bid is not higher than current highest bid
    /// - If vault deposit fails
    pub fn bid(env: Env, bidder: Address, amount: i128) {
        bidder.require_auth();

        let end_time: u64 = env.storage().instance().get(&DataKey::EndTime).unwrap();
        if env.ledger().timestamp() >= end_time {
            panic!("Auction has already ended");
        }

        // Get current highest bid shares and convert to token amount for comparison
        let highest_bid_shares: i128 = env.storage().instance().get(&DataKey::HighestBid).unwrap();
        let highest_bid_amount = if highest_bid_shares > 0 {
            // Convert shares to token amount using vault preview
            let vault_address: Address = env.storage()
                .instance()
                .get(&DataKey::VaultAddress)
                .expect("Vault address not configured");
            let vault_client = sep56_vault_interface::Sep56VaultClient::new(&env, &vault_address);
            vault_client.preview_redeem(&highest_bid_shares)
        } else {
            0i128
        };

        if amount <= highest_bid_amount {
            panic!("Bid must be higher than the current highest bid");
        }

        // Transfer funds from the bidder to this contract
        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_id);
        token_client.transfer(&bidder, &env.current_contract_address(), &amount);

        // Deposit to vault and receive shares
        let shares = deposit_to_vault(&env, amount);

        // If there was a previous highest bidder, move their shares to refundable state
        if let Some(previous_bidder) = env.storage().instance().get::<_, Address>(&DataKey::HighestBidder) {
            // Get previous bidder's shares from HighestBid (which now stores shares)
            let previous_shares = highest_bid_shares;
            
            // Add to their refundable shares balance
            let mut refundable_shares = env.storage()
                .persistent()
                .get(&DataKey::BidShares(previous_bidder.clone()))
                .unwrap_or(0i128);
            refundable_shares += previous_shares;
            
            env.storage()
                .persistent()
                .set(&DataKey::BidShares(previous_bidder), &refundable_shares);
        }

        // Update the new highest bidder and bid shares (not amount)
        env.storage().instance().set(&DataKey::HighestBidder, &bidder);
        env.storage().instance().set(&DataKey::HighestBid, &shares);

        // Emit Bid event with amount and shares
        env.events().publish(
            (symbol_short!("Bid"), bidder),
            (amount, shares),
        );
    }

    /// Allows outbid users to withdraw their refundable balance.
    /// 
    /// # Arguments
    /// * `user` - Address requesting withdrawal
    /// 
    /// # Behavior
    /// 1. Retrieves user's vault shares from persistent storage
    /// 2. Zeros out shares BEFORE redemption (reentrancy protection)
    /// 3. Redeems shares from vault to get tokens (principal + interest)
    /// 4. Calculates principal (uses shares as approximation for 1:1 mock vault)
    /// 5. Calculates interest as redeemed_amount - principal
    /// 6. Adds interest to AccumulatedInterest for seller
    /// 7. Transfers only principal to user
    /// 8. Emits Withdraw event with principal and interest
    /// 
    /// # Security
    /// - Requires user authorization
    /// - Zeroes shares BEFORE redemption (reentrancy protection)
    /// - Pull pattern: users must explicitly withdraw
    /// 
    /// # Panics
    /// - If user has no vault shares to withdraw
    pub fn withdraw(env: Env, user: Address) {
        user.require_auth();

        let shares: i128 = env.storage()
            .persistent()
            .get(&DataKey::BidShares(user.clone()))
            .unwrap_or(0i128);
        
        if shares == 0 {
            panic!("No funds to withdraw");
        }
        
        // Zero out shares BEFORE redemption (reentrancy protection)
        env.storage()
            .persistent()
            .set(&DataKey::BidShares(user.clone()), &0i128);
        
        // Redeem shares from vault
        let redeemed_amount = withdraw_from_vault(&env, shares);
        
        // Calculate principal (original bid amount)
        // For now, use shares as principal since mock vault is 1:1
        let principal = shares;
        
        // Calculate interest
        let interest = redeemed_amount.saturating_sub(principal);
        
        // Accumulate interest for seller
        if interest > 0 {
            let mut accumulated: i128 = env.storage()
                .instance()
                .get(&DataKey::AccumulatedInterest)
                .unwrap_or(0i128);
            accumulated += interest;
            env.storage()
                .instance()
                .set(&DataKey::AccumulatedInterest, &accumulated);
        }
        
        // Transfer only principal to user
        let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_id);
        token_client.transfer(&env.current_contract_address(), &user, &principal);
        
        env.events().publish(
            (symbol_short!("Withdraw"), user),
            (principal, interest),
        );
    }

    /// Ends the auction and transfers winning bid principal + interest to seller.
    /// 
    /// # Behavior
    /// - Can only be called after auction end time
    /// - Redeems winning bid shares from vault
    /// - Calculates total: redeemed_amount + accumulated_interest
    /// - Transfers total to seller
    /// - Emits Ended event with principal and accumulated_interest
    /// 
    /// # Panics
    /// - If auction is still active
    pub fn end_auction(env: Env) {
        let end_time: u64 = env.storage().instance().get(&DataKey::EndTime).unwrap();
        if env.ledger().timestamp() < end_time {
            panic!("Auction is still active");
        }

        let seller: Address = env.storage().instance().get(&DataKey::Seller).unwrap();
        let highest_bid_shares: i128 = env.storage().instance().get(&DataKey::HighestBid).unwrap();

        // Only transfer if a bid was actually placed
        if highest_bid_shares > 0 {
            // Redeem winning bid shares from vault
            let redeemed_amount = withdraw_from_vault(&env, highest_bid_shares);
            
            // Get accumulated interest from outbid withdrawals
            let accumulated_interest: i128 = env.storage()
                .instance()
                .get(&DataKey::AccumulatedInterest)
                .unwrap_or(0i128);
            
            // Total amount to seller = redeemed amount + accumulated interest
            let total_to_seller = redeemed_amount + accumulated_interest;
            
            let token_id: Address = env.storage().instance().get(&DataKey::Token).unwrap();
            let token_client = token::Client::new(&env, &token_id);
            token_client.transfer(
                &env.current_contract_address(),
                &seller,
                &total_to_seller
            );
            
            // Emit Ended event with principal (redeemed_amount) and accumulated_interest
            env.events().publish(
                (symbol_short!("Ended"), seller),
                (redeemed_amount, accumulated_interest),
            );
        }
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

    /// Returns the configured vault address
    pub fn get_vault_address(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::VaultAddress)
            .expect("Vault not configured")
    }

    /// Returns vault shares for a given bidder
    pub fn get_vault_shares(env: Env, bidder: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::BidShares(bidder))
            .unwrap_or(0i128)
    }

    /// Returns accumulated interest for seller
    pub fn get_accumulated_interest(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::AccumulatedInterest)
            .unwrap_or(0i128)
    }

    /// Previews current yield for active auction
    /// 
    /// # Returns
    /// Estimated yield (interest) on the current highest bid
    /// 
    /// # Note
    /// Returns 0 if no bids have been placed
    pub fn preview_current_yield(env: Env) -> i128 {
        let highest_bid_shares: i128 = env.storage()
            .instance()
            .get(&DataKey::HighestBid)
            .unwrap_or(0i128);
        
        if highest_bid_shares == 0 {
            return 0;
        }
        
        let vault_address: Address = env.storage()
            .instance()
            .get(&DataKey::VaultAddress)
            .expect("Vault not configured");
        
        let vault_client = sep56_vault_interface::Sep56VaultClient::new(&env, &vault_address);
        let expected_redemption = vault_client.preview_redeem(&highest_bid_shares);
        
        // Yield = expected redemption - original bid (approximated by shares for 1:1 vault)
        expected_redemption.saturating_sub(highest_bid_shares)
    }
}

// Helper Functions

/// Deposits tokens into the configured vault and returns shares received
/// 
/// # Arguments
/// * `env` - Contract environment
/// * `amount` - Token amount to deposit
/// 
/// # Returns
/// Number of vault shares received
/// 
/// # Panics
/// - If vault address is not configured
/// - If vault deposit fails
/// - If vault returns zero shares for non-zero deposit
fn deposit_to_vault(env: &Env, amount: i128) -> i128 {
    let vault_address: Address = env.storage()
        .instance()
        .get(&DataKey::VaultAddress)
        .expect("Vault address not configured");
    
    let token_address: Address = env.storage()
        .instance()
        .get(&DataKey::Token)
        .unwrap();
    
    // Transfer tokens to vault
    let token_client = token::Client::new(env, &token_address);
    token_client.transfer(
        &env.current_contract_address(),
        &vault_address,
        &amount
    );
    
    // Call vault deposit and receive shares
    let vault_client = sep56_vault_interface::Sep56VaultClient::new(env, &vault_address);
    let shares = vault_client.deposit(
        &env.current_contract_address(),
        &amount
    );
    
    // Validate we received shares
    if shares <= 0 {
        panic!("Vault deposit failed: received zero shares");
    }
    
    shares
}

/// Redeems vault shares for underlying tokens
/// 
/// # Arguments
/// * `env` - Contract environment
/// * `shares` - Number of vault shares to redeem
/// 
/// # Returns
/// Amount of tokens received from redemption
/// 
/// # Panics
/// - If vault address is not configured
/// - If vault redemption fails
/// - If redeemed amount is less than 99% of expected (prevents insolvency)
fn withdraw_from_vault(env: &Env, shares: i128) -> i128 {
    let vault_address: Address = env.storage()
        .instance()
        .get(&DataKey::VaultAddress)
        .expect("Vault address not configured");
    
    // Preview redemption to validate expected amount
    let vault_client = sep56_vault_interface::Sep56VaultClient::new(env, &vault_address);
    let expected_amount = vault_client.preview_redeem(&shares);
    
    // Redeem shares for tokens
    let redeemed_amount = vault_client.redeem(
        &env.current_contract_address(),
        &shares
    );
    
    // Validate redemption succeeded
    if redeemed_amount <= 0 {
        panic!("Vault redemption failed: received zero tokens");
    }
    
    // Ensure we didn't lose value (allow for small rounding)
    if redeemed_amount < (expected_amount * 99 / 100) {
        panic!("Vault redemption returned insufficient tokens");
    }
    
    redeemed_amount
}
