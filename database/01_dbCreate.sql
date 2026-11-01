-- roles del sistema: Administrador, Veterinario y Tutor
CREATE TABLE "ROL" (
  "id_rol" SERIAL PRIMARY KEY,
  "nombre_rol" VARCHAR(50) NOT NULL UNIQUE
);

-- especies de mascotas
CREATE TABLE "ESPECIE" (
  "id_especie" SERIAL PRIMARY KEY,
  "nombre_especie" VARCHAR(50) NOT NULL UNIQUE
);

-- sedes de la red de clinicas
CREATE TABLE "SEDE" (
  "id_sede" SERIAL PRIMARY KEY,
  "nombre" VARCHAR(100) NOT NULL UNIQUE
);

-- medicamentos con su principio activo
CREATE TABLE "MEDICAMENTO" (
  "id_medicamento" SERIAL PRIMARY KEY,
  "nombre_comercial" VARCHAR(100) NOT NULL UNIQUE,
  "principio_activo" VARCHAR(100) NOT NULL
);

-- cuentas para ingresar (correo, contrasena y rol)
CREATE TABLE "USUARIO" (
  "id_usuario" SERIAL PRIMARY KEY,
  "id_rol" INT NOT NULL,
  "email" VARCHAR(100) NOT NULL UNIQUE,
  "password_hash" VARCHAR(255) NOT NULL,
  "activo" BOOLEAN DEFAULT TRUE,
  CONSTRAINT "FK_USUARIO_rol" FOREIGN KEY ("id_rol") REFERENCES "ROL"("id_rol")
);

-- perfil de tutor de un usuario
CREATE TABLE "TUTOR" (
  "id_tutor" SERIAL PRIMARY KEY,
  "id_usuario" INT NOT NULL UNIQUE,
  "nombre_tutor" VARCHAR(100) NOT NULL,
  CONSTRAINT "FK_TUTOR_usuario" FOREIGN KEY ("id_usuario") REFERENCES "USUARIO"("id_usuario")
);

-- perfil de veterinario de un usuario (trabaja en una sede)
CREATE TABLE "VETERINARIO" (
  "id_veterinario" SERIAL PRIMARY KEY,
  "id_usuario" INT NOT NULL UNIQUE,
  "id_sede" INT NOT NULL,
  "nombre_veterinario" VARCHAR(100) NOT NULL,
  CONSTRAINT "FK_VETERINARIO_usuario" FOREIGN KEY ("id_usuario") REFERENCES "USUARIO"("id_usuario"),
  CONSTRAINT "FK_VETERINARIO_sede" FOREIGN KEY ("id_sede") REFERENCES "SEDE"("id_sede")
);

-- perfil de administrador de un usuario
CREATE TABLE "ADMINISTRADOR" (
  "id_administrador" SERIAL PRIMARY KEY,
  "id_usuario" INT NOT NULL UNIQUE,
  "nombre_administrador" VARCHAR(100) NOT NULL,
  CONSTRAINT "FK_ADMINISTRADOR_usuario" FOREIGN KEY ("id_usuario") REFERENCES "USUARIO"("id_usuario")
);

-- stock de cada medicamento en cada sede
CREATE TABLE "INVENTARIO" (
  "id_inventario" SERIAL PRIMARY KEY,
  "id_sede" INT NOT NULL,
  "id_medicamento" INT NOT NULL,
  "stock_actual" INT NOT NULL CHECK ("stock_actual" >= 0),
  CONSTRAINT "UQ_INVENTARIO_Sede_Med" UNIQUE ("id_sede", "id_medicamento"),
  CONSTRAINT "FK_INVENTARIO_sede" FOREIGN KEY ("id_sede") REFERENCES "SEDE"("id_sede"),
  CONSTRAINT "FK_INVENTARIO_medicamento" FOREIGN KEY ("id_medicamento") REFERENCES "MEDICAMENTO"("id_medicamento")
);

-- mascotas de cada tutor
CREATE TABLE "MASCOTA" (
  "id_mascota" SERIAL PRIMARY KEY,
  "id_especie" INT NOT NULL,
  "id_tutor" INT NOT NULL,
  "nombre_mascota" VARCHAR(100) NOT NULL,
  CONSTRAINT "UQ_MASCOTA_Tutor_Nombre" UNIQUE ("id_tutor", "nombre_mascota"),
  CONSTRAINT "FK_MASCOTA_especie" FOREIGN KEY ("id_especie") REFERENCES "ESPECIE"("id_especie"),
  CONSTRAINT "FK_MASCOTA_tutor" FOREIGN KEY ("id_tutor") REFERENCES "TUTOR"("id_tutor")
);

-- principios activos a los que es alergica una mascota
CREATE TABLE "ALERGIA_MASCOTA" (
  "id_alergia" SERIAL PRIMARY KEY,
  "id_mascota" INT NOT NULL,
  "principio_activo" VARCHAR(100) NOT NULL,
  CONSTRAINT "UQ_ALERMASC_Masco_Princi" UNIQUE ("id_mascota", "principio_activo"),
  CONSTRAINT "FK_ALERGIA_mascota" FOREIGN KEY ("id_mascota") REFERENCES "MASCOTA"("id_mascota")
);

-- citas en sede o a domicilio
CREATE TABLE "CITA_MEDICA" (
  "id_cita" SERIAL PRIMARY KEY,
  "id_mascota" INT NOT NULL,
  "id_sede" INT NOT NULL,
  "id_veterinario" INT NOT NULL,
  "tipo_atencion" VARCHAR(50) NOT NULL CHECK ("tipo_atencion" IN ('Sede', 'Domicilio')),
  "fecha_hora" TIMESTAMP NOT NULL,
  "estado" VARCHAR(20) NOT NULL CHECK ("estado" IN ('Programada', 'Completada', 'Cancelada')),
  CONSTRAINT "FK_CITA_mascota" FOREIGN KEY ("id_mascota") REFERENCES "MASCOTA"("id_mascota"),
  CONSTRAINT "FK_CITA_sede" FOREIGN KEY ("id_sede") REFERENCES "SEDE"("id_sede"),
  CONSTRAINT "FK_CITA_veterinario" FOREIGN KEY ("id_veterinario") REFERENCES "VETERINARIO"("id_veterinario")
);

-- ficha de cada cita; estado TRUE = abierta (por atender), FALSE = cerrada
CREATE TABLE "FICHA_CLINICA" (
  "id_ficha" SERIAL PRIMARY KEY,
  "id_cita" INT NOT NULL UNIQUE,
  "diagnostico" TEXT,
  "tratamiento" TEXT,
  "estado" BOOLEAN DEFAULT TRUE,
  "id_usuario_modificador" INT,
  CONSTRAINT "FK_FICHA_cita" FOREIGN KEY ("id_cita") REFERENCES "CITA_MEDICA"("id_cita"),
  CONSTRAINT "FK_FICHA_usuario" FOREIGN KEY ("id_usuario_modificador") REFERENCES "USUARIO"("id_usuario")
);

-- medicamentos recetados en una ficha
CREATE TABLE "RECETA" (
  "id_receta" SERIAL PRIMARY KEY,
  "id_ficha" INT NOT NULL,
  "id_medicamento" INT NOT NULL,
  "cantidad_entregada" INT NOT NULL CHECK ("cantidad_entregada" > 0),
  CONSTRAINT "UQ_RECETA_Ficha_Medi" UNIQUE ("id_ficha", "id_medicamento"),
  CONSTRAINT "FK_RECETA_ficha" FOREIGN KEY ("id_ficha") REFERENCES "FICHA_CLINICA"("id_ficha"),
  CONSTRAINT "FK_RECETA_medicamento" FOREIGN KEY ("id_medicamento") REFERENCES "MEDICAMENTO"("id_medicamento")
);

-- planes de vacunacion por especie (la llave se llama id_vacuna)
CREATE TABLE "PLAN_VACUNACION" (
  "id_vacuna" SERIAL PRIMARY KEY,
  "id_especie" INT NOT NULL,
  "nombre_vacuna" VARCHAR(100) NOT NULL,
  "cantidad_refuerzo" INT NOT NULL CHECK ("cantidad_refuerzo" >= 0),
  "dias_refuerzo" INT NOT NULL CHECK ("dias_refuerzo" >= 0),
  CONSTRAINT "UQ_PLANVAC_Esp_Nombre" UNIQUE ("id_especie", "nombre_vacuna"),
  CONSTRAINT "FK_PLAN_especie" FOREIGN KEY ("id_especie") REFERENCES "ESPECIE"("id_especie")
);

-- dosis aplicadas (0 = primera, 1 = primer refuerzo...)
CREATE TABLE "REGISTRO_VACUNACION" (
  "id_registro" SERIAL PRIMARY KEY,
  "id_vacuna" INT NOT NULL,
  "id_mascota" INT NOT NULL,
  "id_cita" INT,
  "fecha_aplicacion" DATE NOT NULL,
  "vencimiento_vacuna" DATE NOT NULL,
  "numero_refuerzo" INT NOT NULL,
  CONSTRAINT "FK_REGVAC_vacuna" FOREIGN KEY ("id_vacuna") REFERENCES "PLAN_VACUNACION"("id_vacuna"),
  CONSTRAINT "FK_REGVAC_mascota" FOREIGN KEY ("id_mascota") REFERENCES "MASCOTA"("id_mascota"),
  CONSTRAINT "FK_REGVAC_cita" FOREIGN KEY ("id_cita") REFERENCES "CITA_MEDICA"("id_cita")
);

-- cambios de diagnostico en fichas cerradas (los escribe el trigger 2)
CREATE TABLE "AUDITORIA" (
  "id_auditoria" SERIAL PRIMARY KEY,
  "id_ficha" INT NOT NULL,
  "diagnostico_anterior" TEXT,
  "diagnostico_nuevo" TEXT,
  "id_usuario_modificador" INT NOT NULL,
  "fecha_modificacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FK_AUDITORIA_ficha" FOREIGN KEY ("id_ficha") REFERENCES "FICHA_CLINICA"("id_ficha")
);