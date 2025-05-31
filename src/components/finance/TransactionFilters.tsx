import React from 'react';
import { Filter } from 'lucide-react';
import type { Journal } from '../../types/finance';

interface TransactionFiltersProps {
  journals: Journal[];
  selectedJournal: string;
  onJournalChange: (journalId: string) => void;
  dateRange: {
    start: string;
    end: string;
  };
  onDateRangeChange: (range: { start: string; end: string }) => void;
  amountRange: {
    min: string;
    max: string;
  };
  onAmountRangeChange: (range: { min: string; max: string }) => void;
  onReset: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}

export default function TransactionFilters({
  journals,
  selectedJournal,
  onJournalChange,
  dateRange,
  onDateRangeChange,
  amountRange,
  onAmountRangeChange,
  onReset,
  showFilters,
  onToggleFilters,
}: TransactionFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          onClick={onToggleFilters}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
            showFilters
              ? 'bg-primary-100 text-primary-700'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Filter className="h-5 w-5" />
          Filtres
        </button>
      </div>

      {showFilters && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Journal</label>
              <select
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                value={selectedJournal}
                onChange={(e) => onJournalChange(e.target.value)}
              >
                <option value="all">Tous les journaux</option>
                {journals.map(journal => (
                  <option key={journal.id} value={journal.id}>
                    {journal.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Période</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="date"
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={dateRange.start}
                  onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
                />
                <input
                  type="date"
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={dateRange.end}
                  onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Montant</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={amountRange.min}
                  onChange={(e) => onAmountRangeChange({ ...amountRange, min: e.target.value })}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={amountRange.max}
                  onChange={(e) => onAmountRangeChange({ ...amountRange, max: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={onReset}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Réinitialiser les filtres
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}