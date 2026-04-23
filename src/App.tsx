import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/auth.store';
import { authApi } from './api';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import OrdersPage from './pages/OrdersPage';
import NewOrderPage from './pages/NewOrderPage';
import KitchenPage from './pages/KitchenPage';
import DeliveryPage from './pages/DeliveryPage';
import ProductsPage from './pages/ProductsPage';
import CategoriesPage from './pages/CategoriesPage';
import UsersPage from './pages/UsersPage';
import MenuDiaPage from './pages/MenuDiaPage';
import MesasPage from './pages/MesasPage';
import PrintSettingsPage from './pages/PrintSettingsPage';
import PublicOrderPage from './pages/PublicOrderPage';
import OrderStatusPage from './pages/OrderStatusPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { token, setAuth, logout } = useAuthStore();

  useEffect(() => {
    if (token) {
      authApi.me().then((user) => setAuth(user, token)).catch(() => logout());
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="orders/new" element={<NewOrderPage />} />
          <Route path="kitchen" element={<KitchenPage />} />
          <Route path="delivery" element={<DeliveryPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="menu" element={<MenuDiaPage />} />
          <Route path="mesas" element={<MesasPage />} />
          <Route path="print-settings" element={<PrintSettingsPage />} />
        </Route>
        <Route path="pedido" element={<PublicOrderPage />} />
        <Route path="seguimiento/:token" element={<OrderStatusPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}