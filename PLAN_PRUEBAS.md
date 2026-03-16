# Plan de Pruebas - PJ-Soporte Frontend

## 1. Objetivo

Definir un conjunto de pruebas funcionales esenciales para validar la operatividad del frontend de PJ-Soporte, su integracion con backend y base de datos mediante Docker, y el correcto envio de notificaciones por correo.

## 2. Alcance

Este plan cubre:

- Autenticacion y control de acceso por rol.
- Gestion de tickets (alta, edicion, cierre).
- Visualizacion y filtros de modulos principales.
- Integracion de notificaciones con EmailJS.
- Arranque y disponibilidad de la solucion en entorno Docker.

No cubre pruebas de carga, pentesting ni pruebas automatizadas E2E.

## 3. Entorno de Pruebas

- Frontend: React + Vite + Tailwind.
- Backend: Spring Boot 3 (Java 17).
- Base de datos: MySQL 8.
- Orquestacion: Docker Compose.
- URL de prueba: http://localhost:3000

## 4. Criterios de Entrada y Salida

### Criterios de entrada

- Docker Desktop en ejecucion.
- Variables de entorno configuradas en `.env`.
- Servicios iniciados con `docker compose up -d --build`.

### Criterios de salida

- Casos criticos ejecutados sin errores bloqueantes.
- Flujo de creacion y cierre de ticket validado.
- Correo de notificacion enviado correctamente al tecnico seleccionado.

## 5. Casos de Prueba Funcionales

| ID | Caso | Precondicion | Pasos | Resultado esperado |
|----|------|--------------|-------|--------------------|
| CP-01 | Arranque de stack | Docker instalado | Ejecutar `docker compose up -d --build` | Servicios `db`, `backend`, `frontend` en estado `Up` |
| CP-02 | Acceso a frontend | Stack levantado | Abrir `http://localhost:3000` | Se visualiza pantalla de login/sistema sin error de carga |
| CP-03 | Login valido | Usuario existente | Ingresar credenciales validas | Acceso exitoso y redireccion a modulo autorizado |
| CP-04 | Login invalido | Ninguna | Ingresar credenciales invalidas | Mensaje de error controlado, sin caida de app |
| CP-05 | Permisos por rol | Usuarios de distintos roles | Iniciar sesion con ADMIN/OPERADOR/TECNICO | Menu y modulos visibles segun permisos definidos |
| CP-06 | Alta de ticket | Usuario con permisos, tecnico con email | Crear ticket con datos validos | Ticket creado y mensaje de confirmacion visible |
| CP-07 | Notificacion por mail | Configuracion EmailJS completa | Crear ticket asignando tecnico | Correo recibido por el tecnico seleccionado |
| CP-08 | Fail-safe EmailJS | Variables EmailJS incompletas | Crear ticket | Ticket se crea; app informa que la configuracion de notificaciones no esta completa |
| CP-09 | Cierre de ticket | Ticket existente | Editar ticket y cambiar estado a cerrado con resolucion | Ticket actualizado correctamente, sin errores 422 |
| CP-10 | Filtros de tickets | Tickets cargados | Aplicar filtros por estado/prioridad/busqueda | Tabla actualizada de forma consistente con filtros |
| CP-11 | Navegacion SPA | App en funcionamiento | Recargar una ruta interna (por ejemplo `/tickets`) | La pagina carga sin 404 gracias a configuracion Nginx |
| CP-12 | Persistencia de datos | Datos ya cargados | Reiniciar contenedores con `down` y `up` (sin `-v`) | Datos persistentes en MySQL |

## 6. Riesgos y Controles

- Riesgo: faltan variables EmailJS en entorno nuevo.
- Control: documentacion en README y archivo `.env.example`.
- Riesgo: conflicto de puertos locales.
- Control: ejecucion mediante compose y ajuste de puertos segun entorno.
- Riesgo: diferencias de nombres de carpeta backend.
- Control: variable `BACKEND_CONTEXT` documentada para compatibilidad.

## 7. Resultado Esperado de Aceptacion

Se considera aceptada la entrega cuando:

- El sistema se levanta correctamente con Docker.
- El frontend es accesible en `http://localhost:3000`.
- Los casos funcionales criticos (CP-03, CP-06, CP-07, CP-09) son satisfactorios.
- No se presentan errores bloqueantes en consola ni caidas de aplicacion.
