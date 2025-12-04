import React, { useEffect, useState } from "react";
import { apiFetch } from "../../api/client";

type ConceptoResumen = {
    id: number;
    clave: string;
    descripcion: string;
    unidad_concepto: string;
};

type Props = {
    onSelect: (id: number) => void;
    onClose: () => void;
};

export function ConceptoSelectorModal({ onSelect, onClose }: Props) {
    const [conceptos, setConceptos] = useState<ConceptoResumen[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        apiFetch<ConceptoResumen[]>("/conceptos")
            .then(setConceptos)
            .catch((err) => console.error("Error loading concepts:", err))
            .finally(() => setLoading(false));
    }, []);

    const filtered = conceptos.filter(
        (c) =>
            c.clave.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800">Abrir Proyecto Guardado</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                </div>

                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <input
                        type="text"
                        placeholder="Buscar por clave o descripción..."
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">Cargando proyectos...</div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No se encontraron proyectos.</div>
                    ) : (
                        <ul className="space-y-2">
                            {filtered.map((concepto) => (
                                <li key={concepto.id}>
                                    <button
                                        onClick={() => onSelect(concepto.id)}
                                        className="w-full text-left p-3 rounded-lg hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 transition-colors group"
                                    >
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-gray-900 group-hover:text-indigo-700">{concepto.clave}</span>
                                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">ID: {concepto.id}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{concepto.descripcion}</p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}
