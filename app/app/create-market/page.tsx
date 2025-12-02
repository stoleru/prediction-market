'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { usePredictionMarketProgram } from '../../hooks/usePredictionMarket';

export default function CreateMarketPage() {
  const { connected } = useWallet();
  const router = useRouter();
  const { initializeMarket } = usePredictionMarketProgram();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    marketId: 0,
    question: '',
    daysUntilResolution: 7,
    initialLiquidity: 1,
  });

  useEffect(() => {
    // Generate market ID based on current timestamp
    setFormData(prev => ({
      ...prev,
      marketId: Math.floor(Date.now() / 1000)
    }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.question.trim()) {
      toast.error('Please enter a question');
      return;
    }

    try {
      setLoading(true);
      const now = Math.floor(Date.now() / 1000);
      const resolutionTime = now + formData.daysUntilResolution * 24 * 60 * 60;

      await toast.promise(
        initializeMarket(
          formData.marketId,
          formData.question,
          resolutionTime,
          formData.initialLiquidity * 1e9
        ),
        {
          loading: 'Creating market...',
          success: 'Market created successfully!',
          error: 'Failed to create market',
        }
      );

      // Reset form for next market
      setFormData({
        marketId: Math.floor(Date.now() / 1000),
        question: '',
        daysUntilResolution: 7,
        initialLiquidity: 1,
      });

      // Redirect to homepage after a short delay
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/">
              <h1 className="text-3xl font-bold text-white hover:text-blue-400 transition-colors cursor-pointer">
                Prediction Market
              </h1>
            </Link>
            <WalletMultiButton />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {!connected ? (
          <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-8 text-center">
            <p className="text-yellow-100 text-lg">
              Please connect your wallet to create a market
            </p>
          </div>
        ) : (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-8">
            <h2 className="text-3xl font-bold text-white mb-8">Create New Market</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Market ID */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Market ID
                </label>
                <input
                  type="text"
                  value={formData.marketId}
                  disabled
                  className="w-full px-4 py-2 bg-slate-600 border border-slate-600 rounded-lg text-slate-400 cursor-not-allowed opacity-75"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Auto-generated based on current timestamp
                </p>
              </div>

              {/* Question */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Question
                </label>
                <textarea
                  value={formData.question}
                  onChange={(e) =>
                    setFormData({ ...formData, question: e.target.value })
                  }
                  placeholder="e.g., Will SOL price exceed $200 by end of week?"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  rows={4}
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Be clear and specific about what participants are betting on
                </p>
              </div>

              {/* Resolution Time */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Resolution Time (days from now)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.daysUntilResolution}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      daysUntilResolution: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Market will auto-resolve after this time
                </p>
              </div>

              {/* Initial Liquidity */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Initial Liquidity (SOL)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={formData.initialLiquidity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      initialLiquidity: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Initial pool for both YES and NO positions
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
                <p className="text-sm text-blue-100">
                  <span className="font-semibold">Initial Setup:</span> You will
                  create YES and NO pools with equal liquidity. The constant product
                  formula (x*y=k) will determine token prices.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors"
                >
                  {loading ? 'Creating Market...' : 'Create Market'}
                </button>
                <Link href="/" className="flex-1">
                  <button
                    type="button"
                    className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
