import React from 'react';
import { BookOpen, Sparkles, Database, FileText, CheckCircle } from 'lucide-react';

export const GuiaUsoPage = () => {
    const steps = [
        {
            icon: <Sparkles className="w-6 h-6 text-indigo-500" />,
            title: "Usa la Inteligencia Artificial",
            description: "En la sección de 'Análisis de Precios', escribe lo que necesitas construir (ej: 'Muro de block') y presiona 'Sugerencia Gemini'. La IA te dará una lista base de insumos.",
            color: "blue"
        },
        {
            icon: <Database className="w-6 h-6 text-emerald-500" />,
            title: "Ajusta con tu Catálogo",
            description: "Presiona 'Buscar Precios' para vincular los materiales sugeridos con los que ya tienes guardados en tu catálogo real para obtener costos precisos.",
            color: "emerald"
        },
        {
            icon: <FileText className="w-6 h-6 text-amber-500" />,
            title: "Genera tu Presupuesto",
            description: "Una vez satisfecho con el desglose, presiona 'Exportar PDF'. Podrás llenar los datos del cliente y de tu empresa para un documento profesional.",
            color: "amber"
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-4xl mx-auto space-y-12">
                <header className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider">
                        <BookOpen className="w-4 h-4" /> Centro de Ayuda
                    </div>
                    <h1 className="text-4xl font-black text-slate-900">¿Cómo usar APU Builder IA?</h1>
                    <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                        Optimiza tu tiempo y crea presupuestos profesionales en minutos siguiendo este flujo de trabajo.
                    </p>
                </header>

                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {steps.map((step, idx) => (
                        <div key={idx} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-4 relative overflow-hidden group hover:shadow-xl transition-all">
                            <div className="bg-slate-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                {step.icon}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">{step.description}</p>
                            <div className="text-slate-100 absolute -bottom-4 -right-4 font-black text-8xl pointer-events-none select-none">
                                {idx + 1}
                            </div>
                        </div>
                    ))}
                </section>

                <section className="bg-indigo-900 rounded-[40px] p-8 md:p-12 text-white overflow-hidden relative">
                    <div className="relative z-10 space-y-6 md:w-2/3">
                        <h2 className="text-3xl font-bold">Consejos de Experto</h2>
                        <ul className="space-y-4">
                            <li className="flex gap-3">
                                <CheckCircle className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                                <p className="text-indigo-100">Sé específico con la IA: En lugar de 'Piso', escribe 'Piso cerámico 30x30 asentado con adhesivo'.</p>
                            </li>
                            <li className="flex gap-3">
                                <CheckCircle className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                                <p className="text-indigo-100">Revisa la 'Merma': El sistema añade 3% por defecto, pero puedes ajustarlo según el material.</p>
                            </li>
                            <li className="flex gap-3">
                                <CheckCircle className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                                <p className="text-indigo-100">Comparador de Precios: Usa la sección 'Comparador' para pedirle a la IA cotizaciones reales en internet.</p>
                            </li>
                        </ul>
                    </div>
                    <Sparkles className="absolute top-1/2 right-10 -translate-y-1/2 w-64 h-64 text-white/5 pointer-events-none" />
                </section>

                <footer className="text-center pt-8 border-t border-slate-200">
                    <p className="text-slate-400 text-sm">¿Aún tienes dudas? Usa el botón de feedback azul en la esquina inferior derecha.</p>
                </footer>
            </div>
        </div>
    );
};
