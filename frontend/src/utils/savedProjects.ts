export type SavedProjectType = 'Presupuesto' | 'Factura' | 'Nota de Venta';

import type { MatrizRow } from "../components/conceptos/ConceptoMatrizEditor";

export type SavedProjectRecord = {
    id: string;
    nombre: string;
    descripcion: string;
    tipo_documento: SavedProjectType;
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

const STORAGE_KEY = "apu_saved_projects";

export function loadSavedProjects(): SavedProjectRecord[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed;
        }
    } catch {
        console.warn("No se pudo leer el historial de proyectos guardados.");
    }
    return [];
}

export function persistSavedProjects(records: SavedProjectRecord[]) {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
