import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Plus, Trash2, Calculator, Edit, X } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { format, parse, addMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { TreasuryScenario, TreasuryEntry } from '../../types/finance';

export default function TreasuryPlanning() {
  const [scenarios, setScenarios] = React.useState<TreasuryScenario[]>([]);
  const [entries, setEntries] = React.useState<TreasuryEntry[]>([]);
  const [startDate, setStartDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = React.useState(
    addMonths(new Date(), 11).toISOString().split('T')[0]
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isNewScenarioModalOpen, setIsNewScenarioModalOpen] = React.useState(false);
  const [newScenario, setNewScenario] = React.useState({
    name: '',
    description: '',
    type: 'expense' as const,
    order: 0
  });
  const [initialBalance, setInitialBalance] = React.useState(0);

  // Fetch scenarios and entries
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [scenariosRes, entriesRes] = await Promise.all([
          axios.get('http://localhost:3000/api/treasury/scenarios'),
          axios.get('http://localhost:3000/api/treasury/entries', {
            params: { startDate, endDate }
          })
        ]);

        setScenarios(scenariosRes.data);
        setEntries(entriesRes.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Une erreur est survenue lors du chargement des données');
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  // Generate months between start and end date
  const months = React.useMemo(() => {
    const months = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    let current = start;

    while (current <= end) {
      months.push(format(current, 'yyyy-MM-dd'));
      current = addMonths(current, 1);
    }

    return months;
  }, [startDate, endDate]);

  // Calculate totals for each month
  const monthlyTotals = React.useMemo(() => {
    return months.map(month => {
      const monthEntries = entries.filter(entry => entry.month === month);
      
      const incomes = monthEntries
        .filter(entry => scenarios.find(s => s.id === entry.scenario_id)?.type === 'income')
        .reduce((sum, entry) => sum + entry.amount, 0);

      const expenses = monthEntries
        .filter(entry => scenarios.find(s => s.id === entry.scenario_id)?.type === 'expense')
        .reduce((sum, entry) => sum + entry.amount, 0);

      return {
        month,
        cashFlow: incomes - expenses
      };
    });
  }, [months, entries, scenarios]);

  // Calculate running balance
  const balances = React.useMemo(() => {
    let balance = initialBalance; // Start with initial balance
    return monthlyTotals.map(({ month, cashFlow }) => {
      balance += cashFlow;
      return { month, opening: balance - cashFlow, closing: balance };
    });
  }, [monthlyTotals, initialBalance]);

  const handleUpdateEntry = async (scenarioId: number, month: string, amount: number) => {
    try {
      await axios.post('http://localhost:3000/api/treasury/entries', {
        scenario_id: scenarioId,
        month,
        amount
      });

      setEntries(prev => {
        const index = prev.findIndex(e => e.scenario_id === scenarioId && e.month === month);
        if (index >= 0) {
          return [
            ...prev.slice(0, index),
            { ...prev[index], amount },
            ...prev.slice(index + 1)
          ];
        }
        return [...prev, { id: Date.now(), scenario_id: scenarioId, month, amount }];
      });
    } catch (error) {
      console.error('Error updating entry:', error);
      setError('Une erreur est survenue lors de la mise à jour des données');
    }
  };

  const handleCreateScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:3000/api/treasury/scenarios', newScenario);
      setScenarios(prev => [...prev, response.data]);
      setIsNewScenarioModalOpen(false);
      setNewScenario({ name: '', description: '', type: 'expense', order: 0 });
    } catch (error) {
      console.error('Error creating scenario:', error);
      setError('Une erreur est survenue lors de la création du scénario');
    }
  };

  const handleDeleteScenario = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce scénario ?')) return;

    try {
      await axios.delete(`http://localhost:3000/api/treasury/scenarios/${id}`);
      setScenarios(prev => prev.filter(s => s.id !== parseInt(id)));
      setEntries(prev => prev.filter(e => e.scenario_id !== parseInt(id)));
    } catch (error) {
      console.error('Error deleting scenario:', error);
      setError('Une erreur est survenue lors de la suppression du scénario');
    }
  };

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    
    // Prepare data for export
    const wsData = [
      ['Tableau de trésorerie', ...Array(months.length).fill('')],
      ['MAD', ...months.map(m => format(new Date(m), 'MMM yy', { locale: fr }))],
      ['Solde initial', ...balances.map(b => b.opening)],
      ['', ...Array(months.length).fill('')],
      ...scenarios
        .filter(s => s.type === 'income')
        .map(scenario => [
          scenario.name,
          ...months.map(month => 
            entries.find(e => e.scenario_id === scenario.id && e.month === month)?.amount || 0
          )
        ]),
      ['', ...Array(months.length).fill('')],
      ...scenarios
        .filter(s => s.type === 'expense')
        .map(scenario => [
          scenario.name,
          ...months.map(month => 
            entries.find(e => e.scenario_id === scenario.id && e.month === month)?.amount || 0
          )
        ]),
      ['', ...Array(months.length).fill('')],
      ['Cash Flow', ...monthlyTotals.map(m => m.cashFlow)],
      ['', ...Array(months.length).fill('')],
      ['Solde final', ...balances.map(b => b.closing)]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Trésorerie');
    XLSX.writeFile(wb, `tresorerie_${startDate}_${endDate}.xlsx`);
  };

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      <div className="mb-8">
        <Link
          to="/finance"
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la comptabilité
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Plan de trésorerie</h1>
            <p className="mt-2 text-sm text-gray-700">
              Gérez votre plan de trésorerie et simulez différents scénarios
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsNewScenarioModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              <Plus className="h-5 w-5" />
              Nouveau scénario
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              <FileText className="h-5 w-5" />
              Exporter Excel
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Période du</label>
          <input
            type="date"
            className="mt-1 block w-full rounded-lg border-gray-300"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">au</label>
          <input
            type="date"
            className="mt-1 block w-full rounded-lg border-gray-300"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Solde initial</label>
          <input
            type="number"
            className="mt-1 block w-full rounded-lg border-gray-300"
            value={initialBalance}
            onChange={(e) => setInitialBalance(Number(e.target.value))}
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Scénario
              </th>
              {months.map(month => (
                <th key={month} scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {format(new Date(month), 'MMM yy', { locale: fr })}
                </th>
              ))}
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            <tr className="bg-gray-50 font-medium">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                Solde initial
              </td>
              {balances.map(({ month, opening }) => (
                <td key={month} className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {opening.toLocaleString('fr-FR')}
                </td>
              ))}
              <td className="px-6 py-4 whitespace-nowrap"></td>
            </tr>

            {/* Income scenarios */}
            {scenarios
              .filter(s => s.type === 'income')
              .sort((a, b) => a.order - b.order)
              .map(scenario => (
                <tr key={scenario.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{scenario.name}</div>
                    {scenario.description && (
                      <div className="text-sm text-gray-500">{scenario.description}</div>
                    )}
                  </td>
                  {months.map(month => (
                    <td key={month} className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        className="w-full text-right border-0 focus:ring-0"
                        value={entries.find(e => e.scenario_id === scenario.id && e.month === month)?.amount || 0}
                        onChange={(e) => handleUpdateEntry(scenario.id, month, Number(e.target.value))}
                      />
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteScenario(scenario.id.toString())}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}

            {/* Expense scenarios */}
            {scenarios
              .filter(s => s.type === 'expense')
              .sort((a, b) => a.order - b.order)
              .map(scenario => (
                <tr key={scenario.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{scenario.name}</div>
                    {scenario.description && (
                      <div className="text-sm text-gray-500">{scenario.description}</div>
                    )}
                  </td>
                  {months.map(month => (
                    <td key={month} className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        className="w-full text-right border-0 focus:ring-0"
                        value={entries.find(e => e.scenario_id === scenario.id && e.month === month)?.amount || 0}
                        onChange={(e) => handleUpdateEntry(scenario.id, month, Number(e.target.value))}
                      />
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDeleteScenario(scenario.id.toString())}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}

            {/* Cash flow and closing balance */}
            <tr className="bg-gray-50 font-medium">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                Cash Flow
              </td>
              {monthlyTotals.map(({ month, cashFlow }) => (
                <td key={month} className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {cashFlow.toLocaleString('fr-FR')}
                </td>
              ))}
              <td className="px-6 py-4 whitespace-nowrap"></td>
            </tr>
            <tr className="bg-gray-50 font-medium">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                Solde final
              </td>
              {balances.map(({ month, closing }) => (
                <td key={month} className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {closing.toLocaleString('fr-FR')}
                </td>
              ))}
              <td className="px-6 py-4 whitespace-nowrap"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* New Scenario Modal */}
      <Dialog
        open={isNewScenarioModalOpen}
        onClose={() => setIsNewScenarioModalOpen(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Dialog.Panel className="mx-auto w-full max-w-md rounded-xl bg-white">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                <Dialog.Title className="text-lg font-medium text-gray-900">
                  Nouveau scénario
                </Dialog.Title>
                <button
                  onClick={() => setIsNewScenarioModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateScenario} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Nom
                    </label>
                    <input
                      type="text"
                      id="name"
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300"
                      value={newScenario.name}
                      onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      className="mt-1 block w-full rounded-lg border-gray-300"
                      value={newScenario.description}
                      onChange={(e) => setNewScenario({ ...newScenario, description: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                      Type
                    </label>
                    <select
                      id="type"
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300"
                      value={newScenario.type}
                      onChange={(e) => setNewScenario({ ...newScenario, type: e.target.value as 'income' | 'expense' })}
                    >
                      <option value="income">Recette</option>
                      <option value="expense">Dépense</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="order" className="block text-sm font-medium text-gray-700">
                      Ordre d'affichage
                    </label>
                    <input
                      type="number"
                      id="order"
                      required
                      min="0"
                      className="mt-1 block w-full rounded-lg border-gray-300"
                      value={newScenario.order}
                      onChange={(e) => setNewScenario({ ...newScenario, order: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setIsNewScenarioModalOpen(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                  >
                    Créer
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </div>
  );
}