# Red de Clínicas Veterinarias

Grupo 1 · Laboratorio 1 · Taller de Base de Datos 2-2026.

Sistema para una red de clínicas veterinarias con varias sedes: tutores, mascotas, veterinarios, citas (en sede o a
domicilio), fichas clínicas, vacunas e inventario de farmacia.

## Tecnologías y arquitectura

```text
Frontend   React 19 + Vite 7                         http://localhost:5173
   ↓ HTTP + JSON + token JWT
Backend    Node.js 20 + Express 5 (API REST)         http://localhost:3000/api
   ↓ SQL con el driver pg (sin ORM)
Base       PostgreSQL 15 (procedimientos, triggers, índices y vista materializada)
```

El backend está ordenado en capas: `routes → controllers → services → repositories`. Docker Compose levanta las tres
partes con un solo comando.

## Cómo levantarlo desde cero

Solo necesitas **Docker Desktop** instalado y abierto.

1. Descarga el proyecto y entra a la carpeta:

   ```bash
   git clone https://github.com/jjmca91000/LAB1BD_2_2026.git
   cd LAB1BD_2_2026
   ```

2. Crea el archivo de configuración copiando el de ejemplo:

   ```bash
   cp backend/.env.example backend/.env
   ```

   (En la consola de Windows: `copy backend\.env.example backend\.env`).

3. Abre `backend/.env` y, si quieres, cambia la **cuenta de administrador** (`ADMIN_NOMBRE`, `ADMIN_CORREO`,
   `ADMIN_PASSWORD`) y la clave `JWT_SECRET`. Con los valores de ejemplo también funciona.

4. Levanta todo:

   ```bash
   docker compose up --build -d
   ```

5. Espera unos 30 segundos (la primera vez se crea la base de datos con sus datos de prueba) y abre
   **http://localhost:5173**.

> **Importante: la cuenta de administrador se crea una sola vez.** La primera vez que se inicia el sistema, se crea
> con los datos de `backend/.env`, y de ahí en adelante queda guardada en la base de datos. Si después cambias el
> `.env`, esa cuenta **no** cambia. Por eso conviene elegir el correo y la contraseña antes del paso 4.
> Más adelante, el administrador puede crear otras cuentas de administrador desde la pantalla **Personal**.

### Apagar y reiniciar

| Comando | Qué hace |
|---|---|
| `docker compose down` | Apaga el sistema. **Los datos se conservan.** |
| `docker compose up -d` | Lo vuelve a encender, con los mismos datos. |
| `docker compose up --build -d` | Lo enciende con los cambios que hayas hecho en el código. |
| `docker compose down -v` | Apaga y **borra la base de datos**. Al volver a encender, parte de cero con los datos de prueba y se vuelve a crear el administrador del `.env`. |

## Cuentas de prueba

**Administrador:** el de `backend/.env` (con los valores de ejemplo: `admin@redvet.cl` / `admin123`).

**Veterinarios:**

| Correo | Contraseña | Sede |
|---|---|---|
| `vet.norte@redvet.cl` | `vet123` | Sede Norte |
| `vet.centro@redvet.cl` | `123456` | Sede Centro |
| `vet.sur@redvet.cl` | `123456` | Sede Sur |

**Tutores:**

| Correo | Contraseña | Mascotas |
|---|---|---|
| `carlos.m@gmail.com` | `tutor123` | Firulais (perro), Michi (gato) |
| `lucia.f@gmail.com` | `123456` | Rex (perro), Piolín (ave) |
| `pedro.g@gmail.com` | `123456` | Luna (gato) |
| `ana.t@gmail.com` | `123456` | Nemo (pez) |
| `diego.r@gmail.com` | `123456` | Hamtaro (roedor), Thor (perro) |
| `sofia.v@gmail.com` | `123456` | Simba (gato) |
| `mateo.l@gmail.com` | `123456` | Kiwi (ave) |

Cualquier persona también puede crearse una cuenta de tutor con **Crear una cuenta** en la pantalla de ingreso.

## Qué puede hacer cada rol

- **Tutor:** registra a sus mascotas, agenda citas (eligiendo sede, veterinario, fecha y una hora libre) y ve las fichas y vacunas de sus mascotas. Solo ve lo suyo.
- **Veterinario:** ve su agenda, atiende sus citas (diagnóstico, tratamiento, recetas y vacunas), registra las alergias de las mascotas, corrige diagnósticos y edita o cancela sus citas.
- **Administrador:** todo lo anterior en todas las sedes, y además gestiona el personal (cuentas de veterinarios y administradores), sedes, inventario, planes de vacunación, auditoría y estadísticas.

## Base de datos

Los archivos de `database/` se ejecutan en orden la primera vez que se crea la base:

| Archivo | Contenido |
|---|---|
| `01_dbCreate.sql` | Tablas y relaciones |
| `02_procedimientos.sql` | **SP1** `sp_registrar_atencion` (atención + recetas + descuento de inventario) y **SP2** `sp_aplicar_vacuna` (aplica un plan y agenda las citas de refuerzo) |
| `03_triggers.sql` | **Trigger 1** (impide recetar a una mascota alérgica) y **Trigger 2** (audita los cambios de diagnóstico en fichas cerradas) |
| `04_indexes.sql` | Índices en la mascota y en la fecha de la cita |
| `05_materialized_views.sql` | Vista materializada de estadísticas por especie y sede: atenciones y los 3 diagnósticos más frecuentes (se refresca todos los días a las 03:00) |
| `06_seeder.sql` | Datos de prueba |

Además, `docs/dump_lab1bd.sql` es un respaldo completo (`pg_dump`) de la base recién creada.

## API

Todas las rutas empiezan con `http://localhost:3000/api`. Salvo el ingreso y el registro, todas piden el encabezado
`Authorization: Bearer <token>`.

**Reglas comunes:**

- `GET /recurso` lista y `GET /recurso/:id` trae uno. `POST` crea, `PATCH /:id` modifica y `DELETE /:id` borra.
- Las listas aceptan paginación: `?pagina=2&limite=10` (sin `limite` devuelven todo).
- Los errores se responden como `{ "error": "mensaje" }`: 400 dato inválido, 401 sin sesión, 403 sin permiso,
  404 no encontrado y 409 conflicto (por ejemplo, un correo repetido o una hora ya ocupada).
- El tutor solo recibe lo de sus mascotas. El veterinario solo trabaja sobre sus propias citas.

### Ingreso y registro

`POST /auth/login`

```json
{ "correo": "admin@redvet.cl", "password": "admin123" }
```

Responde con el token y los datos del usuario:

```json
{ "token": "eyJhbGciOiJIUzI1Ni...", "usuario": { "id": 11, "nombre": "Administrador General", "correo": "admin@redvet.cl", "rol": "Administrador" } }
```

`POST /auth/registro` crea una cuenta de tutor y responde igual que el login:

```json
{ "nombre": "Marta Ríos", "correo": "marta@gmail.com", "password": "marta123" }
```

### Recursos

| Recurso | Quién lo usa | Ejemplo para crear (`POST`) |
|---|---|---|
| `/especies`, `/sedes` | Todos leen; el administrador modifica | `{ "nombre": "Sede Este" }` |
| `/medicamentos` | Veterinario y administrador | `{ "nombre_comercial": "Cefapet 500mg", "principio_activo": "Cefalexina" }` |
| `/inventario` | Veterinario lee; el administrador modifica. `POST` crea o reemplaza el stock | `{ "id_sede": 1, "id_medicamento": 2, "stock_actual": 45 }` |
| `/tutores`, `/administradores` | Administrador | `{ "nombre": "Ana", "correo": "ana@x.cl", "password": "clave123" }` |
| `/veterinarios` | Todos leen; el administrador modifica | Igual que tutores, más `"id_sede": 1` |
| `/roles` | Administrador (solo lectura) | — |
| `/mascotas` | Tutor (las suyas) y administrador | `{ "nombre": "Toby", "id_especie": 1 }` (el administrador agrega `"id_tutor"`) |
| `/alergias` | Veterinario y administrador (el tutor lee las de sus mascotas). Filtro `?id_mascota=1`. El **trigger 1** las usa para rechazar recetas | `{ "id_mascota": 1, "principio_activo": "Meloxicam" }` |
| `/citas` | Todos (cada uno ve las suyas) | `{ "id_mascota": 1, "id_sede": 1, "id_veterinario": 1, "tipo_atencion": "Sede", "fecha_hora": "2026-12-01T10:00" }` |
| `/fichas`, `/recetas` | Todos (el tutor, las de sus mascotas) | Se crean solas al agendar y al atender |
| `/planes-vacunacion` | Veterinario lee; el administrador modifica | `{ "id_especie": 1, "nombre_vacuna": "Óctuple Canina", "cantidad_refuerzo": 2, "dias_refuerzo": 30 }` |
| `/vacunaciones` | Todos leen (el tutor, las suyas) | Ver procedimiento 2 |
| `/auditoria` | Administrador (solo lectura) | — |
| `/estadisticas` | Administrador (solo lectura). Filtros `?id_sede=1&id_especie=1` | — |

Una cita no se acepta en un día pasado, con un veterinario de otra sede ni en una hora en que el veterinario ya tiene
otra cita.

### Rutas especiales

| Ruta | Qué hace |
|---|---|
| `POST /atenciones` | **Procedimiento 1.** Atiende una cita: cierra su ficha, crea las recetas y descuenta el inventario de la sede. Si se indica `id_vacuna`, también ejecuta el procedimiento 2. Todo en una sola transacción. |
| `POST /vacunaciones` | **Procedimiento 2.** `{ "id_cita": 18, "id_vacuna": 3 }`. Registra la dosis y, si es la primera del plan, agenda una cita por cada refuerzo. |
| `GET /vacunaciones/por-vencer` | Mascotas con vacunas vencidas o que vencen en los próximos 30 días. |
| `GET /veterinarios/:id/disponibilidad?fecha=2026-12-01` | Horas libres del veterinario ese día (bloques de una hora entre 09:00 y 17:00). |
| `PATCH /citas/:id/cancelar` | Cancela una cita programada y borra su ficha abierta. |
| `PATCH /fichas/:id` | Corrige el diagnóstico de una ficha cerrada; el **trigger 2** guarda el cambio en la auditoría. |
| `POST /estadisticas/refrescar` | Refresca a mano la vista materializada. |

Ejemplo de atención (`medicamentos`, `cantidades` e `id_vacuna` son opcionales):

```json
{ "id_cita": 17, "diagnostico": "Control sano", "tratamiento": "Vacunación", "medicamentos": [2], "cantidades": [1], "id_vacuna": 2 }
```

## Estructura del proyecto

```text
backend/    API: routes, controllers, services, repositories, middleware y utils
frontend/   Interfaz: pantallas (pages), componentes, sesión (context) y cliente de la API
database/   Scripts SQL que crean y llenan la base
docs/       Dump de la base y script de pruebas de la API
```

## Pruebas

Con el sistema encendido y la base recién creada (`docker compose down -v` y `docker compose up -d`):

```bash
powershell -ExecutionPolicy Bypass -File docs/pruebas-api.ps1
```

Prueba los permisos de cada rol, los procedimientos, los triggers, el CRUD y datos inválidos. Termina mostrando
cuántas pruebas pasaron.
