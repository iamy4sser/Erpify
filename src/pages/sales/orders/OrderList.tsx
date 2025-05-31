import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, FileText, ExternalLink, Truck, Archive, CreditCard, ArrowLeft, Trash2, Edit } from 'lucide-react';
import axios from 'axios';
import type { Order } from '../../../types/sales';
import EditOrderForm from '../../../components/sales/orders/EditOrderForm';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusLabels = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export default function OrderList() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all');
  const [editingOrder, setEditingOrder] = React.useState<Order | null>(null);

  React.useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/orders');
        setOrders(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching orders:', error);
        setError('Une erreur est survenue lors du chargement des commandes');
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const filteredOrders = React.useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = 
        order.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.clientEmail.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, selectedStatus]);

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:3000/api/orders/${orderId}`);
      setOrders(prev => prev.filter(order => order.id !== orderId));
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Une erreur est survenue lors de la suppression de la commande');
    }
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders(prev =>
      prev.map(order =>
        order.id === updatedOrder.id ? updatedOrder : order
      )
    );
  };

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Chargement des commandes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50">
      <div className="mb-8">
        <Link
          to="/sales"
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au commercial
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Commandes</h1>
            <p className="mt-2 text-sm text-gray-700">
              Gérez vos commandes clients
            </p>
          </div>
          <Link
            to="/sales/orders/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            Nouvelle commande
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une commande..."
              className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-primary-500 focus:ring-primary-500 hover:border-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <select
              className="rounded-lg border border-gray-300 py-2 hover:border-gray-400"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="confirmed">Confirmées</option>
              <option value="shipped">Expédiées</option>
              <option value="delivered">Livrées</option>
              <option value="cancelled">Annulées</option>
            </select>
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Aucune commande</h3>
          <p className="mt-2 text-sm text-gray-500">
            Commencez par créer une nouvelle commande pour un client.
          </p>
          <div className="mt-6">
            <Link
              to="/sales/orders/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              <Plus className="h-5 w-5" />
              Nouvelle commande
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commande
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-gray-900">{order.number}</div>
                        <div className="text-sm text-gray-500">
                          {order.items ? `${order.items.length} article${order.items.length > 1 ? 's' : ''}` : 'Aucun article'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{order.clientName}</div>
                    <div className="text-sm text-gray-500">{order.clientEmail}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(order.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {order.total.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusColors[order.status]}`}>
                      {statusLabels[order.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button className="text-gray-400 hover:text-gray-500">
                        <ExternalLink className="h-5 w-5" />
                      </button>
                      {order.status === 'confirmed' && (
                        <Link
                          to={`/sales/invoices/new?source_type=order&source_id=${order.number}`}
                          className="text-gray-400 hover:text-gray-500"
                          title="Créer une facture"
                        >
                          <CreditCard className="h-5 w-5" />
                        </Link>
                      )}
                      <button className="text-gray-400 hover:text-gray-500">
                        <Truck className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setEditingOrder(order)}
                        className="text-gray-400 hover:text-blue-500"
                        title="Modifier"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        className="text-gray-400 hover:text-red-500"
                        onClick={() => handleDeleteOrder(order.id)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingOrder && (
        <EditOrderForm
          order={editingOrder}
          isOpen={true}
          onClose={() => setEditingOrder(null)}
          onUpdate={handleUpdateOrder}
        />
      )}
    </div>
  );
}