import { useState } from "react";
import type { SavedProjectType } from "../../utils/savedProjects";

type SaveProjectModalProps = {
    open: boolean;
    descripcion: string;
    onClose: () => void;
    onSave: (tipo: SavedProjectType) => Promise<void>;
};

const OPTIONS: SavedProjectType[] = ["Presupuesto", "Factura", "Nota de Venta"];

export function SaveProjectModal({ open, descripcion, onClose, onSave }: SaveProjectModalProps) {
    const [selected, setSelected] = useState<SavedProjectType | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!open) return null;

    const handleConfirm = async () => {
        if (!selected) {
            setError("Selecciona un tipo de documento para guardar.");
            return;
        }
        setError(null);
        setSaving(true);
        try {
            await onSave(selected);
        } catch (err) {
            setError("No se pudo guardar el proyecto. Intenta otra vez.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                <header className="px-6 py-4 bg-indigo-600 text-white flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Guardar proyecto</p>
                        <h3 className="text-lg font-semibold">¿Cómo deseas registrar este proyecto?</h3>
                    </div>
                    <button type="button" onClick={onClose} className="text-white/80 hover:text-white">
                        ✕
                    </button>
                </header>
                <div className="px-6 py-4 space-y-3 text-sm text-slate-600">
                    <p>{descripcion || "Guarda el análisis actual para retomarlo después o generar documentos."}</p>
                    <div className="space-y-2">
                        {OPTIONS.map((option) => (
                            <label
                                key={option}
                                className={`flex items-center gap-4 border rounded-xl px-4 py-4 cursor-pointer transition-all duration-200 ${selected === option
                                        ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600"
                                        : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                                    }`}
                            >
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${selected === option ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-600"
                                    }`}>
                                    {option === "Presupuesto" && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" /><polyline points="14 2 14 8 20 8" /><path d="M3 15h6" /><path d="M3 18h6" /><path d="M3 12h6" /></svg>}
                                    {option === "Factura" && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.74Z" /><path d="m9 12 2 2 4-4" /></svg>}
                                    {option === "Nota de Venta" && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></svg>}
                                </div>
                                <input
                                    type="radio"
                                    name="save-project-option"
                                    checked={selected === option}
                                    onChange={() => setSelected(option)}
                                    className="sr-only"
                                />
                                <div>
                                    <p className={`font-semibold ${selected === option ? "text-indigo-900" : "text-gray-900"}`}>{option}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Genera un documento tipo {option.toLowerCase()}.</p>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
                {error && <p className="px-6 text-xs text-red-600">{error}</p>}
                <footer className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:border-gray-400">
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!selected || saving}
                        className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {saving ? "Guardando..." : "Guardar"}
                    </button>
                </footer>
            </div>
        </div>
    );
}
