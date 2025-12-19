export type ClarifyingQuestion = {
    pregunta: string;
    opciones?: string[];
    contexto?: string;
};

export type ClarifyingHistoryEntry = {
    pregunta: string;
    respuesta: string;
};
