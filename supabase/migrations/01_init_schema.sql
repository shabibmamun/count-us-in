-- Count Us In - Supabase Initial Database Schema
-- Phase 2 Foundation migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. profiles table (maps to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'BDT',
    timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('solo', 'group')),
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    budget_start_day INT NOT NULL DEFAULT 1 CHECK (budget_start_day >= 1 AND budget_start_day <= 31),
    monthly_saving_target NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (monthly_saving_target >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'BDT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. workspace_members table
CREATE TABLE IF NOT EXISTS public.workspace_members (
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (workspace_id, profile_id)
);

-- 4. workspace_invitations table
CREATE TABLE IF NOT EXISTS public.workspace_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    email TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    is_used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE, -- NULL means default system-wide
    name TEXT NOT NULL,
    icon TEXT, -- Lucide icon name
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_workspace_category UNIQUE (workspace_id, name)
);

-- 6. merchant_rules table
CREATE TABLE IF NOT EXISTS public.merchant_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    merchant_name TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_workspace_merchant UNIQUE (workspace_id, merchant_name)
);

-- 7. expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'BDT',
    expense_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    merchant TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id),
    paid_by UUID NOT NULL REFERENCES public.profiles(id),
    visibility TEXT NOT NULL CHECK (visibility IN ('private', 'shared_selected', 'shared_all')),
    notes TEXT,
    receipt_url TEXT,
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. expense_participants table
CREATE TABLE IF NOT EXISTS public.expense_participants (
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    split_amount NUMERIC(15, 2) NOT NULL CHECK (split_amount >= 0),
    share_units NUMERIC(15, 4),
    custom_value NUMERIC(15, 4),
    PRIMARY KEY (expense_id, profile_id)
);

-- 9. expense_splits table
CREATE TABLE IF NOT EXISTS public.expense_splits (
    expense_id UUID PRIMARY KEY REFERENCES public.expenses(id) ON DELETE CASCADE,
    split_method TEXT NOT NULL CHECK (split_method IN ('equal', 'percentage', 'fixed', 'income_weighted', 'shares'))
);

-- 10. incomes table
CREATE TABLE IF NOT EXISTS public.incomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'BDT',
    income_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    income_type TEXT NOT NULL CHECK (income_type IN ('Salary', 'Business income', 'Bonus', 'Freelance income', 'Rental income', 'Investment income', 'Other')),
    visibility TEXT NOT NULL CHECK (visibility IN ('private', 'shared_selected', 'shared_all')),
    notes TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. monthly_budgets table
CREATE TABLE IF NOT EXISTS public.monthly_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE, -- NULL means overall budget
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    month_date DATE NOT NULL, -- Date representing start of month (e.g. YYYY-MM-01)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_workspace_category_month UNIQUE (workspace_id, category_id, month_date)
);

-- 12. saving_targets table
CREATE TABLE IF NOT EXISTS public.saving_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    target_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_workspace_target_date UNIQUE (workspace_id, target_date)
);

-- 13. zakat_payments table
CREATE TABLE IF NOT EXISTS public.zakat_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT,
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared_selected', 'shared_all')),
    recipient TEXT,
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    zakat_year INT NOT NULL, -- Calendar year of calculation
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. settlements table
CREATE TABLE IF NOT EXISTS public.settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    payer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'BDT',
    settlement_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT,
    period_start DATE,
    period_end DATE,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. receipts table
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    ocr_data JSONB,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. recurring_templates table
CREATE TABLE IF NOT EXISTS public.recurring_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'BDT',
    merchant TEXT NOT NULL,
    category_id UUID REFERENCES public.categories(id),
    paid_by UUID NOT NULL REFERENCES public.profiles(id),
    visibility TEXT NOT NULL CHECK (visibility IN ('private', 'shared_selected', 'shared_all')),
    type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
    notes TEXT,
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    next_occurrence DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 18. smart_guide_insights table
CREATE TABLE IF NOT EXISTS public.smart_guide_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create essential indexes for query performance
CREATE INDEX IF NOT EXISTS idx_workspace_members_profile ON public.workspace_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_expenses_workspace ON public.expenses(workspace_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_expenses_payer ON public.expenses(paid_by);
CREATE INDEX IF NOT EXISTS idx_incomes_workspace ON public.incomes(workspace_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_zakat_profile ON public.zakat_payments(profile_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_settlements_workspace ON public.settlements(workspace_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace ON public.audit_logs(workspace_id);
