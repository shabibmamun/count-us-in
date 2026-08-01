-- Count Us In - Supabase Row Level Security (RLS) Policies
-- Phase 2 Foundation migration

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saving_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zakat_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_guide_insights ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- 0. Security helper functions
--------------------------------------------------------------------------------

-- Checks if a user is an active member of a given workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(w_id UUID, u_id UUID)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.workspace_members
        WHERE workspace_id = w_id AND profile_id = u_id
    );
END;
$$ LANGUAGE plpgsql;

-- Checks workspace roles (e.g. owner or admin)
CREATE OR REPLACE FUNCTION public.get_workspace_role(w_id UUID, u_id UUID)
RETURNS TEXT SECURITY DEFINER AS $$
DECLARE
    member_role TEXT;
BEGIN
    SELECT role INTO member_role FROM public.workspace_members
    WHERE workspace_id = w_id AND profile_id = u_id;
    RETURN member_role;
END;
$$ LANGUAGE plpgsql;

--------------------------------------------------------------------------------
-- 1. Profiles Policies
--------------------------------------------------------------------------------
CREATE POLICY "Users can view all profiles they share a workspace with" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id OR EXISTS (
            SELECT 1 FROM public.workspace_members m1
            JOIN public.workspace_members m2 ON m1.workspace_id = m2.workspace_id
            WHERE m1.profile_id = auth.uid() AND m2.profile_id = id
        )
    );

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

--------------------------------------------------------------------------------
-- 2. Workspaces Policies
--------------------------------------------------------------------------------
CREATE POLICY "Users can view workspaces they are members of" ON public.workspaces
    FOR SELECT USING (public.is_workspace_member(id, auth.uid()));

CREATE POLICY "Users can create workspaces" ON public.workspaces
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners and admins can update workspace settings" ON public.workspaces
    FOR UPDATE USING (public.get_workspace_role(id, auth.uid()) IN ('owner', 'admin'));

CREATE POLICY "Owners can delete their workspaces" ON public.workspaces
    FOR DELETE USING (public.get_workspace_role(id, auth.uid()) = 'owner');

--------------------------------------------------------------------------------
-- 3. Workspace Members Policies
--------------------------------------------------------------------------------
CREATE POLICY "Members can view membership lists" ON public.workspace_members
    FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()));

-- Only owners and admins can insert new members (usually completed via invitations helper)
CREATE POLICY "Admins and owners can add members" ON public.workspace_members
    FOR INSERT WITH CHECK (
        public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin') OR
        -- Allow onboarding self-insertion for new spaces
        EXISTS (
            SELECT 1 FROM public.workspaces w 
            WHERE w.id = workspace_id AND w.created_by = auth.uid()
        )
    );

CREATE POLICY "Owners can update member roles" ON public.workspace_members
    FOR UPDATE USING (public.get_workspace_role(workspace_id, auth.uid()) = 'owner');

CREATE POLICY "Owners can remove members, members can leave" ON public.workspace_members
    FOR DELETE USING (
        public.get_workspace_role(workspace_id, auth.uid()) = 'owner' OR 
        profile_id = auth.uid()
    );

--------------------------------------------------------------------------------
-- 4. Workspace Invitations Policies
--------------------------------------------------------------------------------
CREATE POLICY "Admins and owners can view invitations" ON public.workspace_invitations
    FOR SELECT USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin'));

CREATE POLICY "Admins and owners can create invitations" ON public.workspace_invitations
    FOR INSERT WITH CHECK (
        public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin') AND 
        auth.uid() = created_by
    );

CREATE POLICY "Admins and owners can revoke invitations" ON public.workspace_invitations
    FOR UPDATE USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin'));

--------------------------------------------------------------------------------
-- 5. Categories Policies
--------------------------------------------------------------------------------
CREATE POLICY "Users can view system and workspace categories" ON public.categories
    FOR SELECT USING (workspace_id IS NULL OR public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Admins and owners can create categories" ON public.categories
    FOR INSERT WITH CHECK (workspace_id IS NOT NULL AND public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin'));

CREATE POLICY "Admins and owners can edit/archive categories" ON public.categories
    FOR UPDATE USING (workspace_id IS NOT NULL AND public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin'));

--------------------------------------------------------------------------------
-- 6. Merchant Rules Policies
--------------------------------------------------------------------------------
CREATE POLICY "Members can view merchant rules" ON public.merchant_rules
    FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can manage merchant rules" ON public.merchant_rules
    FOR ALL USING (public.is_workspace_member(workspace_id, auth.uid()));

--------------------------------------------------------------------------------
-- 7. Expenses Policies
--------------------------------------------------------------------------------
CREATE POLICY "Members can view shared expenses, owners can view private ones" ON public.expenses
    FOR SELECT USING (
        public.is_workspace_member(workspace_id, auth.uid()) AND (
            visibility = 'shared_all' OR 
            (visibility = 'private' AND paid_by = auth.uid()) OR
            (visibility = 'shared_selected' AND EXISTS (
                -- Check if user is a participant of this expense
                SELECT 1 FROM public.expense_participants ep
                WHERE ep.expense_id = id AND ep.profile_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Members can insert expenses" ON public.expenses
    FOR INSERT WITH CHECK (
        public.is_workspace_member(workspace_id, auth.uid()) AND 
        auth.uid() = created_by
    );

CREATE POLICY "Members can update their own expenses, owners/admins can update all" ON public.expenses
    FOR UPDATE USING (
        public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin') OR 
        created_by = auth.uid()
    );

CREATE POLICY "Members can delete their own, owners/admins can delete all" ON public.expenses
    FOR DELETE USING (
        public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin') OR 
        created_by = auth.uid()
    );

--------------------------------------------------------------------------------
-- 8. Expense Participants & Splits Policies
--------------------------------------------------------------------------------
CREATE POLICY "Members can view expense split participant details" ON public.expense_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.expenses e
            WHERE e.id = expense_id AND public.is_workspace_member(e.workspace_id, auth.uid())
        )
    );

CREATE POLICY "Members can manage splits" ON public.expense_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.expenses e
            WHERE e.id = expense_id AND public.is_workspace_member(e.workspace_id, auth.uid())
        )
    );

CREATE POLICY "Members can view splits" ON public.expense_splits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.expenses e
            WHERE e.id = expense_id AND public.is_workspace_member(e.workspace_id, auth.uid())
        )
    );

CREATE POLICY "Members can manage split types" ON public.expense_splits
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.expenses e
            WHERE e.id = expense_id AND public.is_workspace_member(e.workspace_id, auth.uid())
        )
    );

--------------------------------------------------------------------------------
-- 10. Incomes Policies
--------------------------------------------------------------------------------
CREATE POLICY "Members can view visible incomes, profile owner views private" ON public.incomes
    FOR SELECT USING (
        public.is_workspace_member(workspace_id, auth.uid()) AND (
            profile_id = auth.uid() OR
            visibility = 'shared_all' OR
            (visibility = 'shared_selected' AND EXISTS (
                SELECT 1 FROM public.workspace_members
                WHERE workspace_id = incomes.workspace_id AND profile_id = auth.uid()
            ))
        )
    );

CREATE POLICY "Users can manage their own income records" ON public.incomes
    FOR ALL USING (
        public.is_workspace_member(workspace_id, auth.uid()) AND 
        profile_id = auth.uid()
    );

--------------------------------------------------------------------------------
-- 11. Monthly Budgets & Saving Targets
--------------------------------------------------------------------------------
CREATE POLICY "Members can view budgets" ON public.monthly_budgets
    FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Admins and owners can manage budgets" ON public.monthly_budgets
    FOR ALL USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin'));

CREATE POLICY "Members can view savings targets" ON public.saving_targets
    FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Admins and owners can manage savings targets" ON public.saving_targets
    FOR ALL USING (public.get_workspace_role(workspace_id, auth.uid()) IN ('owner', 'admin'));

--------------------------------------------------------------------------------
-- 13. Zakat Payments Policies
--------------------------------------------------------------------------------
CREATE POLICY "Users can view Zakat payments according to visibility settings" ON public.zakat_payments
    FOR SELECT USING (
        profile_id = auth.uid() OR (
            visibility = 'shared_all' AND EXISTS (
                SELECT 1 FROM public.workspace_members m1
                JOIN public.workspace_members m2 ON m1.workspace_id = m2.workspace_id
                WHERE m1.profile_id = auth.uid() AND m2.profile_id = zakat_payments.profile_id
            )
        )
    );

CREATE POLICY "Users can manage their own Zakat records" ON public.zakat_payments
    FOR ALL USING (profile_id = auth.uid());

--------------------------------------------------------------------------------
-- 14. Settlements Policies
--------------------------------------------------------------------------------
CREATE POLICY "Members can view settlements in their workspace" ON public.settlements
    FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can record settlements in their workspace" ON public.settlements
    FOR INSERT WITH CHECK (
        public.is_workspace_member(workspace_id, auth.uid()) AND 
        (payer_id = auth.uid() OR recipient_id = auth.uid())
    );

CREATE POLICY "Members can delete/update their own settlement entries" ON public.settlements
    FOR ALL USING (
        public.is_workspace_member(workspace_id, auth.uid()) AND 
        (payer_id = auth.uid() OR recipient_id = auth.uid())
    );

--------------------------------------------------------------------------------
-- 15. Receipts Policies
--------------------------------------------------------------------------------
CREATE POLICY "Members can view receipts they are authorized to access" ON public.receipts
    FOR SELECT USING (
        public.is_workspace_member(workspace_id, auth.uid()) AND (
            -- Either uploaded it
            uploaded_by = auth.uid() OR
            -- Or it is attached to an expense they can view
            (expense_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.expenses e
                WHERE e.id = expense_id AND (
                    e.visibility = 'shared_all' OR 
                    (e.visibility = 'private' AND e.paid_by = auth.uid()) OR
                    (e.visibility = 'shared_selected' AND EXISTS (
                        SELECT 1 FROM public.expense_participants ep
                        WHERE ep.expense_id = e.id AND ep.profile_id = auth.uid()
                    ))
                )
            ))
        )
    );

CREATE POLICY "Members can upload receipts" ON public.receipts
    FOR INSERT WITH CHECK (
        public.is_workspace_member(workspace_id, auth.uid()) AND 
        uploaded_by = auth.uid()
    );

CREATE POLICY "Members can delete their uploaded receipts" ON public.receipts
    FOR DELETE USING (uploaded_by = auth.uid());

--------------------------------------------------------------------------------
-- 16. Recurring Templates Policies
--------------------------------------------------------------------------------
CREATE POLICY "Members can view recurring templates" ON public.recurring_templates
    FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Members can manage recurring templates" ON public.recurring_templates
    FOR ALL USING (public.is_workspace_member(workspace_id, auth.uid()));

--------------------------------------------------------------------------------
-- 17. Audit Logs Policies
--------------------------------------------------------------------------------
CREATE POLICY "Members can view audit logs" ON public.audit_logs
    FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id, auth.uid()));

--------------------------------------------------------------------------------
-- 18. Smart Guide Insights Policies
--------------------------------------------------------------------------------
CREATE POLICY "Members can view insights" ON public.smart_guide_insights
    FOR SELECT USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "System can manage insights" ON public.smart_guide_insights
    FOR ALL USING (public.is_workspace_member(workspace_id, auth.uid()));
