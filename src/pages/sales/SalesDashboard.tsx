import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  ShoppingCart, 
  CreditCard, 
  Package, 
  TrendingUp,
  Users,
  AlertCircle,
  Clock,
  Plus,
  Truck
} from 'lucide-react';
import axios from 'axios';
import type { Invoice } from '../../types/sales';
import type { Contact } from '../../types/crm';
import type { Order } from '../../types/sales';

interface Stat {
  name: string;
  value: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
}

interface ActivityItem {
  id: string;
  type: 'quote' | 'order' | 'invoice';
  title: string;
  client: string;
  amount: string;
  date: string;
  status: string;
}

interface Alert {
  id: string;
  type: 'warning' | 'info' | 'success';
  message: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

type RevenuePeriod = 'month' | '6months' | 'year';

const SalesDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stat[]>([
    { name: 'Chiffre d\'affaires', value: '0 MAD', icon: TrendingUp, change: '+0%', changeType: 'positive' },
    { name: 'Devis en attente', value: '0', icon: FileText, change: '+0', changeType: 'neutral' },
    { name: 'Commandes à traiter', value: '0', icon: ShoppingCart, change: '+0', changeType: 'positive' },
    { name: 'Factures impayées', value: '0', icon: CreditCard, change: '+0', changeType: 'negative' },
  ]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenuePeriod, setRevenuePeriod] = useState<RevenuePeriod>('month');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invoicesRes, quotesRes, ordersRes, contactsRes] = await Promise.all([
          axios.get<Invoice[]>('http://localhost:3000/api/invoices'),
          axios.get<Quote[]>('http://localhost:3000/api/quotes'),
          axios.get<Order[]>('http://localhost:3000/api/orders'),
          axios.get<Contact[]>('http://localhost:3000/api/contacts'),
        ]);

        // Calculate total revenue based on selected period
        const calculateTotalRevenue = (period: RevenuePeriod) => {
          const currentDate = new Date();
          let startDate: Date;

          switch (period) {
            case 'month':
              startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
              break;
            case '6months':
              startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 6, 1);
              break;
            case 'year':
              startDate = new Date(currentDate.getFullYear(), 0, 1);
              break;
            default:
              startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          }

          return invoicesRes.data
            .filter(invoice => 
              invoice.status === 'paid' && 
              new Date(invoice.date) >= startDate
            )
            .reduce((sum: number, invoice: any) => sum + invoice.total, 0);
        };

        const currentRevenue = calculateTotalRevenue(revenuePeriod);
        const previousRevenue = calculateTotalRevenue(revenuePeriod);
        const revenueChange = previousRevenue === 0 ? 100 : 
          ((currentRevenue - previousRevenue) / previousRevenue) * 100;

        // Calculate pending quotes and variation
        const currentPendingQuotes = quotesRes.data.filter(quote => quote.status === 'pending').length;
        const previousPendingQuotes = quotesRes.data.filter(quote => {
          const quoteDate = new Date(quote.date);
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          return quote.status === 'pending' && quoteDate <= lastMonth;
        }).length;
        const quotesChange = currentPendingQuotes - previousPendingQuotes;

        // Calculate orders to process and variation
        const currentOrders = ordersRes.data.filter(order => order.status === 'pending').length;
        const previousOrders = ordersRes.data.filter(order => {
          const orderDate = new Date(order.date);
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          return order.status === 'pending' && orderDate <= lastMonth;
        }).length;
        const ordersChange = currentOrders - previousOrders;

        // Calculate overdue invoices and variation
        const currentOverdue = invoicesRes.data.filter(invoice => invoice.status === 'overdue').length;
        const previousOverdue = invoicesRes.data.filter(invoice => {
          const invoiceDate = new Date(invoice.date);
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          return invoice.status === 'overdue' && invoiceDate <= lastMonth;
        }).length;
        const overdueChange = currentOverdue - previousOverdue;

        setStats([
          { 
            name: 'Chiffre d\'affaires', 
            value: `${currentRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}`,
            change: `${revenueChange > 0 ? '+' : ''}${revenueChange.toFixed(1)}%`,
            changeType: revenueChange >= 0 ? 'positive' : 'negative',
            icon: TrendingUp 
          },
          { 
            name: 'Devis en attente', 
            value: currentPendingQuotes.toString(),
            change: quotesChange === 0 ? '0' : (quotesChange > 0 ? `+${quotesChange}` : quotesChange.toString()),
            changeType: quotesChange === 0 ? 'neutral' : (quotesChange > 0 ? 'positive' : 'negative'),
            icon: FileText 
          },
          { 
            name: 'Commandes à traiter', 
            value: currentOrders.toString(),
            change: ordersChange === 0 ? '0' : (ordersChange > 0 ? `+${ordersChange}` : ordersChange.toString()),
            changeType: ordersChange === 0 ? 'neutral' : (ordersChange > 0 ? 'positive' : 'negative'),
            icon: ShoppingCart 
          },
          { 
            name: 'Factures impayées', 
            value: currentOverdue.toString(),
            change: overdueChange === 0 ? '0' : (overdueChange > 0 ? `+${overdueChange}` : overdueChange.toString()),
            changeType: overdueChange === 0 ? 'neutral' : (overdueChange > 0 ? 'positive' : 'negative'),
            icon: CreditCard 
          },
        ]);

        // Generate recent activity
        const recentInvoices = invoicesRes.data.slice(0, 3).map(invoice => ({
          id: invoice.id,
          type: 'invoice' as 'invoice',
          title: `Facture #${invoice.number}`,
          client: invoice.clientName,
          amount: invoice.total.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' }),
          date: invoice.date,
          status: invoice.status,
        }));

        const recentQuotes = quotesRes.data.slice(0, 2).map(quote => ({
          id: quote.id,
          type: 'quote' as 'quote',
          title: `Devis #${quote.number}`,
          client: quote.clientName,
          amount: quote.total.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' }),
          date: quote.date,
          status: quote.status,
        }));

        const recentOrders = ordersRes.data.slice(0, 2).map(order => ({
          id: order.id,
          type: 'order' as 'order',
          title: `Commande #${order.number}`,
          client: order.clientName,
          amount: order.total.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' }),
          date: order.date,
          status: order.status,
        }));

        setRecentActivity([...recentInvoices, ...recentQuotes, ...recentOrders].sort((a, b) => (new Date(b.date).getTime() - new Date(a.date).getTime())).slice(0, 5));

        // Generate alerts (example)
        const overdueInvoiceCount = invoicesRes.data.filter(invoice => invoice.status === 'overdue').length;
        const expiringQuotesCount = quotesRes.data.filter(quote => {
          const validUntilDate = new Date(quote.validUntil);
          const now = new Date();
          const diffTime = validUntilDate.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays <= 7;
        }).length;

        const newClientsCount = contactsRes.data.filter(contact => {
          const createdAtDate = new Date(contact.created_at);
          const now = new Date();
          const lastWeek = new Date(now.setDate(now.getDate() - 7));
          return createdAtDate > lastWeek;
        }).length;

        const generatedAlerts: Alert[] = [];

        if (overdueInvoiceCount > 0) {
          generatedAlerts.push({ id: '1', type: 'warning', message: `${overdueInvoiceCount} factures sont en retard de paiement`, icon: AlertCircle });
        }

        if (expiringQuotesCount > 0) {
          generatedAlerts.push({ id: '2', type: 'info', message: `${expiringQuotesCount} devis arrivent à expiration cette semaine`, icon: Clock });
        }

        if (newClientsCount > 0) {
          generatedAlerts.push({ id: '3', type: 'success', message: `${newClientsCount} nouveaux clients cette semaine`, icon: Users });
        }

        setAlerts(generatedAlerts);
        setLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue lors du chargement des données';
         console.error('Error fetching data:', err);
        setError(errorMessage);
        setLoading(false);
      }
    };

    fetchData();
  }, [revenuePeriod]);

  const handleNewItem = (href: string) => {
    const newPath = href.replace(/\/([^/]+)$/, '/$1/new');
    navigate(newPath);
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
        <h1 className="text-2xl font-semibold text-gray-900">Commercial</h1>
        <p className="mt-2 text-sm text-gray-700">
          Gérez vos devis, commandes et factures
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
                  stat.changeType === 'positive' ? 'text-green-600' :
                  stat.changeType === 'negative' ? 'text-red-600' :
                  'text-gray-500'
                }`}
              >
                {stat.change}
              </p>
            </dd>
          </div>
        ))}
      </div>

      {/* Revenue Period Buttons */}
      <div className="mt-4 flex justify-start gap-2">
        <button
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            revenuePeriod === 'month' ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setRevenuePeriod('month')}
        >
          Ce mois-ci
        </button>
        <button
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            revenuePeriod === '6months' ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setRevenuePeriod('6months')}
        >
          6 derniers mois
        </button>
        <button
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            revenuePeriod === 'year' ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
          onClick={() => setRevenuePeriod('year')}
        >
          Cette année
        </button>
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900">Actions rapides</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/sales/quotes/new"
            className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">Nouveau devis</p>
            </div>
          </Link>

          <Link
            to="/sales/orders/new"
            className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <ShoppingCart className="h-6 w-6 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">Nouvelle commande</p>
            </div>
          </Link>

          <Link
            to="/sales/invoices/new"
            className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <CreditCard className="h-6 w-6 text-purple-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">Nouvelle facture</p>
            </div>
          </Link>

          <Link
            to="/sales/products/new"
            className="relative flex items-center space-x-3 rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm hover:border-gray-400"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <Package className="h-6 w-6 text-orange-600" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900">Nouveau produit</p>
            </div>
          </Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="rounded-lg bg-white shadow">
          <div className="p-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900">
              Activité récente
            </h3>
            <div className="mt-6 flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {recentActivity.map((activity) => (
                  <li key={activity.id} className="py-5">
                    <div className="flex items-center space-x-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{activity.title}</p>
                        <p className="truncate text-sm text-gray-500">
                          {activity.client} • {activity.amount}
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <time className="text-sm text-gray-500">
                          {new Date(activity.date).toLocaleDateString('fr-FR')}
                        </time>
                        <span className="mt-1 text-xs font-medium capitalize text-gray-500">
                          {activity.status}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="rounded-lg bg-white shadow">
          <div className="p-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900">
              Alertes
            </h3>
            <div className="mt-6 flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {alerts.map((alert) => (
                  <li key={alert.id} className="py-5">
                    <div className="flex items-center space-x-4">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        alert.type === 'warning' ? 'bg-yellow-100' :
                        alert.type === 'info' ? 'bg-blue-100' :
                        'bg-green-100'
                      }`}>
                        <alert.icon className={`h-5 w-5 ${
                          alert.type === 'warning' ? 'text-yellow-600' :
                          alert.type === 'info' ? 'text-blue-600' :
                          'text-green-600'
                        }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-900">{alert.message}</p>
                      </div>
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
};

export default SalesDashboard;
