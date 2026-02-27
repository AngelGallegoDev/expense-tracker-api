# Expense Tracker API (Node + TypeScript)

API REST en **Node.js + Express + TypeScript** con **PostgreSQL (Docker)**, **tests (Jest + Supertest)**, **validación (Zod)**, **auth (bcrypt + JWT + roles)** y **documentación OpenAPI + Swagger UI**.

- Prefijo de versión: `/api/v1`
- Swagger UI: `/docs/`
- OpenAPI spec: `./openapi.yaml`

---

## Stack
- Node.js + Express
- TypeScript
- PostgreSQL (Docker Compose)
- Zod (validación)
- Auth: bcrypt + JWT (Bearer)
- Roles: `user` / `admin` (admin-only endpoints con `requireRole`)
- Testing: Jest + Supertest
- OpenAPI 3.0 + Swagger UI (`/docs/`)

---

## Requisitos
- Node.js (LTS recomendado)
- npm
- Docker Engine / Docker Desktop (para PostgreSQL)

---

## Quickstart

```bash
npm install
docker compose up -d db
npm run db:migrate
npm test
npm run dev
```

- Base URL local: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/docs/`

> Nota: si tu puerto es distinto, usa el que muestre tu consola al arrancar.

---

## Variables de entorno

Este proyecto usa `scripts/ensure-env.mjs` para crear `.env` desde `.env.example` si falta.
Se ejecuta automáticamente en:
- `pretest`
- `predb:migrate`
- `predb:reset`

Aun así, asegúrate de tener (en `.env` o `.env.example`):

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/expense_tracker
JWT_SECRET=change_me_in_dev
```

- `DATABASE_URL`: conexión a Postgres.
- `JWT_SECRET`: secreto para firmar/verificar JWT (necesario para endpoints protegidos).

> Si tu Docker Compose publica Postgres en **5433** (ej. `0.0.0.0:5433->5432`), ajusta `DATABASE_URL` a `localhost:5433` (compruébalo con `docker compose ps`).

---

## DB (PostgreSQL) con Docker

Levantar DB:

```bash
docker compose up -d db
```

### Migraciones (recomendado)
Aplica **todos** los ficheros `sql/*.sql` en orden:

```bash
npm run db:migrate
```

### Reset de DB (solo DEV)
⚠️ Esto **borra y recrea** la base de datos, y luego vuelve a ejecutar migraciones.

```bash
npm run db:reset
```

Alternativa “bruta” borrando volúmenes:

```bash
docker compose down -v
docker compose up -d db
npm run db:migrate
```

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
- **OpenAPI spec**: `./openapi.yaml`

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
  "meta": { "page": 1, "limit": 10, "total": 5 }
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

Códigos usados:
- `VALIDATION_ERROR` (400)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `INTERNAL_ERROR` (500)

---

## Auth (registro, login y endpoints protegidos)

### 1) Registro
**POST** `/api/v1/auth/register`

Body:
```json
{ "email": "user@mail.com", "password": "12345678" }
```

Respuestas:
- `201` → `{ "data": { "id": 1, "email": "user@mail.com", "role": "user", "created_at": "..." } }`
- `400 VALIDATION_ERROR`
- `409 CONFLICT` (email ya usado)

### 2) Login
**POST** `/api/v1/auth/login`

Body:
```json
{ "email": "user@mail.com", "password": "12345678" }
```

Respuesta:
- `200` → `{ "data": { "token": "<JWT>", "user": { "id": 1, "email": "user@mail.com" } } }`
- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED` (credenciales inválidas)

### 3) Usuario actual (protegido)
**GET** `/api/v1/users/me`

Headers:
- `Authorization: Bearer <JWT>`

Respuesta:
- `200` → `{ "data": { "id": 1, "email": "user@mail.com", "created_at": "..." } }`
- `401 UNAUTHORIZED` (token ausente / inválido / expirado)

Ejemplo con curl:
```bash
curl -s -X GET http://localhost:3000/api/v1/users/me   -H "Authorization: Bearer <JWT>"
```

---

## Endpoints

### Health check
**GET** `/api/v1/health`

Respuesta (200):
```json
{ "data": { "status": "ok" } }
```

---

### Users

#### Listado (admin-only)
**GET** `/api/v1/users`

Headers:
- `Authorization: Bearer <JWT>`

Respuestas:
- `200` → `{ "data": [ { "id": 1, "email": "...", "role": "admin", "created_at": "..." }, ... ] }`
- `401 UNAUTHORIZED` (sin token / token inválido)
- `403 FORBIDDEN` (token válido pero rol insuficiente)

Ejemplo con curl:
```bash
curl -s -X GET http://localhost:3000/api/v1/users   -H "Authorization: Bearer <JWT>"
```

---

### Projects

#### Listado (paginado)
**GET** `/api/v1/projects`

Query params:
- `limit` (opcional): entero 1..20 (default 10)
- `page` (opcional): entero >= 1 (default 1)

Respuestas:
- `200` → `{ "data": [...], "meta": { "page", "limit", "total" } }`
- `400 VALIDATION_ERROR`

Ejemplos:
```bash
curl -s "http://localhost:3000/api/v1/projects?page=1&limit=10"
curl -s "http://localhost:3000/api/v1/projects?page=2&limit=5"
```

#### Crear
**POST** `/api/v1/projects`

Body:
```json
{ "name": "Project X", "price_cents": 1234 }
```

Respuestas:
- `201` → `{ "data": { "id": 123, "name": "Project X", "price_cents": 1234, "created_at": "..." } }`
- `400 VALIDATION_ERROR`

#### Obtener por id
**GET** `/api/v1/projects/:id`

Respuestas:
- `200` → `{ "data": { ... } }`
- `400 VALIDATION_ERROR` (id no entero positivo)
- `404 NOT_FOUND` (`Project not found`)

#### Update completo
**PUT** `/api/v1/projects/:id`

Body:
```json
{ "name": "Project X", "price_cents": 1234 }
```

Respuestas:
- `200` → `{ "data": { ... } }`
- `400 VALIDATION_ERROR`
- `404 NOT_FOUND`

#### Borrar
**DELETE** `/api/v1/projects/:id`

Respuestas:
- `204 No Content`
- `400 VALIDATION_ERROR`
- `404 NOT_FOUND`

---

### Expenses

#### Crear (protegido)
**POST** `/api/v1/expenses`

Headers:
- `Authorization: Bearer <JWT>`

Body:
```json
{ "amount_cents": 1234, "description": "Coffee", "occurred_at": "2026-02-23T10:00:00.000Z" }
```

- `occurred_at` es opcional (si no se envía, se usa `NOW()`).
- `user_id` **no** se envía en el body: se toma del token (usuario autenticado).

Respuestas:
- `201` → `{ "data": { "id": 10, "user_id": 1, "amount_cents": 1234, "description": "Coffee", "occurred_at": "...", "created_at": "..." } }`
- `400 VALIDATION_ERROR`
- `401 UNAUTHORIZED`

Ejemplo con curl:
```bash
curl -s -X POST http://localhost:3000/api/v1/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT>" \
  -d '{ "amount_cents": 1234, "description": "Coffee" }'
```


#### Listado (protegido, paginado por usuario)
**GET** `/api/v1/expenses`

Headers:
- `Authorization: Bearer <JWT>`

Query params:
- `limit` (opcional): entero 1..20 (default 10)
- `page` (opcional): entero >= 1 (default 1)

Respuestas:
- `200` → `{ "data": [ ... ], "meta": { "page": 1, "limit": 10, "total": 5 } }`
- `400 VALIDATION_ERROR` (query inválida)
- `401 UNAUTHORIZED`

Ejemplo con curl:
```bash
curl -s "http://localhost:3000/api/v1/expenses?page=1&limit=10" \
  -H "Authorization: Bearer <JWT>"
```


#### Eliminar (protegido, owner-only)
**DELETE** `/api/v1/expenses/:id`

Headers:
- `Authorization: Bearer <JWT>`

Notas:
- Solo puedes borrar **tus** gastos (owner-only).
- Si el gasto no existe **o** no es tuyo → `404 NOT_FOUND` (no se filtra información).

Respuestas:
- `204 No Content`
- `400 VALIDATION_ERROR` (id inválido)
- `401 UNAUTHORIZED`
- `404 NOT_FOUND`

Ejemplo con curl:
```bash
curl -i -X DELETE http://localhost:3000/api/v1/expenses/10 \
  -H "Authorization: Bearer <JWT>"
```

#### Actualizar (protegido, owner-only)
**PATCH** `/api/v1/expenses/:id`

Headers:
- `Authorization: Bearer <JWT>`

Body (parcial, al menos 1 campo):
```json
{ "description": "Coffee beans" }
```

Campos permitidos:
- `amount_cents` (opcional): entero > 0
- `description` (opcional): string no vacío (trim)
- `occurred_at` (opcional): ISO date-time

Notas:
- Solo puedes actualizar **tus** gastos (owner-only).
- Si el gasto no existe **o** no es tuyo → `404 NOT_FOUND` (no se filtra información).
- Si el body está vacío `{}` → `400 VALIDATION_ERROR`.

Respuestas:
- `200` → `{ "data": { ...expense actualizado... } }`
- `400 VALIDATION_ERROR` (id inválido, body vacío o body inválido)
- `401 UNAUTHORIZED`
- `404 NOT_FOUND`

Ejemplo con curl:
```bash
curl -s -X PATCH http://localhost:3000/api/v1/expenses/10   -H "Content-Type: application/json"   -H "Authorization: Bearer <JWT>"   -d '{ "description": "Coffee beans" }'
```




---

## Testing

Tests de integración con **Supertest** cubriendo:
- `/api/v1/health`
- CRUD Projects (GET/POST/GET by id/PUT/DELETE)
- Expenses: `POST /api/v1/expenses` (401/400/201) + `GET /api/v1/expenses` (401 + aislamiento por user_id + meta.total) + `PATCH /api/v1/expenses/:id` (401/400/404/200 owner-only) + `DELETE /api/v1/expenses/:id` (401/400/204/404 owner-only)
- Auth: register/login
- Users: `/api/v1/users/me`
- Users admin-only: `GET /api/v1/users` (401/403/200)
- Swagger UI (`/docs/`)

Ejecutar:
```bash
npm test
```

---

## Roadmap (próximos pasos)
- Expenses: filtros (from/to) + orden configurable
- Mejoras OpenAPI: tags, examples, componentes reutilizables
- Docker para la app + despliegue (Render/Fly.io)
- Observabilidad: requestId + logs consistentes

