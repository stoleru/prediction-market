import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

/**
 * Derives the Market PDA for a given market ID
 * Seeds: ["market", market_id as u64 LE bytes]
 */
export const getMarketPDA = (marketId: BN, programId: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("market"), marketId.toArrayLike(Buffer, "le", 8)],
    programId
  );
};

/**
 * Derives the Vault PDA for a given market ID
 * Seeds: ["vault", market_id as u64 LE bytes]
 */
export const getVaultPDA = (marketId: BN, programId: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), marketId.toArrayLike(Buffer, "le", 8)],
    programId
  );
};

/**
 * Derives the Prediction PDA for a given market ID and predictor
 * Seeds: ["prediction", market_id as u64 LE bytes, predictor pubkey]
 */
export const getPredictionPDA = (
  marketId: BN,
  predictor: PublicKey,
  programId: PublicKey
) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("prediction"),
      marketId.toArrayLike(Buffer, "le", 8),
      predictor.toBuffer(),
    ],
    programId
  );
};
