import React from 'react';
import { Dialog } from '@headlessui/react';
import { X, Plus, Trash2, Search } from 'lucide-react';
import axios from 'axios';
import type { Invoice, Product } from '../../../types/sales';

interface EditInvoiceFormProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (invoice: Invoice) => void;
}

export default function EditInvoiceForm({ invoice, isOpen, onClose, onUpdate }: EditInvoiceFormProps) {
  const [formData, setFormData] = React.useState({
    id: invoice.id,
    number: invoice.number,
    date: invoice.date,
    dueDate: invoice.dueDate,
    status: invoice.status,
    clientId: invoice.clientId,
    clientName: invoice.clientName,
    clientEmail: invoice.clientEmail,
    items: (invoice.items || []).map(item => ({
      ...item,
      total: item.quantity * item.unitPrice
    })),
    subtotal: invoice.subtotal || 0,
    tax: invoice.tax || 0,
    total: invoice.total || 0,
    notes: invoice.notes || '',
    foreignAmount: invoice.foreignAmount || 0,
    exchangeRate: invoice.exchangeRate || 1,
    madAmount: invoice.madAmount || 0,
    paymentDate: invoice.paymentDate || '',
    bank: invoice.bank || 'CFG Bank',
    paymentStatus: invoice.paymentStatus || 'unpaid',
    paymentMethod: invoice.paymentMethod,
  });

  const [error, setError] = React.useState<string | null>(null);
  const [products, setProducts] = React.useState<Product[]>([]);
  const [showProductSearch, setShowProductSearch] = React.useState(false);
  const [productSearchTerm, setProductSearchTerm] = React.useState('');

  React.useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/products');
        setProducts(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
        setError('Erreur lors du chargement des produits');
      }
    };

    fetchProducts();
  }, []);

  React.useEffect(() => {
    setFormData({
      id: invoice.id,
      number: invoice.number,
      date: invoice.date,
      dueDate: invoice.dueDate,
      status: invoice.status,
      clientId: invoice.clientId,
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail,
      items: (invoice.items || []).map(item => ({
        ...item,
        total: item.quantity * item.unitPrice
      })),
      subtotal: invoice.subtotal || 0,
      tax: invoice.tax || 0,
      total: invoice.total || 0,
      notes: invoice.notes || '',
      foreignAmount: invoice.foreignAmount || 0,
      exchangeRate: invoice.exchangeRate || 1,
      madAmount: invoice.madAmount || 0,
      paymentDate: invoice.paymentDate || '',
      bank: invoice.bank || 'CFG Bank',
      paymentStatus: invoice.paymentStatus || 'unpaid',
      paymentMethod: invoice.paymentMethod,
    });
  }, [invoice]);

  const filteredProducts = React.useMemo(() => {
    return products.filter(product =>
      product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      product.reference.toLowerCase().includes(productSearchTerm.toLowerCase())
    );
  }, [products, productSearchTerm]);

  const handleAddProduct = (product: Product) => {
    setFormData(prev => {
      const newItems = [
        ...prev.items,
        {
          id: crypto.randomUUID(),
          description: product.name,
          quantity: 1,
          unitPrice: product.price,
          tax: product.tax,
          total: product.price,
        }
      ];

      const subtotal = newItems.reduce((sum, item) => sum + item.total, 0);
      const tax = newItems.reduce((sum, item) => sum + (item.total * item.tax / 100), 0);

      return {
        ...prev,
        items: newItems,
        subtotal,
        tax,
        total: subtotal + tax
      };
    });
    setShowProductSearch(false);
    setProductSearchTerm('');
  };

  const handleUpdateItem = (index: number, field: string, value: string | number) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      const item = { ...newItems[index], [field]: value };
      
      if (field === 'quantity' || field === 'unitPrice') {
        item.total = Number(item.quantity) * Number(item.unitPrice);
      }
      
      newItems[index] = item;

      const subtotal = newItems.reduce((sum, item) => sum + item.total, 0);
      const tax = newItems.reduce((sum, item) => sum + (item.total * item.tax / 100), 0);
      
      return { 
        ...prev, 
        items: newItems,
        subtotal,
        tax,
        total: subtotal + tax
      };
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => {
      const newItems = prev.items.filter((_, i) => i !== index);
      
      const subtotal = newItems.reduce((sum, item) => sum + item.total, 0);
      const tax = newItems.reduce((sum, item) => sum + (item.total * item.tax / 100), 0);

      return {
        ...prev,
        items: newItems,
        subtotal,
        tax,
        total: subtotal + tax
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await axios.put(`http://localhost:3000/api/invoices/${invoice.id}`, formData);
      
      if (response.data && (response.data.id || response.data.number)) {
        onUpdate(response.data);
        onClose();
      }
      else if (response.data.dolibarr || response.data.erp) {
        onUpdate(response.data.dolibarr || response.data.erp);
        onClose();
      } 
      else {
        console.warn("Format de réponse inattendu:", response.data);
        setError('Format de réponse inattendu lors de la mise à jour de la facture');
      }
    } catch (error: any) {
      console.error('Error updating invoice:', error);
      setError(error.response?.data?.message || error.message || 'Une erreur est survenue lors de la mise à jour de la facture');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <Dialog.Panel className="mx-auto w-full max-w-4xl rounded-xl bg-white">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <Dialog.Title className="text-xl font-semibold text-gray-900">
                Modifier la facture {formData.number}
              </Dialog.Title>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="number" className="block text-sm font-medium text-gray-700">
                      Numéro
                    </label>
                    <input
                      type="text"
                      id="number"
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
                      Date d'échéance
                    </label>
                    <input
                      type="date"
                      id="dueDate"
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                      Statut
                    </label>
                    <select
                      id="status"
                      required
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Invoice['status'] })}
                    >
                      <option value="pending">En attente</option>
                      <option value="sent">Envoyée</option>
                      <option value="paid">Payée</option>
                      <option value="overdue">En retard</option>
                      <option value="cancelled">Annulée</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Client
                    </label>
                    <div className="mt-1 rounded-lg border border-gray-200 p-3">
                      <div className="font-medium text-gray-900">{formData.clientName}</div>
                      <div className="text-sm text-gray-500">{formData.clientEmail}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Articles</h3>
                    <button
                      type="button"
                      onClick={() => setShowProductSearch(true)}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Plus className="h-5 w-5" />
                      Ajouter un article
                    </button>
                  </div>

                  {showProductSearch && (
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Rechercher un produit..."
                          className="w-full rounded-lg border-gray-300 pl-10 pr-4 py-2 focus:border-primary-500 focus:ring-primary-500"
                          value={productSearchTerm}
                          onChange={(e) => setProductSearchTerm(e.target.value)}
                        />
                      </div>
                      
                      <ul className="mt-2 max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white">
                        {filteredProducts.map(product => (
                          <li
                            key={product.id}
                            className="cursor-pointer border-b border-gray-200 p-4 hover:bg-gray-50"
                            onClick={() => handleAddProduct(product)}
                          >
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="text-sm text-gray-500">{product.reference}</div>
                            <div className="mt-1 text-sm font-medium text-gray-900">
                              {product.price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th scope="col" className="py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th scope="col" className="py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantité</th>
                        <th scope="col" className="py-3 text-right text-xs font-medium text-gray-500 uppercase">Prix unitaire</th>
                        <th scope="col" className="py-3 text-right text-xs font-medium text-gray-500 uppercase">TVA (%)</th>
                        <th scope="col" className="py-3 text-right text-xs font-medium text-gray-500 uppercase">Total HT</th>
                        <th scope="col" className="relative py-3">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {formData.items.map((item, index) => (
                        <tr key={item.id}>
                          <td className="py-4">
                            <input
                              type="text"
                              required
                              className="block w-full border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
                              value={item.description}
                              onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                            />
                          </td>
                          <td className="py-4">
                            <input
                              type="number"
                              required
                              min="1"
                              className="block w-full border-0 p-0 text-right text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(index, 'quantity', Number(e.target.value))}
                            />
                          </td>
                          <td className="py-4">
                            <input
                              type="number"
                              required
                              min="0"
                              step="0.01"
                              className="block w-full border-0 p-0 text-right text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateItem(index, 'unitPrice', Number(e.target.value))}
                            />
                          </td>
                          <td className="py-4">
                            <input
                              type="number"
                              required
                              min="0"
                              max="100"
                              className="block w-full border-0 p-0 text-right text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
                              value={item.tax}
                              onChange={(e) => handleUpdateItem(index, 'tax', Number(e.target.value))}
                            />
                          </td>
                          <td className="py-4 text-right text-sm text-gray-900">
                            {item.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                          </td>
                          <td className="py-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-gray-400 hover:text-gray-500"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th scope="row" colSpan={4} className="pt-6 text-right text-sm font-normal text-gray-500">
                          Sous-total
                        </th>
                        <td className="pt-6 text-right text-sm text-gray-900">
                          {formData.subtotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </td>
                        <td></td>
                      </tr>
                      <tr>
                        <th scope="row" colSpan={4} className="pt-4 text-right text-sm font-normal text-gray-500">
                          TVA
                        </th>
                        <td className="pt-4 text-right text-sm text-gray-900">
                          {formData.tax.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </td>
                        <td></td>
                      </tr>
                      <tr>
                        <th scope="row" colSpan={4} className="pt-4 text-right text-sm font-semibold text-gray-900">
                          Total TTC
                        </th>
                        <td className="pt-4 text-right text-sm font-semibold text-gray-900">
                          {formData.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
  <div>
    <label htmlFor="foreignAmount" className="block text-sm font-medium text-gray-700">
      Montant en devise
    </label>
    <input
      type="number"
      id="foreignAmount"
      step="0.01"
      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
      value={formData.foreignAmount}
      onChange={(e) => {
        const value = Number(e.target.value);
        setFormData(prev => ({
          ...prev,
          foreignAmount: value,
          madAmount: value * prev.exchangeRate
        }));
      }}
    />
  </div>

  <div>
    <label htmlFor="exchangeRate" className="block text-sm font-medium text-gray-700">
      Cours de change
    </label>
    <input
      type="number"
      id="exchangeRate"
      step="0.0001"
      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
      value={formData.exchangeRate}
      onChange={(e) => {
        const value = Number(e.target.value);
        setFormData(prev => ({
          ...prev,
          exchangeRate: value,
          madAmount: prev.foreignAmount * value
        }));
      }}
    />
  </div>

  <div>
    <label htmlFor="madAmount" className="block text-sm font-medium text-gray-700">
      Montant en MAD
    </label>
    <input
      type="number"
      id="madAmount"
      step="0.01"
      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
      value={formData.madAmount}
      disabled
    />
  </div>

  <div>
    <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">
      Date d'encaissement
    </label>
    <input
      type="date"
      id="paymentDate"
      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
      value={formData.paymentDate}
      onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
    />
  </div>

  <div>
    <label htmlFor="bank" className="block text-sm font-medium text-gray-700">
      Banque
    </label>
    <select
      id="bank"
      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
      value={formData.bank}
      onChange={(e) => setFormData({ ...formData, bank: e.target.value as Invoice['bank'] })}
    >
      <option value="CFG Bank">CFG Bank</option>
      <option value="Attijariwafa Bank">Attijariwafa Bank</option>
      <option value="CFG Devis">CFG Devis</option>
    </select>
  </div>

  <div>
    <label htmlFor="paymentStatus" className="block text-sm font-medium text-gray-700">
      Situation
    </label>
    <select
      id="paymentStatus"
      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
      value={formData.paymentStatus}
      onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as Invoice['paymentStatus'] })}
    >
      <option value="paid">Payée</option>
      <option value="unpaid">Non payée</option>
      <option value="partial">Partiellement payée</option>
    </select>
  </div>

  <div>
    <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700">
      Règlement
    </label>
    <input
      type="text"
      id="paymentMethod"
      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
      value={formData.paymentMethod}
      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
    />
  </div>
</div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={4}
                    className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                  >
                    Mettre à jour
                  </button>
                </div>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
}