// Solana Prediction Market Smart Contract
// Built with Anchor Framework
// Portfolio Project: Sports Prediction Market on Solana

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("6ya283kCp8zAet2hnHQAokhDrBw1DiCdvPtWK3gWXVgp");

#[program]
pub mod prediction_market {
    use super::*;

    /// Initialize a new prediction market
    /// Admin creates a market with:
    /// - question: "Will SOL price exceed $200 by end of week?"
    /// - resolution_time: timestamp when market resolves
    /// - yes_token_mint: mint for YES positions
    /// - no_token_mint: mint for NO positions
    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        market_id: u64,
        question: String,
        resolution_time: i64,
        initial_liquidity: u64,
    ) -> Result<()> {
        require!(
            question.len() > 0 && question.len() <= 256,
            MarketError::InvalidQuestion
        );
        require!(
            resolution_time > Clock::get()?.unix_timestamp,
            MarketError::InvalidResolutionTime
        );

        let market = &mut ctx.accounts.market;
        market.market_id = market_id;
        market.question = question;
        market.creator = ctx.accounts.creator.key();
        market.created_at = Clock::get()?.unix_timestamp;
        market.resolution_time = resolution_time;
        market.yes_pool = initial_liquidity.saturating_div(2);
        market.no_pool = initial_liquidity.saturating_div(2);
        market.total_liquidity = initial_liquidity;
        market.resolved = false;
        market.outcome = None;
        market.yes_token_vault = ctx.accounts.yes_token_vault.key();
        market.no_token_vault = ctx.accounts.no_token_vault.key();
        market.fee_collected = 0;

        emit!(MarketCreated {
            market_id,
            creator: ctx.accounts.creator.key(),
            question: market.question.clone(),
            resolution_time,
        });

        Ok(())
    }

    /// User places a prediction
    /// Deposits SOL as collateral, receives either YES or NO tokens
    /// Prices determined by Automated Market Maker (AMM) formula
    pub fn place_prediction(
        ctx: Context<PlacePrediction>,
        market_id: u64,
        prediction_type: bool, // true = YES, false = NO
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, MarketError::InvalidAmount);

        let market = &mut ctx.accounts.market;
        require!(!market.resolved, MarketError::MarketAlreadyResolved);
        require!(
            Clock::get()?.unix_timestamp < market.resolution_time,
            MarketError::MarketExpired
        );

        // Calculate tokens to mint using constant product formula (x * y = k)
        // tokens_out = (amount * pool_size) / (pool_size + amount)
        let tokens_to_mint = if prediction_type {
            let denominator = market.yes_pool.saturating_add(amount);
            (amount as u128)
                .saturating_mul(market.yes_pool as u128)
                .saturating_div(denominator as u128) as u64
        } else {
            let denominator = market.no_pool.saturating_add(amount);
            (amount as u128)
                .saturating_mul(market.no_pool as u128)
                .saturating_div(denominator as u128) as u64
        };

        require!(tokens_to_mint > 0, MarketError::InsufficientOutput);

        // Update pools
        if prediction_type {
            market.yes_pool = market.yes_pool.saturating_add(amount);
        } else {
            market.no_pool = market.no_pool.saturating_add(amount);
        }

        // Transfer SOL to vault
        let transfer_instruction = anchor_lang::solana_program::system_instruction::transfer(
            ctx.accounts.predictor.key,
            ctx.accounts.market_vault.key,
            amount,
        );
        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                ctx.accounts.predictor.to_account_info(),
                ctx.accounts.market_vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        // Store prediction
        let prediction = &mut ctx.accounts.prediction_account;
        prediction.market_id = market_id;
        prediction.predictor = ctx.accounts.predictor.key();
        prediction.prediction_type = prediction_type;
        prediction.amount_deposited = amount;
        prediction.tokens_received = tokens_to_mint;
        prediction.created_at = Clock::get()?.unix_timestamp;
        prediction.claimed = false;

        emit!(PredictionPlaced {
            market_id,
            predictor: ctx.accounts.predictor.key(),
            prediction_type,
            amount,
            tokens_received: tokens_to_mint,
        });

        Ok(())
    }

    /// Admin resolves the market with the outcome
    /// Can only be called after resolution_time has passed
    /// outcome: true = YES won, false = NO won
    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        market_id: u64,
        outcome: bool,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.creator == ctx.accounts.admin.key(), MarketError::Unauthorized);
        require!(!market.resolved, MarketError::MarketAlreadyResolved);
        require!(
            Clock::get()?.unix_timestamp >= market.resolution_time,
            MarketError::MarketNotExpired
        );

        market.resolved = true;
        market.outcome = Some(outcome);

        emit!(MarketResolved {
            market_id,
            outcome,
            yes_pool: market.yes_pool,
            no_pool: market.no_pool,
        });

        Ok(())
    }

    /// Winners claim their rewards
    /// Formula: (user_tokens / winning_pool_total) * (yes_pool + no_pool)
    pub fn claim_reward(ctx: Context<ClaimReward>, market_id: u64) -> Result<()> {
        let market = &ctx.accounts.market;
        let prediction = &mut ctx.accounts.prediction_account;

        require!(market.resolved, MarketError::MarketNotResolved);
        require!(
            prediction.predictor == ctx.accounts.claimer.key(),
            MarketError::Unauthorized
        );
        require!(!prediction.claimed, MarketError::AlreadyClaimed);

        let outcome = market.outcome.ok_or(MarketError::InvalidOutcome)?;

        // Check if prediction was correct
        let prediction_won = prediction.prediction_type == outcome;
        require!(prediction_won, MarketError::PredictionLost);

        // Calculate reward
        let winning_pool = if outcome { market.yes_pool } else { market.no_pool };
        let total_winnings = market.yes_pool.saturating_add(market.no_pool);

        let reward = if winning_pool > 0 {
            (prediction.tokens_received as u128)
                .saturating_mul(total_winnings as u128)
                .saturating_div(winning_pool as u128) as u64
        } else {
            0
        };

        require!(reward > 0, MarketError::NoReward);

        prediction.claimed = true;

        // Transfer reward from vault to claimer
        **ctx.accounts.market_vault.try_borrow_mut_lamports()? -= reward;
        **ctx.accounts.claimer.try_borrow_mut_lamports()? += reward;

        emit!(RewardClaimed {
            market_id,
            claimer: ctx.accounts.claimer.key(),
            reward,
        });

        Ok(())
    }

    /// Admin withdraws collected fees
    pub fn withdraw_fees(ctx: Context<WithdrawFees>, market_id: u64, amount: u64) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.creator == ctx.accounts.admin.key(), MarketError::Unauthorized);
        require!(market.fee_collected >= amount, MarketError::InsufficientFees);

        market.fee_collected = market.fee_collected.saturating_sub(amount);

        **ctx.accounts.market_vault.try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.admin.try_borrow_mut_lamports()? += amount;

        emit!(FeesWithdrawn {
            market_id,
            admin: ctx.accounts.admin.key(),
            amount,
        });

        Ok(())
    }
}

// ==================== ACCOUNTS ====================

#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct InitializeMarket<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + Market::INIT_SPACE,
        seeds = [b"market", market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,

    #[account(mut)]
    pub creator: Signer<'info>,

    /// CHECK: We're just storing the key, not dereferencing
    /// CHECK: Market vault for holding SOL, initialized with zero space
    #[account(
        init,
        payer = creator,
        space = 0,
        seeds = [b"vault", market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market_vault: AccountInfo<'info>,

    /// CHECK: Token vault for YES positions
    pub yes_token_vault: AccountInfo<'info>,

    /// CHECK: Token vault for NO positions
    pub no_token_vault: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct PlacePrediction<'info> {
    #[account(
        mut,
        seeds = [b"market", market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,

    /// CHECK: Market vault for holding SOL
    #[account(
        mut,
        seeds = [b"vault", market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market_vault: AccountInfo<'info>,

    #[account(
        init,
        payer = predictor,
        space = 8 + Prediction::INIT_SPACE,
        seeds = [b"prediction", market_id.to_le_bytes().as_ref(), predictor.key().as_ref()],
        bump
    )]
    pub prediction_account: Account<'info, Prediction>,

    #[account(mut)]
    pub predictor: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct ResolveMarket<'info> {
    #[account(
        mut,
        seeds = [b"market", market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct ClaimReward<'info> {
    #[account(
        seeds = [b"market", market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,

    /// CHECK: Market vault for holding SOL and rewards
    #[account(
        mut,
        seeds = [b"vault", market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market_vault: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"prediction", market_id.to_le_bytes().as_ref(), claimer.key().as_ref()],
        bump
    )]
    pub prediction_account: Account<'info, Prediction>,

    #[account(mut)]
    pub claimer: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct WithdrawFees<'info> {
    #[account(
        mut,
        seeds = [b"market", market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,

    /// CHECK: Market vault for withdrawing collected fees
    #[account(
        mut,
        seeds = [b"vault", market_id.to_le_bytes().as_ref()],
        bump
    )]
    pub market_vault: AccountInfo<'info>,

    pub admin: Signer<'info>,
}

// ==================== STATE ====================

#[account]
pub struct Market {
    pub market_id: u64,
    pub question: String,
    pub creator: Pubkey,
    pub created_at: i64,
    pub resolution_time: i64,
    pub yes_pool: u64,
    pub no_pool: u64,
    pub total_liquidity: u64,
    pub resolved: bool,
    pub outcome: Option<bool>, // true = YES won, false = NO won
    pub yes_token_vault: Pubkey,
    pub no_token_vault: Pubkey,
    pub fee_collected: u64,
}

impl Market {
    pub const INIT_SPACE: usize = 
        8 +           // market_id
        (4 + 256) +   // question (string)
        32 +          // creator
        8 +           // created_at
        8 +           // resolution_time
        8 +           // yes_pool
        8 +           // no_pool
        8 +           // total_liquidity
        1 +           // resolved
        (1 + 1) +     // outcome (Option<bool>)
        32 +          // yes_token_vault
        32 +          // no_token_vault
        8;            // fee_collected
}

#[account]
pub struct Prediction {
    pub market_id: u64,
    pub predictor: Pubkey,
    pub prediction_type: bool, // true = YES, false = NO
    pub amount_deposited: u64,
    pub tokens_received: u64,
    pub created_at: i64,
    pub claimed: bool,
}

impl Prediction {
    pub const INIT_SPACE: usize =
        8 +      // market_id
        32 +     // predictor
        1 +      // prediction_type
        8 +      // amount_deposited
        8 +      // tokens_received
        8 +      // created_at
        1;       // claimed
}

// ==================== EVENTS ====================

#[event]
pub struct MarketCreated {
    pub market_id: u64,
    pub creator: Pubkey,
    pub question: String,
    pub resolution_time: i64,
}

#[event]
pub struct PredictionPlaced {
    pub market_id: u64,
    pub predictor: Pubkey,
    pub prediction_type: bool,
    pub amount: u64,
    pub tokens_received: u64,
}

#[event]
pub struct MarketResolved {
    pub market_id: u64,
    pub outcome: bool,
    pub yes_pool: u64,
    pub no_pool: u64,
}

#[event]
pub struct RewardClaimed {
    pub market_id: u64,
    pub claimer: Pubkey,
    pub reward: u64,
}

#[event]
pub struct FeesWithdrawn {
    pub market_id: u64,
    pub admin: Pubkey,
    pub amount: u64,
}

// ==================== ERRORS ====================

#[error_code]
pub enum MarketError {
    #[msg("Invalid question provided")]
    InvalidQuestion,
    
    #[msg("Invalid resolution time")]
    InvalidResolutionTime,
    
    #[msg("Invalid amount")]
    InvalidAmount,
    
    #[msg("Market already resolved")]
    MarketAlreadyResolved,
    
    #[msg("Market has expired")]
    MarketExpired,
    
    #[msg("Insufficient output tokens")]
    InsufficientOutput,
    
    #[msg("Unauthorized action")]
    Unauthorized,
    
    #[msg("Market not resolved yet")]
    MarketNotResolved,
    
    #[msg("Market resolution time has not passed")]
    MarketNotExpired,
    
    #[msg("Reward already claimed")]
    AlreadyClaimed,
    
    #[msg("Invalid outcome")]
    InvalidOutcome,
    
    #[msg("Prediction did not win")]
    PredictionLost,
    
    #[msg("No reward available")]
    NoReward,
    
    #[msg("Insufficient fees collected")]
    InsufficientFees,
}