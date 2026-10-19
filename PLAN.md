# Plan de correccion de todos los items pendientes

Fecha: 2026-10-19. Alcance exclusivo: `workshop-login-frontend/`. Incluye las siete filas con estado Pendiente de [HALLAZGOS.md](HALLAZGOS.md): H-01, H-03, H-05, H-06, H-07, H-08 y H-09. H-02 y H-04 estan Resuelto y no se reabren ni se incorporan a estos alcances. El seguimiento permanece exclusivamente en HALLAZGOS.md.

Se consultaron primero [docs/ENDPOINTS.md](docs/ENDPOINTS.md) y [docs/GOOD_PRACTICES.md](docs/GOOD_PRACTICES.md). Este documento amplia el plan anterior de H-03, sin implementar nada. La aprobacion historica de H-02/H-04 no aprueba esta nueva tanda. Solo se actualiza PLAN.md; no se cambian fuentes, pruebas, configuracion, contratos ni estados.

Reglas comunes: prueba de caracterizacion y regresion antes del cambio de cada item, validacion enfocada despues, build y cobertura >=85% del codigo modificado antes del cierre. Reutilizar specs y dependencias existentes, sin any nuevo, sin ocultar alertas, excluir fuentes o reducir gates. Cambiar un mismo archivo en dos items no autoriza mezclarlos: cada paso debe tener su prueba y diff atribuibles.

Se preservan POST `/auth/login`, su cuerpo y timeout, GET `/api/tasks` con owner/Bearer, respuestas externas y ausencia de endpoint de logout. H-01 pide expresamente corregir la persistencia del token; H-03 cambia la presentacion del mensaje; H-07/H-08/H-09 piden corregir los fallos locales que describen. Esos cambios locales se delimitan en su propio apartado y se reflejaran en ENDPOINTS.md despues de implementarlos; no justifican cambiar contratos HTTP.

Orden orientativo de implementacion: H-01, H-03, H-07, H-08, H-09, H-05 y H-06. El orden puede coordinar dependencias, pero no fusionar alcances. Los avisos residuales de otras dependencias y las sugerencias de review sin fila propia no se convierten en nuevos items dentro de este plan; deben recibir alcance explicito en el backlog antes de su remediacion.

## Item: H-01 - Token de sesion persistido en localStorage

### Identificacion y alcance propio

H-01, Vulnerabilidad, severidad alta, Pendiente. [src/app/services/session.service.ts:14](src/app/services/session.service.ts#L14) recupera workshop_token y [src/app/services/session.service.ts:33](src/app/services/session.service.ts#L33) lo persiste. Un script del mismo origen puede leerlo; no se afirma una XSS demostrada.

### Cambio propuesto

- Mantener el token exclusivamente en un campo privado de la instancia raiz de SessionService. getToken devuelve ese valor y saveSession no lo escribe en localStorage ni sessionStorage, URLs, logs o cookies accesibles a JavaScript.
- Invalidar y eliminar la clave legacy workshop_token al inicializar la sesion, sin recuperar ni reutilizar su contenido. La imposibilidad de eliminar una copia antigua debe notificarse de forma controlada y no darse por migracion completada; nunca volver a usar el token almacenado como fallback. No prometer borrado exitoso si el navegador lo rechaza.
- Conservar interfaces de los servicios, consulta con Bearer, usuario y preferencias en su almacenamiento actual. clearSession borra el token en memoria y limpia la clave legacy si existe; la politica general de fallos de logout pertenece a H-09.
- Cambio funcional explicito de H-01: recargar o abrir otra instancia de la aplicacion requiere login nuevo. No implementar refresh, cookies HttpOnly o revocacion, porque necesitan un contrato/backend ajeno al alcance autorizado.
- Documentar esa duracion de sesion y el riesgo residual: memoria reduce persistencia y exposicion por almacenamiento, pero un script ejecutado dentro de la aplicacion aun puede actuar con la sesion activa.

### Archivos a tocar

Obligatorios: [src/app/services/session.service.spec.ts](src/app/services/session.service.spec.ts), [src/app/services/session.service.ts](src/app/services/session.service.ts), [docs/ENDPOINTS.md](docs/ENDPOINTS.md) y [HALLAZGOS.md](HALLAZGOS.md). En [docs/TESTING.md](docs/TESTING.md), actualizar solo los casos de persistencia/recarga de H-01. No modificar endpoints ni paquetes; AuthService y TasksService conservan su interfaz.

### Prueba previa y cierre

Primero agregar al spec de SessionService pruebas que fallen con el almacenamiento actual: guardar un token y comprobar que no existe en almacenamiento del navegador; leerlo desde la misma instancia; crear otra instancia y comprobar null aunque hubiera una clave legacy; confirmar que un token antiguo no resucita; borrar sesion y conservar preferencias. Simular denegacion al eliminar el token legacy: el error no debe ocultarse ni convertirse en autenticacion exitosa con el valor viejo.

Mantener las pruebas de AuthService de guardado antes del exito y TasksService de Bearer para demostrar que el transporte no cambia. Comprobar manualmente login, consulta, recarga que exige login y logout. Este item no corrige JSON de usuario, respuestas de tareas ni el catch de logout. Cerrar solo con ausencia de persistencia del token y politica de recarga verificada; actualizar la nota local de sesion de ENDPOINTS.md, no el contrato del servidor.

## Item: H-03 - Mensaje renderizado con [innerHTML]

### Identificacion y evidencia

Item H-03, tipo Refactor, severidad media y estado Pendiente en HALLAZGOS.md.

- [src/app/login/login.component.html:39](src/app/login/login.component.html#L39) enlaza message mediante `[innerHTML]`.
- [src/app/login/login.component.ts:29](src/app/login/login.component.ts#L29), [src/app/login/login.component.ts:33](src/app/login/login.component.ts#L33) y [src/app/login/login.component.ts:40](src/app/login/login.component.ts#L40) generan tres mensajes locales con etiquetas strong.
- Los errores del backend ya no se concatenan: se utiliza un mensaje publico constante. No se ha demostrado XSS ni se atribuye un bypass de sanitizacion al enlace actual de Angular.

El problema a resolver es la interpretacion innecesaria de HTML para un mensaje de texto, no introducir otra capa de sanitizacion o validar tokens. [docs/GOOD_PRACTICES.md](docs/GOOD_PRACTICES.md) prefiere interpolacion cuando no se necesita HTML.

### Alcance propio y cambio propuesto

1. Conservar el contenedor `.message` y su condicion `*ngIf="message"`; sustituir el enlace de propiedad innerHTML por interpolacion `{{ message }}`. Angular tratara el valor como texto, no como marcado insertado.
2. Convertir a texto plano los tres mensajes locales de usuario requerido, contrasena requerida y respuesta sin token. Mantener su contenido visible, acentos y puntuacion; quitar solamente las etiquetas strong de sus valores.
3. Conservar message como string y los mensajes publicos actuales de getApiErrorMessage. No agregar DomSanitizer, bypassSecurityTrustHtml, dependencias, nuevos servicios ni una utilidad para limpiar HTML: no hace falta interpretar HTML en este flujo.
4. Mantener validaciones, retornos anticipados, busy/finally, boton deshabilitado, carga de preferencias, delegacion a AuthService y navegacion. No reintroducir HTTP o almacenamiento en el componente.
5. Tras verificar la correccion, actualizar solo la evidencia y el estado de H-03 en HALLAZGOS.md y la descripcion de presentacion/seguridad del login en docs/ENDPOINTS.md. No reescribir ejemplos, peticiones, respuestas ni politica HTTP.

Fuera de alcance: H-01, H-02, H-04 a H-09, bugs de datos locales/tareas/logout, dependencias y auditoria, accesibilidad general, migracion de sesion, esquema del backend y mejoras de ordenacion. No se combinan con H-03 aunque existan pendientes importantes.

### Contrato que se preserva

- POST `/auth/login` con username/password originales, client angular-workshop y timeout de 5000 ms; mismos headers y respuesta esperada.
- Guardado de sesion antes de navegar a dashboard, mismas claves y preferencias. No se cambia la ubicacion del token.
- GET `/api/tasks` con owner y Bearer actuales; mismo comportamiento ante errores, transformaciones y carga.
- Logout local y navegacion actuales, sin endpoints nuevos ni cambio de politica de 401/403.
- Mismos textos visibles de validacion y errores, y mismo momento de aparicion. Se elimina la interpretacion de marcado en login: es el objetivo explicito de H-03, no un cambio de contrato HTTP.

### Archivos que se van a tocar al implementar

| Archivo existente | Cambio limitado a H-03 |
|---|---|
| [src/app/login/login.component.spec.ts](src/app/login/login.component.spec.ts) | Primero ampliar las pruebas existentes con el contrato de plantilla y expectativas de texto plano; conservar los casos de flujo y errores. |
| [src/app/login/login.component.html](src/app/login/login.component.html) | Sustituir innerHTML por interpolacion, sin cambiar el resto del formulario. |
| [src/app/login/login.component.ts](src/app/login/login.component.ts) | Quitar etiquetas strong de los tres mensajes locales, sin cambiar ramas ni llamadas. |
| [docs/ENDPOINTS.md](docs/ENDPOINTS.md) | Describir interpolacion y mensajes de texto actuales despues de la implementacion; ningun cambio de contrato HTTP. |
| [HALLAZGOS.md](HALLAZGOS.md) | Registrar pruebas, evidencia y resolucion de H-03 solo cuando se verifique. No cerrar otros items. |

No se necesitan archivos nuevos, cambios de CSS, paquetes, rutas, servicios HTTP, modelos ni configuracion de Vitest. Los reportes historicos de pruebas no se sobrescriben como si hubiesen verificado una implementacion nueva.

### Prueba a escribir antes de tocar produccion

Reutilizar el spec de login, Vitest y el compilador Angular ya instalado. No agregar DOM simulado ni paquetes para probar una sola sustitucion de enlace.

| Prueba previa | Comprobacion y valor discriminante |
|---|---|
| Contrato de la plantilla real | Leer login.component.html con la API de archivos de Node y analizarlo con parseTemplate de @angular/compiler. Inspeccionar su AST para exigir texto interpolado desde message en el contenedor y ausencia de enlace innerHTML. Debe fallar con la plantilla actual, que contiene ese enlace. No limitarse a probar el valor de component.message o una plantilla inventada en el test. |
| Usuario y contrasena vacios | Escribir las expectativas de los mensajes sin etiquetas, conservando ausencia de llamada a AuthService, ausencia de navegacion y busy false. Deben fallar antes de quitar strong de los valores actuales. |
| Respuesta sin token | Exigir el texto visible original sin etiquetas, sin navegacion y con busy restaurado. Debe distinguir el nuevo formato del valor HTML actual. |
| Error publico y flujo satisfactorio | Mantener pruebas existentes: no exponer detalles del backend, busy false ante rechazo, mismas credenciales y preferencias delegadas y navegacion solo tras exito. Estas deben seguir pasando antes y despues. |

El AST permite una comprobacion enfocada en el entorno Node actual; no se presenta como una prueba de DOM renderizado. La comprobacion visual final debe confirmar que el mensaje aparece, desaparece al limpiarse y nunca muestra literalmente las antiguas etiquetas strong. Si se dispone posteriormente de una infraestructura DOM ya aprobada, puede verificarse que un valor inocuo como `<b>aviso</b>` se muestra como texto sin crear un elemento b, pero no se agrega esa infraestructura como requisito de este item.

Orden de implementacion: ejecutar la suite actual como linea base; escribir y ejecutar las regresiones anteriores para observar el fallo esperado; modificar solamente plantilla y tres cadenas; repetir la misma suite. No adaptar la expectativa al HTML actual para convertir la regresion en verde.

### Riesgos locales y verificacion de cierre

- Cambiar solo la plantilla dejaria etiquetas strong visibles en pantalla: la prueba de texto plano debe impedir ese cambio incompleto.
- Quitar solo etiquetas dejaria activo innerHTML: la prueba del AST debe impedir cerrar el item con esa solucion parcial.
- Al retirar strong se pierde su enfasis tipografico en los mensajes locales. Se conserva el estilo del contenedor `.message`; no se reintroduce HTML en los valores para recuperar negrita ni se amplia el redisenado del formulario.
- Ningun mensaje debe empezar a incluir usuario, contrasena, token o detalles internos. No agregar any ni duplicar normalizacion de errores en el componente.

Desde la raiz de este repositorio, durante la implementacion:

```bash
npm test -- src/app/login/login.component.spec.ts
npm run build
npm run test:coverage
```

Exigir pruebas de regresion aprobadas, build correcto y cobertura >=85% del codigo modificado, como indica [REGLAS.md](REGLAS.md), sin excluir archivos ni bajar gates. La cobertura de clases no sustituye la comprobacion del enlace de la plantilla. Revisar visualmente las validaciones y el error de login, y confirmar el camino feliz sin cambios de peticiones.

Antes de editar produccion, revisar `git status --short` y el diff local con el directorio de trabajo fijado a workshop-login-frontend/. No revertir cambios ajenos, crear ramas ni commits automaticamente. Si no hay herramienta de terminal, solicitar los resultados reales; no inventar salidas, codigos ni porcentajes.

Cierre de H-03: ausencia del enlace innerHTML en login, mensajes locales de texto plano, regresiones y comprobacion visual satisfactorias, contratos HTTP intactos y evidencia registrada. Hasta entonces H-03 conserva Pendiente.

### Limite de este apartado

La prueba de plantilla y la eliminacion de marcado corresponden solo a H-03. No incorporar migracion de sesion, saneamiento de datos de tareas, gates o correcciones de logout en este paso.

## Item: H-05 - Deuda original de tipos, anidamiento y convenciones repetidas

### Identificacion y alcance propio

H-05, Refactor, severidad media, Pendiente. El backlog reconoce que H-04 ya introdujo tipos, retornos anticipados y claves centralizadas. Por tanto, el primer trabajo es verificar el cierre de esa deuda, no inventar un refactor restante ni corregir los bugs H-07/H-08/H-09 bajo otro nombre.

### Cambio propuesto

- Verificar con el inventario/diff real que componentes, servicios, modelos y utilidad modificados no contienen any explicito o accesos a almacenamiento/HTTP fuera de su propietario; comprobar que URLs y claves siguen centralizadas.
- Mantener unknown en datos no validados y pruebas con dobles tipados. No reemplazarlo por un cast optimista ni endurecer el esquema del backend para hacer compilar.
- Si la revision confirma que todo el alcance original ya esta corregido, cerrar H-05 con evidencia y sin tocar produccion. Si queda un bloque concreto repetido o anidamiento que dificulta el flujo, corregir exclusivamente ese bloque con retorno anticipado o una funcion pequena, despues de su prueba. No extraer abstracciones nuevas por estilo.
- No activar strict global o strictTemplates en esta tarea sin un problema concreto del alcance original: puede afectar todo el proyecto. No alterar orden de tareas, mensajes, validacion de datos locales ni contratos HTTP.

### Archivos a tocar

Obligatorios: specs existentes [src/app/login/login.component.spec.ts](src/app/login/login.component.spec.ts) y [src/app/dashboard/dashboard.component.spec.ts](src/app/dashboard/dashboard.component.spec.ts) para reforzar las invariantes que falten, y [HALLAZGOS.md](HALLAZGOS.md) para el cierre verificado. Si las invariantes ya estan cubiertas, reutilizar sus casos sin duplicarlos.

Solo si se identifica deuda concreta: [src/app/login/login.component.ts](src/app/login/login.component.ts), [src/app/dashboard/dashboard.component.ts](src/app/dashboard/dashboard.component.ts), [src/app/models/api.models.ts](src/app/models/api.models.ts), los tres servicios y [src/app/utils/legacy-format.ts](src/app/utils/legacy-format.ts). No se considera obligatorio editar todas esas fuentes.

### Prueba previa y cierre

Antes de una correccion adicional, agregar al spec propietario un caso de la rama o repeticion que se movera. Para las invariantes estructurales puede usarse el parser TypeScript ya instalado sobre las fuentes reales: ausencia de AnyKeyword y ubicacion de llamadas HTTP/almacenamiento, sin buscar coincidencias accidentales dentro de comentarios o cadenas.

Conservar pruebas de validaciones independientes, una llamada al servicio por accion, defaults de utilidad, errores publicos y navegacion. Si esas pruebas y la inspeccion pasan sin cambios de produccion, documentar que la deuda fue subsanada por H-04 y revisada explicitamente ahora. No cerrar otros hallazgos ni contabilizar una regresion de bug como mejora de estilo.

## Item: H-06 - Cobertura inicial limitada y revision explicita de pruebas

### Identificacion y alcance propio

H-06, Sugerencia, severidad media, Pendiente. Ya existe evidencia anterior de cobertura superior al 85% y ejecucion de suites ampliadas; eso no demuestra por si solo integracion del flujo o cierre de los cinco todo. Este item es propietario de la estrategia, integracion y gate, no de arreglar produccion para esos bugs.

### Cambio propuesto

- Completar la matriz de docs/TESTING.md con pruebas automatizadas existentes y pendientes identificados, separando mocks, renderizado, comprobacion manual y resultados de ejecucion.
- Agregar una comprobacion de integracion local de login -> guardar sesion -> cargar tareas -> logout en el spec existente de dashboard. Usar componentes y servicios reales, Axios simulado y almacenamiento en memoria; mantener sus describe de unidad con dobles de servicios separados. No crear una nueva infraestructura E2E ni dependencias.
- Mantener casos de feliz, borde y error por operacion. Convertir los cinco todo en regresiones ejecutables solo en sus items H-07/H-08/H-09; H-06 verifica que dejaron de estar pendientes, no los borra ni usa skip/fails para declarar cumplimiento.
- Declarar en Vitest un umbral global >=85% para lineas, sentencias, funciones y ramas, sin excluir arranque/rutas ni rebajar un gate mas fuerte si se detecta en la configuracion real. Verificar adicionalmente >=85% de las piezas modificadas; no confundir un archivo de interfaces sin instrucciones con logica sin probar.
- Registrar una ejecucion nueva y confirmacion manual del flujo al final. Los 93 y 130 tests de etapas previas siguen siendo evidencia historica, no resultados de una implementacion futura.

### Archivos a tocar

[src/app/dashboard/dashboard.component.spec.ts](src/app/dashboard/dashboard.component.spec.ts), [vitest.config.ts](vitest.config.ts), [docs/TESTING.md](docs/TESTING.md), [TESTING.md](TESTING.md), [TESTS_DESPUES.md](TESTS_DESPUES.md) y [HALLAZGOS.md](HALLAZGOS.md). Otros specs existentes solo si falta una asercion de su responsabilidad; no fuentes de produccion bajo este item. Conservar TESTS_ANTES.md como evidencia de la linea base.

### Prueba previa y cierre

Antes de modificar el gate o su documentacion, escribir y ejecutar el caso de integracion en la suite existente: POST exacto, sesion disponible antes de navegar, GET con owner/Bearer, datos visibles y logout sin HTTP, preservando preferencias. Agregar casos de usuario/contrasena vacios, respuesta sin token y rechazo de tareas si no estan cubiertos por una prueba de flujo equivalente.

Antes de imponer thresholds, capturar el reporte actual sin cambiar exclusiones. Despues validar el gate tanto con la suite normal como con una comprobacion negativa controlada que exija 100% global de lineas: debe fallar mientras las fuentes no cubiertas permanezcan incluidas. Registrar ese fallo como verificacion deliberada del gate, no como fallo normal de la aplicacion.

Para cerrar H-06 exigir matriz satisfecha, toda la suite, cobertura actual >=85%, cinco regresiones ejecutadas tras sus correcciones y confirmacion manual actual de login/tareas/logout. Un exit_code=0 con todo pendientes no basta. No arreglar ni ocultar los bugs en este apartado; si siguen abiertos, H-06 permanece Pendiente en la parte correspondiente.

## Item: H-07 - Fallos de sesion local sin estado controlado

### Identificacion y alcance propio

H-07, Bug, severidad media, Pendiente. [src/app/dashboard/dashboard.component.ts:45](src/app/dashboard/dashboard.component.ts#L45) obtiene sesion fuera del try; [src/app/dashboard/dashboard.component.html:6](src/app/dashboard/dashboard.component.html#L6) accede al usuario sin proteccion. SessionService puede guardar el texto undefined cuando user esta ausente. No pertenece a este item migrar el almacenamiento del token ni validar el arreglo de tareas.

### Cambio propuesto

- Incluir la obtencion de contexto dentro de un limite de error controlado de inicializacion: errores de lectura/parseo deben terminar loading y mostrar el mensaje publico de tareas, sin rechazar ngOnInit ni consultar HTTP con datos inutilizables.
- Mantener un modelo de vista de usuario seguro y proteger el encabezado ante null. Un user JSON null con token debe producir estado de error controlado y cero GET, no un fallback que esconda el dato invalido.
- Para token ausente, hacer que TasksService pueda devolver contexto vacio sin parsear innecesariamente el usuario, y conservar redireccion a login sin consulta. Un fallo al leer el token tambien debe entrar al manejo publico, no inferirse como sesion valida.
- Al serializar usuario ausente en saveSession, usar un objeto vacio parseable en lugar del literal undefined. No exigir un campo nuevo en la respuesta de login ni validar firma del token. Usuario vacio y campos opcionales validos siguen permitidos; no convertirlos en errores inventados del backend.
- No borrar automaticamente sesion ni cambiar la politica de 401/403 como efecto de este item. Explicar en ENDPOINTS.md el cambio de manejo local del defecto que H-07 pide corregir, conservando peticiones y respuestas externas.

### Archivos a tocar

[src/app/dashboard/dashboard.component.spec.ts](src/app/dashboard/dashboard.component.spec.ts), [src/app/services/session.service.spec.ts](src/app/services/session.service.spec.ts) y [src/app/services/tasks.service.spec.ts](src/app/services/tasks.service.spec.ts) primero. Produccion: [src/app/dashboard/dashboard.component.ts](src/app/dashboard/dashboard.component.ts), [src/app/dashboard/dashboard.component.html](src/app/dashboard/dashboard.component.html), [src/app/services/session.service.ts](src/app/services/session.service.ts) y [src/app/services/tasks.service.ts](src/app/services/tasks.service.ts). Actualizar solo los casos H-07 en [docs/ENDPOINTS.md](docs/ENDPOINTS.md), [docs/TESTING.md](docs/TESTING.md) y [HALLAZGOS.md](HALLAZGOS.md).

### Prueba previa y cierre

Convertir los dos todo H-07 en tests ejecutables antes de tocar produccion: getSession lanza SyntaxError o error de almacenamiento y ngOnInit debe resolver con loading false, error publico, usuario de vista seguro y cero GET; contexto con user null no debe acceder a sus propiedades ni iniciar GET.

Agregar en SessionService el caso user undefined que produzca JSON parseable; en TasksService, token ausente con user corrupto no debe requerir parsearlo para redirigir. Mantener las pruebas de usuario vacio/numerico, caso feliz y 401/403. Reemplazar las antiguas expectativas de caracterizacion del fallo por la regresion explicita aprobada, no por tolerar un rechazo no controlado. Comprobar la plantilla real con el compilador Angular y verificar visualmente el encabezado en estado de error: pruebas de clase no demuestran renderizado DOM.

Cierre: ambos todo convertidos y aprobados, sin rechazo de inicializacion o renderizado por los casos del item, sin peticiones nuevas ni cambios de esquema externo.

## Item: H-08 - Respuesta de tareas invalida aceptada como lista vacia

### Identificacion y alcance propio

H-08, Bug, severidad media, Pendiente. [src/app/services/tasks.service.ts:19](src/app/services/tasks.service.ts#L19) confia en el generico de Axios y el componente recorre el cuerpo sin validar que sea Task[]. Una cadena vacia produce exito vacio aunque no cumple el cuerpo documentado.

### Cambio propuesto

- Solicitar el cuerpo como unknown en TasksService y comprobar en ejecucion que es un arreglo de objetos no nulos ni arreglos, usando Array.isArray y un guard tipado local. Rechazar cadenas, null, wrappers y elementos no compatibles antes de devolver datos al componente.
- Para campos consumidos, respetar los tipos y opcionalidad ya declarados en Task; no inventar id, fechas, prioridad obligatoria o un catalogo cerrado de estados. Si se valida el tipo de status/titulo/descripcion/prioridad/owner, permitir los ausentes y null que admite el modelo. No usar un cast Task[] como sustituto de validacion.
- Lanzar un error de respuesta invalida que dashboard presente con su mensaje publico existente, loading false y sin tarjetas de falso exito. No exponer el cuerpo ni detalles internos y no cambiar el mensaje de la lista [] valida.
- Mantener orden, filtrado ARCHIVED, etiquetas, owner/Bearer, timeout y ausencia de reintentos. Una respuesta sin contenido solo es lista valida si el cuerpo consumido es realmente []; no cambiar el status HTTP del backend.

### Archivos a tocar

[src/app/services/tasks.service.spec.ts](src/app/services/tasks.service.spec.ts) y [src/app/dashboard/dashboard.component.spec.ts](src/app/dashboard/dashboard.component.spec.ts) primero; [src/app/services/tasks.service.ts](src/app/services/tasks.service.ts) para el guard y rechazo. El modelo [src/app/models/api.models.ts](src/app/models/api.models.ts) se usa como referencia, no se preve cambiarlo. Actualizar la reaccion local H-08 en [docs/ENDPOINTS.md](docs/ENDPOINTS.md), [docs/TESTING.md](docs/TESTING.md) y [HALLAZGOS.md](HALLAZGOS.md).

### Prueba previa y cierre

Convertir el todo H-08 y agregar tests del servicio: cuerpo cadena vacia debe rechazar; [] debe resolver como lista vacia; null, undefined, objeto, wrapper, [null], arreglos anidados y campos consumidos de tipos incompatibles deben rechazar sin devolver exito. Un arreglo de objetos con campos opcionales ausentes y estados desconocidos de texto sigue siendo valido.

Comprobar en dashboard que el rechazo del servicio produce el mensaje publico y termina loading, manteniendo sesion y sin redireccion automatica. El nuevo test debe fallar antes de agregar validacion: no cambiarlo para esperar la lista vacia defectuosa. Cerrar con el todo reemplazado y guard probado sin modificar endpoints o politicas ajenas.

## Item: H-09 - Logout sin feedback ante borrado o navegacion fallidos

### Identificacion y alcance propio

H-09, Bug, severidad baja, Pendiente. [src/app/dashboard/dashboard.component.ts:81](src/app/dashboard/dashboard.component.ts#L81) llama clearSession y navigate sin manejo de rechazo. Este item trata terminacion y feedback de logout, no migracion de almacenamiento ni errores de carga de tareas.

### Cambio propuesto

- Controlar las excepciones del borrado y la navegacion en logout. Mostrar un mensaje publico de cierre no completado, sin rechazos no manejados ni detalles internos. Reutilizar el normalizador de errores agregando una operacion logout y su prueba, en vez de duplicar mensajes por componente.
- Intentar limpiar todas las claves de sesion aunque una eliminacion falle, conservar preferencias y reportar cualquier fallo. No presentar la operacion como atomica ni reponer un token ya eliminado. Si H-01 ya esta aplicado, borrar el token de memoria independientemente del resultado de limpieza legacy; sin cambiar en este apartado donde vive el token.
- Navegar a login solo tras limpieza satisfactoria. Si navigate rechaza o devuelve false, mostrar feedback publico; no restaurar la sesion ni anunciar exito. No introducir peticion HTTP de logout, revocacion o refresh.
- Mostrar el mensaje en el estado de error ya disponible y actualizar la vista con el mecanismo Angular existente. No agregar una refactorizacion general de dashboard o cambios de autenticacion por 401/403.

### Archivos a tocar

Primero [src/app/dashboard/dashboard.component.spec.ts](src/app/dashboard/dashboard.component.spec.ts), [src/app/services/session.service.spec.ts](src/app/services/session.service.spec.ts) y [src/app/utils/api-error.spec.ts](src/app/utils/api-error.spec.ts). Despues [src/app/dashboard/dashboard.component.ts](src/app/dashboard/dashboard.component.ts), [src/app/services/session.service.ts](src/app/services/session.service.ts) y [src/app/utils/api-error.ts](src/app/utils/api-error.ts). Actualizar solo el comportamiento de error de logout en [docs/ENDPOINTS.md](docs/ENDPOINTS.md), [docs/TESTING.md](docs/TESTING.md) y [HALLAZGOS.md](HALLAZGOS.md). No se preve cambiar la plantilla porque ya muestra error.

### Prueba previa y cierre

Convertir los dos todo H-09 antes de modificar produccion: clearSession lanza y logout debe resolver con mensaje publico sin navegar; navigate rechaza y logout debe resolver con mensaje publico tras haber delegado la limpieza. Agregar navigate=false para evitar falso exito.

En SessionService, simular fallo al eliminar la primera clave y comprobar que se intenta la siguiente, se conservan preferencias y se informa la limpieza incompleta. En api-error, comprobar mensaje de logout sin inspeccionar ni concatenar detalles del error. Mantener caso feliz con borrado antes de navegacion y cero HTTP. No reintentar automaticamente ni marcar cerrado por el simple hecho de que una promesa haya sido capturada: verificar el feedback visible y las claves restantes.

Cierre: ambos todo reemplazados, regresiones aprobadas y comprobacion manual de cierre normal y fallido; mismo contrato de logout exclusivamente local.

### Verificacion comun y documentos consultados

Durante la implementacion futura, ejecutar desde la raiz del componente la suite del item, luego `npm run build` y `npm run test:coverage`; guardar logs, directorio y codigo de salida reales. Para H-06 comprobar tambien su gate negativo controlado. Leer Git solo dentro de este repositorio y no revertir cambios ajenos; no crear commits ni ramas sin solicitud.

Se consultaron docs/ENDPOINTS.md, docs/GOOD_PRACTICES.md, HALLAZGOS.md, el PLAN.md anterior y REGLAS.md; despues SessionService, AuthService, TasksService, DashboardComponent, api.models, los casos pendientes del spec de dashboard, vitest.config.ts y el artefacto existente testing-coverage.exit.txt. Los resultados anteriores no certifican ninguno de estos cambios propuestos.

Solo se actualiza PLAN.md. No se ejecutaron Git, pruebas ni build en esta entrega por falta de herramienta de terminal; no se inventan resultados ni se registra una aprobacion humana de implementacion. Todos los estados de hallazgos permanecen intactos.