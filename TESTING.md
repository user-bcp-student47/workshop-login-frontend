# Guia de testing

Todos los comandos se ejecutan desde `workshop-login-frontend/`. No es necesario leer ni modificar otros componentes del workspace. Esta guia describe como verificar la aplicacion; el seguimiento de hallazgos permanece exclusivamente en [HALLAZGOS.md](HALLAZGOS.md).

## Preparacion

Requisitos: Node.js >=22.12.0 y npm, segun [package.json](package.json). Instalar las versiones fijadas por el lockfile:

```bash
npm ci
```

Si falla la instalacion, resolver el error antes de interpretar resultados de pruebas. No usar `npm audit fix --force` ni aprobar scripts de instalacion automaticamente para evitar un fallo. Las pruebas unitarias no necesitan los backends en ejecucion.

## Comandos

| Objetivo | Comando |
|---|---|
| Todas las suites, una ejecucion | `npm test` |
| Todas las suites con cobertura | `npm run test:coverage` |
| Solo login | `npm test -- src/app/login/login.component.spec.ts` |
| Solo dashboard | `npm test -- src/app/dashboard/dashboard.component.spec.ts` |
| Servicios | `npm test -- src/app/services/auth.service.spec.ts src/app/services/tasks.service.spec.ts src/app/services/session.service.spec.ts` |
| Utilidades | `npm test -- src/app/utils/legacy-format.spec.ts src/app/utils/api-error.spec.ts` |
| Build de produccion | `npm run build` |

`test:coverage` tambien ejecuta las pruebas: no es necesario ejecutar primero toda la suite sin cobertura para repetir exactamente la misma validacion. Ante un fallo, comenzar por la suite afectada y repetir la comprobacion antes de ampliar cambios.

## Configuracion y alcance

[vitest.config.ts](vitest.config.ts) configura Vitest 3.2.4 con entorno `node`, seleccion `src/**/*.spec.ts`, proveedor de cobertura `v8` y reporteros `text`, `json-summary` y `html`.

Los reportes se muestran en terminal y, por defecto de Vitest, se generan en `coverage/`: `coverage-summary.json` e `index.html`. No confundir un reporte antiguo con una nueva ejecucion; registrar comando, fecha y resultado de la corrida correspondiente.

Los specs de componentes prueban las clases con dobles tipados de servicios, Router, NgZone y ChangeDetectorRef, sin renderizar plantillas. Los specs de servicios simulan Axios o almacenamiento, segun su responsabilidad. Se importa el compilador Angular existente donde hace falta para ejecutar las clases en este entorno; no se introduce jsdom ni otra dependencia.

Vitest ejecuta y transforma TypeScript, pero no sustituye una comprobacion completa de tipos de todos los specs. El build de Angular comprueba el empaquetado y compilacion de produccion, no demuestra renderizado en navegador ni conectividad real.

## Organizacion de suites

| Suite existente | Responsabilidad comprobada |
|---|---|
| [src/app/login/login.component.spec.ts](src/app/login/login.component.spec.ts) | Validacion, credenciales originales, espera de autenticacion, preferencias recibidas, navegacion y mensajes publicos. |
| [src/app/dashboard/dashboard.component.spec.ts](src/app/dashboard/dashboard.component.spec.ts) | Contexto de sesion, delegacion de consulta, estados visuales, filtro ARCHIVED, etiquetas, comparador existente, deteccion de cambios y logout delegado. |
| [src/app/services/auth.service.spec.ts](src/app/services/auth.service.spec.ts) | POST de login, cuerpo, cliente, timeout, respuestas sin token, persistencia antes del exito y propagacion de errores. |
| [src/app/services/tasks.service.spec.ts](src/app/services/tasks.service.spec.ts) | Lectura del contexto, GET de tareas, owner sin nueva codificacion, Bearer, respuesta sin transformaciones de vista y errores. |
| [src/app/services/session.service.spec.ts](src/app/services/session.service.spec.ts) | Claves, lectura y serializacion, preferencias, fallos de JSON/almacenamiento, orden de escritura y borrado sin perder preferencias. |
| [src/app/utils/legacy-format.spec.ts](src/app/utils/legacy-format.spec.ts) | Etiquetas, entrada ausente y valores por defecto. |
| [src/app/utils/api-error.spec.ts](src/app/utils/api-error.spec.ts) | Mensajes publicos por operacion sin exponer ni inspeccionar detalles internos del error. |

## Criterio de cobertura

[REGLAS.md](REGLAS.md) exige cobertura >=85% del codigo modificado. Revisar el reporte completo y las piezas modificadas, no solo el porcentaje agregado. No excluir codigo, omitir suites ni reducir gates para alcanzar la meta.

La configuracion actual no declara `coverage.thresholds`: un comando que termina correctamente no certifica por si solo el cumplimiento del 85%. Revisar tambien sentencias, ramas, funciones y lineas reportadas.

[src/app/models/api.models.ts](src/app/models/api.models.ts) solo contiene interfaces y alias de tipos, sin instrucciones ejecutables. Su fila con 0% no equivale a logica sin probar. Arranque, contenedor y rutas no modificados permanecen incluidos en el reporte; no se ocultaron para elevar el resultado.

## Prueba manual del flujo

Consultar [README.md](README.md) para ejecutar el laboratorio y [docs/ENDPOINTS.md](docs/ENDPOINTS.md) para los contratos que deben mantenerse. Coordinar externamente que esten disponibles autenticacion en `http://localhost:8080` y tareas en `http://localhost:8000`, sin ampliar el alcance de este repositorio.

Iniciar el frontend:

```bash
npm start
```

Abrir `http://localhost:4200` y comprobar:

1. Iniciar sesion con una cuenta de laboratorio y verificar la navegacion a dashboard. No usar credenciales reales.
2. Confirmar la carga de tareas y que la vista sale del estado de carga. Distinguir una lista vacia valida de un fallo de consulta.
3. Cerrar sesion y comprobar el regreso a login; token y usuario deben eliminarse, y las preferencias conservarse.
4. Acceder a dashboard sin token y comprobar el retorno a login sin consultar tareas.

Si se revisa la pestaña de red, conservar POST `/auth/login`, su cuerpo y timeout, GET `/api/tasks?owner=...` y Authorization Bearer. No compartir ni guardar tokens, contrasenas o capturas con datos sensibles. El logout es local y no llama un endpoint de revocacion.

Este procedimiento es manual, no una suite E2E automatizada. Los mocks unitarios no lo sustituyen. Registrar solamente lo efectivamente comprobado; no atribuir una inspeccion de red a una simple confirmacion visual.

## Ultima evidencia disponible

Resultados aportados por el usuario el 2026-10-19, no comandos ejecutados por el agente al crear esta guia:

- `npm run test:coverage`: 7 suites y 93 pruebas aprobadas, duracion total de 1,23 s.
- Cobertura global: 88,88% de sentencias/lineas, 97,43% de ramas y 91,66% de funciones. Las piezas ejecutables modificadas tienen 100% en las cuatro metricas.
- Ultimo build de produccion correcto en 3,339 s; despues solo cambiaron pruebas y documentos. Persiste la advertencia CommonJS de `lodash/merge`, sin ocultarla.
- El usuario confirmo en navegador iniciar sesion, ver tareas y cerrar sesion. No se recibio evidencia de una inspeccion de red ni de todas las comprobaciones adicionales sugeridas en esta guia.

La linea base y los resultados detallados estan en [TESTS_ANTES.md](TESTS_ANTES.md) y [TESTS_DESPUES.md](TESTS_DESPUES.md). Son mediciones de conjuntos distintos; no comparar sus tiempos como benchmark ni sumar ejecuciones por etapa como una corrida final. Los estados de remediacion y riesgos residuales se consultan en [HALLAZGOS.md](HALLAZGOS.md).