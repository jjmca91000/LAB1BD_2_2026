-- trigger 1: se impide recetar un medicamento si la mascota es alergica a su principio activo
CREATE OR REPLACE FUNCTION fn_validar_alergia()
RETURNS TRIGGER AS $$
DECLARE
    v_principio_activo VARCHAR;
    v_id_mascota INT;
    v_alergia_existe INT;
BEGIN
    SELECT principio_activo INTO v_principio_activo
    FROM "MEDICAMENTO" WHERE id_medicamento = NEW.id_medicamento;

    SELECT c.id_mascota INTO v_id_mascota
    FROM "FICHA_CLINICA" f
    JOIN "CITA_MEDICA" c ON f.id_cita = c.id_cita
    WHERE f.id_ficha = NEW.id_ficha;

    SELECT COUNT(*) INTO v_alergia_existe
    FROM "ALERGIA_MASCOTA"
    WHERE id_mascota = v_id_mascota AND principio_activo = v_principio_activo;

    IF v_alergia_existe > 0 THEN
        RAISE EXCEPTION 'Operación denegada: La mascota es alérgica al principio activo %', v_principio_activo;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- se ejecuta antes de guardar cada receta
CREATE TRIGGER trg_verificar_alergia
BEFORE INSERT OR UPDATE ON "RECETA"
FOR EACH ROW
EXECUTE FUNCTION fn_validar_alergia();

-- trigger 2: se guarda en AUDITORIA cada cambio de diagnostico en una ficha cerrada
CREATE OR REPLACE FUNCTION fn_auditar_diagnostico()
RETURNS TRIGGER AS $$
BEGIN
    -- IS DISTINCT FROM compara bien aunque alguno sea NULL
    IF OLD.estado = FALSE AND OLD.diagnostico IS DISTINCT FROM NEW.diagnostico THEN
        INSERT INTO "AUDITORIA" (
            id_ficha,
            diagnostico_anterior,
            diagnostico_nuevo,
            id_usuario_modificador,
            fecha_modificacion
        ) VALUES (
            NEW.id_ficha,
            OLD.diagnostico,
            NEW.diagnostico,
            NEW.id_usuario_modificador,
            CURRENT_TIMESTAMP
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- se ejecuta despues de cada cambio en una ficha
CREATE TRIGGER trg_auditoria_ficha
AFTER UPDATE ON "FICHA_CLINICA"
FOR EACH ROW
EXECUTE FUNCTION fn_auditar_diagnostico();
