-- pgcrypto permite crear los hash de las contrasenas con crypt()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- se insertan los roles, especies, sedes, medicamentos e inventario
INSERT INTO "ROL" ("nombre_rol") VALUES
('Administrador'),
('Veterinario'),
('Tutor');

INSERT INTO "ESPECIE" ("nombre_especie") VALUES
('Perro'),
('Gato'),
('Pez'),
('Roedor'),
('Ave');

INSERT INTO "SEDE" ("nombre") VALUES
('Sede Norte'),
('Sede Centro'),
('Sede Sur');

INSERT INTO "MEDICAMENTO" ("nombre_comercial", "principio_activo") VALUES
('Meloxivet 15mg', 'Meloxicam'),
('Cefapet 500mg', 'Cefalexina'),
('Apoquel 16mg', 'Oclacitinib'),
('Enroflox 50mg', 'Enrofloxacino'),
('Tramadol Vet 50mg', 'Tramadol');

INSERT INTO "INVENTARIO" ("id_sede", "id_medicamento", "stock_actual") VALUES
(1, 1, 50), (1, 2, 40), (1, 3, 30), (1, 4, 60), (1, 5, 25),
(2, 1, 45), (2, 2, 50), (2, 3, 20), (2, 4, 35), (2, 5, 40),
(3, 1, 60), (3, 2, 30), (3, 3, 45), (3, 4, 50), (3, 5, 30);

-- se insertan los usuarios de prueba (el administrador lo crea el backend con los datos del .env)
INSERT INTO "USUARIO" ("id_rol", "email", "password_hash", "activo") VALUES
(2, 'vet.norte@redvet.cl', crypt('vet123', gen_salt('bf', 10)), TRUE),
(2, 'vet.centro@redvet.cl', crypt('123456', gen_salt('bf', 10)), TRUE),
(2, 'vet.sur@redvet.cl', crypt('123456', gen_salt('bf', 10)), TRUE),
(3, 'carlos.m@gmail.com', crypt('tutor123', gen_salt('bf', 10)), TRUE),
(3, 'lucia.f@gmail.com', crypt('123456', gen_salt('bf', 10)), TRUE),
(3, 'pedro.g@gmail.com', crypt('123456', gen_salt('bf', 10)), TRUE),
(3, 'ana.t@gmail.com', crypt('123456', gen_salt('bf', 10)), TRUE),
(3, 'diego.r@gmail.com', crypt('123456', gen_salt('bf', 10)), TRUE),
(3, 'sofia.v@gmail.com', crypt('123456', gen_salt('bf', 10)), TRUE),
(3, 'mateo.l@gmail.com', crypt('123456', gen_salt('bf', 10)), TRUE);

-- se insertan los perfiles de veterinarios y tutores
INSERT INTO "VETERINARIO" ("id_usuario", "id_sede", "nombre_veterinario") VALUES
(1, 1, 'Dra. Camila Soto'),
(2, 2, 'Dr. Andrés Valdés'),
(3, 3, 'Dra. Valentina Pino');

INSERT INTO "TUTOR" ("id_usuario", "nombre_tutor") VALUES
(4, 'Carlos Mendoza'),
(5, 'Lucía Fernández'),
(6, 'Pedro González'),
(7, 'Ana Torres'),
(8, 'Diego Rojas'),
(9, 'Sofía Vargas'),
(10, 'Mateo Lagos');

-- se insertan las mascotas y sus alergias
INSERT INTO "MASCOTA" ("id_especie", "id_tutor", "nombre_mascota") VALUES
(1, 1, 'Firulais'),
(2, 1, 'Michi'),
(1, 2, 'Rex'),
(5, 2, 'Piolín'),
(2, 3, 'Luna'),
(3, 4, 'Nemo'),
(4, 5, 'Hamtaro'),
(1, 5, 'Thor'),
(2, 6, 'Simba'),
(5, 7, 'Kiwi');

INSERT INTO "ALERGIA_MASCOTA" ("id_mascota", "principio_activo") VALUES
(1, 'Meloxicam'),
(3, 'Cefalexina'),
(5, 'Enrofloxacino');

-- se insertan los planes de vacunacion (cantidad_refuerzo = 0 es dosis unica)
INSERT INTO "PLAN_VACUNACION" ("id_especie", "nombre_vacuna", "cantidad_refuerzo", "dias_refuerzo") VALUES
(1, 'Antirrábica Canina', 0, 0),
(1, 'Óctuple Canina', 2, 30),
(2, 'Triple Felina', 1, 21),
(5, 'Viruela Aviar', 1, 15);

-- se insertan las citas: pasadas (completadas o canceladas) y futuras (programadas)
INSERT INTO "CITA_MEDICA" ("id_mascota", "id_sede", "id_veterinario", "tipo_atencion", "fecha_hora", "estado") VALUES
(1, 1, 1, 'Sede', '2025-03-15 10:00:00', 'Completada'),
(2, 2, 2, 'Sede', '2025-05-10 11:00:00', 'Completada'),
(2, 2, 2, 'Sede', '2025-05-31 11:00:00', 'Completada'),
(6, 3, 3, 'Domicilio', '2025-08-20 15:00:00', 'Completada'),

(3, 1, 1, 'Sede', '2025-11-12 09:30:00', 'Completada'),
(5, 2, 2, 'Sede', '2026-01-20 16:00:00', 'Completada'),
(7, 3, 3, 'Sede', '2026-02-14 10:30:00', 'Completada'),
(9, 2, 2, 'Sede', '2026-03-05 12:00:00', 'Cancelada'),
(8, 1, 1, 'Sede', '2026-04-10 14:00:00', 'Completada'),
(1, 1, 1, 'Sede', '2026-06-01 10:00:00', 'Completada'),
(5, 2, 2, 'Sede', '2026-07-15 11:30:00', 'Completada'),
(10, 3, 3, 'Sede', '2026-08-19 15:30:00', 'Completada'),
(3, 1, 1, 'Sede', '2026-10-15 10:00:00', 'Completada'),
(4, 3, 3, 'Sede', '2026-10-20 16:00:00', 'Completada'),
(8, 1, 1, 'Sede', '2026-10-30 11:00:00', 'Completada'),

(4, 3, 3, 'Sede', '2026-11-04 16:00:00', 'Programada'),
(1, 1, 1, 'Sede', '2026-11-05 10:00:00', 'Programada'),
(5, 2, 2, 'Domicilio', '2026-11-06 11:00:00', 'Programada'),
(3, 1, 1, 'Sede', '2026-11-14 10:00:00', 'Programada'),
(9, 2, 2, 'Sede', '2026-11-10 15:00:00', 'Cancelada'),
(3, 1, 1, 'Sede', '2026-12-14 10:00:00', 'Programada');

-- se insertan las fichas: cerradas para las citas atendidas y abiertas para las programadas
INSERT INTO "FICHA_CLINICA" ("id_cita", "diagnostico", "tratamiento", "estado", "id_usuario_modificador") VALUES
(1, 'Control sano para inmunización', 'Vacunación', FALSE, 1),
(2, 'Control sano felino', 'Vacunación', FALSE, 2),
(3, 'Refuerzo inmunológico felino', 'Vacunación y medicación antiparasitaria', FALSE, 2),
(4, 'Infección bacteriana en aletas', 'Cambio de parámetros de agua y reposo', FALSE, 3),
(5, 'Otitis Externa', 'Medicación tópica y limpieza', FALSE, 1),
(6, 'Gastroenteritis aguda', 'Medicación e hidratación', FALSE, 2),
(7, 'Sobrecrecimiento dental', 'Desgaste clínico y dieta blanda con reposo', FALSE, 3),
(9, 'Otitis Externa', 'Medicación antiinflamatoria y reposo', FALSE, 1),
(10, 'Sobrepeso leve', 'Rutina de ejercicio diario y dieta estricta', FALSE, 1),
(11, 'Gastroenteritis aguda', 'Ayuno controlado y reposo en casa', FALSE, 2),
(12, 'Muda de plumas anormal', 'Suplementación vitamínica y reposo luminoso', FALSE, 3),
(13, 'Inmunización activa canina', 'Vacunación y medicación analgésica', FALSE, 1),
(14, 'Chequeo preventivo aviar', 'Vacunación preventiva', FALSE, 3),
(15, 'Control anual preventivo', 'Vacunación de dosis única', FALSE, 1),

(16, NULL, NULL, TRUE, NULL),
(17, NULL, NULL, TRUE, NULL),
(18, NULL, NULL, TRUE, NULL),
(19, NULL, NULL, TRUE, NULL),
(21, NULL, NULL, TRUE, NULL);

-- se insertan las recetas
INSERT INTO "RECETA" ("id_ficha", "id_medicamento", "cantidad_entregada") VALUES
(3, 5, 1),
(5, 3, 2),
(6, 1, 1),
(8, 1, 2),
(12, 5, 1);

-- se insertan las vacunas aplicadas
INSERT INTO "REGISTRO_VACUNACION" ("id_vacuna", "id_mascota", "id_cita", "fecha_aplicacion", "vencimiento_vacuna", "numero_refuerzo") VALUES
(1, 1, 1, '2025-03-15', '2025-03-15', 0),
(3, 2, 2, '2025-05-10', '2025-05-31', 0),
(3, 2, 3, '2025-05-31', '2025-06-21', 1),

(2, 3, 13, '2026-10-15', '2026-11-14', 0),
(4, 4, 14, '2026-10-20', '2026-11-04', 0),
(1, 8, 15, '2026-10-30', '2026-10-30', 0);

-- se corrigen dos diagnosticos de fichas cerradas para que el trigger 2 deje registros en AUDITORIA
UPDATE "FICHA_CLINICA"
SET "diagnostico" = 'Otitis Externa Bilateral Crónica',
    "id_usuario_modificador" = 1
WHERE "id_ficha" = 5;

UPDATE "FICHA_CLINICA"
SET "diagnostico" = 'Sobrepeso moderado con indicación nutricional',
    "id_usuario_modificador" = 1
WHERE "id_ficha" = 9;

-- se refresca la vista con los datos recien insertados
REFRESH MATERIALIZED VIEW mv_estadisticas_atencion;