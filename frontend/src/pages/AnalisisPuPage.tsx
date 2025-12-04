import { useEffect, useState } from "react";

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
    const [conceptoForm, setConceptoForm] = useState<ConceptoForm>(() => emptyConceptoForm());
    const [selectedConceptId, setSelectedConceptId] = useState<number | null>(null);
    const [iaRows, setIaRows] = useState<MatrizRow[] | null>(null);
    const [guardarTrigger, setGuardarTrigger] = useState(0);
    const [resumen, setResumen] = useState({ costo_directo: 0, precio_unitario: 0 });
    const [iaExplanation, setIaExplanation] = useState<string>("");
    const [textoDetalles, setTextoDetalles] = useState<string>("");
    const [cargandoExplicacion, setCargandoExplicacion] = useState(false);
    const [matrizDraft, setMatrizDraft] = useState<MatrizRow[]>([]);
    const [notaVentaData, setNotaVentaData] = useState<NotaVenta | null>(null);
    const [matrizNotaVenta, setMatrizNotaVenta] = useState<MatrizRow[]>([]);
    const [sobrecostos, setSobrecostos] = useState<FactorToggleMap>(() => initialSobrecostos());
    const [showSelector, setShowSelector] = useState(false);

    useEffect(() => {
        void loadConceptos();
    }, []);

    useEffect(() => {
        if (selectedConceptId) {
            void loadConceptoDetalle(selectedConceptId);
        } else {
            setConceptoForm(emptyConceptoForm());
        }
        setIaExplanation("");
        setTextoDetalles("");
    }, [selectedConceptId]);

    useEffect(() => {
        if (selectedConceptId) {
            setMatrizDraft([]);
        }
    }, [selectedConceptId]);

    async function loadConceptos() {
        const data = await apiFetch<Concepto[]>(`/conceptos`);
        if (data.length && !selectedConceptId) {
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
        if (!conceptoForm.clave || !conceptoForm.descripcion || !conceptoForm.unidad_concepto) return;
        const payload = {
            clave: conceptoForm.clave,
            descripcion: conceptoForm.descripcion,
            unidad_concepto: conceptoForm.unidad_concepto,
        };
        if (conceptoForm.id) {
            await apiFetch(`/conceptos/${conceptoForm.id}`, { method: "PUT", body: payload });
            setGuardarTrigger((prev) => prev + 1);
            await loadConceptos();
            return;
        }
        const created = await apiFetch<Concepto>(`/conceptos`, { method: "POST", body: payload });
        await guardarMatrizRemota(created.id, matrizDraft);
        setConceptoForm((prev) => ({ ...prev, id: created.id }));
        setSelectedConceptId(created.id);
        setMatrizDraft([]);
        await loadConceptos();
    }

    async function handleBorrarTodo() {
        if (!hayConceptoGuardado && (conceptoForm.descripcion || matrizDraft.length > 0)) {
            if (!confirm("Este proyecto no se ha guardado y no habrá forma de recuperarlo. ¿Estás seguro?")) {
                return;
            }
        } else if (hayConceptoGuardado) {
            if (!confirm("¿Estás seguro de limpiar el editor? Se perderán los cambios no guardados.")) {
                return;
            }
        }

        setConceptoForm(emptyConceptoForm());
        setSelectedConceptId(null);
        setMatrizDraft([]);
        setIaRows(null);
        setIaExplanation("");
        setTextoDetalles("");
        setResumen({ costo_directo: 0, precio_unitario: 0 });
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
        try {
            const data = await apiFetch<ChatApuResponse>(`/ia/chat_apu`, {
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
        } catch (error) {
            console.error("Error al solicitar /ia/chat_apu", error);
        }
    }

    function handleGuardarMatriz() {
        if (!conceptoForm.id) return;
        setGuardarTrigger((prev) => prev + 1);
    }

    async function handleDetallesSugerencia() {
        const explicacionActual = iaExplanation.trim();
        if (explicacionActual.length > 0) {
            setTextoDetalles(explicacionActual);
            return;
        }
        if (!conceptoForm.id && !conceptoForm.descripcion) return;
        setCargandoExplicacion(true);
        try {
            const params = conceptoForm.id
                ? `?concepto_id=${conceptoForm.id}`
                : `?descripcion_concepto=${encodeURIComponent(conceptoForm.descripcion)}`;
            const data = await apiFetch<{ explicacion: string }>(`/ia/explicar_sugerencia${params}`);
            setTextoDetalles(data.explicacion ?? "");
        } catch (error) {
            console.error("Error al obtener /ia/explicar_sugerencia", error);
        } finally {
            setCargandoExplicacion(false);
        }
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                <input
                                    className="w-full bg-white text-gray-900 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={conceptoForm.clave}
                                    onChange={(event) => handleChange("clave", event.target.value)}
                                    placeholder="Ej. Barda de tabique de 5 metros"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <textarea
                                    className="w-full bg-white text-gray-900 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={conceptoForm.descripcion}
                                    onChange={(event) => handleChange("descripcion", event.target.value)}
                                    rows={4}
                                    placeholder="Describe la actividad y especificaciones"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 italic">
                            Mientras más completa sea la descripción, mejor será la sugerencia de la IA.
                        </p>
                    </section>

                    {/* Tarjeta Resumen */}
                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <header className="mb-4">
                            <p className="text-xs font-bold text-gray-500 uppercase">Resumen financiero</p>
                        </header>
                        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <div>
                                <span className="block text-xs text-gray-500 mb-1">Costo directo</span>
                                <strong className="text-lg text-gray-900">${resumen.costo_directo.toFixed(2)}</strong>
                            </div>
                            <div>
                                <span className="block text-xs text-gray-500 mb-1">Precio unitario</span>
                                <strong className="text-lg text-indigo-600">${resumen.precio_unitario.toFixed(4)}</strong>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">Activa los sobrecostos que deseas incluir:</p>
                        <div className="space-y-3">
                            {(Object.keys(SOBRECOSTO_FIELDS) as FactorToggleKey[]).map((key) => {
                                const config = sobrecostos[key];
                                const meta = SOBRECOSTO_FIELDS[key];
                                return (
                                    <div key={key} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={config.activo}
                                                onChange={(event) => handleSobrecostoToggle(key, event.target.checked)}
                                                className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                aria-label={`Activar ${meta.label}`}
                                            />
                                            <div>
                                                <span className="block text-sm font-medium text-gray-700">{meta.label}</span>
                                                <span className="block text-[10px] text-gray-400">{meta.description}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="number"
                                                min={0}
                                                step={0.1}
                                                value={config.porcentaje}
                                                onChange={(event) => handleSobrecostoPorcentaje(key, event.target.value)}
                                                disabled={!config.activo}
                                                className="w-16 text-right text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
                                                aria-label={`Porcentaje de ${meta.label}`}
                                            />
                                            <span className="text-xs text-gray-500">%</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>

                {/* Columna Derecha */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Tarjeta Acciones */}
                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <header className="mb-4">
                            <p className="text-xs font-bold text-gray-500 uppercase">Acciones</p>
                        </header>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={handleSugerirAPUConIA}
                                disabled={!conceptoForm.descripcion}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                                Sugerencia Gemini
                            </button>
                            <button
                                type="button"
                                onClick={handleDetallesSugerencia}
                                disabled={!conceptoForm.descripcion || cargandoExplicacion}
                                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {cargandoExplicacion ? "Obteniendo..." : "Detalles de Sugerencia"}
                            </button>
                            <div className="w-px h-8 bg-gray-300 mx-2 self-center hidden sm:block"></div>
                            <button
                                type="button"
                                onClick={handleAbrirConcepto}
                                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <span>📂</span> Abrir
                            </button>
                            <button
                                type="button"
                                onClick={handleGuardarConcepto}
                                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                                Guardar
                            </button>
                            <button
                                type="button"
                                onClick={handleBorrarTodo}
                                className="bg-white border border-gray-300 text-red-600 hover:bg-red-50 hover:border-red-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                Borrar todo
                            </button>
                            <button
                                type="button"
                                disabled={!hayConceptoGuardado}
                                onClick={handleGenerarNotaVenta}
                                className="ml-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" /><polyline points="14 2" /><path d="M14 2v6h6" /><path d="M3 15h6" /><path d="M3 18h6" /><path d="M3 12h6" /></svg>
                                Nota de Venta
                            </button>
                        </div>
                    </section>

                    {cargandoExplicacion ? (
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
            </div>

            <NotaVentaModal nota={notaVentaData} matriz={matrizNotaVenta} onClose={() => setNotaVentaData(null)} />

            {showSelector && (
                <ConceptoSelectorModal
                    onSelect={handleConceptoSeleccionado}
                    onClose={() => setShowSelector(false)}
                />
            )}
        </div>
    );
}
