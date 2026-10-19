# Resultados de tests: antes del refactor

Fecha: 2026-10-19. Fuente: salida de terminal ejecutada y compartida por el usuario durante esta sesion, contrastada con [HALLAZGOS.md](HALLAZGOS.md). Este archivo conserva evidencia; el seguimiento de hallazgos permanece exclusivamente en HALLAZGOS.md.

## Alcance de la linea base

La ejecucion siguiente corresponde al codigo de produccion original, antes de actualizar dependencias (H-02) y antes de extraer servicios o cambiar componentes (H-04). Se habian agregado las pruebas de caracterizacion para fijar ese comportamiento.

Dependencias declaradas en ese momento: Axios 0.31.0, Lodash 4.17.21 y Vitest 3.2.4.

No se dispone de una ejecucion de tests del repositorio original anterior a agregar la caracterizacion. La revision inicial encontro un spec de la utilidad, pero no ejecuto ese estado ni midio su cobertura. Por tanto, no se inventa una cifra de tests o cobertura iniciales.

## Comando ejecutado

```bash
npm test -- src/app/login/login.component.spec.ts src/app/dashboard/dashboard.component.spec.ts
```

## Resultado real aportado

Extracto de la salida compartida, sin colores ni simbolos de terminal:

```text
RUN v3.2.4

src/app/dashboard/dashboard.component.spec.ts (20 tests) 9ms
src/app/login/login.component.spec.ts (20 tests) 10ms

Test Files  2 passed (2)
     Tests  40 passed (40)
  Start at  15:51:15
  Duration  736ms (transform 158ms, setup 0ms, collect 695ms, tests 19ms, environment 0ms, prepare 277ms)
```

| Suite | Pruebas aprobadas | Duracion de tests |
|---|---:|---:|
| LoginComponent | 20 | 10 ms |
| DashboardComponent | 20 | 9 ms |
| Total de esta ejecucion | 40 | 19 ms |

Las 736 ms corresponden a la ejecucion total, no solo al tiempo de los tests.

## Comportamiento caracterizado

- Login: cuerpo y timeout exactos, credenciales sin recortar, estado busy, validacion, respuesta sin token y persistencia previa a navegacion.
- Preferencias: valores por defecto, mezcla con valores falsos/nulos y estructuras anidadas, y continuidad ante JSON invalido.
- Tareas: URL y owner concatenado, Bearer, lectura de sesion, filtro ARCHIVED, etiquetas, orden existente y actualizacion con NgZone/detectChanges.
- Errores: precedencia original de detalles internos del backend o del transporte, antes del cambio deliberado a mensajes publicos.
- Logout: eliminacion de token y usuario antes de navegar, conservando preferencias y sin HTTP.

## Limites

Esta ejecucion selecciono dos suites; no representa toda la suite del proyecto. Axios y localStorage estaban simulados; Lodash/merge no estaba simulado. No demuestra funcionamiento de los servidores, renderizado real ni flujo en navegador. No se recibio un reporte de cobertura ni un build de esta linea base anterior a H-02.

Los resultados posteriores se conservan en [TESTS_DESPUES.md](TESTS_DESPUES.md). No deben atribuirse retroactivamente a este estado inicial.