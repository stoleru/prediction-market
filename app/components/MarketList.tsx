'use client';

import { useState, useMemo } from 'react';
import MarketDetailDrawer from './MarketDetailDrawer';

interface Market {
  marketId: number;
  question: string;
  resolutionTime: number;
  initialLiquidity: number;
  yesPool: number;
  noPool: number;
  resolved: boolean;
}

interface MarketListProps {
  markets: Market[];
  loading: boolean;
  onBetPlaced?: () => void;
}

export default function MarketList({ markets, loading, onBetPlaced }: MarketListProps) {
  const [filter, setFilter] = useState<'active' | 'past'>('active');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);

  const [now] = useState(() => Math.floor(Date.now() / 1000));
  const filteredMarkets = markets.filter((market) => {
    const isActive = !market.resolved && market.resolutionTime > now;
    return filter === 'active' ? isActive : !isActive;
  });

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getPoolRatio = (yes: number, no: number) => {
    if (yes + no === 0) return '50/50';
    const yesPercent = Math.round((yes / (yes + no)) * 100);
    return `${yesPercent}/${100 - yesPercent}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Filter Tabs */}
        <div className="flex gap-4 border-b border-slate-700">
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 font-medium transition-colors ${
              filter === 'active'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Active Markets
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-4 py-2 font-medium transition-colors ${
              filter === 'past'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Past Markets
          </button>
        </div>

        {/* Markets Grid */}
        {filteredMarkets.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">
              No {filter} markets available
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMarkets.map((market) => (
              <div
                key={market.marketId}
                onClick={() => setSelectedMarket(market)}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors"
              >
                <h3 className="text-lg font-semibold text-white mb-3 line-clamp-2">
                  {market.question}
                </h3>

                <div className="space-y-2 text-sm text-slate-400 mb-4">
                  <div className="flex justify-between">
                    <span>Market ID:</span>
                    <span className="text-white">{market.marketId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pool Ratio:</span>
                    <span className="text-white">
                      {getPoolRatio(market.yesPool, market.noPool)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Liquidity:</span>
                    <span className="text-white">
                      {(market.initialLiquidity / 1e9).toFixed(2)} SOL
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-700">
                  <p className="text-xs text-slate-500">
                    Resolves: {formatTime(market.resolutionTime)}
                  </p>
                </div>

                {filter === 'active' && (
                  <button className="w-full mt-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors">
                    Place Bet
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Market Detail Drawer */}
      {selectedMarket && (
        <MarketDetailDrawer
          market={selectedMarket}
          onClose={() => setSelectedMarket(null)}
          onBetPlaced={onBetPlaced}
        />
      )}
    </>
  );
}
