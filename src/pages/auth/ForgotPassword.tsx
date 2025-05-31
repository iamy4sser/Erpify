import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { forgotPasswordSchema } from '../../types/auth';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    try {
      forgotPasswordSchema.parse({ email });
      await forgotPassword(email);
      setSuccess(true);
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
          Mot de passe oublié
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Entrez votre email pour réinitialiser votre mot de passe
        </p>
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

          {success && (
            <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-700">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Un email de réinitialisation a été envoyé à {email}
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Envoyer le lien de réinitialisation
              </button>
            </div>
          </form>

          <div className="mt-6">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-500"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}