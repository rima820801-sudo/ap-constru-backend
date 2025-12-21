import { useEffect, useId, useState } from "react";
import type { ClarifyingHistoryEntry, ClarifyingQuestion } from "../../types/clarification";

type PreguntasClarificadorasModalProps = {
    open: boolean;
    descripcion: string;
    preguntas: ClarifyingQuestion[];
    history?: ClarifyingHistoryEntry[];
    initialAnswers?: string[];
    loading?: boolean;
    onClose: () => void;
    onSubmit: (respuestas: string[]) => Promise<string | null>;
    onSkip: () => void;
};

export function PreguntasClarificadorasModal({
    open,
    descripcion,
    preguntas,
    history,
    initialAnswers,
    loading = false,
    onClose,
    onSubmit,
    onSkip,
}: PreguntasClarificadorasModalProps) {
    const idPrefix = useId().replace(/:/g, "");
    const [respuestas, setRespuestas] = useState<string[]>(() => preguntas.map(() => ""));
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const baseRespuestas = preguntas.map(() => "");
        if (initialAnswers && initialAnswers.length) {
            initialAnswers.forEach((respuesta, index) => {
                if (typeof respuesta === "string") {
                    baseRespuestas[index] = respuesta;
                }
            });
        }
        setRespuestas(baseRespuestas);
        setSubmitError(null);
        setSubmitting(false);
    }, [preguntas, open, initialAnswers]);

    if (!open) return null;

    const handleChange = (index: number, value: string) => {
        setRespuestas((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    };

    const cleanedRespuestas = respuestas.map((respuesta) => respuesta.trim());

    const handleSubmit = async () => {
        setSubmitError(null);
        setSubmitting(true);

        // Cerrar el modal inmediatamente para ver la animación
        onClose();

        const error = await onSubmit(cleanedRespuestas);
        if (error) {
            setSubmitError(error);
            setSubmitting(false);
            return;
        }
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-w-3xl w-full bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh]">
                <header className="p-5 border-b border-gray-100 flex justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Preguntas clarificadoras</p>
                        <h3 className="text-lg font-semibold text-gray-900 mt-1">Afinemos los detalles del proyecto</h3>
                        <p className="text-sm text-gray-500 mt-1 overflow-hidden text-ellipsis" title={descripcion}>
                            {descripcion || "Describe tu obra para que la IA proponga respuestas más precisas."}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full p-1"
                        aria-label="Cerrar ventana"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
                            <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>
                </header>
                {history && history.length > 0 && (
                    <div className="px-5 pt-4 space-y-2 bg-indigo-50 border-y border-indigo-100">
                        <p className="text-[11px] uppercase tracking-wide text-indigo-500 font-semibold">Respuestas previas</p>
                        <div className="space-y-1 text-xs text-indigo-800">
                            {history.slice(-3).map((entrada, index) => (
                                <div key={`${entrada.pregunta}-${index}`} className="flex flex-col gap-1">
                                    <span className="text-[11px] font-semibold text-indigo-700">{entrada.pregunta}</span>
                                    <span className="text-[10px] text-indigo-600 truncate">{entrada.respuesta || "Sin respuesta registrada"}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                    {loading ? (
                        <p className="text-sm text-gray-500 text-center">Estamos generando las preguntas...</p>
                    ) : preguntas.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center">No se encontraron preguntas para esta descripción.</p>
                    ) : (
                        preguntas.map((pregunta, index) => {
                            const respuestaActual = respuestas[index] ?? "";
                            return (
                                <div key={`${pregunta.pregunta}-${index}`} className="space-y-3">
                                    <div>
                                        <label
                                            htmlFor={`${idPrefix}-pregunta-${index}`}
                                            className="text-sm font-medium text-gray-700"
                                        >
                                            {pregunta.pregunta}
                                        </label>
                                        {pregunta.contexto && (
                                            <p className="text-[11px] text-gray-500 mt-1">{pregunta.contexto}</p>
                                        )}
                                    </div>
                                    {pregunta.opciones && pregunta.opciones.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {pregunta.opciones.map((opcion) => {
                                                const seleccionado = respuestaActual === opcion;
                                                return (
                                                    <button
                                                        key={opcion}
                                                        type="button"
                                                        className={`text-xs px-3 py-1 rounded-full border transition ${seleccionado ? "bg-indigo-600 text-white border-indigo-700 shadow" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-200"}`}
                                                        onClick={() => handleChange(index, opcion)}
                                                    >
                                                        {opcion}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <textarea
                                        id={`${idPrefix}-pregunta-${index}`}
                                        name={`${idPrefix}-pregunta-${index}`}
                                        rows={3}
                                        value={respuestaActual}
                                        onChange={(event) => handleChange(index, event.target.value)}
                                        placeholder="Selecciona una opción o escribe tu propia respuesta..."
                                        className="w-full border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 p-3 resize-vertical"
                                    />
                                </div>
                            );
                        })
                    )}
                </div>

                <footer className="p-5 border-t border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                        type="button"
                        onClick={onSkip}
                        className="text-sm text-gray-500 underline hover:text-gray-700 self-start"
                    >
                        Omitir y continuar sin responder
                    </button>
                    <div className="flex gap-2 flex-wrap justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 transition"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading || preguntas.length === 0 || submitting}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-60 disabled:cursor-not-allowed hover:bg-indigo-500 transition flex items-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4 animate-spin text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M12 4v4m0 8v4m8-8h-4M4 12H0m12-8a8 8 0 100 16 8 8 0 000-16z"
                                        />
                                    </svg>
                                    Generando APU...
                                </>
                            ) : (
                                "Generar APU con respuestas"
                            )}
                        </button>
                    </div>
                </footer>
                {submitError && (
                    <p className="text-xs text-red-600 mt-2 px-5">{submitError}</p>
                )}
            </div>
        </div>
    );
}
