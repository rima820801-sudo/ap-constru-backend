import React, { useState, useEffect } from 'react';
import {
    Package,
    Trash2,
    X,
    Save,
    History,
    Import,
    ArrowRight,
    Sparkles,
    Loader2
} from 'lucide-react';
import { API_BASE_URL } from '../api/client';
import { Navbar } from '../components/layout/Navbar';

const PRICE_TIER_LABELS = ['Más económico', 'Regular', 'Más caro'] as const;

type PriceTierLabel = (typeof PRICE_TIER_LABELS)[number];

type PriceTier = {
    label: PriceTierLabel;
    precio: number | null;
};

function createBlankCotizacion(): Cotizacion {
    return {
        tienda1: '', precio1: 0, tienda1_url: '',
        tienda2: '', precio2: 0, tienda2_url: '',
        tienda3: '', precio3: 0, tienda3_url: '',
    };
}

function parsePrecio(raw: unknown): number {
    if (typeof raw === 'number') {
        return raw;
    }
    if (typeof raw === 'string') {
        const cleaned = raw.replace(/[^0-9.-]+/g, '');
        const parsed = parseFloat(cleaned);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}

function buildCotizacionFromResponse(data: any): Cotizacion {
    return {
        tienda1: data.tienda1 || '',
        precio1: parsePrecio(data.precio1),
        tienda1_url: data.tienda1_url || '',
        tienda2: data.tienda2 || '',
        precio2: parsePrecio(data.precio2),
        tienda2_url: data.tienda2_url || '',
        tienda3: data.tienda3 || '',
        precio3: parsePrecio(data.precio3),
        tienda3_url: data.tienda3_url || '',
    };
}


function getTopThreeOptions(cotizacion: Cotizacion): PriceTier[] {
    const prices = [1, 2, 3]
        .map((idx) => parsePrecio((cotizacion as any)[`precio${idx}`]))
        .filter((value) => value > 0)
        .sort((a, b) => a - b);

    return PRICE_TIER_LABELS.map((label, index) => ({
        label,
        precio: prices[index] ?? null,
    }));
}

// --- Tipos ---
type Cotizacion = {
    tienda1: string; precio1: number; tienda1_url: string;
    tienda2: string; precio2: number; tienda2_url: string;
    tienda3: string; precio3: number; tienda3_url: string;
};

type ComparacionItem = {
    id: string;
    nombre: string;
    unidad: string;
    isLoading?: boolean; // Estado de carga individual
    cotizaciones: Cotizacion;
};

type ComparacionGuardada = {
    id: string;
    nombre: string;
    fecha: string;
    items: ComparacionItem[];
};

export default function ComparadorPage() {
    const [view, setView] = useState<'active' | 'history'>('active');
    const [showImportModal, setShowImportModal] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [tabla, setTabla] = useState<ComparacionItem[]>([]);
    const [tituloComparacion, setTituloComparacion] = useState('');
    const [historial, setHistorial] = useState<ComparacionGuardada[]>([]);
    useEffect(() => {
        const guardados = JSON.parse(localStorage.getItem('comparaciones') || '[]');
        setHistorial(guardados);
    }, []);

    // --- FUNCIONES DE LÓGICA ---

    // FUSIÓN: Agregar y Cotizar en un solo paso
    const handleAgregarYCotizar = async () => {
        const nombreMaterial = inputValue.trim();
        if (!nombreMaterial) return;

        const id = crypto.randomUUID();

        // 1. Agregar ítem en estado de carga (Loading)
        const nuevo: ComparacionItem = {
            id,
            nombre: nombreMaterial,
            unidad: 'pza',
            isLoading: true, // Empieza cargando
            cotizaciones: createBlankCotizacion()
        };

        setTabla(prev => [nuevo, ...prev]); // Lo ponemos al principio para verlo rápido
        setInputValue('');

        // 2. Disparar búsqueda automática
        try {
            const response = await fetch(`${API_BASE_URL}/ia/cotizar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ material: nombreMaterial }),
            });

            if (!response.ok) throw new Error('Error en la API');
            const data = await response.json();

            const cotizacionIA = buildCotizacionFromResponse(data);

            // 3. Actualizar con los datos recibidos
            setTabla(prev => prev.map(i => i.id === id ? {
                ...i,
                isLoading: false,
                cotizaciones: cotizacionIA
            } : i));

        } catch (error) {
            console.error(error);
            alert("Error al consultar IA");
            setTabla(prev => prev.map(i => i.id === id ? { ...i, isLoading: false } : i));
        }
    };

    // Función para re-cotizar un ítem individual si se desea
    const handleReCotizar = async (id: string, nombreMaterial: string) => {
        setTabla(prev => prev.map(i => i.id === id ? { ...i, isLoading: true } : i));
        try {
            const response = await fetch(`${API_BASE_URL}/ia/cotizar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ material: nombreMaterial }),
            });

            if (!response.ok) throw new Error('Error en la API');
            const data = await response.json();

            const cotizacionIA = buildCotizacionFromResponse(data);
            setTabla(prev => prev.map(i => i.id === id ? {
                ...i, isLoading: false,
                cotizaciones: cotizacionIA
            } : i));
        } catch (error) {
            console.error(error);
            setTabla(prev => prev.map(i => i.id === id ? { ...i, isLoading: false } : i));
        }
    };

    const handleImportarProyecto = (proyecto: ComparacionGuardada) => {
        if (!proyecto.items?.length) {
            return alert('El proyecto no tiene insumos guardados.');
        }
        const nuevosItems = proyecto.items.map((item) => ({
            id: crypto.randomUUID(),
            nombre: item.nombre,
            unidad: item.unidad || 'pza',
            cotizaciones: createBlankCotizacion()
        }));
        setTabla(prev => [...prev, ...nuevosItems]);
        setTituloComparacion(`Comparativa: ${proyecto.nombre}`);
        setShowImportModal(false);
    };

    const handleGuardarComparacion = () => {
        if (tabla.length === 0) return alert('No hay datos para guardar.');
        const nuevaComparacion: ComparacionGuardada = {
            id: crypto.randomUUID(),
            nombre: tituloComparacion || `Comparación ${new Date().toLocaleDateString()}`,
            fecha: new Date().toLocaleDateString('es-MX'),
            items: tabla
        };
        const nuevoHistorial = [nuevaComparacion, ...historial];
        setHistorial(nuevoHistorial);
        localStorage.setItem('comparaciones', JSON.stringify(nuevoHistorial));
        alert('✅ Comparación guardada exitosamente en el historial.');
    };

    const handleCargarHistorial = (comp: ComparacionGuardada) => {
        if (window.confirm("Esto reemplazará la tabla actual. ¿Continuar?")) {
            setTabla(comp.items);
            setTituloComparacion(comp.nombre);
            setView('active');
        }
    };

    const handleBorrarHistorial = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("¿Borrar esta comparación?")) {
            const filtrado = historial.filter(h => h.id !== id);
            setHistorial(filtrado);
            localStorage.setItem('comparaciones', JSON.stringify(filtrado));
        }
    };

    const updateItem = (id: string, field: string, val: any, isCotizacion = false) => {
        setTabla(prev => prev.map(item => {
            if (item.id !== id) return item;
            if (isCotizacion) return { ...item, cotizaciones: { ...item.cotizaciones, [field]: val } };
            return { ...item, [field]: val };
        }));
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
            <Navbar />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

                {/* VISTA COTIZADOR */}
                {view === 'active' && (
                    <div className="animate-in fade-in slide-in-from-left-4">
                        <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
                            <div className="text-sm text-gray-600">Precios orientativos generados por la IA</div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowImportModal(true)} className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm">
                                    <Import className="w-4 h-4" /> Importar de Proyecto
                                </button>
                                <button onClick={handleGuardarComparacion} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm transition-colors">
                                    <Save className="w-4 h-4" /> Guardar
                                </button>
                            </div>
                        </div>
                        {/* Barra de Agregar y Cotizar Directo */}
                        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm flex gap-3">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAgregarYCotizar()}
                                placeholder="Escribe un material (ej. Cemento 50kg) para cotizar..."
                                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                                onClick={handleAgregarYCotizar}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-md shadow-indigo-200 transition-all"
                            >
                                <Sparkles className="w-4 h-4" /> Cotizar Ahora
                            </button>
                        </div>

                        {tabla.length > 0 ? (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left min-w-[600px]">
                                        <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-xs">
                                            <tr>
                                                <th className="px-6 py-4 w-1/4">Material / Insumo</th>
                                                <th className="px-4 py-4 w-1/4 bg-blue-50/50 text-blue-600 border-l">Opción A</th>
                                                <th className="px-4 py-4 w-1/4 border-l">Opción B</th>
                                                <th className="px-4 py-4 w-1/4 border-l">Opción C</th>
                                                <th className="px-2 py-4 w-10 text-center"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {tabla.map((item) => {
                                                const topOptions = getTopThreeOptions(item.cotizaciones);
                                                return (
                                                    <React.Fragment key={item.id}>
                                                        <tr className="hover:bg-gray-50 group">
                                                            <td className="px-6 py-3 align-top relative">
                                                        {/* Loading Overlay para el item */}
                                                        {item.isLoading && (
                                                            <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center gap-2 text-indigo-600 text-xs font-medium">
                                                                <Loader2 className="w-4 h-4 animate-spin" /> Buscando precios...
                                                            </div>
                                                        )}

                                                        <input type="text" value={item.nombre} onChange={(e) => updateItem(item.id, 'nombre', e.target.value)} className="w-full font-medium text-gray-900 bg-transparent border-none p-0 focus:ring-0 mb-1" aria-label="Nombre del material" />
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs text-gray-400">{item.unidad}</span>
                                                            <button
                                                                onClick={() => handleReCotizar(item.id, item.nombre)}
                                                                className="text-[10px] text-indigo-400 hover:text-indigo-600 hover:underline flex items-center gap-1"
                                                            >
                                                                <Sparkles className="w-3 h-3" /> Recotizar
                                                            </button>
                                                        </div>
                                                    </td>
                                                    {/* Opciones de Precios */}
                                                    {['1', '2', '3'].map((n) => {
                                                        const tiendaKey = `tienda${n}`;
                                                        return (
                                                            <td key={n} className={`px-4 py-3 border-l border-gray-100 ${n === '1' ? 'bg-blue-50/30' : ''}`}>
                                                                <input type="text" placeholder={`Proveedor ${n}`} value={(item.cotizaciones as any)[tiendaKey]} onChange={(e) => updateItem(item.id, `tienda${n}`, e.target.value, true)} className="w-full text-xs mb-1 bg-white border border-gray-200 rounded px-2 py-1" />
                                                                <div className="relative"><span className="absolute left-2 top-1 text-gray-400 text-xs">$</span><input type="number" placeholder="0.00" value={(item.cotizaciones as any)[`precio${n}`] || ''} onChange={(e) => updateItem(item.id, `precio${n}`, parseFloat(e.target.value), true)} className="w-full text-sm font-bold text-gray-800 pl-5 bg-white border border-gray-200 rounded px-2 py-1" /></div>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-2 py-3 text-center align-middle">
                                                        <button onClick={() => setTabla(t => t.filter(i => i.id !== item.id))} className="text-gray-300 hover:text-red-500 p-1" title="Eliminar fila" aria-label="Eliminar fila"><Trash2 className="w-4 h-4" /></button>
                                                    </td>
                                                        </tr>
                                                        {topOptions.some((tier) => tier.precio !== null) && (
                                                            <tr>
                                                                <td colSpan={5} className="px-6 pt-0 pb-4 bg-white">
                                                                    <div className="grid gap-3 md:grid-cols-3">
                                                                        {topOptions.map((tier, index) => (
                                                                            <div
                                                                                key={`${item.id}-tier-${index}`}
                                                                                className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 hover:border-indigo-300 hover:shadow transition-colors"
                                                                            >
                                                                                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                                                                                    {tier.label}
                                                                                </span>
                                                                                {tier.precio !== null ? (
                                                                                    <div className="text-2xl font-bold text-indigo-600">
                                                                                        ${tier.precio.toFixed(2)}
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="text-xs text-gray-400">
                                                                                        Sin datos
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl"><Package className="w-12 h-12 mx-auto mb-3 text-gray-300" /><p className="text-gray-500">Escribe un material arriba para cotizar automáticamente.</p></div>
                        )}
                    </div>
                )}

                {/* VISTA HISTORIAL */}
                {view === 'history' && (
                    <div className="animate-in fade-in slide-in-from-right-4">
                        <div className="flex items-center gap-2 mb-6"><h2 className="text-xl font-bold text-slate-900">Comparaciones Guardadas</h2><span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{historial.length}</span></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {historial.map(comp => (
                                <div key={comp.id} onClick={() => handleCargarHistorial(comp)} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all group relative">
                                    <div className="flex justify-between items-start"><div><h3 className="font-bold text-gray-800 group-hover:text-indigo-700">{comp.nombre}</h3><p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><History className="w-3 h-3" /> {comp.fecha}</p></div><button onClick={(e) => handleBorrarHistorial(comp.id, e)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Borrar historial" aria-label="Borrar historial"><Trash2 className="w-4 h-4" /></button></div>
                                    <div className="mt-4 flex items-center gap-2"><span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded border border-indigo-100">{comp.items.length} items analizados</span><span className="text-xs text-gray-400 flex items-center gap-1 ml-auto group-hover:text-indigo-500">Cargar <ArrowRight className="w-3 h-3" /></span></div>
                                </div>
                            ))}
                            {historial.length === 0 && <div className="col-span-2 text-center py-12 text-gray-400 italic">No hay historial guardado.</div>}
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL IMPORTAR */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6">
                        <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-gray-800">Selecciona un Proyecto</h3><button onClick={() => setShowImportModal(false)} title="Cerrar modal" aria-label="Cerrar modal"><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button></div>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                            {historial.length > 0 ? (
                                historial.map(comp => (
                                    <button key={comp.id} onClick={() => handleImportarProyecto(comp)} className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all group">
                                        <div className="font-bold text-gray-800 group-hover:text-indigo-700">{comp.nombre}</div>
                                        <div className="text-xs text-gray-500 mt-1">{comp.items.length} insumos registrados</div>
                                    </button>
                                ))
                            ) : (
                                <div className="text-sm text-center text-gray-400">
                                    Guarda una comparacion y aparecera aqui para importarla.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
