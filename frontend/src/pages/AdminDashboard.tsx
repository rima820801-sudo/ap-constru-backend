import React, { useState, useEffect } from 'react';
import { Loader2, Users, PieChart, MessageSquare, CheckCircle, XCircle, ShieldCheck, ShieldAlert, Calculator, ExternalLink } from 'lucide-react';
import { API_BASE_URL, apiFetch } from '../api/client';

interface AdminRequest {
    endpoint: string;
    user_id: number | null;
    created_at: string;
}

interface AdminOverview {
    total_users: number;
    active_users: number;
    project_count: number;
    storage_bytes: number;
    storage_mb: number;
    ia_requests_total: number;
    ia_requests_today: number;
    recent_requests: AdminRequest[];
}

interface UserRecord {
    id: number;
    username: string;
    is_admin: boolean;
    is_premium: boolean;
    trial_active: boolean;
    trial_ends_at: string | null;
    created_at: string | null;
}

interface FeedbackRecord {
    id: number;
    username: string;
    tipo: string;
    mensaje: string;
    estado: string;
    created_at: string;
}

export default function AdminDashboard() {
    const [tab, setTab] = useState<'stats' | 'users' | 'feedback'>('stats');
    const [overview, setOverview] = useState<AdminOverview | null>(null);
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadData();
    }, [tab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (tab === 'stats') {
                const data = await apiFetch<AdminOverview>('/admin/overview');
                setOverview(data);
            } else if (tab === 'users') {
                const data = await apiFetch<UserRecord[]>('/admin/users');
                setUsers(data);
            } else if (tab === 'feedback') {
                const data = await apiFetch<FeedbackRecord[]>('/admin/feedback');
                setFeedbacks(data);
            }
        } catch (err) {
            setError('Error al cargar datos. Verifica tu conexión o permisos.');
        } finally {
            setLoading(false);
        }
    };

    const togglePremium = async (userId: number) => {
        try {
            await apiFetch(`/admin/users/${userId}/toggle_premium`, { method: 'POST' });
            // Recargar lista local
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_premium: !u.is_premium } : u));
        } catch (err) {
            alert('Error al actualizar estado premium');
        }
    };

    const resolveFeedback = async (id: number) => {
        try {
            await apiFetch(`/admin/feedback/${id}/resolver`, { method: 'POST' });
            setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, estado: 'resuelto' } : f));
        } catch (err) {
            alert('Error al actualizar feedback');
        }
    };

    if (loading && !overview && users.length === 0 && feedbacks.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
            <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
                <header className="flex flex-col gap-2">
                    <p className="text-xs uppercase tracking-widest text-indigo-600 font-semibold">Panel Administrativo</p>
                    <h1 className="text-3xl font-bold text-slate-900">Gestión del Sistema</h1>

                    <div className="flex gap-2 mt-4 bg-white p-1 rounded-xl border border-gray-200 w-fit">
                        <button
                            onClick={() => setTab('stats')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'stats' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <PieChart className="w-4 h-4" /> Estadísticas
                        </button>
                        <button
                            onClick={() => setTab('users')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'users' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <Users className="w-4 h-4" /> Usuarios
                        </button>
                        <button
                            onClick={() => setTab('feedback')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'feedback' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <MessageSquare className="w-4 h-4" /> Feedback
                        </button>
                    </div>
                </header>

                {tab === 'stats' && overview && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                                { label: 'Usuarios registrados', value: overview.total_users },
                                { label: 'Proyectos guardados', value: overview.project_count },
                                { label: 'IA (Total sugerencias)', value: overview.ia_requests_total },
                            ].map((stat) => (
                                <div key={stat.label} className="bg-white shadow-sm border border-gray-100 rounded-2xl p-6 flex flex-col gap-1">
                                    <span className="text-xs uppercase tracking-widest text-gray-400 font-bold">{stat.label}</span>
                                    <span className="text-3xl font-bold text-slate-900">{stat.value.toLocaleString('es-MX')}</span>
                                </div>
                            ))}
                        </div>

                        {/* Atajos Rápidos */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <a
                                href="/admin/fasar"
                                className="group bg-indigo-50 border border-indigo-100 p-8 rounded-3xl hover:bg-white hover:border-indigo-300 transition-all duration-300"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                                        <Calculator className="w-8 h-8" />
                                    </div>
                                    <ExternalLink className="w-5 h-5 text-indigo-300 group-hover:text-indigo-600 transition-colors" />
                                </div>
                                <h3 className="text-xl font-bold text-indigo-900 mb-2">Configuración FASAR</h3>
                                <p className="text-indigo-600/70 text-sm font-medium">
                                    Ajusta los valores de UMA, Salario Mínimo y prestaciones de ley para el cálculo automático de mano de obra.
                                </p>
                            </a>

                            <div className="bg-slate-900 p-8 rounded-3xl text-white relative overflow-hidden">
                                <h3 className="text-xl font-bold mb-2 z-10 relative">Estado del Sistema</h3>
                                <p className="text-slate-400 text-sm mb-4 z-10 relative">Servidor activo y base de datos sincronizada.</p>
                                <div className="flex items-center gap-2 z-10 relative">
                                    <span className="flex h-3 w-3 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">Online</span>
                                </div>
                                <div className="absolute right-[-20px] top-[-20px] opacity-10">
                                    <ShieldCheck className="w-48 h-48" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {tab === 'users' && (
                    <div className="bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-left text-xs uppercase text-gray-400">
                                    <th className="px-6 py-4">Usuario</th>
                                    <th className="px-6 py-4">F. Registro</th>
                                    <th className="px-6 py-4">Trial</th>
                                    <th className="px-6 py-4">Premium</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium flex items-center gap-2">
                                            {u.username}
                                            {u.is_admin && <span className="bg-indigo-100 text-indigo-600 text-[10px] px-1.5 py-0.5 rounded uppercase font-bold">Admin</span>}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {u.created_at ? new Date(u.created_at).toLocaleDateString() : '--'}
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.trial_active ? (
                                                <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Activo</span>
                                            ) : (
                                                <span className="text-gray-400 flex items-center gap-1"><XCircle className="w-3 h-3" /> Expirado</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {u.is_premium ? (
                                                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                                            ) : (
                                                <ShieldAlert className="w-5 h-5 text-gray-300" />
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {!u.is_admin && (
                                                <button
                                                    onClick={() => togglePremium(u.id)}
                                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${u.is_premium ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                                                >
                                                    {u.is_premium ? 'Revocar Pago' : 'Confirmar Pago'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {tab === 'feedback' && (
                    <div className="grid grid-cols-1 gap-4">
                        {feedbacks.length === 0 && <p className="text-center py-20 text-gray-400">No hay feedback registrado.</p>}
                        {feedbacks.map((f) => (
                            <div key={f.id} className={`bg-white rounded-2xl p-6 border transition-all ${f.estado === 'resuelto' ? 'border-gray-100 opacity-60' : 'border-indigo-100 shadow-sm'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${f.tipo === 'fallo' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {f.tipo}
                                        </span>
                                        <span className="text-sm font-bold border-l pl-2">{f.username}</span>
                                        <span className="text-xs text-gray-400">{new Date(f.created_at).toLocaleString()}</span>
                                    </div>
                                    {f.estado !== 'resuelto' && (
                                        <button
                                            onClick={() => resolveFeedback(f.id)}
                                            className="text-xs bg-green-50 text-green-600 hover:bg-green-100 px-3 py-1 rounded-lg font-bold transition-all"
                                        >
                                            Marcar leido
                                        </button>
                                    )}
                                </div>
                                <p className="text-slate-600">{f.mensaje}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
