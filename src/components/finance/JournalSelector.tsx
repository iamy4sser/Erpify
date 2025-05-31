import React from 'react';
import type { Journal } from '../../types/finance';

interface JournalSelectorProps {
  journals: Journal[];
  selectedJournal: Journal | null;
  onSelect: (journal: Journal) => void;
}

export default function JournalSelector({ journals, selectedJournal, onSelect }: JournalSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
      {journals.map((journal) => (
        <button
          key={journal.id}
          onClick={() => onSelect(journal)}
          className={`flex flex-col items-start rounded-lg border p-6 transition-colors ${
            selectedJournal?.id === journal.id
              ? 'border-primary-600 bg-primary-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
              journal.type === 'purchase' ? 'bg-purple-100 text-purple-600' :
              journal.type === 'sale' ? 'bg-green-100 text-green-600' :
              journal.type === 'bank' ? 'bg-blue-100 text-blue-600' :
              'bg-gray-100 text-gray-600'
            }`}>
              {journal.code.charAt(0).toUpperCase()}
            </span>
            <span className="font-medium text-gray-900">{journal.name}</span>
          </div>
          <span className="mt-2 text-sm text-gray-500">{journal.code}</span>
        </button>
      ))}
    </div>
  );
}