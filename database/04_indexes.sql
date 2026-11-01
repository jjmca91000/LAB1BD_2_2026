-- se acelera la busqueda de citas y fichas de una mascota
CREATE INDEX idx_cita_mascota ON "CITA_MEDICA" ("id_mascota");

-- se acelera la busqueda por fecha (estadisticas de los ultimos 12 meses)
CREATE INDEX idx_cita_fecha_hora ON "CITA_MEDICA" ("fecha_hora");

-- se acelera la agenda de un veterinario en una fecha (disponibilidad)
CREATE INDEX idx_cita_vet_fecha ON "CITA_MEDICA" ("id_veterinario", "fecha_hora");
