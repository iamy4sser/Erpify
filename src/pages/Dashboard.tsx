import React, { useState, useEffect } from 'react';
import { Users, ShoppingCart, FileText, Briefcase, Truck } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import axios from 'axios';

interface CashFlowData {
  month: string;
  encaissements: number;
  decaissements: number;
}

const Dashboard: React.FC = () => {
  const [statsData, setStatsData] = useState([
    { name: 'Clients actifs', value: '0', icon: Users, change: '+0%', changeType: 'positive' },
    { name: 'Fournisseurs actifs', value: '0', icon: Truck, change: '+0%', changeType: 'positive' },
    { name: 'Ventes du mois', value: '0 MAD', icon: ShoppingCart, change: '+0%', changeType: 'positive' },
    { name: 'Factures en attente', value: '0', icon: FileText, change: '0', changeType: 'positive' },
    { name: 'Projets en cours', value: '0', icon: Briefcase, change: '+0', changeType: 'positive' },
  ]);
  const [loading, setLoading] = useState(true);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsRes, suppliersRes, salesRes, invoicesRes, projectsRes, transactionsRes] = await Promise.all([
          axios.get('http://localhost:3000/api/contacts?status=customer'),
          axios.get('http://localhost:3000/api/contacts?status=supplier'),
          axios.get('http://localhost:3000/api/invoices'),
          axios.get('http://localhost:3000/api/invoices?status=pending'),
          axios.get('http://localhost:3000/api/projects'),
          axios.get('http://localhost:3000/api/transactions'),
        ]);

        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        const lastMonth = new Date(currentYear, currentMonth - 1, 1);

        // Calculate active clients and change
        const activeClients = clientsRes.data.length;
        const lastMonthClients = clientsRes.data.filter((client: any) => 
          new Date(client.created_at) < lastMonth
        ).length;
        const clientsChange = activeClients - lastMonthClients;

        // Calculate active suppliers and change
        const activeSuppliers = suppliersRes.data.length;
        const lastMonthSuppliers = suppliersRes.data.filter((supplier: any) => 
          new Date(supplier.created_at) < lastMonth
        ).length;
        const suppliersChange = ((activeSuppliers - lastMonthSuppliers) / (lastMonthSuppliers || 1));

        // Calculate monthly sales and change
        const monthlySales = salesRes.data.reduce((sum: number, invoice: any) => {
          const invoiceDate = new Date(invoice.date);
          if (invoiceDate.getMonth() === currentMonth && 
              invoiceDate.getFullYear() === currentYear && 
              invoice.status === 'paid' && 
              clientsRes.data.some((client:any) => client.id === invoice.clientId)) {
            sum += invoice.total;
          }
          return sum;
        }, 0);

        const lastMonthSales = salesRes.data.reduce((sum: number, invoice: any) => {
          const invoiceDate = new Date(invoice.date);
          if (invoiceDate.getMonth() === currentMonth - 1 && 
              invoiceDate.getFullYear() === currentYear && 
              invoice.status === 'paid' && 
              clientsRes.data.some((client:any) => client.id === invoice.clientId)) {
            sum += invoice.total;
          }
          return sum;
        }, 0);

        const salesChange = ((monthlySales - lastMonthSales) / (lastMonthSales || 1)) * 100;

        // Calculate pending invoices and change
        const pendingInvoices = invoicesRes.data.filter((invoice: any) => invoice.status === 'pending').length;
        const lastMonthPending = invoicesRes.data.filter((invoice: any) => {
          const invoiceDate = new Date(invoice.date);
          return invoice.status === 'pending' && 
                 invoiceDate.getMonth() === currentMonth - 1 && 
                 invoiceDate.getFullYear() === currentYear;
        }).length;
        const pendingChange = pendingInvoices - lastMonthPending;

        // Calculate active projects and change
        const activeProjects = projectsRes.data.filter((project: any) => project.status === 'active').length;
        const lastMonthProjects = projectsRes.data.filter((project: any) => {
          const projectDate = new Date(project.startDate);
          return project.status === 'active' && 
                 projectDate.getMonth() === currentMonth - 1 && 
                 projectDate.getFullYear() === currentYear;
        }).length;
        const projectsChange = ((activeProjects - lastMonthProjects) / (lastMonthProjects || 1)) * 100;

        // Generate cash flow data
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

        setStatsData([
          { 
            name: 'Clients actifs', 
            value: activeClients.toString(), 
            icon: Users, 
            change: `${clientsChange >= 0 ? '+' : ''}${clientsChange}`, 
            changeType: clientsChange >= 0 ? 'positive' : 'negative' 
          },
          { 
            name: 'Fournisseurs actifs', 
            value: activeSuppliers.toString(), 
            icon: Truck, 
            change: `${suppliersChange >= 0 ? '+' : ''}${suppliersChange}`, 
            changeType: suppliersChange >= 0 ? 'positive' : 'negative' 
          },
          { 
            name: 'Ventes du mois', 
            value: `${monthlySales.toLocaleString('fr-FR')} MAD`, 
            icon: ShoppingCart, 
            change: `${salesChange >= 0 ? '+' : ''}${salesChange.toFixed(1)}%`, 
            changeType: salesChange >= 0 ? 'positive' : 'negative' 
          },
          { 
            name: 'Factures en attente', 
            value: pendingInvoices.toString(), 
            icon: FileText, 
            change: `${pendingChange >= 0 ? '+' : ''}${pendingChange}`, 
            changeType: pendingChange <= 0 ? 'positive' : 'negative' 
          },
          { 
            name: 'Projets en cours', 
            value: activeProjects.toString(), 
            icon: Briefcase, 
            change: `${projectsChange >= 0 ? '+' : ''}${projectsChange.toFixed(1)}%`, 
            changeType: projectsChange >= 0 ? 'positive' : 'negative' 
          },
        ]);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Tableau de bord</h1>
        <p className="mt-2 text-sm text-gray-700">
          Bienvenue sur votre tableau de bord Erpify
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => (
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

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-base font-semibold leading-6 text-gray-900">
            Flux de trésorerie
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
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
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

        <div className="rounded-lg bg-white shadow">
          <div className="p-6">
            <h3 className="text-base font-semibold leading-6 text-gray-900">
              Tâches en attente
            </h3>
            <div className="mt-6">
              <p className="text-sm text-gray-500">Aucune tâche en attente</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;