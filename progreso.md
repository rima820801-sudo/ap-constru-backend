# Progreso

## ¿En qué consiste el proyecto?
Precios Unitarios es una plataforma full-stack que gestiona catálogos, matrices de análisis de precio unitario (APU) y presupuestos con soporte de IA. El backend (`backend/`) utiliza Flask + SQLAlchemy + Google Gemini para generar sugerencias, preguntas clarificadoras y notas de venta. El frontend (`frontend/`) ofrece las vistas de Catálogos (con persistencia local), Análisis PU (matriz + IA) y Comparador (importación de proyectos guardados, tres cotizaciones IA y guardado automático en catálogo).

## ¿Qué está funcionando actualmente?
- Persistencia local de tablas de catálogo: materiales, mano de obra, equipos y maquinaria se almacenan bajo `localStorage` y sobreviven al cambio de pestaña.
- Guardado y reapertura de proyectos: el frontend mantiene `savedProjects` en `localStorage`, sincroniza con `OpenSavedProjectModal`/`SaveProjectModal` y permite importar solo insumos sin precio actualizado.
- Comparador con recomendación IA: al importar un proyecto se obtienen tres cotizaciones IA por material, se muestra cada opción con botón “Agregar” y el precio elegido se guarda inmediatamente en el catálogo y en la tabla.
- Analisis PU con preguntas: `AnalisisPuPage` solicita preguntas clarificadoras (`/api/ia/preguntas_clarificadoras`) antes de enviar la descripción a `/api/ia/chat_apu`, guarda la matriz y permite generar notas de venta / PDF.
- Backend robusto: `app.py` mantiene las rutas REST, `clarification_service` genera preguntas, y el entorno requiere `GEMINI_API_KEY`/`GEMINI_MODEL`.

## ¿Qué hay disponible pero sin verificar?
- El flujo completo de guardar cotizaciones seleccionadas del Comparador en el catálogo se ha simulado en el frontend; habrá que confirmar que la API de guardado de catálogos recibe los mismos campos y que la fecha de actualización se setea correctamente para no volver a pedir el mismo material.
- La dependencia con Gemini se basa en `google-genai`; si la clave falla, las heurísticas locales se usan como fallback. Necesitamos monitorear si las respuestas heurísticas siguen siendo útiles cuando la clave no está disponible.
- El backend expone archivos de plantilla redundantes (por ejemplo, `nota_venta_template.html` no se usa en el flujo actual); está pendiente decidir si conservarlo o eliminarlo.

## Fallos conocidos
- No hay pruebas automatizadas que cubran Catálogo o Comparador, por lo que los cambios podrían romper la persistencia en `localStorage` sin darse cuenta.
- El backend mantiene toda la lógica en `backend/app.py`, lo que incrementa el tiempo de arranque y dificulta el testing aislado.
- Los modales de guardado/abrir proyecto no tienen debounce ni validaciones extensas, así que un doble click podría crear registros duplicados.

## Cómo mejorar
1. Extraer servicios del backend (`app.py`) en módulos más pequeños y cubrirlos con `pytest`.
2. Añadir tests de integración (con `msw` o un mock de `axios`) para `ComparadorPage` y `AnalisisPuPage`.
3. Implementar un historial de logs o un changelog en `progreso.md` cada vez que se modifica `localStorage` para facilitar auditoría.
4. Centralizar las alertas del frontend (modales/toasts) y documentar cada flujo en este archivo.

## Instrucciones para el control del proyecto
1. **Antes de comenzar**: revisa `progreso.md` y `README.md` para entender el estado actual y anota en este mismo archivo qué vas a cambiar. Añade tu entrada con fecha, tu nombre y la descripción breve del cambio propuesto.
2. **Durante el desarrollo**: mantén un registro de pruebas básicas ejecutadas (`npm run dev`, `python app.py`, `npm run lint`, `python -m pytest`) y documenta errores nuevos (incluyendo `localStorage`).
3. **Al completar**: actualiza `progreso.md` con el resultado final, las dependencias que se instalaron y si hay pasos manuales adicionales (limpiar cache, reiniciar `.venv`, etc.).
4. **Antes del merge**: verifica que la documentación relevante (`README.md`, `PROJECT_SUMMARY.md`, `ARCHITECTURE.md`, `API_REFERENCE.md`, `MODULES.md`) refleja los cambios más recientes.
