# PJ-Soporte — Frontend

Sistema de Soporte e Inventario del Poder Judicial.

## Requisitos

- Node.js v22+
- Backend corriendo en `http://localhost:8081/api/v1`

## Instalacion y arranque

```bash
npm install
npm run dev
```

Abrir en el navegador: http://localhost:5173

## Estructura

```
src/
 api/           axiosInstance.js     Axios + interceptor JWT automatico
 context/       AuthContext.jsx      Estado global de autenticacion
 hooks/         useAsync.js          Hook para llamadas async con loading/error
 services/      index.js             Todos los servicios por controlador del backend
 components/    index.jsx            Badge, Modal, Toast, Spinner, ProtectedRoute...
                Sidebar.jsx          Sidebar dinamico segun rol
                Layout.jsx           Layout general + Topbar + Breadcrumb
 pages/         Login.jsx            Pantalla de login con validacion
                Dashboard.jsx        KPIs globales + tickets por juzgado
                Tickets.jsx          CRUD completo + Bitacora + modal de detalle
                Hardware.jsx         CRUD con filtros por estado
                Software.jsx         Registro de licencias con estado calculado
                Contratos.jsx        Cards de contratos con alerta de vencimiento
                Organizacion.jsx     Arbol jerarquico expandible
                Usuarios.jsx         CRUD completo con roles y juzgado asignado
                NotFound.jsx         Pagina 404
```

## Roles y permisos

| Seccion      | ADMINISTRADOR | OPERADOR | TECNICO |
|--------------|:---:|:---:|:---:|
| Tickets      |  RW |  RW |  R  |
| Hardware     |  RW |  RW |  R  |
| Software     |  RW |  RW |  -  |
| Contratos    |  RW |  R  |  -  |
| Organizacion |  R  |  R  |  R  |
| Usuarios     |  RW |  -  |  -  |
| Dashboard    |  R  |  -  |  -  |

R = solo lectura, RW = lectura y escritura, - = sin acceso

## Configuracion

URL base de la API definida en `src/api/axiosInstance.js`:
```
http://localhost:8081/api/v1
```
