-- Messaging & Status System Schema for Uproom Platform
-- This script creates the necessary tables for messaging, conversations, and status system

-- First, create the required company-related tables that the messaging system depends on

-- 0.1. Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website VARCHAR(255),
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT companies_name_not_empty CHECK (char_length(trim(name)) > 0),
    CONSTRAINT companies_subdomain_format CHECK (subdomain ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$'),
    CONSTRAINT companies_subdomain_length CHECK (char_length(subdomain) >= 2 AND char_length(subdomain) <= 63)
);

-- 0.2. Create company_members table
CREATE TABLE IF NOT EXISTS public.company_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(company_id, user_id),
    CONSTRAINT company_members_role_check CHECK (role IN ('owner', 'admin', 'member')),
    CONSTRAINT company_members_status_check CHECK (status IN ('active', 'inactive', 'pending'))
);

-- 0.3. Create company_invitations table
CREATE TABLE IF NOT EXISTS public.company_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT company_invitations_role_check CHECK (role IN ('admin', 'member')),
    CONSTRAINT company_invitations_email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 0.4. Enable RLS for company tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

-- 0.5. Create RLS policies for companies
DROP POLICY IF EXISTS "Users can view companies they are members of" ON public.companies;
CREATE POLICY "Users can view companies they are members of" ON public.companies
    FOR SELECT USING (
        id IN (
            SELECT cm.company_id FROM public.company_members cm 
            WHERE cm.user_id = auth.uid() AND cm.is_active = true
        )
    );

DROP POLICY IF EXISTS "Company owners and admins can update their company" ON public.companies;
CREATE POLICY "Company owners and admins can update their company" ON public.companies
    FOR UPDATE USING (
        id IN (
            SELECT cm.company_id FROM public.company_members cm 
            WHERE cm.user_id = auth.uid() 
            AND cm.role IN ('owner', 'admin') 
            AND cm.is_active = true
        )
    );

-- 0.6. Create RLS policies for company_members
DROP POLICY IF EXISTS "Users can view members of their companies" ON public.company_members;
CREATE POLICY "Users can view members of their companies" ON public.company_members
    FOR SELECT USING (
        company_id IN (
            SELECT cm.company_id FROM public.company_members cm 
            WHERE cm.user_id = auth.uid() AND cm.is_active = true
        )
    );

DROP POLICY IF EXISTS "Company owners and admins can manage members" ON public.company_members;
CREATE POLICY "Company owners and admins can manage members" ON public.company_members
    FOR ALL USING (
        company_id IN (
            SELECT cm.company_id FROM public.company_members cm 
            WHERE cm.user_id = auth.uid() 
            AND cm.role IN ('owner', 'admin') 
            AND cm.is_active = true
        )
    );

-- 0.7. Create RLS policies for company_invitations
DROP POLICY IF EXISTS "Company owners and admins can manage invitations" ON public.company_invitations;
CREATE POLICY "Company owners and admins can manage invitations" ON public.company_invitations
    FOR ALL USING (
        company_id IN (
            SELECT cm.company_id FROM public.company_members cm 
            WHERE cm.user_id = auth.uid() 
            AND cm.role IN ('owner', 'admin') 
            AND cm.is_active = true
        )
    );

-- 0.8. Create indexes for company tables
CREATE INDEX IF NOT EXISTS idx_companies_subdomain ON public.companies(subdomain);
CREATE INDEX IF NOT EXISTS idx_company_members_company ON public.company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_company_members_user ON public.company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_company_members_active ON public.company_members(company_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_company_invitations_company ON public.company_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_company_invitations_token ON public.company_invitations(token);
CREATE INDEX IF NOT EXISTS idx_company_invitations_email ON public.company_invitations(email);

-- 0.9. Grant permissions for company tables
GRANT ALL ON public.companies TO authenticated;
GRANT ALL ON public.company_members TO authenticated;
GRANT ALL ON public.company_invitations TO authenticated;

-- 0.10. Create function for updated_at trigger (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 0.11. Create triggers for updated_at timestamps on company tables
DO $$ BEGIN
    CREATE TRIGGER update_companies_updated_at 
        BEFORE UPDATE ON public.companies 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_company_members_updated_at 
        BEFORE UPDATE ON public.company_members 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Create user_status enum
DO $$ BEGIN
    CREATE TYPE user_status_type AS ENUM (
        'available', 'busy', 'in_meeting', 'on_call', 
        'break', 'lunch', 'away', 'wfh', 'offline'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create user_status table
CREATE TABLE IF NOT EXISTS public.user_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    status user_status_type NOT NULL DEFAULT 'offline',
    custom_message TEXT,
    auto_away_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_online BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, company_id),
    CONSTRAINT user_status_message_length CHECK (char_length(custom_message) <= 200)
);

-- 3. Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL DEFAULT 'direct', -- 'direct' or 'group'
    name VARCHAR(255), -- For group conversations
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT conversations_type_check CHECK (type IN ('direct', 'group')),
    CONSTRAINT conversations_name_required_for_groups CHECK (
        (type = 'direct' AND name IS NULL) OR 
        (type = 'group' AND name IS NOT NULL)
    )
);

-- 4. Create conversation_participants table
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    left_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(conversation_id, user_id)
);

-- 5. Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(20) NOT NULL DEFAULT 'text', -- 'text', 'system', 'file'
    reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT messages_content_not_empty CHECK (char_length(trim(content)) > 0),
    CONSTRAINT messages_content_length CHECK (char_length(content) <= 4000),
    CONSTRAINT messages_type_check CHECK (message_type IN ('text', 'system', 'file'))
);

-- 6. Create message_attachments table
CREATE TABLE IF NOT EXISTS public.message_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT attachments_file_size_limit CHECK (file_size <= 10485760), -- 10MB limit
    CONSTRAINT attachments_file_name_not_empty CHECK (char_length(trim(file_name)) > 0)
);

-- 7. Create pinned_messages table
CREATE TABLE IF NOT EXISTS public.pinned_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
    pinned_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    pinned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(conversation_id, message_id)
);

-- 8. Create status_history table for tracking status changes
CREATE TABLE IF NOT EXISTS public.status_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    previous_status user_status_type,
    new_status user_status_type NOT NULL,
    previous_message TEXT,
    new_message TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration_minutes INTEGER, -- Calculated when status changes
    
    -- Constraints
    CONSTRAINT status_history_duration_positive CHECK (duration_minutes IS NULL OR duration_minutes >= 0)
);

-- 9. Enable Row Level Security (RLS)
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for user_status
DROP POLICY IF EXISTS "Users can view status of company members" ON public.user_status;
CREATE POLICY "Users can view status of company members" ON public.user_status
    FOR SELECT USING (
        company_id IN (
            SELECT cm.company_id FROM public.company_members cm 
            WHERE cm.user_id = auth.uid() AND cm.is_active = true
        )
    );

DROP POLICY IF EXISTS "Users can manage their own status" ON public.user_status;
CREATE POLICY "Users can manage their own status" ON public.user_status
    FOR ALL USING (user_id = auth.uid());

-- 11. Create RLS policies for conversations
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
CREATE POLICY "Users can view conversations they participate in" ON public.conversations
    FOR SELECT USING (
        id IN (
            SELECT cp.conversation_id FROM public.conversation_participants cp 
            WHERE cp.user_id = auth.uid() AND cp.is_active = true
        )
    );

DROP POLICY IF EXISTS "Users can create conversations in their company" ON public.conversations;
CREATE POLICY "Users can create conversations in their company" ON public.conversations
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT cm.company_id FROM public.company_members cm 
            WHERE cm.user_id = auth.uid() AND cm.is_active = true
        )
    );

-- 12. Create RLS policies for conversation_participants
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view participants of their conversations" ON public.conversation_participants
    FOR SELECT USING (
        conversation_id IN (
            SELECT cp.conversation_id FROM public.conversation_participants cp 
            WHERE cp.user_id = auth.uid() AND cp.is_active = true
        )
    );

DROP POLICY IF EXISTS "Users can manage their own participation" ON public.conversation_participants;
CREATE POLICY "Users can manage their own participation" ON public.conversation_participants
    FOR ALL USING (user_id = auth.uid());

-- 13. Create RLS policies for messages
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations" ON public.messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT cp.conversation_id FROM public.conversation_participants cp 
            WHERE cp.user_id = auth.uid() AND cp.is_active = true
        )
    );

DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
CREATE POLICY "Users can send messages to their conversations" ON public.messages
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        conversation_id IN (
            SELECT cp.conversation_id FROM public.conversation_participants cp 
            WHERE cp.user_id = auth.uid() AND cp.is_active = true
        )
    );

DROP POLICY IF EXISTS "Users can edit their own messages" ON public.messages;
CREATE POLICY "Users can edit their own messages" ON public.messages
    FOR UPDATE USING (user_id = auth.uid());

-- 14. Create RLS policies for message_attachments
DROP POLICY IF EXISTS "Users can view attachments in their conversations" ON public.message_attachments;
CREATE POLICY "Users can view attachments in their conversations" ON public.message_attachments
    FOR SELECT USING (
        message_id IN (
            SELECT m.id FROM public.messages m
            JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id
            WHERE cp.user_id = auth.uid() AND cp.is_active = true
        )
    );

-- 15. Create RLS policies for pinned_messages
DROP POLICY IF EXISTS "Users can view pinned messages in their conversations" ON public.pinned_messages;
CREATE POLICY "Users can view pinned messages in their conversations" ON public.pinned_messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT cp.conversation_id FROM public.conversation_participants cp 
            WHERE cp.user_id = auth.uid() AND cp.is_active = true
        )
    );

-- 16. Create RLS policies for status_history
DROP POLICY IF EXISTS "Users can view their own status history" ON public.status_history;
CREATE POLICY "Users can view their own status history" ON public.status_history
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view company status history" ON public.status_history;
CREATE POLICY "Admins can view company status history" ON public.status_history
    FOR SELECT USING (
        company_id IN (
            SELECT cm.company_id FROM public.company_members cm 
            WHERE cm.user_id = auth.uid() 
            AND cm.role IN ('owner', 'admin') 
            AND cm.is_active = true
        )
    );

-- 17. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_status_user_company ON public.user_status(user_id, company_id);
CREATE INDEX IF NOT EXISTS idx_user_status_company_online ON public.user_status(company_id, is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_user_status_last_activity ON public.user_status(last_activity_at);

CREATE INDEX IF NOT EXISTS idx_conversations_company ON public.conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_active ON public.conversation_participants(conversation_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_not_deleted ON public.messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_message_attachments_message ON public.message_attachments(message_id);

CREATE INDEX IF NOT EXISTS idx_pinned_messages_conversation ON public.pinned_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_status_history_user ON public.status_history(user_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_history_company ON public.status_history(company_id, changed_at DESC);

-- 18. Create triggers for updated_at timestamps
DO $$ BEGIN
    CREATE TRIGGER update_user_status_updated_at 
        BEFORE UPDATE ON public.user_status 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_conversations_updated_at 
        BEFORE UPDATE ON public.conversations 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 19. Create function to update conversation last_message_at
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations 
    SET last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating conversation last_message_at
DO $$ BEGIN
    CREATE TRIGGER update_conversation_last_message_trigger
        AFTER INSERT ON public.messages
        FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 20. Create function to track status changes
CREATE OR REPLACE FUNCTION track_status_change()
RETURNS TRIGGER AS $$
DECLARE
    duration_mins INTEGER;
BEGIN
    -- Calculate duration if there was a previous status
    IF OLD.status IS NOT NULL THEN
        duration_mins := EXTRACT(EPOCH FROM (NOW() - OLD.updated_at)) / 60;
        
        INSERT INTO public.status_history (
            user_id, 
            company_id, 
            previous_status, 
            new_status,
            previous_message,
            new_message,
            duration_minutes
        ) VALUES (
            NEW.user_id,
            NEW.company_id,
            OLD.status,
            NEW.status,
            OLD.custom_message,
            NEW.custom_message,
            duration_mins
        );
    ELSE
        -- First status entry
        INSERT INTO public.status_history (
            user_id, 
            company_id, 
            new_status,
            new_message
        ) VALUES (
            NEW.user_id,
            NEW.company_id,
            NEW.status,
            NEW.custom_message
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status change tracking
DO $$ BEGIN
    CREATE TRIGGER track_status_change_trigger
        AFTER UPDATE OF status, custom_message ON public.user_status
        FOR EACH ROW EXECUTE FUNCTION track_status_change();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 21. Grant necessary permissions
GRANT ALL ON public.user_status TO authenticated;
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.conversation_participants TO authenticated;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.message_attachments TO authenticated;
GRANT ALL ON public.pinned_messages TO authenticated;
GRANT ALL ON public.status_history TO authenticated;

-- 22. Create function to initialize user status when joining company
CREATE OR REPLACE FUNCTION initialize_user_status()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_status (user_id, company_id, status, custom_message)
    VALUES (NEW.user_id, NEW.company_id, 'offline', 'Finished for today')
    ON CONFLICT (user_id, company_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to initialize status when user joins company
DO $$ BEGIN
    CREATE TRIGGER initialize_user_status_trigger
        AFTER INSERT ON public.company_members
        FOR EACH ROW EXECUTE FUNCTION initialize_user_status();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 21. Create function to create direct conversations
CREATE OR REPLACE FUNCTION create_direct_conversation(
    participant1_id UUID,
    participant2_id UUID,
    company_id UUID
)
RETURNS UUID AS $$
DECLARE
    conversation_id UUID;
    existing_conversation_id UUID;
BEGIN
    -- Check if conversation already exists between these users
    SELECT c.id INTO existing_conversation_id
    FROM public.conversations c
    JOIN public.conversation_participants cp1 ON c.id = cp1.conversation_id
    JOIN public.conversation_participants cp2 ON c.id = cp2.conversation_id
    WHERE c.type = 'direct' 
    AND c.company_id = company_id
    AND cp1.user_id = participant1_id 
    AND cp2.user_id = participant2_id
    AND cp1.is_active = true 
    AND cp2.is_active = true;
    
    IF existing_conversation_id IS NOT NULL THEN
        RETURN existing_conversation_id;
    END IF;
    
    -- Create new conversation
    INSERT INTO public.conversations (company_id, type, created_by)
    VALUES (company_id, 'direct', participant1_id)
    RETURNING id INTO conversation_id;
    
    -- Add participants
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES 
        (conversation_id, participant1_id),
        (conversation_id, participant2_id);
    
    RETURN conversation_id;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION create_direct_conversation TO authenticated;