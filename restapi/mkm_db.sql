--
-- PostgreSQL database dump
--

-- Dumped from database version 14.7 (Ubuntu 14.7-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.7 (Ubuntu 14.7-0ubuntu0.22.04.1)

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
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';

SET default_tablespace = '';
SET default_table_access_method = heap;

--
-- Name: users; Type: TABLE; Schema: public; Owner: mkm_user
--

CREATE TABLE public.users (
    user_id uuid DEFAULT public.gen_random_uuid() NOT NULL,
    username character varying(40) NOT NULL,
    fullname character varying(100) NOT NULL,
    birthdate date NOT NULL,
    emailid character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    account_creation_time timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_pkey PRIMARY KEY (user_id),
    CONSTRAINT unique_email UNIQUE (emailid),
    CONSTRAINT unique_username UNIQUE (username)
);


--
-- Name: feelings; Type: TABLE; Schema: public; Owner: mkm_user
--

CREATE TABLE public.feelings (
    feeling_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name character varying(20) NOT NULL,
    CONSTRAINT unique_feeling UNIQUE (name)
);


--
-- Name: moments; Type: TABLE; Schema: public; Owner: mkm_user
--

CREATE TABLE public.moments (
    moment_id uuid DEFAULT public.gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(100) NOT NULL,
    description character varying(2000) NOT NULL,
    moment_date date NOT NULL,
    image_path character varying(255),
    image_caption character varying(100),
    created_date timestamp with time zone DEFAULT now() NOT NULL,
    last_modified_date timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT moments_pkey PRIMARY KEY (moment_id),
    CONSTRAINT fk_user FOREIGN KEY (user_id)
        REFERENCES public.users(user_id) ON DELETE CASCADE
);


--
-- Name: moment_feelings; Type: TABLE; Schema: public; Owner: mkm_user
--

CREATE TABLE public.moment_feelings (
    moment_id uuid NOT NULL,
    feeling_id integer NOT NULL,
    CONSTRAINT moment_feelings_pkey PRIMARY KEY (moment_id, feeling_id),
    CONSTRAINT fk_feeling FOREIGN KEY (feeling_id)
        REFERENCES public.feelings(feeling_id) ON DELETE RESTRICT,
    CONSTRAINT fk_moment FOREIGN KEY (moment_id)
        REFERENCES public.moments(moment_id) ON DELETE CASCADE
);


--
-- Indexes
--

CREATE INDEX idx_moments_user ON public.moments USING hash (user_id);
CREATE INDEX idx_moments_date ON public.moments USING btree (moment_date);
CREATE INDEX idx_feelings_name ON public.feelings USING hash (name);
CREATE INDEX idx_moment_feelings ON public.moment_feelings USING btree (moment_id);

--
-- PostgreSQL database dump complete
--
