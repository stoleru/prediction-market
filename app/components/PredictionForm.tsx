'use client';

import { useState } from 'react';

interface PredictionFormProps {
  onSubmit: (data: {
    marketId: number;
    predictionType: boolean;
    amount: number;
  }) => Promise<void>;
  loading: boolean;
}

export default function PredictionForm({
  onSubmit,
  loading,
}: PredictionFormProps) {
  const [formData, setFormData] = useState({
    marketId: 1,
    predictionType: true,
    amount: 0.5,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await onSubmit({
      marketId: formData.marketId,
      predictionType: formData.predictionType,
      amount: formData.amount * 1e9, // Convert SOL to lamports
    });

    setFormData({
      marketId: 1,
      predictionType: true,
      amount: 0.5,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Market ID
        </label>
        <input
          type="number"
          value={formData.marketId}
          onChange={(e) =>
            setFormData({ ...formData, marketId: parseInt(e.target.value) })
          }
          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Prediction
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, predictionType: true })}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              formData.predictionType
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            YES
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, predictionType: false })}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              !formData.predictionType
                ? 'bg-red-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            NO
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Amount (SOL)
        </label>
        <input
          type="number"
          step="0.1"
          min="0.1"
          value={formData.amount}
          onChange={(e) =>
            setFormData({ ...formData, amount: parseFloat(e.target.value) })
          }
          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg transition-colors"
      >
        {loading ? 'Placing...' : 'Place Prediction'}
      </button>
    </form>
  );
}
