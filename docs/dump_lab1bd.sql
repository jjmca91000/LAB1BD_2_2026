--
-- PostgreSQL database dump
--

\restrict cwPMX6GEgjahBDoT373NSxwdwVWjqDupguHXMOiyZr4955FI6B9r1nqIF3gO9zg

-- Dumped from database version 15.19
-- Dumped by pg_dump version 15.19

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: fn_auditar_diagnostico(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_auditar_diagnostico() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: fn_refrescar_mv_estadisticas(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_refrescar_mv_estadisticas() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_estadisticas_atencion;
END;
$$;


--
-- Name: fn_validar_alergia(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_validar_alergia() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: sp_aplicar_vacuna(integer, integer); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.sp_aplicar_vacuna(IN p_id_cita integer, IN p_id_vacuna integer)
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


--
-- Name: sp_registrar_atencion(integer, text, text, integer, integer[], integer[], integer); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.sp_registrar_atencion(IN p_id_cita integer, IN p_diagnostico text, IN p_tratamiento text, IN p_id_usuario integer, IN p_medicamentos integer[], IN p_cantidades integer[], IN p_id_vacuna integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_id_ficha INT;
    v_id_sede INT;
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

    -- por cada medicamento: receta (la revisa el trigger 1) y descuento de stock (el CHECK impide quedar en negativo)
    FOR i IN 1 .. cardinality(p_medicamentos) LOOP
        INSERT INTO "RECETA" (id_ficha, id_medicamento, cantidad_entregada)
        VALUES (v_id_ficha, p_medicamentos[i], p_cantidades[i]);

        UPDATE "INVENTARIO"
        SET stock_actual = stock_actual - p_cantidades[i]
        WHERE id_sede = v_id_sede AND id_medicamento = p_medicamentos[i];

        IF NOT FOUND THEN
            RAISE EXCEPTION 'El medicamento % no está en el inventario de la sede %.', p_medicamentos[i], v_id_sede;
        END IF;
    END LOOP;

    -- si se vacuno, se llama al procedimiento 2 dentro de la misma transaccion
    IF p_id_vacuna IS NOT NULL THEN
        CALL sp_aplicar_vacuna(p_id_cita, p_id_vacuna);
    END IF;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ADMINISTRADOR; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ADMINISTRADOR" (
    id_administrador integer NOT NULL,
    id_usuario integer NOT NULL,
    nombre_administrador character varying(100) NOT NULL
);


--
-- Name: ADMINISTRADOR_id_administrador_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ADMINISTRADOR_id_administrador_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ADMINISTRADOR_id_administrador_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ADMINISTRADOR_id_administrador_seq" OWNED BY public."ADMINISTRADOR".id_administrador;


--
-- Name: ALERGIA_MASCOTA; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ALERGIA_MASCOTA" (
    id_alergia integer NOT NULL,
    id_mascota integer NOT NULL,
    principio_activo character varying(100) NOT NULL
);


--
-- Name: ALERGIA_MASCOTA_id_alergia_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ALERGIA_MASCOTA_id_alergia_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ALERGIA_MASCOTA_id_alergia_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ALERGIA_MASCOTA_id_alergia_seq" OWNED BY public."ALERGIA_MASCOTA".id_alergia;


--
-- Name: AUDITORIA; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AUDITORIA" (
    id_auditoria integer NOT NULL,
    id_ficha integer NOT NULL,
    diagnostico_anterior text,
    diagnostico_nuevo text,
    id_usuario_modificador integer NOT NULL,
    fecha_modificacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: AUDITORIA_id_auditoria_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."AUDITORIA_id_auditoria_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: AUDITORIA_id_auditoria_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."AUDITORIA_id_auditoria_seq" OWNED BY public."AUDITORIA".id_auditoria;


--
-- Name: CITA_MEDICA; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CITA_MEDICA" (
    id_cita integer NOT NULL,
    id_mascota integer NOT NULL,
    id_sede integer NOT NULL,
    id_veterinario integer NOT NULL,
    tipo_atencion character varying(50) NOT NULL,
    fecha_hora timestamp without time zone NOT NULL,
    estado character varying(20) NOT NULL,
    CONSTRAINT "CITA_MEDICA_estado_check" CHECK (((estado)::text = ANY ((ARRAY['Programada'::character varying, 'Completada'::character varying, 'Cancelada'::character varying])::text[]))),
    CONSTRAINT "CITA_MEDICA_tipo_atencion_check" CHECK (((tipo_atencion)::text = ANY ((ARRAY['Sede'::character varying, 'Domicilio'::character varying])::text[])))
);


--
-- Name: CITA_MEDICA_id_cita_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."CITA_MEDICA_id_cita_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: CITA_MEDICA_id_cita_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."CITA_MEDICA_id_cita_seq" OWNED BY public."CITA_MEDICA".id_cita;


--
-- Name: ESPECIE; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ESPECIE" (
    id_especie integer NOT NULL,
    nombre_especie character varying(50) NOT NULL
);


--
-- Name: ESPECIE_id_especie_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ESPECIE_id_especie_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ESPECIE_id_especie_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ESPECIE_id_especie_seq" OWNED BY public."ESPECIE".id_especie;


--
-- Name: FICHA_CLINICA; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FICHA_CLINICA" (
    id_ficha integer NOT NULL,
    id_cita integer NOT NULL,
    diagnostico text,
    tratamiento text,
    estado boolean DEFAULT true,
    id_usuario_modificador integer
);


--
-- Name: FICHA_CLINICA_id_ficha_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."FICHA_CLINICA_id_ficha_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: FICHA_CLINICA_id_ficha_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."FICHA_CLINICA_id_ficha_seq" OWNED BY public."FICHA_CLINICA".id_ficha;


--
-- Name: INVENTARIO; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."INVENTARIO" (
    id_inventario integer NOT NULL,
    id_sede integer NOT NULL,
    id_medicamento integer NOT NULL,
    stock_actual integer NOT NULL,
    CONSTRAINT "INVENTARIO_stock_actual_check" CHECK ((stock_actual >= 0))
);


--
-- Name: INVENTARIO_id_inventario_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."INVENTARIO_id_inventario_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: INVENTARIO_id_inventario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."INVENTARIO_id_inventario_seq" OWNED BY public."INVENTARIO".id_inventario;


--
-- Name: MASCOTA; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MASCOTA" (
    id_mascota integer NOT NULL,
    id_especie integer NOT NULL,
    id_tutor integer NOT NULL,
    nombre_mascota character varying(100) NOT NULL
);


--
-- Name: MASCOTA_id_mascota_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."MASCOTA_id_mascota_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: MASCOTA_id_mascota_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."MASCOTA_id_mascota_seq" OWNED BY public."MASCOTA".id_mascota;


--
-- Name: MEDICAMENTO; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MEDICAMENTO" (
    id_medicamento integer NOT NULL,
    nombre_comercial character varying(100) NOT NULL,
    principio_activo character varying(100) NOT NULL
);


--
-- Name: MEDICAMENTO_id_medicamento_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."MEDICAMENTO_id_medicamento_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: MEDICAMENTO_id_medicamento_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."MEDICAMENTO_id_medicamento_seq" OWNED BY public."MEDICAMENTO".id_medicamento;


--
-- Name: PLAN_VACUNACION; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PLAN_VACUNACION" (
    id_vacuna integer NOT NULL,
    id_especie integer NOT NULL,
    nombre_vacuna character varying(100) NOT NULL,
    cantidad_refuerzo integer NOT NULL,
    dias_refuerzo integer NOT NULL,
    CONSTRAINT "PLAN_VACUNACION_cantidad_refuerzo_check" CHECK ((cantidad_refuerzo >= 0)),
    CONSTRAINT "PLAN_VACUNACION_dias_refuerzo_check" CHECK ((dias_refuerzo >= 0))
);


--
-- Name: PLAN_VACUNACION_id_vacuna_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."PLAN_VACUNACION_id_vacuna_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: PLAN_VACUNACION_id_vacuna_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."PLAN_VACUNACION_id_vacuna_seq" OWNED BY public."PLAN_VACUNACION".id_vacuna;


--
-- Name: RECETA; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RECETA" (
    id_receta integer NOT NULL,
    id_ficha integer NOT NULL,
    id_medicamento integer NOT NULL,
    cantidad_entregada integer NOT NULL,
    CONSTRAINT "RECETA_cantidad_entregada_check" CHECK ((cantidad_entregada > 0))
);


--
-- Name: RECETA_id_receta_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."RECETA_id_receta_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: RECETA_id_receta_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."RECETA_id_receta_seq" OWNED BY public."RECETA".id_receta;


--
-- Name: REGISTRO_VACUNACION; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."REGISTRO_VACUNACION" (
    id_registro integer NOT NULL,
    id_vacuna integer NOT NULL,
    id_mascota integer NOT NULL,
    id_cita integer,
    fecha_aplicacion date NOT NULL,
    vencimiento_vacuna date NOT NULL,
    numero_refuerzo integer NOT NULL
);


--
-- Name: REGISTRO_VACUNACION_id_registro_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."REGISTRO_VACUNACION_id_registro_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: REGISTRO_VACUNACION_id_registro_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."REGISTRO_VACUNACION_id_registro_seq" OWNED BY public."REGISTRO_VACUNACION".id_registro;


--
-- Name: ROL; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ROL" (
    id_rol integer NOT NULL,
    nombre_rol character varying(50) NOT NULL
);


--
-- Name: ROL_id_rol_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ROL_id_rol_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ROL_id_rol_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ROL_id_rol_seq" OWNED BY public."ROL".id_rol;


--
-- Name: SEDE; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SEDE" (
    id_sede integer NOT NULL,
    nombre character varying(100) NOT NULL
);


--
-- Name: SEDE_id_sede_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."SEDE_id_sede_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: SEDE_id_sede_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."SEDE_id_sede_seq" OWNED BY public."SEDE".id_sede;


--
-- Name: TUTOR; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TUTOR" (
    id_tutor integer NOT NULL,
    id_usuario integer NOT NULL,
    nombre_tutor character varying(100) NOT NULL
);


--
-- Name: TUTOR_id_tutor_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."TUTOR_id_tutor_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: TUTOR_id_tutor_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."TUTOR_id_tutor_seq" OWNED BY public."TUTOR".id_tutor;


--
-- Name: USUARIO; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."USUARIO" (
    id_usuario integer NOT NULL,
    id_rol integer NOT NULL,
    email character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    activo boolean DEFAULT true
);


--
-- Name: USUARIO_id_usuario_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."USUARIO_id_usuario_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: USUARIO_id_usuario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."USUARIO_id_usuario_seq" OWNED BY public."USUARIO".id_usuario;


--
-- Name: VETERINARIO; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."VETERINARIO" (
    id_veterinario integer NOT NULL,
    id_usuario integer NOT NULL,
    id_sede integer NOT NULL,
    nombre_veterinario character varying(100) NOT NULL
);


--
-- Name: VETERINARIO_id_veterinario_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."VETERINARIO_id_veterinario_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: VETERINARIO_id_veterinario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."VETERINARIO_id_veterinario_seq" OWNED BY public."VETERINARIO".id_veterinario;


--
-- Name: mv_estadisticas_atencion; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.mv_estadisticas_atencion AS
 SELECT s.nombre AS nombre_sede,
    e.nombre_especie AS especie,
    count(f.id_ficha) AS cantidad_atenciones,
    mode() WITHIN GROUP (ORDER BY f.diagnostico) AS diagnostico_mas_frecuente
   FROM ((((public."FICHA_CLINICA" f
     JOIN public."CITA_MEDICA" c ON ((f.id_cita = c.id_cita)))
     JOIN public."SEDE" s ON ((c.id_sede = s.id_sede)))
     JOIN public."MASCOTA" m ON ((c.id_mascota = m.id_mascota)))
     JOIN public."ESPECIE" e ON ((m.id_especie = e.id_especie)))
  WHERE ((c.fecha_hora >= (CURRENT_DATE - '1 year'::interval)) AND (f.diagnostico IS NOT NULL))
  GROUP BY s.nombre, e.nombre_especie
  WITH NO DATA;


--
-- Name: ADMINISTRADOR id_administrador; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ADMINISTRADOR" ALTER COLUMN id_administrador SET DEFAULT nextval('public."ADMINISTRADOR_id_administrador_seq"'::regclass);


--
-- Name: ALERGIA_MASCOTA id_alergia; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ALERGIA_MASCOTA" ALTER COLUMN id_alergia SET DEFAULT nextval('public."ALERGIA_MASCOTA_id_alergia_seq"'::regclass);


--
-- Name: AUDITORIA id_auditoria; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AUDITORIA" ALTER COLUMN id_auditoria SET DEFAULT nextval('public."AUDITORIA_id_auditoria_seq"'::regclass);


--
-- Name: CITA_MEDICA id_cita; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CITA_MEDICA" ALTER COLUMN id_cita SET DEFAULT nextval('public."CITA_MEDICA_id_cita_seq"'::regclass);


--
-- Name: ESPECIE id_especie; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ESPECIE" ALTER COLUMN id_especie SET DEFAULT nextval('public."ESPECIE_id_especie_seq"'::regclass);


--
-- Name: FICHA_CLINICA id_ficha; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FICHA_CLINICA" ALTER COLUMN id_ficha SET DEFAULT nextval('public."FICHA_CLINICA_id_ficha_seq"'::regclass);


--
-- Name: INVENTARIO id_inventario; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."INVENTARIO" ALTER COLUMN id_inventario SET DEFAULT nextval('public."INVENTARIO_id_inventario_seq"'::regclass);


--
-- Name: MASCOTA id_mascota; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MASCOTA" ALTER COLUMN id_mascota SET DEFAULT nextval('public."MASCOTA_id_mascota_seq"'::regclass);


--
-- Name: MEDICAMENTO id_medicamento; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MEDICAMENTO" ALTER COLUMN id_medicamento SET DEFAULT nextval('public."MEDICAMENTO_id_medicamento_seq"'::regclass);


--
-- Name: PLAN_VACUNACION id_vacuna; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PLAN_VACUNACION" ALTER COLUMN id_vacuna SET DEFAULT nextval('public."PLAN_VACUNACION_id_vacuna_seq"'::regclass);


--
-- Name: RECETA id_receta; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RECETA" ALTER COLUMN id_receta SET DEFAULT nextval('public."RECETA_id_receta_seq"'::regclass);


--
-- Name: REGISTRO_VACUNACION id_registro; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."REGISTRO_VACUNACION" ALTER COLUMN id_registro SET DEFAULT nextval('public."REGISTRO_VACUNACION_id_registro_seq"'::regclass);


--
-- Name: ROL id_rol; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ROL" ALTER COLUMN id_rol SET DEFAULT nextval('public."ROL_id_rol_seq"'::regclass);


--
-- Name: SEDE id_sede; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SEDE" ALTER COLUMN id_sede SET DEFAULT nextval('public."SEDE_id_sede_seq"'::regclass);


--
-- Name: TUTOR id_tutor; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TUTOR" ALTER COLUMN id_tutor SET DEFAULT nextval('public."TUTOR_id_tutor_seq"'::regclass);


--
-- Name: USUARIO id_usuario; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."USUARIO" ALTER COLUMN id_usuario SET DEFAULT nextval('public."USUARIO_id_usuario_seq"'::regclass);


--
-- Name: VETERINARIO id_veterinario; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VETERINARIO" ALTER COLUMN id_veterinario SET DEFAULT nextval('public."VETERINARIO_id_veterinario_seq"'::regclass);


--
-- Data for Name: ADMINISTRADOR; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ADMINISTRADOR" (id_administrador, id_usuario, nombre_administrador) FROM stdin;
1	11	Administrador General
\.


--
-- Data for Name: ALERGIA_MASCOTA; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ALERGIA_MASCOTA" (id_alergia, id_mascota, principio_activo) FROM stdin;
1	1	Meloxicam
2	3	Cefalexina
3	5	Enrofloxacino
\.


--
-- Data for Name: AUDITORIA; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AUDITORIA" (id_auditoria, id_ficha, diagnostico_anterior, diagnostico_nuevo, id_usuario_modificador, fecha_modificacion) FROM stdin;
1	5	Otitis Externa	Otitis Externa Bilateral Crónica	1	2026-11-01 23:31:41.369058
2	9	Sobrepeso leve	Sobrepeso moderado con indicación nutricional	1	2026-11-01 23:31:41.37098
\.


--
-- Data for Name: CITA_MEDICA; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CITA_MEDICA" (id_cita, id_mascota, id_sede, id_veterinario, tipo_atencion, fecha_hora, estado) FROM stdin;
1	1	1	1	Sede	2025-03-15 10:00:00	Completada
2	2	2	2	Sede	2025-05-10 11:00:00	Completada
3	2	2	2	Sede	2025-05-31 11:00:00	Completada
4	6	3	3	Domicilio	2025-08-20 15:00:00	Completada
5	3	1	1	Sede	2025-11-12 09:30:00	Completada
6	5	2	2	Sede	2026-01-20 16:00:00	Completada
7	7	3	3	Sede	2026-02-14 10:30:00	Completada
8	9	2	2	Sede	2026-03-05 12:00:00	Cancelada
9	8	1	1	Sede	2026-04-10 14:00:00	Completada
10	1	1	1	Sede	2026-06-01 10:00:00	Completada
11	5	2	2	Sede	2026-07-15 11:30:00	Completada
12	10	3	3	Sede	2026-08-19 15:30:00	Completada
13	3	1	1	Sede	2026-10-15 10:00:00	Completada
14	4	3	3	Sede	2026-10-20 16:00:00	Completada
15	8	1	1	Sede	2026-10-30 11:00:00	Completada
16	4	3	3	Sede	2026-11-04 16:00:00	Programada
17	1	1	1	Sede	2026-11-05 10:00:00	Programada
18	5	2	2	Domicilio	2026-11-06 11:00:00	Programada
19	3	1	1	Sede	2026-11-14 10:00:00	Programada
20	9	2	2	Sede	2026-11-10 15:00:00	Cancelada
21	3	1	1	Sede	2026-12-14 10:00:00	Programada
\.


--
-- Data for Name: ESPECIE; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ESPECIE" (id_especie, nombre_especie) FROM stdin;
1	Perro
2	Gato
3	Pez
4	Roedor
5	Ave
\.


--
-- Data for Name: FICHA_CLINICA; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."FICHA_CLINICA" (id_ficha, id_cita, diagnostico, tratamiento, estado, id_usuario_modificador) FROM stdin;
1	1	Control sano para inmunización	Vacunación	f	1
2	2	Control sano felino	Vacunación	f	2
3	3	Refuerzo inmunológico felino	Vacunación y medicación antiparasitaria	f	2
4	4	Infección bacteriana en aletas	Cambio de parámetros de agua y reposo	f	3
6	6	Gastroenteritis aguda	Medicación e hidratación	f	2
7	7	Sobrecrecimiento dental	Desgaste clínico y dieta blanda con reposo	f	3
8	9	Otitis Externa	Medicación antiinflamatoria y reposo	f	1
10	11	Gastroenteritis aguda	Ayuno controlado y reposo en casa	f	2
11	12	Muda de plumas anormal	Suplementación vitamínica y reposo luminoso	f	3
12	13	Inmunización activa canina	Vacunación y medicación analgésica	f	1
13	14	Chequeo preventivo aviar	Vacunación preventiva	f	3
14	15	Control anual preventivo	Vacunación de dosis única	f	1
15	16	\N	\N	t	\N
16	17	\N	\N	t	\N
17	18	\N	\N	t	\N
18	19	\N	\N	t	\N
19	21	\N	\N	t	\N
5	5	Otitis Externa Bilateral Crónica	Medicación tópica y limpieza	f	1
9	10	Sobrepeso moderado con indicación nutricional	Rutina de ejercicio diario y dieta estricta	f	1
\.


--
-- Data for Name: INVENTARIO; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."INVENTARIO" (id_inventario, id_sede, id_medicamento, stock_actual) FROM stdin;
1	1	1	50
2	1	2	40
3	1	3	30
4	1	4	60
5	1	5	25
6	2	1	45
7	2	2	50
8	2	3	20
9	2	4	35
10	2	5	40
11	3	1	60
12	3	2	30
13	3	3	45
14	3	4	50
15	3	5	30
\.


--
-- Data for Name: MASCOTA; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MASCOTA" (id_mascota, id_especie, id_tutor, nombre_mascota) FROM stdin;
1	1	1	Firulais
2	2	1	Michi
3	1	2	Rex
4	5	2	Piolín
5	2	3	Luna
6	3	4	Nemo
7	4	5	Hamtaro
8	1	5	Thor
9	2	6	Simba
10	5	7	Kiwi
\.


--
-- Data for Name: MEDICAMENTO; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MEDICAMENTO" (id_medicamento, nombre_comercial, principio_activo) FROM stdin;
1	Meloxivet 15mg	Meloxicam
2	Cefapet 500mg	Cefalexina
3	Apoquel 16mg	Oclacitinib
4	Enroflox 50mg	Enrofloxacino
5	Tramadol Vet 50mg	Tramadol
\.


--
-- Data for Name: PLAN_VACUNACION; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PLAN_VACUNACION" (id_vacuna, id_especie, nombre_vacuna, cantidad_refuerzo, dias_refuerzo) FROM stdin;
1	1	Antirrábica Canina	0	0
2	1	Óctuple Canina	2	30
3	2	Triple Felina	1	21
4	5	Viruela Aviar	1	15
\.


--
-- Data for Name: RECETA; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RECETA" (id_receta, id_ficha, id_medicamento, cantidad_entregada) FROM stdin;
1	3	5	1
2	5	3	2
3	6	1	1
4	8	1	2
5	12	5	1
\.


--
-- Data for Name: REGISTRO_VACUNACION; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."REGISTRO_VACUNACION" (id_registro, id_vacuna, id_mascota, id_cita, fecha_aplicacion, vencimiento_vacuna, numero_refuerzo) FROM stdin;
1	1	1	1	2025-03-15	2025-03-15	0
2	3	2	2	2025-05-10	2025-05-31	0
3	3	2	3	2025-05-31	2025-06-21	1
4	2	3	13	2026-10-15	2026-11-14	0
5	4	4	14	2026-10-20	2026-11-04	0
6	1	8	15	2026-10-30	2026-10-30	0
\.


--
-- Data for Name: ROL; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ROL" (id_rol, nombre_rol) FROM stdin;
1	Administrador
2	Veterinario
3	Tutor
\.


--
-- Data for Name: SEDE; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SEDE" (id_sede, nombre) FROM stdin;
1	Sede Norte
2	Sede Centro
3	Sede Sur
\.


--
-- Data for Name: TUTOR; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TUTOR" (id_tutor, id_usuario, nombre_tutor) FROM stdin;
1	4	Carlos Mendoza
2	5	Lucía Fernández
3	6	Pedro González
4	7	Ana Torres
5	8	Diego Rojas
6	9	Sofía Vargas
7	10	Mateo Lagos
\.


--
-- Data for Name: USUARIO; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."USUARIO" (id_usuario, id_rol, email, password_hash, activo) FROM stdin;
1	2	vet.norte@redvet.cl	$2a$10$8O2gI.rWk9jFx5x7JEaj7.s0k2ty6obnfp4WVH0tBkdcFlFC0Cv9.	t
2	2	vet.centro@redvet.cl	$2a$10$OJET3rFO3gIIykF8P9AOfuVHT9FDCbTenaESZm8tbRLRP6c9iMg2y	t
3	2	vet.sur@redvet.cl	$2a$10$HpSiOgJv4uJlFGkHwNBQeOiTvCc2FdFQfwnBKqLSP6erTDMTcmGSK	t
4	3	carlos.m@gmail.com	$2a$10$jFui.XKVlIZFxuNCyl5e7e1UJOspgSYBI40mXn547DapnWOWiwoE.	t
5	3	lucia.f@gmail.com	$2a$10$7K0NhPyAzrer5R6d/5hS9e1Dc9AOFhlzLJD6.ne8VQVcxmVHXxKUK	t
6	3	pedro.g@gmail.com	$2a$10$0QqHz/pvYukk.K25oH71Qe8Nat7HVGNT8a.TBOmEuCQ5V50JF5SnK	t
7	3	ana.t@gmail.com	$2a$10$yJQgF9TbtfDBUMLqeCOVy.ozgt/652xpEUKMmZEyXII8OUWund2L.	t
8	3	diego.r@gmail.com	$2a$10$4xgDwA804SdR4t023QupcOfjLUF9.cx2oL6yLAgZzPiT0VZTUmoU6	t
9	3	sofia.v@gmail.com	$2a$10$VpVaHo1sHgeaBVzfOLGcIOE5G6RN6T7wPAB2tiRk715RJKZU8upyq	t
10	3	mateo.l@gmail.com	$2a$10$6v9FHwQKv/k99kA8gL/pj.OwEwyQUyhNsVq.SrGPldApAiLB9EUZq	t
11	1	admin@redvet.cl	$2b$10$FX/lTYzBZ2KUMzjlyHf1ieo/2ZHqvy26SZhepPmYQEW9MFOTTFvdC	t
\.


--
-- Data for Name: VETERINARIO; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."VETERINARIO" (id_veterinario, id_usuario, id_sede, nombre_veterinario) FROM stdin;
1	1	1	Dra. Camila Soto
2	2	2	Dr. Andrés Valdés
3	3	3	Dra. Valentina Pino
\.


--
-- Name: ADMINISTRADOR_id_administrador_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ADMINISTRADOR_id_administrador_seq"', 1, true);


--
-- Name: ALERGIA_MASCOTA_id_alergia_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ALERGIA_MASCOTA_id_alergia_seq"', 3, true);


--
-- Name: AUDITORIA_id_auditoria_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."AUDITORIA_id_auditoria_seq"', 2, true);


--
-- Name: CITA_MEDICA_id_cita_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."CITA_MEDICA_id_cita_seq"', 21, true);


--
-- Name: ESPECIE_id_especie_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ESPECIE_id_especie_seq"', 5, true);


--
-- Name: FICHA_CLINICA_id_ficha_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."FICHA_CLINICA_id_ficha_seq"', 19, true);


--
-- Name: INVENTARIO_id_inventario_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."INVENTARIO_id_inventario_seq"', 15, true);


--
-- Name: MASCOTA_id_mascota_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."MASCOTA_id_mascota_seq"', 10, true);


--
-- Name: MEDICAMENTO_id_medicamento_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."MEDICAMENTO_id_medicamento_seq"', 5, true);


--
-- Name: PLAN_VACUNACION_id_vacuna_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."PLAN_VACUNACION_id_vacuna_seq"', 4, true);


--
-- Name: RECETA_id_receta_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."RECETA_id_receta_seq"', 5, true);


--
-- Name: REGISTRO_VACUNACION_id_registro_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."REGISTRO_VACUNACION_id_registro_seq"', 6, true);


--
-- Name: ROL_id_rol_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."ROL_id_rol_seq"', 3, true);


--
-- Name: SEDE_id_sede_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."SEDE_id_sede_seq"', 3, true);


--
-- Name: TUTOR_id_tutor_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."TUTOR_id_tutor_seq"', 7, true);


--
-- Name: USUARIO_id_usuario_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."USUARIO_id_usuario_seq"', 11, true);


--
-- Name: VETERINARIO_id_veterinario_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."VETERINARIO_id_veterinario_seq"', 3, true);


--
-- Name: ADMINISTRADOR ADMINISTRADOR_id_usuario_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ADMINISTRADOR"
    ADD CONSTRAINT "ADMINISTRADOR_id_usuario_key" UNIQUE (id_usuario);


--
-- Name: ADMINISTRADOR ADMINISTRADOR_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ADMINISTRADOR"
    ADD CONSTRAINT "ADMINISTRADOR_pkey" PRIMARY KEY (id_administrador);


--
-- Name: ALERGIA_MASCOTA ALERGIA_MASCOTA_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ALERGIA_MASCOTA"
    ADD CONSTRAINT "ALERGIA_MASCOTA_pkey" PRIMARY KEY (id_alergia);


--
-- Name: AUDITORIA AUDITORIA_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AUDITORIA"
    ADD CONSTRAINT "AUDITORIA_pkey" PRIMARY KEY (id_auditoria);


--
-- Name: CITA_MEDICA CITA_MEDICA_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CITA_MEDICA"
    ADD CONSTRAINT "CITA_MEDICA_pkey" PRIMARY KEY (id_cita);


--
-- Name: ESPECIE ESPECIE_nombre_especie_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ESPECIE"
    ADD CONSTRAINT "ESPECIE_nombre_especie_key" UNIQUE (nombre_especie);


--
-- Name: ESPECIE ESPECIE_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ESPECIE"
    ADD CONSTRAINT "ESPECIE_pkey" PRIMARY KEY (id_especie);


--
-- Name: FICHA_CLINICA FICHA_CLINICA_id_cita_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FICHA_CLINICA"
    ADD CONSTRAINT "FICHA_CLINICA_id_cita_key" UNIQUE (id_cita);


--
-- Name: FICHA_CLINICA FICHA_CLINICA_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FICHA_CLINICA"
    ADD CONSTRAINT "FICHA_CLINICA_pkey" PRIMARY KEY (id_ficha);


--
-- Name: INVENTARIO INVENTARIO_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."INVENTARIO"
    ADD CONSTRAINT "INVENTARIO_pkey" PRIMARY KEY (id_inventario);


--
-- Name: MASCOTA MASCOTA_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MASCOTA"
    ADD CONSTRAINT "MASCOTA_pkey" PRIMARY KEY (id_mascota);


--
-- Name: MEDICAMENTO MEDICAMENTO_nombre_comercial_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MEDICAMENTO"
    ADD CONSTRAINT "MEDICAMENTO_nombre_comercial_key" UNIQUE (nombre_comercial);


--
-- Name: MEDICAMENTO MEDICAMENTO_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MEDICAMENTO"
    ADD CONSTRAINT "MEDICAMENTO_pkey" PRIMARY KEY (id_medicamento);


--
-- Name: PLAN_VACUNACION PLAN_VACUNACION_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PLAN_VACUNACION"
    ADD CONSTRAINT "PLAN_VACUNACION_pkey" PRIMARY KEY (id_vacuna);


--
-- Name: RECETA RECETA_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RECETA"
    ADD CONSTRAINT "RECETA_pkey" PRIMARY KEY (id_receta);


--
-- Name: REGISTRO_VACUNACION REGISTRO_VACUNACION_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."REGISTRO_VACUNACION"
    ADD CONSTRAINT "REGISTRO_VACUNACION_pkey" PRIMARY KEY (id_registro);


--
-- Name: ROL ROL_nombre_rol_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ROL"
    ADD CONSTRAINT "ROL_nombre_rol_key" UNIQUE (nombre_rol);


--
-- Name: ROL ROL_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ROL"
    ADD CONSTRAINT "ROL_pkey" PRIMARY KEY (id_rol);


--
-- Name: SEDE SEDE_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SEDE"
    ADD CONSTRAINT "SEDE_nombre_key" UNIQUE (nombre);


--
-- Name: SEDE SEDE_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SEDE"
    ADD CONSTRAINT "SEDE_pkey" PRIMARY KEY (id_sede);


--
-- Name: TUTOR TUTOR_id_usuario_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TUTOR"
    ADD CONSTRAINT "TUTOR_id_usuario_key" UNIQUE (id_usuario);


--
-- Name: TUTOR TUTOR_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TUTOR"
    ADD CONSTRAINT "TUTOR_pkey" PRIMARY KEY (id_tutor);


--
-- Name: ALERGIA_MASCOTA UQ_ALERMASC_Masco_Princi; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ALERGIA_MASCOTA"
    ADD CONSTRAINT "UQ_ALERMASC_Masco_Princi" UNIQUE (id_mascota, principio_activo);


--
-- Name: INVENTARIO UQ_INVENTARIO_Sede_Med; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."INVENTARIO"
    ADD CONSTRAINT "UQ_INVENTARIO_Sede_Med" UNIQUE (id_sede, id_medicamento);


--
-- Name: MASCOTA UQ_MASCOTA_Tutor_Nombre; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MASCOTA"
    ADD CONSTRAINT "UQ_MASCOTA_Tutor_Nombre" UNIQUE (id_tutor, nombre_mascota);


--
-- Name: PLAN_VACUNACION UQ_PLANVAC_Esp_Nombre; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PLAN_VACUNACION"
    ADD CONSTRAINT "UQ_PLANVAC_Esp_Nombre" UNIQUE (id_especie, nombre_vacuna);


--
-- Name: RECETA UQ_RECETA_Ficha_Medi; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RECETA"
    ADD CONSTRAINT "UQ_RECETA_Ficha_Medi" UNIQUE (id_ficha, id_medicamento);


--
-- Name: USUARIO USUARIO_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."USUARIO"
    ADD CONSTRAINT "USUARIO_email_key" UNIQUE (email);


--
-- Name: USUARIO USUARIO_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."USUARIO"
    ADD CONSTRAINT "USUARIO_pkey" PRIMARY KEY (id_usuario);


--
-- Name: VETERINARIO VETERINARIO_id_usuario_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VETERINARIO"
    ADD CONSTRAINT "VETERINARIO_id_usuario_key" UNIQUE (id_usuario);


--
-- Name: VETERINARIO VETERINARIO_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VETERINARIO"
    ADD CONSTRAINT "VETERINARIO_pkey" PRIMARY KEY (id_veterinario);


--
-- Name: idx_cita_fecha_hora; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cita_fecha_hora ON public."CITA_MEDICA" USING btree (fecha_hora);


--
-- Name: idx_cita_mascota; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cita_mascota ON public."CITA_MEDICA" USING btree (id_mascota);


--
-- Name: idx_cita_vet_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cita_vet_fecha ON public."CITA_MEDICA" USING btree (id_veterinario, fecha_hora);


--
-- Name: idx_mv_estadisticas_unica; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_mv_estadisticas_unica ON public.mv_estadisticas_atencion USING btree (nombre_sede, especie);


--
-- Name: FICHA_CLINICA trg_auditoria_ficha; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auditoria_ficha AFTER UPDATE ON public."FICHA_CLINICA" FOR EACH ROW EXECUTE FUNCTION public.fn_auditar_diagnostico();


--
-- Name: RECETA trg_verificar_alergia; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_verificar_alergia BEFORE INSERT OR UPDATE ON public."RECETA" FOR EACH ROW EXECUTE FUNCTION public.fn_validar_alergia();


--
-- Name: ADMINISTRADOR FK_ADMINISTRADOR_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ADMINISTRADOR"
    ADD CONSTRAINT "FK_ADMINISTRADOR_usuario" FOREIGN KEY (id_usuario) REFERENCES public."USUARIO"(id_usuario);


--
-- Name: ALERGIA_MASCOTA FK_ALERGIA_mascota; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ALERGIA_MASCOTA"
    ADD CONSTRAINT "FK_ALERGIA_mascota" FOREIGN KEY (id_mascota) REFERENCES public."MASCOTA"(id_mascota);


--
-- Name: AUDITORIA FK_AUDITORIA_ficha; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AUDITORIA"
    ADD CONSTRAINT "FK_AUDITORIA_ficha" FOREIGN KEY (id_ficha) REFERENCES public."FICHA_CLINICA"(id_ficha);


--
-- Name: CITA_MEDICA FK_CITA_mascota; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CITA_MEDICA"
    ADD CONSTRAINT "FK_CITA_mascota" FOREIGN KEY (id_mascota) REFERENCES public."MASCOTA"(id_mascota);


--
-- Name: CITA_MEDICA FK_CITA_sede; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CITA_MEDICA"
    ADD CONSTRAINT "FK_CITA_sede" FOREIGN KEY (id_sede) REFERENCES public."SEDE"(id_sede);


--
-- Name: CITA_MEDICA FK_CITA_veterinario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CITA_MEDICA"
    ADD CONSTRAINT "FK_CITA_veterinario" FOREIGN KEY (id_veterinario) REFERENCES public."VETERINARIO"(id_veterinario);


--
-- Name: FICHA_CLINICA FK_FICHA_cita; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FICHA_CLINICA"
    ADD CONSTRAINT "FK_FICHA_cita" FOREIGN KEY (id_cita) REFERENCES public."CITA_MEDICA"(id_cita);


--
-- Name: FICHA_CLINICA FK_FICHA_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FICHA_CLINICA"
    ADD CONSTRAINT "FK_FICHA_usuario" FOREIGN KEY (id_usuario_modificador) REFERENCES public."USUARIO"(id_usuario);


--
-- Name: INVENTARIO FK_INVENTARIO_medicamento; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."INVENTARIO"
    ADD CONSTRAINT "FK_INVENTARIO_medicamento" FOREIGN KEY (id_medicamento) REFERENCES public."MEDICAMENTO"(id_medicamento);


--
-- Name: INVENTARIO FK_INVENTARIO_sede; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."INVENTARIO"
    ADD CONSTRAINT "FK_INVENTARIO_sede" FOREIGN KEY (id_sede) REFERENCES public."SEDE"(id_sede);


--
-- Name: MASCOTA FK_MASCOTA_especie; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MASCOTA"
    ADD CONSTRAINT "FK_MASCOTA_especie" FOREIGN KEY (id_especie) REFERENCES public."ESPECIE"(id_especie);


--
-- Name: MASCOTA FK_MASCOTA_tutor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MASCOTA"
    ADD CONSTRAINT "FK_MASCOTA_tutor" FOREIGN KEY (id_tutor) REFERENCES public."TUTOR"(id_tutor);


--
-- Name: PLAN_VACUNACION FK_PLAN_especie; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PLAN_VACUNACION"
    ADD CONSTRAINT "FK_PLAN_especie" FOREIGN KEY (id_especie) REFERENCES public."ESPECIE"(id_especie);


--
-- Name: RECETA FK_RECETA_ficha; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RECETA"
    ADD CONSTRAINT "FK_RECETA_ficha" FOREIGN KEY (id_ficha) REFERENCES public."FICHA_CLINICA"(id_ficha);


--
-- Name: RECETA FK_RECETA_medicamento; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RECETA"
    ADD CONSTRAINT "FK_RECETA_medicamento" FOREIGN KEY (id_medicamento) REFERENCES public."MEDICAMENTO"(id_medicamento);


--
-- Name: REGISTRO_VACUNACION FK_REGVAC_cita; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."REGISTRO_VACUNACION"
    ADD CONSTRAINT "FK_REGVAC_cita" FOREIGN KEY (id_cita) REFERENCES public."CITA_MEDICA"(id_cita);


--
-- Name: REGISTRO_VACUNACION FK_REGVAC_mascota; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."REGISTRO_VACUNACION"
    ADD CONSTRAINT "FK_REGVAC_mascota" FOREIGN KEY (id_mascota) REFERENCES public."MASCOTA"(id_mascota);


--
-- Name: REGISTRO_VACUNACION FK_REGVAC_vacuna; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."REGISTRO_VACUNACION"
    ADD CONSTRAINT "FK_REGVAC_vacuna" FOREIGN KEY (id_vacuna) REFERENCES public."PLAN_VACUNACION"(id_vacuna);


--
-- Name: TUTOR FK_TUTOR_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TUTOR"
    ADD CONSTRAINT "FK_TUTOR_usuario" FOREIGN KEY (id_usuario) REFERENCES public."USUARIO"(id_usuario);


--
-- Name: USUARIO FK_USUARIO_rol; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."USUARIO"
    ADD CONSTRAINT "FK_USUARIO_rol" FOREIGN KEY (id_rol) REFERENCES public."ROL"(id_rol);


--
-- Name: VETERINARIO FK_VETERINARIO_sede; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VETERINARIO"
    ADD CONSTRAINT "FK_VETERINARIO_sede" FOREIGN KEY (id_sede) REFERENCES public."SEDE"(id_sede);


--
-- Name: VETERINARIO FK_VETERINARIO_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."VETERINARIO"
    ADD CONSTRAINT "FK_VETERINARIO_usuario" FOREIGN KEY (id_usuario) REFERENCES public."USUARIO"(id_usuario);


--
-- Name: mv_estadisticas_atencion; Type: MATERIALIZED VIEW DATA; Schema: public; Owner: -
--

REFRESH MATERIALIZED VIEW public.mv_estadisticas_atencion;


--
-- PostgreSQL database dump complete
--

\unrestrict cwPMX6GEgjahBDoT373NSxwdwVWjqDupguHXMOiyZr4955FI6B9r1nqIF3gO9zg

