'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { usePredictionMarketProgram } from '../hooks/usePredictionMarket';

interface Market {
  marketId: number;
  question: string;
  resolutionTime: number;
  initialLiquidity: number;
  yesPool: number;
  noPool: number;
  resolved: boolean;
}

interface MarketDetailDrawerProps {
  market: Market;
  onClose: () => void;
  onBetPlaced?: () => void;
}

export default function MarketDetailDrawer({
  market,
  onClose,
  onBetPlaced,
}: MarketDetailDrawerProps) {
  const { placePrediction } = usePredictionMarketProgram();
  const [predictionType, setPredictionType] = useState(true);
  const [amount, setAmount] = useState(0.5);
  const [loading, setLoading] = useState(false);

  const calculateTokens = (depositAmount: number, pool: number) => {
    const denominator = pool + depositAmount;
    return (depositAmount * pool) / denominator;
  };

  const expectedTokens = calculateTokens(
    amount * 1e9,
    predictionType ? market.yesPool : market.noPool
  );

  const handlePlaceBet = async () => {
    if (amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      await toast.promise(
        placePrediction(
          market.marketId,
          predictionType,
          amount * 1e9
        ),
        {
          loading: 'Placing bet...',
          success: 'Bet placed successfully!',
          error: (err) => `Failed to place bet: ${err?.message || 'Unknown error'}`,
        }
      );
      
      // Refresh markets to update pool ratios
      if (onBetPlaced) {
        onBetPlaced();
      }
      
      onClose();
    } catch (_error: unknown) {
      
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-800 border-l border-slate-700 z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-white">Place Bet</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Market Question */}
          <div className="mb-6 pb-6 border-b border-slate-700">
            <p className="text-slate-400 text-sm mb-2">Market Question</p>
            <h3 className="text-lg font-semibold text-white">
              {market.question}
            </h3>
          </div>

          {/* Pool Information */}
          <div className="mb-6 pb-6 border-b border-slate-700">
            <p className="text-slate-400 text-sm mb-3">Current Pools</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-300">YES Pool:</span>
                <span className="text-white font-medium">
                  {(market.yesPool / 1e9).toFixed(3)} SOL
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">NO Pool:</span>
                <span className="text-white font-medium">
                  {(market.noPool / 1e9).toFixed(3)} SOL
                </span>
              </div>
            </div>
          </div>

          {/* Prediction Type */}
          <div className="mb-6 pb-6 border-b border-slate-700">
            <p className="text-slate-400 text-sm mb-3">Your Prediction</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPredictionType(true)}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  predictionType
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                YES
              </button>
              <button
                onClick={() => setPredictionType(false)}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  !predictionType
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                NO
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div className="mb-6 pb-6 border-b border-slate-700">
            <label className="block text-slate-400 text-sm mb-2">
              Amount (SOL)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value))}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Expected Outcome */}
          <div className="mb-6 pb-6 border-b border-slate-700">
            <p className="text-slate-400 text-sm mb-2">Expected Tokens</p>
            <p className="text-2xl font-bold text-white">
              {(expectedTokens / 1e9).toFixed(4)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Based on current AMM formula
            </p>
          </div>

          {/* Place Bet Button */}
          <button
            onClick={handlePlaceBet}
            disabled={loading || amount <= 0}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Placing Bet...' : 'Place Bet'}
          </button>
        </div>
      </div>
    </>
  );
}
