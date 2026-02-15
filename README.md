# Expense Tracker API (Node + TypeScript)

API REST en **Node.js + Express + TypeScript** con tests (Jest + Supertest).  
Objetivo: construir una base profesional (rutas, validación de inputs, contrato de respuestas y tests) para evolucionar hacia un backend completo con DB y despliegue.

---

## Stack
- Node.js + Express
- TypeScript
- PostgreSQL (Docker)
- Testing: Jest + Supertest
- OpenAPI + Swagger UI (`/docs/`)

---

## Quickstart (desde cero)

```bash
npm install
docker compose up -d
npm test
npm run dev
```

Cuando arranque el servidor, verás en consola el puerto y la URL base.

---

## Requisitos
- Node.js (LTS recomendado)
- npm
- Docker (para PostgreSQL)

---

## Instalación

```bash
npm install
```

---

## DB (PostgreSQL) con Docker

Levanta la base de datos:

```bash
docker compose up -d
```

Parar y borrar volúmenes (reset):

```bash
docker compose down -v
```

---

## Variables de entorno

Crea un `.env` en la raíz:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/expense_tracker
```

> Ajusta usuario/puerto/nombre según tu `docker-compose.yml`.

---

## Ejecutar

### Tests
```bash
npm test
```

### Desarrollo
```bash
npm run dev
```

---

## API Docs (Swagger / OpenAPI)

- **Swagger UI**: `GET /docs/`
  - Ejemplo: `http://localhost:3000/docs/` *(usa el puerto que veas en consola al arrancar)*

- **OpenAPI spec**: `./openapi.yaml`
  - La API está versionada bajo: `/api/v1` (los endpoints “Try it out” deberían apuntar a ese prefijo).

---

## Contrato de respuestas (API Contract)

### Éxito
Las respuestas de éxito devuelven un objeto con `data`.

En endpoints de listado/paginación puede incluirse `meta`:

```json
{
  "data": [
    { "id": 1, "name": "Project A", "price_cents": 1000 }
  ],
  "meta": { "page": 2, "limit": 1, "total": 5 }
}
```

### Error
Los errores devuelven un objeto con `error`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "..."
  }
}
```

Códigos típicos:
- `VALIDATION_ERROR` (400)
- `NOT_FOUND` (404)
- `INTERNAL_ERROR` (500)

---

## Endpoints

### Health check
**GET** `/api/v1/health`

Respuesta esperada (200):
```json
{ "data": { "status": "ok" } }
```

---

### Listado de proyectos
**GET** `/api/v1/projects`

Respuesta (200):
```json
{
  "data": [
    { "id": 1, "name": "Project A", "price_cents": 1000 }
  ],
  "meta": { "page": 1, "limit": 10, "total": 5 }
}
```

#### Query params soportados
- `limit` (opcional): entero entre `1` y `20` (default: `10`)
- `page` (opcional): entero `>= 1` (default: `1`)

Ejemplos:

✅ OK:
- `GET /api/v1/projects?limit=1`
- `GET /api/v1/projects?page=2&limit=1`

❌ Errores (400 + `VALIDATION_ERROR`):
- `GET /api/v1/projects?limit=abc`
- `GET /api/v1/projects?limit=10.5`
- `GET /api/v1/projects?limit=0`
- `GET /api/v1/projects?limit=999`
- `GET /api/v1/projects?page=abc`
- `GET /api/v1/projects?page=0`

---

### Crear proyecto
**POST** `/api/v1/projects`

Body (JSON):
```json
{ "name": "Project X", "price_cents": 1234 }
```

Respuestas:
- `201` → `{ "data": { "id": 123, "name": "Project X", "price_cents": 1234, "created_at": "..." } }`
- `400 VALIDATION_ERROR` → name vacío / price_cents missing o negativo

---

### Obtener proyecto por id
**GET** `/api/v1/projects/:id`

Respuestas:
- `200` → `{ "data": { "id": 1, "name": "...", "price_cents": 1000, "created_at": "..." } }`
- `400 VALIDATION_ERROR` → id inválido (no entero positivo)
- `404 NOT_FOUND` → `Project not found`

---

### Update de proyecto por id
**PUT** `/api/v1/projects/:id`

Body (JSON):
```json
{ "name": "Project X", "price_cents": 1234 }
```

Respuestas:
- `200` → `{ "data": { "id": 123, "name": "Project X", "price_cents": 1234, "created_at": "..." } }`
- `400 VALIDATION_ERROR` → id inválido o body inválido
- `404 NOT_FOUND` → `Project not found`

---

### Borrar proyecto
**DELETE** `/api/v1/projects/:id`

Respuestas:
- `204 No Content` → borrado correcto (sin body)
- `400 VALIDATION_ERROR` → id inválido (no entero positivo)
- `404 NOT_FOUND` → `Project not found`

Ejemplo:
```bash
curl -i -X DELETE http://localhost:3000/api/v1/projects/123
```

---

## Testing

Tests de integración con **Supertest** verificando:
- Health (`/api/v1/health`)
- CRUD Projects (GET/POST/GET by id/PUT/DELETE)
- Validación (400) y not found (404)
- Swagger UI (`/docs/`)

Ejecutar:
```bash
npm test
```

---

## Próximos pasos (roadmap)
- Auth: register/login + `/users/me`
- Entidad principal (expenses/transactions) + relación con projects
- Docker para app + despliegue (Render/Fly.io) + variables prod
- Ampliar OpenAPI (spec completa + ejemplos)
- Observabilidad básica: requestId + logs consistentes
