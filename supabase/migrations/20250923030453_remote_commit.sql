drop extension if exists "pg_net";

create type "public"."conversation_type" as enum ('direct', 'group');

create type "public"."status_type" as enum ('available', 'focus', 'meeting', 'away', 'break', 'emergency', 'offline');

create type "public"."user_role" as enum ('owner', 'admin', 'team_lead', 'member');


  create table "public"."audit_logs" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "company_id" uuid not null,
    "user_id" uuid,
    "action" character varying(100) not null,
    "resource_type" character varying(50) not null,
    "resource_id" uuid,
    "old_values" jsonb,
    "new_values" jsonb,
    "ip_address" inet,
    "user_agent" text,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP
      );



  create table "public"."companies" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" character varying(255) not null,
    "subdomain" character varying(100) not null,
    "description" text,
    "avatar_url" character varying(500),
    "settings" jsonb default '{}'::jsonb,
    "status_policies" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP
      );


alter table "public"."companies" enable row level security;


  create table "public"."company_invitations" (
    "id" uuid not null default gen_random_uuid(),
    "company_id" uuid,
    "email" character varying(255) not null,
    "role" user_role not null default 'member'::user_role,
    "invited_by" uuid,
    "token" character varying(255) not null,
    "expires_at" timestamp with time zone not null,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."company_invitations" enable row level security;


  create table "public"."company_members" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "company_id" uuid,
    "role" user_role not null default 'member'::user_role,
    "invited_by" uuid,
    "invited_at" timestamp with time zone default now(),
    "joined_at" timestamp with time zone,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."company_members" enable row level security;


  create table "public"."conversation_participants" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "conversation_id" uuid not null,
    "user_id" uuid not null,
    "joined_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "last_read_at" timestamp with time zone default CURRENT_TIMESTAMP
      );



  create table "public"."conversations" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "company_id" uuid not null,
    "type" conversation_type not null,
    "name" character varying(255),
    "group_id" uuid,
    "created_by" uuid not null,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP
      );



  create table "public"."group_members" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "group_id" uuid not null,
    "user_id" uuid not null,
    "joined_at" timestamp with time zone default CURRENT_TIMESTAMP
      );



  create table "public"."groups" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "company_id" uuid not null,
    "name" character varying(255) not null,
    "description" text,
    "avatar_url" character varying(500),
    "is_private" boolean default false,
    "created_by" uuid not null,
    "settings" jsonb default '{}'::jsonb,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP
      );



  create table "public"."message_edits" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "message_id" uuid not null,
    "previous_content" text not null,
    "edited_by" uuid not null,
    "edited_at" timestamp with time zone default CURRENT_TIMESTAMP
      );



  create table "public"."messages" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "conversation_id" uuid not null,
    "sender_id" uuid not null,
    "content" text not null,
    "message_type" character varying(50) default 'text'::character varying,
    "edited_at" timestamp with time zone,
    "is_deleted" boolean default false,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP
      );



  create table "public"."pinned_messages" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "conversation_id" uuid not null,
    "message_id" uuid not null,
    "pinned_by" uuid not null,
    "pinned_at" timestamp with time zone default CURRENT_TIMESTAMP
      );



  create table "public"."profiles" (
    "id" uuid not null,
    "email" text,
    "full_name" text,
    "avatar_url" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "current_company_id" uuid,
    "timezone" character varying(50) default 'UTC'::character varying,
    "notification_preferences" jsonb default '{"push": true, "email": true, "desktop": true}'::jsonb
      );


alter table "public"."profiles" enable row level security;


  create table "public"."status_templates" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "company_id" uuid not null,
    "status" status_type not null,
    "message" character varying(255) not null,
    "is_default" boolean default false,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP
      );



  create table "public"."user_invitations" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "company_id" uuid not null,
    "email" character varying(255) not null,
    "invited_by" uuid not null,
    "token" character varying(255) not null,
    "role" user_role default 'member'::user_role,
    "expires_at" timestamp with time zone not null,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP
      );



  create table "public"."user_status" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid not null,
    "status" status_type not null default 'offline'::status_type,
    "custom_message" character varying(255) default 'Finished for today'::character varying,
    "auto_detected" boolean default false,
    "scheduled_until" timestamp with time zone,
    "is_latest" boolean not null default false,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP
      );



  create table "public"."users" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "company_id" uuid not null,
    "email" character varying(255) not null,
    "password_hash" character varying(255) not null,
    "first_name" character varying(100) not null,
    "last_name" character varying(100) not null,
    "job_title" character varying(150),
    "avatar_url" character varying(500),
    "role" user_role default 'member'::user_role,
    "is_email_verified" boolean default false,
    "email_verification_token" character varying(255),
    "password_reset_token" character varying(255),
    "password_reset_expires" timestamp with time zone,
    "last_active" timestamp with time zone default CURRENT_TIMESTAMP,
    "created_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone default CURRENT_TIMESTAMP
      );



  create table "public"."websocket_sessions" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid not null,
    "socket_id" character varying(255) not null,
    "connected_at" timestamp with time zone default CURRENT_TIMESTAMP,
    "last_ping" timestamp with time zone default CURRENT_TIMESTAMP
      );


CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id);

CREATE UNIQUE INDEX companies_pkey ON public.companies USING btree (id);

CREATE UNIQUE INDEX companies_subdomain_key ON public.companies USING btree (subdomain);

CREATE UNIQUE INDEX company_invitations_company_id_email_key ON public.company_invitations USING btree (company_id, email);

CREATE UNIQUE INDEX company_invitations_pkey ON public.company_invitations USING btree (id);

CREATE UNIQUE INDEX company_invitations_token_key ON public.company_invitations USING btree (token);

CREATE UNIQUE INDEX company_members_pkey ON public.company_members USING btree (id);

CREATE UNIQUE INDEX company_members_user_id_company_id_key ON public.company_members USING btree (user_id, company_id);

CREATE UNIQUE INDEX conversation_participants_conversation_id_user_id_key ON public.conversation_participants USING btree (conversation_id, user_id);

CREATE UNIQUE INDEX conversation_participants_pkey ON public.conversation_participants USING btree (id);

CREATE UNIQUE INDEX conversations_pkey ON public.conversations USING btree (id);

CREATE UNIQUE INDEX group_members_group_id_user_id_key ON public.group_members USING btree (group_id, user_id);

CREATE UNIQUE INDEX group_members_pkey ON public.group_members USING btree (id);

CREATE UNIQUE INDEX groups_company_id_name_key ON public.groups USING btree (company_id, name);

CREATE UNIQUE INDEX groups_pkey ON public.groups USING btree (id);

CREATE INDEX idx_audit_logs_company_id ON public.audit_logs USING btree (company_id);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);

CREATE INDEX idx_companies_subdomain ON public.companies USING btree (subdomain);

CREATE INDEX idx_company_invitations_email ON public.company_invitations USING btree (email);

CREATE INDEX idx_company_invitations_token ON public.company_invitations USING btree (token);

CREATE INDEX idx_company_members_active ON public.company_members USING btree (company_id, is_active) WHERE (is_active = true);

CREATE INDEX idx_company_members_company_id ON public.company_members USING btree (company_id);

CREATE INDEX idx_company_members_user_id ON public.company_members USING btree (user_id);

CREATE INDEX idx_conversation_participants_conversation_id ON public.conversation_participants USING btree (conversation_id);

CREATE INDEX idx_conversation_participants_user_id ON public.conversation_participants USING btree (user_id);

CREATE INDEX idx_conversations_company_id ON public.conversations USING btree (company_id);

CREATE INDEX idx_conversations_group_id ON public.conversations USING btree (group_id);

CREATE INDEX idx_group_members_group_id ON public.group_members USING btree (group_id);

CREATE INDEX idx_group_members_user_id ON public.group_members USING btree (user_id);

CREATE INDEX idx_groups_company_id ON public.groups USING btree (company_id);

CREATE INDEX idx_messages_content_search ON public.messages USING gin (to_tsvector('english'::regconfig, content));

CREATE INDEX idx_messages_conversation_created ON public.messages USING btree (conversation_id, created_at DESC);

CREATE INDEX idx_messages_conversation_id ON public.messages USING btree (conversation_id);

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);

CREATE INDEX idx_messages_sender_id ON public.messages USING btree (sender_id);

CREATE INDEX idx_pinned_messages_conversation_id ON public.pinned_messages USING btree (conversation_id);

CREATE INDEX idx_profiles_current_company ON public.profiles USING btree (current_company_id);

CREATE INDEX idx_user_status_created_at ON public.user_status USING btree (created_at DESC);

CREATE INDEX idx_user_status_latest ON public.user_status USING btree (user_id, created_at DESC);

CREATE INDEX idx_user_status_user_id ON public.user_status USING btree (user_id);

CREATE INDEX idx_users_company_id ON public.users USING btree (company_id);

CREATE INDEX idx_users_email ON public.users USING btree (email);

CREATE INDEX idx_users_last_active ON public.users USING btree (last_active);

CREATE INDEX idx_websocket_sessions_last_ping ON public.websocket_sessions USING btree (last_ping);

CREATE INDEX idx_websocket_sessions_user_id ON public.websocket_sessions USING btree (user_id);

CREATE UNIQUE INDEX message_edits_pkey ON public.message_edits USING btree (id);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);

CREATE UNIQUE INDEX pinned_messages_conversation_id_message_id_key ON public.pinned_messages USING btree (conversation_id, message_id);

CREATE UNIQUE INDEX pinned_messages_pkey ON public.pinned_messages USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX status_templates_pkey ON public.status_templates USING btree (id);

CREATE UNIQUE INDEX uq_user_status_latest ON public.user_status USING btree (user_id) WHERE is_latest;

CREATE UNIQUE INDEX user_invitations_company_id_email_key ON public.user_invitations USING btree (company_id, email);

CREATE UNIQUE INDEX user_invitations_pkey ON public.user_invitations USING btree (id);

CREATE UNIQUE INDEX user_invitations_token_key ON public.user_invitations USING btree (token);

CREATE UNIQUE INDEX user_status_pkey ON public.user_status USING btree (id);

CREATE UNIQUE INDEX users_company_id_email_key ON public.users USING btree (company_id, email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

CREATE UNIQUE INDEX websocket_sessions_pkey ON public.websocket_sessions USING btree (id);

CREATE UNIQUE INDEX websocket_sessions_socket_id_key ON public.websocket_sessions USING btree (socket_id);

alter table "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY using index "audit_logs_pkey";

alter table "public"."companies" add constraint "companies_pkey" PRIMARY KEY using index "companies_pkey";

alter table "public"."company_invitations" add constraint "company_invitations_pkey" PRIMARY KEY using index "company_invitations_pkey";

alter table "public"."company_members" add constraint "company_members_pkey" PRIMARY KEY using index "company_members_pkey";

alter table "public"."conversation_participants" add constraint "conversation_participants_pkey" PRIMARY KEY using index "conversation_participants_pkey";

alter table "public"."conversations" add constraint "conversations_pkey" PRIMARY KEY using index "conversations_pkey";

alter table "public"."group_members" add constraint "group_members_pkey" PRIMARY KEY using index "group_members_pkey";

alter table "public"."groups" add constraint "groups_pkey" PRIMARY KEY using index "groups_pkey";

alter table "public"."message_edits" add constraint "message_edits_pkey" PRIMARY KEY using index "message_edits_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."pinned_messages" add constraint "pinned_messages_pkey" PRIMARY KEY using index "pinned_messages_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."status_templates" add constraint "status_templates_pkey" PRIMARY KEY using index "status_templates_pkey";

alter table "public"."user_invitations" add constraint "user_invitations_pkey" PRIMARY KEY using index "user_invitations_pkey";

alter table "public"."user_status" add constraint "user_status_pkey" PRIMARY KEY using index "user_status_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."websocket_sessions" add constraint "websocket_sessions_pkey" PRIMARY KEY using index "websocket_sessions_pkey";

alter table "public"."audit_logs" add constraint "audit_logs_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."audit_logs" validate constraint "audit_logs_company_id_fkey";

alter table "public"."audit_logs" add constraint "audit_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."audit_logs" validate constraint "audit_logs_user_id_fkey";

alter table "public"."companies" add constraint "companies_subdomain_key" UNIQUE using index "companies_subdomain_key";

alter table "public"."companies" add constraint "subdomain_format" CHECK (((subdomain)::text ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'::text)) not valid;

alter table "public"."companies" validate constraint "subdomain_format";

alter table "public"."company_invitations" add constraint "company_invitations_company_id_email_key" UNIQUE using index "company_invitations_company_id_email_key";

alter table "public"."company_invitations" add constraint "company_invitations_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."company_invitations" validate constraint "company_invitations_company_id_fkey";

alter table "public"."company_invitations" add constraint "company_invitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."company_invitations" validate constraint "company_invitations_invited_by_fkey";

alter table "public"."company_invitations" add constraint "company_invitations_token_key" UNIQUE using index "company_invitations_token_key";

alter table "public"."company_invitations" add constraint "invitations_expires_future" CHECK ((expires_at > created_at)) not valid;

alter table "public"."company_invitations" validate constraint "invitations_expires_future";

alter table "public"."company_members" add constraint "company_members_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."company_members" validate constraint "company_members_company_id_fkey";

alter table "public"."company_members" add constraint "company_members_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id) not valid;

alter table "public"."company_members" validate constraint "company_members_invited_by_fkey";

alter table "public"."company_members" add constraint "company_members_user_id_company_id_key" UNIQUE using index "company_members_user_id_company_id_key";

alter table "public"."company_members" add constraint "company_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."company_members" validate constraint "company_members_user_id_fkey";

alter table "public"."conversation_participants" add constraint "conversation_participants_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE not valid;

alter table "public"."conversation_participants" validate constraint "conversation_participants_conversation_id_fkey";

alter table "public"."conversation_participants" add constraint "conversation_participants_conversation_id_user_id_key" UNIQUE using index "conversation_participants_conversation_id_user_id_key";

alter table "public"."conversation_participants" add constraint "conversation_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."conversation_participants" validate constraint "conversation_participants_user_id_fkey";

alter table "public"."conversations" add constraint "conversations_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."conversations" validate constraint "conversations_company_id_fkey";

alter table "public"."conversations" add constraint "conversations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) not valid;

alter table "public"."conversations" validate constraint "conversations_created_by_fkey";

alter table "public"."conversations" add constraint "conversations_group_id_fkey" FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE not valid;

alter table "public"."conversations" validate constraint "conversations_group_id_fkey";

alter table "public"."conversations" add constraint "group_conversation_check" CHECK ((((type = 'group'::conversation_type) AND (group_id IS NOT NULL)) OR ((type = 'direct'::conversation_type) AND (group_id IS NULL)))) not valid;

alter table "public"."conversations" validate constraint "group_conversation_check";

alter table "public"."group_members" add constraint "group_members_group_id_fkey" FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE not valid;

alter table "public"."group_members" validate constraint "group_members_group_id_fkey";

alter table "public"."group_members" add constraint "group_members_group_id_user_id_key" UNIQUE using index "group_members_group_id_user_id_key";

alter table "public"."group_members" add constraint "group_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."group_members" validate constraint "group_members_user_id_fkey";

alter table "public"."groups" add constraint "groups_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."groups" validate constraint "groups_company_id_fkey";

alter table "public"."groups" add constraint "groups_company_id_name_key" UNIQUE using index "groups_company_id_name_key";

alter table "public"."groups" add constraint "groups_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id) not valid;

alter table "public"."groups" validate constraint "groups_created_by_fkey";

alter table "public"."message_edits" add constraint "message_edits_edited_by_fkey" FOREIGN KEY (edited_by) REFERENCES users(id) not valid;

alter table "public"."message_edits" validate constraint "message_edits_edited_by_fkey";

alter table "public"."message_edits" add constraint "message_edits_message_id_fkey" FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE not valid;

alter table "public"."message_edits" validate constraint "message_edits_message_id_fkey";

alter table "public"."messages" add constraint "messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_conversation_id_fkey";

alter table "public"."messages" add constraint "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_sender_id_fkey";

alter table "public"."messages" add constraint "non_empty_content" CHECK ((length(TRIM(BOTH FROM content)) > 0)) not valid;

alter table "public"."messages" validate constraint "non_empty_content";

alter table "public"."pinned_messages" add constraint "pinned_messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE not valid;

alter table "public"."pinned_messages" validate constraint "pinned_messages_conversation_id_fkey";

alter table "public"."pinned_messages" add constraint "pinned_messages_conversation_id_message_id_key" UNIQUE using index "pinned_messages_conversation_id_message_id_key";

alter table "public"."pinned_messages" add constraint "pinned_messages_message_id_fkey" FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE not valid;

alter table "public"."pinned_messages" validate constraint "pinned_messages_message_id_fkey";

alter table "public"."pinned_messages" add constraint "pinned_messages_pinned_by_fkey" FOREIGN KEY (pinned_by) REFERENCES users(id) not valid;

alter table "public"."pinned_messages" validate constraint "pinned_messages_pinned_by_fkey";

alter table "public"."profiles" add constraint "profiles_current_company_id_fkey" FOREIGN KEY (current_company_id) REFERENCES companies(id) not valid;

alter table "public"."profiles" validate constraint "profiles_current_company_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."status_templates" add constraint "status_templates_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."status_templates" validate constraint "status_templates_company_id_fkey";

alter table "public"."user_invitations" add constraint "user_invitations_company_id_email_key" UNIQUE using index "user_invitations_company_id_email_key";

alter table "public"."user_invitations" add constraint "user_invitations_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."user_invitations" validate constraint "user_invitations_company_id_fkey";

alter table "public"."user_invitations" add constraint "user_invitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES users(id) not valid;

alter table "public"."user_invitations" validate constraint "user_invitations_invited_by_fkey";

alter table "public"."user_invitations" add constraint "user_invitations_token_key" UNIQUE using index "user_invitations_token_key";

alter table "public"."user_status" add constraint "user_status_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."user_status" validate constraint "user_status_user_id_fkey";

alter table "public"."users" add constraint "users_company_id_email_key" UNIQUE using index "users_company_id_email_key";

alter table "public"."users" add constraint "users_company_id_fkey" FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE not valid;

alter table "public"."users" validate constraint "users_company_id_fkey";

alter table "public"."websocket_sessions" add constraint "websocket_sessions_socket_id_key" UNIQUE using index "websocket_sessions_socket_id_key";

alter table "public"."websocket_sessions" add constraint "websocket_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."websocket_sessions" validate constraint "websocket_sessions_user_id_fkey";

create or replace view "public"."user_directory" as  SELECT u.id,
    u.company_id,
    u.email,
    u.first_name,
    u.last_name,
    u.job_title,
    u.avatar_url,
    u.role,
    u.last_active,
    COALESCE(latest_status.status, 'offline'::status_type) AS current_status,
    COALESCE(latest_status.custom_message, 'Finished for today'::character varying) AS status_message,
    latest_status.created_at AS status_updated_at,
        CASE
            WHEN (ws.user_id IS NOT NULL) THEN true
            ELSE false
        END AS is_online
   FROM ((users u
     LEFT JOIN user_status latest_status ON (((u.id = latest_status.user_id) AND (latest_status.is_latest = true))))
     LEFT JOIN websocket_sessions ws ON ((u.id = ws.user_id)));



  create policy "Authenticated users can check subdomain availability"
  on "public"."companies"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "Authenticated users can create companies"
  on "public"."companies"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Company owners and admins can update company details"
  on "public"."companies"
  as permissive
  for update
  to public
using ((id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE ((company_members.user_id = auth.uid()) AND (company_members.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role])) AND (company_members.is_active = true)))));



  create policy "Company admins can manage invitations"
  on "public"."company_invitations"
  as permissive
  for all
  to public
using ((company_id IN ( SELECT company_members.company_id
   FROM company_members
  WHERE ((company_members.user_id = auth.uid()) AND (company_members.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role])) AND (company_members.is_active = true)))));



  create policy "Company owners and admins can manage members"
  on "public"."company_members"
  as permissive
  for all
  to public
using (((user_id = auth.uid()) OR (company_id IN ( SELECT cm.company_id
   FROM company_members cm
  WHERE ((cm.user_id = auth.uid()) AND (cm.role = ANY (ARRAY['owner'::user_role, 'admin'::user_role])) AND (cm.is_active = true))))));



  create policy "Users can view company members"
  on "public"."company_members"
  as permissive
  for select
  to public
using ((company_id IN ( SELECT cm.company_id
   FROM company_members cm
  WHERE ((cm.user_id = auth.uid()) AND (cm.is_active = true)))));



  create policy "Users can view their own memberships"
  on "public"."company_members"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "Users can insert own profile"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((auth.uid() = id));



  create policy "Users can update own profile"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "Users can view own profile"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() = id));


CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_members_updated_at BEFORE UPDATE ON public.company_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER on_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER trg_user_status_mark_is_latest_before BEFORE INSERT OR UPDATE ON public.user_status FOR EACH ROW EXECUTE FUNCTION user_status_mark_is_latest_before();

CREATE TRIGGER trg_user_status_unset_others_after AFTER INSERT OR UPDATE ON public.user_status FOR EACH ROW EXECUTE FUNCTION user_status_unset_others_after();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


