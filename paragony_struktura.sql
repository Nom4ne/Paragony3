--
-- PostgreSQL database dump
--

\restrict fEYsgj8BCj0Uv4GUQapGQnDDoNlmpIuM0hfmovWeb6obcrk2vdQqEdqAascLVmj

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public."ClientWeeklyConfigs" DROP CONSTRAINT IF EXISTS fk_config_client;
ALTER TABLE IF EXISTS ONLY public."Receipts" DROP CONSTRAINT IF EXISTS "Receipts_TemplateId_fkey";
ALTER TABLE IF EXISTS ONLY public."Receipts" DROP CONSTRAINT IF EXISTS "Receipts_PaymentMethodId_fkey";
ALTER TABLE IF EXISTS ONLY public."Receipts" DROP CONSTRAINT IF EXISTS "Receipts_ClientId_fkey";
ALTER TABLE IF EXISTS ONLY public."ReceiptTemplates" DROP CONSTRAINT IF EXISTS "ReceiptTemplates_ClientId_fkey";
ALTER TABLE IF EXISTS ONLY public."ReceiptItems" DROP CONSTRAINT IF EXISTS "ReceiptItems_ReceiptId_fkey";
ALTER TABLE IF EXISTS ONLY public."ReceiptItems" DROP CONSTRAINT IF EXISTS "ReceiptItems_ProductId_fkey";
ALTER TABLE IF EXISTS ONLY public."Products" DROP CONSTRAINT IF EXISTS "Products_ClientId_fkey";
DROP TRIGGER IF EXISTS trg_set_printed_timestamp ON public."Receipts";
DROP TRIGGER IF EXISTS trg_calculate_product_price ON public."Products";
DROP TRIGGER IF EXISTS trg_calculate_item_total ON public."ReceiptItems";
DROP TRIGGER IF EXISTS trg_auto_create_config ON public."Clients";
DROP INDEX IF EXISTS public.idx_receipts_status;
DROP INDEX IF EXISTS public.idx_receipts_number;
DROP INDEX IF EXISTS public.idx_receipts_created;
DROP INDEX IF EXISTS public.idx_receipts_client;
DROP INDEX IF EXISTS public.idx_receipt_templates_client;
DROP INDEX IF EXISTS public.idx_receipt_items_receipt;
DROP INDEX IF EXISTS public.idx_receipt_items_product;
DROP INDEX IF EXISTS public.idx_products_name;
DROP INDEX IF EXISTS public.idx_products_client;
DROP INDEX IF EXISTS public.idx_payment_methods_active;
DROP INDEX IF EXISTS public.idx_clients_nip;
DROP INDEX IF EXISTS public.idx_clients_email;
ALTER TABLE IF EXISTS ONLY public."ClientWeeklyConfigs" DROP CONSTRAINT IF EXISTS uq_config_client;
ALTER TABLE IF EXISTS ONLY public."Receipts" DROP CONSTRAINT IF EXISTS "Receipts_pkey";
ALTER TABLE IF EXISTS ONLY public."Receipts" DROP CONSTRAINT IF EXISTS "Receipts_ClientId_ReceiptNumber_key";
ALTER TABLE IF EXISTS ONLY public."ReceiptTemplates" DROP CONSTRAINT IF EXISTS "ReceiptTemplates_pkey";
ALTER TABLE IF EXISTS ONLY public."ReceiptItems" DROP CONSTRAINT IF EXISTS "ReceiptItems_pkey";
ALTER TABLE IF EXISTS ONLY public."Products" DROP CONSTRAINT IF EXISTS "Products_pkey";
ALTER TABLE IF EXISTS ONLY public."PaymentMethods" DROP CONSTRAINT IF EXISTS "PaymentMethods_pkey";
ALTER TABLE IF EXISTS ONLY public."Clients" DROP CONSTRAINT IF EXISTS "Clients_pkey";
ALTER TABLE IF EXISTS ONLY public."ClientWeeklyConfigs" DROP CONSTRAINT IF EXISTS "ClientWeeklyConfigs_pkey";
DROP TABLE IF EXISTS public."Receipts";
DROP TABLE IF EXISTS public."ReceiptTemplates";
DROP TABLE IF EXISTS public."ReceiptItems";
DROP TABLE IF EXISTS public."Products";
DROP TABLE IF EXISTS public."PaymentMethods";
DROP TABLE IF EXISTS public."Clients";
DROP TABLE IF EXISTS public."ClientWeeklyConfigs";
DROP FUNCTION IF EXISTS public.set_printed_timestamp();
DROP FUNCTION IF EXISTS public.generate_receipt_number(client_id integer);
DROP FUNCTION IF EXISTS public.create_default_config_for_client();
DROP FUNCTION IF EXISTS public.calculate_receipt_item_total();
DROP FUNCTION IF EXISTS public.calculate_price_on_insert();
DROP PROCEDURE IF EXISTS public.aktualizuj_ceny_wszystkich_klientow();
--
-- Name: aktualizuj_ceny_wszystkich_klientow(); Type: PROCEDURE; Schema: public; Owner: db_username
--

CREATE PROCEDURE public.aktualizuj_ceny_wszystkich_klientow()
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_dzien_tygodnia integer;
BEGIN
    -- 1. Pobierz numer dnia tygodnia (1 = Poniedziałek, ..., 7 = Niedziela)
    v_dzien_tygodnia := EXTRACT(ISODOW FROM CURRENT_DATE);

    -- 2. Wykonaj masową aktualizację (BULK UPDATE)
    -- Łączymy tabelę Products (p) z ClientWeeklyConfigs (c)
    UPDATE public."Products" p
    SET "Price" = p."BasePrice" * CASE v_dzien_tygodnia
            WHEN 1 THEN c."MondayPercent"
            WHEN 2 THEN c."TuesdayPercent"
            WHEN 3 THEN c."WednesdayPercent"
            WHEN 4 THEN c."ThursdayPercent"
            WHEN 5 THEN c."FridayPercent"
            WHEN 6 THEN c."SaturdayPercent"
            WHEN 7 THEN c."SundayPercent"
            ELSE 1.00 -- Zabezpieczenie (np. błędna data)
        END
    FROM public."ClientWeeklyConfigs" c
    WHERE p."ClientId" = c."ClientId"    -- Złącz po ID klienta
      AND p."IsDynamicPrice" = true;     -- Tylko produkty z flagą dynamiczną

    -- Opcjonalnie: Logowanie
    RAISE NOTICE 'Zaktualizowano ceny globalnie dla dnia tygodnia numer: %', v_dzien_tygodnia;

    COMMIT;
END;
$$;


ALTER PROCEDURE public.aktualizuj_ceny_wszystkich_klientow() OWNER TO db_username;

--
-- Name: calculate_price_on_insert(); Type: FUNCTION; Schema: public; Owner: db_username
--

CREATE FUNCTION public.calculate_price_on_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_today_dow INTEGER;
    v_multiplier NUMERIC(5,2) := 1.00;
BEGIN
    -- Jeśli produkt nie jest dynamiczny, Cena = Cena Bazowa
    IF NEW."IsDynamicPrice" = false THEN
        NEW."Price" := NEW."BasePrice";
        RETURN NEW;
    END IF;

    -- Pobieramy dzisiejszy dzień
    v_today_dow := EXTRACT(ISODOW FROM CURRENT_DATE);

    -- Pobieramy mnożnik dla właściciela tego produktu na dziś
    SELECT 
        CASE v_today_dow
            WHEN 1 THEN c."MondayPercent"
            WHEN 2 THEN c."TuesdayPercent"
            WHEN 3 THEN c."WednesdayPercent"
            WHEN 4 THEN c."ThursdayPercent"
            WHEN 5 THEN c."FridayPercent"
            WHEN 6 THEN c."SaturdayPercent"
            WHEN 7 THEN c."SundayPercent"
            ELSE 1.00
        END
    INTO v_multiplier
    FROM "ClientWeeklyConfigs" c
    WHERE c."ClientId" = NEW."ClientId";

    -- Jeśli nie znaleziono konfiguracji (NULL), ustaw 1.00
    IF v_multiplier IS NULL THEN 
        v_multiplier := 1.00;
    END IF;

    -- Ustawiamy obliczoną cenę
    NEW."Price" := ROUND(NEW."BasePrice" * v_multiplier, 2);

    RETURN NEW;
END;
$$;


ALTER FUNCTION public.calculate_price_on_insert() OWNER TO db_username;

--
-- Name: calculate_receipt_item_total(); Type: FUNCTION; Schema: public; Owner: db_username
--

CREATE FUNCTION public.calculate_receipt_item_total() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW."TotalPrice" := NEW."Quantity" * NEW."UnitPrice";
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.calculate_receipt_item_total() OWNER TO db_username;

--
-- Name: create_default_config_for_client(); Type: FUNCTION; Schema: public; Owner: db_username
--

CREATE FUNCTION public.create_default_config_for_client() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Wstawiamy nowy wiersz do tabeli konfiguracji
    -- Używamy NEW."Id", który odnosi się do właśnie dodanego klienta
    INSERT INTO "ClientWeeklyConfigs" ("ClientId")
    VALUES (NEW."Id");
    
    -- Zwracamy NEW, aby proces INSERT do tabeli Clients przebiegł pomyślnie
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.create_default_config_for_client() OWNER TO db_username;

--
-- Name: generate_receipt_number(integer); Type: FUNCTION; Schema: public; Owner: db_username
--

CREATE FUNCTION public.generate_receipt_number(client_id integer) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    last_number VARCHAR(50);
    counter INT;
    new_number VARCHAR(50);
BEGIN
    -- Pobierz OSTATNI numer paragonu dla danego klienta
    SELECT "ReceiptNumber" INTO last_number
    FROM "Receipts"
    WHERE "ClientId" = client_id
    ORDER BY "Id" DESC
    LIMIT 1;
    
    -- Jeśli nie ma żadnych paragonów, zacznij od 1
    IF last_number IS NULL THEN
        counter := 1;
    ELSE
        -- Wyciągnij liczbę z numeru (usuń 'A' i zamień na INT)
        counter := CAST(SUBSTRING(last_number FROM 2) AS INT) + 1;
    END IF;
    
    -- Wygeneruj numer w formacie A000000001
    new_number := 'A' || LPAD(counter::TEXT, 9, '0');
    
    RETURN new_number;
END;
$$;


ALTER FUNCTION public.generate_receipt_number(client_id integer) OWNER TO db_username;

--
-- Name: set_printed_timestamp(); Type: FUNCTION; Schema: public; Owner: db_username
--

CREATE FUNCTION public.set_printed_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW."Status" = 'printed' AND OLD."Status" != 'printed' THEN
        NEW."PrintedAt" := now();
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_printed_timestamp() OWNER TO db_username;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ClientWeeklyConfigs; Type: TABLE; Schema: public; Owner: db_username
--

CREATE TABLE public."ClientWeeklyConfigs" (
    "Id" integer NOT NULL,
    "ClientId" integer NOT NULL,
    "MondayPercent" numeric(5,2) DEFAULT 1.00 NOT NULL,
    "TuesdayPercent" numeric(5,2) DEFAULT 1.00 NOT NULL,
    "WednesdayPercent" numeric(5,2) DEFAULT 1.00 NOT NULL,
    "ThursdayPercent" numeric(5,2) DEFAULT 1.00 NOT NULL,
    "FridayPercent" numeric(5,2) DEFAULT 1.00 NOT NULL,
    "SaturdayPercent" numeric(5,2) DEFAULT 1.00 NOT NULL,
    "SundayPercent" numeric(5,2) DEFAULT 1.00 NOT NULL
);


ALTER TABLE public."ClientWeeklyConfigs" OWNER TO db_username;

--
-- Name: TABLE "ClientWeeklyConfigs"; Type: COMMENT; Schema: public; Owner: db_username
--

COMMENT ON TABLE public."ClientWeeklyConfigs" IS 'Tabela konfiguracji rabatów tygodniowych (jedna kolumna = jeden dzień)';


--
-- Name: ClientWeeklyConfigs_Id_seq; Type: SEQUENCE; Schema: public; Owner: db_username
--

ALTER TABLE public."ClientWeeklyConfigs" ALTER COLUMN "Id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."ClientWeeklyConfigs_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: Clients; Type: TABLE; Schema: public; Owner: db_username
--

CREATE TABLE public."Clients" (
    "Id" integer NOT NULL,
    "PasswordHash" character varying(255) NOT NULL,
    "Name" character varying(255),
    "NIP" character varying(20),
    "Address" character varying(500),
    "City" character varying(100),
    "PostalCode" character varying(10),
    "Phone" character varying(20),
    "Email" character varying(255),
    "CreatedAt" timestamp without time zone DEFAULT now(),
    "ContactEmail" character varying(255),
    "TwoFactorEnabled" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."Clients" OWNER TO db_username;

--
-- Name: TABLE "Clients"; Type: COMMENT; Schema: public; Owner: db_username
--

COMMENT ON TABLE public."Clients" IS 'Klienci systemu - sklepy/firmy używające drukarki fiskalnej';


--
-- Name: Clients_Id_seq; Type: SEQUENCE; Schema: public; Owner: db_username
--

ALTER TABLE public."Clients" ALTER COLUMN "Id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."Clients_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: PaymentMethods; Type: TABLE; Schema: public; Owner: db_username
--

CREATE TABLE public."PaymentMethods" (
    "Id" integer NOT NULL,
    "Name" character varying(100) NOT NULL,
    "DisplayName" character varying(100),
    "IsActive" boolean DEFAULT true
);


ALTER TABLE public."PaymentMethods" OWNER TO db_username;

--
-- Name: TABLE "PaymentMethods"; Type: COMMENT; Schema: public; Owner: db_username
--

COMMENT ON TABLE public."PaymentMethods" IS 'Słownik dostępnych metod płatności';


--
-- Name: PaymentMethods_Id_seq; Type: SEQUENCE; Schema: public; Owner: db_username
--

ALTER TABLE public."PaymentMethods" ALTER COLUMN "Id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."PaymentMethods_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: Products; Type: TABLE; Schema: public; Owner: db_username
--

CREATE TABLE public."Products" (
    "Id" integer NOT NULL,
    "ClientId" integer NOT NULL,
    "Name" character varying(255) NOT NULL,
    "Price" numeric(10,2) NOT NULL,
    "VatRate" numeric(5,2) DEFAULT 23,
    "BasePrice" numeric(10,2) DEFAULT 0 NOT NULL,
    "IsDynamicPrice" boolean DEFAULT false
);


ALTER TABLE public."Products" OWNER TO db_username;

--
-- Name: TABLE "Products"; Type: COMMENT; Schema: public; Owner: db_username
--

COMMENT ON TABLE public."Products" IS 'Katalog produktów przypisanych do klientów';


--
-- Name: Products_Id_seq; Type: SEQUENCE; Schema: public; Owner: db_username
--

ALTER TABLE public."Products" ALTER COLUMN "Id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."Products_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: ReceiptItems; Type: TABLE; Schema: public; Owner: db_username
--

CREATE TABLE public."ReceiptItems" (
    "Id" integer NOT NULL,
    "ReceiptId" integer NOT NULL,
    "ProductId" integer,
    "Name" character varying(255) NOT NULL,
    "Quantity" numeric(10,2) DEFAULT 1,
    "UnitPrice" numeric(10,2) NOT NULL,
    "VatRate" numeric(5,2),
    "TotalPrice" numeric(10,2) NOT NULL
);


ALTER TABLE public."ReceiptItems" OWNER TO db_username;

--
-- Name: TABLE "ReceiptItems"; Type: COMMENT; Schema: public; Owner: db_username
--

COMMENT ON TABLE public."ReceiptItems" IS 'Pozycje/produkty na paragonach fiskalnych';


--
-- Name: ReceiptItems_Id_seq; Type: SEQUENCE; Schema: public; Owner: db_username
--

ALTER TABLE public."ReceiptItems" ALTER COLUMN "Id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."ReceiptItems_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: ReceiptTemplates; Type: TABLE; Schema: public; Owner: db_username
--

CREATE TABLE public."ReceiptTemplates" (
    "Id" integer NOT NULL,
    "ClientId" integer NOT NULL,
    "Name" character varying(255) NOT NULL,
    "HeaderText" text,
    "FooterText" text,
    "LogoFile" character varying(512),
    "FontStyle" character varying(50) DEFAULT 'default'::character varying,
    "CreatedAt" timestamp without time zone DEFAULT now(),
    "LogoOriginalName" character varying(512)
);


ALTER TABLE public."ReceiptTemplates" OWNER TO db_username;

--
-- Name: TABLE "ReceiptTemplates"; Type: COMMENT; Schema: public; Owner: db_username
--

COMMENT ON TABLE public."ReceiptTemplates" IS 'Szablony wyglądu paragonów fiskalnych';


--
-- Name: ReceiptTemplates_Id_seq; Type: SEQUENCE; Schema: public; Owner: db_username
--

ALTER TABLE public."ReceiptTemplates" ALTER COLUMN "Id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."ReceiptTemplates_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: Receipts; Type: TABLE; Schema: public; Owner: db_username
--

CREATE TABLE public."Receipts" (
    "Id" integer NOT NULL,
    "ReceiptNumber" character varying(50) NOT NULL,
    "ClientId" integer NOT NULL,
    "TemplateId" integer,
    "PaymentMethodId" integer,
    "TotalAmount" numeric(10,2) NOT NULL,
    "TotalVat" numeric(10,2),
    "PaidAmount" numeric(10,2),
    "ChangeAmount" numeric(10,2),
    "DiscountPercent" numeric(5,2) DEFAULT 0,
    "DiscountAmount" numeric(10,2) DEFAULT 0,
    "Status" character varying(50) DEFAULT 'generated'::character varying,
    "CreatedAt" timestamp without time zone DEFAULT now(),
    "PrintedAt" timestamp without time zone
);


ALTER TABLE public."Receipts" OWNER TO db_username;

--
-- Name: TABLE "Receipts"; Type: COMMENT; Schema: public; Owner: db_username
--

COMMENT ON TABLE public."Receipts" IS 'Paragony fiskalne - nagłówki dokumentów';


--
-- Name: Receipts_Id_seq; Type: SEQUENCE; Schema: public; Owner: db_username
--

ALTER TABLE public."Receipts" ALTER COLUMN "Id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public."Receipts_Id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Data for Name: PaymentMethods; Type: TABLE DATA; Schema: public; Owner: db_username
--
--
INSERT INTO public."PaymentMethods" ("Id", "Name", "DisplayName", "IsActive") VALUES (1, 'GOTÓWKA', 'Gotówka', true);
INSERT INTO public."PaymentMethods" ("Id", "Name", "DisplayName", "IsActive") VALUES (2, 'KARTA', 'Karta płatnicza', true);
INSERT INTO public."PaymentMethods" ("Id", "Name", "DisplayName", "IsActive") VALUES (3, 'PRZELEW', 'Przelew bankowy', true);
INSERT INTO public."PaymentMethods" ("Id", "Name", "DisplayName", "IsActive") VALUES (4, 'BLIK', 'BLIK', true);

--
-- Name: ClientWeeklyConfigs ClientWeeklyConfigs_pkey; Type: CONSTRAINT; Schema: public; Owner: db_username
--

ALTER TABLE ONLY public."ClientWeeklyConfigs"
    ADD CONSTRAINT "ClientWeeklyConfigs_pkey" PRIMARY KEY ("Id");


--
-- Name: Clients Clients_pkey; Type: CONSTRAINT; Schema: public; Owner: db_username
--

ALTER TABLE ONLY public."Clients"
    ADD CONSTRAINT "Clients_pkey" PRIMARY KEY ("Id");


--
-- Name: PaymentMethods PaymentMethods_pkey; Type: CONSTRAINT; Schema: public; Owner: db_username
--

ALTER TABLE ONLY public."PaymentMethods"
    ADD CONSTRAINT "PaymentMethods_pkey" PRIMARY KEY ("Id");


--
-- Name: Products Products_pkey; Type: CONSTRAINT; Schema: public; Owner: db_username
--

ALTER TABLE ONLY public."Products"
    ADD CONSTRAINT "Products_pkey" PRIMARY KEY ("Id");


--
-- Name: ReceiptItems ReceiptItems_pkey; Type: CONSTRAINT; Schema: public; Owner: db_username
--

ALTER TABLE ONLY public."ReceiptItems"
    ADD CONSTRAINT "ReceiptItems_pkey" PRIMARY KEY ("Id");


--
-- Name: ReceiptTemplates ReceiptTemplates_pkey; Type: CONSTRAINT; Schema: public; Owner: db_username
--

ALTER TABLE ONLY public."ReceiptTemplates"
    ADD CONSTRAINT "ReceiptTemplates_pkey" PRIMARY KEY ("Id");


--
-- Name: Receipts Receipts_ClientId_ReceiptNumber_key; Type: CONSTRAINT; Schema: public; Owner: db_username
--

ALTER TABLE ONLY public."Receipts"
    ADD CONSTRAINT "Receipts_ClientId_ReceiptNumber_key" UNIQUE ("ClientId", "ReceiptNumber");


--
-- Name: Receipts Receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: db_username
--

ALTER TABLE ONLY public."Receipts"
    ADD CONSTRAINT "Receipts_pkey" PRIMARY KEY ("Id");


--
-- Name: ClientWeeklyConfigs uq_config_client; Type: CONSTRAINT; Schema: public; Owner: db_username
--

ALTER TABLE ONLY public."ClientWeeklyConfigs"
    ADD CONSTRAINT uq_config_client UNIQUE ("ClientId");


--
-- Name: idx_clients_email; Type: INDEX; Schema: public; Owner: db_username
--

CREATE INDEX idx_clients_email ON public."Clients" USING btree ("Email");


--
-- Name: idx_clients_nip; Type: INDEX; Schema: public; Owner: db_username
--

CREATE INDEX idx_clients_nip ON public."Clients" USING btree ("NIP");


--
-- Name: idx_payment_methods_active; Type: INDEX; Schema: public; Owner: db_username
--

CREATE INDEX idx_payment_methods_active ON public."PaymentMethods" USING btree ("IsActive");


--
-- Name: idx_products_client; Type: INDEX; Schema: public; Owner: db_username
--

CREATE INDEX idx_products_client ON public."Products" USING btree ("ClientId");


--
-- Name: idx_products_name; Type: INDEX; Schema: public; Owner: db_username
--

CREATE INDEX idx_products_name ON public."Products" USING btree ("Name");


--
-- Name: idx_receipt_items_product; Type: INDEX; Schema: public; Owner: db_username
--

CREATE INDEX idx_receipt_items_product ON public."ReceiptItems" USING btree ("ProductId");


--
-- Name: idx_receipt_items_receipt; Type: INDEX; Schema: public; Owner: db_username
--

CREATE INDEX idx_receipt_items_receipt ON public."ReceiptItems" USING btree ("ReceiptId");


--
-- Name: idx_receipt_templates_client; Type: INDEX; Schema: public; Owner: db_username
--

CREATE INDEX idx_receipt_templates_client ON public."ReceiptTemplates" USING btree ("ClientId");


--
-- Name: idx_receipts_client; Type: INDEX; Schema: public; Owner: db_username
--

CREATE INDEX idx_receipts_client ON public."Receipts" USING btree ("ClientId");


--
-- Name: idx_receipts_created; Type: INDEX; Schema: public; Owner: db_username
--

CREATE INDEX idx_receipts_created ON public."Receipts" USING btree ("CreatedAt");


--
-- Name: idx_receipts_number; Type: INDEX; Schema: public; Owner: db_username
--

CREATE INDEX idx_receipts_number ON public."Receipts" USING btree ("ReceiptNumber");


--
-- Name: idx_receipts_status; Type: INDEX; Schema: public; Owner: db_username
--

CREATE INDEX idx_receipts_status ON public."Receipts" USING btree ("Status");


--
-- Name: Clients trg_auto_create_config; Type: TRIGGER; Schema: public; Owner: db_username
--

CREATE TRIGGER trg_auto_create_config AFTER INSERT ON public."Clients" FOR EACH ROW EXECUTE FUNCTION public.create_default_config_for_client();


--
-- Name: ReceiptItems trg_calculate_item_total; Type: TRIGGER; Schema: public; Owner: db_username
--

CREATE TRIGGER trg_calculate_item_total BEFORE INSERT OR UPDATE ON public."ReceiptItems" FOR EACH ROW EXECUTE FUNCTION public.calculate_receipt_item_total();


--
-- Name: Products trg_calculate_product_price; Type: TRIGGER; Schema: public; Owner: db_username
--

CREATE TRIGGER trg_calculate_product_price BEFORE INSERT OR UPDATE OF "BasePrice", "IsDynamicPrice" ON public."Products" FOR EACH ROW EXECUTE FUNCTION public.calculate_price_on_insert();


--
-- Name: Receipts trg_set_printed_timestamp; Type: TRIGGER; Schema: public; Owner: db_username
--

CREATE TRIGGER trg_set_printed_timestamp BEFORE UPDATE ON public."Receipts" FOR EACH ROW EXECUTE FUNCTION public.set_printed_timestamp();


--
-- Name: Products Products_ClientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_username
--

ALTER TABLE ONLY public."Products"
    ADD CONSTRAINT "Products_ClientId_fkey" FOREIGN KEY ("ClientId") REFERENCES public."Clients"("Id") ON DELETE CASCADE;


--
-- Name: ReceiptItems ReceiptItems_ProductId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_username
--

ALTER TABLE ONLY public."ReceiptItems"
    ADD CONSTRAINT "ReceiptItems_ProductId_fkey" FOREIGN KEY ("ProductId") REFERENCES public."Products"("Id") ON DELETE SET NULL;


--
-- Name: ReceiptItems ReceiptItems_ReceiptId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_username
--

ALTER TABLE ONLY public."ReceiptItems"
    ADD CONSTRAINT "ReceiptItems_ReceiptId_fkey" FOREIGN KEY ("ReceiptId") REFERENCES public."Receipts"("Id") ON DELETE CASCADE;


--
-- Name: ReceiptTemplates ReceiptTemplates_ClientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_username
--

ALTER TABLE ONLY public."ReceiptTemplates"
    ADD CONSTRAINT "ReceiptTemplates_ClientId_fkey" FOREIGN KEY ("ClientId") REFERENCES public."Clients"("Id") ON DELETE CASCADE;


--
-- Name: Receipts Receipts_ClientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_username
--

ALTER TABLE ONLY public."Receipts"
    ADD CONSTRAINT "Receipts_ClientId_fkey" FOREIGN KEY ("ClientId") REFERENCES public."Clients"("Id") ON DELETE CASCADE;


--
-- Name: Receipts Receipts_PaymentMethodId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_username
--

ALTER TABLE ONLY public."Receipts"
    ADD CONSTRAINT "Receipts_PaymentMethodId_fkey" FOREIGN KEY ("PaymentMethodId") REFERENCES public."PaymentMethods"("Id") ON DELETE SET NULL;


--
-- Name: Receipts Receipts_TemplateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: db_username
--

ALTER TABLE ONLY public."Receipts"
    ADD CONSTRAINT "Receipts_TemplateId_fkey" FOREIGN KEY ("TemplateId") REFERENCES public."ReceiptTemplates"("Id") ON DELETE SET NULL;


--
-- Name: ClientWeeklyConfigs fk_config_client; Type: FK CONSTRAINT; Schema: public; Owner: db_username
--

ALTER TABLE ONLY public."ClientWeeklyConfigs"
    ADD CONSTRAINT fk_config_client FOREIGN KEY ("ClientId") REFERENCES public."Clients"("Id") ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict fEYsgj8BCj0Uv4GUQapGQnDDoNlmpIuM0hfmovWeb6obcrk2vdQqEdqAascLVmj

