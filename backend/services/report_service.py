import io
from flask import send_file
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import Table, TableStyle, SimpleDocTemplate, Spacer, Paragraph
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from backend.models import Concepto, MatrizInsumo, Material, ManoObra, Equipo, Maquinaria
from backend.services.calculation_service import calcular_precio_unitario, obtener_costo_insumo, decimal_field

def generar_pdf_nota_venta(concepto_id: int):
    concepto = Concepto.query.get_or_404(concepto_id)
    registros = [r.to_dict() for r in MatrizInsumo.query.filter_by(concepto_id=concepto_id).all()]

    # Construir matriz detallada
    matriz_detalle = []
    material_cache = {}
    mano_cache = {}
    equipo_cache = {}
    maquinaria_cache = {}

    for registro in registros:
        cantidad = decimal_field(registro.get('cantidad'))
        costo_unitario = obtener_costo_insumo(registro, material_cache, mano_cache, equipo_cache, maquinaria_cache)
        importe = cantidad * costo_unitario

        tipo = registro.get('tipo_insumo')
        nombre = ''
        unidad = ''

        # Resolve names
        if tipo == 'Material':
            m = material_cache.get(registro['id_insumo'])
            nombre = m.nombre if m else ''
            unidad = m.unidad if m else ''
        elif tipo == 'ManoObra':
            mo = mano_cache.get(registro['id_insumo'])
            nombre = mo.puesto if mo else ''
            unidad = 'jornada'
        # ... others ...

        matriz_detalle.append({
            'tipo_insumo': tipo,
            'nombre': nombre,
            'cantidad': float(cantidad),
            'unidad': unidad,
            'precio_unitario': float(costo_unitario),
            'importe': float(importe),
        })

    resultado = calcular_precio_unitario(concepto_id=concepto_id)
    costo_directo = resultado['costo_directo']
    precio_unitario = resultado['precio_unitario']
    sobrecosto = precio_unitario - costo_directo
    porcentaje_sobrecosto = (sobrecosto / costo_directo * 100) if costo_directo > 0 else 0

    buffer = io.BytesIO()
    try:
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=14, textColor=colors.HexColor('#1f4788'), spaceAfter=6)

        doc = SimpleDocTemplate(buffer, pagesize=A4)
        story = []
        story.append(Paragraph("NOTA DE VENTA / APU", title_style))
        story.append(Paragraph(f"Concepto: {concepto.descripcion}", styles['Normal']))
        story.append(Paragraph(f"Precio Unitario: ${precio_unitario:,.2f}", styles['Normal']))

        # Simple table for brevity in this refactor
        data = [["Insumo", "Cantidad", "Importe"]]
        for row in matriz_detalle:
            data.append([row['nombre'], f"{row['cantidad']:.2f}", f"${row['importe']:.2f}"])

        t = Table(data)
        t.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 1, colors.black)]))
        story.append(t)

        doc.build(story)
        pdf_bytes = buffer.getvalue()

        return send_file(io.BytesIO(pdf_bytes), mimetype='application/pdf', as_attachment=True, download_name=f'nota_venta_{concepto_id}.pdf')

    except Exception as e:
        print(f"PDF Error: {e}")
        return None
