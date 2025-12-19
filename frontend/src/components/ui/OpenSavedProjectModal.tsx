import { Fragment } from "react";
import type { SavedProjectRecord, SavedProjectType } from "../../utils/savedProjects";

type OpenSavedProjectModalProps = {
    open: boolean;
    projects: SavedProjectRecord[];
    onClose: () => void;
    onSelect: (project: SavedProjectRecord) => void;
};

export function OpenSavedProjectModal({ open, projects, onClose, onSelect }: OpenSavedProjectModalProps) {
    if (!open) return null;
    if (projects.length === 0) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="bg-white p-6 rounded-2xl shadow-xl text-center">
                    <p className="text-lg font-semibold mb-4">No hay proyectos guardados</p>
                    <p className="text-sm text-gray-500 mb-6">Guarda un presupuesto, factura o nota de venta desde el análisis para poder abrirlo luego.</p>
                    <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold">Cerrar</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-w-3xl w-full bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                <header className="px-6 py-4 bg-indigo-600 text-white flex items-center justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">Proyectos guardados</p>
                        <h3 className="text-lg font-semibold">Selecciona uno para reabrir</h3>
                    </div>
                    <button type="button" onClick={onClose} className="text-white/80 hover:text-white">✕</button>
                </header>
                <div className="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-3">
                    {projects.map((project) => (
                        <button
                            key={project.id}
                            className="w-full border border-gray-200 rounded-xl p-4 text-left hover:border-indigo-300 transition-all flex justify-between items-start gap-4"
                            onClick={() => onSelect(project)}
                        >
                            <div>
                                <p className="text-sm uppercase text-indigo-500 font-semibold tracking-wide">{project.tipo_documento}</p>
                                <h4 className="text-lg font-semibold text-gray-900">{project.nombre}</h4>
                                <p className="text-xs text-gray-500 mt-1">{project.descripcion}</p>
                            </div>
                            <div className="text-xs text-gray-400">{new Date(project.fecha).toLocaleDateString("es-MX", { dateStyle: "medium" })}</div>
                        </button>
                    ))}
                </div>
                <footer className="px-6 py-4 border-t border-gray-100 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:border-gray-400">Cerrar</button>
                </footer>
            </div>
        </div>
    );
}
