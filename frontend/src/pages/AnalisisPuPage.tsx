import { useEffect, useState, useId } from "react";
import { Link } from "react-router-dom";
import { HelpCircle } from "lucide-react";

import { apiFetch } from "../api/client";
import {
    ConceptoMatrizEditor,
    type MatrizRow,
    type FactorToggleMap,
    type FactorToggleKey,
    mapearSugerenciasDesdeIA,
} from "../components/conceptos/ConceptoMatrizEditor";
import { PresupuestoPdfModal } from "../components/conceptos/PresupuestoPdfModal";
import { Navbar } from "../components/layout/Navbar";
import { GeminiLoader } from "../components/ui/GeminiLoader";
import { ConceptoSelectorModal } from "../components/conceptos/ConceptoSelectorModal";
import { PreguntasClarificadorasModal } from "../components/ui/PreguntasClarificadorasModal";
import { SaveProjectModal } from "../components/ui/SaveProjectModal";
import { OpenSavedProjectModal } from "../components/ui/OpenSavedProjectModal";
import type { ClarifyingHistoryEntry, ClarifyingQuestion } from "../types/clarification";
import type { SavedProjectRecord, SavedProjectType } from "../utils/savedProjects";
import { loadSavedProjects, persistSavedProjects } from "../utils/savedProjects";
import { useToast } from "../context/ToastContext";

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

const CLARIFICATION_HISTORY_STORAGE_KEY = "apu_clarification_history";
const CLARIFICATION_LAST_DESCRIPTION_STORAGE_KEY = "apu_clarification_last_description";
const DESCRIPTION_SIMILARITY_THRESHOLD = 0.45;

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
    unidad_concepto: "m2",
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
    const [calcularPorMetro, setCalcularPorMetro] = useState<boolean>(() => {
        if (typeof window === "undefined") return true;
        const saved = localStorage.getItem("apu_draft_calcular_por_metro");
        return saved !== null ? saved === "true" : true;
    });
    const [metrosCuadrados, setMetrosCuadrados] = useState<number>(() => {
        const saved = localStorage.getItem("apu_draft_metros_cuadrados");
        return saved ? Number(saved) : 0;
    });
    const [preguntasClarificadoras, setPreguntasClarificadoras] = useState<ClarifyingQuestion[]>([]);
    const [showPreguntasClarificadoras, setShowPreguntasClarificadoras] = useState(false);
    const [cargandoPreguntasClarificadoras, setCargandoPreguntasClarificadoras] = useState(false);
    const [clarificationHistory, setClarificationHistory] = useState<ClarifyingHistoryEntry[]>(() =>
        loadClarificationHistoryFromStorage()
    );
    const [clarificationInitialAnswers, setClarificationInitialAnswers] = useState<string[]>([]);
    const [lastClarificationDescription, setLastClarificationDescription] = useState<string>(() =>
        loadLastClarificationDescriptionFromStorage()
    );

    const idPrefix = useId().replace(/:/g, "");
    const [cargandoIA, setCargandoIA] = useState(false);
    const [matrizDraft, setMatrizDraft] = useState<MatrizRow[]>(() => {
        const saved = localStorage.getItem("apu_draft_matriz");
        return saved ? JSON.parse(saved) : [];
    });
    const [sobrecostos, setSobrecostos] = useState<FactorToggleMap>(() => {
        const saved = localStorage.getItem("apu_draft_sobrecostos");
        return saved ? JSON.parse(saved) : initialSobrecostos();
    });
    const [showSelector, setShowSelector] = useState(false);
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showOpenModal, setShowOpenModal] = useState(false);
    const [savedProjects, setSavedProjects] = useState<SavedProjectRecord[]>(() => loadSavedProjects());
    const { addToast } = useToast();

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
        if (typeof window === "undefined") return;
        localStorage.setItem("apu_draft_calcular_por_metro", String(calcularPorMetro));
    }, [calcularPorMetro]);

    useEffect(() => {
        localStorage.setItem("apu_draft_metros_cuadrados", String(metrosCuadrados));
    }, [metrosCuadrados]);
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
        setCalcularPorMetro(conceptoForm.unidad_concepto === "m2");
    }, [conceptoForm.unidad_concepto]);

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
        // Solo limpiar matrizDraft cuando se selecciona un concepto existente diferente
        // No limpiar cuando se guarda un nuevo concepto
        if (selectedConceptId && conceptoForm.id !== selectedConceptId) {
            setMatrizDraft([]);
        }
    }, [selectedConceptId, conceptoForm.id]);

    useEffect(() => {
        persistSavedProjects(savedProjects);
    }, [savedProjects]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        localStorage.setItem(CLARIFICATION_HISTORY_STORAGE_KEY, JSON.stringify(clarificationHistory));
    }, [clarificationHistory]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        localStorage.setItem(CLARIFICATION_LAST_DESCRIPTION_STORAGE_KEY, lastClarificationDescription);
    }, [lastClarificationDescription]);

    const hayConceptoGuardado = Boolean(conceptoForm.id);
    const modoLocal = !hayConceptoGuardado;

    function handleBuscarPrecios() {
        const materialesParaExportar = matrizDraft.filter(r =>
            r.tipo_insumo === "Material" &&
            (!r.existe_en_catalogo || !r.id_insumo)
        ).map(r => ({
            nombre: r.nombre_sugerido,
            unidad: r.unidad || "pza",
            cantidad: r.cantidad
        }));

        if (materialesParaExportar.length === 0) {
            addToast("No hay materiales nuevos para cotizar.", "info");
            return;
        }

        localStorage.setItem("comparador_import_items", JSON.stringify(materialesParaExportar));
        window.location.href = "/comparador";
    }

    const handleCerrarPreguntas = () => {
        setShowPreguntasClarificadoras(false);
        setPreguntasClarificadoras([]);
        setClarificationInitialAnswers([]);
    };

    useEffect(() => {
        if (!conceptoForm.descripcion) return;
        if (shouldRefreshClarification(lastClarificationDescription, conceptoForm.descripcion)) {
            handleCerrarPreguntas();
        }
    }, [conceptoForm.descripcion, lastClarificationDescription]);

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
        setCalcularPorMetro(data.unidad_concepto === "m2");
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

    function handleCalculoPorMetroChange(checked: boolean) {
        setCalcularPorMetro(checked);
        handleChange("unidad_concepto", checked ? "m2" : "proyecto");
    }

    async function handleGuardarConcepto(): Promise<boolean> {
        if (!conceptoForm.clave || !conceptoForm.descripcion) {
            addToast("Por favor completa los campos obligatorios (Nombre y Descripción).", "warning");
            return false;
        }
        const unidadConceptoActual = calcularPorMetro ? "m2" : "proyecto";
        handleChange("unidad_concepto", unidadConceptoActual);
        const payload = {
            clave: conceptoForm.clave,
            descripcion: conceptoForm.descripcion,
            unidad_concepto: unidadConceptoActual,
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
                    // No limpiar matrizDraft aquí para evitar que desaparezca la matriz en la UI
                    // La matriz se cargará desde el backend automáticamente
                }
            }

            // Siempre disparamos el trigger para asegurar que el editor guarde cualquier cambio pendiente
            setGuardarTrigger((prev) => prev + 1);
            await loadConceptos();
            addToast("Concepto guardado correctamente.", "success");
            return true;
        } catch (error) {
            console.error("Error al guardar concepto:", error);
            addToast("Error al guardar el concepto.", "error");
            return false;
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
        localStorage.removeItem("apu_draft_calcular_por_metro");
        // También limpiar los elementos "apu_builder_*" que se usan en la inicialización
        localStorage.removeItem("apu_builder_form");
        localStorage.removeItem("apu_builder_ia_rows");
        localStorage.removeItem("apu_builder_ia_explanation");
        // Y también los de clarificación
        localStorage.removeItem(CLARIFICATION_HISTORY_STORAGE_KEY);
        localStorage.removeItem(CLARIFICATION_LAST_DESCRIPTION_STORAGE_KEY);
    }

    function handleAbrirConcepto() {
        setShowSelector(true);
    }

    function handleConceptoSeleccionado(id: number) {
        setSelectedConceptId(id);
        setShowSelector(false);
    }

    function handleAbrirProyectoGuardado() {
        setShowOpenModal(true);
    }

    function handleCerrarOpenModal() {
        setShowOpenModal(false);
    }

    function handleProyectoSeleccionado(project: SavedProjectRecord) {
        setConceptoForm((prev) => ({
            ...prev,
            descripcion: project.descripcion,
            unidad_concepto: project.unidad_concepto ?? prev.unidad_concepto,
        }));
        if (project.rows) {
            setIaRows(project.rows);
            setMatrizDraft(project.rows);
        }
        if (project.ia_explanation) {
            setIaExplanation(project.ia_explanation);
            setTextoDetalles(project.ia_explanation);
        }
        setCalcularPorMetro((project.unidad_concepto ?? "").toLowerCase() === "m2");
        setShowOpenModal(false);
    }

    function handleChange<K extends keyof ConceptoForm>(field: K, value: ConceptoForm[K]) {
        setConceptoForm((prev) => ({ ...prev, [field]: value }));
    }

    async function prepararPreguntasClarificadoras() {
        const descripcionActual = (conceptoForm.descripcion || "").trim();
        if (!descripcionActual) return;
        const needsRefresh = shouldRefreshClarification(lastClarificationDescription, descripcionActual);
        const historyMap = new Map(clarificationHistory.map((entry) => [entry.pregunta, entry.respuesta]));
        if (needsRefresh) {
            setClarificationHistory([]);
        }
        setCargandoPreguntasClarificadoras(true);
        setPreguntasClarificadoras([]);
        try {
            const data = await apiFetch<{ preguntas: ClarifyingQuestion[] }>(`/ia/preguntas_clarificadoras`, {
                method: "POST",
                body: {
                    descripcion: conceptoForm.descripcion,
                },
            });
            const nuevasPreguntas = data.preguntas ?? [];
            const initialAnswers = nuevasPreguntas.map((pregunta) => historyMap.get(pregunta.pregunta) ?? "");
            setPreguntasClarificadoras(nuevasPreguntas);
            setClarificationInitialAnswers(initialAnswers);
            setLastClarificationDescription(descripcionActual);
            setShowPreguntasClarificadoras(true);
        } catch (error) {
            console.error("Error al obtener preguntas clarificadoras:", error);
            addToast("No se pudieron generar las preguntas clarificadoras. Intenta nuevamente.", "error");
        } finally {
            setCargandoPreguntasClarificadoras(false);
        }
    }

    function handleAbrirGuardarProyecto() {
        setShowSaveModal(true);
    }

    function handleCerrarSaveModal() {
        setShowSaveModal(false);
    }

    const rowsParaGuardar = (): MatrizRow[] => {
        const sourceRows = iaRows ?? matrizDraft;
        return sourceRows.map((row) => ({ ...row }));
    };

    async function handleGuardarProyecto(tipo: SavedProjectType) {
        const guardado = await handleGuardarConcepto();
        if (!guardado) return;
        const nombre = conceptoForm.clave || conceptoForm.descripcion.slice(0, 60);
        const unidadConceptoActual = calcularPorMetro ? "m2" : "proyecto";
        const config = {
            apu: true,
            iva: !!sobrecostos.iva.activo,
            indirectos: !!sobrecostos.indirectos.activo,
            utilidad: !!sobrecostos.utilidad.activo,
            financiamiento: !!sobrecostos.financiamiento.activo,
        };
        const nuevo: SavedProjectRecord = {
            id: String(Date.now()),
            nombre,
            descripcion: conceptoForm.descripcion,
            tipo_documento: tipo,
            fecha: new Date().toISOString(),
            unidad_concepto: unidadConceptoActual,
            rows: rowsParaGuardar(),
            ia_explanation: iaExplanation,
            config,
            total: resumen.precio_unitario || resumen.costo_directo,
        };
        setSavedProjects((prev) => [...prev, nuevo]);
        addToast(`Guardado como ${tipo}`, "success");
        setShowSaveModal(false);
    }

    const persistClarificationHistory = (respuestas: string[]) => {
        if (preguntasClarificadoras.length === 0) {
            setClarificationHistory([]);
            return;
        }
        const entries = preguntasClarificadoras.map((pregunta, index) => ({
            pregunta: pregunta.pregunta,
            respuesta: respuestas[index] ?? "",
        }));
        setClarificationHistory(entries);
    };

    async function handleSugerirAPUConIA(respuestasClarificadoras?: string[]): Promise<string | null> {
        if (!conceptoForm.descripcion) {
            return "Describe el concepto antes de solicitar la sugerencia.";
        }
        setCargandoIA(true);
        try {
            const unidadPreferida = calcularPorMetro ? "m2" : "proyecto";
            const payload: Record<string, unknown> = {
                descripcion: conceptoForm.descripcion,
                unidad: unidadPreferida,
                calcular_por_m2: calcularPorMetro,
                concepto_id: conceptoForm.id,
            };
            const providedResponses = Array.isArray(respuestasClarificadoras)
                ? respuestasClarificadoras.map((respuesta) => respuesta.trim())
                : [];
            const respuestasLimpias = providedResponses.filter((respuesta) => respuesta.length > 0);
            if (respuestasLimpias.length > 0) {
                payload.respuestas_clarificadoras = respuestasLimpias;
            }

            const data = await apiFetch<ChatApuResponse & { metros_cuadrados_construccion?: number }>(`/ia/chat_apu`, {
                method: "POST",
                body: payload,
            });
            const mappedRows = mapearSugerenciasDesdeIA(data.insumos ?? [], conceptoForm.id ?? 0);
            setIaRows(mappedRows);
            const explicacion = data.explicacion ?? "";
            setIaExplanation(explicacion);
            setTextoDetalles(explicacion);
            setMetrosCuadrados(data.metros_cuadrados_construccion || 0);
            persistClarificationHistory(providedResponses);
            return null;
        } catch (error) {
            console.error("Error al solicitar /ia/chat_apu", error);
            return "No se pudo generar el APU. Intenta nuevamente.";
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


    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col relative">
            <Navbar />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-6">
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
                        <div className="mt-4 space-y-2">
                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                                <Link to="/guia" className="text-indigo-600 hover:text-indigo-700 text-xs font-bold flex items-center gap-1">
                                    <HelpCircle className="w-4 h-4" /> Centro de Ayuda
                                </Link>
                                <button
                                    type="button"
                                    onClick={prepararPreguntasClarificadoras}
                                    disabled={!conceptoForm.descripcion || cargandoIA || cargandoPreguntasClarificadoras}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm w-full justify-center sm:w-auto"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
                                    {cargandoPreguntasClarificadoras ? "Generando preguntas..." : "Sugerencia Gemini"}
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 italic">
                                Mientras más completa sea la descripción, mejor será la sugerencia de la IA.
                            </p>
                            {cargandoIA && (
                                <div className="text-xs text-indigo-500 font-semibold flex items-center gap-2">
                                    <span className="h-3 w-3 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin" />
                                    <span>La IA está generando el APU. Por favor espera unos segundos.</span>
                                </div>
                            )}
                        </div>
                    </section>


                </div>

                {/* Columna Derecha */}
                <div className="lg:col-span-1 space-y-6 min-w-0">
                    {/* Tarjeta Resumen principal */}
                    <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <header className="mb-6 flex items-center justify-between">
                            <p className="text-xs font-bold text-gray-400 tracking-wider uppercase">Resumen Financiero</p>
                            {cargandoIA && <span className="text-xs text-indigo-500 animate-pulse font-medium">Actualizando...</span>}
                        </header>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            {/* 1. Construcción Estimada */}
                            <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col justify-between h-full relative overflow-hidden">
                                <div className="z-10 relative">
                                    <span className="block text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-2 text-center sm:text-left">
                                        Construcción Estimada
                                    </span>
                                    <div className="flex items-baseline justify-center sm:justify-start gap-1">
                                        <strong className="text-3xl text-gray-800 font-extrabold tracking-tight">
                                            {metrosCuadrados > 0 ? metrosCuadrados.toLocaleString('en-US') : "--"}
                                        </strong>
                                        <span className="text-sm text-gray-500 font-semibold italic">m²</span>
                                    </div>
                                </div>
                                <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z" /></svg>
                                </div>
                            </div>

                            {/* 2. Costo Total de la Obra */}
                            <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex flex-col justify-between h-full relative overflow-hidden min-w-0">
                                <div className="z-10 relative">
                                    <span className="block text-[10px] font-bold text-indigo-600 uppercase tracking-wide mb-2 text-center sm:text-left">
                                        Costo Total de la Obra
                                    </span>
                                    <div className="flex flex-wrap items-baseline justify-center sm:justify-start gap-1 overflow-hidden">
                                        <span className="text-xl font-black text-indigo-700">$</span>
                                        <strong className="text-2xl sm:text-2xl md:text-3xl text-indigo-700 font-black tracking-tighter leading-none break-all sm:break-normal">
                                            {resumen.precio_unitario.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </strong>
                                    </div>
                                    <p className="text-[10px] text-indigo-400 mt-2 italic font-medium text-center sm:text-left">Incluye indirectos y utilidad</p>
                                </div>
                                <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05 1.18 1.48 2.61 1.48 1.55 0 2.22-.57 2.22-1.34 0-.89-.69-1.31-2.47-1.73-2.13-.51-3.69-1.28-3.69-3.24 0-2.02 1.5-3.17 3.32-3.46V4.37h2.67v1.9c1.43.33 2.65 1.25 2.8 3.1h-1.98c-.1-1.01-1.03-1.46-2.41-1.46-1.35 0-2.17.65-2.17 1.39 0 .96.79 1.34 2.62 1.77 2.15.51 3.52 1.41 3.52 3.25 0 2.15-1.57 3.28-3.52 3.56z" /></svg>
                                </div>
                            </div>

                            {/* 3. Costo por m² */}
                            <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex flex-col justify-between h-full relative overflow-hidden min-w-0">
                                <div className="z-10 relative">
                                    <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-2 text-center sm:text-left">
                                        Costo por m²
                                    </span>
                                    <div className="flex flex-wrap items-baseline justify-center sm:justify-start gap-1">
                                        <span className="text-xl font-black text-emerald-700">$</span>
                                        <strong className="text-2xl sm:text-2xl md:text-3xl text-emerald-700 font-black tracking-tighter leading-none">
                                            {(metrosCuadrados > 0 ? (resumen.precio_unitario / metrosCuadrados) : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </strong>
                                    </div>
                                    <p className="text-[10px] text-emerald-500 mt-2 italic font-medium text-center sm:text-left">Costo unitario paramétrico</p>
                                </div>
                                <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17h18v2H3zm0-7h18v5H3zm0-4h18v2H3z" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Factores de Sobrecosto */}
                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <p className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-4 text-center sm:text-left">Ajustes de Sobrecosto (FASAR, Indirectos, Utilidad)</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {(Object.keys(SOBRECOSTO_FIELDS) as FactorToggleKey[]).map((key) => {
                                    const config = sobrecostos[key];
                                    const meta = SOBRECOSTO_FIELDS[key];
                                    return (
                                        <div key={key} className={`flex flex-col p-3 rounded-xl border transition-all duration-200 ${config.activo ? 'bg-white border-indigo-100 shadow-sm' : 'bg-gray-50/50 border-transparent'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`text-[10px] font-black tracking-wide transition-colors ${config.activo ? 'text-gray-900' : 'text-gray-400'}`}>{meta.label.toUpperCase()}</span>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={config.activo}
                                                    onClick={() => handleSobrecostoToggle(key, !config.activo)}
                                                    className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${config.activo ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                                >
                                                    <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${config.activo ? 'translate-x-3' : 'translate-x-0'}`} />
                                                </button>
                                            </div>
                                            <div className={`relative transition-opacity duration-300 ${config.activo ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                                                <input
                                                    type="number"
                                                    value={config.porcentaje}
                                                    onChange={(event) => handleSobrecostoPorcentaje(key, event.target.value)}
                                                    className="w-full text-right text-lg font-black bg-transparent border-0 border-b-2 border-gray-100 focus:border-indigo-500 focus:ring-0 p-0 pr-5 text-gray-900"
                                                />
                                                <span className="absolute right-0 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-black">%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                    {/* Botones de Acción (Reacomodados) */}
                    <div className="flex flex-wrap gap-2 justify-end">
                        <button
                            type="button"
                            onClick={handleAbrirProyectoGuardado}
                            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <span>📂</span> Abrir
                        </button>
                        <button
                            type="button"
                            onClick={handleBuscarPrecios}
                            className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                            title="Buscar precios de materiales faltantes en el Comparador"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                            Buscar Precios
                        </button>
                        <button
                            type="button"
                            onClick={handleAbrirGuardarProyecto}
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
                            onClick={() => setShowPdfModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                            Exportar PDF
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
                            modoLocal={modoLocal}
                            externalRows={modoLocal ? matrizDraft : undefined}
                            onRowsChange={setMatrizDraft}
                            factoresSobrecosto={sobrecostos}
                        />
                    )}
                </div>
            </div >

            <PreguntasClarificadorasModal
                open={showPreguntasClarificadoras}
                descripcion={conceptoForm.descripcion}
                preguntas={preguntasClarificadoras}
                loading={cargandoPreguntasClarificadoras}
                onClose={handleCerrarPreguntas}
                history={clarificationHistory}
                initialAnswers={clarificationInitialAnswers}
                onSubmit={(respuestas) => handleSugerirAPUConIA(respuestas)}
                onSkip={() => {
                    handleCerrarPreguntas();
                    setClarificationHistory([]);
                    void handleSugerirAPUConIA();
                }}
            />

            <SaveProjectModal
                open={showSaveModal}
                descripcion={conceptoForm.descripcion}
                onClose={handleCerrarSaveModal}
                onSave={handleGuardarProyecto}
            />
            <OpenSavedProjectModal
                open={showOpenModal}
                projects={savedProjects}
                onClose={handleCerrarOpenModal}
                onSelect={handleProyectoSeleccionado}
            />

            {showSelector && (
                <ConceptoSelectorModal
                    onSelect={handleConceptoSeleccionado}
                    onClose={() => setShowSelector(false)}
                />
            )}

            <PresupuestoPdfModal
                open={showPdfModal}
                onClose={() => setShowPdfModal(false)}
                rows={matrizDraft}
                resumen={resumen}
                conceptoNombre={conceptoForm.clave || "Sin Título"}
            />
        </div>
    );
}

function loadClarificationHistoryFromStorage(): ClarifyingHistoryEntry[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(CLARIFICATION_HISTORY_STORAGE_KEY);
    if (!stored) return [];
    try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
            return parsed;
        }
    } catch {
        // ignore
    }
    return [];
}

function loadLastClarificationDescriptionFromStorage(): string {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(CLARIFICATION_LAST_DESCRIPTION_STORAGE_KEY) ?? "";
}

function buildWordSet(dest: string): Set<string> {
    const tokens = (dest || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .match(/[a-z0-9ñ]+/g) ?? [];
    return new Set(tokens);
}

function calculateDescriptionSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;
    const setA = buildWordSet(a);
    const setB = buildWordSet(b);
    if (!setA.size || !setB.size) return 0;
    const intersection = [...setA].filter((token) => setB.has(token)).length;
    const union = new Set([...setA, ...setB]).size;
    if (!union) return 0;
    return intersection / union;
}

function shouldRefreshClarification(lastDesc: string, currentDesc: string): boolean {
    if (!lastDesc || !currentDesc) return false;
    const similarity = calculateDescriptionSimilarity(lastDesc, currentDesc);
    return similarity < DESCRIPTION_SIMILARITY_THRESHOLD;
}
