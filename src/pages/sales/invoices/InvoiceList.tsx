import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, FileText, ExternalLink, CreditCard, Archive, ArrowLeft, Trash2, Edit } from 'lucide-react';
import axios from 'axios';
import type { Invoice } from '../../../types/sales';
import EditInvoiceForm from '../../../components/sales/invoices/EditInvoiceForm';
import * as XLSX from 'xlsx';

const statusColors = {
  pending: 'bg-orange-100 text-orange-800',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-yellow-100 text-yellow-800',
};

const statusLabels = {
  pending: 'En attente',
  sent: 'Envoyée',
  paid: 'Payée',
  overdue: 'En retard',
  cancelled: 'Annulée',
};

export default function InvoiceList() {
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all');
  const [editingInvoice, setEditingInvoice] = React.useState<Invoice | null>(null);
  const [invoiceType, setInvoiceType] = useState<'customer' | 'supplier' | 'all'>('all');
  const [clientsRes, setClientsRes] = useState<any>({});
  const [suppliersRes, setSuppliersRes] = useState<any>({});
  const [dateRange, setDateRange] = React.useState({
    start: '',
    end: '',
  });

  React.useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const [invoicesResponse, clientsResponse, suppliersResponse] = await Promise.all([
          axios.get('http://localhost:3000/api/invoices'),
          axios.get('http://localhost:3000/api/contacts?status=customer'),
          axios.get('http://localhost:3000/api/contacts?status=supplier')
        ]);
        setInvoices(invoicesResponse.data);
        setClientsRes(clientsResponse.data);
        setSuppliersRes(suppliersResponse.data);
        setLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue lors du chargement des factures';
        console.error('Error fetching invoices:', err);
        setError(errorMessage);
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  const filteredInvoices = React.useMemo(() => {
    return invoices.filter(invoice => {
      const matchesSearch = 
        invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.clientEmail.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = selectedStatus === 'all' || invoice.status === selectedStatus;
      let matchesType = false;
      if (invoiceType === 'all') {
        matchesType = true;
      } else if (invoiceType === 'customer') {
        matchesType = clientsRes.some((client:any) => client.id === invoice.clientId);
      } else if (invoiceType === 'supplier') {
        matchesType = suppliersRes.some((supplier:any) => supplier.id === invoice.clientId);
      }

      const invoiceDate = new Date(invoice.date);
      const startDate = dateRange.start ? new Date(dateRange.start) : null;
      const endDate = dateRange.end ? new Date(dateRange.end) : null;

      const matchesDateRange =
        (!startDate || invoiceDate >= startDate) &&
        (!endDate || invoiceDate <= endDate);
      
      return matchesSearch && matchesStatus && matchesType && matchesDateRange;
    });
  }, [invoices, searchTerm, selectedStatus, invoiceType, clientsRes, suppliersRes, dateRange]);

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette facture ?')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:3000/api/invoices/${invoiceId}`);
      setInvoices(prev => prev.filter(invoice => invoice.id !== invoiceId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue lors de la suppression de la facture';
      console.error('Error deleting invoice:', err);
      alert(errorMessage);
    }
  };

  const handleUpdateInvoice = (updatedInvoice: Invoice) => {
    setInvoices(prev =>
      prev.map(invoice =>
        invoice.id === updatedInvoice.id ? updatedInvoice : invoice
      )
    );
    setEditingInvoice(null);
  };

  const handleExportExcel = () => {
    let dataToExport = filteredInvoices;
    if (invoiceType === 'customer') {
      dataToExport = filteredInvoices.filter(invoice => clientsRes.some((client:any) => client.id === invoice.clientId));
    } else if (invoiceType === 'supplier') {
      dataToExport = filteredInvoices.filter(invoice => suppliersRes.some((supplier:any) => supplier.id === invoice.clientId));
    }

    const data = dataToExport.map(invoice => ({
      'Client': invoice.clientName,
      'Facture N°': invoice.number,
      'Montant en devise': invoice.foreignAmount || invoice.total,
      'Cours de change': invoice.exchangeRate || 1,
      'Montant en MAD': invoice.madAmount || invoice.total,
      'Date de facturation': new Date(invoice.date).toLocaleDateString('fr-FR'),
      'Date d\'échéance': new Date(invoice.dueDate).toLocaleDateString('fr-FR'),
      'Date d\'encaissement': invoice.paymentDate ? new Date(invoice.paymentDate).toLocaleDateString('fr-FR') : '',
      'Banque': invoice.bank || '',
      'Règlement': invoice.paymentMethod || '',
      'Situation': invoice.paymentStatus === 'paid' ? 'PAYE' : 'NON PAYE',
      'Notes': invoice.notes || ''
    }));
  
    const ws = XLSX.utils.json_to_sheet(data);
  
    // Define column widths (optional, to match the look)
    ws['!cols'] = [
      { wch: 15 }, // Client
      { wch: 15 }, // Facture N°
      { wch: 15 }, // Montant en devise
      { wch: 15 }, // Cours de change
      { wch: 15 }, // Montant en MAD
      { wch: 15 }, // Date de facturation
      { wch: 15 }, // Date d'échéance
      { wch: 15 }, // Date d'encaissement
      { wch: 10 }, // Banque
      { wch: 15 }, // Règlement
      { wch: 10 }, // Situation
      { wch: 20 }  // Notes
    ];
  
    // Define styles
    const headerStyle = {
      fill: { fgColor: { rgb: 'D3D3D3' } }, // Light gray background for header
      font: { sz: 11 }
    };
  
    const dueDateColumnStyle = {
      fill: { fgColor: { rgb: 'B0E0E6' } } // Light blue background for "Date d'échéance" column
    };
  
    const paidRowStyle = {
      fill: { fgColor: { rgb: 'FFE4E1' } } // Light orange background for "PAYE" rows
    };
  
    // Apply styles to the header row (row 1)
    const headerRange = XLSX.utils.decode_range(ws['!ref'] as string);
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = headerStyle;
    }
  
    // Apply styles to the "Date d'échéance" column (column G, index 6)
    for (let row = 1; row <= headerRange.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: 6 }); // Column G
      if (!ws[cellAddress]) continue;
      ws[cellAddress].s = dueDateColumnStyle;
    }
  
    // Apply styles to rows based on "Situation" (column J, index 9)
    for (let row = 1; row <= headerRange.e.r; row++) {
      const situationCell = XLSX.utils.encode_cell({ r: row, c: 9 }); // Column J
      if (ws[situationCell] && ws[situationCell].v === 'PAYE') {
        for (let col = 0; col <= headerRange.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!ws[cellAddress]) continue;
          ws[cellAddress].s = paidRowStyle;
        }
      }
    }
  
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Factures');
    XLSX.writeFile(wb, 'factures.xlsx');
  };

  const totals = React.useMemo(() => {
    return filteredInvoices.reduce((acc, invoice) => {
      if (invoice.status === 'paid') {
        acc.paid += invoice.total;
      } else if (invoice.status === 'overdue') {
        acc.overdue += invoice.total;
      } else if (invoice.status === 'pending') {
        acc.pending += invoice.total;
      }
      return acc;
    }, { paid: 0, overdue: 0, pending: 0 });
  }, [filteredInvoices]);

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Chargement des factures...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
          >
            Réessayer
          </button>
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
            <h1 className="text-2xl font-semibold text-gray-900">Factures</h1>
            <p className="mt-2 text-sm text-gray-700">
              Gérez vos factures clients
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              <FileText className="h-5 w-5" />
              Exporter Excel
            </button>
            <Link
              to="/sales/invoices/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              <Plus className="h-5 w-5" />
              Nouvelle facture
            </Link>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">Encaissé</h3>
              <p className="text-xl font-semibold text-gray-900">
                {totals.paid.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100">
              <FileText className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">En attente</h3>
              <p className="text-xl font-semibold text-gray-900">
                {totals.pending.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
              <FileText className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-500">En retard</h3>
              <p className="text-xl font-semibold text-gray-900">
                {totals.overdue.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une facture..."
              className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-primary-500 focus:ring-primary-500 hover:border-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
          <div className="flex items-center gap-4">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              De
            </label>
            <input
              type="date"
              id="startDate"
              className="block rounded-lg border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-1 px-1 hover:border-gray-400"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
          </div>
          <div className='flex items-center gap-4'>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
              À
            </label>
            <input
              type="date"
              id="endDate"
              className="block rounded-lg border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 py-1 px-1 hover:border-gray-400"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
          </div>

          <div className="flex items-center gap-4">
            <select
              className="rounded-lg border border-gray-300 py-2 px-1 hover:border-gray-400"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="sent">Envoyées</option>
              <option value="paid">Payées</option>
              <option value="overdue">En retard</option>
              <option value="cancelled">Annulées</option>
            </select>
            <select
              className="rounded-lg border border-gray-300 py-2 px-1 hover:border-gray-400"
              value={invoiceType}
              onChange={(e) => setInvoiceType(e.target.value as 'customer' | 'supplier' | 'all')}
            >
              <option value="all">Tous les types</option>
              <option value="customer">Factures clients</option>
              <option value="supplier">Factures fournisseurs</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Facture
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Échéance
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
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  Aucune facture trouvée
                </td>
              </tr>
            ) : (
              filteredInvoices.map((invoice) => {
                const dueDate = new Date(invoice.dueDate);
                const today = new Date();
                const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isDueSoon = daysUntilDue > 0 && daysUntilDue <= 7;

                return (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{invoice.number}</div>
                          <div className="text-sm text-gray-500">
                            {Array.isArray(invoice.items) && invoice.items.length > 0
                              ? `${invoice.items.length} article${invoice.items.length > 1 ? 's' : ''}`
                              : 'Aucun article'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{invoice.clientName}</div>
                      <div className="text-sm text-gray-500">{invoice.clientEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(invoice.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}
                      </div>
                      {isDueSoon && invoice.status !== 'paid' && (
                        <div className="mt-1 text-sm text-yellow-600">
                          Échéance dans {daysUntilDue} jour{daysUntilDue > 1 ? 's' : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {invoice.total.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${statusColors[invoice.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[invoice.status] || 'Inconnu'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button className="text-gray-400 hover:text-gray-500">
                          <ExternalLink className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setEditingInvoice(invoice)}
                          className="text-gray-400 hover:text-blue-500"
                          title="Modifier"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          className="text-gray-400 hover:text-red-500"
                          onClick={() => handleDeleteInvoice(invoice.id)}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {editingInvoice && (
        <EditInvoiceForm
          invoice={editingInvoice}
          isOpen={true}
          onClose={() => setEditingInvoice(null)}
          onUpdate={handleUpdateInvoice}
        />
      )}
    </div>
  );
}

