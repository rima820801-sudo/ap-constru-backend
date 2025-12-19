import { useEffect, useMemo, useState, useId, type FormEvent } from "react";
import { apiFetch } from "../../api/client";

export type MatrizRow = {
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
type ManoObraDTO = {
    id: number;
    puesto: string;
    fasar: number;
    salario_base: number;
    rendimiento_jornada: number;
    disciplina?: string;
    calidad?: string;
    fecha_actualizacion?: string;
    obsoleto?: boolean;
};
type EquipoDTO = {
    id: number;
    nombre: string;
    unidad: string;
    costo_hora_maq: number;
    disciplina?: string;
    calidad?: string;
    fecha_actualizacion?: string;
    obsoleto?: boolean;
};
type MaquinariaDTO = {
    id: number;
    nombre: string;
    costo_posesion_hora: number;
    rendimiento_horario: number;
    disciplina?: string;
    calidad?: string;
    fecha_actualizacion?: string;
    obsoleto?: boolean;
};

type CatalogData = {
    materiales: Record<number, MaterialDTO>;
    manoObra: Record<number, ManoObraDTO>;
    equipos: Record<number, EquipoDTO>;
    maquinaria: Record<number, MaquinariaDTO>;
};

type ConceptoResumen = {
    clave: string;
    descripcion: string;
    unidad_concepto: string;
};

export type FactorToggleKey = "indirectos" | "financiamiento" | "utilidad" | "iva";

export type FactorToggleConfig = {
    activo: boolean;
    porcentaje: number;
};

export type FactorToggleMap = Record<FactorToggleKey, FactorToggleConfig>;

type ConceptoMatrizEditorProps = {
    conceptoId: number | null;
    conceptoInfo: ConceptoResumen;
    iaRows?: MatrizRow[] | null;
    iaExplanation?: string;
    guardarTrigger?: number;
    onResumenChange?: (resumen: PuResponse) => void;
    modoLocal?: boolean;
    externalRows?: MatrizRow[];
    onRowsChange?: (rows: MatrizRow[]) => void;
    onGuardarLocal?: (rows: MatrizRow[]) => Promise<void> | void;
    factoresSobrecosto?: FactorToggleMap;
};

type PuResponse = {
    costo_directo: number;
    precio_unitario: number;
};

type IASugerencia = {
    tipo_insumo: MatrizRow["tipo_insumo"] | "Mano de Obra";
    id_insumo?: number | "";
    insumo_id?: number | "" | null;
    cantidad?: number;
    porcentaje_merma?: number | null;
    merma?: number | null;
    precio_flete_unitario?: number | null;
    flete_unitario?: number | null;
    rendimiento_jornada?: number | null;
    rendimiento_diario?: number | null;
    existe_en_catalogo?: boolean;
    nombre?: string | null;
    justificacion_breve?: string | null;
    unidad?: string | null;
};

export function ConceptoMatrizEditor({
    conceptoId,
    conceptoInfo,
    iaRows,
    iaExplanation,
    guardarTrigger,
    onResumenChange,
    modoLocal: modoLocalProp,
    externalRows,
    onRowsChange,
    onGuardarLocal,
    factoresSobrecosto,
}: ConceptoMatrizEditorProps) {
    const modoLocal = modoLocalProp ?? !conceptoId;
    const [rows, setRows] = useState<MatrizRow[]>(() => externalRows ?? []);
    const [catalogos, setCatalogos] = useState<CatalogData | null>(null);
    const [puResumen, setPuResumen] = useState<PuResponse>({ costo_directo: 0, precio_unitario: 0 });
    const [calculando, setCalculando] = useState(false);
    const [draftRow, setDraftRow] = useState<MatrizRow>(() => crearDraftRow(conceptoId));
    const [catalogModal, setCatalogModal] = useState<CatalogModalState | null>(null);
    const [loadingPriceForRow, setLoadingPriceForRow] = useState<number | null>(null);

    const idPrefix = useId().replace(/:/g, "");

    useEffect(() => {
        void loadCatalogos();
    }, []);

    useEffect(() => {
        if (guardarTrigger && guardarTrigger > 0) {
            void guardarMatrizCompleta();
        }
    }, [guardarTrigger]);

    useEffect(() => {
        if (modoLocal) return;
        if (!conceptoId) {
            setRows([]);
            return;
        }
        void loadMatriz();
    }, [conceptoId, modoLocal]);

    useEffect(() => {
        if (!modoLocal) return;
        const newRows = externalRows ?? [];

        setRows((prevRows) => {
            if (JSON.stringify(newRows) === JSON.stringify(prevRows)) {
                return prevRows;
            }
            return newRows;
        });
    }, [externalRows, modoLocal]);

    useEffect(() => {
        void calcularPuRemoto();
    }, [conceptoId, rows, modoLocal, factoresSobrecosto]);

    useEffect(() => {
        onResumenChange?.(puResumen);
    }, [puResumen, onResumenChange]);

    useEffect(() => {
        if (!iaRows || !iaRows.length) return;
        setRows(iaRows);
    }, [iaRows]);

    useEffect(() => {
        if (!guardarTrigger) return;
        void guardarMatrizCompleta();
    }, [guardarTrigger, modoLocal]);

    useEffect(() => {
        setDraftRow(crearDraftRow(conceptoId));
    }, [conceptoId]);

    useEffect(() => {
        onRowsChange?.(rows);
    }, [rows, onRowsChange]);

    async function loadMatriz() {
        if (!conceptoId) {
            setRows([]);
            return;
        }
        const data = await apiFetch<MatrizRow[]>(`/conceptos/${conceptoId}/matriz`);
        const normalizados = data.map((row) => ({
            ...row,
            cantidad: Number(row.cantidad),
            porcentaje_merma: row.porcentaje_merma ?? "",
            precio_flete_unitario: row.precio_flete_unitario ?? "",
            rendimiento_jornada: row.rendimiento_jornada ?? "",
            existe_en_catalogo: true,
        }));
        setRows(normalizados);
    }

    async function loadCatalogos() {
        const [materiales, manoObra, equipos, maquinaria] = await Promise.all([
            apiFetch<MaterialDTO[]>(`/materiales`),
            apiFetch<ManoObraDTO[]>(`/manoobra`),
            apiFetch<EquipoDTO[]>(`/equipo`),
            apiFetch<MaquinariaDTO[]>(`/maquinaria`),
        ]);
        setCatalogos({
            materiales: Object.fromEntries(materiales.map((item) => [item.id, item])),
            manoObra: Object.fromEntries(manoObra.map((item) => [item.id, item])),
            equipos: Object.fromEntries(equipos.map((item) => [item.id, item])),
            maquinaria: Object.fromEntries(maquinaria.map((item) => [item.id, item])),
        });
    }

    function handleRowChange(index: number, updates: Partial<MatrizRow>) {
        setRows((prev) => prev.map((row, idx) => (idx === index ? { ...row, ...updates } : row)));
    }

    async function handleDeleteRow(rowId?: number, rowIndex?: number) {
        if (!rowId) {
            setRows((prev) => prev.filter((_, idx) => idx !== rowIndex));
            return;
        }
        if (!confirm("Eliminar el insumo de la matriz?")) return;
        await apiFetch<void>(`/matriz/${rowId}`, { method: "DELETE" });
        await loadMatriz();
    }

    async function calcularPuRemoto() {
        if (!rows.length) {
            setPuResumen({ costo_directo: 0, precio_unitario: 0 });
            return;
        }
        const matrizPayload = rows
            .filter((row) => row.id_insumo !== "" && Number(row.cantidad) >= 0)
            .map((row) => ({
                tipo_insumo: row.tipo_insumo,
                id_insumo: Number(row.id_insumo),
                cantidad: Number(row.cantidad),
                porcentaje_merma:
                    row.tipo_insumo === "Material" && row.porcentaje_merma !== ""
                        ? Number(row.porcentaje_merma)
                        : undefined,
                precio_flete_unitario:
                    row.tipo_insumo === "Material" && row.precio_flete_unitario !== ""
                        ? Number(row.precio_flete_unitario)
                        : undefined,
                rendimiento_jornada:
                    row.tipo_insumo === "ManoObra" && row.rendimiento_jornada !== ""
                        ? Number(row.rendimiento_jornada)
                        : undefined,
            }));
        if (matrizPayload.length === 0) {
            setPuResumen({ costo_directo: 0, precio_unitario: 0 });
            return;
        }
        setCalculando(true);
        try {
            const body: Record<string, unknown> = { matriz: matrizPayload };
            if (conceptoId) {
                body.concepto_id = conceptoId;
            }
            const factoresPayload = mapFactoresParaApi(factoresSobrecosto);
            if (factoresPayload) {
                body.factores = factoresPayload;
            }
            const data = await apiFetch<PuResponse>(`/conceptos/calcular_pu`, {
                method: "POST",
                body,
            });
            setPuResumen(data);
        } finally {
            setCalculando(false);
        }
    }

    async function guardarMatrizCompleta() {
        if (modoLocal) {
            await onGuardarLocal?.(rows);
            return;
        }
        if (!conceptoId) {
            return;
        }
        const payloadRows = rows.map((row) => ({ ...row }));
        const existentes = await apiFetch<MatrizRow[]>(`/conceptos/${conceptoId}/matriz`);
        const idsActuales = new Set(payloadRows.filter((row) => row.id).map((row) => row.id as number));
        const eliminaciones = existentes.filter((registro) => !idsActuales.has(registro.id as number));
        for (const registro of eliminaciones) {
            await apiFetch(`/matriz/${registro.id}`, { method: "DELETE" });
        }
        for (const row of payloadRows) {
            await persistRow(row);
        }
        await loadMatriz();
    }

    async function handleAgregarDraft() {
        if (!puedeAgregarDraft()) return;
        if (modoLocal) {
            setRows((prev) => [...prev, { ...draftRow, concepto: conceptoId ?? 0 }]);
            setDraftRow(crearDraftRow(conceptoId));
            return;
        }
        await persistRow({ ...draftRow });
        await loadMatriz();
        setDraftRow(crearDraftRow(conceptoId));
    }

    function puedeAgregarDraft(): boolean {
        return Boolean(draftRow.id_insumo && draftRow.cantidad > 0);
    }

    async function handleObtenerPrecio(rowIndex: number) {
        const row = rows[rowIndex];
        if (!row || !row.id_insumo || obtenerCostoUnitario(row) !== 0) return;

        setLoadingPriceForRow(rowIndex);
        try {
            const nombre = obtenerNombre(row);
            const unidad = obtenerUnidad(row);

            const response = await apiFetch<{
                precio_sugerido: number;
                fuente: string;
            }>(`/catalogos/sugerir_precio_mercado`, {
                method: "POST",
                body: { nombre, unidad },
            });

            if (response.precio_sugerido && response.precio_sugerido > 0) {
                if (row.tipo_insumo === "Material") {
                    handleRowChange(rowIndex, { precio_flete_unitario: response.precio_sugerido });
                } else if (row.tipo_insumo === "ManoObra") {
                    const mano = catalogos?.manoObra[Number(row.id_insumo)];
                    if (mano) {
                        handleRowChange(rowIndex, {
                            rendimiento_jornada: mano.salario_base * mano.fasar / response.precio_sugerido,
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Error obtaining market price:", error);
        } finally {
            setLoadingPriceForRow(null);
        }
    }

    function abrirCatalogoDesdeRow(rowIndex: number) {
        const row = rows[rowIndex];
        if (!row) return;
        setCatalogModal({
            rowIndex,
            tipo: row.tipo_insumo,
            form: crearFormularioCatalogo(row),
        });
    }

    function handleCatalogFormChange(field: string, value: string) {
        setCatalogModal((prev) => (prev ? { ...prev, form: { ...prev.form, [field]: value } } : prev));
    }

    function renderCatalogFormFields() {
        if (!catalogModal) return null;
        const { tipo, form } = catalogModal;
        if (tipo === "Material") {
            return (
                <>
                    <label>
                        Nombre
                        <input value={form.nombre ?? ""} onChange={(event) => handleCatalogFormChange("nombre", event.target.value)} required />
                    </label>
                    <label>
                        Unidad
                        <input value={form.unidad ?? ""} onChange={(event) => handleCatalogFormChange("unidad", event.target.value)} required />
                    </label>
                    <label>
                        Precio Unitario
                        <input
                            type="number"
                            step="0.01"
                            value={form.precio_unitario ?? ""}
                            onChange={(event) => handleCatalogFormChange("precio_unitario", event.target.value)}
                            required
                        />
                    </label>
                    <label>
                        Porcentaje Merma
                        <input
                            type="number"
                            step="0.0001"
                            value={form.porcentaje_merma ?? ""}
                            onChange={(event) => handleCatalogFormChange("porcentaje_merma", event.target.value)}
                        />
                    </label>
                    <label>
                        Precio Flete Unitario
                        <input
                            type="number"
                            step="0.01"
                            value={form.precio_flete_unitario ?? ""}
                            onChange={(event) => handleCatalogFormChange("precio_flete_unitario", event.target.value)}
                        />
                    </label>
                </>
            );
        }
        if (tipo === "ManoObra") {
            return (
                <>
                    <label>
                        Puesto
                        <input value={form.nombre ?? ""} onChange={(event) => handleCatalogFormChange("nombre", event.target.value)} required />
                    </label>
                    <label>
                        Salario Base
                        <input
                            type="number"
                            step="0.01"
                            value={form.salario_base ?? ""}
                            onChange={(event) => handleCatalogFormChange("salario_base", event.target.value)}
                            required
                        />
                    </label>
                    <label>
                        Rendimiento Jornada
                        <input
                            type="number"
                            step="0.01"
                            value={form.rendimiento_jornada ?? ""}
                            onChange={(event) => handleCatalogFormChange("rendimiento_jornada", event.target.value)}
                        />
                    </label>
                </>
            );
        }
        if (tipo === "Equipo") {
            return (
                <>
                    <label>
                        Nombre
                        <input value={form.nombre ?? ""} onChange={(event) => handleCatalogFormChange("nombre", event.target.value)} required />
                    </label>
                    <label>
                        Unidad
                        <input value={form.unidad ?? ""} onChange={(event) => handleCatalogFormChange("unidad", event.target.value)} required />
                    </label>
                    <label>
                        Costo Hora
                        <input
                            type="number"
                            step="0.01"
                            value={form.costo_hora_maq ?? ""}
                            onChange={(event) => handleCatalogFormChange("costo_hora_maq", event.target.value)}
                            required
                        />
                    </label>
                </>
            );
        }
        return (
            <>
                <label>
                    Nombre
                    <input value={form.nombre ?? ""} onChange={(event) => handleCatalogFormChange("nombre", event.target.value)} required />
                </label>
                <label>
                    Costo Adquisicion
                    <input
                        type="number"
                        step="0.01"
                        value={form.costo_adquisicion ?? ""}
                        onChange={(event) => handleCatalogFormChange("costo_adquisicion", event.target.value)}
                        required
                    />
                </label>
                <label>
                    Vida Util (horas)
                    <input
                        type="number"
                        step="0.1"
                        value={form.vida_util_horas ?? ""}
                        onChange={(event) => handleCatalogFormChange("vida_util_horas", event.target.value)}
                        required
                    />
                </label>
                <label>
                    Tasa Interes Anual
                    <input
                        type="number"
                        step="0.0001"
                        value={form.tasa_interes_anual ?? ""}
                        onChange={(event) => handleCatalogFormChange("tasa_interes_anual", event.target.value)}
                    />
                </label>
                <label>
                    Rendimiento Horario
                    <input
                        type="number"
                        step="0.01"
                        value={form.rendimiento_horario ?? ""}
                        onChange={(event) => handleCatalogFormChange("rendimiento_horario", event.target.value)}
                    />
                </label>
            </>
        );
    }

    async function handleCatalogSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!catalogModal) return;
        const { tipo, form, rowIndex } = catalogModal;
        let endpoint = "";
        let payload: Record<string, unknown> = {};
        switch (tipo) {
            case "Material":
                endpoint = "/materiales";
                payload = {
                    nombre: form.nombre,
                    unidad: form.unidad,
                    precio_unitario: Number(form.precio_unitario || 0),
                    fecha_actualizacion: new Date().toISOString().split("T")[0],
                    porcentaje_merma: Number(form.porcentaje_merma || 0),
                    precio_flete_unitario: Number(form.precio_flete_unitario || 0),
                };
                break;
            case "ManoObra":
                endpoint = "/manoobra";
                payload = {
                    puesto: form.nombre,
                    salario_base: Number(form.salario_base || 0),
                    rendimiento_jornada: Number(form.rendimiento_jornada || 1),
                };
                break;
            case "Equipo":
                endpoint = "/equipo";
                payload = {
                    nombre: form.nombre,
                    unidad: form.unidad,
                    costo_hora_maq: Number(form.costo_hora_maq || 0),
                };
                break;
            case "Maquinaria":
                endpoint = "/maquinaria";
                payload = {
                    nombre: form.nombre,
                    costo_adquisicion: Number(form.costo_adquisicion || 0),
                    vida_util_horas: Number(form.vida_util_horas || 1),
                    tasa_interes_anual: Number(form.tasa_interes_anual || 0),
                    rendimiento_horario: Number(form.rendimiento_horario || 1),
                };
                break;
            default:
                return;
        }
        const creado = await apiFetch<Record<string, any>>(endpoint, { method: "POST", body: payload });
        await loadCatalogos();
        setRows((prev) =>
            prev.map((row, idx) =>
                idx === rowIndex
                    ? { ...row, id_insumo: creado.id, existe_en_catalogo: true, nombre_sugerido: undefined }
                    : row
            )
        );
        setCatalogModal(null);
    }

    async function handleQuickAdd(rowIndex: number) {
        const row = rows[rowIndex];
        if (!row.nombre_sugerido) return;

        // Si no hay precio temporal, abrimos el modal para que lo llene
        if (row.precio_unitario_temp === "" || row.precio_unitario_temp === undefined) {
            abrirCatalogoDesdeRow(rowIndex);
            return;
        }

        const precio = Number(row.precio_unitario_temp);
        let endpoint = "";
        let payload: Record<string, unknown> = {};

        switch (row.tipo_insumo) {
            case "Material":
                endpoint = "/materiales";
                payload = {
                    nombre: row.nombre_sugerido,
                    unidad: "unidad", // Default
                    precio_unitario: precio,
                    fecha_actualizacion: new Date().toISOString().split("T")[0],
                    porcentaje_merma: 0.03, // Default
                    precio_flete_unitario: 0,
                };
                break;
            case "ManoObra":
                endpoint = "/manoobra";
                payload = {
                    puesto: row.nombre_sugerido,
                    salario_base: precio,
                    rendimiento_jornada: 8.0, // Default
                };
                break;
            case "Equipo":
                endpoint = "/equipo";
                payload = {
                    nombre: row.nombre_sugerido,
                    unidad: "hora",
                    costo_hora_maq: precio,
                };
                break;
            case "Maquinaria":
                endpoint = "/maquinaria";
                payload = {
                    nombre: row.nombre_sugerido,
                    costo_adquisicion: precio, // Asumiendo que el precio es costo de adquisición para simplificar, o costo hora?
                    // Para maquinaria es complejo, mejor abrir modal si es maquinaria para evitar errores
                    // Pero intentaremos un default seguro
                    vida_util_horas: 10000,
                    tasa_interes_anual: 0.10,
                    rendimiento_horario: 1.0,
                };
                // Maquinaria requiere muchos datos, mejor forzar modal si no es simple
                abrirCatalogoDesdeRow(rowIndex);
                return;
            default:
                return;
        }

        try {
            const creado = await apiFetch<Record<string, any>>(endpoint, { method: "POST", body: payload });
            await loadCatalogos();
            setRows((prev) =>
                prev.map((r, idx) =>
                    idx === rowIndex
                        ? {
                            ...r,
                            id_insumo: creado.id,
                            existe_en_catalogo: true,
                            nombre_sugerido: undefined,
                            precio_unitario_temp: undefined,
                        }
                        : r
                )
            );
        } catch (error) {
            console.error("Error al agregar al catalogo:", error);
            alert("Error al guardar en catálogo. Intenta usar el botón de editar para ver más detalles.");
        }
    }

    async function persistRow(row: MatrizRow) {
        if (modoLocal || !conceptoId) {
            return;
        }
        const payload = buildRowPayload(row, conceptoId);
        if (row.id) {
            await apiFetch(`/matriz/${row.id}`, { method: "PUT", body: payload });
        } else {
            const created = await apiFetch<MatrizRow>(`/matriz`, { method: "POST", body: payload });
            row.id = created.id;
        }
    }

    function buildRowPayload(row: MatrizRow, conceptoDestino: number) {
        return {
            concepto: conceptoDestino,
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
    }

    const detalleSugerencia = iaExplanation?.trim()
        ? iaExplanation.trim()
        : "Genera una sugerencia con el asistente para ver el detalle aqui.";

    function obtenerUnidad(row: MatrizRow): string {
        if (row.unidad && row.unidad.trim()) {
            return row.unidad;
        }
        if (row.existe_en_catalogo === false) return "-";
        if (!catalogos || !row.id_insumo) return "-";
        const id = Number(row.id_insumo);
        switch (row.tipo_insumo) {
            case "Material":
                return catalogos.materiales[id]?.unidad ?? "-";
            case "ManoObra":
                return "jornada";
            case "Equipo":
                return catalogos.equipos[id]?.unidad ?? "hora";
            case "Maquinaria":
                return "hora";
            default:
                return "-";
        }
    }

    function obtenerNombre(row: MatrizRow): string {
        if (row.existe_en_catalogo === false) return row.nombre_sugerido ?? "-";
        if (!catalogos || !row.id_insumo) return "-";
        const id = Number(row.id_insumo);
        switch (row.tipo_insumo) {
            case "Material":
                return catalogos.materiales[id]?.nombre ?? "-";
            case "ManoObra":
                return catalogos.manoObra[id]?.puesto ?? "-";
            case "Equipo":
                return catalogos.equipos[id]?.nombre ?? "-";
            case "Maquinaria":
                return catalogos.maquinaria[id]?.nombre ?? "-";
            default:
                return "-";
        }
    }

    function obtenerPrecioUnitarioBase(row: MatrizRow): number {
        if (row.existe_en_catalogo === false) return 0;
        if (!catalogos || !row.id_insumo) return 0;
        const id = Number(row.id_insumo);
        switch (row.tipo_insumo) {
            case "Material":
                return catalogos.materiales[id]?.precio_unitario ?? 0;
            case "ManoObra":
                const mano = catalogos.manoObra[id];
                // Mostramos Salario Base * Fasar como "Precio Unitario" aproximado
                return mano ? mano.salario_base * mano.fasar : 0;
            case "Equipo":
                return catalogos.equipos[id]?.costo_hora_maq ?? 0;
            case "Maquinaria":
                // Maquinaria costo posesion hora
                return catalogos.maquinaria[id]?.costo_posesion_hora ?? 0;
            default:
                return 0;
        }
    }

    function obtenerCostoUnitario(row: MatrizRow): number {
        if (row.existe_en_catalogo === false) return 0;
        if (!catalogos || !row.id_insumo) return 0;
        const id = Number(row.id_insumo);
        switch (row.tipo_insumo) {
            case "Material": {
                const material = catalogos.materiales[id];
                if (!material) return 0;
                const merma =
                    row.porcentaje_merma !== "" && row.porcentaje_merma !== undefined
                        ? Number(row.porcentaje_merma)
                        : material.porcentaje_merma;
                const flete =
                    row.precio_flete_unitario !== "" && row.precio_flete_unitario !== undefined
                        ? Number(row.precio_flete_unitario)
                        : material.precio_flete_unitario;
                return material.precio_unitario * (1 + merma) + flete;
            }
            case "ManoObra": {
                const mano = catalogos.manoObra[id];
                if (!mano) return 0;
                const rendimiento =
                    row.rendimiento_jornada !== "" && row.rendimiento_jornada !== undefined
                        ? Number(row.rendimiento_jornada)
                        : mano.rendimiento_jornada || 1;
                const salarioReal = mano.salario_base * mano.fasar;
                return rendimiento > 0 ? salarioReal / rendimiento : salarioReal;
            }
            case "Equipo": {
                const equipo = catalogos.equipos[id];
                return equipo?.costo_hora_maq ?? 0;
            }
            case "Maquinaria": {
                const maq = catalogos.maquinaria[id];
                if (!maq) return 0;
                const rendimiento = maq.rendimiento_horario || 1;
                return rendimiento > 0 ? maq.costo_posesion_hora / rendimiento : maq.costo_posesion_hora;
            }
            default:
                return 0;
        }
    }

    function formatearMoneda(valor: number): string {
        if (!Number.isFinite(valor)) return "$0.00";
        return `$${valor.toFixed(2)}`;
    }

    function obtenerObsoleto(row: MatrizRow): boolean {
        if (row.existe_en_catalogo === false) return false;
        if (!catalogos || !row.id_insumo) return false;
        const id = Number(row.id_insumo);
        switch (row.tipo_insumo) {
            case "Material":
                return catalogos.materiales[id]?.obsoleto ?? false;
            case "ManoObra":
                return catalogos.manoObra[id]?.obsoleto ?? false;
            case "Equipo":
                return catalogos.equipos[id]?.obsoleto ?? false;
            case "Maquinaria":
                return catalogos.maquinaria[id]?.obsoleto ?? false;
                return false;
        }
    }

    return (
        <section className="concepto-editor bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col relative">
            <header className="concepto-editor__header">
                {calculando && (
                    <div className="absolute top-2 right-2 flex items-center gap-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-sm border border-indigo-100 z-20 transition-all animate-in fade-in slide-in-from-top-2">
                        <div className="animate-spin h-3 w-3 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                        <span className="text-xs font-medium text-indigo-600">Calculando...</span>
                    </div>
                )}
            </header>

            {/* AI Explanation Area */}
            {iaExplanation && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mx-4 mt-4 mb-2">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">Detalle de la Sugerencia AI</h3>
                            <div className="mt-2 text-sm text-blue-700 whitespace-pre-wrap">
                                {detalleSugerencia}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-hidden w-full">
                <table className="w-full table-fixed divide-y divide-gray-200">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="w-[10%] px-1 py-1 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Tipo</th>
                            <th className="w-[30%] px-1 py-1 text-left text-[10px] font-bold uppercase tracking-wider text-gray-500">Insumo / Descripci�n</th>
                            <th className="w-[5%] px-1 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Unid.</th>
                            <th className="w-[8%] px-1 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Cant.</th>
                            <th className="w-[9%] px-1 py-1 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">P. Unit</th>
                            <th className="w-[7%] px-1 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Merma</th>
                            <th className="w-[7%] px-1 py-1 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Flete</th>
                            <th className="w-[7%] px-1 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">Rend.</th>
                            <th className="w-[9%] px-1 py-1 text-right text-[10px] font-bold uppercase tracking-wider text-gray-500">Total</th>
                            <th className="w-[8%] px-1 py-1 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                <span className="sr-only">Acciones</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {rows.map((row, index) => (
                            <tr key={row.id ?? `tmp-${index}`}>
                                <td className="px-1 py-1 align-middle">
                                    <select
                                        className="block w-full rounded border-gray-300 bg-white !bg-white py-1 pl-1 pr-4 text-[11px] font-semibold !text-slate-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-xs"
                                        value={row.tipo_insumo}
                                        onChange={(e) => {
                                            const nextType = e.target.value as MatrizRow["tipo_insumo"];
                                            handleRowChange(index, {
                                                tipo_insumo: nextType,
                                                id_insumo: "",
                                                porcentaje_merma: nextType === "Material" ? row.porcentaje_merma : "",
                                                precio_flete_unitario: nextType === "Material" ? row.precio_flete_unitario : "",
                                                rendimiento_jornada: nextType === "ManoObra" ? row.rendimiento_jornada : "",
                                            });
                                        }}
                                    >
                                        <option value="Material">Mat.</option>
                                        <option value="ManoObra">M.O.</option>
                                        <option value="Equipo">Eq.</option>
                                        <option value="Maquinaria">Maq.</option>
                                    </select>
                                </td>
                                <td className="px-1 py-1 align-middle">
                                    {renderInsumoSelect(row, index)}
                                </td>
                                <td className="px-1 py-1 align-middle text-center text-[11px] text-gray-600 truncate">
                                    {obtenerUnidad(row)}
                                </td>
                                <td className="px-1 py-1 align-middle">
                                    <input
                                        type="number"
                                        className="block w-full rounded border-gray-300 py-1 px-1 text-right text-[11px] focus:border-indigo-500 focus:ring-indigo-500"
                                        value={row.cantidad}
                                        onChange={(e) => handleRowChange(index, { cantidad: Number(e.target.value) || 0 })}
                                    />
                                </td>
                                <td className="px-1 py-1 align-middle">
                                    <input
                                        type="number"
                                        className="block w-full rounded border-gray-300 py-1 px-1 text-right text-[11px] focus:border-indigo-500 focus:ring-indigo-500"
                                        placeholder="0.00"
                                        defaultValue={row.existe_en_catalogo ? obtenerPrecioUnitarioBase(row) : (row.precio_unitario_temp ?? "")}
                                        onChange={(e) => handleRowChange(index, { precio_unitario_temp: e.target.value === "" ? "" : Number(e.target.value) })}
                                    />
                                </td>
                                <td className="px-1 py-1 align-middle">
                                    {row.tipo_insumo === "Material" ? (
                                        <input
                                            type="number"
                                            className="block w-full rounded border-gray-300 py-1 px-1 text-center text-[11px] focus:border-indigo-500 focus:ring-indigo-500"
                                            placeholder="%"
                                            value={row.porcentaje_merma ?? ""}
                                            onChange={(e) => handleRowChange(index, { porcentaje_merma: e.target.value === "" ? "" : Number(e.target.value) })}
                                        />
                                    ) : <div className="text-center text-gray-300 text-[10px]">-</div>}
                                </td>
                                <td className="px-1 py-1 align-middle">
                                    {row.tipo_insumo === "Material" ? (
                                        <input
                                            type="number"
                                            className="block w-full rounded border-gray-300 py-1 px-1 text-right text-[11px] focus:border-indigo-500 focus:ring-indigo-500"
                                            placeholder="$"
                                            value={row.precio_flete_unitario ?? ""}
                                            onChange={(e) => handleRowChange(index, { precio_flete_unitario: e.target.value === "" ? "" : Number(e.target.value) })}
                                        />
                                    ) : <div className="text-center text-gray-300 text-[10px]">-</div>}
                                </td>
                                <td className="px-1 py-1 align-middle">
                                    {row.tipo_insumo === "ManoObra" ? (
                                        <input
                                            type="number"
                                            className="block w-full rounded border-gray-300 py-1 px-1 text-center text-[11px] focus:border-indigo-500 focus:ring-indigo-500"
                                            value={row.rendimiento_jornada ?? ""}
                                            onChange={(e) => handleRowChange(index, { rendimiento_jornada: e.target.value === "" ? "" : Number(e.target.value) })}
                                        />
                                    ) : <div className="text-center text-gray-300 text-[10px]">-</div>}
                                </td>
                                <td className="px-1 py-1 align-middle text-right text-[11px] font-bold text-gray-900 truncate">
                                    {formatearMoneda(obtenerCostoUnitario(row) * row.cantidad)}
                                </td>
                                <td className="px-1 py-1 align-middle text-center">
                                    <button
                                        onClick={() => handleDeleteRow(row.id, index)}
                                        className="text-red-500 hover:text-red-700 transition-colors"
                                        title="Eliminar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                    </button>
                                </td>
                            </tr>
                        ))} 
                        <tr className="bg-indigo-50/30 border-t-2 border-indigo-100">
                             <td className="px-1 py-2 align-middle">
                                <select
                                    className="block w-full rounded border-gray-300 bg-white !bg-white !text-slate-900 py-1 pl-1 pr-4 text-[11px] focus:border-indigo-500 focus:ring-indigo-500"
                                    value={draftRow.tipo_insumo}
                                    onChange={(e) => setDraftRow(prev => ({ ...prev, tipo_insumo: e.target.value as any, id_insumo: "" }))}
                                >
                                    <option value="Material">Mat.</option>
                                    <option value="ManoObra">M.O.</option>
                                    <option value="Equipo">Eq.</option>
                                    <option value="Maquinaria">Maq.</option>
                                </select>
                            </td>
                            <td className="px-1 py-2 align-middle">
                                {renderInsumoSelect(draftRow, -1, (updates) => setDraftRow(prev => ({ ...prev, ...updates })))}
                            </td>
                            <td className="px-1 py-2 text-center text-[10px] text-gray-500">{obtenerUnidad(draftRow)}</td>
                            <td className="px-1 py-2 align-middle">
                                <input
                                    type="number"
                                    className="block w-full rounded border-gray-300 py-1 px-1 text-right text-[11px]"
                                    placeholder="0"
                                    value={draftRow.cantidad || ""}
                                    onChange={(e) => setDraftRow(prev => ({ ...prev, cantidad: Number(e.target.value) }))}
                                />
                            </td>
                             <td className="px-1 py-2 text-center text-[10px] text-gray-400">-</td>
                             <td className="px-1 py-2 align-middle">
                                {draftRow.tipo_insumo === "Material" ? (
                                    <input type="number" className="block w-full rounded border-gray-300 py-1 px-1 text-center text-[11px]" placeholder="%"
                                     value={draftRow.porcentaje_merma ?? ""} onChange={(e) => setDraftRow(prev => ({ ...prev, porcentaje_merma: Number(e.target.value) }))} />
                                ) : null}
                             </td>
                             <td className="px-1 py-2 align-middle">
                                {draftRow.tipo_insumo === "Material" ? (
                                    <input type="number" className="block w-full rounded border-gray-300 py-1 px-1 text-right text-[11px]" placeholder="$"
                                     value={draftRow.precio_flete_unitario ?? ""} onChange={(e) => setDraftRow(prev => ({ ...prev, precio_flete_unitario: Number(e.target.value) }))} />
                                ) : null}
                             </td>
                             <td className="px-1 py-2 align-middle">
                                {draftRow.tipo_insumo === "ManoObra" ? (
                                    <input type="number" className="block w-full rounded border-gray-300 py-1 px-1 text-center text-[11px]" placeholder="R"
                                     value={draftRow.rendimiento_jornada ?? ""} onChange={(e) => setDraftRow(prev => ({ ...prev, rendimiento_jornada: Number(e.target.value) }))} />
                                ) : null}
                             </td>
                             <td className="px-1 py-2 text-right font-bold text-[11px] text-indigo-600">
                                {formatearMoneda(obtenerCostoUnitario(draftRow) * draftRow.cantidad)}
                             </td>
                             <td className="px-1 py-2 text-center">
                                 <button
                                    onClick={handleAgregarDraft}
                                    disabled={!puedeAgregarDraft()}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded p-1 shadow-sm disabled:opacity-50"
                                 >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                 </button>
                             </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {catalogModal && (
                <div className="catalog-modal">
                    <div className="catalog-modal__content card">
                        <h3>Agregar {catalogModal.tipo} al catalogo</h3>
                        <form onSubmit={handleCatalogSubmit}>
                            {renderCatalogFormFields()}
                            <div className="modal-actions">
                                <button type="submit">Guardar en Catalogo</button>
                                <button type="button" onClick={() => setCatalogModal(null)}>
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );

    function renderInsumoSelect(
        row: MatrizRow,
        index: number,
        customHandler?: (updates: Partial<MatrizRow>) => void
    ) {
        if (row.existe_en_catalogo === false) {
            return (
                <span
                    className="insumo-pendiente"
                    title={row.justificacion_breve ?? row.nombre_sugerido ?? undefined}
                >
                    {row.nombre_sugerido ?? "Insumo sugerido (pendiente)"}
                </span>
            );
        }
        const options = obtenerOpciones(row.tipo_insumo, catalogos);
        const handler = customHandler
            ? customHandler
            : (updates: Partial<MatrizRow>) => handleRowChange(index, updates);
        return (
            <div className="insumo-field">
                <select
                    id={index >= 0 ? `${idPrefix}-insumo-select-${index}` : `${idPrefix}-draft-insumo-select`}
                    name={index >= 0 ? `${idPrefix}-insumo-select-${index}` : `${idPrefix}-draft-insumo-select`}
                    className="bg-transparent border-transparent hover:bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded text-sm w-full h-9 transition-all duration-200"
                    aria-label="Seleccionar insumo"
                    value={row.id_insumo}
                    title={row.justificacion_breve ?? undefined}
                    onChange={(event) =>
                        handler({
                            id_insumo: event.target.value ? Number(event.target.value) : "",
                            ...(row.tipo_insumo === "Material" && event.target.value
                                ? obtenerDefaultMermaFlete(Number(event.target.value), catalogos)
                                : row.tipo_insumo === "Material"
                                    ? { porcentaje_merma: "", precio_flete_unitario: "" }
                                    : {}),
                            ...(row.tipo_insumo === "ManoObra" && event.target.value
                                ? obtenerDefaultRendimiento(Number(event.target.value), catalogos)
                                : row.tipo_insumo === "Material"
                                    ? {}
                                    : row.tipo_insumo === "ManoObra"
                                        ? { rendimiento_jornada: "" }
                                        : {}),
                        })
                    }
                >
                    <option value="">-- seleccionar --</option>
                    {options.map((option) => (
                        <option key={option.id} value={option.id}>
                            {option.nombre}
                        </option>
                    ))}
                </select>
                {
                    row.justificacion_breve ? (
                        <span className="insumo-field__info" title={row.justificacion_breve}>
                            i
                        </span>
                    ) : null
                }
            </div >
        );
    }
}

type FactoresApiPayload = Record<"mano_obra" | FactorToggleKey, { activo: boolean; porcentaje: number }>;

function mapFactoresParaApi(factores?: FactorToggleMap): FactoresApiPayload | undefined {
    if (!factores) return undefined;
    const payload: FactoresApiPayload = {
        mano_obra: { activo: false, porcentaje: 0 },
        indirectos: { activo: false, porcentaje: 0 },
        financiamiento: { activo: false, porcentaje: 0 },
        utilidad: { activo: false, porcentaje: 0 },
        iva: { activo: false, porcentaje: 0 },
    };
    (["indirectos", "financiamiento", "utilidad", "iva"] as FactorToggleKey[]).forEach((key) => {
        const config = factores[key];
        if (!config) return;
        const porcentajeValor = Number(config.porcentaje);
        payload[key] = {
            activo: Boolean(config.activo),
            porcentaje: Number.isFinite(porcentajeValor) ? porcentajeValor / 100 : 0,
        };
    });
    const algunoActivo = (["indirectos", "financiamiento", "utilidad", "iva"] as FactorToggleKey[]).some(
        (key) => payload[key].activo && payload[key].porcentaje > 0
    );
    if (!algunoActivo) {
        return undefined;
    }
    return payload;
}

export function mapearSugerenciasDesdeIA(insumos: IASugerencia[] = [], conceptoId: number): MatrizRow[] {
    return insumos.map((item) => {
        const tipo = normalizarTipoIA(item.tipo_insumo);
        const idInsumo = (item.id_insumo ?? item.insumo_id) ?? "";
        const merma = item.merma ?? item.porcentaje_merma ?? null;
        const flete = item.flete_unitario ?? item.precio_flete_unitario ?? null;
        const rendimiento = item.rendimiento_diario ?? item.rendimiento_jornada ?? null;
        return {
            concepto: conceptoId,
            tipo_insumo: tipo,
            id_insumo: idInsumo,
            cantidad: Number(item.cantidad ?? 0),
            porcentaje_merma: tipo === "Material" ? numeroOSinValor(merma) : "",
            precio_flete_unitario: tipo === "Material" ? numeroOSinValor(flete) : "",
            rendimiento_jornada: tipo === "ManoObra" ? numeroOSinValor(rendimiento) : "",
            existe_en_catalogo: item.existe_en_catalogo ?? Boolean(idInsumo),
            nombre_sugerido: item.nombre ?? undefined,
            justificacion_breve: item.justificacion_breve ?? undefined,
            unidad: item.unidad ?? undefined,
        };
    });
}

function normalizarTipoIA(tipo: IASugerencia["tipo_insumo"]): MatrizRow["tipo_insumo"] {
    const texto = (tipo ?? "Material").toString().replace(/\s+/g, "").toLowerCase();
    switch (texto) {
        case "manodeobra":
            return "ManoObra";
        case "equipo":
            return "Equipo";
        case "maquinaria":
            return "Maquinaria";
        default:
            return "Material";
    }
}

function numeroOSinValor(valor: number | null): number | "" {
    if (valor === null || valor === undefined) {
        return "";
    }
    const parsed = Number(valor);
    return Number.isNaN(parsed) ? "" : parsed;
}

type InsumoOption = { id: number; nombre: string };

function obtenerOpciones(tipo: MatrizRow["tipo_insumo"], catalogos: CatalogData | null): InsumoOption[] {
    if (!catalogos) return [];
    if (tipo === "Material") {
        return Object.values(catalogos.materiales).map((material) => ({
            id: material.id,
            nombre: material.nombre,
        }));
    }
    if (tipo === "ManoObra") {
        return Object.values(catalogos.manoObra).map((item) => ({
            id: item.id,
            nombre: item.puesto,
        }));
    }
    if (tipo === "Equipo") {
        return Object.values(catalogos.equipos).map((equipo) => ({
            id: equipo.id,
            nombre: equipo.nombre,
        }));
    }
    return Object.values(catalogos.maquinaria).map((equipo) => ({
        id: equipo.id,
        nombre: equipo.nombre,
    }));
}

function obtenerDefaultMermaFlete(materialId: number, catalogos: CatalogData | null) {
    if (!catalogos) return {};
    const material = catalogos.materiales[materialId];
    if (!material) return {};
    return {
        porcentaje_merma: material.porcentaje_merma,
        precio_flete_unitario: material.precio_flete_unitario,
    };
}

function obtenerDefaultRendimiento(manoId: number, catalogos: CatalogData | null) {
    if (!catalogos) return {};
    const mano = catalogos.manoObra[manoId];
    if (!mano) return {};
    return {
        rendimiento_jornada: mano.rendimiento_jornada,
    };
}

function crearDraftRow(conceptoId?: number | null): MatrizRow {
    return {
        concepto: conceptoId ?? 0,
        tipo_insumo: "Material",
        id_insumo: "",
        cantidad: 0,
        porcentaje_merma: "",
        precio_flete_unitario: "",
        rendimiento_jornada: "",
    };
}

function renderTooltip(contenido: string) {
    return (
        <span className="help-icon" title={contenido}>
            ?
        </span>
    );
}

type CatalogModalState = {
    rowIndex: number;
    tipo: MatrizRow["tipo_insumo"];
    form: Record<string, string>;
};

function crearFormularioCatalogo(row: MatrizRow): Record<string, string> {
    const nombre = row.nombre_sugerido ?? "";
    switch (row.tipo_insumo) {
        case "Material":
            return {
                nombre,
                unidad: "unidad",
                precio_unitario: "",
                porcentaje_merma: row.porcentaje_merma !== "" && row.porcentaje_merma !== undefined ? String(row.porcentaje_merma) : "0.03",
                precio_flete_unitario:
                    row.precio_flete_unitario !== "" && row.precio_flete_unitario !== undefined
                        ? String(row.precio_flete_unitario)
                        : "0",
            };
        case "ManoObra":
            return {
                nombre,
                salario_base: "",
                rendimiento_jornada:
                    row.rendimiento_jornada !== "" && row.rendimiento_jornada !== undefined
                        ? String(row.rendimiento_jornada)
                        : "8.0",
            };
        case "Equipo":
            return {
                nombre,
                unidad: "hora",
                costo_hora_maq: "",
            };
        case "Maquinaria":
            return {
                nombre,
                costo_adquisicion: "",
                vida_util_horas: "",
                tasa_interes_anual: "0.10",
                rendimiento_horario: "1.0",
            };
        default:
            return { nombre };
    }
}
