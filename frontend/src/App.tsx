import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnalisisPuPage } from './pages/AnalisisPuPage';
import CatalogoPage from './pages/CatalogoPage';
import ComparadorPage from './pages/ComparadorPage';
import AdminDashboard from './pages/AdminDashboard';
import { LoginPage } from './pages/LoginPage';
import { UserProvider, useUser } from './context/user';

const ProtectedRoute = ({ children, adminOnly = false }: { children: JSX.Element, adminOnly?: boolean }) => {
    const { user, loading } = useUser();

    if (loading) return <div className="p-4 text-white">Cargando sesión...</div>;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && !user.is_admin) {
        return <Navigate to="/" replace />;
    }

    return children;
};

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
                path="/analisis"
                element={<ProtectedRoute><AnalisisPuPage /></ProtectedRoute>}
            />
            <Route
                path="/catalogo"
                element={<ProtectedRoute><CatalogoPage /></ProtectedRoute>}
            />
            <Route
                path="/comparador"
                element={<ProtectedRoute><ComparadorPage /></ProtectedRoute>}
            />
            <Route
                path="/admin"
                element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>}
            />
            <Route path="/" element={<Navigate to="/analisis" replace />} />
            <Route path="*" element={<Navigate to="/analisis" replace />} />
        </Routes>
    );
};

function App() {
    return (
        <UserProvider>
            <AppRoutes />
        </UserProvider>
    );
}

export default App;
