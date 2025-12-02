# Solana Prediction Market

A decentralized prediction market smart contract built on Solana using the Anchor framework. Users can create markets on future events, place predictions (YES/NO), and claim rewards if their predictions win.

## Features

- **Market Creation**: Create prediction markets with custom questions and resolution times
- **Binary Predictions**: Predict YES or NO on market outcomes
- **AMM Pricing**: Uses constant product formula for fair token pricing
- **Reward Distribution**: Winners claim rewards based on their prediction share
- **Admin Controls**: Market creators can resolve markets and withdraw fees

## Project Structure

```
.
├── programs/
│   └── prediction-market/
│       ├── src/
│       │   └── lib.rs          # Main smart contract
│       └── Cargo.toml
├── tests/
│   └── prediction-market.ts    # Integration tests
├── Anchor.toml                 # Anchor configuration
├── Cargo.toml                  # Workspace configuration
├── package.json
└── tsconfig.json
```

## Quick Start

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor Framework](https://www.anchor-lang.com/docs/installation)
- [Node.js](https://nodejs.org/) (v16+)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd prediction-market

# Install dependencies
yarn install

# Build the program
anchor build
```

### Local Development

```bash
# Start local Solana validator
solana-test-validator

# Run tests
anchor test

# Deploy locally
anchor deploy
```

### Devnet Deployment

```bash
# Switch to devnet
solana config set --url devnet

# Airdrop SOL (if needed)
solana airdrop 5

# Deploy
anchor deploy
```

## Program Instructions

### Initialize Market
Creates a new prediction market.

**Parameters:**
- `market_id`: Unique market identifier
- `question`: Market question (max 256 chars)
- `resolution_time`: Unix timestamp for resolution
- `initial_liquidity`: Initial SOL liquidity (split equally between YES/NO pools)

### Place Prediction
Place a prediction on a market outcome.

**Parameters:**
- `market_id`: Market ID
- `prediction_type`: true for YES, false for NO
- `amount`: SOL amount to deposit

### Resolve Market
Resolve the market with the actual outcome (creator only).

**Parameters:**
- `market_id`: Market ID
- `outcome`: true if YES won, false if NO won

### Claim Reward
Claim rewards if your prediction was correct.

**Parameters:**
- `market_id`: Market ID

### Withdraw Fees
Admin withdraw collected fees (creator only).

**Parameters:**
- `market_id`: Market ID
- `amount`: Amount to withdraw

## Architecture

### State

- **Market**: Stores market data (question, pools, outcome, etc.)
- **Prediction**: Stores individual predictions per user

### Key Formulas

**Token Minting (AMM):**
```
tokens_out = (amount * pool_size) / (pool_size + amount)
```

**Reward Calculation:**
```
reward = (user_tokens / winning_pool) * total_liquidity
```

## Testing

Run the test suite:

```bash
anchor test
```

Tests cover:
- Market initialization
- Placing predictions
- Market resolution
- Reward claiming
- Authorization checks

## Error Codes

- `InvalidQuestion`: Question is empty or > 256 chars
- `InvalidResolutionTime`: Resolution time is in the past
- `InvalidAmount`: Amount is zero or negative
- `MarketAlreadyResolved`: Cannot modify resolved market
- `MarketExpired`: Market has passed resolution time
- `Unauthorized`: Caller is not authorized
- `AlreadyClaimed`: Reward already claimed by user
- `PredictionLost`: Prediction outcome is incorrect

## Deployment

### Program ID (Devnet)
```
6ya283kCp8zAet2hnHQAokhDrBw1DiCdvPtWK3gWXVgp
```

## Security Notes

- All mathematical operations use safe arithmetic (saturating operations)
- Market vaults use PDA-derived accounts for security
- Admin functions are protected with authorization checks
- Only market creators can resolve their markets

## Future Enhancements

- Multiple outcome markets
- Liquidity pools with LP tokens
- Market trading/secondary market
- Oracle-based automatic resolution
- Fees distributed to liquidity providers

## License

MIT

## Contact

For questions or contributions, please open an issue or pull request.
