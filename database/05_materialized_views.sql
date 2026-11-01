-- vista materializada: atenciones y diagnostico mas frecuente por sede y especie en los ultimos 12 meses
CREATE MATERIALIZED VIEW mv_estadisticas_atencion AS
SELECT
    s.nombre AS nombre_sede,
    e.nombre_especie AS especie,
    COUNT(f.id_ficha) AS cantidad_atenciones,
    -- MODE() devuelve el valor que mas se repite
    MODE() WITHIN GROUP (ORDER BY f.diagnostico) AS diagnostico_mas_frecuente
FROM "FICHA_CLINICA" f
JOIN "CITA_MEDICA" c ON f.id_cita = c.id_cita
JOIN "SEDE" s ON c.id_sede = s.id_sede
JOIN "MASCOTA" m ON c.id_mascota = m.id_mascota
JOIN "ESPECIE" e ON m.id_especie = e.id_especie
WHERE c.fecha_hora >= (CURRENT_DATE - INTERVAL '12 months')
  AND f.diagnostico IS NOT NULL
GROUP BY s.nombre, e.nombre_especie
WITH DATA;

-- el indice unico permite refrescarla con CONCURRENTLY (se puede leer mientras se refresca)
CREATE UNIQUE INDEX idx_mv_estadisticas_unica ON mv_estadisticas_atencion (nombre_sede, especie);

-- se refresca la vista (la llama el backend todos los dias a las 03:00)
CREATE OR REPLACE FUNCTION fn_refrescar_mv_estadisticas()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_estadisticas_atencion;
END;
$$ LANGUAGE plpgsql;
