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
import { apiFetch } from '../api/client';
import { Navbar } from '../components/layout/Navbar';

type MaterialDTO = {
    id: number;
    nombre: string;
    unidad: string;
    precio_unitario: number;
    porcentaje_merma: number;
    precio_flete_unitario: number;
    disciplina?: string;
    calidad?: string;
    fecha_actualizacion?: string;
    obsoleto?: boolean;
};

// Definición de MatrizRow para poder trabajar con proyectos guardados desde AnalisisPuPage
type MatrizRow = {
    id?: number;
    concepto: number;
    tipo_insumo: "Material" | "ManoObra" | "Equipo" | "Maquinaria";
    id_insumo: number | "";
    cantidad: number;
    porcentaje_merma?: number | "";
    precio_flete_unitario?: number | "";
    rendimiento_jornada?: number | "";
    existe_en_catalogo?: boolean;
    nombre_sugerido?: string;
    justificacion_breve?: string;
    precio_unitario_temp?: number | "";
    unidad?: string;
};

type SavedProjectRecord = {
    id: string;
    nombre: string;
    descripcion: string;
    tipo_documento: 'Presupuesto' | 'Factura' | 'Nota de Venta';
    fecha: string;
    unidad_concepto?: string;
    rows?: MatrizRow[];
    ia_explanation?: string;
    total?: number;
    config?: {
        apu?: boolean;
        iva?: boolean;
        indirectos?: boolean;
        utilidad?: boolean;
        financiamiento?: boolean;
    };
};

const PRICE_TIER_LABELS = ['Más económico', 'Regular', 'Más caro'] as const;

type PriceTierLabel = (typeof PRICE_TIER_LABELS)[number];

// Función para verificar si un material tiene más de 5 días sin actualizar
function esMaterialDesactualizado(fechaActualizacion?: string): boolean {
    if (!fechaActualizacion) {
        // Si no hay fecha de actualización, asumimos que está desactualizado
        return true;
    }

    const fechaActual = new Date();
    const fechaActualizacionDate = new Date(fechaActualizacion);

    // Calcular la diferencia en días
    const diferenciaMs = fechaActual.getTime() - fechaActualizacionDate.getTime();
    const diferenciaDias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));

    return diferenciaDias > 5;
}

// Función para verificar si un material no tiene precio asignado
function esMaterialSinPrecio(precioUnitario: number): boolean {
    return precioUnitario <= 0;
}

// Función para guardar un material en el catálogo con el precio elegido
async function guardarEnCatalogo(nombre: string, precio: number, unidad: string = 'pza') {
    try {
        // Primero, verificar si el material ya existe
        const materiales = await apiFetch<MaterialDTO[]>('/materiales');
        const materialExistente = materiales.find(m => m.nombre.toLowerCase() === nombre.trim().toLowerCase());

        if (materialExistente) {
            // Si el material ya existe, actualizarlo
            const payload = {
                nombre: nombre.trim(),
                unidad: unidad,
                precio_unitario: precio,
                fecha_actualizacion: new Date().toISOString().split("T")[0],
                porcentaje_merma: 0.03, // Valor por defecto
                precio_flete_unitario: 0, // Valor por defecto
            };

            const response = await apiFetch<MaterialDTO>(`/materiales/${materialExistente.id}`, {
                method: 'PUT',
                body: payload
            });

            alert('Material actualizado exitosamente en el catálogo.');
            return response;
        } else {
            // Si el material no existe, crearlo
            const payload = {
                nombre: nombre.trim(),
                unidad: unidad,
                precio_unitario: precio,
                fecha_actualizacion: new Date().toISOString().split("T")[0],
                porcentaje_merma: 0.03, // Valor por defecto
                precio_flete_unitario: 0, // Valor por defecto
            };

            const response = await apiFetch<MaterialDTO>('/materiales', {
                method: 'POST',
                body: payload
            });

            alert('Material guardado exitosamente en el catálogo.');
            return response;
        }
    } catch (error: any) {
        console.error('Error al guardar en catálogo:', error);
        let errorMessage = 'Error al guardar el material en el catálogo.';

        // Manejar diferentes tipos de errores
        if (error instanceof Error) {
            errorMessage = `Error: ${error.message}`;
        } else if (typeof error === 'object' && error !== null) {
            if (error.response) {
                // Error de respuesta HTTP
                if (error.response.data && error.response.data.error) {
                    errorMessage = `Error ${error.response.status}: ${error.response.data.error}`;
                } else {
                    errorMessage = `Error HTTP ${error.response.status}: No se pudo guardar el material`;
                }
            } else if (error.request) {
                // Error de red
                errorMessage = 'Error de red: No se pudo conectar con el servidor';
            }
        }

        alert(errorMessage);
        return null;
    }
}

// Función para buscar precios de todos los materiales en la tabla
async function buscarPreciosParaTodos() {
    // Esta función se llamará desde dentro del componente para tener acceso al estado
}

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
    const [tabla, setTabla] = useState<ComparacionItem[]>(() => {
        const saved = localStorage.getItem('comparador_tabla');
        return saved ? JSON.parse(saved) : [];
    });
    const [tituloComparacion, setTituloComparacion] = useState('');
    const [historial, setHistorial] = useState<ComparacionGuardada[]>([]);
    const [proyectosAnalisis, setProyectosAnalisis] = useState<SavedProjectRecord[]>([]);

    // Efecto para guardar la tabla en localStorage cada vez que cambie
    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem('comparador_tabla', JSON.stringify(tabla));
        }
    }, [tabla]);

    useEffect(() => {
        const guardados = JSON.parse(localStorage.getItem('comparaciones') || '[]');
        setHistorial(guardados);

        // Cargar también los proyectos guardados desde AnalisisPuPage
        const proyectosGuardados = JSON.parse(localStorage.getItem('apu_saved_projects') || '[]');
        setProyectosAnalisis(proyectosGuardados);
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
            const data = await apiFetch('/ia/cotizar', {
                method: 'POST',
                body: { material: nombreMaterial },
            });

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
            const data = await apiFetch('/ia/cotizar', {
                method: 'POST',
                body: { material: nombreMaterial },
            });

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

    // Función para buscar precios de todos los materiales en la tabla
    const buscarPreciosParaTodos = async () => {
        if (tabla.length === 0) {
            alert('No hay materiales en la tabla para buscar precios.');
            return;
        }

        // Actualizar el estado para mostrar que todos están en carga
        setTabla(prev => prev.map(item => ({ ...item, isLoading: true })));

        try {
            // Hacer una sola solicitud con todos los materiales
            const materialesParaCotizar = tabla.map(item => item.nombre);

            const data = await apiFetch('/ia/cotizar_multiples', {
                method: 'POST',
                body: { materiales: materialesParaCotizar },
            });

            // Procesar la respuesta y actualizar la tabla
            if (data && Array.isArray(data.resultados)) {
                setTabla(prev => prev.map(item => {
                    const resultado = data.resultados.find((r: any) => r.material === item.nombre);
                    if (resultado) {
                        return {
                            ...item,
                            isLoading: false,
                            cotizaciones: buildCotizacionFromResponse(resultado)
                        };
                    }
                    return { ...item, isLoading: false }; // Quitar loading si no hay resultado
                }));
            } else {
                // Si no hay resultados en el formato esperado, quitar el estado de carga
                setTabla(prev => prev.map(item => ({ ...item, isLoading: false })));
                alert('No se recibieron resultados válidos para los materiales solicitados.');
            }
        } catch (error) {
            console.error('Error buscando precios para múltiples materiales:', error);
            // Quitar el estado de carga en caso de error
            setTabla(prev => prev.map(item => ({ ...item, isLoading: false })));
            alert('Error al buscar precios para los materiales.');
        }
    };

    // Función para importar proyectos desde AnalisisPuPage (con MatrizRow[])
    const handleImportarProyectoAnalisis = async (proyecto: SavedProjectRecord) => {
        if (!proyecto.rows?.length) {
            return alert('El proyecto no tiene insumos guardados.');
        }

        // Cargar catálogos para verificar precios y fechas de actualización
        let materialesCatalogo: Record<number, MaterialDTO> = {};
        try {
            const materiales = await apiFetch<MaterialDTO[]>(`/materiales`);
            materialesCatalogo = Object.fromEntries(materiales.map((item) => [item.id, item]));
        } catch (error) {
            console.error('Error al cargar catálogos:', error);
            alert('Error al cargar catálogos. Se importarán todos los materiales.');
        }

        // Filtrar solo los materiales que no tienen precio o tienen más de 5 días sin actualizar
        // y excluir términos que claramente sean mano de obra clasificados incorrectamente como material
        const palabrasNoMateriales = [
            'albañil', 'ayudante', 'general', 'plomero', 'electricista', 'pintor',
            'herramienta', 'maquinaria', 'equipo', 'mano de obra', 'manoobra',
            'jornalero', 'operador', 'tecnico', 'ingeniero', 'supervisor', 'oficial'
        ];

        const materialesFiltrados = proyecto.rows
            .filter(row => {
                // Solo incluir materiales, no otros tipos de insumos
                if (row.tipo_insumo !== 'Material') {
                    return false;
                }

                // Verificar si el nombre del insumo contiene palabras que indiquen que no es un material
                let nombreParaFiltrar = row.nombre_sugerido || '';
                if (row.existe_en_catalogo && typeof row.id_insumo === 'number') {
                    const material = materialesCatalogo[row.id_insumo as number];
                    if (material) {
                        nombreParaFiltrar = material.nombre;
                    }
                }

                const nombreLower = nombreParaFiltrar.toLowerCase();
                const contieneNoMaterial = palabrasNoMateriales.some(palabra =>
                    nombreLower.includes(palabra)
                );

                // Excluir ítems que contengan palabras de no materiales
                if (contieneNoMaterial) {
                    return false;
                }

                // Si no existe en catálogo o no tiene id_insumo, incluirlo
                if (!row.existe_en_catalogo || row.id_insumo === "" || typeof row.id_insumo !== 'number') {
                    return true;
                }

                // Verificar si el material está desactualizado o no tiene precio
                const materialId = row.id_insumo as number;
                const material = materialesCatalogo[materialId];

                if (!material) {
                    return true; // Si no se encuentra en el catálogo, incluirlo
                }

                const esDesactualizado = esMaterialDesactualizado(material.fecha_actualizacion);
                const esSinPrecio = esMaterialSinPrecio(material.precio_unitario);

                return esDesactualizado || esSinPrecio;
            })
            .map(row => {
                // Obtener el nombre del material
                let nombre = row.nombre_sugerido || `Material ${row.id_insumo}`;
                if (row.existe_en_catalogo && typeof row.id_insumo === 'number') {
                    const material = materialesCatalogo[row.id_insumo as number];
                    if (material) {
                        nombre = material.nombre;
                    }
                }

                // Obtener la unidad del material
                let unidad = row.unidad || 'pza';
                if (row.existe_en_catalogo && typeof row.id_insumo === 'number') {
                    const material = materialesCatalogo[row.id_insumo as number];
                    if (material) {
                        unidad = material.unidad;
                    }
                }

                return {
                    id: crypto.randomUUID(),
                    nombre,
                    unidad,
                    cotizaciones: createBlankCotizacion()
                };
            });

        if (materialesFiltrados.length === 0) {
            alert('No hay materiales sin precio o desactualizados en este proyecto.');
            return;
        }

        setTabla(prev => [...prev, ...materialesFiltrados]);
        setTituloComparacion(`Comparativa: ${proyecto.nombre}`);
        setShowImportModal(false);

        // Iniciar búsqueda de precios para todos los materiales importados
        if (materialesFiltrados.length > 0) {
            // Usar setTimeout para permitir que se actualice el estado antes de iniciar la búsqueda
            setTimeout(() => {
                void buscarPreciosParaTodos();
            }, 500); // Pequeño retraso para asegurar la actualización del estado
        }
    };

    // Función para importar proyectos desde el historial del Comparador (con ComparacionItem[])
    const handleImportarProyecto = async (proyecto: ComparacionGuardada) => {
        if (!proyecto.items?.length) {
            return alert('El proyecto no tiene insumos guardados.');
        }

        // Filtrar para excluir ítems que claramente no son materiales basados en palabras clave
        const palabrasNoMateriales = [
            'albañil', 'ayudante', 'general', 'plomero', 'electricista', 'pintor',
            'herramienta', 'maquinaria', 'equipo', 'mano de obra', 'manoobra',
            'jornalero', 'operador', 'tecnico', 'ingeniero', 'supervisor'
        ];

        const nuevosItems = proyecto.items
            .filter(item => {
                // Verificar si el nombre del ítem contiene palabras que indiquen que no es un material
                const nombreLower = item.nombre.toLowerCase();
                const contieneNoMaterial = palabrasNoMateriales.some(palabra =>
                    nombreLower.includes(palabra)
                );

                // Solo incluir ítems que no contengan palabras de no materiales
                return !contieneNoMaterial;
            })
            .map((item) => ({
                id: crypto.randomUUID(),
                nombre: item.nombre,
                unidad: item.unidad || 'pza',
                cotizaciones: createBlankCotizacion()
            }));

        setTabla(prev => [...prev, ...nuevosItems]);
        setTituloComparacion(`Comparativa: ${proyecto.nombre}`);
        setShowImportModal(false);

        // Iniciar búsqueda de precios para todos los materiales importados
        if (nuevosItems.length > 0) {
            // Usar setTimeout para permitir que se actualice el estado antes de iniciar la búsqueda
            setTimeout(() => {
                void buscarPreciosParaTodos();
            }, 500); // Pequeño retraso para asegurar la actualización del estado
        }
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
                                <button onClick={buscarPreciosParaTodos} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm transition-colors">
                                    <Sparkles className="w-4 h-4" /> Buscar Todos
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
                                                                                    <>
                                                                                        <div className="text-2xl font-bold text-indigo-600">
                                                                                            ${tier.precio.toFixed(2)}
                                                                                        </div>
                                                                                        <button
                                                                                            onClick={() => guardarEnCatalogo(item.nombre, tier.precio, item.unidad)}
                                                                                            className="mt-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded transition-colors"
                                                                                        >
                                                                                            Agregar
                                                                                        </button>
                                                                                    </>
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
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Selecciona un Proyecto</h3>
                            <button onClick={() => setShowImportModal(false)} title="Cerrar modal" aria-label="Cerrar modal">
                                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                            </button>
                        </div>
                        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                            {/* Proyectos de Análisis PU - solo materiales sin precio o desactualizados */}
                            {proyectosAnalisis.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">Proyectos de Análisis PU</h4>
                                    <div className="space-y-2">
                                        {proyectosAnalisis.map(proyecto => (
                                            <button
                                                key={proyecto.id}
                                                onClick={() => handleImportarProyectoAnalisis(proyecto)}
                                                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                                            >
                                                <div className="font-bold text-gray-800 group-hover:text-indigo-700">{proyecto.nombre}</div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {proyecto.rows ? proyecto.rows.filter(r => r.tipo_insumo === 'Material').length : 0} materiales
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Proyectos del historial del Comparador */}
                            {historial.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-gray-700 mb-2">Comparaciones Guardadas</h4>
                                    <div className="space-y-2">
                                        {historial.map(comp => (
                                            <button
                                                key={comp.id}
                                                onClick={() => handleImportarProyecto(comp)}
                                                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                                            >
                                                <div className="font-bold text-gray-800 group-hover:text-indigo-700">{comp.nombre}</div>
                                                <div className="text-xs text-gray-500 mt-1">{comp.items.length} insumos registrados</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {historial.length === 0 && proyectosAnalisis.length === 0 && (
                                <div className="text-sm text-center text-gray-400">
                                    No hay proyectos guardados disponibles para importar.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
