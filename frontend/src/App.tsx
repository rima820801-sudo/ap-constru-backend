import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnalisisPuPage } from './pages/AnalisisPuPage';
import CatalogoPage from './pages/CatalogoPage';
import ComparadorPage from './pages/ComparadorPage';
import AdminDashboard from './pages/AdminDashboard';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { TrialWall } from './components/auth/TrialWall';
import { FeedbackModal } from './components/ui/FeedbackModal';
import { GuiaUsoPage } from './pages/GuiaUsoPage';
import { ChangelogPage } from './pages/ChangelogPage';
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
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/guia" element={<ProtectedRoute><GuiaUsoPage /></ProtectedRoute>} />
            <Route path="/changelog" element={<ProtectedRoute><ChangelogPage /></ProtectedRoute>} />

            <Route
                path="/analisis"
                element={<ProtectedRoute><TrialWall><AnalisisPuPage /></TrialWall></ProtectedRoute>}
            />
            <Route
                path="/catalogo"
                element={<ProtectedRoute><TrialWall><CatalogoPage /></TrialWall></ProtectedRoute>}
            />
            <Route
                path="/comparador"
                element={<ProtectedRoute><TrialWall><ComparadorPage /></TrialWall></ProtectedRoute>}
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
            <div className="min-h-screen bg-gray-900">
                <AppRoutes />
                <FeedbackModal />
            </div>
        </UserProvider>
    );
}

export default App;
