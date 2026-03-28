#![allow(dead_code)]
//! # SEP-56 Tokenized Vault Interface
//! 
//! This module defines the SEP-56 standard interface for tokenized vaults
//! that accept deposits and generate yield through lending protocols or
//! other DeFi mechanisms.
//! 
//! ## Interface Overview
//! 
//! SEP-56 vaults implement a share-based accounting model where:
//! - Users deposit tokens and receive proportional shares
//! - Shares represent ownership in the vault's total assets
//! - As yield accrues, each share's value increases
//! - Users redeem shares to withdraw tokens (principal + yield)
//! 
//! ## Security Considerations
//! 
//! - Vault implementations must handle share/asset ratio correctly
//! - First deposit edge case: avoid share inflation attacks
//! - Redemption must be atomic to prevent partial withdrawals
//! - Total assets and shares must be accurately tracked

use soroban_sdk::{contractclient, Address, Env};

/// SEP-56 Tokenized Vault Interface
/// 
/// This trait defines the standard interface that all SEP-56 compliant
/// vaults must implement. The auction contract uses this interface to
/// deposit bid amounts and redeem them later.
#[contractclient(name = "Sep56VaultClient")]
pub trait Sep56Vault {
    /// Deposits tokens into the vault and returns shares
    /// 
    /// # Arguments
    /// * `env` - Contract environment
    /// * `depositor` - Address making the deposit
    /// * `amount` - Token amount to deposit
    /// 
    /// # Returns
    /// Number of vault shares minted to represent the deposit
    /// 
    /// # Share Calculation
    /// - First deposit: shares = amount (1:1 ratio)
    /// - Subsequent deposits: shares = amount * total_shares / total_assets
    /// 
    /// # Panics
    /// - If amount is zero or negative
    /// - If depositor lacks sufficient token balance
    /// - If vault deposit operation fails
    fn deposit(env: Env, depositor: Address, amount: i128) -> i128;
    
    /// Redeems shares for underlying tokens
    /// 
    /// # Arguments
    /// * `env` - Contract environment
    /// * `redeemer` - Address redeeming shares
    /// * `shares` - Number of shares to redeem
    /// 
    /// # Returns
    /// Amount of tokens returned (principal + accrued yield)
    /// 
    /// # Token Calculation
    /// tokens = shares * total_assets / total_shares
    /// 
    /// # Panics
    /// - If shares is zero or negative
    /// - If redeemer lacks sufficient share balance
    /// - If vault redemption operation fails
    fn redeem(env: Env, redeemer: Address, shares: i128) -> i128;
    
    /// Previews redemption without executing
    /// 
    /// # Arguments
    /// * `env` - Contract environment
    /// * `shares` - Number of shares to preview
    /// 
    /// # Returns
    /// Expected token amount for the shares based on current vault state
    /// 
    /// # Use Cases
    /// - Validate expected redemption amount before executing
    /// - Display estimated withdrawal amounts in UI
    /// - Calculate yield without state changes
    /// 
    /// # Note
    /// The actual redemption amount may differ slightly due to:
    /// - Vault state changes between preview and execution
    /// - Rounding differences in share/asset calculations
    /// - Fees or slippage in underlying yield sources
    fn preview_redeem(env: Env, shares: i128) -> i128;
    
    /// Returns total assets under management
    /// 
    /// # Returns
    /// Total token amount held by the vault, including:
    /// - All deposited principal amounts
    /// - All accrued yield from lending/staking
    /// - Pending rewards not yet claimed
    /// 
    /// # Use Cases
    /// - Calculate share-to-token conversion ratios
    /// - Display total value locked (TVL) in UI
    /// - Validate vault health and solvency
    fn total_assets(env: Env) -> i128;
    
    /// Returns total shares outstanding
    /// 
    /// # Returns
    /// Total number of shares minted across all depositors
    /// 
    /// # Use Cases
    /// - Calculate share-to-token conversion ratios
    /// - Determine individual depositor's proportional ownership
    /// - Validate share accounting correctness
    fn total_shares(env: Env) -> i128;
}
