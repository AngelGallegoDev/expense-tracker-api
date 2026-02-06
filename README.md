
# Expense Tracker API (Node + TypeScript)

API REST en **Node.js + Express + TypeScript** con tests (Jest + Supertest).  
Objetivo: construir una base profesional (rutas, validación de inputs, contrato de respuestas y tests) para evolucionar hacia un backend completo con DB y despliegue.

---

## Stack
- Node.js + Express
- TypeScript
- Testing: Jest + Supertest

---

## Cómo ejecutar el proyecto

### Requisitos
- Node.js (LTS recomendado)
- npm

### Instalación
```bash
npm install
```

### Ejecutar tests

```bash
npm test
```

### Ejecutar en desarrollo

```bash
npm run dev
```

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
  "meta": { "page": 1, "limit": 1, "total": 1 }
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

## Testing

* Tests de integración con **Supertest** verificando:

  * Happy path (`200`)
  * Validación de query (`400`) para casos inválidos (`limit=abc`, `limit=10.5`)

Ejecutar:

```bash
npm test
```

---

## Próximos pasos (roadmap)
* Añadir capa de servicio y acceso a datos
* Integración con PostgreSQL + migraciones
* Docker + CI (GitHub Actions)
* Documentación OpenAPI/Swagger
  
