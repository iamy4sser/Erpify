import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  FileText,
  Briefcase,
  Settings,
  Menu,
  X,
  Ticket,
  LogOut,
  ChevronDown,
  User,
  Bell,
  Moon,
  Sun,
  Globe,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const navigation = [
  { name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
  { name: 'CRM', href: '/crm', icon: Users },
  {
    name: 'Commercial',
    href: '/sales',
    icon: ShoppingCart,
    children: [
      { name: 'Devis', href: '/sales/quotes' },
      { name: 'Commandes', href: '/sales/orders' },
      { name: 'Factures', href: '/sales/invoices' },
      { name: 'Produits', href: '/sales/products' },
    ],
  },
  { name: 'Comptabilité', href: '/finance', icon: FileText },
  { name: 'Projets', href: '/projects', icon: Briefcase },
  { name: 'Tickets', href: '/tickets', icon: Ticket },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isCommercialMenuOpen, setIsCommercialMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const toggleCommercialMenu = (href: string) => {
    setIsCommercialMenuOpen(!isCommercialMenuOpen);
    navigate(href);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    // Ici vous pouvez ajouter la logique pour changer le thème
  };

  const handleProfileClick = () => {
    setIsProfileOpen(true);
    setIsSettingsOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          sidebarOpen ? 'block' : 'hidden'
        )}
      >
        <div
          className="fixed inset-0 bg-gray-900/80"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="fixed inset-y-0 left-0 w-64 bg-white">
          <div className="flex h-16 items-center justify-between px-6">
            <h2 className="text-2xl font-bold text-gray-900">Erpify</h2>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6 text-gray-500" />
            </button>
          </div>
          <nav className="flex flex-col gap-1 px-3 py-4">
            {navigation.map((item) =>
              item.children ? (
                <div key={item.name}>
                  <button
                    onClick={() => toggleCommercialMenu(item.href)}
                    className={cn(
                      'flex items-center justify-between w-full gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                      location.pathname.startsWith(item.href)
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {isCommercialMenuOpen &&
                    item.children.map((child) => (
                      <Link
                        key={child.name}
                        to={child.href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-6 py-2 text-sm font-medium',
                          location.pathname === child.href
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        )}
                      >
                        {child.name}
                      </Link>
                    ))}
                </div>
              ) : (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                    location.pathname === item.href
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            )}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow border-r border-gray-200 bg-white">
          <div className="flex h-16 items-center px-6">
            <h2 className="text-2xl font-bold text-gray-900">Erpify</h2>
          </div>
          <nav className="flex flex-col gap-1 px-3 py-4">
            {navigation.map((item) =>
              item.children ? (
                <div key={item.name}>
                  <button
                    onClick={() => toggleCommercialMenu(item.href)}
                    className={cn(
                      'flex items-center justify-between w-full gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                      location.pathname.startsWith(item.href)
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {isCommercialMenuOpen &&
                    item.children.map((child) => (
                      <Link
                        key={child.name}
                        to={child.href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-6 py-2 text-sm font-medium',
                          location.pathname === child.href
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        )}
                      >
                        {child.name}
                      </Link>
                    ))}
                </div>
              ) : (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                    location.pathname === item.href
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            )}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="relative">
                <button
                  type="button"
                  className="-m-2.5 p-2.5 text-gray-400 hover:text-gray-500"
                  onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                >
                  <Settings className="h-6 w-6" />
                </button>

                {isSettingsOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500">
                      Paramètres
                    </div>
                    <button
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={handleProfileClick}
                    >
                      <User className="mr-3 h-4 w-4" />
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{user?.name || 'Utilisateur'}</span>
                        <span className="text-xs text-gray-500">{user?.email}</span>
                      </div>
                    </button>
                    <button
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => {/* Gérer les notifications */}}
                    >
                      <Bell className="mr-3 h-4 w-4" />
                      Notifications
                    </button>
                    <button
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={toggleDarkMode}
                    >
                      {isDarkMode ? (
                        <Sun className="mr-3 h-4 w-4" />
                      ) : (
                        <Moon className="mr-3 h-4 w-4" />
                      )}
                      {isDarkMode ? 'Mode clair' : 'Mode sombre'}
                    </button>
                    <button
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => {/* Gérer la langue */}}
                    >
                      <Globe className="mr-3 h-4 w-4" />
                      Langue
                    </button>
                    <div className="border-t border-gray-100">
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        Se déconnecter
                      </button>
                    </div>
                  </div>
                )}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5">
                    <div className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-6 w-6 text-gray-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{user?.name || 'Utilisateur'}</h3>
                          <p className="text-sm text-gray-500">{user?.email}</p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Compte créé le</h4>
                          <p className="text-sm text-gray-900">
                            {new Date(user?.created_at || '').toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500">Dernière connexion</h4>
                          <p className="text-sm text-gray-900">
                            {new Date(user?.updated_at || '').toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-gray-100 p-4">
                      <button
                        onClick={() => setIsProfileOpen(false)}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="h-6 w-px bg-gray-200 lg:hidden" />
            </div>
          </div>
        </div>

        <main className="py-8">
          <div className="px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}