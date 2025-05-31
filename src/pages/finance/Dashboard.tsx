import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard,
  Plus,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  AlertCircle,
  Clock,
  Calculator,
  CreditCard as CheckIcon
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { exportTreasuryTable } from '../../utils/exportTreasury';

interface Stat {
  name: string;
  value: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  entries: {
    debit: number;
    credit: number;
  }[];
  status: string;
}

interface Alert {
  id: string;
  type: 'warning' | 'info';
  message: string;
}

interface CashFlowData {
  month: string;
  encaissements: number;
  decaissements: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTreasuryExport, setShowTreasuryExport] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const handleExportTreasury = async () => {
    try {
      await exportTreasuryTable(
        new Date(exportDateRange.startDate),
        new Date(exportDateRange.endDate)
      );
    } catch (error) {
      console.error('Error exporting treasury:', error);
      // Handle error appropriately
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invoicesRes, transactionsRes, treasuryRes] = await Promise.all([
          axios.get('http://localhost:3000/api/invoices'),
          axios.get('http://localhost:3000/api/transactions'),
          axios.get('http://localhost:3000/api/treasury')
        ]);

        // Calculer la trésorerie totale
        const treasuryData = treasuryRes.data;
        const treasury = treasuryData.reduce((sum: number, account: any) => sum + account.solde, 0);
        // Simuler une variation (vous pouvez ajuster avec des données historiques si disponibles)
        const previousTreasury = treasury * 0.95; // Exemple: 5% de moins pour simuler une variation
        const treasuryChange = ((treasury - previousTreasury) / (previousTreasury || 1)) * 100;

        // Calculate revenue (total paid invoices for current month)
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        const revenue = invoicesRes.data
          .filter((invoice: any) => {
            const invoiceDate = new Date(invoice.date);

            return invoice.status === 'paid' && 
                   invoiceDate.getMonth() === currentMonth && 
                   invoiceDate.getFullYear() === currentYear;
          })
          .reduce((sum: number, invoice: any) => sum + Number(invoice.total), 0);

        const previousMonthRevenue = invoicesRes.data
          .filter((invoice: any) => {

            const invoiceDate = new Date(invoice.date);
            return invoice.status === 'paid' && 
                   invoiceDate.getMonth() === (currentMonth - 1) && 
                   invoiceDate.getFullYear() === currentYear;
          })
          .reduce((sum: number, invoice: any) => sum + invoice.total, 0);

        const revenueChange = ((revenue - previousMonthRevenue) / previousMonthRevenue) * 100;

        // Calculate expenses
        const expenses = transactionsRes.data
          .filter((transaction: any) => {

            const transactionDate = new Date(transaction.date);
            return transaction.entries[0].debit < transaction.entries[0].credit &&
                   transactionDate.getMonth() === currentMonth && 
                   transactionDate.getFullYear() === currentYear;
          })
          .reduce((sum: number, transaction: any) => sum + Number(transaction.entries[0].credit), 0);

        const previousMonthExpenses = transactionsRes.data
          .filter((transaction: any) => {
            const transactionDate = new Date(transaction.date);
            return transaction.entries[0].debit < transaction.entries[0].credit && 
                   transactionDate.getMonth() === (currentMonth - 1) && 
                   transactionDate.getFullYear() === currentYear;
          })
          .reduce((sum: number, transaction: any) => sum + Number(transaction.entries[0].credit), 0);

          const expensesChange = previousMonthExpenses === 0 
          ? 0 // Éviter la division par zéro
          : ((expenses - previousMonthExpenses) / previousMonthExpenses) * 100;

        // Calculate receivables (unpaid invoices)
        const receivables = invoicesRes.data
          .filter((invoice: any) => invoice.status === 'pending' || invoice.status === 'overdue')
          .reduce((sum: number, invoice: any) => sum + invoice.total, 0);

        const previousReceivables = invoicesRes.data
          .filter((invoice: any) => {
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            const invoiceDate = new Date(invoice.date);
            return (invoice.status === 'pending' || invoice.status === 'overdue') && 
                   invoiceDate < lastMonth;
          })
          .reduce((sum: number, invoice: any) => sum + invoice.total, 0);

        // const receivablesChange = ((receivables - previousReceivables) / previousReceivables) * 100;
        const receivablesChange = previousReceivables === 0 
          ? 0 // Éviter la division par zéro
          : ((receivables - previousReceivables) / previousReceivables) * 100;

        setStats([
          { 
            name: 'Trésorerie',
            value: treasury.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' }),
            change: `${treasuryChange > 0 ? '+' : ''}${treasuryChange.toFixed(1)}%`,
            changeType: treasuryChange >= 0 ? 'positive' : 'negative',
            icon: Wallet,
          },
          { 
            name: 'Chiffre d\'affaires', 
            value: revenue.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' }),
            change: `${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(1)}%`,
            changeType: revenueChange >= 0 ? 'positive' : 'negative',
            icon: TrendingUp,
          },
          { 
            name: 'Dépenses', 
            value: expenses.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' }),
            change: `${expensesChange > 0 ? '+' : ''}${expensesChange.toFixed(1)}%`,
            changeType: expensesChange <= 0 ? 'positive' : 'negative',
            icon: TrendingDown,
          },
          { 
            name: 'Créances clients', 
            value: receivables.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' }),
            change: `${receivablesChange > 0 ? '+' : ''}${receivablesChange.toFixed(1)}%`,
            changeType: receivablesChange <= 0 ? 'positive' : 'negative',
            icon: CreditCard,
          },
        ]);

        // Generate cash flow data for all months
        const months = [
          'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
          'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
        ];

        const cashFlow = months.map((month, index) => {
          const monthTransactions = transactionsRes.data.filter((transaction: any) => {

            const transactionDate = new Date(transaction.date);
            return transactionDate.getMonth() === index && 
                   transactionDate.getFullYear() === currentYear;
          });

          const encaissements = monthTransactions
            .filter((t: any) => t.entries[0].debit > t.entries[0].credit)
            .reduce((sum: number, t: any) => sum + Number(t.entries[0].debit), 0);

          const decaissements = monthTransactions
            .filter((t: any) => t.entries[0].debit < t.entries[0].credit)
            .reduce((sum: number, t: any) => sum + Number(t.entries[0].credit), 0);

          return {
            month,
            encaissements,
            decaissements
          };
        });

        setCashFlowData(cashFlow);

        // Get recent transactions
        const recent = transactionsRes.data
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 5)
          .map((transaction: Transaction) => ({
            ...transaction,
            type: transaction.entries[0].debit > transaction.entries[0].credit ? 'income' : 'expense',
          }));

        setRecentTransactions(recent);

        // Generate alerts
        const newAlerts: Alert[] = [];

        // Check for overdue invoices
        const overdueInvoices = invoicesRes.data.filter((invoice: any) => invoice.status === 'overdue');
        if (overdueInvoices.length > 0) {
          const totalOverdue = overdueInvoices.reduce((sum: number, invoice: any) => sum + invoice.total, 0);
          newAlerts.push({
            id: '1',
            type: 'warning',
            message: `${overdueInvoices.length} facture${overdueInvoices.length > 1 ? 's' : ''} en retard de paiement (total: ${totalOverdue.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })})`
          });
        }

        // Check for bank reconciliation
        const lastReconciliation = transactionsRes.data
          .filter((t: any) => t.status === 'reconciled')
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        if (lastReconciliation) {
          const lastReconDate = new Date(lastReconciliation.date);
          const daysSinceRecon = Math.floor((currentDate.getTime() - lastReconDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysSinceRecon > 7) {
            newAlerts.push({
              id: '2',
              type: 'info',
              message: `Rapprochement bancaire à effectuer (dernier: ${lastReconDate.toLocaleDateString('fr-FR')})`
            });
          }
        }

        setAlerts(newAlerts);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Une erreur est survenue lors du chargement des données');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  if (error) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Comptabilité</h1>
        <p className="mt-2 text-sm text-gray-700">
          Tableau de bord comptable et financier
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6 sm:py-6"
          >
            <dt>
              <div className="absolute rounded-md bg-gray-50 p-3">
                <stat.icon className="h-6 w-6 text-gray-600" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">{stat.name}</p>
            </dt>
            <dd className="ml-16 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              <p
                className={`ml-2 flex items-baseline text-sm font-semibold ${
                  stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stat.change}
              </p>
            </dd>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Actions rapides</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/finance/transactions/new"
            className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
              <Plus className="h-6 w-6 text-primary-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">Nouvelle écriture</p>
            </div>
          </Link>

          <Link
            to="/finance/check-encashments"
            className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <CheckIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">Encaissement chèques</p>
            </div>
          </Link>

          <Link
            to="/finance/treasury-planning"
            className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Calculator className="h-6 w-6 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">Plan de trésorerie</p>
            </div>
          </Link>

          {/* <Link
            to="/finance/reports/income-statement"
            className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">Compte de résultat</p>
            </div>
          </Link>

          <Link
            to="/finance/reconciliation"
            className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <FileText className="h-6 w-6 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">Rapprochement</p>
            </div>
          </Link> */}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cash Flow Chart */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-base font-semibold leading-6 text-gray-900">
            Trésorerie
          </h3>
          <div className="mt-6" style={{ height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={cashFlowData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="encaissements" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="decaissements" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  tickFormatter={(value) => `${value / 1000}k MAD`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                  }}
                  formatter={(value) => [`${value.toLocaleString('fr-FR')} MAD`]}
                />
                <Area
                  type="monotone"
                  dataKey="encaissements"
                  name="Encaissements"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  fill="url(#encaissements)"
                />
                <Area
                  type="monotone"
                  dataKey="decaissements"
                  name="Décaissements"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fill="url(#decaissements)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="rounded-lg bg-white shadow">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Dernières écritures
              </h3>
              <Link
                to="/finance/transactions"
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Voir tout
              </Link>
            </div>
            <div className="mt-6 flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {recentTransactions.map((transaction) => (
                  <li key={transaction.id} className="py-5">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {transaction.description}
                        </p>
                        <p className="truncate text-sm text-gray-500">
                          {new Date(transaction.date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="ml-4 flex flex-shrink-0 items-center">
                        <p className={`text-sm font-medium ${
                          transaction.entries[0].debit > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.entries[0].debit > 0 ? (
                            <>
                            <ArrowUpRight className="inline-block h-4 w-4 mr-1" />
                            {transaction.entries[0].debit.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
                            </>
                          ) : (
                            <>
                            <ArrowDownRight className="inline-block h-4 w-4 mr-1" />
                            {transaction.entries[0].credit.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
                            </>
                          )}
                          
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="mt-8">
        <div className="rounded-lg bg-white shadow">
          <div className="p-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900">
              Alertes
            </h3>
            <div className="mt-6 flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {alerts.map((alert) => (
                  <li key={alert.id} className="py-5">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        alert.type === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        <AlertCircle className={`h-5 w-5 ${
                          alert.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <p className="text-sm text-gray-900">{alert.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
