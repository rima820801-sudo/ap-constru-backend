import React, { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { MatrizRow } from "./ConceptoMatrizEditor";

export type NotaVenta = {
    concepto_id?: number | null;
    concepto_descripcion: string;
    unidad: string;
    cantidad: number;
    costo_directo_unitario: number;
    precio_unitario_final: number;
    importe_total: number;
    mensaje: string;
};

type Props = {
    nota: NotaVenta | null;
    matriz: MatrizRow[];
    onClose: () => void;
};

type PdfSettings = {
    logoUrl: string;
    empresaNombre: string;
    clienteNombre: string;
    clienteTelefono: string;
    clienteDireccion: string;
    facturaNro: string;
    fechaEmision: string;
    footerContacto: string;
    footerEmail: string;
    footerBanco: string;
};

const initialSettings: PdfSettings = {
    logoUrl: "https://via.placeholder.com/150", // Placeholder or default
    empresaNombre: "Mi Empresa Constructora",
    clienteNombre: "Cliente General",
    clienteTelefono: "55-1234-5678",
    clienteDireccion: "Av. Principal #123, Ciudad",
    facturaNro: "001",
    fechaEmision: new Date().toLocaleDateString(),
    footerContacto: "Tel: 55-0000-0000",
    footerEmail: "contacto@miempresa.com",
    footerBanco: "Banco XYZ - Cuenta: 1234567890",
};

export function NotaVentaModalFixed({ nota, matriz, onClose }: Props) {
    const [settings, setSettings] = useState<PdfSettings>(initialSettings);
    const [showSettings, setShowSettings] = useState(false);

    if (!nota) return null;

    const sobrecosto = nota.precio_unitario_final - nota.costo_directo_unitario;

    const handleSettingsChange = (field: keyof PdfSettings, value: string) => {
        setSettings((prev) => ({ ...prev, [field]: value }));
    };

    const handleExportExcel = () => {
        if (!matriz || matriz.length === 0) {
            alert("No hay datos en la matriz para exportar.");
            return;
        }

        const data = matriz.map((row) => ({
            "Tipo Insumo": row.tipo_insumo,
            "Insumo": row.nombre_sugerido || "Sin nombre",
            "Unidad": "unidad", // Simplificado, idealmente obtener de catalogo si disponible
            "Cantidad": row.cantidad,
            "Costo Unitario": 0, // Simplificado
            "Importe": 0 // Simplificado
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Desglose APU");
        XLSX.writeFile(wb, `Nota_Venta_${nota.concepto_descripcion.substring(0, 10)}.xlsx`);
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // --- Header ---
        // Logo (Placeholder rectangle if image fails or just text)
        doc.setFillColor(240, 240, 240);
        doc.rect(0, 0, pageWidth, 40, "F"); // Background header

        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text(settings.empresaNombre, pageWidth / 2, 25, { align: "center" });

        // --- Client Info Box ---
        doc.setDrawColor(255, 215, 0); // Gold border
        doc.setLineWidth(1);
        doc.rect(15, 50, 80, 35);

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Cliente", 20, 60);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(settings.clienteNombre, 20, 68);
        doc.text(`Tel: ${settings.clienteTelefono}`, 20, 74);
        doc.text(settings.clienteDireccion, 20, 80);

        // --- Invoice Info Box ---
        doc.rect(pageWidth - 95, 50, 80, 25);
        doc.setFont("helvetica", "bold");
        doc.text(`Factura Nro: ${settings.facturaNro}`, pageWidth - 90, 60);
        doc.setFont("helvetica", "normal");
        doc.text(`Emisión: ${settings.fechaEmision}`, pageWidth - 90, 68);

        // --- Concepto Main Info ---
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Descripción del Concepto", 15, 100);
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(nota.concepto_descripcion, 15, 108, { maxWidth: pageWidth - 30 });

        // --- Table ---
        // We use autoTable for the breakdown
        const tableBody = matriz.map(row => [
            row.tipo_insumo,
            row.nombre_sugerido || "Insumo",
            row.cantidad.toFixed(4),
            "$0.00", // Placeholder for unit cost if not available in row directly
            "$0.00"  // Placeholder for total
        ]);

        autoTable(doc, {
            startY: 120,
            head: [["Tipo", "Descripción", "Cantidad", "P. Unitario", "Importe"]],
            body: tableBody,
            theme: 'striped',
            headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], lineColor: [200, 200, 200], lineWidth: 0.1 },
            styles: { textColor: [50, 50, 50] },
        });

        // --- Totals ---
        const finalY = (doc as any).lastAutoTable.finalY + 10;

        doc.setFillColor(245, 245, 220); // Beige background for total
        doc.rect(15, finalY, pageWidth - 30, 20, "F");

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Total:", 25, finalY + 13);
        doc.text(`$${nota.precio_unitario_final.toFixed(2)}`, 60, finalY + 13);

        // --- Footer ---
        const pageHeight = doc.internal.pageSize.height;
        doc.setFillColor(30, 30, 30); // Dark footer
        doc.rect(0, pageHeight - 30, pageWidth, 30, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.text(settings.empresaNombre, 20, pageHeight - 20);
        doc.text(settings.footerContacto, 20, pageHeight - 15);
        doc.text(settings.footerEmail, pageWidth / 2, pageHeight - 20, { align: "center" });
        doc.text(settings.footerBanco, pageWidth - 20, pageHeight - 20, { align: "right" });

        doc.save(`Nota_Venta_${settings.facturaNro}.pdf`);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="modal-header">
                    <h2>Nota de Venta</h2>
                    <button onClick={onClose} className="close-button" aria-label="Cerrar">×</button>
                </div>

                <div className="modal-body">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3>{nota.concepto_descripcion}</h3>
                            <p className="concepto-unidad">Unidad: {nota.unidad} | Cantidad: {nota.cantidad}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-indigo-600">${nota.precio_unitario_final.toFixed(2)}</p>
                            <p className="text-sm text-gray-500">Precio Unitario Final</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="text-sm text-indigo-600 hover:underline mb-4 block"
                    >
                        {showSettings ? "Ocultar configuración de PDF" : "Configurar datos para PDF"}
                    </button>

                    {showSettings && (
                        <div className="settings-panel grid grid-cols-2 gap-3 mb-4 p-4 bg-gray-50 rounded text-sm">
                            <input placeholder="Nombre Empresa" value={settings.empresaNombre} onChange={e => handleSettingsChange("empresaNombre", e.target.value)} className="border p-1 rounded" />
                            <input placeholder="Cliente Nombre" value={settings.clienteNombre} onChange={e => handleSettingsChange("clienteNombre", e.target.value)} className="border p-1 rounded" />
                            <input placeholder="Cliente Dirección" value={settings.clienteDireccion} onChange={e => handleSettingsChange("clienteDireccion", e.target.value)} className="border p-1 rounded" />
                            <input placeholder="Factura Nro" value={settings.facturaNro} onChange={e => handleSettingsChange("facturaNro", e.target.value)} className="border p-1 rounded" />
                            <input placeholder="Fecha Emisión" value={settings.fechaEmision} onChange={e => handleSettingsChange("fechaEmision", e.target.value)} className="border p-1 rounded" />
                        </div>
                    )}

                    <div className="resumen-financiero">
                        <div className="resumen-item">
                            <span className="label">Costo Directo (CD)</span>
                            <span className="valor">${nota.costo_directo_unitario.toFixed(2)}</span>
                        </div>
                        <div className="resumen-item">
                            <span className="label">Sobrecosto</span>
                            <span className="valor">${sobrecosto.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button onClick={handleExportExcel} className="secondary-button flex items-center gap-2">
                        <span>📊</span> Exportar Excel
                    </button>
                    <button onClick={handleExportPDF} className="cta-button flex items-center gap-2">
                        <span>📄</span> Exportar PDF
                    </button>
                    <button onClick={onClose} className="secondary-button">Cerrar</button>
                </div>

                <style>{`
                    .modal-overlay {
                        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                        background-color: rgba(0, 0, 0, 0.6);
                        display: flex; justify-content: center; align-items: center; z-index: 1000;
                    }
                    .modal-content {
                        background-color: #ffffff; padding: 1.5rem; border-radius: 8px;
                        width: 90%; max-width: 700px; max-height: 90vh; overflow-y: auto;
                        box-shadow: 0 6px 24px rgba(0,0,0,0.2);
                    }
                    .modal-header {
                        display: flex; align-items: center; justify-content: space-between;
                        border-bottom: 1px solid #eee; padding-bottom: 0.5rem; margin-bottom: 1rem;
                    }
                    .modal-header h2 { margin: 0; font-size: 1.25rem; }
                    .close-button { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
                    .modal-body h3 { margin-top: 0; font-size: 1.1rem; }
                    .concepto-unidad { color: #555; margin-top: 0.25rem; font-size: 0.9rem; }
                    .resumen-financiero { margin: 1rem 0; background: #f9fafb; padding: 1rem; rounded: 0.5rem; }
                    .resumen-item { display: flex; justify-content: space-between; padding: 0.2rem 0; font-size: 0.9rem; }
                    .modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1rem; border-top: 1px solid #eee; padding-top: 1rem; }
                    .cta-button { background-color: #0d6efd; color: white; padding: 0.5rem 1rem; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; }
                    .cta-button:hover { background-color: #0b5ed7; }
                    .secondary-button { background: white; border: 1px solid #ddd; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; color: #333; }
                    .secondary-button:hover { background-color: #f8f9fa; }
                `}</style>
            </div>
        </div>
    );
}

export default NotaVentaModalFixed;
