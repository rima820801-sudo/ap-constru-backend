import React from 'react';
import { Sparkles, Construction, Clock, Rocket } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';

export const ChangelogPage = () => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />
            <div className="py-12 px-4 flex-1">
                <div className="max-w-3xl mx-auto space-y-8">
                    <header className="text-center space-y-4">
                        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider">
                            <Construction className="w-4 h-4" /> Laboratorio de Desarrollo
                        </div>
                        <h1 className="text-4xl font-black text-slate-900">Próximas Mejoras</h1>
                        <p className="text-slate-500 text-lg">
                            Estamos trabajando constantemente para hacer de APU Builder la herramienta definitiva para tus presupuestos.
                        </p>
                    </header>

                    <div className="bg-white rounded-[32px] p-10 shadow-sm border border-slate-100 text-center space-y-6">
                        <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Clock className="w-10 h-10 text-indigo-600 animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 italic">"Trabajando en nuevas funciones..."</h2>
                        <p className="text-slate-500 max-w-md mx-auto">
                            Nuestro equipo está integrando nuevas capacidades de análisis paramétrico y reportes gráficos avanzados.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8 text-left">
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                                <Rocket className="w-5 h-5 text-indigo-500 mt-1" />
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm">Base de Datos Regional</h4>
                                    <p className="text-xs text-slate-500">Precios actualizados por estado y ciudad.</p>
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                                <Sparkles className="w-5 h-5 text-indigo-500 mt-1" />
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm">IA Visual</h4>
                                    <p className="text-xs text-slate-500">Carga un plano o foto y deja que la IA cuantifique.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-slate-400 text-xs">Versión v1.0.0 (Lanzamiento inicial)</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
