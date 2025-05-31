import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, X, Search, Truck } from 'lucide-react';
import axios from 'axios';
import type { Order, OrderItem, Product } from '../../../types/sales';
import type { Contact } from '../../../types/crm';

export default function NewOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceType = searchParams.get('source_type');
  const sourceId = searchParams.get('source_id');
  
  const [selectedContact, setSelectedContact] = React.useState<Contact | null>(null);
  const [showContactSearch, setShowContactSearch] = React.useState(false);
  const [contactSearchTerm, setContactSearchTerm] = React.useState('');
  const [items, setItems] = React.useState<OrderItem[]>([]);
  const [showProductSearch, setShowProductSearch] = React.useState(false);
  const [productSearchTerm, setProductSearchTerm] = React.useState('');
  const [shippingCost, setShippingCost] = React.useState(0);
  const [notes, setNotes] = React.useState('');
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
      total: subtotal + tax + shippingCost,
    };
  }, [items, shippingCost]);

  const handleAddProduct = (product: Product) => {
    setItems(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        productId: product.id,
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

  const handleUpdateItem = (id: string, updates: Partial<OrderItem>) => {
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
    if (!selectedContact) return;
    setError(null);

    try {
      // Extract the numeric ID from the string
      // const clientId = parseInt(selectedContact.id.split('-')[1], 10);
      const clientId = selectedContact.id;

      const orderData = {
        clientId: clientId,
        items,
        shippingAddress: selectedContact.address,
        notes,
      };

      const response = await axios.post('http://localhost:3000/api/orders', orderData, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Order created:', response.data);
      navigate('/sales/orders');
    } catch (error) {
      console.error('Error creating order:', error);
      setError('Une erreur est survenue lors de la création de la commande');
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
      <div className="mb-8">
        <button
          onClick={() => navigate('/sales/orders')}
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux commandes
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">Nouvelle commande</h1>
        <p className="mt-2 text-sm text-gray-700">
          Créez une nouvelle commande pour un client
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-5xl space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
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
                {selectedContact.address && (
                  <div className="mt-2 flex items-center gap-1 text-sm text-gray-500">
                    <Truck className="h-4 w-4" />
                    {selectedContact.address}
                  </div>
                )}
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
                        {contact.address && (
                          <div className="mt-2 flex items-center gap-1 text-sm text-gray-500">
                            <Truck className="h-4 w-4" />
                            {contact.address}
                          </div>
                        )}
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
                  <th scope="row" colSpan={4} className="pt-4 text-right text-sm font-normal text-gray-500">
                    Frais de livraison
                  </th>
                  <td className="pt-4 text-right">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={shippingCost}
                      onChange={(e) => setShippingCost(Number(e.target.value))}
                      className="block w-full border-0 p-0 text-right text-sm text-gray-900 placeholder-gray-500 focus:ring-0"
                    />
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
            onClick={() => navigate('/sales/orders')}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!selectedContact || items.length === 0}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Créer la commande
          </button>
        </div>
      </form>
    </div>
  );
}