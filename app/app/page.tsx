'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { usePredictionMarketProgram } from '../hooks/usePredictionMarket';
import MarketList from '../components/MarketList';

interface Market {
  marketId: number;
  question: string;
  resolutionTime: number;
  initialLiquidity: number;
  yesPool: number;
  noPool: number;
  resolved: boolean;
}

export default function Home() {
  const { connected } = useWallet();
  const { fetchMarkets } = usePredictionMarketProgram();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (connected) {
      loadMarkets();
    }
  }, [connected]);

  const loadMarkets = async () => {
    try {
      setLoading(true);
      const fetchedMarkets = await fetchMarkets();
      setMarkets(fetchedMarkets);
    } catch (error) {
      toast.error('Failed to load markets');
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
            <div>
              <h1 className="text-3xl font-bold text-white">
                Prediction Market
              </h1>
              <p className="text-slate-400 text-sm">
                Built on Solana with Anchor
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/create-market">
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                  Create Market
                </button>
              </Link>
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {!connected ? (
          <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-8 text-center">
            <p className="text-yellow-100 text-lg">
              Please connect your wallet to get started
            </p>
          </div>
        ) : (
          <MarketList markets={markets} loading={loading} onBetPlaced={loadMarkets} />
        )}
      </div>
    </main>
  );
}
