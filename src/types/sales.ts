export type Quote = {
  id: string;
  number: string;
  date: string;
  validUntil: string;
  status: 'pending' | 'sent' | 'accepted' | 'rejected';
  clientId: string;
  clientName: string;
  clientEmail: string;
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
};

export type QuoteItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tax: number;
  total: number;
};

export type Order = {
  id: string;
  number: string;
  date: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  clientId: string;
  clientName: string;
  clientEmail: string;
  shippingAddress: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  notes?: string;
};

export type OrderItem = {
  id: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tax: number;
  total: number;
};

export type Invoice = {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  clientId: string;
  clientName: string;
  clientEmail: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  foreignAmount?: number;
  exchangeRate?: number;
  madAmount?: number;
  paymentDate?: string;
  bank?: 'CFG Bank' | 'Attijariwafa Bank' | 'CFG Devis';
  paymentStatus?: 'paid' | 'unpaid' | 'partial';
  paymentMethod?: string;
};

export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tax: number;
  total: number;
};

export type Product = {
  id: string;
  name: string;
  reference: string;
  description: string;
  price: number;
  tax: number;
  stock: number;
  category: string;
  status: 'active' | 'inactive';
};