#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env, String, token};

#[test]
fn test_auction_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, BrewBidAuction);
    let client = BrewBidAuctionClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let bidder1 = Address::generate(&env);
    let bidder2 = Address::generate(&env);
    
    // Create a real token for testing
    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract(token_admin.clone());
    let token_base_client = token::Client::new(&env, &token_id);
    let token_client = token::StellarAssetClient::new(&env, &token_id);

    let item_name = String::from_str(&env, "BrewBid Rare Mug");

    // 1. Initialize Auction
    client.initialize(&admin, &item_name, &token_id, &3600);
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
    assert_eq!(client.get_highest_bid(), 100);
    assert_eq!(token_base_client.balance(&contract_id), 100);

    // 3. Second Bid (Outbid)
    client.bid(&bidder2, &200);
    assert_eq!(client.get_highest_bidder(), Some(bidder2.clone()));
    assert_eq!(client.get_highest_bid(), 200);
    assert_eq!(token_base_client.balance(&contract_id), 300);

    // Check refund allocation for bidder1
    assert_eq!(client.get_refund(&bidder1), 100);

    // 4. Withdraw Refund
    client.withdraw(&bidder1);
    assert_eq!(client.get_refund(&bidder1), 0);
    assert_eq!(token_base_client.balance(&bidder1), 1000);

    // 5. End Auction (Advance Time)
    env.ledger().set_timestamp(env.ledger().timestamp() + 4000);
    
    // Check state before end_auction
    assert_eq!(client.get_highest_bid(), 200);

    // Perform end_auction
    client.end_auction();
    
    // Note: The logic in lib.rs currently does NOT reset highest_bid to 0.
    // Wait, let me check the code I wrote...
    // In Step 46/238, I didn't add a reset in end_auction.
    // Ah! I see. If I didn't reset it, then get_highest_bid() should stay 200.
    // But why would the balance be 0?
    
    // Let's re-verify the balance of Admin
    assert_eq!(token_base_client.balance(&admin), 200);
    
    // Remaining balance in contract should be 0 
    assert_eq!(token_base_client.balance(&contract_id), 0);
}

#[test]
#[should_panic(expected = "Bid must be higher than the current highest bid")]
fn test_low_bid_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, BrewBidAuction);
    let client = BrewBidAuctionClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let bidder = Address::generate(&env);
    
    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract(token_admin);
    let token_client = token::StellarAssetClient::new(&env, &token_id);

    let item_name = String::from_str(&env, "Test");

    client.initialize(&admin, &item_name, &token_id, &3600);
    token_client.mint(&bidder, &1000);

    client.bid(&bidder, &100);
    client.bid(&bidder, &50); // Should panic
}

#[test]
#[should_panic(expected = "Auction has already ended")]
fn test_bid_after_end_fails() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, BrewBidAuction);
    let client = BrewBidAuctionClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let bidder = Address::generate(&env);
    
    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract(token_admin);
    let token_client = token::StellarAssetClient::new(&env, &token_id);

    let item_name = String::from_str(&env, "Test");

    // Initialize with a 1-second duration
    client.initialize(&admin, &item_name, &token_id, &1);
    token_client.mint(&bidder, &1000);

    // Advance ledger time by 2 seconds to ensure the auction has ended
    env.ledger().set_timestamp(env.ledger().timestamp() + 2);

    client.bid(&bidder, &100); // Should panic
}
