import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Search, Plus, Edit, Archive, ExternalLink, ArrowLeft, Check, X, Trash2 } from 'lucide-react';
import axios from 'axios';
import type { Product } from '../../../types/sales';

export default function ProductList() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [showInactiveProducts, setShowInactiveProducts] = React.useState(false);
  const [editingProductId, setEditingProductId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get('http://localhost:3000/api/products');
        setProducts(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching products:', error);
        setError('Une erreur est survenue lors du chargement des produits');
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = React.useMemo(() => {
    return products.filter(product => {
      const matchesSearch = 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesStatus = showInactiveProducts || product.status === 'active';
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchTerm, selectedCategory, showInactiveProducts]);

  const categories = React.useMemo(() => {
    return Array.from(new Set(products.map(product => product.category)));
  }, [products]);

  const handleSaveProduct = async (product: Product) => {
    try {
      await axios.put(`http://localhost:3000/api/products/${product.id}`, product);
      setProducts(prev =>
        prev.map(p => (p.id === product.id ? product : p))
      );
      setEditingProductId(null);
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Une erreur est survenue lors de la mise à jour du produit');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:3000/api/products/${productId}`);
      setProducts(prev => prev.filter(product => product.id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Une erreur est survenue lors de la suppression du produit');
    }
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
  };

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Chargement des produits...</p>
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
        <h1 className="text-2xl font-semibold text-gray-900">Catalogue produits</h1>
        <p className="mt-2 text-sm text-gray-700">
          Gérez vos produits et services
        </p>
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
              placeholder="Rechercher un produit..."
              className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2 focus:border-primary-500 focus:ring-primary-500 hover:border-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-4">
            <select
              className="rounded-lg border border-gray-300 py-2 hover:border-gray-400"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Tous les types</option>
              <option value="product">Produits</option>
              <option value="service">Services</option>
            </select>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                checked={showInactiveProducts}
                onChange={(e) => setShowInactiveProducts(e.target.checked)}
              />
              <span className="text-sm text-gray-700">Afficher les produits inactifs</span>
            </label>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Produit
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prix HT
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stock
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
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                {editingProductId === product.id ? (
                  <>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        value={product.name}
                        onChange={(e) =>
                          setProducts(prev =>
                            prev.map(p =>
                              p.id === product.id ? { ...p, name: e.target.value } : p
                            )
                          )
                        }
                      />
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        value={product.reference}
                        onChange={(e) =>
                          setProducts(prev =>
                            prev.map(p =>
                              p.id === product.id ? { ...p, reference: e.target.value } : p
                            )
                          )
                        }
                      />
                    </td>
                    <td className="px-6 py-4">
                      <select
                        className="rounded-lg border-gray-300 py-2"
                        value={product.category}
                        onChange={(e) =>
                          setProducts(prev =>
                            prev.map(p =>
                              p.id === product.id ? { ...p, category: e.target.value } : p
                            )
                          )
                        }
                      >
                        <option value="product">Produit</option>
                        <option value="service">Service</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        value={product.price}
                        onChange={(e) =>
                          setProducts(prev =>
                            prev.map(p =>
                              p.id === product.id ? { ...p, price: Number(e.target.value) } : p
                            )
                          )
                        }
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        value={product.stock}
                        onChange={(e) =>
                          setProducts(prev =>
                            prev.map(p =>
                              p.id === product.id ? { ...p, stock: Number(e.target.value) } : p
                            )
                          )
                        }
                      />
                    </td>
                    <td className="px-6 py-4">
                      <select
                        className="rounded-lg border-gray-300 py-2"
                        value={product.status}
                        onChange={(e) =>
                          setProducts(prev =>
                            prev.map(p =>
                              p.id === product.id ? { ...p, status: e.target.value as 'active' | 'inactive' } : p
                            )
                          )
                        }
                      >
                        <option value="active">Actif</option>
                        <option value="inactive">Inactif</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          className="text-green-600 hover:text-green-900"
                          onClick={() => handleSaveProduct(product)}
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          className="text-gray-400 hover:text-gray-500"
                          onClick={() => handleCancelEdit()}
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">{product.reference}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {product.category === 'product' ? 'Produit' : 'Service'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {product.price.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD' })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {product.stock}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                        product.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.status === 'active' ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button className="text-gray-400 hover:text-gray-500">
                          <ExternalLink className="h-5 w-5" />
                        </button>
                        <button
                          className="text-gray-400 hover:text-blue-500"
                          onClick={() => setEditingProductId(product.id)}
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          className="text-gray-400 hover:text-red-500"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
