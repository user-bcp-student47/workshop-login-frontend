# Endpoints consumidos por el frontend

Estado del codigo consultado: 2026-10-19, despues del refactor. Este documento describe el contrato que consume el frontend, no una especificacion verificada de los servidores. Solo se leyeron archivos de `workshop-login-frontend/`; no se modifico codigo ni se llamaron servicios externos durante esta revision.

Las URLs actuales proceden de [src/environments/environment.ts](../src/environments/environment.ts). El frontend local se abre en `http://localhost:4200`. Los ejemplos reproducen valores de pruebas del repositorio: son fixtures verificables, no capturas de respuestas reales. `test-token` es un valor ficticio de prueba, no una credencial utilizable. No hay evidencia local para inventar otros campos o asegurar un codigo HTTP concreto emitido por los servidores.

## Login: POST http://localhost:8080/auth/login

### 1. Quien lo llama

`LoginComponent.login()` valida el formulario y delega en `AuthService.login(username, password, preferences)`. AuthService realiza el POST mediante Axios y, si encuentra token, usa SessionService para guardar usuario/preferencias y mantener el token en memoria antes de devolver exito. El componente se encarga del estado visual y de navegar a `/dashboard`; no llama HTTP ni accede directamente a localStorage.

La construccion de login solicita preferencias a AuthService, que delega su lectura a SessionService. Las preferencias no se envian al backend.

Evidencia: [src/app/login/login.component.ts](../src/app/login/login.component.ts), [src/app/services/auth.service.ts](../src/app/services/auth.service.ts) y [src/app/services/session.service.ts](../src/app/services/session.service.ts).

### 2. Que envia

| Ubicacion | Campo | Valor y regla actual |
|---|---|---|
| URL | Metodo y ruta | POST a la URL base de autenticacion mas `/auth/login`. |
| Query | Ninguna | Esta llamada no agrega parametros de consulta. |
| Header | `Accept` | Por defecto de Axios: `application/json, text/plain, */*`. |
| Header | `Content-Type` | Axios serializa el objeto del request como JSON y establece `application/json`. AuthService no lo fija manualmente. |
| Header | `Authorization` | No se configura para esta llamada; no se envia el token de sesion mediante AuthService.login. |
| Body JSON | `username` | String original del formulario. Se rechaza null, undefined o vacio tras trim; si es valido, se envia sin recortar espacios. |
| Body JSON | `password` | String original del formulario, con la misma validacion y sin recortarlo al enviar. |
| Body JSON | `client` | Constante `angular-workshop`. |
| Opcion local | `timeout` | 5000 ms. Es configuracion de Axios, no un campo HTTP o JSON. |
| Opcion local | `withCredentials` | No se activa en la llamada. No hay autenticacion por cookies configurada expresamente aqui. |

Ejemplo de request reproducido del caso exitoso de [src/app/services/auth.service.spec.ts](../src/app/services/auth.service.spec.ts); los espacios en usuario y contrasena son deliberados:

```http
POST /auth/login HTTP/1.1
Host: localhost:8080
Accept: application/json, text/plain, */*
Content-Type: application/json

{
	"username": " student ",
	"password": " Workshop123! ",
	"client": "angular-workshop"
}
```

Los headers del ejemplo muestran los relevantes para esta llamada, no una captura exhaustiva: el navegador puede agregar headers propios. No se fijan manualmente headers CORS ni Cookie. Los valores por defecto y la serializacion se comprobaron en [node_modules/axios/lib/defaults/index.js](../node_modules/axios/lib/defaults/index.js), de la dependencia instalada; el cuerpo, timeout y ausencia de Authorization explicito se verifican en AuthService y su spec.

### 3. Que espera recibir en exito

**Estado HTTP aceptado:** Axios admite por defecto respuestas finales de 200 a 299. AuthService no exige especificamente 200 ni consulta `response.status`; exige ademas `response.data.token` con valor verdadero. No hay un status de exito fijado en los fixtures. **Pregunta abierta:** que codigo concreto devuelve el backend y si garantiza siempre un cuerpo JSON no vacio.

Se consume directamente el objeto del cuerpo (`response.data`), sin un envoltorio adicional llamado `data` dentro del JSON:

| Campo del cuerpo | Tipo declarado o tratamiento | Uso y obligatoriedad efectiva |
|---|---|---|
| `token` | `string`, null o ausente en LoginResponse | Para continuar debe tener valor verdadero; se espera una cadena no vacia. Solo se comprueba su valor, no formato, firma, expiracion ni tipo en ejecucion. |
| `user` | Objeto SessionUser, null o ausente | Se serializa y guarda sin validarlo. No es obligatorio para que AuthService devuelva true, aunque el dashboard necesita datos utilizables para el flujo esperado. |
| `user.username` | Opcional, `unknown` | El dashboard lo usa para el saludo y para obtener el owner de tareas; aplica conversion a texto al construir la consulta. El modelo no garantiza que sea string. |
| `user.displayName` | Opcional, `unknown` | Primera opcion del saludo; si es falso o ausente se muestra username. No participa en la autenticacion. |
| Otros campos de `user` | Permitidos con valor `unknown` | SessionService conserva el objeto al serializarlo; la vista solo proyecta username y displayName. No se exige ni inventa un campo adicional. |

Ejemplo de cuerpo de respuesta exitoso usado en el spec de AuthService:

```json
{
	"token": "test-token",
	"user": {
		"username": "student",
		"displayName": "Student"
	}
}
```

Antes de navegar, SessionService completa la limpieza del token legacy si quedo pendiente, persiste usuario/preferencias y solo despues asigna el token en memoria:

| Ubicacion | Valor y duracion |
|---|---|
| localStorage: `workshop_user` | `String(JSON.stringify(user))`; conserva la persistencia anterior. |
| localStorage: `workshop_preferences` | Preferencias locales serializadas; no proceden de esta respuesta y siguen persistidas. |
| Campo privado de SessionService | Token recibido, solo en la instancia raiz actual. No se escribe en almacenamiento del navegador. |
| localStorage: `workshop_token` | Clave legacy que se elimina al construir el servicio; su valor nunca se lee como token ni se reutiliza. Si falla el borrado, queda pendiente y se reintenta antes de guardar una sesion nueva. |

Recargar o abrir otra instancia de la aplicacion pierde el token y requiere login de nuevo. Usuario y preferencias persistidos no reconstituyen una sesion autenticada. Si la limpieza legacy sigue fallando, saveSession lanza antes de escribir usuario/preferencias o asignar un token nuevo; no se declara una migracion exitosa ni se recupera el token antiguo. El constructor no lanza ese fallo: mantiene el token vacio y el estado de limpieza pendiente hasta el intento de guardado.

AuthService devuelve true despues del guardado y login solicita navegar a `/dashboard`. Durante la operacion `busy` deshabilita el boton y muestra `Ingresando...`; finally vuelve a habilitarlo. No se consumen headers de respuesta como parte del contrato de autenticacion.

**Preguntas abiertas:** esquema y obligatoriedad reales de user en el backend; formato y vigencia del token; si el servidor devuelve headers o campos adicionales. Las interfaces son tipos de compilacion, no validacion del JSON recibido.

Evidencia: [src/app/models/api.models.ts](../src/app/models/api.models.ts), [src/app/services/auth.service.ts](../src/app/services/auth.service.ts), [src/app/services/auth.service.spec.ts](../src/app/services/auth.service.spec.ts), [src/app/services/session.service.ts](../src/app/services/session.service.ts), [src/app/login/login.component.html](../src/app/login/login.component.html) y los defaults de Axios citados en el punto 2.

### 4. Como reacciona ante errores

| Caso | Reaccion del codigo y de la UI |
|---|---|
| Usuario vacio, null o undefined | No hay POST. Muestra `Ingrese un usuario.` y permanece en login. |
| Contrasena vacia, null o undefined | No hay POST. Muestra `Ingrese una contraseña.` y permanece en login. |
| HTTP final fuera de 2xx, incluidos 401/403 si el servidor los devuelve | Axios rechaza y el componente muestra `No se pudo autenticar. Intente nuevamente.`. No distingue credenciales invalidas, permisos o error de servidor. No navega por esta rama y finally desactiva busy. |
| Timeout de 5000 ms | Misma salida publica de error; se desactiva busy y el usuario puede volver a pulsar el boton. No hay reintento automatico. |
| Red, conexion rechazada, CORS o rechazo del transporte | Misma salida publica de error, sin exponer `message` o detalles del backend. El frontend no configura una solucion CORS. |
| Respuesta resuelta sin cuerpo, null, objeto sin token o token vacio | AuthService devuelve false sin guardar sesion. Login muestra `El backend respondió sin token.`, no navega y finally desactiva busy. Una respuesta vacia, por ejemplo un eventual 204, no basta para autenticar. |
| JSON o forma inesperados sin token utilizable | No existe validador de esquema. Si el resultado no ofrece un token verdadero, se aplica la rama sin token; si Axios u otra operacion lanza, se aplica el error publico. No se garantiza una clasificacion especifica de JSON invalido. |
| Token verdadero pero invalido, expirado o de tipo inesperado | Login no verifica validez ni tipo en ejecucion. Intenta guardarlo y navegar; si guardar no falla, la invalidez puede aparecer despues al consultar tareas. No se asegura que el token sea JWT. |
| Token presente pero user ausente o null | Puede dar exito y navegar: el servicio no valida user. Ausente se guarda como la cadena `undefined`, que falla al parsearse en dashboard; null se guarda como `null`. Consultar el punto 4 de tareas para las consecuencias. |
| Error al guardar en localStorage | Se propaga a login, que muestra el error publico y desactiva busy sin navegar. Las escrituras son secuenciales, sin transaccion ni rollback: puede quedar una sesion parcialmente escrita. |
| Limpieza legacy denegada al guardar sesion | Se reintenta eliminar workshop_token; si falla, login muestra el error publico y sale de busy sin navegar. No se asigna el token recibido ni se leen tokens persistidos como fallback; la copia antigua puede seguir existiendo porque el navegador rechazo eliminarla. |
| Rechazo de la promesa de navegacion | Mismo mensaje publico y busy desactivado; la sesion ya se guardo y no se elimina. Si Router devuelve false sin lanzar, no se crea un mensaje de error adicional. |
| Preferencias ausentes, JSON invalido o lectura de preferencias fallida | Antes del POST, SessionService usa defaults theme light, showTips true y compact false. No impide el formulario ni registra el contenido del error. |

Los errores no borran automaticamente una sesion anterior. AuthService no registra contrasenas ni tokens; el componente no imprime el error crudo. Las condiciones anteriores agrupan las ramas que el codigo maneja, no prometen detectar toda respuesta malformada.

**Pregunta abierta:** codigos y cuerpo reales de errores del backend. La UI no los utiliza para decidir el mensaje, por lo que no se documenta un esquema de error inventado.

Evidencia: [src/app/login/login.component.ts](../src/app/login/login.component.ts), [src/app/utils/api-error.ts](../src/app/utils/api-error.ts), [src/app/services/session.service.ts](../src/app/services/session.service.ts), [src/app/services/auth.service.spec.ts](../src/app/services/auth.service.spec.ts) y [src/app/login/login.component.spec.ts](../src/app/login/login.component.spec.ts).

### 5. Notas de seguridad

- SessionService mantiene el token solo en memoria; no lo escribe en localStorage, sessionStorage, cookies o URLs. Se elimina la clave legacy al iniciar el servicio y nunca se usa como fuente de autenticacion. Si el navegador impide borrarla, el guardado posterior de sesion falla de forma explicita hasta poder limpiarla; no se promete haber eliminado la copia antigua.
- La sesion no sobrevive a una recarga o nueva instancia. Esto reduce la persistencia del token, pero un script ejecutado dentro de la aplicacion aun puede actuar con una sesion activa; no equivale a eliminar todo riesgo XSS ni a revocar el token en el servidor.
- La URL configurada usa HTTP y el laboratorio envia la contrasena en el cuerpo. Es una configuracion local, no una recomendacion de despliegue; no usar secretos reales ni publicar el laboratorio.
- Los errores dinamicos del backend ya no se concatenan al mensaje. El normalizador devuelve textos publicos constantes sin inspeccionar el error recibido.
- El contenedor de mensajes de login usa interpolacion `{{ message }}`, no un enlace innerHTML. Los mensajes de validacion y respuesta sin token son texto plano, sin etiquetas strong; conservan sus palabras, acentos y puntuacion. Un valor con marcado se trata como texto, no como HTML a insertar. No se agregan DomSanitizer, bypassSecurityTrustHtml ni una dependencia para limpiar HTML. Esta es la correccion escrita de H-03; su verificacion posterior y estado se registran en HALLAZGOS.md.
- No hay refresh ni revocacion de token en estos servicios. La vigencia, invalidacion y autorizacion del lado servidor siguen como preguntas abiertas.

Evidencia: [src/app/services/session.service.ts](../src/app/services/session.service.ts), [src/environments/environment.ts](../src/environments/environment.ts), [src/app/utils/api-error.ts](../src/app/utils/api-error.ts) y [src/app/login/login.component.html:39](../src/app/login/login.component.html#L39).

## Tareas: GET http://localhost:8000/api/tasks

### 1. Quien lo llama

`DashboardComponent.ngOnInit()` pide el contexto a `TasksService.getSession()`. Este obtiene primero el token en memoria y despues el usuario persistido mediante SessionService; parsea el usuario antes de comprobar si hay token. El componente proyecta los campos del saludo y, si no hay token y el usuario pudo parsearse, solicita navegar a `/login` sin llamar a la API. Tras recargar no hay token en memoria; los defectos de datos locales indicados en el punto 4 siguen pendientes de H-07.

Con token, dashboard llama a `TasksService.getTasks({ owner }, token)`. TasksService hace GET mediante Axios y devuelve directamente el cuerpo; el componente filtra y formatea para la vista. Ni el servicio HTTP ni SessionService navegan.

Evidencia: [src/app/dashboard/dashboard.component.ts](../src/app/dashboard/dashboard.component.ts), [src/app/services/tasks.service.ts](../src/app/services/tasks.service.ts) y [src/app/services/session.service.ts](../src/app/services/session.service.ts).

### 2. Que envia

| Ubicacion | Campo | Valor y regla actual |
|---|---|---|
| URL | Metodo y ruta | GET a la URL base de tareas mas `/api/tasks`. |
| Query | `owner` | Dashboard calcula `String(user.username || '')`. TasksService concatena literalmente `?owner=` mas ese valor. No usa un constructor de parametros ni encodeURIComponent. |
| Header | `Authorization` | `Bearer ` mas el token en memoria devuelto por SessionService.getToken(); el header se configura expresamente en TasksService y conserva el mismo formato. |
| Header | `Accept` | Por defecto de Axios: `application/json, text/plain, */*`. |
| Header | `Content-Type` | No se fija y no hay cuerpo JSON en este GET. |
| Body | Ninguno | No se manda un objeto de request en el cuerpo; TasksRequest representa la consulta owner. |
| Opcion local | `timeout` | No se configura para esta llamada. El default consultado de Axios es 0: no establece un limite temporal propio. |
| Opcion local | `withCredentials` | No se activa en esta llamada. El mecanismo explicito de autenticacion es Bearer, no cookies configuradas por el servicio. |

Ejemplo de request verificado por [src/app/services/tasks.service.spec.ts](../src/app/services/tasks.service.spec.ts), con usuario student y token ficticio test-token:

```http
GET /api/tasks?owner=student HTTP/1.1
Host: localhost:8000
Accept: application/json, text/plain, */*
Authorization: Bearer test-token
```

La suite tambien verifica owner vacio y el valor `student name&team=local`. Ese ultimo valor se concatena sin codificacion: los delimitadores pueden alterar la interpretacion de la query. No se documenta como una parametrizacion segura. Username ausente o falso produce owner vacio; un username numerico verdadero se convierte a texto. Un usuario null falla antes de hacer GET.

Los headers del ejemplo son los relevantes para la aplicacion, no todos los que puede agregar el navegador. Los defaults se contrastaron en el archivo de Axios citado en el punto 2 de login.

### 3. Que espera recibir en exito

**Estado HTTP aceptado:** respuesta final 200 a 299 por la politica por defecto de Axios. TasksService no comprueba un codigo concreto. **Pregunta abierta:** que codigo exacto garantiza la API; no hay un status fijado en el fixture exitoso. Un eventual 204 no proporciona el arreglo esperado.

Se espera un cuerpo JSON que sea **un arreglo de tareas en la raiz**, no `{ "tasks": [...] }` ni un objeto paginado. TasksService devuelve `response.data` como TasksResponse. Los campos del modelo Task son opcionales en TypeScript; no hay validacion de esquema en ejecucion:

| Campo | Tipo declarado | Uso actual y efecto si falta |
|---|---|---|
| Cuerpo raiz | `Task[]` | Debe poder recorrerse como arreglo de objetos para el flujo esperado. `[]` es una respuesta valida. |
| `[].title` | String opcional | Titulo de la tarjeta por interpolacion; sin valor no hay texto de titulo. |
| `[].description` | String opcional | Descripcion por interpolacion; sin valor no hay texto de descripcion. |
| `[].status` | String, null o ausente | Se excluye solo `ARCHIVED` exacto. Los estados conocidos se traducen; ausente produce etiqueta vacia. Tambien participa en la clase CSS del estado. |
| `[].priority` | String, null o ausente | Comparador de orden y etiqueta en mayusculas; la etiqueta usa NORMAL si el valor es falso o falta. No hay un mapa de orden de prioridad de negocio. |
| `[].owner` | String, null o ausente | Etiqueta en mayusculas; usa SIN-ASIGNAR si es falso o falta. No determina un nuevo filtrado de autorizacion en el navegador. |
| `[].label` | String opcional | Campo local de presentacion: dashboard lo escribe o sobrescribe para cada tarea visible; la API no necesita devolverlo. |

Ejemplo exacto de cuerpo usado como respuesta en el spec de TasksService; description y label no se incluyen porque ese fixture no los devuelve:

```json
[
	{
		"title": "Archived",
		"status": "ARCHIVED",
		"priority": "high",
		"owner": "student"
	},
	{
		"title": "Active",
		"status": "TODO",
		"priority": "low",
		"owner": "student"
	}
]
```

Con ese cuerpo, la UI conserva el arreglo original en tasks, no muestra Archived y muestra Active con etiqueta `LOW · STUDENT` y estado `Por hacer`. Las etiquetas se agregan sobre los mismos objetos; no es una copia profunda de la respuesta.

Las tareas visibles se ordenan con `first.priority > second.priority ? -1 : 1`, sin ponderacion de high/low ni retorno 0 para iguales. El componente traduce TODO a Por hacer, IN_PROGRESS a En progreso, DONE y COMPLETED a Completado y RESUELTO a Resuelto; un estado de texto desconocido se muestra como llego. Las comparaciones de traduccion usan mayusculas; el filtro ARCHIVED es sensible a mayusculas.

Al terminar, `zone.run()` asigna datos, desactiva loading y ejecuta detectChanges. La plantilla muestra tarjetas si no hay error; si no quedan tareas visibles muestra `No hay tareas para mostrar todavía.`. No se procesan headers de paginacion ni campos de un envoltorio.

**Preguntas abiertas:** campos obligatorios reales, catalogos de estados/prioridades, paginacion, tipos garantizados por la API y significado del filtro owner para autorizacion. No se inventan id, fechas, metadatos ni contadores.

Evidencia: [src/app/models/api.models.ts](../src/app/models/api.models.ts), [src/app/services/tasks.service.spec.ts](../src/app/services/tasks.service.spec.ts), [src/app/dashboard/dashboard.component.ts](../src/app/dashboard/dashboard.component.ts), [src/app/dashboard/dashboard.component.html](../src/app/dashboard/dashboard.component.html) y [src/app/utils/legacy-format.ts](../src/app/utils/legacy-format.ts).

### 4. Como reacciona ante errores

En los fallos capturados durante consulta o transformacion, dashboard fija el mensaje **`No se pudo cargar el dashboard. Intente nuevamente.`**, desactiva loading y llama a detectChanges dentro de zone.run. La plantilla muestra el parrafo de error y oculta la seccion de tareas. No reintenta automaticamente ni agrega un boton de reintento; el boton Cerrar sesion permanece en el encabezado.

| Caso | Reaccion concreta |
|---|---|
| Token ausente o cadena vacia y usuario parseable | No hace GET. Solicita navegar a `/login`. No verifica la autenticidad de un token presente. |
| Token invalido/expirado que el servidor rechaza con 401/403 | Mensaje publico de tareas, loading desactivado y tarjetas ocultas. No elimina token/usuario, no refresca token y no redirige automaticamente a login. El usuario puede cerrar sesion. |
| Otro HTTP final fuera de 2xx | Mismo mensaje y estado de error; no utiliza `response.data.detail`, `message` ni codigos para personalizarlo. |
| Rechazo de red, CORS o transporte | Mismo mensaje de error y salida de loading cuando se rechaza la promesa. No hay tratamiento CORS ni reintento especial. |
| API que no responde | No existe timeout propio: loading puede permanecer activo mientras la promesa no termine. Si el navegador/transporte acaba rechazando, entonces muestra el error publico. No se aplica el timeout de 5 s del login. |
| Cuerpo null, undefined u objeto no iterable en lugar del arreglo | El recorrido lanza y se aplica el mensaje publico de tareas. No se convierte en lista vacia automaticamente. |
| Cuerpo igual a cadena vacia | Una cadena es iterable: el recorrido no produce tareas y puede mostrarse el estado vacio aunque el cuerpo no sea un arreglo. Una respuesta sin contenido, como un eventual 204, puede caer aqui si Axios entrega la cadena vacia; el resultado depende del valor entregado al componente, no de una rama especifica para 204. |
| Arreglo con un elemento null u otro valor que cause error durante filtro/etiquetado | El try captura el error y muestra el mensaje publico. No hay validacion previa ni mensaje especifico de tarea invalida. |
| Objeto de tarea con campos ausentes | Puede mostrarse incompleto y con defaults, sin que se detecte un error. Un dato de tipo incorrecto tambien puede fallar al renderizar la plantilla, fuera del try de consulta; no se garantiza que todos los esquemas invalidos terminen en el mensaje publico. |
| Arreglo vacio o todas las tareas ARCHIVED | No es un error: loading termina y se muestra el estado vacio de la plantilla. |
| JSON corrupto en workshop_user o error al leer token/usuario | Falla getSession antes del try de HTTP. ngOnInit rechaza, no hay GET ni mensaje publico asignado por ese catch y loading queda inicialmente true. No hay reparacion de almacenamiento ni redireccion de error garantizada. |
| workshop_user ausente | Se parsea `{}` y, con token, se consulta owner vacio. Sin token se aplica la redireccion a login. |
| workshop_user igual a JSON null, con token | La vista de usuario queda null y acceder a username lanza antes del GET, dentro del try: se asigna el error publico. Ademas el encabezado accede a user sin navegacion segura; puede fallar su renderizado. No se garantiza una pantalla de error completamente renderizada para ese dato local invalido. |
| Usuario parseado escalar o arreglo | Se proyectan campos disponibles; los escalares se vuelven una vista vacia. Sin username utilizable, con token se consulta owner vacio; no se rechaza la sesion por esquema. |
| Error al borrar almacenamiento o rechazo de navegacion en logout | logout no tiene catch propio. La promesa rechaza y no se asigna un mensaje especial a la UI; el borrado puede quedar parcial si falla una operacion. |

Al pulsar Cerrar sesion, SessionService vacia primero el token en memoria, intenta eliminar la clave legacy workshop_token y elimina workshop_user; conserva preferencias y despues el componente navega a `/login`. Si una eliminacion falla, el token en memoria ya esta vacio, pero el metodo propaga y las operaciones restantes pueden quedar incompletas; H-09 sigue pendiente. No hay llamada HTTP de logout, refresh o revocacion. No se sabe si el servidor invalida tokens por otros mecanismos.

**Preguntas abiertas:** codigos/cuerpo reales de errores de la API y politica de expiracion del servidor. No existe una distincion de UI entre esos errores de autenticacion y los demas fallos de tareas.

Evidencia: [src/app/dashboard/dashboard.component.ts](../src/app/dashboard/dashboard.component.ts), [src/app/dashboard/dashboard.component.html](../src/app/dashboard/dashboard.component.html), [src/app/utils/api-error.ts](../src/app/utils/api-error.ts), [src/app/services/session.service.ts](../src/app/services/session.service.ts), [src/app/services/tasks.service.spec.ts](../src/app/services/tasks.service.spec.ts) y [src/app/dashboard/dashboard.component.spec.ts](../src/app/dashboard/dashboard.component.spec.ts).

### 5. Notas de seguridad

- SessionService es el unico propietario del almacenamiento de sesion en este flujo: token solo en memoria, usuario y preferencias en localStorage. El token se envia como Bearer sin cambio de contrato; no se verifica localmente su firma o vigencia. Una recarga no restaura autenticacion desde las claves persistidas.
- La API configurada usa HTTP local, por lo que esta configuracion no protege el token mediante TLS. No publicar el laboratorio ni usar credenciales reales.
- Owner procede del usuario almacenado en el navegador y se concatena sin codificacion. La UI no constituye una barrera de autorizacion. **Pregunta abierta:** si el servidor verifica que el token tiene permiso para consultar el owner recibido; el frontend no permite demostrarlo.
- Titulo, descripcion, etiqueta y error de tareas se muestran por interpolacion de Angular, no mediante innerHTML en dashboard. No se exponen detalles del backend en el mensaje publico.
- Logout borra datos locales, no revoca el token en el servidor. La sesion no se elimina automaticamente ante 401/403 y no hay flujo de refresh implementado en los servicios consultados.

Evidencia: [src/app/services/tasks.service.ts](../src/app/services/tasks.service.ts), [src/app/services/session.service.ts](../src/app/services/session.service.ts), [src/app/dashboard/dashboard.component.html](../src/app/dashboard/dashboard.component.html), [src/app/utils/api-error.ts](../src/app/utils/api-error.ts) y [src/environments/environment.ts](../src/environments/environment.ts).

## Documentos y fuentes consultados

- [README.md](../README.md): ejecucion, servicios locales y credenciales exclusivamente de laboratorio. Sus descripciones de deuda no sustituyen la lectura del codigo actual.
- Version anterior de este documento: referencia legacy reemplazada, no evidencia del comportamiento refactorizado.
- Servicios AuthService, TasksService y SessionService; modelos api.models; environment; componentes y plantillas de login/dashboard; utilidades api-error y legacy-format, enlazados en cada apartado.
- Specs de AuthService y TasksService: origen de los ejemplos exactos de request y response. Los specs de componentes y sesion ya consultados durante el refactor aportan caracterizacion; no se ejecuto una suite nueva para editar este documento.
- [node_modules/axios/lib/defaults/index.js](../node_modules/axios/lib/defaults/index.js): fuente instalada para Accept, serializacion JSON, timeout por defecto y validateStatus. No es una especificacion del backend ni una captura de headers en red.

No se ejecutaron Git, llamadas HTTP ni comandos de terminal en esta revision documental porque el agente no dispone de herramienta de ejecucion. No se leyeron otros componentes del workspace. Las preguntas abiertas requieren confirmacion externa sin ampliar ese alcance; los estados de hallazgos se mantienen exclusivamente en [HALLAZGOS.md](../HALLAZGOS.md).