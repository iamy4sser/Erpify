import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { resetPasswordSchema } from '../../types/auth';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { resetPassword } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    password: '',
    confirmPassword: '',
  });

  React.useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (!token) throw new Error('Token invalide');
      
      resetPasswordSchema.parse(formData);
      await resetPassword(token, formData.password);
      navigate('/login', { 
        state: { message: 'Votre mot de passe a été réinitialisé avec succès' }
      });
    } catch (error: any) {
      if (error.errors) {
        setError(error.errors[0].message);
      } else {
        setError('Une erreur est survenue');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Réinitialiser le mot de passe
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                {error}
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Nouveau mot de passe
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmer le mot de passe
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Réinitialiser le mot de passe
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}