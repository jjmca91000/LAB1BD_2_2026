-- procedimiento 1: se registra una atencion completa en una sola transaccion
CREATE OR REPLACE PROCEDURE sp_registrar_atencion(
    p_id_cita INT,
    p_diagnostico TEXT,
    p_tratamiento TEXT,
    p_id_usuario INT,
    p_medicamentos INT[],
    p_cantidades INT[],
    p_id_vacuna INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_id_ficha INT;
    v_id_sede INT;
    v_stock INT;
    v_nombre VARCHAR;
BEGIN
    -- se revisa que cada medicamento tenga su cantidad
    IF cardinality(p_medicamentos) <> cardinality(p_cantidades) THEN
        RAISE EXCEPTION 'La lista de medicamentos no coincide con las cantidades.';
    END IF;

    -- se cierra la ficha abierta de la cita con el diagnostico y el tratamiento
    UPDATE "FICHA_CLINICA"
    SET diagnostico = p_diagnostico,
        tratamiento = p_tratamiento,
        estado = FALSE,
        id_usuario_modificador = p_id_usuario
    WHERE id_cita = p_id_cita AND estado = TRUE
    RETURNING id_ficha INTO v_id_ficha;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La cita % no existe o no tiene una ficha abierta.', p_id_cita;
    END IF;

    -- se completa la cita y se guarda su sede
    UPDATE "CITA_MEDICA" SET estado = 'Completada'
    WHERE id_cita = p_id_cita
    RETURNING id_sede INTO v_id_sede;

    -- por cada medicamento: receta (la revisa el trigger 1), revision de stock y descuento
    FOR i IN 1 .. cardinality(p_medicamentos) LOOP
        INSERT INTO "RECETA" (id_ficha, id_medicamento, cantidad_entregada)
        VALUES (v_id_ficha, p_medicamentos[i], p_cantidades[i]);

        -- FOR UPDATE bloquea la fila para que otra atencion no descuente el mismo stock al mismo tiempo
        SELECT inv.stock_actual, m.nombre_comercial INTO v_stock, v_nombre
        FROM "INVENTARIO" inv
        JOIN "MEDICAMENTO" m ON m.id_medicamento = inv.id_medicamento
        WHERE inv.id_sede = v_id_sede AND inv.id_medicamento = p_medicamentos[i]
        FOR UPDATE OF inv;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'El medicamento % no está en el inventario de la sede de la cita.', p_medicamentos[i];
        END IF;

        IF v_stock < p_cantidades[i] THEN
            RAISE EXCEPTION 'Stock insuficiente de %: se piden % y quedan %.', v_nombre, p_cantidades[i], v_stock;
        END IF;

        UPDATE "INVENTARIO"
        SET stock_actual = stock_actual - p_cantidades[i]
        WHERE id_sede = v_id_sede AND id_medicamento = p_medicamentos[i];
    END LOOP;

    -- si se vacuno, se llama al procedimiento 2 dentro de la misma transaccion
    IF p_id_vacuna IS NOT NULL THEN
        CALL sp_aplicar_vacuna(p_id_cita, p_id_vacuna);
    END IF;
END;
$$;

-- procedimiento 2: se aplica una dosis de un plan y, si es la primera, se agendan los refuerzos
CREATE OR REPLACE PROCEDURE sp_aplicar_vacuna(
    p_id_cita INT,
    p_id_vacuna INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    -- %ROWTYPE: variable con la forma de una fila completa de la tabla
    v_cita "CITA_MEDICA"%ROWTYPE;
    v_plan "PLAN_VACUNACION"%ROWTYPE;
    v_dosis_previas INT;
BEGIN
    -- se busca la cita
    SELECT * INTO v_cita FROM "CITA_MEDICA" WHERE id_cita = p_id_cita;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La cita % no existe.', p_id_cita;
    END IF;

    -- se revisa que la cita no este cancelada ni tenga ya esta vacuna
    IF v_cita.estado = 'Cancelada' THEN
        RAISE EXCEPTION 'La cita % está cancelada.', p_id_cita;
    END IF;

    IF EXISTS (SELECT 1 FROM "REGISTRO_VACUNACION" WHERE id_cita = p_id_cita AND id_vacuna = p_id_vacuna) THEN
        RAISE EXCEPTION 'Esta vacuna ya se registró en la cita %.', p_id_cita;
    END IF;

    -- se busca el plan y se revisa que sea de la especie de la mascota
    SELECT p.* INTO v_plan
    FROM "PLAN_VACUNACION" p
    JOIN "MASCOTA" m ON m.id_especie = p.id_especie
    WHERE p.id_vacuna = p_id_vacuna AND m.id_mascota = v_cita.id_mascota;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El plan de vacunación no existe o no es para la especie de la mascota.';
    END IF;

    -- se cuentan las dosis previas para saber cual toca
    SELECT COUNT(*) INTO v_dosis_previas
    FROM "REGISTRO_VACUNACION"
    WHERE id_mascota = v_cita.id_mascota AND id_vacuna = p_id_vacuna;

    IF v_dosis_previas > v_plan.cantidad_refuerzo THEN
        RAISE EXCEPTION 'La mascota ya completó el plan %.', v_plan.nombre_vacuna;
    END IF;

    -- se registra la dosis en la fecha de la cita
    INSERT INTO "REGISTRO_VACUNACION" (id_vacuna, id_mascota, id_cita, fecha_aplicacion, vencimiento_vacuna, numero_refuerzo)
    VALUES (p_id_vacuna, v_cita.id_mascota, p_id_cita,
            v_cita.fecha_hora::date, v_cita.fecha_hora::date + v_plan.dias_refuerzo, v_dosis_previas);

    -- si es la primera dosis, se agenda una cita por refuerzo (generate_series da n = 1, 2...) y a cada una se le crea su ficha
    IF v_dosis_previas = 0 THEN
        WITH nuevas AS (
            INSERT INTO "CITA_MEDICA" (id_mascota, id_sede, id_veterinario, tipo_atencion, fecha_hora, estado)
            SELECT v_cita.id_mascota, v_cita.id_sede, v_cita.id_veterinario, v_cita.tipo_atencion,
                   v_cita.fecha_hora + n * v_plan.dias_refuerzo * INTERVAL '1 day', 'Programada'
            FROM generate_series(1, v_plan.cantidad_refuerzo) AS n
            RETURNING id_cita
        )
        INSERT INTO "FICHA_CLINICA" (id_cita)
        SELECT id_cita FROM nuevas;
    END IF;
END;
$$;
