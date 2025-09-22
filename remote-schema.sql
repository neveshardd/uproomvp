
\restrict e2GTsMEFySwRhuEJ3iIZcniQAr3O2GqM1xKbGjkPDBBm5ds3Nrb9Jcc1zSfH2av


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


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."conversation_type" AS ENUM (
    'direct',
    'group'
);


ALTER TYPE "public"."conversation_type" OWNER TO "postgres";


CREATE TYPE "public"."status_type" AS ENUM (
    'available',
    'focus',
    'meeting',
    'away',
    'break',
    'emergency',
    'offline'
);


ALTER TYPE "public"."status_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'owner',
    'admin',
    'team_lead',
    'member'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_company_invitation"("invitation_token" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    invitation_record RECORD;
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Get invitation details
    SELECT * INTO invitation_record
    FROM public.company_invitations
    WHERE token = invitation_token
    AND expires_at > NOW()
    AND accepted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user email matches invitation
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = current_user_id 
        AND email = invitation_record.email
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Add user to company
    INSERT INTO public.company_members (user_id, company_id, role, invited_by, joined_at)
    VALUES (
        current_user_id, 
        invitation_record.company_id, 
        invitation_record.role, 
        invitation_record.invited_by, 
        NOW()
    )
    ON CONFLICT (user_id, company_id) DO UPDATE SET
        role = invitation_record.role,
        is_active = true,
        joined_at = NOW(),
        updated_at = NOW();
    
    -- Mark invitation as accepted
    UPDATE public.company_invitations
    SET accepted_at = NOW()
    WHERE id = invitation_record.id;
    
    -- Update user's current company if they don't have one
    UPDATE public.profiles 
    SET current_company_id = COALESCE(current_company_id, invitation_record.company_id),
        updated_at = NOW()
    WHERE id = current_user_id;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."accept_company_invitation"("invitation_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_websocket_sessions"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    DELETE FROM websocket_sessions 
    WHERE last_ping < CURRENT_TIMESTAMP - INTERVAL '1 hour';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_websocket_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_company_with_owner"("company_name" "text", "company_subdomain" "text", "company_description" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_company_id UUID;
    current_user_id UUID;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Create the company
    INSERT INTO public.companies (name, subdomain, description)
    VALUES (company_name, company_subdomain, company_description)
    RETURNING id INTO new_company_id;
    
    -- Add the creator as owner
    INSERT INTO public.company_members (user_id, company_id, role, joined_at)
    VALUES (current_user_id, new_company_id, 'owner', NOW());
    
    -- Update user's current company
    UPDATE public.profiles 
    SET current_company_id = new_company_id, updated_at = NOW()
    WHERE id = current_user_id;
    
    RETURN new_company_id;
END;
$$;


ALTER FUNCTION "public"."create_company_with_owner"("company_name" "text", "company_subdomain" "text", "company_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_current_status"("user_uuid" "uuid") RETURNS TABLE("status" "public"."status_type", "custom_message" character varying, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT us.status, us.custom_message, us.created_at
    FROM user_status us
    WHERE us.user_id = user_uuid AND us.is_latest = true;
END;
$$;


ALTER FUNCTION "public"."get_user_current_status"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_status_mark_is_latest_before"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- If no created_at provided, use now()
    IF NEW.created_at IS NULL THEN
        NEW.created_at := CURRENT_TIMESTAMP;
    END IF;
    
    -- Determine if NEW should be considered latest compared to existing rows
    IF EXISTS (
        SELECT 1 
        FROM user_status us 
        WHERE us.user_id = NEW.user_id 
        -- Ignore the row being updated (if update)
        AND (TG_OP = 'INSERT' OR us.id <> NEW.id)
        AND us.created_at > NEW.created_at
        LIMIT 1
    ) THEN
        NEW.is_latest := false;
    ELSE
        NEW.is_latest := true;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."user_status_mark_is_latest_before"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_status_unset_others_after"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Only act if NEW.is_latest is true
    IF NEW.is_latest THEN
        -- Set any other rows for this user that are currently marked latest to false
        -- Use id <> NEW.id to avoid touching the current row
        UPDATE user_status 
        SET is_latest = false 
        WHERE user_id = NEW.user_id 
        AND id <> NEW.id 
        AND is_latest = true;
    END IF;
    
    RETURN NULL; -- AFTER ROW triggers return null
END;
$$;


ALTER FUNCTION "public"."user_status_unset_others_after"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "action" character varying(100) NOT NULL,
    "resource_type" character varying(50) NOT NULL,
    "resource_id" "uuid",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_logs" IS 'Audit trail for compliance and security';



CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "subdomain" character varying(100) NOT NULL,
    "description" "text",
    "avatar_url" character varying(500),
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "status_policies" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "subdomain_format" CHECK ((("subdomain")::"text" ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'::"text"))
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


COMMENT ON TABLE "public"."companies" IS 'Multi-tenant company workspaces';



CREATE TABLE IF NOT EXISTS "public"."company_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_id" "uuid",
    "email" character varying(255) NOT NULL,
    "role" "public"."user_role" DEFAULT 'member'::"public"."user_role" NOT NULL,
    "invited_by" "uuid",
    "token" character varying(255) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "invitations_expires_future" CHECK (("expires_at" > "created_at"))
);


ALTER TABLE "public"."company_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "company_id" "uuid",
    "role" "public"."user_role" DEFAULT 'member'::"public"."user_role" NOT NULL,
    "invited_by" "uuid",
    "invited_at" timestamp with time zone DEFAULT "now"(),
    "joined_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."company_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_participants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "last_read_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."conversation_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "type" "public"."conversation_type" NOT NULL,
    "name" character varying(255),
    "group_id" "uuid",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "group_conversation_check" CHECK (((("type" = 'group'::"public"."conversation_type") AND ("group_id" IS NOT NULL)) OR (("type" = 'direct'::"public"."conversation_type") AND ("group_id" IS NULL))))
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


COMMENT ON TABLE "public"."conversations" IS 'Direct and group conversations';



CREATE TABLE IF NOT EXISTS "public"."group_members" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."group_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "description" "text",
    "avatar_url" character varying(500),
    "is_private" boolean DEFAULT false,
    "created_by" "uuid" NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


COMMENT ON TABLE "public"."groups" IS 'Team/project groups within companies';



CREATE TABLE IF NOT EXISTS "public"."message_edits" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "previous_content" "text" NOT NULL,
    "edited_by" "uuid" NOT NULL,
    "edited_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."message_edits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "message_type" character varying(50) DEFAULT 'text'::character varying,
    "edited_at" timestamp with time zone,
    "is_deleted" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "non_empty_content" CHECK (("length"(TRIM(BOTH FROM "content")) > 0))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON TABLE "public"."messages" IS 'All messages with edit/delete support';



CREATE TABLE IF NOT EXISTS "public"."pinned_messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "message_id" "uuid" NOT NULL,
    "pinned_by" "uuid" NOT NULL,
    "pinned_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."pinned_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "current_company_id" "uuid",
    "timezone" character varying(50) DEFAULT 'UTC'::character varying,
    "notification_preferences" "jsonb" DEFAULT '{"push": true, "email": true, "desktop": true}'::"jsonb"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."status_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "status" "public"."status_type" NOT NULL,
    "message" character varying(255) NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."status_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_status" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "public"."status_type" DEFAULT 'offline'::"public"."status_type" NOT NULL,
    "custom_message" character varying(255) DEFAULT 'Finished for today'::character varying,
    "auto_detected" boolean DEFAULT false,
    "scheduled_until" timestamp with time zone,
    "is_latest" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."user_status" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_status" IS 'Current and historical user status tracking with is_latest flag';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "email" character varying(255) NOT NULL,
    "password_hash" character varying(255) NOT NULL,
    "first_name" character varying(100) NOT NULL,
    "last_name" character varying(100) NOT NULL,
    "job_title" character varying(150),
    "avatar_url" character varying(500),
    "role" "public"."user_role" DEFAULT 'member'::"public"."user_role",
    "is_email_verified" boolean DEFAULT false,
    "email_verification_token" character varying(255),
    "password_reset_token" character varying(255),
    "password_reset_expires" timestamp with time zone,
    "last_active" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."users" OWNER TO "postgres";


COMMENT ON TABLE "public"."users" IS 'User accounts within companies';



CREATE TABLE IF NOT EXISTS "public"."websocket_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "socket_id" character varying(255) NOT NULL,
    "connected_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "last_ping" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."websocket_sessions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_directory" AS
 SELECT "u"."id",
    "u"."company_id",
    "u"."email",
    "u"."first_name",
    "u"."last_name",
    "u"."job_title",
    "u"."avatar_url",
    "u"."role",
    "u"."last_active",
    COALESCE("latest_status"."status", 'offline'::"public"."status_type") AS "current_status",
    COALESCE("latest_status"."custom_message", 'Finished for today'::character varying) AS "status_message",
    "latest_status"."created_at" AS "status_updated_at",
        CASE
            WHEN ("ws"."user_id" IS NOT NULL) THEN true
            ELSE false
        END AS "is_online"
   FROM (("public"."users" "u"
     LEFT JOIN "public"."user_status" "latest_status" ON ((("u"."id" = "latest_status"."user_id") AND ("latest_status"."is_latest" = true))))
     LEFT JOIN "public"."websocket_sessions" "ws" ON (("u"."id" = "ws"."user_id")));


ALTER VIEW "public"."user_directory" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_directory" IS 'Complete user information with current status and online presence';



CREATE TABLE IF NOT EXISTS "public"."user_invitations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "company_id" "uuid" NOT NULL,
    "email" character varying(255) NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "token" character varying(255) NOT NULL,
    "role" "public"."user_role" DEFAULT 'member'::"public"."user_role",
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."user_invitations" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_subdomain_key" UNIQUE ("subdomain");



ALTER TABLE ONLY "public"."company_invitations"
    ADD CONSTRAINT "company_invitations_company_id_email_key" UNIQUE ("company_id", "email");



ALTER TABLE ONLY "public"."company_invitations"
    ADD CONSTRAINT "company_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_invitations"
    ADD CONSTRAINT "company_invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_user_id_company_id_key" UNIQUE ("user_id", "company_id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_user_id_key" UNIQUE ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_group_id_user_id_key" UNIQUE ("group_id", "user_id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_company_id_name_key" UNIQUE ("company_id", "name");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_edits"
    ADD CONSTRAINT "message_edits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pinned_messages"
    ADD CONSTRAINT "pinned_messages_conversation_id_message_id_key" UNIQUE ("conversation_id", "message_id");



ALTER TABLE ONLY "public"."pinned_messages"
    ADD CONSTRAINT "pinned_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."status_templates"
    ADD CONSTRAINT "status_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_company_id_email_key" UNIQUE ("company_id", "email");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."user_status"
    ADD CONSTRAINT "user_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_company_id_email_key" UNIQUE ("company_id", "email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."websocket_sessions"
    ADD CONSTRAINT "websocket_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."websocket_sessions"
    ADD CONSTRAINT "websocket_sessions_socket_id_key" UNIQUE ("socket_id");



CREATE INDEX "idx_audit_logs_company_id" ON "public"."audit_logs" USING "btree" ("company_id");



CREATE INDEX "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_companies_subdomain" ON "public"."companies" USING "btree" ("subdomain");



CREATE INDEX "idx_company_invitations_email" ON "public"."company_invitations" USING "btree" ("email");



CREATE INDEX "idx_company_invitations_token" ON "public"."company_invitations" USING "btree" ("token");



CREATE INDEX "idx_company_members_active" ON "public"."company_members" USING "btree" ("company_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_company_members_company_id" ON "public"."company_members" USING "btree" ("company_id");



CREATE INDEX "idx_company_members_user_id" ON "public"."company_members" USING "btree" ("user_id");



CREATE INDEX "idx_conversation_participants_conversation_id" ON "public"."conversation_participants" USING "btree" ("conversation_id");



CREATE INDEX "idx_conversation_participants_user_id" ON "public"."conversation_participants" USING "btree" ("user_id");



CREATE INDEX "idx_conversations_company_id" ON "public"."conversations" USING "btree" ("company_id");



CREATE INDEX "idx_conversations_group_id" ON "public"."conversations" USING "btree" ("group_id");



CREATE INDEX "idx_group_members_group_id" ON "public"."group_members" USING "btree" ("group_id");



CREATE INDEX "idx_group_members_user_id" ON "public"."group_members" USING "btree" ("user_id");



CREATE INDEX "idx_groups_company_id" ON "public"."groups" USING "btree" ("company_id");



CREATE INDEX "idx_messages_content_search" ON "public"."messages" USING "gin" ("to_tsvector"('"english"'::"regconfig", "content"));



CREATE INDEX "idx_messages_conversation_created" ON "public"."messages" USING "btree" ("conversation_id", "created_at" DESC);



CREATE INDEX "idx_messages_conversation_id" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_pinned_messages_conversation_id" ON "public"."pinned_messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_profiles_current_company" ON "public"."profiles" USING "btree" ("current_company_id");



CREATE INDEX "idx_user_status_created_at" ON "public"."user_status" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_user_status_latest" ON "public"."user_status" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_user_status_user_id" ON "public"."user_status" USING "btree" ("user_id");



CREATE INDEX "idx_users_company_id" ON "public"."users" USING "btree" ("company_id");



CREATE INDEX "idx_users_email" ON "public"."users" USING "btree" ("email");



CREATE INDEX "idx_users_last_active" ON "public"."users" USING "btree" ("last_active");



CREATE INDEX "idx_websocket_sessions_last_ping" ON "public"."websocket_sessions" USING "btree" ("last_ping");



CREATE INDEX "idx_websocket_sessions_user_id" ON "public"."websocket_sessions" USING "btree" ("user_id");



CREATE UNIQUE INDEX "uq_user_status_latest" ON "public"."user_status" USING "btree" ("user_id") WHERE "is_latest";



CREATE OR REPLACE TRIGGER "on_profiles_updated" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "trg_user_status_mark_is_latest_before" BEFORE INSERT OR UPDATE ON "public"."user_status" FOR EACH ROW EXECUTE FUNCTION "public"."user_status_mark_is_latest_before"();



CREATE OR REPLACE TRIGGER "trg_user_status_unset_others_after" AFTER INSERT OR UPDATE ON "public"."user_status" FOR EACH ROW EXECUTE FUNCTION "public"."user_status_unset_others_after"();



CREATE OR REPLACE TRIGGER "update_companies_updated_at" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_company_members_updated_at" BEFORE UPDATE ON "public"."company_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_conversations_updated_at" BEFORE UPDATE ON "public"."conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_groups_updated_at" BEFORE UPDATE ON "public"."groups" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."company_invitations"
    ADD CONSTRAINT "company_invitations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_invitations"
    ADD CONSTRAINT "company_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."company_members"
    ADD CONSTRAINT "company_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."message_edits"
    ADD CONSTRAINT "message_edits_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."message_edits"
    ADD CONSTRAINT "message_edits_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pinned_messages"
    ADD CONSTRAINT "pinned_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pinned_messages"
    ADD CONSTRAINT "pinned_messages_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pinned_messages"
    ADD CONSTRAINT "pinned_messages_pinned_by_fkey" FOREIGN KEY ("pinned_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_current_company_id_fkey" FOREIGN KEY ("current_company_id") REFERENCES "public"."companies"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."status_templates"
    ADD CONSTRAINT "status_templates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_status"
    ADD CONSTRAINT "user_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."websocket_sessions"
    ADD CONSTRAINT "websocket_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can check subdomain availability" ON "public"."companies" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can create companies" ON "public"."companies" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Company admins can manage invitations" ON "public"."company_invitations" USING (("company_id" IN ( SELECT "company_members"."company_id"
   FROM "public"."company_members"
  WHERE (("company_members"."user_id" = "auth"."uid"()) AND ("company_members"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role"])) AND ("company_members"."is_active" = true)))));



CREATE POLICY "Company owners and admins can manage members" ON "public"."company_members" USING ((("user_id" = "auth"."uid"()) OR ("company_id" IN ( SELECT "cm"."company_id"
   FROM "public"."company_members" "cm"
  WHERE (("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role"])) AND ("cm"."is_active" = true))))));



CREATE POLICY "Company owners and admins can update company details" ON "public"."companies" FOR UPDATE USING (("id" IN ( SELECT "company_members"."company_id"
   FROM "public"."company_members"
  WHERE (("company_members"."user_id" = "auth"."uid"()) AND ("company_members"."role" = ANY (ARRAY['owner'::"public"."user_role", 'admin'::"public"."user_role"])) AND ("company_members"."is_active" = true)))));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view company members" ON "public"."company_members" FOR SELECT USING (("company_id" IN ( SELECT "cm"."company_id"
   FROM "public"."company_members" "cm"
  WHERE (("cm"."user_id" = "auth"."uid"()) AND ("cm"."is_active" = true)))));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own memberships" ON "public"."company_members" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."accept_company_invitation"("invitation_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accept_company_invitation"("invitation_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_company_invitation"("invitation_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_company_invitation"("invitation_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_old_websocket_sessions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_old_websocket_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_websocket_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_websocket_sessions"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_company_with_owner"("company_name" "text", "company_subdomain" "text", "company_description" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_company_with_owner"("company_name" "text", "company_subdomain" "text", "company_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_company_with_owner"("company_name" "text", "company_subdomain" "text", "company_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_company_with_owner"("company_name" "text", "company_subdomain" "text", "company_description" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_current_status"("user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_current_status"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_current_status"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_current_status"("user_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_updated_at_column"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_status_mark_is_latest_before"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_status_mark_is_latest_before"() TO "anon";
GRANT ALL ON FUNCTION "public"."user_status_mark_is_latest_before"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_status_mark_is_latest_before"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_status_unset_others_after"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_status_unset_others_after"() TO "anon";
GRANT ALL ON FUNCTION "public"."user_status_unset_others_after"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_status_unset_others_after"() TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."company_invitations" TO "anon";
GRANT ALL ON TABLE "public"."company_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."company_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."company_members" TO "anon";
GRANT ALL ON TABLE "public"."company_members" TO "authenticated";
GRANT ALL ON TABLE "public"."company_members" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_participants" TO "anon";
GRANT ALL ON TABLE "public"."conversation_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_participants" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."group_members" TO "anon";
GRANT ALL ON TABLE "public"."group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."group_members" TO "service_role";



GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";



GRANT ALL ON TABLE "public"."message_edits" TO "anon";
GRANT ALL ON TABLE "public"."message_edits" TO "authenticated";
GRANT ALL ON TABLE "public"."message_edits" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."pinned_messages" TO "anon";
GRANT ALL ON TABLE "public"."pinned_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."pinned_messages" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."status_templates" TO "anon";
GRANT ALL ON TABLE "public"."status_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."status_templates" TO "service_role";



GRANT ALL ON TABLE "public"."user_status" TO "anon";
GRANT ALL ON TABLE "public"."user_status" TO "authenticated";
GRANT ALL ON TABLE "public"."user_status" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."websocket_sessions" TO "anon";
GRANT ALL ON TABLE "public"."websocket_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."websocket_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."user_directory" TO "anon";
GRANT ALL ON TABLE "public"."user_directory" TO "authenticated";
GRANT ALL ON TABLE "public"."user_directory" TO "service_role";



GRANT ALL ON TABLE "public"."user_invitations" TO "anon";
GRANT ALL ON TABLE "public"."user_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_invitations" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






\unrestrict e2GTsMEFySwRhuEJ3iIZcniQAr3O2GqM1xKbGjkPDBBm5ds3Nrb9Jcc1zSfH2av

RESET ALL;
