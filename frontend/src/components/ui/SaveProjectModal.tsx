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
                            <label key={option} className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-indigo-500">
                                <input
                                    type="radio"
                                    name="save-project-option"
                                    checked={selected === option}
                                    onChange={() => setSelected(option)}
                                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-slate-300"
                                />
                                <div>
                                    <p className="font-semibold text-slate-800">{option}</p>
                                    <p className="text-xs text-slate-500">Genera un {option.toLowerCase()} con los insumos actuales.</p>
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
