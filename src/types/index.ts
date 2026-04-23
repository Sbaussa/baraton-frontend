export type Role = 'ADMIN' | 'CASHIER' | 'KITCHEN' | 'DELIVERY';
export type OrderType = 'MESA' | 'DOMICILIO' | 'LLEVAR' | 'ONLINE';
export type OnlineStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface Category {
  id: number;
  name: string;
  color?: string;
  _count?: { products: number };
}

export interface Product {
  id: number;
  name: string;
  price: number;
  available: boolean;
  categoryId: number;
  category: Category;
}

export interface DeliveryInfo {
  id: number;
  customerName: string;
  phone: string;
  address: string;
  neighborhood?: string;
  notes?: string;
  estimatedMin: number;
}

export interface OrderItem {
  id: number;
  productId: number;
  product: Product;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface Order {
  id: number;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  total: number;
  tableNumber?: number;
  notes?: string;
  paymentMethod?: string;
  cashGiven?: number;
  cashChange?: number;
  userId: number;
  user: { id: number; name: string };
  items: OrderItem[];
  delivery?: DeliveryInfo;
  onlineStatus?: OnlineStatus;
  customerToken?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  deliveryUser?: { id: number; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  ventasHoy: number;
  pedidosHoy: number;
  domiciliosHoy: number;
  pedidosActivos: number;
  pedidosPendientes: number;
}

// Cart types para new order
export interface CartItem {
  productId: number;
  product: Product;
  quantity: number;
  notes: string;
}

export interface DeliveryForm {
  customerName: string;
  phone: string;
  address: string;
  neighborhood: string;
  notes: string;
  estimatedMin: number;
}