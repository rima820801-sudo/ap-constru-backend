# Modulos del repositorio

## Backend (`backend/`)
- `app.py`: punto de entrada del backend. Configura Flask, SQLAlchemy, CORS y las variables de entorno, define todos los modelos del dominio y expone las rutas REST (catalogos, conceptos, matrices, proyectos, partidas, detalles, calculos, IA, precios de mercado y notas de venta). Tambien aloja las funciones auxiliares (`decimal_field`, `calcular_precio_unitario`, heuristicas de IA, generacion de PDF).
- `seed_data.py`: se ejecuta dentro del contexto de la app para poblar constantes FASAR, catalogos basicos y un concepto de ejemplo cuando se corre `python app.py`.
- `models.py`: version anterior de los modelos escrita con Django ORM. Hoy no se importa, pero sirve como referencia de los mismos campos y validaciones que deberian migrarse a SQLAlchemy o eliminarse para evitar confusion.
- `test_app.py`: pruebas unitarias con `pytest` que montan la app en modo testing, crean una base SQLite en memoria y validan tanto `calcular_pu` como el helper `match_mano_obra`.
- `nota_venta_template.html`: template statico utilizado en versiones previas de la nota de venta (el flujo actual usa ReportLab).
- `migrations/`: espacio reservado para scripts de Alembic (no se estan generando migraciones automaticas por ahora).
- `requirements.txt`: dependencias del backend (`flask`, `flask-sqlalchemy`, `flask-cors`, `python-dotenv`, `google-genai`, `reportlab`, `pytest`).
- `data.sqlite3`: base de datos local usada en desarrollo. Se crea/llena automaticamente al iniciar la app.
- `services/clarification_service.py`: nuevo servicio que utiliza Google Gemini (cuando hay `GEMINI_API_KEY`) o heuristicas locales para generar preguntas clarificadoras y las comparte con los endpoints `/api/ia/preguntas_clarificadoras` y `/api/ia/chat_apu`.
- `routes/ia.py`: contiene los endpoints de IA (`/chat_apu`, `/preguntas_clarificadoras`, `/cotizar`, `/explicar_sugerencia`) y centraliza la logica de fallback si Gemini no responde.
- `__init__.py`, `.env`, archivos de apoyo (por ejemplo `seed_data.py`) y la carpeta `__pycache__`.

## Frontend (`frontend/`)
- `package.json` / `tsconfig*.json` / `vite.config.ts`: configuracion de build y scripts (`npm run dev`, `npm run build`, `npm run preview`, `npm run dev:backend` para arrancar el backend desde Node) y alias necesarios.
- `src/main.tsx`: arranca React con `BrowserRouter` y aplica los estilos globales de `styles.css`.
- `src/App.tsx`: define la estructura principal (`AppHeader`) y las rutas `/presupuesto`, `/catalogo`, `/analisis-pu` y `/comparador`.
- `src/api/client.ts`: instancia `axios` con `VITE_API_BASE_URL` y cabeceras JSON; amplifica la función `apiFetch` usada por cada página y componente.
- `src/pages/PresupuestoPage.tsx`: mantiene la UI que consume `PresupuestoManager`.
- `src/pages/CatalogoPage.tsx`: reemplaza la versión anterior, persiste cada lista (materiales, mano de obra, equipos, maquinaria) en `localStorage` (`STORAGE_KEYS`) y mantiene coherencia entre altas/bajas sin recargar hacia formulas de `CatalogosDashboard`.
- `src/pages/AnalisisPuPage.tsx`: coordina concepto, factores, preguntas clarificadoras (`/api/ia/preguntas_clarificadoras`), la llamada a `/api/ia/chat_apu`, el guardado de matrices, las notas de venta y los modales `SaveProjectModal`/`OpenSavedProjectModal`.
- `src/pages/ComparadorPage.tsx`: importa proyectos guardados, solicita cotizaciones IA, muestra tres opciones con botones “Agregar”, guarda el proveedor elegido en el catálogo y actualiza la tabla para el cálculo del presupuesto.
- `src/components/catalogos/CatalogoCrud.tsx`: implementación reutilizable que alimenta las vistas de catálogo, permite crear/registar/borrar y resalta los registros obsoletos.
- `src/components/conceptos/ConceptoMatrizEditor.tsx`: administra filas de matriz, sincroniza con `/api/conceptos/calcular_pu`, descarga catálogos en memoria, pide precios de mercado y ofrece modal para registrar nuevos insumos.
- `src/components/conceptos/NotaVentaModal.tsx` y `NotaVentaModalFixed.tsx`: renderizan el resultado de `/api/ventas/crear_nota_venta` y ofrecen un botón para descargar el PDF del backend.
- `src/components/presupuesto/PresupuestoManager.tsx`: controla proyectos/partidas/detalles y genera peticiones a `/api/proyectos` y `/api/detalles-presupuesto`.
- `src/components/layout/AppHeader.tsx`: cabecera común con navegación principal.
- `src/styles.css`: estilos globales para el layout, tarjetas, tablas, campos interactivos y modales.

## Documentos y otros
- Los archivos Markdown (`README.md`, `PROJECT_SUMMARY.md`, `ARCHITECTURE.md`, `API_REFERENCE.md`, `TODOS.md`) concentran la documentacion tecnica y las tareas pendientes.
- El repositorio incluye un entorno virtual (`venv312/`) para ejecutar el backend en Windows, asi como caches de pytest o compilaciones de Vite en `frontend/dist/`.
