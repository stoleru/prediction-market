import { useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import IDL from '../idl/prediction_market.json';
import toast from 'react-hot-toast';
import { getMarketPDA, getVaultPDA, getPredictionPDA } from '../utils/pda';

const PROGRAM_ID = new PublicKey('6ya283kCp8zAet2hnHQAokhDrBw1DiCdvPtWK3gWXVgp');

export function usePredictionMarketProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const getProgram = useCallback((): Program<Idl> | null => {
    if (!wallet.publicKey || !wallet.signTransaction) return null;

    const provider = new AnchorProvider(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions || (async (txs) => txs),
      },
      {
        commitment: 'confirmed',
      }
    );
    return new Program(IDL as Idl, provider);
  }, [connection, wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions])
  
  const initializeMarket = useCallback(
    async (
      marketId: number,
      question: string,
      resolutionTime: number,
      initialLiquidity: number
    ) => {
      const program = getProgram();
      if (!program) throw new Error('Wallet not connected');
      if (!wallet.publicKey) throw new Error('Wallet not connected');

      const marketIdBN = new BN(marketId);
      const [marketPDA] = getMarketPDA(marketIdBN, PROGRAM_ID);
      const [vaultPDA] = getVaultPDA(marketIdBN, PROGRAM_ID);

      return program.methods
        .initializeMarket(
          marketIdBN,
          question,
          new BN(resolutionTime),
          new BN(initialLiquidity)
        )
        .accounts({
          market: marketPDA,
          creator: wallet.publicKey,
          marketVault: vaultPDA,
          yesTokenVault: vaultPDA,
          noTokenVault: vaultPDA,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    },
    [getProgram, wallet.publicKey]
  );

  const placePrediction = useCallback(
    async (marketId: number, predictionType: boolean, amount: number) => {
      const program = getProgram();
      if (!program) throw new Error('Wallet not connected');
      if (!wallet.publicKey) throw new Error('Wallet not connected');

      const marketIdBN = new BN(marketId);
      const [marketPDA] = getMarketPDA(marketIdBN, PROGRAM_ID);
      const [vaultPDA] = getVaultPDA(marketIdBN, PROGRAM_ID);
      const [predictionPDA] = getPredictionPDA(marketIdBN, wallet.publicKey, PROGRAM_ID);

      return program.methods
        .placePrediction(marketIdBN, predictionType, new BN(amount))
        .accounts({
          market: marketPDA,
          marketVault: vaultPDA,
          predictionAccount: predictionPDA,
          predictor: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    },
    [getProgram, wallet.publicKey]
  );

  const resolveMarket = useCallback(
    async (marketId: number, outcome: boolean) => {
      const program = getProgram();
      if (!program) throw new Error('Wallet not connected');
      if (!wallet.publicKey) throw new Error('Wallet not connected');

      const marketIdBN = new BN(marketId);
      const [marketPDA] = getMarketPDA(marketIdBN, PROGRAM_ID);

      return program.methods
        .resolveMarket(marketIdBN, outcome)
        .accounts({
          market: marketPDA,
          admin: wallet.publicKey,
        })
        .rpc();
    },
    [getProgram, wallet.publicKey]
  );

  const claimReward = useCallback(
    async (marketId: number) => {
      const program = getProgram();
      if (!program) throw new Error('Wallet not connected');
      if (!wallet.publicKey) throw new Error('Wallet not connected');

      const marketIdBN = new BN(marketId);
      const [marketPDA] = getMarketPDA(marketIdBN, PROGRAM_ID);
      const [vaultPDA] = getVaultPDA(marketIdBN, PROGRAM_ID);
      const [predictionPDA] = getPredictionPDA(marketIdBN, wallet.publicKey, PROGRAM_ID);

      return program.methods
        .claimReward(marketIdBN)
        .accounts({
          market: marketPDA,
          marketVault: vaultPDA,
          predictionAccount: predictionPDA,
          claimer: wallet.publicKey,
        })
        .rpc();
    },
    [getProgram, wallet.publicKey]
  );

  const fetchMarkets = useCallback(async () => {
    const program = getProgram();
    if (!program) throw new Error('Wallet not connected');

    try {
      // Get all accounts for the Market type
      const markets = await program.account.market.all();
      
      return markets.map((account: { account: { marketId: BN; question: string; creator: PublicKey; createdAt: BN; resolutionTime: BN; yesPool: BN; noPool: BN; totalLiquidity: BN; resolved: boolean; outcome: boolean | null; yesTokenVault: PublicKey; noTokenVault: PublicKey; feeCollected: BN } }) => ({
        marketId: account.account.marketId.toNumber(),
        question: account.account.question,
        creator: account.account.creator,
        createdAt: account.account.createdAt.toNumber(),
        resolutionTime: account.account.resolutionTime.toNumber(),
        yesPool: account.account.yesPool.toNumber(),
        noPool: account.account.noPool.toNumber(),
        totalLiquidity: account.account.totalLiquidity.toNumber(),
        resolved: account.account.resolved,
        outcome: account.account.outcome,
        yesTokenVault: account.account.yesTokenVault,
        noTokenVault: account.account.noTokenVault,
        feeCollected: account.account.feeCollected.toNumber(),
        initialLiquidity: account.account.totalLiquidity.toNumber() / 2,
      }));
    } catch (error) {
      toast.error('Error fetching markets');
      return [];
    }
  }, [getProgram]);

  return {
    initializeMarket,
    placePrediction,
    resolveMarket,
    claimReward,
    fetchMarkets,
    program: getProgram(),
  };
}