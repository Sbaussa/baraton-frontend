import api from './axios';
import axios from 'axios';
import type { Order, Product, Category, User, DashboardStats } from '../types';

// AUTH
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

// ORDERS
export const ordersApi = {
  getAll: (params?: any) => api.get<Order[]>('/orders', { params }).then((r) => r.data),
  getActive: () => api.get<Order[]>('/orders/active').then((r) => r.data),
  getOne: (id: number) => api.get<Order>(`/orders/${id}`).then((r) => r.data),
  create: (data: any) => api.post<Order>('/orders', data).then((r) => r.data),
  updateStatus: (id: number, status: string) =>
    api.patch<Order>(`/orders/${id}/status`, { status }).then((r) => r.data),
  processPayment: (id: number, data: any) =>
    api.patch<Order>(`/orders/${id}/payment`, data).then((r) => r.data),
  cancel: (id: number) => api.patch<Order>(`/orders/${id}/cancel`, {}).then((r) => r.data),
};

// KITCHEN
export const kitchenApi = {
  getOrders: () => api.get<Order[]>('/kitchen/orders').then((r) => r.data),
  startPreparing: (id: number) =>
    api.patch<Order>(`/kitchen/${id}/preparing`, {}).then((r) => r.data),
  markReady: (id: number) =>
    api.patch<Order>(`/kitchen/${id}/ready`, {}).then((r) => r.data),
};

// PRODUCTS
export const productsApi = {
  getAll: () => api.get<Product[]>('/products').then((r) => r.data),
  getAvailable: () => api.get<Product[]>('/products/available').then((r) => r.data),
  create: (data: any) => api.post<Product>('/products', data).then((r) => r.data),
  update: (id: number, data: any) =>
    api.put<Product>(`/products/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/products/${id}`).then((r) => r.data),
};

// CATEGORIES
export const categoriesApi = {
  getAll: () => api.get<Category[]>('/categories').then((r) => r.data),
  create: (data: any) => api.post<Category>('/categories', data).then((r) => r.data),
  update: (id: number, data: any) =>
    api.put<Category>(`/categories/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/categories/${id}`).then((r) => r.data),
};

// USERS
export const usersApi = {
  getAll: () => api.get<User[]>('/users').then((r) => r.data),
  create: (data: any) => api.post<User>('/users', data).then((r) => r.data),
  update: (id: number, data: any) =>
    api.put<User>(`/users/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/users/${id}`).then((r) => r.data),
};

// PRINT — apunta al servidor local con PM2 (PowerShell ESC/POS)
const printAxios = axios.create({
  baseURL: import.meta.env.VITE_PRINT_URL || 'http://localhost:3001',
});

export const printApi = {
  receipt: (id: number) =>
    printAxios.post(`/print/receipt/${id}`).then((r) => r.data).catch(() => ({ ok: false })),
  kitchen: (id: number) =>
    printAxios.post(`/print/kitchen/${id}`).then((r) => r.data).catch(() => ({ ok: false })),
};

// REPORTS
export const reportsApi = {
  dashboard: (params?: any) => api.get('/reports/dashboard', { params }).then((r) => r.data),
  salesByHour: (params?: any) => api.get('/reports/sales-by-hour', { params }).then((r) => r.data),
  sales: (params?: any) => api.get('/reports/sales', { params }).then((r) => r.data),
};