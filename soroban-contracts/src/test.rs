#![cfg(test)]
//! # BrewBid Auction Contract Test Suite
//! 
//! Comprehensive tests covering:
//! - Complete auction flow (initialize → bid → outbid → withdraw → end)
//! - Edge cases (low bids, expired auctions)
//! - Refund mechanism validation
//! - Security scenarios (reentrancy protection via pull pattern)

use super::*;
use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env, String, token, contract, contractimpl};

/// Mock SEP-56 Vault for testing
/// Supports yield simulation by checking actual token balance
#[contract]
pub struct MockVault;

#[contracttype]
pub enum VaultDataKey {
    Token,
    TotalShares, // Track total shares issued
}

#[contractimpl]
impl MockVault {
    /// Initialize the mock vault with a token address
    pub fn initialize(env: Env, token: Address) {
        env.storage().instance().set(&VaultDataKey::Token, &token);
        env.storage().instance().set(&VaultDataKey::TotalShares, &0i128);
    }
    
    pub fn deposit(env: Env, _depositor: Address, amount: i128) -> i128 {
        // Update total shares
        let mut total_shares: i128 = env.storage()
            .instance()
            .get(&VaultDataKey::TotalShares)
            .unwrap_or(0i128);
        total_shares += amount;
        env.storage().instance().set(&VaultDataKey::TotalShares, &total_shares);
        
        // Return 1:1 shares
        amount
    }
    
    pub fn redeem(env: Env, redeemer: Address, shares: i128) -> i128 {
        let token_id: Address = env.storage().instance().get(&VaultDataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_id);
        
        // Get vault's actual token balance (includes any minted yield)
        let vault_balance = token_client.balance(&env.current_contract_address());
        
        // Get total shares
        let total_shares: i128 = env.storage()
            .instance()
            .get(&VaultDataKey::TotalShares)
            .unwrap_or(shares);
        
        // Calculate proportional redemption: (shares / total_shares) * vault_balance
        // This allows yield simulation by minting extra tokens to vault
        let redeemed_amount = if total_shares > 0 && vault_balance > 0 {
            (shares * vault_balance) / total_shares
        } else {
            shares
        };
        
        // Update total shares
        if total_shares >= shares {
            let remaining_shares = total_shares - shares;
            env.storage().instance().set(&VaultDataKey::TotalShares, &remaining_shares);
        }
        
        // Transfer tokens from vault to redeemer
        token_client.transfer(&env.current_contract_address(), &redeemer, &redeemed_amount);
        
        redeemed_amount
    }
    
    pub fn preview_redeem(env: Env, shares: i128) -> i128 {
        // Try to get token, return shares if vault not initialized
        let token_id_opt: Option<Address> = env.storage().instance().get(&VaultDataKey::Token);
        if token_id_opt.is_none() {
            return shares;
        }
        
        let token_id = token_id_opt.unwrap();
        let token_client = token::Client::new(&env, &token_id);
        
        // Get vault's actual token balance
        let vault_balance = token_client.balance(&env.current_contract_address());
        
        // Get total shares (default to shares if not set yet)
        let total_shares: i128 = env.storage()
            .instance()
            .get(&VaultDataKey::TotalShares)
            .unwrap_or(shares);
        
        // Calculate proportional redemption
        if total_shares > 0 && vault_balance > 0 {
            (shares * vault_balance) / total_shares
        } else {
            shares
        }
    }
    
    pub fn total_assets(_env: Env) -> i128 {
        1_000_000_000
    }
    
    pub fn total_shares(_env: Env) -> i128 {
        1_000_000_000
    }
}

/// Tests the complete auction lifecycle with multiple bidders
/// 
/// Flow:
/// 1. Initialize auction with 1-hour duration and mock vault
/// 2. Bidder1 places initial bid of 100
/// 3. Bidder2 outbids with 200
/// 4. Bidder1 withdraws refund of 100
/// 5. Auction ends and seller receives winning bid
/// 
/// Validates:
/// - Proper state transitions
/// - Refund allocation for outbid users
/// - Token transfers at each step
/// - Final balance reconciliation
#[test]
fn test_auction_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, BrewBidAuction);
    let client = BrewBidAuctionClient::new(&env, &contract_id);

    // Register mock vault
    let vault_id = env.register_contract(None, MockVault);
    let vault_client = MockVaultClient::new(&env, &vault_id);

    let admin = Address::generate(&env);
    let bidder1 = Address::generate(&env);
    let bidder2 = Address::generate(&env);
    
    // Create a real token for testing
    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract(token_admin.clone());
    let token_base_client = token::Client::new(&env, &token_id);
    let token_client = token::StellarAssetClient::new(&env, &token_id);

    // Initialize mock vault with token
    vault_client.initialize(&token_id);

    let item_name = String::from_str(&env, "BrewBid Rare Mug");

    // 1. Initialize Auction with vault
    client.initialize(&admin, &item_name, &token_id, &3600, &vault_id);
    assert_eq!(client.get_item_name(), item_name);
    assert_eq!(client.get_end_time(), env.ledger().timestamp() + 3600);

    // Initial balances
    assert_eq!(token_base_client.balance(&admin), 0);

    // Mint tokens to bidders
    token_client.mint(&bidder1, &1000);
    token_client.mint(&bidder2, &2000);

    // 2. First Bid
    client.bid(&bidder1, &100);
    assert_eq!(client.get_highest_bidder(), Some(bidder1.clone()));
    // get_highest_bid() now returns shares (100 shares with 1:1 ratio in mock vault)
    assert_eq!(client.get_highest_bid(), 100);
    // Tokens are now in the vault, not the contract
    assert_eq!(token_base_client.balance(&vault_id), 100);

    // 3. Second Bid (Outbid)
    client.bid(&bidder2, &200);
    assert_eq!(client.get_highest_bidder(), Some(bidder2.clone()));
    // get_highest_bid() now returns shares (200 shares with 1:1 ratio in mock vault)
    assert_eq!(client.get_highest_bid(), 200);
    // Tokens are now in the vault (100 + 200 = 300)
    assert_eq!(token_base_client.balance(&vault_id), 300);

    // Check refund allocation for bidder1 - now uses BidShares instead of Refund
    assert_eq!(client.get_vault_shares(&bidder1), 100);

    // 4. Withdraw Refund
    client.withdraw(&bidder1);
    assert_eq!(client.get_vault_shares(&bidder1), 0);
    assert_eq!(token_base_client.balance(&bidder1), 1000); // Got principal back

    // 5. End Auction (Advance Time)
    env.ledger().set_timestamp(env.ledger().timestamp() + 4000);
    
    // Check state before end_auction
    // get_highest_bid() returns shares (200)
    assert_eq!(client.get_highest_bid(), 200);

    // Perform end_auction
    client.end_auction();
    
    // Verify seller received the winning bid (200 tokens)
    // In this test, there's no accumulated interest since bidder1 withdrew their principal
    // Seller should receive: redeemed_amount (200) + accumulated_interest (0) = 200
    assert_eq!(token_base_client.balance(&admin), 200);
    
    // Remaining balance in contract should be 0 
    assert_eq!(token_base_client.balance(&contract_id), 0);
}

/// Tests that bids lower than or equal to current highest bid are rejected
/// 
/// Security validation:
/// - Prevents bid manipulation
/// - Ensures auction integrity
/// - Validates proper error handling
#[test]
#[should_panic(expected = "Bid must be higher than the current highest bid")]
fn test_low_bid_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, BrewBidAuction);
    let client = BrewBidAuctionClient::new(&env, &contract_id);

    // Register mock vault
    let vault_id = env.register_contract(None, MockVault);

    let admin = Address::generate(&env);
    let bidder = Address::generate(&env);
    
    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract(token_admin);
    let token_client = token::StellarAssetClient::new(&env, &token_id);

    let item_name = String::from_str(&env, "Test");

    client.initialize(&admin, &item_name, &token_id, &3600, &vault_id);
    token_client.mint(&bidder, &1000);

    client.bid(&bidder, &100);
    client.bid(&bidder, &50); // Should panic
}

/// Tests that bids cannot be placed after auction expiration
/// 
/// Time-based validation:
/// - Ensures auction respects end_time
/// - Prevents late bidding exploits
/// - Validates ledger timestamp checks
#[test]
#[should_panic(expected = "Auction has already ended")]
fn test_bid_after_end_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, BrewBidAuction);
    let client = BrewBidAuctionClient::new(&env, &contract_id);

    // Register mock vault
    let vault_id = env.register_contract(None, MockVault);

    let admin = Address::generate(&env);
    let bidder = Address::generate(&env);
    
    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract(token_admin);
    let token_client = token::StellarAssetClient::new(&env, &token_id);

    let item_name = String::from_str(&env, "Test");

    // Initialize with a 1-second duration
    client.initialize(&admin, &item_name, &token_id, &1, &vault_id);
    token_client.mint(&bidder, &1000);

    // Advance ledger time by 2 seconds to ensure the auction has ended
    env.ledger().set_timestamp(env.ledger().timestamp() + 2);

    client.bid(&bidder, &100); // Should panic
}

/// Tests that seller receives principal + accumulated interest at auction end
/// 
/// This test simulates a scenario with yield by manually adding interest to the vault
/// before withdrawal and end_auction operations.
/// 
/// Flow:
/// 1. Initialize auction with mock vault
/// 2. Bidder1 places bid of 100
/// 3. Bidder2 outbids with 200
/// 4. Manually mint 10 tokens to vault (simulating 10% yield on bidder1's 100)
/// 5. Bidder1 withdraws (gets principal 100, interest 10 goes to accumulated)
/// 6. Manually mint 20 tokens to vault (simulating 10% yield on bidder2's 200)
/// 7. Auction ends and seller receives winning bid + accumulated interest
/// 
/// Validates:
/// - Seller receives redeemed_amount from winning bid
/// - Seller receives accumulated_interest from outbid withdrawals
/// - Total = redeemed_amount + accumulated_interest
#[test]
fn test_seller_receives_principal_plus_interest() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, BrewBidAuction);
    let client = BrewBidAuctionClient::new(&env, &contract_id);

    // Register mock vault
    let vault_id = env.register_contract(None, MockVault);
    let vault_client = MockVaultClient::new(&env, &vault_id);

    let admin = Address::generate(&env);
    let bidder1 = Address::generate(&env);
    let bidder2 = Address::generate(&env);
    
    // Create a real token for testing
    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract(token_admin.clone());
    let token_base_client = token::Client::new(&env, &token_id);
    let token_client = token::StellarAssetClient::new(&env, &token_id);

    // Initialize mock vault with token
    vault_client.initialize(&token_id);

    let item_name = String::from_str(&env, "BrewBid Rare Mug");

    // 1. Initialize Auction
    client.initialize(&admin, &item_name, &token_id, &3600, &vault_id);

    // Mint tokens to bidders
    token_client.mint(&bidder1, &1000);
    token_client.mint(&bidder2, &2000);

    // 2. First Bid (100 tokens)
    client.bid(&bidder1, &100);
    assert_eq!(client.get_highest_bid(), 100); // 100 shares

    // Simulate 10% yield on bidder1's 100 tokens by minting to vault
    // Vault now has: 100 (from bid1) + 10 (yield) = 110 tokens
    // Total shares: 100
    token_client.mint(&vault_id, &10);

    // 3. Second Bid (200 tokens) - outbids first
    client.bid(&bidder2, &200);
    assert_eq!(client.get_highest_bid(), 200); // 200 shares

    // 4. Bidder1 withdraws
    // Vault has: 110 (bid1 + yield) + 200 (bid2) = 310 tokens
    // Total shares: 300 (100 from bid1 + 200 from bid2)
    // Bidder1 redeems 100 shares: (100 * 310) / 300 = 103.33 ≈ 103
    // Principal: 100, Interest: 3
    client.withdraw(&bidder1);
    assert_eq!(token_base_client.balance(&bidder1), 1000); // Got principal back
    
    // The accumulated interest should be 3 (not 10) due to proportional calculation
    let accumulated = client.get_accumulated_interest();
    assert!(accumulated >= 3 && accumulated <= 4, "Expected accumulated interest around 3-4, got {}", accumulated);

    // Simulate additional yield on remaining vault balance
    // Vault now has: 207 (after bidder1 withdrawal) + 23 (additional yield) = 230 tokens
    // This gives us more yield for the seller
    token_client.mint(&vault_id, &23);

    // 5. End Auction
    env.ledger().set_timestamp(env.ledger().timestamp() + 4000);
    client.end_auction();
    
    // Seller should receive:
    // - Winning bid redemption: (200 shares * 230 tokens) / 200 shares = 230
    // - Accumulated interest: 3
    // - Total: 233
    let seller_balance = token_base_client.balance(&admin);
    assert!(seller_balance >= 232 && seller_balance <= 234, "Expected seller balance around 232-234, got {}", seller_balance);
}
