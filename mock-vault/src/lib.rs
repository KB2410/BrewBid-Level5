#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env};

#[contracttype]
pub enum VaultDataKey {
    Token,
    TotalShares,
}

#[contract]
pub struct MockVault;

#[contractimpl]
impl MockVault {
    pub fn initialize(env: Env, token: Address) {
        env.storage().instance().set(&VaultDataKey::Token, &token);
        env.storage().instance().set(&VaultDataKey::TotalShares, &0i128);
    }
    
    pub fn deposit(env: Env, _depositor: Address, amount: i128) -> i128 {
        let mut total_shares: i128 = env.storage()
            .instance()
            .get(&VaultDataKey::TotalShares)
            .unwrap_or(0i128);
        total_shares += amount;
        env.storage().instance().set(&VaultDataKey::TotalShares, &total_shares);
        amount
    }
    
    pub fn redeem(env: Env, redeemer: Address, shares: i128) -> i128 {
        let token_id: Address = env.storage().instance().get(&VaultDataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_id);
        
        let vault_balance = token_client.balance(&env.current_contract_address());
        let total_shares: i128 = env.storage()
            .instance()
            .get(&VaultDataKey::TotalShares)
            .unwrap_or(shares);
        
        let redeemed_amount = if total_shares > 0 && vault_balance > 0 {
            (shares * vault_balance) / total_shares
        } else {
            shares
        };
        
        if total_shares >= shares {
            let remaining_shares = total_shares - shares;
            env.storage().instance().set(&VaultDataKey::TotalShares, &remaining_shares);
        }
        
        token_client.transfer(&env.current_contract_address(), &redeemer, &redeemed_amount);
        redeemed_amount
    }
    
    pub fn preview_redeem(env: Env, shares: i128) -> i128 {
        let token_id_opt: Option<Address> = env.storage().instance().get(&VaultDataKey::Token);
        if token_id_opt.is_none() {
            return shares;
        }
        
        let token_id = token_id_opt.unwrap();
        let token_client = token::Client::new(&env, &token_id);
        let vault_balance = token_client.balance(&env.current_contract_address());
        let total_shares: i128 = env.storage()
            .instance()
            .get(&VaultDataKey::TotalShares)
            .unwrap_or(shares);
        
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
