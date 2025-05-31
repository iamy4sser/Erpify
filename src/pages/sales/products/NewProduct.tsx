import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import axios from 'axios';
import type { Product } from '../../../types/sales';

export default function NewProduct() {
  const navigate = useNavigate();
  const [formData, setFormData] = React.useState<Omit<Product, 'id'>>({
    name: '',
    reference: '',
    description: '',
    price: 0,
    tax: 20,
    stock: 0,
    category: 'product',
    status: 'active',
  });

  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await axios.post('http://localhost:3000/api/products', formData, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      console.log('Product created:', response.data);
      navigate('/sales/products');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message === 'Un produit avec cette référence existe déjà') {
        setError('Un produit avec cette référence existe déjà');
      } else {
        console.error('Error creating product:', error);
        setError('Une erreur est survenue lors de la création du produit');
      }
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
      <div className="mb-8">
        <button
          onClick={() => navigate('/sales/products')}
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au catalogue
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">Nouveau produit</h1>
        <p className="mt-2 text-sm text-gray-700">
          Ajoutez un nouveau produit ou service à votre catalogue
        </p>
      </div>

      <div className="mx-auto max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nom du produit
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="reference" className="block text-sm font-medium text-gray-700">
                  Référence
                </label>
                <input
                  type="text"
                  id="reference"
                  required
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  Type
                </label>
                <select
                  id="category"
                  required
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as Product['category'] })}
                >
                  <option value="product">Produit</option>
                  <option value="service">Service</option>
                </select>
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Prix HT
                </label>
                <div className="mt-1 relative rounded-lg shadow-sm">
                  <input
                    type="number"
                    id="price"
                    required
                    min="0"
                    step="0.01"
                    className="block w-full rounded-lg border-gray-300 pl-3 pr-12 focus:border-primary-500 focus:ring-primary-500"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-gray-500 sm:text-sm">MAD</span>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="tax" className="block text-sm font-medium text-gray-700">
                  TVA (%)
                </label>
                <input
                  type="number"
                  id="tax"
                  required
                  min="0"
                  max="100"
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={formData.tax}
                  onChange={(e) => setFormData({ ...formData, tax: Number(e.target.value) })}
                />
              </div>

              <div>
                <label htmlFor="stock" className="block text-sm font-medium text-gray-700">
                  Stock
                </label>
                <input
                  type="number"
                  id="stock"
                  required
                  min="0"
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
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
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Product['status'] })}
                >
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                </select>
              </div>

              <div className="col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/sales/products')}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Créer le produit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}