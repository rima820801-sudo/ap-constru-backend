import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { Navbar } from '../components/layout/Navbar';
import { Save, Info, Calculator, Calendar, ShieldCheck, Landmark } from 'lucide-react';

interface FasarConfig {
    valor_uma: number;
    salario_minimo_general: number;
    dias_del_anio: number;
    dias_aguinaldo_minimos: number;
    prima_vacacional_porcentaje: number;
    dias_festivos_obligatorios: number;
    dias_festivos_costumbre: number;
    dias_mal_tiempo: number;
    dias_riesgo_trabajo_promedio: number;
    dias_permisos_sindicales: number;
    prima_riesgo_trabajo_patronal: number;
    impuesto_sobre_nomina: number;
}

export const FasarConfigPage = () => {
    const [config, setConfig] = useState<FasarConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const data = await apiFetch<FasarConfig>('/admin/fasar');
            setConfig(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!config) return;

        setSaving(true);
        setMessage('');
        try {
            await apiFetch('/admin/fasar', {
                method: 'POST',
                body: config
            });
            setMessage('Configuración guardada correctamente');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            alert('Error al guardar la configuración');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (key: keyof FasarConfig, value: string) => {
        if (!config) return;
        setConfig({
            ...config,
            [key]: parseFloat(value) || 0
        });
    };

    if (loading) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Cargando...</div>;

    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />

            <main className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <Calculator className="w-8 h-8 text-indigo-600" />
                            Configuración FASAR
                        </h1>
                        <p className="text-slate-500 mt-1 font-medium">Parámetros base para el Factor de Salario Real (México)</p>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </header>

                {message && (
                    <div className="mb-6 p-4 bg-emerald-100 text-emerald-700 rounded-2xl font-bold border border-emerald-200 flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
                        <ShieldCheck className="w-5 h-5" /> {message}
                    </div>
                )}

                <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Sección 1: Referencias Nacionales */}
                    <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <Landmark className="w-5 h-5 text-indigo-500" />
                            Referencias Nacionales
                        </h2>

                        <div className="space-y-4">
                            <InputField
                                label="Valor UMA"
                                value={config?.valor_uma}
                                onChange={(v) => handleChange('valor_uma', v)}
                                help="Unidad de Medida y Actualización vigente (ej. 108.57 para 2024)"
                            />
                            <InputField
                                label="Salario Mínimo General"
                                value={config?.salario_minimo_general}
                                onChange={(v) => handleChange('salario_minimo_general', v)}
                                help="Salario mínimo vigente en la zona (ej. 248.93 para 2024)"
                            />
                            <InputField
                                label="Impuesto sobre Nómina (%)"
                                value={config?.impuesto_sobre_nomina ? config.impuesto_sobre_nomina * 100 : 0}
                                onChange={(v) => handleChange('impuesto_sobre_nomina', (parseFloat(v) / 100).toString())}
                                help="Porcentaje estatal (ej. 3% -> 0.03)"
                            />
                        </div>
                    </section>

                    {/* Sección 2: Calendario y Prestaciones */}
                    <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <Calendar className="w-5 h-5 text-indigo-500" />
                            Calendario y Prestaciones
                        </h2>

                        <div className="grid grid-cols-2 gap-4">
                            <InputField label="Días del Año" value={config?.dias_del_anio} onChange={(v) => handleChange('dias_del_anio', v)} />
                            <InputField label="Días Aguinaldo (Mín)" value={config?.dias_aguinaldo_minimos} onChange={(v) => handleChange('dias_aguinaldo_minimos', v)} />
                            <InputField label="Prima Vacacional (%)" value={config?.prima_vacacional_porcentaje ? config.prima_vacacional_porcentaje * 100 : 0} onChange={(v) => handleChange('prima_vacacional_porcentaje', (parseFloat(v) / 100).toString())} />
                            <InputField label="Días Riesgo (Promedio)" value={config?.dias_riesgo_trabajo_promedio} onChange={(v) => handleChange('dias_riesgo_trabajo_promedio', v)} />
                        </div>
                    </section>

                    {/* Sección 3: Días No Laborables */}
                    <section className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm md:col-span-2">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                            <Info className="w-5 h-5 text-indigo-500" />
                            Días Inactivos al Año (Estimados)
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                            <InputField label="Festivos Ley" value={config?.dias_festivos_obligatorios} onChange={(v) => handleChange('dias_festivos_obligatorios', v)} />
                            <InputField label="Festivos Costumbre" value={config?.dias_festivos_costumbre} onChange={(v) => handleChange('dias_festivos_costumbre', v)} />
                            <InputField label="Mal Tiempo" value={config?.dias_mal_tiempo} onChange={(v) => handleChange('dias_mal_tiempo', v)} />
                            <InputField label="Permisos/Otros" value={config?.dias_permisos_sindicales} onChange={(v) => handleChange('dias_permisos_sindicales', v)} />
                        </div>
                        <p className="mt-4 text-xs text-slate-400 italic">Nota: Los domingos y vacaciones se calculan automáticamente por el sistema.</p>
                    </section>

                    {/* Sección 4: Factor de Riesgo Empresa */}
                    <section className="bg-indigo-900 p-8 rounded-3xl shadow-xl md:col-span-2 text-white">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="space-y-2">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <ShieldCheck className="w-6 h-6 text-indigo-300" />
                                    Prima de Riesgo de Trabajo Patronal
                                </h2>
                                <p className="text-indigo-200 text-sm max-w-xl">
                                    Este valor se encuentra en tu registro patronal del IMSS.
                                    La Clase V (construcción) suele iniciar en 7.58875.
                                </p>
                            </div>
                            <div className="w-full md:w-64">
                                <input
                                    type="number"
                                    step="0.000001"
                                    value={config?.prima_riesgo_trabajo_patronal}
                                    onChange={(e) => handleChange('prima_riesgo_trabajo_patronal', e.target.value)}
                                    className="w-full bg-indigo-800 border-2 border-indigo-700 rounded-2xl px-6 py-4 text-2xl font-black text-center focus:border-white focus:ring-0 transition-all"
                                />
                            </div>
                        </div>
                    </section>
                </form>

                <div className="mt-12 p-6 bg-slate-100 rounded-3xl border border-slate-200 text-slate-600 text-sm leading-relaxed">
                    <p className="font-bold flex items-center gap-2 mb-2"><Info className="w-4 h-4" />¿Cómo afecta esto a mis presupuestos?</p>
                    Estos valores son los "cimientos" de tu cálculo de mano de obra. Cuando edites un trabajador en el catálogo,
                    el sistema aplicará estas constantes junto con el salario base y la antigüedad del trabajador para determinar
                    el costo real que pagarás (incluyendo IMSS, Infonavit, SAR e Impuestos locales).
                </div>
            </main>
        </div>
    );
};

const InputField = ({ label, value, onChange, help }: { label: string, value: any, onChange: (v: string) => void, help?: string }) => (
    <div className="space-y-1.5 flex flex-col">
        <label className="text-[10px] uppercase tracking-widest font-black text-slate-400">{label}</label>
        <div className="relative group">
            <input
                type="number"
                step="any"
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
            />
            {help && (
                <div className="absolute left-0 top-full mt-2 p-2 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 w-full pointer-events-none">
                    {help}
                </div>
            )}
        </div>
    </div>
);
