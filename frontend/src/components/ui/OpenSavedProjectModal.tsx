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
                            className="group w-full border border-gray-200 rounded-xl p-4 text-left hover:border-indigo-400 hover:shadow-md transition-all flex items-start gap-4 bg-white hover:bg-indigo-50/30"
                            onClick={() => onSelect(project)}
                        >
                            <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                {project.tipo_documento === "Presupuesto" && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7.5L14.5 2H6a2 2 0 0 0-2 2v4" /><polyline points="14 2 14 8 20 8" /><path d="M3 15h6" /><path d="M3 18h6" /><path d="M3 12h6" /></svg>}
                                {project.tipo_documento === "Factura" && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.74Z" /><path d="m9 12 2 2 4-4" /></svg>}
                                {project.tipo_documento === "Nota de Venta" && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></svg>}
                                {!["Presupuesto", "Factura", "Nota de Venta"].includes(project.tipo_documento) && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <p className="text-xs font-bold uppercase text-indigo-500 tracking-wide mb-0.5">{project.tipo_documento}</p>
                                    <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100 whitespace-nowrap ml-2">
                                        {new Date(project.fecha).toLocaleDateString("es-MX", { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                                <h4 className="text-base font-bold text-gray-900 truncate">{project.nombre}</h4>
                                <p className="text-sm text-gray-500 mt-1 line-clamp-2 leading-relaxed">{project.descripcion}</p>
                            </div>
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
