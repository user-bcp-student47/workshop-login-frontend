# Pruebas de login y tareas

Fecha: 2026-10-19. Alcance exclusivo: `workshop-login-frontend/`. Esta guia complementa [TESTING.md de la raiz](../TESTING.md) con una matriz contra [ENDPOINTS.md](ENDPOINTS.md). No cambia contratos ni codigo de produccion. Los hallazgos y su seguimiento viven solamente en [HALLAZGOS.md](../HALLAZGOS.md).

## Matriz de casos

Las filas automatizadas se implementan en los specs existentes enlazados despues de la tabla. Los casos nuevos todavia no se han ejecutado. Las filas identificadas como pendientes no son pruebas aprobadas ni requisitos nuevos atribuidos al backend.

| flujo | caso | tipo | resultado esperado |
|---|---|---|---|
| Login | Credenciales validas | Camino feliz | AuthService envia POST, cuerpo original, client y timeout de 5000 ms; guarda sesion antes de devolver true. El componente navega despues del exito y termina busy. |
| Sesion H-01 | Token de una sesion nueva | Caso borde | getToken devuelve el token solo en la misma instancia; no se escribe workshop_token en almacenamiento del navegador. Prueba posterior aun pendiente. |
| Sesion H-01 | Recarga equivalente a nueva instancia y token legacy | Caso borde | No restaura autenticacion, elimina la clave legacy y conserva usuario/preferencias; con usuario parseable, dashboard sin token vuelve a login. |
| Sesion H-01 | Borrado legacy denegado | Error | La construccion no rompe la UI ni restaura el token antiguo; saveSession reintenta la limpieza y lanza si sigue denegada, sin asignar token nuevo. Si el borrado luego funciona, puede guardar la sesion. |
| Tareas | Sesion disponible y arreglo de tareas | Camino feliz | GET con owner y Bearer; la vista conserva tareas, excluye ARCHIVED, agrega etiquetas y termina loading sin error. |
| Login | Usuario null, undefined, vacio o espacios | Caso borde | Sin llamada al servicio; mensaje Ingrese un usuario.; sin navegacion y busy false. |
| Login | Contrasena null, undefined, vacia o espacios | Caso borde | Sin llamada al servicio; mensaje de contrasena requerida y busy false. |
| Login | Datos null, objeto sin token, token vacio/null, cadena o arreglo sin token | Caso borde | AuthService devuelve false sin persistir; el componente muestra El backend respondio sin token. y no navega. |
| Login | Respuesta ausente | Caso borde | Devuelve false y no guarda sesion. No se inventa un codigo HTTP concreto para ese fixture. |
| Login | Preferencias ausentes, invalidas o inaccesibles | Caso borde / Error | SessionService devuelve defaults; no impide mostrar el formulario. Se conservan preferencias parciales y valores falsos/nulos conforme al contrato. |
| Login | Backend caido o rechazo de red | Error | Servicio propaga el rechazo sin guardar ni reintentar; UI muestra No se pudo autenticar. Intente nuevamente., busy false y no navega. |
| Login | Rechazo compatible con CORS | Error | Mismo mensaje publico; no filtra el detalle de transporte. Simulacion de rechazo, no comprobacion de politica CORS en navegador. |
| Login | Timeout ECONNABORTED o ETIMEDOUT | Error | Mismo mensaje publico, una sola llamada y busy false. El spec de servicio comprueba timeout 5000; el rechazo se simula, no se mide el adaptador real. |
| Login | HTTP 401, 403 o 500 | Error | Rechazo propagado; mensaje publico, sin nueva persistencia ni navegacion. No hay diferenciacion de UI por codigo. |
| Login | Escritura de sesion fallida | Error | SessionService lanza, AuthService no informa exito y login sale de busy con mensaje publico. No se afirma rollback atomico. |
| Login | Promesa de navegacion rechazada | Error | Mensaje publico y finally restaura busy; no se presupone borrar la sesion previamente guardada. |
| Login | Token presente pero no valido para el servidor | Error | No se inventa validacion JWT local: el rechazo 401/403 de tareas es el punto probado. Tipos y vigencia reales del token siguen abiertos en ENDPOINTS.md. |
| Login / sesion | Token presente con usuario ausente o null | Error (pendiente H-07) | Reportado aparte: el flujo actual puede guardar datos no utilizables y fallar en dashboard. No se agrega una expectativa verde que considere correcto romper la UI. |
| Tareas | Token null o cadena vacia | Caso borde | Sin consulta; solicita navegar a login. |
| Tareas | Usuario vacio, escalar o arreglo | Caso borde | Se obtiene owner vacio si no hay username; no se inventa una nueva validacion del esquema. |
| Tareas | Username numerico o con espacios/delimitadores | Caso borde | Se conserva la conversion y delegacion de owner del contrato actual. El servicio comprueba la concatenacion existente, no certifica su seguridad. |
| Tareas | Arreglo vacio | Caso borde | Sin error; loading false y visibleTasks vacio. La plantilla utiliza ese estado para mostrar su texto de lista vacia. |
| Tareas | Todas las tareas ARCHIVED | Caso borde | Se conserva el arreglo original, no hay tareas visibles, no hay error y termina loading. |
| Tareas | Campos opcionales ausentes | Caso borde | Defaults NORMAL/SIN-ASIGNAR; no se inventan campos obligatorios de la API. |
| Tareas | Token invalido/expirado rechazado con 401/403 | Error | Mensaje publico de tareas, loading false, sin borrado de sesion ni redireccion automatica. |
| Tareas | HTTP 500/503 | Error | Misma salida de error, sin reintentos ni borrado de sesion. |
| Tareas | Backend caido, red o rechazo compatible con CORS | Error | Servicio propaga; UI muestra No se pudo cargar el dashboard. Intente nuevamente. y termina loading. |
| Tareas | Timeout comunicado por el transporte | Error | Misma salida de error cuando la promesa rechaza; no se agrega un timeout de 5000 ms a este endpoint. |
| Tareas | API que nunca resuelve ni rechaza | Error / pendiente de politica | El contrato actual no fija timeout. No se inventa un limite ni se declara correcto un spinner infinito; una regresion de plazo maximo requiere definir primero la politica. |
| Tareas | Cuerpo null, undefined, objeto o wrapper tasks | Error | Error publico, loading false y sin reportar una carga exitosa. |
| Tareas | Arreglo con elemento null | Error | Error publico durante transformacion y loading false. No se valida el esquema mediante un cast de produccion. |
| Tareas | Cuerpo cadena vacia | Error (pendiente H-08) | Debe distinguirse una respuesta invalida de un arreglo vacio; el codigo actual no lo hace. Regresion pendiente, no expectativa verde adaptada al bug. |
| Tareas | JSON de usuario corrupto, acceso a sesion fallido o usuario null | Error (pendiente H-07) | Debe existir una salida de UI controlada sin desreferenciar null; el codigo actual puede rechazar antes del catch o fallar en plantilla. Correccion pendiente. |
| Tareas | Campos con tipos no previstos al renderizar plantilla | Error / prueba propuesta | Revisar renderizado real; los specs de clases en Node no demuestran seguridad de todas las expresiones de plantilla. No se fija un esquema nuevo sin contrato. |
| Logout | Cierre normal | Camino feliz | SessionService vacia el token en memoria, elimina token legacy/usuario y conserva preferencias; el componente delega borrado antes de navegar y no consulta tareas. |
| Logout | Fallo de borrado o rechazo de navegacion | Error (pendiente H-09) | Debe darse feedback controlado; actualmente logout propaga sin catch propio. Dos regresiones todo, sin cambiar la expectativa para declarar exito. |

## Codigo de las pruebas

Se reutilizan las suites existentes, sin dependencias nuevas. Codigo completo y ejecutable en:

- [src/app/login/login.component.spec.ts](../src/app/login/login.component.spec.ts).
- [src/app/dashboard/dashboard.component.spec.ts](../src/app/dashboard/dashboard.component.spec.ts).
- [src/app/services/auth.service.spec.ts](../src/app/services/auth.service.spec.ts).
- [src/app/services/tasks.service.spec.ts](../src/app/services/tasks.service.spec.ts).
- [src/app/services/session.service.spec.ts](../src/app/services/session.service.spec.ts).

Los siguientes extractos estan dentro de sus describe existentes: authenticate/getTasks son vi.fn tipados de servicio, createComponent inyecta esos dobles y beforeEach restaura el estado de cada caso. No son scripts autonomos ni resultados de ejecucion.

### Login: errores explicitos de UI

Extracto implementado en el spec de login:

```typescript
it.each([
  { name: 'backend unavailable', error: { code: 'ERR_NETWORK', message: 'Network Error' } },
  { name: 'CORS rejection', error: new TypeError('Failed to fetch') },
  { name: 'login timeout', error: { code: 'ECONNABORTED', message: 'timeout of 5000ms exceeded' } },
  { name: 'transport timeout', error: { code: 'ETIMEDOUT', message: 'Request timed out' } },
  { name: 'HTTP 401', error: { response: { status: 401, data: { message: 'Invalid credentials' } } } },
  { name: 'HTTP 403', error: { response: { status: 403, data: { message: 'Forbidden' } } } },
  { name: 'HTTP 500', error: { response: { status: 500, data: { message: 'Internal server detail' } } } },
  { name: 'storage write failure', error: new Error('Storage unavailable') }
])('recovers the form after $name without retrying or navigating', async ({ error }) => {
  const component = createComponent();
  component.username = 'student';
  component.password = 'Workshop123!';
  authenticate.mockRejectedValue(error);

  await component.login();

  expect(component.message).toBe('No se pudo autenticar. Intente nuevamente.');
  expect(component.busy).toBe(false);
  expect(authenticate).toHaveBeenCalledTimes(1);
  expect(navigate).not.toHaveBeenCalled();
  expect(console.error).not.toHaveBeenCalled();
});
```

AuthService.spec complementa estos casos comprobando rechazo por identidad, una sola llamada POST con client y timeout de 5000 ms, y ausencia de saveSession. La simulacion no identifica que un error real proceda de CORS frente a otro fallo de red; ambos llegan como rechazo de transporte.

### Tareas: red y timeout de transporte

Extracto implementado en el spec de dashboard:

```typescript
it.each([
  { name: 'backend unavailable', error: { code: 'ERR_NETWORK', message: 'Network Error' } },
  { name: 'CORS rejection', error: new TypeError('Failed to fetch') },
  { name: 'transport timeout', error: { code: 'ECONNABORTED', message: 'Transport timed out' } },
  { name: 'connection timeout', error: { code: 'ETIMEDOUT', message: 'Connection timed out' } }
])('ends loading after $name without retrying or removing the session', async ({ error }) => {
  const component = createComponent();
  getTasks.mockRejectedValue(error);

  await component.ngOnInit();

  expect(component.error).toBe('No se pudo cargar el dashboard. Intente nuevamente.');
  expect(component.loading).toBe(false);
  expect(getTasks).toHaveBeenCalledTimes(1);
  expect(clearSession).not.toHaveBeenCalled();
  expect(navigate).not.toHaveBeenCalled();
  expect(context.token).toBe('test-token');
  expect(runInZone).toHaveBeenCalledTimes(1);
  expect(detectChanges).toHaveBeenCalledTimes(1);
});
```

El spec de TasksService comprueba tambien rechazo por identidad, GET con Bearer y una sola llamada. No se simula un timeout configurado que no existe: solo la notificacion de error del transporte.

### Tareas: token invalido y errores HTTP

```typescript
it.each([401, 403, 500, 503])('does not clear session or redirect after HTTP %s', async (status) => {
  getTasks.mockRejectedValue({ response: { status, data: { detail: 'Access denied' } } });
  const component = createComponent();

  await component.ngOnInit();

  expect(component.error).toBe('No se pudo cargar el dashboard. Intente nuevamente.');
  expect(clearSession).not.toHaveBeenCalled();
  expect(navigate).not.toHaveBeenCalled();
  expect(component.loading).toBe(false);
});
```

### Tareas: respuesta inesperada

```typescript
it.each([
  { name: 'null body', body: null },
  { name: 'undefined body', body: undefined },
  { name: 'object instead of array', body: {} },
  { name: 'unexpected tasks wrapper', body: { tasks: [] } },
  { name: 'null task', body: [null] }
])('shows a public error for $name instead of reporting successful loading', async ({ body }) => {
  const component = createComponent();
  getTasks.mockResolvedValue(body as unknown as Task[]);

  await component.ngOnInit();

  expect(component.error).toBe('No se pudo cargar el dashboard. Intente nuevamente.');
  expect(component.loading).toBe(false);
  expect(component.visibleTasks).toEqual([]);
  expect(getTasks).toHaveBeenCalledTimes(1);
  expect(detectChanges).toHaveBeenCalledTimes(1);
  expect(clearSession).not.toHaveBeenCalled();
});
```

La conversion via unknown solo inyecta datos deliberadamente invalidos en el doble de prueba. No se utiliza en produccion para ocultar un error de tipos. El caso cadena vacia se excluye de esta expectativa de error automatizada porque revela H-08: se reporta pendiente, no se cambia la asercion a exito.

## Fallos y bugs separados

No hay una ejecucion nueva que permita afirmar fallos de tests observados. Hay tres bugs identificados por lectura del flujo, registrados como H-07/H-08/H-09 en [HALLAZGOS.md](../HALLAZGOS.md). La confirmacion manual anterior del camino feliz no demuestra estos casos adversos.

En el spec de dashboard se dejan estas regresiones explicitamente sin implementar:

```typescript
it.todo('BUG H-07: handle a session read failure with a controlled UI instead of rejecting ngOnInit');
it.todo('BUG H-07: render a controlled state for a null stored user without dereferencing null');
it.todo('BUG H-08: reject an empty-string tasks body instead of treating it as an empty task array');
it.todo('BUG H-09: handle a session-clear failure during logout without an unhandled rejection');
it.todo('BUG H-09: handle rejected logout navigation with a controlled UI');
```

Estos cinco todo son pendientes, no tests ejecutados ni pruebas de correccion. No se usan skip, fails ni cambios de umbral para ocultar bugs. Los casos de caracterizacion anteriores que observan rechazos de sesion o null se conservan como evidencia del comportamiento existente, no como afirmacion de que ese comportamiento sea correcto; no se modificaron para aprobar esta ampliacion.

## Comandos y directorio

Directorio obligatorio para todos los comandos: raiz de `workshop-login-frontend/`, no la carpeta contenedora reqflow-workspace. Requisitos declarados: Node.js >=22.12.0 y npm. Vitest 3.2.4 usa entorno Node y cobertura V8; no requiere backends ni navegador para estas suites. No hay dependencias nuevas ni cambios a configuracion de cobertura.

Comprobacion enfocada:

```bash
npm test -- src/app/login/login.component.spec.ts src/app/dashboard/dashboard.component.spec.ts src/app/services/auth.service.spec.ts src/app/services/tasks.service.spec.ts
```

Suite completa y medicion obligatoria:

```bash
npm run test:coverage
```

Para conservar salida y codigo de salida en Git Bash, ejecutar cada bloque por separado desde ese mismo directorio. Son comandos propuestos para la proxima ejecucion, no comandos ya ejecutados por el agente:

```bash
npm test -- src/app/login/login.component.spec.ts src/app/dashboard/dashboard.component.spec.ts src/app/services/auth.service.spec.ts src/app/services/tasks.service.spec.ts > testing-focused.log 2>&1
printf 'exit_code=%s\n' "$?" > testing-focused.exit.txt
```

Si la comprobacion enfocada no falla, capturar tambien:

```bash
npm run test:coverage > testing-coverage.log 2>&1
printf 'exit_code=%s\n' "$?" > testing-coverage.exit.txt
```

Para revisar solo este repositorio sin modificarlo, usar `git status --short` y `git diff --stat`. El agente no pudo ejecutar Git porque no dispone de herramienta de terminal; no se declara limpio el arbol de trabajo.

Un codigo 0 de Vitest no convierte los todo en aprobados. Revisar por separado fallos, pendientes y cobertura. No reducir gates ni excluir fuentes para alcanzar el >=85% exigido en [REGLAS.md](../REGLAS.md). La configuracion actual no define coverage.thresholds, por lo que el porcentaje debe verificarse expresamente. Los specs no son parte del codigo de produccion instrumentado: no se atribuye cobertura de ejecucion a un todo.

## Resultados realmente ejecutados

H-01 se implementa de forma independiente tras la aprobacion de PLAN.md. La salida previa de su regresion se conserva en [h01-before.log](../h01-before.log) y [h01-before.exit.txt](../h01-before.exit.txt): 6 fallos y 12 aprobadas, 18 pruebas en 562 ms, exit_code=1. Los seis fallos demuestran que la implementacion anterior restauraba/persistia el token y no exigia limpieza legacy; no son errores de una ejecucion posterior.

Se escribio el cambio de SessionService a token en memoria y el editor no reporta errores en el servicio/spec. La prueba posterior fue ejecutada por el usuario: 18/18 aprobadas en 571 ms, exit_code=0; la misma suite tenia seis fallos antes. Tambien se leyeron build y cobertura nuevos: build correcto en 2,899 s y suite completa con 134 aprobadas/5 todo, cobertura global de lineas de 89,62% y SessionService al 100%, ambos con salida 0. La respuesta listo del usuario al pedido conjunto se registra como confirmacion contextual de la secuencia manual, no como inspeccion de red del agente. El primer diff vacio fue reemplazado por [h01-local.diff](../h01-local.diff), una comparacion incremental no-index contra la copia previa: exit_code=1 significa diferencias encontradas. H-01 quedo Resuelto en el registro unico; no se usa su verificacion para cerrar otros items.

| Alcance y origen | Comando | Directorio | Codigo de salida observado | Resultado disponible |
|---|---|---|---|---|
| Linea base anterior, ejecutada por el usuario | `npm run test:coverage` | Raiz workshop-login-frontend/ | No registrado en la salida compartida; no se inventa un 0 | 7 suites y 93 pruebas aprobadas, 1,23 s; 88,88% global de lineas, 97,43% ramas, 91,66% funciones; 100% de las piezas ejecutables modificadas en H-04. |
| Ampliacion actual, diagnostico del editor | Herramienta get_errors, no comando de terminal | Archivos de los cuatro specs modificados | No aplica | Sin errores reportados en login/AuthService/TasksService; persiste el diagnostico anterior del doble parcial NgZone en dashboard, ya existente antes de esta ampliacion. No equivale a ejecutar tests ni a demostrar que el diagnostico este resuelto. |
| Ampliacion actual, suites enfocadas | Comando propuesto arriba | Raiz workshop-login-frontend/ | Pendiente de ejecucion | Sin resultado nuevo disponible. |
| Ampliacion actual, suite y cobertura completas | `npm run test:coverage` | Raiz workshop-login-frontend/ | Pendiente de ejecucion | Cobertura nueva sin medir. No se reutiliza 88,88% como si fuera una corrida actual. |
| H-01, regresion antes de cambiar produccion | `npm test -- src/app/services/session.service.spec.ts` | Raiz workshop-login-frontend/ | 1 | 6 fallidas, 12 aprobadas; 18 pruebas, 562 ms. Evidencia aportada por el usuario y leida por el agente. |
| H-01, despues del cambio de produccion | `npm test -- src/app/services/session.service.spec.ts` | Raiz workshop-login-frontend/ | 0 | 18/18 aprobadas, 571 ms; salida real aportada por el usuario. |
| H-01, build | `npm run build` | Raiz workshop-login-frontend/ | 0 | Build correcto, 2,899 s; advertencia CommonJS de merge conservada. |
| H-01, suite completa con cobertura | `npm run test:coverage` | Raiz workshop-login-frontend/ | 0 | 7 suites, 134 aprobadas y 5 todo, 1,14 s; global de lineas 89,62%, SessionService 100%. |
| H-01, evidencia del diff | `git diff --no-index -- h01-session-before.ts.txt src/app/services/session.service.ts` | Raiz workshop-login-frontend/ | 1, diferencias encontradas | Diff incremental real leido; sustituye el primer diff vacio de archivos sin seguimiento. No se hizo git add ni commit. |

La evidencia historica detallada esta en [TESTS_DESPUES.md](../TESTS_DESPUES.md). El usuario confirmo anteriormente login/tareas/logout en navegador, pero no los errores nuevos de esta matriz. No se ejecutaron llamadas a servicios externos ni se inspecciono trafico durante esta ampliacion.

## Pendientes y pruebas propuestas

- Ejecutar primero la seleccion enfocada y despues toda la suite con cobertura, conservando logs y codigos de salida. Sin esos resultados no se certifica la aceptacion de esta entrega ni una cobertura nueva >=85%.
- Resolver H-07/H-08/H-09 mediante decisiones de correccion independientes antes de convertir sus cinco todo en regresiones ejecutables. No se modifica produccion como parte de esta ampliacion de tests.
- Acordar una politica para API de tareas que nunca responde: el contrato actual no fija un timeout. Un test que exigiese 5000 ms para tareas inventaria comportamiento y no se agrega.
- Propuesta no automatizada: comprobar renderizado real con tipos invalidos, CORS real y los tiempos del adaptador. Las pruebas de clases/mocks no cubren esos limites. No se agregan navegador, jsdom ni paquetes E2E sin justificar.
- Preguntas abiertas del contrato: no afirmar que el token deba ser JWT o que user tenga nuevos campos obligatorios; la prueba de rechazo del token simula el 401/403 del servidor, no su firma o expiracion reales.

## Documentos y fuentes consultados

- [ENDPOINTS.md](ENDPOINTS.md): peticiones, respuestas, errores y limites reales que originan la matriz.
- [REGLAS.md](../REGLAS.md): caracterizacion previa, no ocultar alertas ni reducir gates y cobertura >=85% del codigo modificado.
- [HALLAZGOS.md](../HALLAZGOS.md): estados previos y registro unico de bugs H-07/H-08/H-09.
- [TESTS_DESPUES.md](../TESTS_DESPUES.md): salida historica real, porcentajes y limites de la comprobacion manual anterior.
- [package.json](../package.json) y [vitest.config.ts](../vitest.config.ts): comandos disponibles, versiones, entorno, seleccion y reporteros.
- Componentes LoginComponent/DashboardComponent, sus specs y los specs de AuthService, TasksService y SessionService, enlazados arriba: ramas de UI y cobertura existente antes de agregar los casos.