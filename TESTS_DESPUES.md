# Resultados de tests: despues del refactor

Fecha: 2026-10-19. Fuente: salidas de terminal ejecutadas y compartidas por el usuario durante esta sesion, contrastadas con [HALLAZGOS.md](HALLAZGOS.md). Este archivo conserva evidencia; no sustituye el seguimiento de hallazgos ni afirma aceptacion completa del plan.

## Ejecucion completa final

Tras aislar los specs de componentes con dobles tipados de servicios, el usuario ejecuto:

```bash
npm run test:coverage
```

Extracto de la salida real compartida, sin colores ni simbolos de terminal:

```text
RUN v3.2.4
Coverage enabled with v8

src/app/utils/api-error.spec.ts (13 tests) 6ms
src/app/utils/legacy-format.spec.ts (8 tests) 6ms
src/app/services/auth.service.spec.ts (8 tests) 12ms
src/app/services/tasks.service.spec.ts (7 tests) 13ms
src/app/services/session.service.spec.ts (14 tests) 13ms
src/app/dashboard/dashboard.component.spec.ts (25 tests) 24ms
src/app/login/login.component.spec.ts (18 tests) 9ms

Test Files  7 passed (7)
     Tests  93 passed (93)
  Start at  16:26:10
  Duration  1.23s (transform 361ms, setup 0ms, collect 2.84s, tests 83ms, environment 2ms, prepare 1.21s)
```

Esta es una ejecucion conjunta de todas las suites seleccionadas por la configuracion actual de Vitest, no una suma de ejecuciones por etapa. Los componentes usan dobles de servicios; las suites de servicios verifican HTTP y almacenamiento simulados. No hubo cambios de produccion despues del ultimo build aprobado.

### Cobertura final V8

| Archivo o conjunto | Sentencias | Ramas | Funciones | Lineas |
|---|---:|---:|---:|---:|
| Global | 88,88% | 97,43% | 91,66% | 88,88% |
| dashboard.component.ts | 100% | 100% | 100% | 100% |
| login.component.ts | 100% | 100% | 100% | 100% |
| auth.service.ts | 100% | 100% | 100% | 100% |
| session.service.ts | 100% | 100% | 100% | 100% |
| tasks.service.ts | 100% | 100% | 100% | 100% |
| api-error.ts | 100% | 100% | 100% | 100% |
| legacy-format.ts | 100% | 100% | 100% | 100% |
| environment.ts | 100% | 100% | 100% | 100% |

Se supera el requisito >=85% del codigo ejecutable modificado y el 85% global en las cuatro metricas del reporte. api.models.ts aparece con 0% en el reporte, pero solo declara interfaces y alias de tipos: no contiene instrucciones ejecutables. main.ts, app.component.ts y app.routes.ts no se modificaron y conservan 0% de lineas; no se excluyeron para elevar el global.

### Comprobacion manual del flujo

El 2026-10-19 el usuario confirmo haber probado en navegador iniciar sesion, ver tareas y cerrar sesion, con funcionamiento correcto. Es una confirmacion manual aportada por el usuario, distinta de las pruebas simuladas. El agente no ejecuto esa comprobacion ni inspecciono trafico real, capturas o tokens. La resolucion y los riesgos residuales se registran exclusivamente en [HALLAZGOS.md](HALLAZGOS.md).

## Punto validado anterior: historico

Estado conservado por decision del usuario: dependencias Axios 1.20.0 y Lodash 4.18.1, servicios AuthService/TasksService/SessionService, URLs en environment, modelos tipados, validaciones simplificadas y mensajes publicos comunes. Vitest continua en 3.2.4.

La siguiente validacion corresponde al cierre inicial de etapa, anterior a la reanudacion de H-04 y al aislamiento de pruebas. Sus 58 casos son evidencia historica; la ejecucion completa actual de 93 pruebas se conserva al inicio de este documento. El seguimiento permanece en [HALLAZGOS.md](HALLAZGOS.md).

### Comando ejecutado

```bash
npm test -- src/app/utils/api-error.spec.ts src/app/login/login.component.spec.ts src/app/dashboard/dashboard.component.spec.ts
```

### Resultado real aportado

Extracto de la salida compartida, sin colores ni simbolos de terminal:

```text
RUN v3.2.4

src/app/utils/api-error.spec.ts (13 tests) 4ms
src/app/dashboard/dashboard.component.spec.ts (25 tests) 11ms
src/app/login/login.component.spec.ts (20 tests) 10ms

Test Files  3 passed (3)
     Tests  58 passed (58)
  Start at  16:15:53
  Duration  748ms (transform 177ms, setup 0ms, collect 740ms, tests 25ms, environment 0ms, prepare 343ms)
```

| Suite | Pruebas aprobadas | Duracion de tests |
|---|---:|---:|
| Normalizador de errores | 13 | 4 ms |
| DashboardComponent | 25 | 11 ms |
| LoginComponent | 20 | 10 ms |
| Total de esta ejecucion | 58 | 25 ms |

Las 748 ms corresponden a la ejecucion total. Estas 58 pruebas son las seleccionadas por ese comando, no el total ejecutado de todas las suites existentes.

## Build del mismo punto

```bash
npm run build
```

Resultado aportado: generacion correcta del bundle en 3,339 segundos, con tamano inicial de 258,62 kB. Se mantuvo la advertencia CommonJS de `lodash/merge`, ahora importado por SessionService; no se oculto.

## Validaciones posteriores por etapa

Estas ejecuciones corresponden a distintos momentos del refactor. No se suman sus pruebas como si constituyeran una unica ejecucion final.

| Etapa | Seleccion ejecutada | Resultado | Duracion total |
|---|---|---|---:|
| Actualizacion de Axios/Lodash | Login y dashboard, mismas suites de la linea base | 2 suites, 40/40 aprobadas | 681 ms |
| Tras actualizar dependencias, antes de extraer servicios | `npm run test:coverage` | 3 suites, 41/41 aprobadas | 873 ms |
| Caracterizacion adicional antes de H-04 | Utilidad legacy-format, todavia sin cambiar su implementacion | 1 suite, 8/8 aprobadas | 375 ms |
| Extraccion de SessionService | Sesion y login | 2 suites, 34/34 aprobadas | 18,60 s |
| Extraccion de AuthService | Sesion, autenticacion y login | 3 suites, 42/42 aprobadas | 730 ms |
| Extraccion de TasksService y tipado de utilidad | Tareas, dashboard y utilidad | 3 suites, 35/35 aprobadas | 674 ms |
| Mensajes publicos y tipado restante, punto de cierre | Normalizador, dashboard y login | 3 suites, 58/58 aprobadas | 748 ms |
| Reanudacion y aislamiento de pruebas | `npm run test:coverage`, todas las suites | 7 suites, 93/93 aprobadas | 1,23 s |

## Cobertura disponible: medicion intermedia

El reporte intermedio siguiente se obtuvo despues de actualizar dependencias y antes de completar H-04. Se conserva para comparar etapas; la cobertura final esta al inicio del documento.

```bash
npm run test:coverage
```

| Archivo o conjunto | Sentencias | Ramas | Funciones | Lineas |
|---|---:|---:|---:|---:|
| Global de esa ejecucion | 81,7% | 93,75% | 80% | 81,7% |
| dashboard.component.ts | 100% | 100% | 100% | 100% |
| login.component.ts | 100% | 100% | 100% | 100% |
| legacy-format.ts, con su unico test de ese momento | 75% | 83,33% | 100% | 75% |

Las lineas de main.ts, app.component.ts y app.routes.ts tenian 0% de cobertura en ese reporte. La utilidad se amplio posteriormente a ocho pruebas y la medicion final confirma 100% en sus cuatro metricas.

El 81,7% pertenece exclusivamente a esa medicion intermedia. No se excluyeron archivos ni se redujeron gates; la medicion final de 88,88% global de lineas ya supera el requisito.

## Comparacion y limites

- Comparacion directa de H-02: las mismas suites pasaron 40/40 antes y despues de actualizar dependencias. Eso conserva la caracterizacion, pero Axios simulado no prueba su adaptador real.
- La ejecucion completa final tiene 93 pruebas frente a las 40 iniciales seleccionadas, pero no son el mismo conjunto: se agregaron suites de servicios, casos y el normalizador, y las aserciones de mensajes privados cambiaron deliberadamente a mensajes publicos conforme al plan. Login pasa de 20 a 18 casos tras eliminar duplicacion con los servicios y agregar el fallo de navegacion. No se afirma que todo el comportamiento visual de errores sea identico ni que todas las pruebas existieran al inicio.
- Hay ejecucion final conjunta, cobertura final y confirmacion del usuario del flujo funcional en navegador. La ultima verificacion es manual, no una prueba E2E automatizada ni una inspeccion de red realizada por el agente.
- Los tiempos pertenecen a ejecuciones distintas y no constituyen un benchmark de rendimiento.

La linea base anterior a cambios de dependencias y produccion esta en [TESTS_ANTES.md](TESTS_ANTES.md). Los estados y riesgos pendientes permanecen en [HALLAZGOS.md](HALLAZGOS.md).