import { useEffect, useState, useId } from "react";

import { apiFetch } from "../api/client";
import {
    ConceptoMatrizEditor,
    type MatrizRow,
    type FactorToggleMap,
    type FactorToggleKey,
    mapearSugerenciasDesdeIA,
} from "../components/conceptos/ConceptoMatrizEditor";
import { NotaVentaModalFixed as NotaVentaModal, type NotaVenta } from "../components/conceptos/NotaVentaModalFixed";
import { Navbar } from "../components/layout/Navbar";
import { GeminiLoader } from "../components/ui/GeminiLoader";
import { ConceptoSelectorModal } from "../components/conceptos/ConceptoSelectorModal";

type Concepto = {
    id: number;
    clave: string;
    descripcion: string;
    unidad_concepto: string;
};

type ConceptoForm = {
    id: number | null;
    clave: string;
    descripcion: string;
    unidad_concepto: string;
};

type ChatApuInsumo = {
    tipo_insumo: "Material" | "ManoObra" | "Mano de Obra" | "Equipo" | "Maquinaria";
    insumo_id?: number | null;
    id_insumo?: number | "";
    cantidad?: number;
    merma?: number | null;
    porcentaje_merma?: number | null;
    flete_unitario?: number | null;
    precio_flete_unitario?: number | null;
    rendimiento_diario?: number | null;
    rendimiento_jornada?: number | null;
    nombre?: string | null;
    justificacion_breve?: string | null;
};

type ChatApuResponse = {
    explicacion?: string;
    insumos: ChatApuInsumo[];
};

const SOBRECOSTO_FIELDS: Record<FactorToggleKey, { label: string; description: string }> = {
    indirectos: {
        label: "Costos indirectos",
        description: "Supervision, herramientas, oficinas, etc.",
    },
    financiamiento: {
        label: "Financiamiento",
        description: "Costo financiero de ejecutar la obra.",
    },
    utilidad: {
        label: "Utilidad",
        description: "Margen deseado del contratista.",
    },
    iva: {
        label: "IVA",
        description: "Impuesto al valor agregado.",
    },
};

const initialSobrecostos = (): FactorToggleMap => ({
    indirectos: { activo: true, porcentaje: 15 },
    financiamiento: { activo: false, porcentaje: 5 },
    utilidad: { activo: true, porcentaje: 10 },
    iva: { activo: true, porcentaje: 16 },
});

const emptyConceptoForm = (): ConceptoForm => ({
    id: null,
    clave: "",
    descripcion: "",
    unidad_concepto: "",
});

export function AnalisisPuPage() {
    const [conceptoForm, setConceptoForm] = useState<ConceptoForm>(() => {
        const saved = localStorage.getItem("apu_draft_form");
        return saved ? JSON.parse(saved) : emptyConceptoForm();
    });
    const [selectedConceptId, setSelectedConceptId] = useState<number | null>(null);
    const [iaRows, setIaRows] = useState<MatrizRow[] | null>(() => {
        const saved = localStorage.getItem("apu_draft_ia_rows");
        return saved ? JSON.parse(saved) : null;
    });
    const [guardarTrigger, setGuardarTrigger] = useState(0);
    const [resumen, setResumen] = useState({ costo_directo: 0, precio_unitario: 0 });
    const [iaExplanation, setIaExplanation] = useState<string>(() => {
        return localStorage.getItem("apu_draft_ia_explanation") || "";
    });
    const [textoDetalles, setTextoDetalles] = useState<string>(() => {
        return localStorage.getItem("apu_draft_texto_detalles") || "";
    });
    const [metrosCuadrados, setMetrosCuadrados] = useState<number>(() => {
        const saved = localStorage.getItem("apu_draft_metros_cuadrados");
        return saved ? Number(saved) : 0;
    });

    const idPrefix = useId().replace(/:/g, "");
    const [cargandoIA, setCargandoIA] = useState(false);
    const [matrizDraft, setMatrizDraft] = useState<MatrizRow[]>(() => {
        const saved = localStorage.getItem("apu_draft_matriz");
        return saved ? JSON.parse(saved) : [];
    });
    const [notaVentaData, setNotaVentaData] = useState<NotaVenta | null>(null);
    const [matrizNotaVenta, setMatrizNotaVenta] = useState<MatrizRow[]>([]);
    const [sobrecostos, setSobrecostos] = useState<FactorToggleMap>(() => {
        const saved = localStorage.getItem("apu_draft_sobrecostos");
        return saved ? JSON.parse(saved) : initialSobrecostos();
    });

    // Persistence Effects
    useEffect(() => {
        localStorage.setItem("apu_draft_form", JSON.stringify(conceptoForm));
    }, [conceptoForm]);

    useEffect(() => {
        localStorage.setItem("apu_draft_matriz", JSON.stringify(matrizDraft));
    }, [matrizDraft]);

    useEffect(() => {
        localStorage.setItem("apu_draft_sobrecostos", JSON.stringify(sobrecostos));
    }, [sobrecostos]);

    useEffect(() => {
        if (iaRows) localStorage.setItem("apu_draft_ia_rows", JSON.stringify(iaRows));
        else localStorage.removeItem("apu_draft_ia_rows");
    }, [iaRows]);

    useEffect(() => {
        localStorage.setItem("apu_draft_ia_explanation", iaExplanation);
    }, [iaExplanation]);

    useEffect(() => {
        localStorage.setItem("apu_draft_texto_detalles", textoDetalles);
    }, [textoDetalles]);

    useEffect(() => {
        localStorage.setItem("apu_draft_metros_cuadrados", String(metrosCuadrados));
    }, [metrosCuadrados]);
    const [showSelector, setShowSelector] = useState(false);

    useEffect(() => {
        void loadConceptos();
    }, []);

    useEffect(() => {
        if (selectedConceptId) {
            void loadConceptoDetalle(selectedConceptId);
            setIaExplanation("");
            setTextoDetalles("");
        } else {
            const storedForm = localStorage.getItem("apu_builder_form");
            if (storedForm) {
                try {
                    setConceptoForm({ ...emptyConceptoForm(), ...JSON.parse(storedForm) });
                } catch {
                    setConceptoForm(emptyConceptoForm());
                }
            } else {
                setConceptoForm(emptyConceptoForm());
            }

            const storedIaRows = localStorage.getItem("apu_builder_ia_rows");
            if (storedIaRows) {
                try {
                    setIaRows(JSON.parse(storedIaRows));
                } catch {
                    setIaRows(null);
                }
            } else {
                setIaRows(null);
            }

            const storedIaExplanation = localStorage.getItem("apu_builder_ia_explanation");
            if (storedIaExplanation) {
                setIaExplanation(storedIaExplanation);
                setTextoDetalles(storedIaExplanation);
            } else {
                setIaExplanation("");
                setTextoDetalles("");
            }
        }
    }, [selectedConceptId]);

    useEffect(() => {
        if (!conceptoForm.id) {
            localStorage.setItem(
                "apu_builder_form",
                JSON.stringify({
                    clave: conceptoForm.clave,
                    descripcion: conceptoForm.descripcion,
                    unidad_concepto: conceptoForm.unidad_concepto,
                })
            );
        }
    }, [conceptoForm]);

    useEffect(() => {
        if (iaRows) {
            localStorage.setItem("apu_builder_ia_rows", JSON.stringify(iaRows));
        }
    }, [iaRows]);

    useEffect(() => {
        if (iaExplanation) {
            localStorage.setItem("apu_builder_ia_explanation", iaExplanation);
        }
    }, [iaExplanation]);

    useEffect(() => {
        if (selectedConceptId) {
            setMatrizDraft([]);
        }
    }, [selectedConceptId]);

    async function loadConceptos() {
        const data = await apiFetch<Concepto[]>(`/conceptos`);
        const hasLocalDraft = localStorage.getItem("apu_builder_form");
        if (data.length && !selectedConceptId && !hasLocalDraft) {
            setSelectedConceptId(data[0].id);
        }
    }

    async function loadConceptoDetalle(id: number) {
        const data = await apiFetch<Concepto>(`/conceptos/${id}`);
        setConceptoForm({
            id: data.id,
            clave: data.clave,
            descripcion: data.descripcion,
            unidad_concepto: data.unidad_concepto,
        });
    }

    function handleSobrecostoToggle(key: FactorToggleKey, checked: boolean) {
        setSobrecostos((prev) => ({
            ...prev,
            [key]: { ...prev[key], activo: checked },
        }));
    }

    function handleSobrecostoPorcentaje(key: FactorToggleKey, value: string) {
        const parsed = Number(value);
        setSobrecostos((prev) => ({
            ...prev,
            [key]: { ...prev[key], porcentaje: Number.isFinite(parsed) ? parsed : 0 },
        }));
    }

    async function handleGuardarConcepto() {
        if (!conceptoForm.clave || !conceptoForm.descripcion || !conceptoForm.unidad_concepto) {
            alert("Por favor completa los campos obligatorios (Nombre, Descripción, Unidad).");
            return;
        }
        const payload = {
            clave: conceptoForm.clave,
            descripcion: conceptoForm.descripcion,
            unidad_concepto: conceptoForm.unidad_concepto,
        };

        try {
            let conceptoId = conceptoForm.id;

            if (conceptoId) {
                await apiFetch(`/conceptos/${conceptoId}`, { method: "PUT", body: payload });
            } else {
                const created = await apiFetch<Concepto>(`/conceptos`, { method: "POST", body: payload });
                conceptoId = created.id;
                setConceptoForm((prev) => ({ ...prev, id: created.id }));
                setSelectedConceptId(created.id);

                // Si es nuevo, guardamos la matriz draft inicial
                if (matrizDraft.length > 0) {
                    await guardarMatrizRemota(created.id, matrizDraft);
                    setMatrizDraft([]);
                }
            }

            // Siempre disparamos el trigger para asegurar que el editor guarde cualquier cambio pendiente
            setGuardarTrigger((prev) => prev + 1);
            await loadConceptos();
            alert("Concepto guardado correctamente.");
        } catch (error) {
            console.error("Error al guardar concepto:", error);
            alert("Error al guardar el concepto.");
        }
    }

    async function handleBorrarTodo() {
        if (!confirm("¿Estás seguro de borrar todo el contenido actual?")) return;

        setConceptoForm(emptyConceptoForm());
        setMatrizDraft([]);
        setIaRows(null);
        setIaExplanation("");
        setTextoDetalles("");
        setMetrosCuadrados(0);
        setSobrecostos(initialSobrecostos());
        setSelectedConceptId(null);
        setResumen({ costo_directo: 0, precio_unitario: 0 });

        // Clear localStorage
        localStorage.removeItem("apu_draft_form");
        localStorage.removeItem("apu_draft_matriz");
        localStorage.removeItem("apu_draft_sobrecostos");
        localStorage.removeItem("apu_draft_ia_rows");
        localStorage.removeItem("apu_draft_ia_explanation");
        localStorage.removeItem("apu_draft_texto_detalles");
        localStorage.removeItem("apu_draft_metros_cuadrados");
    }

    function handleAbrirConcepto() {
        setShowSelector(true);
    }

    function handleConceptoSeleccionado(id: number) {
        setSelectedConceptId(id);
        setShowSelector(false);
    }

    function handleChange<K extends keyof ConceptoForm>(field: K, value: ConceptoForm[K]) {
        setConceptoForm((prev) => ({ ...prev, [field]: value }));
    }

    async function handleSugerirAPUConIA() {
        if (!conceptoForm.descripcion) return;
        setCargandoIA(true);
        try {
            const data = await apiFetch<ChatApuResponse & { metros_cuadrados_construccion?: number }>(`/ia/chat_apu`, {
                method: "POST",
                body: {
                    descripcion: conceptoForm.descripcion,
                    unidad: conceptoForm.unidad_concepto,
                    concepto_id: conceptoForm.id,
                },
            });
            const mappedRows = mapearSugerenciasDesdeIA(data.insumos ?? [], conceptoForm.id ?? 0);
            setIaRows(mappedRows);
            const explicacion = data.explicacion ?? "";
            setIaExplanation(explicacion);
            setTextoDetalles(explicacion);
            setMetrosCuadrados(data.metros_cuadrados_construccion || 0);
        } catch (error) {
            console.error("Error al solicitar /ia/chat_apu", error);
        } finally {
            setCargandoIA(false);
        }
    }

    function handleGuardarMatriz() {
        if (!conceptoForm.id) return;
        setGuardarTrigger((prev) => prev + 1);
    }



    async function guardarMatrizRemota(conceptoId: number, rows: MatrizRow[]) {
        if (!conceptoId || rows.length === 0) return;
        const existentes = await apiFetch<MatrizRow[]>(`/conceptos/${conceptoId}/matriz`);
        const idsActuales = new Set(rows.filter((row) => row.id).map((row) => row.id as number));
        for (const registro of existentes) {
            if (registro.id && !idsActuales.has(registro.id)) {
                await apiFetch(`/matriz/${registro.id}`, { method: "DELETE" });
            }
        }
        for (const row of rows) {
            if (!row.id_insumo) continue;
            const payload = {
                concepto: conceptoId,
                tipo_insumo: row.tipo_insumo,
                id_insumo: Number(row.id_insumo),
                cantidad: Number(row.cantidad),
                porcentaje_merma:
                    row.tipo_insumo === "Material" && row.porcentaje_merma !== ""
                        ? Number(row.porcentaje_merma)
                        : null,
                precio_flete_unitario:
                    row.tipo_insumo === "Material" && row.precio_flete_unitario !== ""
                        ? Number(row.precio_flete_unitario)
                        : null,
                rendimiento_jornada:
                    row.tipo_insumo === "ManoObra" && row.rendimiento_jornada !== ""
                        ? Number(row.rendimiento_jornada)
                        : null,
            };
            if (row.id) {
                await apiFetch(`/matriz/${row.id}`, { method: "PUT", body: payload });
            } else {
                await apiFetch<MatrizRow>(`/matriz`, { method: "POST", body: payload });
            }
        }
    }

    async function handleGenerarNotaVenta() {
        if (!conceptoForm.id || matrizDraft.length === 0 && !selectedConceptId) {
            alert("Guarda el concepto y su matriz de insumos antes de generar una nota de venta.");
            return;
        }

        const matrizParaEnviar = hayConceptoGuardado
            ? await apiFetch<MatrizRow[]>(`/conceptos/${conceptoForm.id}/matriz`)
            : matrizDraft;

        if (matrizParaEnviar.length === 0) {
            alert("La matriz de insumos esta vacia. No se puede generar una nota de venta.");
            return;
        }

        // Asegurarnos de que el concepto esté guardado antes de generar la nota
        if (!hayConceptoGuardado) {
            alert("Por favor guarda el concepto antes de generar la nota de venta.");
            return;
        }

        const payload: any = {
            descripcion: conceptoForm.descripcion,
            unidad: conceptoForm.unidad_concepto,
            matriz: matrizParaEnviar,
            concepto_id: conceptoForm.id,
        };

        try {
            const notaVenta = await apiFetch<NotaVenta>("/ventas/crear_nota_venta", {
                method: "POST",
                body: payload,
            });
            setNotaVentaData(notaVenta);
            setMatrizNotaVenta(matrizParaEnviar);
        } catch (error) {
            console.error("Error al generar la nota de venta:", error);
            alert("Hubo un error al generar la nota de venta. Revisa la consola para mas detalles.");
        }
    }

    const hayConceptoGuardado = Boolean(conceptoForm.id);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col relative">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna Izquierda */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Tarjeta Detalle */}
                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <header className="flex justify-between items-center mb-4">
                            <p className="text-xs font-bold text-gray-500 uppercase">Detalle del concepto</p>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${hayConceptoGuardado ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                {hayConceptoGuardado ? "Guardado" : "Borrador"}
                            </span>
                        </header>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor={`${idPrefix}-clave`} className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                <input
                                    id={`${idPrefix}-clave`}
                                    name={`${idPrefix}-clave`}
                                    className="w-full bg-white text-gray-900 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={conceptoForm.clave}
                                    onChange={(event) => handleChange("clave", event.target.value)}
                                    placeholder="Ej. Barda de tabique de 5 metros"
                                />
                            </div>
                            <div>
                                <label htmlFor={`${idPrefix}-unidad`} className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                                <input
                                    id={`${idPrefix}-unidad`}
                                    name={`${idPrefix}-unidad`}
                                    className="w-full bg-white text-gray-900 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={conceptoForm.unidad_concepto}
                                    onChange={(event) => handleChange("unidad_concepto", event.target.value)}
                                    placeholder="Ej. m2, Lote, Pza"
                                />
                            </div>
                            <div>
                                <label htmlFor={`${idPrefix}-descripcion`} className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <textarea
                                    id={`${idPrefix}-descripcion`}
                                    name={`${idPrefix}-descripcion`}
                                    className="w-full bg-white text-gray-900 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={conceptoForm.descripcion}
                                    onChange={(event) => handleChange("descripcion", event.target.value)}
                                    rows={4}
                                    placeholder="Describe la actividad y especificaciones"
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                type="button"
                                onClick={handleSugerirAPUConIA}
                                disabled={!conceptoForm.descripcion}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm w-full justify-center sm:w-auto"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                                Sugerencia Gemini
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 italic">
                            Mientras más completa sea la descripción, mejor será la sugerencia de la IA.
                        </p>
                    </section>

                    {/* Tarjeta Resumen */}
                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <header className="mb-6 flex items-center justify-between">
                            <p className="text-xs font-bold text-gray-400 tracking-wider uppercase">Resumen Financiero</p>
                            {cargandoIA && <span className="text-xs text-indigo-500 animate-pulse font-medium">Actualizando...</span>}
                        </header>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                                <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Costo Directo</span>
                                <strong className="text-xl text-gray-900 tracking-tight">${resumen.costo_directo.toFixed(2)}</strong>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 shadow-sm hover:shadow-md transition-shadow duration-300">
                                <span className="block text-[10px] font-semibold text-indigo-400 uppercase tracking-wide mb-1">Precio Unitario</span>
                                <strong className="text-xl text-indigo-600 tracking-tight">${resumen.precio_unitario.toFixed(2)}</strong>
                            </div>
                        </div>

                        {/* Metros Cuadrados de Construcción (Rediseñado) */}
                        <div className="mb-8 p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-between group hover:bg-blue-50 transition-colors duration-300">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Construcción Estimada</span>
                                    <div className="relative group/tooltip">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400 cursor-help"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 14a1 1 0 1 1 1-1 1 1 0 0 1-1 1zm1-4.5V12a1 1 0 0 0-2 0v-1.5a2.5 2.5 0 1 1 2.5 2.5z" /></svg>
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded shadow-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                            Calculado por Gemini basado en la descripción
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <strong className="text-2xl text-gray-800 font-bold tracking-tight">{metrosCuadrados > 0 ? metrosCuadrados.toFixed(2) : "--"}</strong>
                                    <span className="text-xs text-gray-500 font-medium">m²</span>
                                </div>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18" /><path d="M5 21V7l8-4 8 4v14" /><path d="M17 21v-8.5a1.5 1.5 0 0 0-1.5-1.5h-7a1.5 1.5 0 0 0-1.5 1.5V21" /></svg>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <p className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-3">Factores de Sobrecosto</p>
                            {(Object.keys(SOBRECOSTO_FIELDS) as FactorToggleKey[]).map((key) => {
                                const config = sobrecostos[key];
                                const meta = SOBRECOSTO_FIELDS[key];
                                return (
                                    <div key={key} className={`group flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${config.activo ? 'bg-white border-indigo-100 shadow-sm' : 'bg-gray-50/50 border-transparent hover:bg-gray-50'}`}>
                                        <div className="flex items-center gap-3">
                                            {/* Custom Switch */}
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={config.activo}
                                                onClick={() => handleSobrecostoToggle(key, !config.activo)}
                                                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${config.activo ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${config.activo ? 'translate-x-4' : 'translate-x-0'}`}
                                                />
                                            </button>

                                            <div className="flex flex-col">
                                                <span className={`text-sm font-medium transition-colors ${config.activo ? 'text-gray-900' : 'text-gray-500'}`}>{meta.label}</span>
                                                <span className="text-[10px] text-gray-400 hidden sm:block">{meta.description}</span>
                                            </div>
                                        </div>

                                        <div className={`flex items-center gap-2 transition-all duration-300 ${config.activo ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    id={`${idPrefix}-porcentaje-${key}`}
                                                    name={`${idPrefix}-porcentaje-${key}`}
                                                    min={0}
                                                    step={0.1}
                                                    value={config.porcentaje}
                                                    onChange={(event) => handleSobrecostoPorcentaje(key, event.target.value)}
                                                    disabled={!config.activo}
                                                    className="w-16 text-right text-sm font-medium bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-indigo-500 py-1.5 pr-6 text-gray-900 placeholder:text-gray-300"
                                                    placeholder="0"
                                                />
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">%</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>

                {/* Columna Derecha */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Botones de Acción (Reacomodados) */}
                    <div className="flex flex-wrap gap-2 justify-end">
                        <button
                            type="button"
                            onClick={handleAbrirConcepto}
                            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <span>📂</span> Abrir
                        </button>
                        <button
                            type="button"
                            onClick={handleGuardarConcepto}
                            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                            Guardar
                        </button>
                        <button
                            type="button"
                            onClick={handleBorrarTodo}
                            className="bg-white border border-gray-300 text-red-600 hover:bg-red-50 hover:border-red-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                            Borrar todo
                        </button>
                        <button
                            type="button"
                            disabled={!hayConceptoGuardado}
                            onClick={handleGenerarNotaVenta}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" /><polyline points="14 2" /><path d="M14 2v6h6" /><path d="M3 15h6" /><path d="M3 18h6" /><path d="M3 12h6" /></svg>
                            Nota de Venta
                        </button>
                    </div>

                    {cargandoIA ? (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex justify-center items-center min-h-[400px]">
                            <GeminiLoader />
                        </div>
                    ) : (
                        <ConceptoMatrizEditor
                            conceptoId={conceptoForm.id}
                            conceptoInfo={conceptoForm}
                            iaRows={iaRows ?? undefined}
                            iaExplanation={iaExplanation}
                            guardarTrigger={guardarTrigger}
                            onResumenChange={setResumen}
                            modoLocal={!hayConceptoGuardado}
                            externalRows={!hayConceptoGuardado ? matrizDraft : undefined}
                            onRowsChange={!hayConceptoGuardado ? setMatrizDraft : undefined}
                            factoresSobrecosto={sobrecostos}
                        />
                    )}
                </div>
            </div >

            <NotaVentaModal nota={notaVentaData} matriz={matrizNotaVenta} onClose={() => setNotaVentaData(null)} />

            {
                showSelector && (
                    <ConceptoSelectorModal
                        onSelect={handleConceptoSeleccionado}
                        onClose={() => setShowSelector(false)}
                    />
                )
            }
        </div >
    );
}
