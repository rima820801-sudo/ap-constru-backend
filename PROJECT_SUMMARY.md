# Resumen del proyecto

Precios Unitarios es una aplicación full-stack que combina un backend en Flask/SQLAlchemy con un frontend en React (Vite + TypeScript) para administrar catálogos, generar análisis de precio unitario asistidos por IA y orquestar presupuestos con integración a notas de venta. El backend vive en `backend/` y el frontend en `frontend/`.

## Componentes principales
- **Backend**: `backend/app.py` expone modelos (`Material`, `ManoObra`, `Equipo`, `Maquinaria`, `Concepto`, `Proyecto`, `Partida`, `DetallePresupuesto`) y rutas REST (catalogos, matrices, presupuestos, IA, precios de mercado, ventas). `backend/services/clarification_service.py` genera preguntas complementarias mediante heurísticas o Google Gemini; `backend/routes/ia.py` publica `/chat_apu`, `/preguntas_clarificadoras`, `/cotizar` y `/explicar_sugerencia`.
- **Frontend**: `frontend/src/App.tsx` sirve las vistas principales: Catálogos, Análisis PU y Comparador. `PresupuestoPage` usa `PresupuestoManager`, `CatalogoPage` controla los CRUD con persistencia local, `AnalisisPuPage` coordina IA y guardado de proyectos, y `ComparadorPage` gestiona importaciones, cotizaciones y guardado directo en el catálogo.

## Flujos clave
1. **Catálogos persistidos**: Catálogo mantiene las tablas (materiales, mano de obra, equipos, maquinaria) en `localStorage` para que altas y bajas sobrevivan al cambio de pestaña. Los formularios muestran registros obsoletos (> PRECIOS_OBSOLETOS_DIAS) y el backend ofrece actualización masiva (`/api/catalogos/actualizar_precios_masivo`).
2. **Análisis PU reforzado**: `AnalisisPuPage` permite solicitar preguntas clarificadoras antes de generar el APU (`/api/ia/preguntas_clarificadoras`), enviar esa información junto con la descripción a `/api/ia/chat_apu`, guardar las filas resultantes y generar notas de venta en PDF. El componente `ConceptoMatrizEditor` centraliza la sincronización con `/api/conceptos/calcular_pu`.
3. **Comparador inteligente**: importa proyectos guardados desde `localStorage`, pide tres cotizaciones IA por material, muestra un botón “Agregar” para cada proveedor y guarda el precio seleccionado en el catálogo; sólo trae insumos sin precio o con más de 5 días sin actualizar para evitar sobrescribir valores recientes.

## Ejecución
- **Backend**: crear `.venv`, instalar `requirements.txt` y ejecutar `python app.py`. Se cargan constantes FASAR y `data.sqlite3`, y el servidor se expone en `http://localhost:8000/api`. Define `GEMINI_API_KEY`, `GEMINI_MODEL` y `PRECIOS_OBSOLETOS_DIAS` en `backend/.env`.
- **Frontend**: ejecutar `npm install` y `npm run dev` en `frontend/`; la SPA inicia en `http://localhost:3000` y usa `VITE_API_BASE_URL` para apuntar al backend.

## Dependencias destacadas
- **Backend**: `flask`, `flask-sqlalchemy`, `flask-cors`, `python-dotenv`, `google-genai`, `reportlab`, `pytest`.
- **Frontend**: `react`, `react-router-dom`, `axios`, `lucide-react`, Vite, TypeScript.

## Datos y pruebas
- `backend/seed_data.py` precarga catálogos, matrices y conceptos de ejemplo al arrancar con `python app.py`.
- `backend/test_app.py` ejecuta pruebas unitarias sobre `calcular_pu` y `match_mano_obra`.

## Riesgos y mejoras
- El backend sigue en un solo módulo (`app.py`); es difícil separar capas y asegurar tests especializados.
- Las configuraciones de CORS, dominios y API base están orientadas a desarrollo local (`http://localhost:3000` y `http://localhost:8000/api`).
- La interfaz todavía depende de `alert`/`console.error`; falta un sistema central de notificaciones.
- Falta cobertura en los endpoints REST y en la lógica de IA/ventas (solo hay pruebas para `calcular_pu`).
- Para evitar divergencias, documenta cada cambio en `progreso.md`, limpia el `localStorage` si cambias la estructura y verifica que `localStorage` no restaure datos obsoletos.
