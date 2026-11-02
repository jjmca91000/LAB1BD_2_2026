-- vista materializada: atenciones y los 3 diagnosticos mas frecuentes por sede y especie en los ultimos 12 meses
CREATE MATERIALIZED VIEW mv_estadisticas_atencion AS
-- conteo: cuantas veces se repite cada diagnostico en cada sede y especie
WITH conteo AS (
    SELECT c.id_sede, m.id_especie, f.diagnostico, COUNT(*) AS veces
    FROM "FICHA_CLINICA" f
    JOIN "CITA_MEDICA" c ON f.id_cita = c.id_cita
    JOIN "MASCOTA" m ON c.id_mascota = m.id_mascota
    WHERE c.fecha_hora >= (CURRENT_DATE - INTERVAL '12 months')
      AND f.diagnostico IS NOT NULL
    GROUP BY c.id_sede, m.id_especie, f.diagnostico
),
-- ranking: ROW_NUMBER numera los diagnosticos de cada sede y especie, del mas repetido al menos
ranking AS (
    SELECT conteo.*,
           ROW_NUMBER() OVER (PARTITION BY id_sede, id_especie ORDER BY veces DESC, diagnostico) AS puesto
    FROM conteo
)
SELECT
    r.id_sede,
    s.nombre AS nombre_sede,
    r.id_especie,
    e.nombre_especie AS especie,
    SUM(r.veces)::int AS cantidad_atenciones,
    -- se juntan los 3 primeros del ranking en un texto, por ejemplo: Otitis (4), Control (2)
    string_agg(r.diagnostico || ' (' || r.veces || ')', ', ' ORDER BY r.puesto)
        FILTER (WHERE r.puesto <= 3) AS diagnosticos_mas_frecuentes
FROM ranking r
JOIN "SEDE" s ON r.id_sede = s.id_sede
JOIN "ESPECIE" e ON r.id_especie = e.id_especie
GROUP BY r.id_sede, s.nombre, r.id_especie, e.nombre_especie
WITH DATA;

-- el indice unico permite refrescarla con CONCURRENTLY (se puede leer mientras se refresca)
CREATE UNIQUE INDEX idx_mv_estadisticas_unica ON mv_estadisticas_atencion (id_sede, id_especie);

-- se refresca la vista (la llama el backend todos los dias a las 03:00)
CREATE OR REPLACE FUNCTION fn_refrescar_mv_estadisticas()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_estadisticas_atencion;
END;
$$ LANGUAGE plpgsql;
