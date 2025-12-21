import React, { useState } from 'react';
import { MessageSquarePlus, X, Send, AlertTriangle, Lightbulb } from 'lucide-react';
import { apiFetch } from '../../api/client';

export const FeedbackModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [tipo, setTipo] = useState<'fallo' | 'sugerencia' | 'otro'>('sugerencia');
    const [mensaje, setMensaje] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!mensaje.trim()) return;

        setLoading(true);
        try {
            await apiFetch('/admin/feedback', {
                method: 'POST',
                body: { tipo, mensaje }
            });
            setSent(true);
            setTimeout(() => {
                setSent(false);
                setIsOpen(false);
                setMensaje('');
            }, 2000);
        } catch (err) {
            alert('Error al enviar. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 group z-40"
                title="Enviar sugerencia o reporte"
            >
                <MessageSquarePlus className="w-6 h-6" />
                <span className="absolute right-full mr-4 bg-slate-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    ¿Sugerencias o fallos?
                </span>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <MessageSquarePlus className="w-5 h-5" /> Tu opinión nos ayuda
                    </h3>
                    <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {sent ? (
                        <div className="py-10 text-center space-y-4">
                            <div className="bg-green-100 text-green-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                                <CheckIcon className="w-8 h-8" />
                            </div>
                            <p className="font-bold text-gray-900">¡Gracias por tu mensaje!</p>
                            <p className="text-gray-500 text-sm">Lo revisaremos pronto para mejorar la app.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setTipo('sugerencia')}
                                    className={`flex-1 p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${tipo === 'sugerencia' ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm' : 'border-gray-100 text-gray-500 bg-gray-50'}`}
                                >
                                    <Lightbulb className="w-4 h-4" /> Sugerencia
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTipo('fallo')}
                                    className={`flex-1 p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${tipo === 'fallo' ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' : 'border-gray-100 text-gray-500 bg-gray-50'}`}
                                >
                                    <AlertTriangle className="w-4 h-4" /> Fallo/Bug
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Mensaje</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={mensaje}
                                    onChange={(e) => setMensaje(e.target.value)}
                                    placeholder="Escribe aquí tu observación..."
                                    className="w-full bg-slate-50 border border-gray-100 rounded-2xl p-4 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                                ></textarea>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                                {loading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                {loading ? 'Enviando...' : 'Enviar mensaje'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

const CheckIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12" /></svg>
);

const LoaderIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 2v4" /><path d="m16.2 7.8 2.9-2.9" /><path d="M18 12h4" /><path d="m16.2 16.2 2.9 2.9" /><path d="M12 18v4" /><path d="m4.9 19.1 2.9-2.9" /><path d="M2 12h4" /><path d="m4.9 4.9 2.9 2.9" /></svg>
);
