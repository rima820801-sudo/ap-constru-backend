# Progreso

## ¿En qué consiste el proyecto?

Precios Unitarios es una plataforma full-stack que gestiona catálogos, matrices de análisis de precio unitario (APU) y presupuestos con soporte de IA. El backend (`backend/`) utiliza Flask + SQLAlchemy + Google Gemini para generar sugerencias, preguntas clarificadoras y notas de venta. El frontend (`frontend/`) ofrece las vistas de Catálogos (con persistencia local), Análisis PU (matriz + IA) y Comparador (importación de proyectos guardados, tres cotizaciones IA y guardado automático en catálogo).

## ¿Qué está funcionando actualmente?

- Persistencia local de tablas de catálogo: materiales, mano de obra, equipos y maquinaria se almacenan bajo `localStorage` y sobreviven al cambio de pestaña.
- Guardado y reapertura de proyectos: el frontend mantiene `savedProjects` en `localStorage`, sincroniza con `OpenSavedProjectModal`/`SaveProjectModal` y permite importar solo insumos sin precio actualizado.
- Comparador con recomendación IA: al importar un proyecto se obtienen tres cotizaciones IA por material, se muestra cada opción con botón “Agregar” y el precio elegido se guarda inmediatamente en el catálogo y en la tabla.
- Analisis PU con preguntas: `AnalisisPuPage` solicita preguntas clarificadoras (`/api/ia/preguntas_clarificadoras`) antes de enviar la descripción a `/api/ia/chat_apu`, guarda la matriz y permite generar notas de venta / PDF.
- Backend robusto: `app.py` mantiene las rutas REST, `clarification_service` genera preguntas, y el entorno requiere `GEMINI_API_KEY`/`GEMINI_MODEL`.
- **Mejora reciente**: Nuevo endpoint `/api/ia/cotizar_multiples` que permite cotizar múltiples materiales en una sola solicitud, mejorando significativamente el rendimiento del Comparador.
- **Mejora reciente**: El botón "Actualizar Precios" en Análisis PU ahora está correctamente posicionado para evitar superposición.
- **Mejora reciente**: Funcionalidad de búsqueda automática de precios para todos los materiales importados al Comparador.
- **Mejora reciente**: Filtrado inteligente de insumos para evitar importar mano de obra como materiales en el Comparador.
- **Mejora reciente**: Solución al problema de persistencia de datos después de usar "Borrar todo" en Análisis PU.
- **Mejora reciente**: Persistencia mejorada en Catálogo - la información de Mano de Obra, Equipo y Maquinaria ya no se borra al cambiar de pestaña.
- **Mejora reciente**: Botón "Actualizar Precios" en Análisis PU - permite actualizar todos los precios desde el catálogo con un solo clic.
- **Mejora reciente**: Persistencia en Comparador - la información se mantiene al cambiar de página.
- **Mejora reciente**: Botones "Agregar" en Comparador - permiten guardar materiales con precios elegidos directamente en el catálogo.
- **Mejora reciente**: Integración completa - los materiales guardados desde Comparador están disponibles inmediatamente en Análisis PU.
- **Mejora reciente**: Corrección de parsing de JSON - se resolvió el problema con respuestas de Gemini en formato markdown.
- **Mejora reciente**: Implementación de búsqueda difusa (Fuzzy Matching) para relacionar sugerencias de IA con items del catálogo que tienen nombres similares (e.g., "Block de concreto" vs "Block").
- **Mejora reciente**: Flujo "Cotizar Faltantes": integración directa desde la tabla de Análisis al Comparador, con auto-ejecución inmediata de cotizaciones al llegar a la página.
- **Mejora reciente**: Corrección en persistencia real del Catálogo: ahora los items creados manualmente se guardan en backend (API) y no solo en caché local.
- **Mejora reciente**: Implementación de conversión de unidades comerciales en IA (e.g., de m² a placas/piezas, de kg a bultos).
- **Mejora reciente**: Integración de precios sugeridos por IA para insumos fuera del catálogo, mejorando la estimación inicial.
- **Mejora reciente**: Resolución de errores de sintaxis (etiquetas faltantes) en las páginas de Guía y Novedades.
- **Mejora reciente**: Corrección de parpadeo (flickering) en la tabla de insumos al cambiar tipos manualmente.
- **Mejora reciente**: Solución a la clasificación errónea de "pintura" como mano de obra; ahora se detecta correctamente como material.
- **Mejora reciente**: Mejora de contraste en el modal de feedback y envío de notificaciones en segundo plano (no bloqueante).
- **Mejora reciente**: Estabilización de la exportación a PDF con manejo de errores y validación de campos.
- **Mejora reciente**: Navegación integrada (Navbar) en las páginas de Guía y Novedades.
- **Mejora reciente**: Ajuste en autocompletado de precios: el campo de Flete ya no hereda erróneamente el precio del material.

## ¿Qué hay disponible pero sin verificar?

- El flujo completo de guardar cotizaciones seleccionadas del Comparador en el catálogo ahora está completamente implementado; la API de guardado de catálogos recibe los mismos campos y la fecha de actualización se setea correctamente para evitar duplicados.
- La dependencia con Gemini se basa en `google-genai`; si la clave falla, las heurísticas locales se usan como fallback. Las respuestas heurísticas siguen siendo útiles cuando la clave no está disponible, con precios simulados inteligentes basados en el nombre del material.
- El backend ha sido organizado en módulos (`routes/`, `services/`, `models/`) y ya no mantiene toda la lógica en un solo archivo.
- **NUEVO**: La funcionalidad de parsing de JSON para respuestas de Gemini ha sido mejorada para manejar correctamente formatos markdown y otros formatos especiales.
- **NUEVO**: Sistema de persistencia mejorado que mantiene los datos consistentes entre las diferentes páginas (Catálogo, Análisis PU, Comparador).
- **NUEVO**: Corrección de problemas de sincronización entre el Comparador y Análisis PU.
- **NUEVO**: Implementación de un sistema de notificaciones (Toast) para reemplazar las alertas del navegador y mejorar la experiencia de usuario.
- **NUEVO**: Rediseño de los modales de guardar/abrir proyecto con mejor UI, iconos y feedback visual.

## Fallos conocidos

- No hay pruebas automatizadas que cubran Catálogo o Comparador, por lo que los cambios podrían romper la persistencia en `localStorage` sin darse cuenta.
- El backend mantiene toda la lógica en `backend/app.py`, lo que incrementa el tiempo de arranque y dificulta el testing aislado.
- Los modales de guardado/abrir proyecto no tienen debounce ni validaciones extensas, así que un doble click podría crear registros duplicados.
- Advertencia de SQLAlchemy "LegacyAPIWarning" en el backend pendiente de resolver.

## Cómo mejorar

1. Extraer servicios del backend (`app.py`) en módulos más pequeños y cubrirlos con `pytest`.
2. Añadir tests de integración (con `msw` o un mock de `axios`) para `ComparadorPage` y `AnalisisPuPage`.
3. Implementar un historial de logs o un changelog en `progreso.md` cada vez que se modifica `localStorage` para facilitar auditoría.
4. Centralizar las alertas del frontend (modales/toasts) y documentar cada flujo en este archivo.
5. Eliminar archivos redundantes o sin uso para reducir confusión.
6. **NUEVO**: Agregar pruebas unitarias para la funcionalidad de persistencia y actualización de precios.
7. **NUEVO**: Implementar una mejor gestión de errores para la API de Gemini cuando se excede la cuota.
8. **NUEVO**: Considerar usar un modelo local como Ollama para no depender de cuotas de API externas.
9. **NUEVO**: Agregar validación más robusta para la sincronización entre Comparador y Análisis PU.
10. **COMPLETADO**: Instalar `tailwindcss-animate` para mejorar las animaciones de entrada/salida de los Toasts.

## Instrucciones para el control del proyecto

1. **Antes de comenzar**: revisa `progreso.md` y `README.md` para entender el estado actual y anota en este mismo archivo qué vas a cambiar. Añade tu entrada con fecha, tu nombre y la descripción breve del cambio propuesto.
2. **Durante el desarrollo**: mantén un registro de pruebas básicas ejecutadas (`npm run dev`, `python app.py`, `npm run lint`, `python -m pytest`) y documenta errores nuevos (incluyendo `localStorage`).
3. **Al completar**: actualiza `progreso.md` con el resultado final, las dependencias que se instalaron y si hay pasos manuales adicionales (limpiar cache, reiniciar `.venv`, etc.).
4. **Antes del merge**: verifica que la documentación relevante (`README.md`, `PROJECT_SUMMARY.md`, `ARCHITECTURE.md`, `API_REFERENCE.md`, `MODULES.md`) refleja los cambios más recientes.
