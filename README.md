# PJ-Soporte — Frontend

Sistema de Soporte e Inventario del Poder Judicial.

## Inicio Rapido con Docker (Recomendado)

Este proyecto esta preparado para levantar **base de datos + backend + frontend** con un solo comando.

### 1) Requisitos

- Docker Desktop instalado y en ejecucion.
- Repositorios clonados en carpetas hermanas (misma carpeta padre):
    - `BackEnd_Campus`
    - `FrontEnd_Campus`

### 2) Ejecutar el stack completo

Desde la carpeta del frontend (`FrontEnd_Campus`):

```bash
docker compose up -d --build
```

### 3) Probar la aplicacion

Abrir en el navegador:

**http://localhost:3000**

Para administrar la base de datos con interfaz web (phpMyAdmin):

**http://localhost:8080**

Credenciales por defecto de este compose:

- Servidor: `db`
- Usuario: `root`
- Contrasena: `root`

Ese es el endpoint principal para validar que todo funciona.

### 4) Ver estado de servicios

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
```

### 5) Detener servicios

```bash
docker compose down
```

Nota: `down` no borra datos de MySQL mientras no se use `-v`.

### 6) Si tu carpeta local del backend tiene otro nombre

El compose soporta override por variable de entorno:

```env
BACKEND_CONTEXT=../pj-soporte
```

Ya existe en `.env` para compatibilidad local.

## Ejecucion Local sin Docker (Opcional)

Usar este modo solo para desarrollo local rapido del frontend.

### Requisitos

- Node.js v22+
- Backend disponible en `http://localhost:8081/api/v1`

### Comandos

```bash
npm install
npm run dev
```

Abrir en: http://localhost:5173

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

En desarrollo, Vite usa proxy para enrutar `/api` hacia backend `http://localhost:8081`.
La URL base de la API se define en `src/api/axiosInstance.js` y por defecto usa ruta relativa:
```
/api/v1
```

Opcionalmente, puedes sobreescribirla con variable de entorno:
```
VITE_API_BASE_URL=http://localhost:8081/api/v1
```

Para EmailJS (notificaciones de tickets), configurar tambien:

```
VITE_EMAILJS_SERVICE_ID=...
VITE_EMAILJS_TEMPLATE_ID=...
VITE_EMAILJS_PUBLIC_KEY=...
```

Para que las notificaciones por correo funcionen en otra PC:

1. Renombrar `.env.example` a `.env`.
2. Completar los valores de `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID` y `VITE_EMAILJS_PUBLIC_KEY`.
3. Levantar nuevamente con `docker compose up -d --build`.
