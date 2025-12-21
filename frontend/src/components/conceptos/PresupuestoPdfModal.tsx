import React, { useState } from "react";
import { MatrizRow } from "./ConceptoMatrizEditor";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

type Props = {
    open: boolean;
    onClose: () => void;
    rows: MatrizRow[];
    resumen: { costo_directo: number; precio_unitario: number };
    conceptoNombre: string;
};

export function PresupuestoPdfModal({ open, onClose, rows, resumen, conceptoNombre }: Props) {
    const [emisor, setEmisor] = useState({
        nombre: "BORCELLE CONSTRUCCIONES",
        direccion: "Calle Principal 123, Ciudad",
        mail: "hola@constructoraborcelle.com",
        telefono: "911-234-5678"
    });

    const [receptor, setReceptor] = useState({
        nombre: "Alejandro Torres",
        direccion: "Calle Cualquiera 456, Otra Ciudad",
        mail: "cliente@email.com",
        telefono: "911-876-5432"
    });

    if (!open) return null;

    const handleExportarPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Estilo y Colores (BORCELLE Blue)
        const bluePrimary = [13, 110, 253]; // RGB
        const blueDark = [10, 88, 202];
        const grayText = [100, 116, 139];

        // 1. Header (Curvas decorativas simuladas con rectángulos y círculos si fuera posible, pero mantengamoslo profesional)
        doc.setFillColor(bluePrimary[0], bluePrimary[1], bluePrimary[2]);
        doc.rect(0, 0, pageWidth, 40, 'F');

        // Logo Placeholder
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text("G", 170, 20);
        doc.setFontSize(12);
        doc.text(emisor.nombre.split(' ')[0] || "EMPRESA", 160, 30);

        // 2. Información General
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);

        // Datos del Cliente (Izquierda)
        doc.setFont("helvetica", "bold");
        doc.text("DATOS DEL CLIENTE", 20, 60);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(grayText[0], grayText[1], grayText[2]);
        doc.text(`Nombre: ${receptor.nombre}`, 20, 67);
        doc.text(`Dirección: ${receptor.direccion}`, 20, 73);
        doc.text(`Mail: ${receptor.mail}`, 20, 79);
        doc.text(`Teléfono: ${receptor.telefono}`, 20, 85);

        // Datos de la Empresa (Derecha)
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text("DATOS DE LA EMPRESA", pageWidth - 80, 60);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(grayText[0], grayText[1], grayText[2]);
        doc.text(emisor.nombre, pageWidth - 80, 67);
        doc.text(emisor.direccion, pageWidth - 80, 73);
        doc.text(emisor.mail, pageWidth - 80, 79);
        doc.text(emisor.telefono, pageWidth - 80, 85);

        // Fecha
        const fecha = new Date().toLocaleDateString();
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text(`Fecha: ${fecha}`, 20, 105);

        // 3. Tabla de Conceptos
        const tableBody = rows.map(row => {
            const nombre = row.nombre_sugerido || `Insumo ${row.id_insumo || ''}`;
            const precio = Number(row.precio_unitario_temp || 0); // Esto puede variar segun como se calculó
            // Nota: En la matriz real de AnalisisPuPage, el precio unitario del insumo se saca de obtenerCostoUnitario
            // Para simplicidad en este paso, usaremos lo que venga en la fila o 0.
            // Idealmente AnalisisPuPage debería pasar las filas ya con el costo calculado si queremos exactitud.
            return [
                nombre,
                Number(row.cantidad).toFixed(2) + " " + (row.unidad || ""),
                "$" + precio.toLocaleString('en-US', { minimumFractionDigits: 2 }),
                "$" + (Number(row.cantidad) * precio).toLocaleString('en-US', { minimumFractionDigits: 2 })
            ];
        });

        (doc as any).autoTable({
            startY: 115,
            head: [['Concepto', 'Cantidad', 'Precio', 'Total']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: blueDark, textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 9 },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { cellWidth: 30, halign: 'center' },
                2: { cellWidth: 40, halign: 'right' },
                3: { cellWidth: 40, halign: 'right' },
            }
        });

        // 4. Totales
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Subtotal", pageWidth - 80, finalY);
        doc.setFont("helvetica", "normal");
        doc.text("$" + resumen.costo_directo.toLocaleString('en-US', { minimumFractionDigits: 2 }), pageWidth - 30, finalY, { align: 'right' });

        doc.setFont("helvetica", "bold");
        doc.text("Total", pageWidth - 80, finalY + 15);
        doc.setFontSize(12);
        doc.setTextColor(bluePrimary[0], bluePrimary[1], bluePrimary[2]);
        doc.text("$" + resumen.precio_unitario.toLocaleString('en-US', { minimumFractionDigits: 2 }), pageWidth - 30, finalY + 15, { align: 'right' });

        // Footer Decorativo
        doc.setFillColor(bluePrimary[0], bluePrimary[1], bluePrimary[2]);
        doc.rect(0, 280, pageWidth, 20, 'F');

        doc.save(`Presupuesto_${conceptoNombre.replace(/ /g, '_')}.pdf`);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <header className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold">Configurar Exportación PDF</h2>
                        <p className="text-white/80 text-sm">Personaliza los datos del presupuesto</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                </header>

                <div className="p-8 overflow-y-auto space-y-8">
                    {/* Emisor */}
                    <section>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">Datos de la Empresa (Emisor)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre Comercial</label>
                                <input
                                    className="w-full text-sm border-gray-200 rounded-xl focus:ring-indigo-500"
                                    value={emisor.nombre}
                                    onChange={e => setEmisor({ ...emisor, nombre: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Teléfono</label>
                                <input
                                    className="w-full text-sm border-gray-200 rounded-xl focus:ring-indigo-500"
                                    value={emisor.telefono}
                                    onChange={e => setEmisor({ ...emisor, telefono: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Correo Electrónico</label>
                                <input
                                    className="w-full text-sm border-gray-200 rounded-xl focus:ring-indigo-500"
                                    value={emisor.mail}
                                    onChange={e => setEmisor({ ...emisor, mail: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Dirección</label>
                                <input
                                    className="w-full text-sm border-gray-200 rounded-xl focus:ring-indigo-500"
                                    value={emisor.direccion}
                                    onChange={e => setEmisor({ ...emisor, direccion: e.target.value })}
                                />
                            </div>
                        </div>
                    </section>

                    {/* Receptor */}
                    <section>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">Datos del Cliente (Receptor)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre del Cliente</label>
                                <input
                                    className="w-full text-sm border-gray-200 rounded-xl focus:ring-indigo-500"
                                    value={receptor.nombre}
                                    onChange={e => setReceptor({ ...receptor, nombre: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Teléfono</label>
                                <input
                                    className="w-full text-sm border-gray-200 rounded-xl focus:ring-indigo-500"
                                    value={receptor.telefono}
                                    onChange={e => setReceptor({ ...receptor, telefono: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Correo Electrónico</label>
                                <input
                                    className="w-full text-sm border-gray-200 rounded-xl focus:ring-indigo-500"
                                    value={receptor.mail}
                                    onChange={e => setReceptor({ ...receptor, mail: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">Dirección</label>
                                <input
                                    className="w-full text-sm border-gray-200 rounded-xl focus:ring-indigo-500"
                                    value={receptor.direccion}
                                    onChange={e => setReceptor({ ...receptor, direccion: e.target.value })}
                                />
                            </div>
                        </div>
                    </section>
                </div>

                <footer className="p-6 bg-gray-50 border-t flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-600 font-semibold hover:bg-gray-100 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleExportarPDF}
                        className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                        Generar PDF
                    </button>
                </footer>
            </div>
        </div>
    );
}
