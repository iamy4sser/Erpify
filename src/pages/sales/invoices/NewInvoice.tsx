import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, X, Search, FileText } from 'lucide-react';
import axios from 'axios';
import type { Invoice, InvoiceItem, Quote, Order, Product } from '../../../types/sales';
import type { Contact } from '../../../types/crm';

export default function NewInvoice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceType = searchParams.get('source_type');
  const sourceId = searchParams.get('source_id');

  const [selectedContact, setSelectedContact] = React.useState<Contact | null>(null);
  const [showContactSearch, setShowContactSearch] = React.useState(false);
  const [contactSearchTerm, setContactSearchTerm] = React.useState('');
  const [items, setItems] = React.useState<InvoiceItem[]>([]);
  const [showProductSearch, setShowProductSearch] = React.useState(false);
  const [productSearchTerm, setProductSearchTerm] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const [foreignAmount, setForeignAmount] = React.useState<number>(0);
  const [exchangeRate, setExchangeRate] = React.useState<number>(1);
  const [madAmount, setMadAmount] = React.useState<number>(0);
  const [paymentDate, setPaymentDate] = React.useState('');
  const [bank, setBank] = React.useState<'CFG Bank' | 'Attijariwafa Bank' | 'CFG Devis'>('CFG Bank');
  const [paymentStatus, setPaymentStatus] = React.useState<'paid' | 'unpaid' | 'partial'>('unpaid');
  const [paymentMethod, setPaymentMethod] = React.useState('');

  const [sourceDocument, setSourceDocument] = React.useState<{ type: 'quote' | 'order'; number: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [products, setProducts] = React.useState<Product[]>([]);

  React.useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/contacts');
        setContacts(response.data);
      } catch (error) {
        console.error('Error fetching contacts:', error);
        setError('Failed to load contacts.');
      }
    };

    const fetchProducts = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/products');
        setProducts(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
        setError('Failed to load products.');
      }
    };

    fetchContacts();
    fetchProducts();
  }, []);

  React.useEffect(() => {
    if (sourceType === 'quote' && sourceId) {
      // No mock data anymore
    } else if (sourceType === 'order' && sourceId) {
      // No mock data anymore
    }
  }, [sourceType, sourceId]);

  const filteredContacts = React.useMemo(() => {
    return contacts.filter(contact =>
      contact.name.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
      contact.company.toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(contactSearchTerm.toLowerCase())
    );
  }, [contactSearchTerm, contacts]);

  const filteredProducts = React.useMemo(() => {
    return products.filter(product =>
      product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
      product.reference.toLowerCase().includes(productSearchTerm.toLowerCase())
    );
  }, [productSearchTerm, products]);

  const totals = React.useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = items.reduce((sum, item) => sum + (item.total * item.tax / 100), 0);
    return {
      subtotal,
      tax,
      total: subtotal + tax,
    };
  }, [items]);

  const handleAddProduct = (product: Product) => {
    setItems(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        description: product.name,
        quantity: 1,
        unitPrice: product.price,
        tax: product.tax,
        total: product.price,
      },
    ]);
    setShowProductSearch(false);
    setProductSearchTerm('');
  };

  const handleUpdateItem = (id: string, updates: Partial<InvoiceItem>) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, ...updates };
        updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
        return updatedItem;
      }
      return item;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !dueDate) return;
    setError(null);

    try {
      // Extract the numeric ID from the string
      // const clientId = parseInt(selectedContact.id.split('-')[1], 10);
      const clientId = selectedContact.id;

      const invoiceData = {
        clientId: clientId,
        dueDate,
        items,
        notes,
        foreignAmount,
        exchangeRate,
        madAmount,
        paymentDate,
        bank,
        paymentStatus,
        paymentMethod,
      };

      const response = await axios.post('http://localhost:3000/api/invoices', invoiceData, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Invoice created:', response.data);
      navigate('/sales/invoices');
    } catch (error) {
      console.error('Error creating invoice:', error);
      setError('Une erreur est survenue lors de la création de la facture');
    }
  };

  React.useEffect(() => {
    setMadAmount(foreignAmount * exchangeRate);
  }, [foreignAmount, exchangeRate]);

  return (
    <div className="min-h-full bg-gray-50">
      <div className="mb-8">
        <button
          onClick={() => navigate('/sales/invoices')}
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux factures
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">Nouvelle facture</h1>
        <p className="mt-2 text-sm text-gray-700">
          Créez une nouvelle facture pour un client
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {sourceDocument && (
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FileText className="h-5 w-5 text-blue-400" aria-hidden="true" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-blue-700">
                  Cette facture est créée à partir {sourceDocument.type === 'quote' ? 'du devis' : 'de la commande'} {sourceDocument.number}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Client selection */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-medium text-gray-900">Client</h2>
          
          {selectedContact ? (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <div className="font-medium text-gray-900">{selectedContact.name}</div>
                <div className="text-sm text-gray-500">{selectedContact.company}</div>
                <div className="mt-1 text-sm text-gray-500">{selectedContact.email}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContact(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowContactSearch(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Plus className="h-5 w-5" />
                Sélectionner un client
              </button>

              {showContactSearch && (
                <div className="mt-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher un client..."
                      className="w-full rounded-lg border-gray-300 pl-10 pr-4 py-2 focus:border-primary-500 focus:ring-primary-500"
                      value={contactSearchTerm}
                      onChange={(e) => setContactSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <ul className="mt-2 max-h-64 overflow-auto rounded-lg border border-gray-200 bg-white">
                    {filteredContacts.map(contact => (
                      <li
                        key={contact.id}
                        className="cursor-pointer border-b border-gray-200 p-4 hover:bg-gray-50"
                        onClick={() => {
                          setSelectedContact(contact);
                          setShowContactSearch(false);
                          setContactSearchTerm('');
                        }}
                      >
                        <div className="font-medium text-gray-900">{contact.name}</div>
                        <div className="text-sm text-gray-500">{contact.company}</div>
                        <div className="mt-1 text-sm text-gray-500">{contact.email}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Items */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Articles</h2>
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
            <div className="mt-4">
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
                      {product.price.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6">
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
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-4">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                        className="block w-full border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
                      />
                    </td>
                    <td className="py-4">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(item.id, { quantity: Number(e.target.value) })}
                        className="block w-full border-0 p-0 text-right text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
                      />
                    </td>
                    <td className="py-4">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItem(item.id, { unitPrice: Number(e.target.value) })}
                        className="block w-full border-0 p-0 text-right text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
                      />
                    </td>
                    <td className="py-4">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.tax}
                        onChange={(e) => handleUpdateItem(item.id, { tax: Number(e.target.value) })}
                        className="block w-full border-0 p-0 text-right text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
                      />
                    </td>
                    <td className="py-4 text-right text-sm text-gray-900">
                      {item.total.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
                    </td>
                    <td className="py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <X className="h-5 w-5" />
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
                    {totals.subtotal.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <th scope="row" colSpan={4} className="pt-4 text-right text-sm font-normal text-gray-500">
                    TVA
                  </th>
                  <td className="pt-4 text-right text-sm text-gray-900">
                    {totals.tax.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <th scope="row" colSpan={4} className="pt-4 text-right text-sm font-semibold text-gray-900">
                    Total TTC
                  </th>
                  <td className="pt-4 text-right text-sm font-semibold text-gray-900">
                    {totals.total.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Additional information */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-medium text-gray-900">Informations complémentaires</h2>
          
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
                Date d'échéance
              </label>
              <input
                type="date"
                id="dueDate"
                required
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="foreignAmount" className="block text-sm font-medium text-gray-700">
                Montant en devise
              </label>
              <input
                type="number"
                id="foreignAmount"
                required
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                value={foreignAmount}
                onChange={(e) => setForeignAmount(Number(e.target.value))}
              />
            </div>

            <div>
              <label htmlFor="exchangeRate" className="block text-sm font-medium text-gray-700">
                Cours de change
              </label>
              <input
                type="number"
                id="exchangeRate"
                required
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(Number(e.target.value))}
              />
            </div>

            <div>
              <label htmlFor="madAmount" className="block text-sm font-medium text-gray-700">
                Montant en MAD
              </label>
              <input
                type="number"
                id="madAmount"
                required
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                value={madAmount}
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
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="bank" className="block text-sm font-medium text-gray-700">
                Banque
              </label>
              <select
                id="bank"
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                value={bank}
                onChange={(e) => setBank(e.target.value as 'CFG Bank' | 'Attijariwafa Bank' | 'CFG Devis')}
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
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as 'paid' | 'unpaid' | 'partial')}
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
                required
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              id="notes"
              rows={4}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/sales/invoices')}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!selectedContact || items.length === 0}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Créer la facture
          </button>
        </div>
      </form>
    </div>
  );
}
