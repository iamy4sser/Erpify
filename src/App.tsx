import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/Dashboard';
import ContactList from './pages/crm/ContactList';
import SalesDashboard from './pages/sales/SalesDashboard';
import ProductList from './pages/sales/products/ProductList';
import NewProduct from './pages/sales/products/NewProduct';
import QuoteList from './pages/sales/quotes/QuoteList';
import NewQuote from './pages/sales/quotes/NewQuote';
import OrderList from './pages/sales/orders/OrderList';
import NewOrder from './pages/sales/orders/NewOrder';
import InvoiceList from './pages/sales/invoices/InvoiceList';
import NewInvoice from './pages/sales/invoices/NewInvoice';
import FinanceDashboard from './pages/finance/Dashboard';
import NewTransaction from './pages/finance/transactions/NewTransaction';
import TransactionList from './pages/finance/transactions/TransactionList';
import Reconciliation from './pages/finance/Reconciliation';
import CheckEncashment from './pages/finance/CheckEncashment';
import TreasuryPlanning from './pages/finance/TreasuryPlanning';
import ProjectList from './pages/projects/ProjectList';
import NewProject from './pages/projects/NewProject';
import TicketList from './pages/tickets/TicketList';
import NewTicket from './pages/tickets/NewTicket';

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="crm" element={<ContactList />} />
              <Route path="sales" element={<SalesDashboard />} />
              <Route path="sales/products" element={<ProductList />} />
              <Route path="sales/products/new" element={<NewProduct />} />
              <Route path="sales/quotes" element={<QuoteList />} />
              <Route path="sales/quotes/new" element={<NewQuote />} />
              <Route path="sales/orders" element={<OrderList />} />
              <Route path="sales/orders/new" element={<NewOrder />} />
              <Route path="sales/invoices" element={<InvoiceList />} />
              <Route path="sales/invoices/new" element={<NewInvoice />} />
              <Route path="finance" element={<FinanceDashboard />} />
              <Route path="finance/transactions" element={<TransactionList />} />
              <Route path="finance/transactions/new" element={<NewTransaction />} />
              <Route path="finance/reconciliation" element={<Reconciliation />} />
              <Route path="finance/check-encashments" element={<CheckEncashment />} />
              <Route path="finance/treasury-planning" element={<TreasuryPlanning />} />
              <Route path="projects" element={<ProjectList />} />
              <Route path="projects/new" element={<NewProject />} />
              <Route path="tickets" element={<TicketList />} />
              <Route path="tickets/new" element={<NewTicket />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;