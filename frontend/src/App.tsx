import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnalisisPuPage } from './pages/AnalisisPuPage';
import CatalogoPage from './pages/CatalogoPage';
import ComparadorPage from './pages/ComparadorPage';
import AdminDashboard from './pages/AdminDashboard';
import { UserInfo } from './types/user';
import { UserContext } from './context/user';


function App() {
    // MODO ABIERTO: Usuario dummy por defecto
    const [user, setUser] = useState<UserInfo | null>({ is_admin: true, username: "Admin Invitado", id: 1 });
    const [isAuthenticated, setIsAuthenticated] = useState(true);
    const isAdmin = Boolean(user?.is_admin);

    useEffect(() => {
        // MODO ABIERTO: Sin verificación de sesión real
    }, []);

    return (
        <UserContext.Provider value={user}>

            <Routes>
                <Route
                    path="/analisis"
                    element={isAuthenticated ? <AnalisisPuPage /> : <Navigate to="/analisis" replace />}
                />
                <Route
                    path="/catalogo"
                    element={isAuthenticated ? <CatalogoPage /> : <Navigate to="/analisis" replace />}
                />
                <Route
                    path="/comparador"
                    element={isAuthenticated ? <ComparadorPage /> : <Navigate to="/analisis" replace />}
                />
                <Route
                    path="/admin"
                    element={isAuthenticated && isAdmin ? <AdminDashboard /> : <Navigate to="/analisis" replace />}
                />
                <Route path="/" element={<Navigate to="/analisis" replace />} />
                <Route path="*" element={<Navigate to="/analisis" replace />} />
            </Routes>
        </UserContext.Provider>
    );
}

export default App;
