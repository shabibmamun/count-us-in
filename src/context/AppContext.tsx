'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { calculateSplit, SplitResult, SplitMethod, ParticipantInput } from '@/lib/calculations';

// ----------------------------------------------------------------------------
// Interfaces & Types
// ----------------------------------------------------------------------------

export interface Profile {
  id: string;
  display_name: string;
  currency: string;
  timezone: string;
  avatar_url?: string;
}

export interface Workspace {
  id: string;
  name: string;
  type: 'solo' | 'group';
  created_by: string;
  budget_start_day: number;
  monthly_saving_target: number;
  currency: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  profile_id: string;
  role: 'owner' | 'admin' | 'member';
  display_name?: string; // Hydrated
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email?: string;
  role: 'admin' | 'member';
  expires_at: string;
  created_by: string;
  is_revoked: boolean;
  is_used: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  workspace_id: string | null; // null for system defaults
  name: string;
  icon?: string;
  is_archived: boolean;
}

export interface MerchantRule {
  id: string;
  workspace_id: string;
  merchant_name: string;
  category_id: string;
}

export interface Expense {
  id: string;
  workspace_id: string;
  amount: number;
  currency: string;
  expense_date: string;
  merchant: string;
  category_id: string;
  paid_by: string;
  visibility: 'private' | 'shared_selected' | 'shared_all';
  notes?: string;
  receipt_url?: string;
  payment_method: string;
  is_deleted: boolean;
  created_by: string;
  created_at: string;
  // Hydrated helper
  participants?: SplitResult[];
  split_method?: SplitMethod;
}

export interface Income {
  id: string;
  profile_id: string;
  workspace_id: string;
  amount: number;
  currency: string;
  income_date: string;
  income_type: 'Salary' | 'Business income' | 'Bonus' | 'Freelance income' | 'Rental income' | 'Investment income' | 'Other';
  visibility: 'private' | 'shared_selected' | 'shared_all';
  notes?: string;
  is_deleted: boolean;
}

export interface MonthlyBudget {
  id: string;
  workspace_id: string;
  category_id: string | null; // null = overall budget
  amount: number;
  month_date: string; // YYYY-MM-01
}

export interface SavingTarget {
  id: string;
  workspace_id: string;
  amount: number;
  target_date: string; // YYYY-MM-01
}

export interface ZakatPayment {
  id: string;
  profile_id: string;
  amount: number;
  payment_date: string;
  notes?: string;
  visibility: 'private' | 'shared_selected' | 'shared_all';
  recipient?: string;
  payment_method: string;
  zakat_year: number;
  is_deleted: boolean;
}

export interface Settlement {
  id: string;
  workspace_id: string;
  payer_id: string;
  recipient_id: string;
  amount: number;
  currency: string;
  settlement_date: string;
  notes?: string;
  period_start?: string;
  period_end?: string;
  is_deleted: boolean;
}

export interface AuditLog {
  id: string;
  workspace_id?: string;
  user_id?: string;
  action: string;
  metadata?: any;
  created_at: string;
}

// ----------------------------------------------------------------------------
// App Context Interface
// ----------------------------------------------------------------------------

interface AppContextType {
  user: Profile | null;
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
  categories: Category[];
  merchantRules: MerchantRule[];
  expenses: Expense[];
  incomes: Income[];
  budgets: MonthlyBudget[];
  savingTargets: SavingTarget[];
  zakatPayments: ZakatPayment[];
  settlements: Settlement[];
  auditLogs: AuditLog[];
  recurringTemplates: any[];
  isFallbackMode: boolean; // True if using localStorage instead of Supabase
  isConnectionError: boolean;
  isLoading: boolean;
  
  // Auth Operations
  signUp: (email: string, displayName: string) => Promise<void>;
  logIn: (email: string) => Promise<void>;
  logInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  updateProfile: (profile: Partial<Profile>) => Promise<void>;
  
  // Workspace Operations
  createWorkspace: (name: string, type: 'solo' | 'group', currency?: string) => Promise<Workspace>;
  updateWorkspaceSettings: (settings: Partial<Workspace>) => Promise<void>;
  switchWorkspace: (workspaceId: string) => void;
  leaveWorkspace: () => Promise<void>;
  deleteWorkspace: () => Promise<void>;
  
  // Member Operations
  createInvitation: (email?: string, role?: 'admin' | 'member') => Promise<string>; // returns share link
  revokeInvitation: (invitationId: string) => Promise<void>;
  joinWorkspace: (token: string) => Promise<void>;
  removeMember: (profileId: string) => Promise<void>;
  
  // Category & Merchant Rules
  addCategory: (name: string, icon?: string) => Promise<Category>;
  archiveCategory: (categoryId: string) => Promise<void>;
  addMerchantRule: (merchantName: string, categoryId: string) => Promise<void>;
  
  // Financial Operations
  addExpense: (
    amount: number,
    merchant: string,
    categoryId: string,
    paidBy: string,
    visibility: 'private' | 'shared_selected' | 'shared_all',
    participants: ParticipantInput[],
    splitMethod: SplitMethod,
    options?: Partial<Expense>
  ) => Promise<void>;
  editExpense: (
    expenseId: string,
    updates: Partial<Expense>,
    participants?: ParticipantInput[],
    splitMethod?: SplitMethod
  ) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  
  addIncome: (
    amount: number,
    type: Income['income_type'],
    visibility: Income['visibility'],
    options?: Partial<Income>
  ) => Promise<void>;
  editIncome: (incomeId: string, updates: Partial<Income>) => Promise<void>;
  deleteIncome: (incomeId: string) => Promise<void>;
  
  // Budget & Saving Targets
  saveBudget: (amount: number, categoryId: string | null, monthDate: string) => Promise<void>;
  saveSavingTarget: (amount: number, targetDate: string) => Promise<void>;
  
  // Zakat
  addZakat: (amount: number, year: number, options?: Partial<ZakatPayment>) => Promise<void>;
  deleteZakat: (zakatId: string) => Promise<void>;
  editZakat: (zakatId: string, updates: Partial<ZakatPayment>) => Promise<void>;
  
  // Settlements
  addSettlement: (payerId: string, recipientId: string, amount: number, notes?: string) => Promise<void>;
  deleteSettlement: (settlementId: string) => Promise<void>;
  
  // Admin / Privacy
  logAction: (action: string, metadata?: any) => Promise<void>;
  clearSmartInsights: () => void;
  purgeUserData: () => Promise<void>;
  importBackup: (backupData: string) => Promise<void>;
  addRecurringTemplate: (
    type: 'expense' | 'income',
    amount: number,
    name: string,
    categoryId: string | null,
    visibility: 'private' | 'shared_selected' | 'shared_all',
    nextOccurrence: string,
    options?: any
  ) => Promise<void>;
  deleteRecurringTemplate: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ----------------------------------------------------------------------------
// Defaults & Mocks
// ----------------------------------------------------------------------------

const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'workspace_id'>[] = [
  { name: 'Housing', icon: 'Home', is_archived: false },
  { name: 'Groceries', icon: 'ShoppingBag', is_archived: false },
  { name: 'Dining', icon: 'Utensils', is_archived: false },
  { name: 'Transport', icon: 'Car', is_archived: false },
  { name: 'Utilities', icon: 'Activity', is_archived: false },
  { name: 'Healthcare', icon: 'HeartPulse', is_archived: false },
  { name: 'Education', icon: 'GraduationCap', is_archived: false },
  { name: 'Shopping', icon: 'ShoppingBag', is_archived: false },
  { name: 'Entertainment', icon: 'Gamepad2', is_archived: false },
  { name: 'Travel', icon: 'Compass', is_archived: false },
  { name: 'Family support', icon: 'Users', is_archived: false },
  { name: 'Gifts', icon: 'Gift', is_archived: false },
  { name: 'Charity and Sadaqah', icon: 'Heart', is_archived: false },
  { name: 'Zakat', icon: 'Coins', is_archived: false },
  { name: 'Debt payments', icon: 'TrendingDown', is_archived: false },
  { name: 'Loan EMI', icon: 'TrendingDown', is_archived: false },
  { name: 'Insurance', icon: 'Shield', is_archived: false },
  { name: 'Household services', icon: 'Wrench', is_archived: false },
  { name: 'Personal care', icon: 'Sparkles', is_archived: false },
  { name: 'Children', icon: 'Baby', is_archived: false },
  { name: 'Savings and investments', icon: 'TrendingUp', is_archived: false },
  { name: 'Fees', icon: 'Percent', is_archived: false },
  { name: 'Other', icon: 'MoreHorizontal', is_archived: false },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchantRules, setMerchantRules] = useState<MerchantRule[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [budgets, setBudgets] = useState<MonthlyBudget[]>([]);
  const [savingTargets, setSavingTargets] = useState<SavingTarget[]>([]);
  const [zakatPayments, setZakatPayments] = useState<ZakatPayment[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [recurringTemplates, setRecurringTemplates] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [isConnectionError, setIsConnectionError] = useState(false);

  // ----------------------------------------------------------------------------
  // Helper: Synchronize state with localStorage in case of fallback
  // ----------------------------------------------------------------------------
  const loadFromLocalStorage = () => {
    try {
      setIsFallbackMode(true);
      const storedUser = localStorage.getItem('cui_user');
      const storedWorkspaces = localStorage.getItem('cui_workspaces');
      const storedCurrentWorkspace = localStorage.getItem('cui_curr_ws');
      const storedMembers = localStorage.getItem('cui_members');
      const storedInvitations = localStorage.getItem('cui_invitations');
      const storedCategories = localStorage.getItem('cui_categories');
      const storedExpenses = localStorage.getItem('cui_expenses');
      const storedIncomes = localStorage.getItem('cui_incomes');
      const storedBudgets = localStorage.getItem('cui_budgets');
      const storedTargets = localStorage.getItem('cui_saving_targets');
      const storedZakat = localStorage.getItem('cui_zakat');
      const storedSettlements = localStorage.getItem('cui_settlements');
      const storedAudit = localStorage.getItem('cui_audit_logs');
      const storedRules = localStorage.getItem('cui_merchant_rules');

      if (storedUser) setUser(JSON.parse(storedUser));
      if (storedWorkspaces) setWorkspaces(JSON.parse(storedWorkspaces));
      if (storedCurrentWorkspace) setCurrentWorkspace(JSON.parse(storedCurrentWorkspace));
      if (storedMembers) setMembers(JSON.parse(storedMembers));
      if (storedInvitations) setInvitations(JSON.parse(storedInvitations));
      if (storedCategories) {
        setCategories(JSON.parse(storedCategories));
      } else {
        // Initialize fallback system categories
        const systemCategories = DEFAULT_CATEGORIES.map((cat, idx) => ({
          id: `sys-cat-${idx}`,
          workspace_id: null,
          ...cat,
        }));
        setCategories(systemCategories);
        localStorage.setItem('cui_categories', JSON.stringify(systemCategories));
      }

      if (storedExpenses) setExpenses(JSON.parse(storedExpenses));
      if (storedIncomes) setIncomes(JSON.parse(storedIncomes));
      if (storedBudgets) setBudgets(JSON.parse(storedBudgets));
      if (storedTargets) setSavingTargets(JSON.parse(storedTargets));
      if (storedZakat) setZakatPayments(JSON.parse(storedZakat));
      if (storedSettlements) setSettlements(JSON.parse(storedSettlements));
      if (storedAudit) setAuditLogs(JSON.parse(storedAudit));
      if (storedRules) setMerchantRules(JSON.parse(storedRules));

      const storedTemplates = localStorage.getItem('cui_recurring_templates');
      if (storedTemplates) {
        const parsed = JSON.parse(storedTemplates);
        setRecurringTemplates(parsed);
        setTimeout(() => {
          if (parsed.length > 0 && storedCurrentWorkspace) {
            const ws = JSON.parse(storedCurrentWorkspace);
            processRecurringItems(parsed, ws.id);
          }
        }, 100);
      }
    } catch (e) {
      console.error('Error loading fallback data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const processRecurringItems = async (templates: any[], workspaceId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    let updatedTemplates = [...templates];
    let templatesChanged = false;

    // Use simple references to state to prevent scoping build issues
    const currentExpenses = [...expenses];
    const currentIncomes = [...incomes];

    for (const t of updatedTemplates) {
      if (!t.is_active) continue;
      let nextOcc = t.next_occurrence;
      
      while (nextOcc <= todayStr) {
        if (t.type === 'income') {
          const incId = isFallbackMode ? `inc-rec-${Math.random().toString(36).substring(2, 9)}` : crypto.randomUUID();
          const inc: Income = {
            id: incId,
            profile_id: t.paid_by,
            workspace_id: workspaceId,
            amount: t.amount,
            currency: t.currency,
            income_date: nextOcc + 'T12:00:00Z',
            income_type: t.merchant as any,
            visibility: t.visibility,
            notes: `Auto-generated from template`,
            is_deleted: false,
          };
          
          if (isFallbackMode) {
            currentIncomes.push(inc);
          } else {
            await supabase.from('incomes').insert({
              id: incId,
              profile_id: inc.profile_id,
              workspace_id: workspaceId,
              amount: inc.amount,
              currency: inc.currency,
              income_date: inc.income_date,
              income_type: inc.income_type,
              visibility: inc.visibility,
              notes: inc.notes,
            });
          }
        } else {
          const expenseId = isFallbackMode ? `exp-rec-${Math.random().toString(36).substring(2, 9)}` : crypto.randomUUID();
          const splitResults = calculateSplit(t.amount, [{ profileId: t.paid_by }], 'equal', t.paid_by);
          const exp: Expense = {
            id: expenseId,
            workspace_id: workspaceId,
            amount: t.amount,
            currency: t.currency,
            expense_date: nextOcc + 'T12:00:00Z',
            merchant: t.merchant,
            category_id: t.category_id,
            paid_by: t.paid_by,
            visibility: t.visibility,
            notes: `Auto-generated from template`,
            payment_method: t.payment_method || 'Cash',
            is_deleted: false,
            created_by: t.paid_by,
            created_at: new Date().toISOString(),
            split_method: 'equal',
            participants: splitResults,
          };

          if (isFallbackMode) {
            currentExpenses.push(exp);
          } else {
            await supabase.from('expenses').insert({
              id: expenseId,
              workspace_id: workspaceId,
              amount: t.amount,
              currency: t.currency,
              expense_date: exp.expense_date,
              merchant: t.merchant,
              category_id: t.category_id,
              paid_by: t.paid_by,
              visibility: t.visibility,
              notes: exp.notes,
              payment_method: exp.payment_method,
              created_by: t.paid_by,
            });
            await supabase.from('expense_splits').insert({ expense_id: expenseId, split_method: 'equal' });
            await supabase.from('expense_participants').insert(
              splitResults.map(r => ({
                expense_id: expenseId,
                profile_id: r.profileId,
                split_amount: r.amount,
              }))
            );
          }
        }

        // Increment date
        const d = new Date(nextOcc + 'T12:00:00Z');
        if (t.frequency === 'daily') d.setDate(d.getDate() + 1);
        else if (t.frequency === 'weekly') d.setDate(d.getDate() + 7);
        else if (t.frequency === 'yearly') d.setFullYear(d.getFullYear() + 1);
        else d.setMonth(d.getMonth() + 1); // monthly

        nextOcc = d.toISOString().split('T')[0];
        t.next_occurrence = nextOcc;
        templatesChanged = true;
      }

      if (templatesChanged && !isFallbackMode) {
        await supabase.from('recurring_templates').update({ next_occurrence: t.next_occurrence }).eq('id', t.id);
      }
    }

    if (templatesChanged) {
      setRecurringTemplates(updatedTemplates);
      if (isFallbackMode) {
        saveToLocalStorage('cui_recurring_templates', updatedTemplates);
        setExpenses(currentExpenses);
        saveToLocalStorage('cui_expenses', currentExpenses);
        setIncomes(currentIncomes);
        saveToLocalStorage('cui_incomes', currentIncomes);
      } else {
        // Hydrate fresh data
        const { data: dbExpenses } = await supabase.from('expenses').select('*, expense_participants(*), expense_splits(*)').eq('workspace_id', workspaceId).eq('is_deleted', false);
        const parsedExpenses = (dbExpenses || []).map((exp: any) => ({
          ...exp,
          split_method: exp.expense_splits?.split_method || 'equal',
          participants: exp.expense_participants?.map((p: any) => ({
            profileId: p.profile_id,
            amount: p.split_amount,
            value: p.custom_value || p.share_units,
          })),
        }));
        setExpenses(parsedExpenses);

        const { data: dbIncomes } = await supabase.from('incomes').select('*').eq('workspace_id', workspaceId).eq('is_deleted', false);
        setIncomes(dbIncomes || []);
      }
    }
  };

  const saveToLocalStorage = (key: string, data: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
    }
  };

  // ----------------------------------------------------------------------------
  // Lifecycle Initialization
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const initApp = async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || url.includes('placeholder') || !key || key.includes('placeholder')) {
        setIsConnectionError(true);
        setIsLoading(false);
        return;
      }

      try {
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr) {
          setIsConnectionError(true);
          setIsLoading(false);
          return;
        }
        
        if (!session) {
          setIsLoading(false);
          return;
        }

        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileErr && profileErr.code !== 'PGRST116') {
          setIsConnectionError(true);
          setIsLoading(false);
          return;
        }

        if (!profile) {
          const partialProfile: Profile = {
            id: session.user.id,
            display_name: session.user.user_metadata?.given_name || session.user.user_metadata?.full_name?.split(' ')[0] || session.user.email?.split('@')[0] || 'User',
            currency: 'BDT',
            timezone: 'Asia/Dhaka',
          };
          setUser(partialProfile);
          setIsLoading(false);
          return;
        }

        setUser(profile);

        const { data: wsMembers, error: membersErr } = await supabase
          .from('workspace_members')
          .select('*, workspaces(*)')
          .eq('profile_id', session.user.id);

        if (membersErr) {
          setIsConnectionError(true);
          setIsLoading(false);
          return;
        }

        if (!wsMembers || wsMembers.length === 0) {
          setIsLoading(false);
          return;
        }

        const userWorkspaces = wsMembers.map((m: any) => m.workspaces).filter(Boolean) as Workspace[];
        setWorkspaces(userWorkspaces);

        const cachedWsId = localStorage.getItem('cui_curr_ws_id');
        let selectedWs = userWorkspaces.find(w => w.id === cachedWsId) || userWorkspaces[0];
        setCurrentWorkspace(selectedWs);

        await hydrateWorkspaceData(selectedWs.id, session.user.id);

      } catch (err) {
        console.error('Connection/Auth error:', err);
        setIsConnectionError(true);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  const hydrateWorkspaceData = async (workspaceId: string, userId: string) => {
    setIsLoading(true);
    try {
      // 1. Fetch workspace members
      const { data: rawMembers } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId);

      // Hydrate profiles for members
      const memberIds = rawMembers?.map(m => m.profile_id) || [];
      const { data: profilesList } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', memberIds);

      const hydratedMembers = (rawMembers || []).map(m => {
        const p = profilesList?.find(prof => prof.id === m.profile_id);
        return {
          ...m,
          display_name: p ? p.display_name : 'Group Member',
        };
      });
      setMembers(hydratedMembers);

      // 2. Fetch Categories (Default system ones + custom workspace ones)
      const { data: dbCategories } = await supabase
        .from('categories')
        .select('*')
        .or(`workspace_id.eq.${workspaceId},workspace_id.is.null`);

      // Filter and merge system defaults with workspace custom categories
      const systemCats = DEFAULT_CATEGORIES.map((c, i) => ({
        id: `sys-${i}`,
        workspace_id: null,
        ...c,
      }));
      setCategories([...systemCats, ...(dbCategories || [])]);

      // 3. Fetch Merchant Rules
      const { data: dbRules } = await supabase
        .from('merchant_rules')
        .select('*')
        .eq('workspace_id', workspaceId);
      setMerchantRules(dbRules || []);

      // 4. Fetch Expenses
      const { data: dbExpenses } = await supabase
        .from('expenses')
        .select('*, expense_participants(*), expense_splits(*)')
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false);

      const parsedExpenses = (dbExpenses || []).map((exp: any) => ({
        ...exp,
        split_method: exp.expense_splits?.split_method || 'equal',
        participants: exp.expense_participants?.map((p: any) => ({
          profileId: p.profile_id,
          amount: p.split_amount,
          value: p.custom_value || p.share_units,
        })),
      }));
      setExpenses(parsedExpenses);

      // 5. Fetch Incomes
      const { data: dbIncomes } = await supabase
        .from('incomes')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false);
      setIncomes(dbIncomes || []);

      // 6. Fetch Budgets
      const { data: dbBudgets } = await supabase
        .from('monthly_budgets')
        .select('*')
        .eq('workspace_id', workspaceId);
      setBudgets(dbBudgets || []);

      // 7. Fetch Saving Targets
      const { data: dbTargets } = await supabase
        .from('saving_targets')
        .select('*')
        .eq('workspace_id', workspaceId);
      setSavingTargets(dbTargets || []);

      // 8. Fetch Zakat
      const { data: dbZakat } = await supabase
        .from('zakat_payments')
        .select('*')
        .eq('profile_id', userId)
        .eq('is_deleted', false);
      setZakatPayments(dbZakat || []);

      // 9. Fetch Settlements
      const { data: dbSettlements } = await supabase
        .from('settlements')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_deleted', false);
      setSettlements(dbSettlements || []);

      // 10. Fetch Audit Logs
      const { data: dbAudit } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(50);
      setAuditLogs(dbAudit || []);

      // 11. Fetch Recurring Templates
      const { data: dbTemplates } = await supabase
        .from('recurring_templates')
        .select('*')
        .eq('workspace_id', workspaceId);
      setRecurringTemplates(dbTemplates || []);

      if (dbTemplates && dbTemplates.length > 0) {
        await processRecurringItems(dbTemplates, workspaceId);
      }

    } catch (e) {
      console.error('Error hydrating workspace data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------------------------------
  // Operations Implementation
  // ----------------------------------------------------------------------------

  const signUp = async (email: string, displayName: string) => {
    // Check if offline/no supabase setup, we do instant mockup
    if (isFallbackMode || process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
      const mockId = `mock-usr-${Math.random().toString(36).substring(2, 9)}`;
      const newProf: Profile = {
        id: mockId,
        display_name: displayName,
        currency: 'BDT',
        timezone: 'Asia/Dhaka',
      };
      setUser(newProf);
      saveToLocalStorage('cui_user', newProf);
      // Auto create a default workspace
      const wsId = `ws-solo-${Math.random().toString(36).substring(2, 9)}`;
      const newWs: Workspace = {
        id: wsId,
        name: `${displayName}'s Private Space`,
        type: 'solo',
        created_by: mockId,
        budget_start_day: 1,
        monthly_saving_target: 0,
        currency: 'BDT',
      };
      setWorkspaces([newWs]);
      setCurrentWorkspace(newWs);
      saveToLocalStorage('cui_workspaces', [newWs]);
      saveToLocalStorage('cui_curr_ws', newWs);
      
      const newMem: WorkspaceMember = {
        workspace_id: wsId,
        profile_id: mockId,
        role: 'owner',
        display_name: displayName,
      };
      setMembers([newMem]);
      saveToLocalStorage('cui_members', [newMem]);
      return;
    }

    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });

    if (error) throw error;
  };

  const logIn = async (email: string) => {
    if (isFallbackMode || process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
      // Local preview login: grab stored or mock
      const stored = localStorage.getItem('cui_user');
      if (stored) {
        setUser(JSON.parse(stored));
      } else {
        throw new Error('No local account found. Please sign up first.');
      }
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw error;
  };

  const logInWithGoogle = async () => {
    if (isFallbackMode || process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
      const mockId = `mock-usr-${Math.random().toString(36).substring(2, 9)}`;
      const newProf: Profile = {
        id: mockId,
        display_name: 'Alex',
        currency: 'BDT',
        timezone: 'Asia/Dhaka',
      };
      setUser(newProf);
      saveToLocalStorage('cui_user', newProf);
      
      const wsId = `ws-solo-${Math.random().toString(36).substring(2, 9)}`;
      const newWs: Workspace = {
        id: wsId,
        name: `Alex's Private Space`,
        type: 'solo',
        created_by: mockId,
        budget_start_day: 1,
        monthly_saving_target: 0,
        currency: 'BDT',
      };
      setWorkspaces([newWs]);
      setCurrentWorkspace(newWs);
      saveToLocalStorage('cui_workspaces', [newWs]);
      saveToLocalStorage('cui_curr_ws', newWs);
      
      const newMem: WorkspaceMember = {
        workspace_id: wsId,
        profile_id: mockId,
        role: 'owner',
        display_name: 'Alex',
      };
      setMembers([newMem]);
      saveToLocalStorage('cui_members', [newMem]);
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) throw error;
  };

  const logOut = async () => {
    setUser(null);
    setWorkspaces([]);
    setCurrentWorkspace(null);
    setMembers([]);
    setExpenses([]);
    setIncomes([]);
    setBudgets([]);
    setSavingTargets([]);
    setZakatPayments([]);
    setSettlements([]);
    
    if (typeof window !== 'undefined') {
      document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }

    await supabase.auth.signOut();
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);

    if (isFallbackMode) {
      saveToLocalStorage('cui_user', updated);
      // Update display name inside members
      const updatedMembers = members.map(m => m.profile_id === user.id ? { ...m, display_name: updates.display_name || m.display_name } : m);
      setMembers(updatedMembers);
      saveToLocalStorage('cui_members', updatedMembers);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        ...updates,
        updated_at: new Date().toISOString()
      });
    if (error) throw error;
    
    await logAction('profile_updated', { updates });
  };

  const createWorkspace = async (name: string, type: 'solo' | 'group', currency = 'BDT') => {
    if (!user) throw new Error('User not logged in');

    const newWs: Workspace = {
      id: isFallbackMode ? `ws-${type}-${Math.random().toString(36).substring(2, 9)}` : undefined as any,
      name,
      type,
      created_by: user.id,
      budget_start_day: 1,
      monthly_saving_target: 0,
      currency,
    };

    if (isFallbackMode) {
      const updatedWsList = [...workspaces, newWs];
      setWorkspaces(updatedWsList);
      setCurrentWorkspace(newWs);
      saveToLocalStorage('cui_workspaces', updatedWsList);
      saveToLocalStorage('cui_curr_ws', newWs);
      
      const newMember: WorkspaceMember = {
        workspace_id: newWs.id,
        profile_id: user.id,
        role: 'owner',
        display_name: user.display_name,
      };
      setMembers([newMember]);
      saveToLocalStorage('cui_members', [newMember]);
      return newWs;
    }

    const { data, error } = await supabase
      .from('workspaces')
      .insert(newWs)
      .select()
      .single();

    if (error) throw error;

    // Supabase trigger usually creates owner membership, but let's insert manual owner just in case
    await supabase.from('workspace_members').insert({
      workspace_id: data.id,
      profile_id: user.id,
      role: 'owner',
    });

    setWorkspaces([...workspaces, data]);
    setCurrentWorkspace(data);
    localStorage.setItem('cui_curr_ws_id', data.id);
    await hydrateWorkspaceData(data.id, user.id);
    await logAction('workspace_created', { workspace_id: data.id, type });

    return data;
  };

  const updateWorkspaceSettings = async (updates: Partial<Workspace>) => {
    if (!currentWorkspace || !user) return;
    const updated = { ...currentWorkspace, ...updates } as Workspace;
    setCurrentWorkspace(updated);
    
    const updatedWorkspaces = workspaces.map(w => w.id === currentWorkspace.id ? updated : w);
    setWorkspaces(updatedWorkspaces);

    if (isFallbackMode) {
      saveToLocalStorage('cui_workspaces', updatedWorkspaces);
      saveToLocalStorage('cui_curr_ws', updated);
      return;
    }

    const { error } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('id', currentWorkspace.id);
    if (error) throw error;

    await logAction('workspace_updated', { updates });
  };

  const switchWorkspace = (workspaceId: string) => {
    const selected = workspaces.find(w => w.id === workspaceId);
    if (!selected) return;
    setCurrentWorkspace(selected);
    localStorage.setItem('cui_curr_ws_id', selected.id);
    if (!isFallbackMode && user) {
      hydrateWorkspaceData(selected.id, user.id);
    }
  };

  const leaveWorkspace = async () => {
    if (!currentWorkspace || !user) return;
    
    if (isFallbackMode) {
      const remainingWs = workspaces.filter(w => w.id !== currentWorkspace.id);
      setWorkspaces(remainingWs);
      setCurrentWorkspace(remainingWs[0] || null);
      saveToLocalStorage('cui_workspaces', remainingWs);
      if (remainingWs[0]) saveToLocalStorage('cui_curr_ws', remainingWs[0]);
      return;
    }

    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', currentWorkspace.id)
      .eq('profile_id', user.id);
    
    if (error) throw error;

    await logAction('workspace_left', { workspace_id: currentWorkspace.id });
    
    const remainingWs = workspaces.filter(w => w.id !== currentWorkspace.id);
    setWorkspaces(remainingWs);
    if (remainingWs.length > 0) {
      switchWorkspace(remainingWs[0].id);
    } else {
      setCurrentWorkspace(null);
    }
  };

  const deleteWorkspace = async () => {
    if (!currentWorkspace) return;
    
    if (isFallbackMode) {
      const remainingWs = workspaces.filter(w => w.id !== currentWorkspace.id);
      setWorkspaces(remainingWs);
      setCurrentWorkspace(remainingWs[0] || null);
      saveToLocalStorage('cui_workspaces', remainingWs);
      return;
    }

    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', currentWorkspace.id);
    
    if (error) throw error;

    const remainingWs = workspaces.filter(w => w.id !== currentWorkspace.id);
    setWorkspaces(remainingWs);
    if (remainingWs.length > 0) {
      switchWorkspace(remainingWs[0].id);
    } else {
      setCurrentWorkspace(null);
    }
  };

  // ----------------------------------------------------------------------------
  // Member & Invitation Operations
  // ----------------------------------------------------------------------------

  const createInvitation = async (email?: string, role: 'admin' | 'member' = 'member') => {
    if (!currentWorkspace || !user) throw new Error('Action requires active workspace');

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const hash = btoa(token); // Mock cryptographic hashing wrapper
    const invite: WorkspaceInvitation = {
      id: isFallbackMode ? `inv-${Math.random().toString(36).substring(2, 9)}` : undefined as any,
      workspace_id: currentWorkspace.id,
      email,
      role,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days expiry
      created_by: user.id,
      is_revoked: false,
      is_used: false,
      created_at: new Date().toISOString(),
    };

    if (isFallbackMode) {
      const updatedInv = [...invitations, invite];
      setInvitations(updatedInv);
      saveToLocalStorage('cui_invitations', updatedInv);
      return `${window.location.origin}/invite/${token}`;
    }

    const { error } = await supabase
      .from('workspace_invitations')
      .insert({
        workspace_id: currentWorkspace.id,
        token_hash: hash,
        email,
        role,
        expires_at: invite.expires_at,
        created_by: user.id,
      });

    if (error) throw error;

    await logAction('invitation_created', { email, role });
    return `${window.location.origin}/invite/${token}`;
  };

  const revokeInvitation = async (invitationId: string) => {
    if (isFallbackMode) {
      const updated = invitations.map(i => i.id === invitationId ? { ...i, is_revoked: true } : i);
      setInvitations(updated);
      saveToLocalStorage('cui_invitations', updated);
      return;
    }

    const { error } = await supabase
      .from('workspace_invitations')
      .update({ is_revoked: true })
      .eq('id', invitationId);

    if (error) throw error;
  };

  const joinWorkspace = async (token: string) => {
    if (!user) throw new Error('Sign in required to accept invitation');
    const hash = btoa(token);

    if (isFallbackMode) {
      // Find local invite
      const matched = invitations.find(i => i.is_revoked === false && i.is_used === false);
      if (!matched) throw new Error('This invitation has expired or is invalid.');
      
      matched.is_used = true;
      saveToLocalStorage('cui_invitations', invitations);

      // Fetch Workspace details
      const storedWs = localStorage.getItem('cui_workspaces');
      const wsList: Workspace[] = storedWs ? JSON.parse(storedWs) : [];
      const targetWs = wsList.find(w => w.id === matched.workspace_id);
      if (!targetWs) throw new Error('Workspace not found.');

      setWorkspaces([...workspaces, targetWs]);
      setCurrentWorkspace(targetWs);
      
      const newMember: WorkspaceMember = {
        workspace_id: targetWs.id,
        profile_id: user.id,
        role: matched.role,
        display_name: user.display_name,
      };
      const updatedMembers = [...members, newMember];
      setMembers(updatedMembers);
      saveToLocalStorage('cui_members', updatedMembers);
      return;
    }

    // Supabase join: Find active invite
    const { data: invite, error: fetchErr } = await supabase
      .from('workspace_invitations')
      .select('*')
      .eq('token_hash', hash)
      .eq('is_used', false)
      .eq('is_revoked', false)
      .single();

    if (fetchErr || !invite) {
      throw new Error('This invitation has expired or has already been used.');
    }

    if (new Date(invite.expires_at) < new Date()) {
      throw new Error('This invitation has expired.');
    }

    // Mark used
    await supabase.from('workspace_invitations').update({ is_used: true }).eq('id', invite.id);

    // Insert Member
    await supabase.from('workspace_members').insert({
      workspace_id: invite.workspace_id,
      profile_id: user.id,
      role: invite.role,
    });

    // Hydrate
    const { data: newWs } = await supabase.from('workspaces').select('*').eq('id', invite.workspace_id).single();
    if (newWs) {
      setWorkspaces([...workspaces, newWs]);
      setCurrentWorkspace(newWs);
      await hydrateWorkspaceData(newWs.id, user.id);
    }
  };

  const removeMember = async (profileId: string) => {
    if (!currentWorkspace) return;
    
    if (isFallbackMode) {
      const updated = members.filter(m => m.profile_id !== profileId);
      setMembers(updated);
      saveToLocalStorage('cui_members', updated);
      return;
    }

    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', currentWorkspace.id)
      .eq('profile_id', profileId);

    if (error) throw error;
    await hydrateWorkspaceData(currentWorkspace.id, user!.id);
  };

  // ----------------------------------------------------------------------------
  // Category & Rules Operations
  // ----------------------------------------------------------------------------

  const addCategory = async (name: string, icon = 'Tag') => {
    if (!currentWorkspace) throw new Error('Workspace required');

    const newCat: Category = {
      id: isFallbackMode ? `cat-cust-${Math.random().toString(36).substring(2, 9)}` : undefined as any,
      workspace_id: currentWorkspace.id,
      name,
      icon,
      is_archived: false,
    };

    if (isFallbackMode) {
      const updated = [...categories, newCat];
      setCategories(updated);
      saveToLocalStorage('cui_categories', updated);
      return newCat;
    }

    const { data, error } = await supabase
      .from('categories')
      .insert(newCat)
      .select()
      .single();

    if (error) throw error;
    setCategories([...categories, data]);
    return data;
  };

  const archiveCategory = async (categoryId: string) => {
    if (isFallbackMode) {
      const updated = categories.map(c => c.id === categoryId ? { ...c, is_archived: true } : c);
      setCategories(updated);
      saveToLocalStorage('cui_categories', updated);
      return;
    }

    const { error } = await supabase
      .from('categories')
      .update({ is_archived: true })
      .eq('id', categoryId);

    if (error) throw error;
    setCategories(categories.map(c => c.id === categoryId ? { ...c, is_archived: true } : c));
  };

  const addMerchantRule = async (merchantName: string, categoryId: string) => {
    if (!currentWorkspace) return;

    const rule: MerchantRule = {
      id: isFallbackMode ? `rule-${Math.random().toString(36).substring(2, 9)}` : undefined as any,
      workspace_id: currentWorkspace.id,
      merchant_name: merchantName,
      category_id: categoryId,
    };

    if (isFallbackMode) {
      const updated = [...merchantRules, rule];
      setMerchantRules(updated);
      saveToLocalStorage('cui_merchant_rules', updated);
      return;
    }

    const { error } = await supabase.from('merchant_rules').insert(rule);
    if (error) throw error;
    setMerchantRules([...merchantRules, rule]);
  };

  // ----------------------------------------------------------------------------
  // Expenses & Financial Operations
  // ----------------------------------------------------------------------------

  const addExpense = async (
    amount: number,
    merchant: string,
    categoryId: string,
    paidBy: string,
    visibility: 'private' | 'shared_selected' | 'shared_all',
    participantsInputs: ParticipantInput[],
    splitMethod: SplitMethod,
    options?: Partial<Expense>
  ) => {
    if (!currentWorkspace || !user) return;

    // Validate splits using calculation engine
    const splitResults = calculateSplit(amount, participantsInputs, splitMethod, paidBy);

    const expenseId = isFallbackMode ? `exp-${Math.random().toString(36).substring(2, 9)}` : crypto.randomUUID();

    const newExp: Expense = {
      id: expenseId,
      workspace_id: currentWorkspace.id,
      amount,
      currency: currentWorkspace.currency,
      expense_date: options?.expense_date || new Date().toISOString(),
      merchant,
      category_id: categoryId,
      paid_by: paidBy,
      visibility,
      notes: options?.notes,
      receipt_url: options?.receipt_url,
      payment_method: options?.payment_method || 'Cash',
      is_deleted: false,
      created_by: user.id,
      created_at: new Date().toISOString(),
      split_method: splitMethod,
      participants: splitResults,
    };

    if (isFallbackMode) {
      const updated = [newExp, ...expenses];
      setExpenses(updated);
      saveToLocalStorage('cui_expenses', updated);
      await logAction('expense_created', { expense_id: expenseId, amount });
      return;
    }

    // Supabase Insert Transaction
    // 1. Expense
    const { error: expErr } = await supabase.from('expenses').insert({
      id: expenseId,
      workspace_id: currentWorkspace.id,
      amount,
      currency: currentWorkspace.currency,
      expense_date: newExp.expense_date,
      merchant,
      category_id: categoryId,
      paid_by: paidBy,
      visibility,
      notes: newExp.notes,
      receipt_url: newExp.receipt_url,
      payment_method: newExp.payment_method,
      created_by: user.id,
    });
    if (expErr) throw expErr;

    // 2. Split Type
    await supabase.from('expense_splits').insert({
      expense_id: expenseId,
      split_method: splitMethod,
    });

    // 3. Split Participants
    const participantRows = splitResults.map(res => {
      const origInput = participantsInputs.find(p => p.profileId === res.profileId);
      return {
        expense_id: expenseId,
        profile_id: res.profileId,
        split_amount: res.amount,
        share_units: splitMethod === 'shares' ? origInput?.value : null,
        custom_value: splitMethod !== 'shares' ? origInput?.value : null,
      };
    });

    const { error: partErr } = await supabase.from('expense_participants').insert(participantRows);
    if (partErr) throw partErr;

    setExpenses([newExp, ...expenses]);
    await logAction('expense_created', { expense_id: expenseId, amount });
  };

  const editExpense = async (
    expenseId: string,
    updates: Partial<Expense>,
    participantsInputs?: ParticipantInput[],
    splitMethod?: SplitMethod
  ) => {
    if (!currentWorkspace || !user) return;

    // Retrieve original expense
    const origExp = expenses.find(e => e.id === expenseId);
    if (!origExp) throw new Error('Expense not found');

    const updatedAmount = updates.amount !== undefined ? updates.amount : origExp.amount;
    const finalSplitMethod = splitMethod || origExp.split_method || 'equal';
    const finalPaidBy = updates.paid_by || origExp.paid_by;

    let finalParticipants: SplitResult[] = origExp.participants || [];
    
    if (participantsInputs) {
      // Re-calculate split amounts
      finalParticipants = calculateSplit(updatedAmount, participantsInputs, finalSplitMethod, finalPaidBy);
    } else if (updates.amount !== undefined && origExp.participants) {
      // Amount changed, recalculate using same parameters
      const mappedInputs = origExp.participants.map(p => ({
        profileId: p.profileId,
        value: p.value || undefined,
      }));
      finalParticipants = calculateSplit(updates.amount, mappedInputs, finalSplitMethod, finalPaidBy);
    }

    const updatedExp: Expense = {
      ...origExp,
      ...updates,
      split_method: finalSplitMethod,
      participants: finalParticipants,
      updated_at: new Date().toISOString(),
    } as any;

    if (isFallbackMode) {
      const updatedList = expenses.map(e => e.id === expenseId ? updatedExp : e);
      setExpenses(updatedList);
      saveToLocalStorage('cui_expenses', updatedList);
      return;
    }

    // Supabase updates
    const { error: expErr } = await supabase
      .from('expenses')
      .update({
        amount: updatedAmount,
        merchant: updates.merchant || origExp.merchant,
        category_id: updates.category_id || origExp.category_id,
        paid_by: finalPaidBy,
        visibility: updates.visibility || origExp.visibility,
        notes: updates.notes !== undefined ? updates.notes : origExp.notes,
        receipt_url: updates.receipt_url !== undefined ? updates.receipt_url : origExp.receipt_url,
        payment_method: updates.payment_method || origExp.payment_method,
        expense_date: updates.expense_date || origExp.expense_date,
      })
      .eq('id', expenseId);

    if (expErr) throw expErr;

    if (splitMethod) {
      // Update Split Type
      await supabase
        .from('expense_splits')
        .update({ split_method: finalSplitMethod })
        .eq('expense_id', expenseId);

      // Re-insert participants splits
      await supabase.from('expense_participants').delete().eq('expense_id', expenseId);
      const participantRows = finalParticipants.map(res => {
        const origInput = participantsInputs?.find(p => p.profileId === res.profileId);
        return {
          expense_id: expenseId,
          profile_id: res.profileId,
          split_amount: res.amount,
          share_units: finalSplitMethod === 'shares' ? origInput?.value : null,
          custom_value: finalSplitMethod !== 'shares' ? origInput?.value : null,
        };
      });
      await supabase.from('expense_participants').insert(participantRows);
    }

    setExpenses(expenses.map(e => e.id === expenseId ? updatedExp : e));
    await logAction('expense_edited', { expense_id: expenseId, amount: updatedAmount });
  };

  const deleteExpense = async (expenseId: string) => {
    const origExp = expenses.find(e => e.id === expenseId);
    if (!origExp) return;

    if (isFallbackMode) {
      const updated = expenses.map(e => e.id === expenseId ? { ...e, is_deleted: true } : e);
      setExpenses(updated);
      saveToLocalStorage('cui_expenses', updated);
      return;
    }

    // Soft delete
    const { error } = await supabase
      .from('expenses')
      .update({ is_deleted: true })
      .eq('id', expenseId);

    if (error) throw error;
    setExpenses(expenses.map(e => e.id === expenseId ? { ...e, is_deleted: true } : e));
    await logAction('expense_deleted', { expense_id: expenseId });
  };

  // ----------------------------------------------------------------------------
  // Income Tracking Operations
  // ----------------------------------------------------------------------------

  const addIncome = async (
    amount: number,
    type: Income['income_type'],
    visibility: Income['visibility'],
    options?: Partial<Income>
  ) => {
    if (!currentWorkspace || !user) return;

    const newInc: Income = {
      id: isFallbackMode ? `inc-${Math.random().toString(36).substring(2, 9)}` : undefined as any,
      profile_id: user.id,
      workspace_id: currentWorkspace.id,
      amount,
      currency: currentWorkspace.currency,
      income_date: options?.income_date || new Date().toISOString(),
      income_type: type,
      visibility,
      notes: options?.notes,
      is_deleted: false,
    };

    if (isFallbackMode) {
      const updated = [newInc, ...incomes];
      setIncomes(updated);
      saveToLocalStorage('cui_incomes', updated);
      return;
    }

    const { data, error } = await supabase
      .from('incomes')
      .insert({
        profile_id: user.id,
        workspace_id: currentWorkspace.id,
        amount,
        currency: currentWorkspace.currency,
        income_date: newInc.income_date,
        income_type: type,
        visibility,
        notes: newInc.notes,
      })
      .select()
      .single();

    if (error) throw error;
    setIncomes([data, ...incomes]);
    await logAction('income_added', { amount });
  };

  const editIncome = async (incomeId: string, updates: Partial<Income>) => {
    if (isFallbackMode) {
      const updated = incomes.map(i => i.id === incomeId ? { ...i, ...updates } : i);
      setIncomes(updated);
      saveToLocalStorage('cui_incomes', updated);
      return;
    }

    const { error } = await supabase
      .from('incomes')
      .update(updates)
      .eq('id', incomeId);

    if (error) throw error;
    setIncomes(incomes.map(i => i.id === incomeId ? { ...i, ...updates } : i));
  };

  const deleteIncome = async (incomeId: string) => {
    if (isFallbackMode) {
      const updated = incomes.map(i => i.id === incomeId ? { ...i, is_deleted: true } : i);
      setIncomes(updated);
      saveToLocalStorage('cui_incomes', updated);
      return;
    }

    const { error } = await supabase
      .from('incomes')
      .update({ is_deleted: true })
      .eq('id', incomeId);

    if (error) throw error;
    setIncomes(incomes.map(i => i.id === incomeId ? { ...i, is_deleted: true } : i));
  };

  // ----------------------------------------------------------------------------
  // Budgets & Savings Target
  // ----------------------------------------------------------------------------

  const saveBudget = async (amount: number, categoryId: string | null, monthDate: string) => {
    if (!currentWorkspace) return;

    const bgt: MonthlyBudget = {
      id: isFallbackMode ? `bgt-${Math.random().toString(36).substring(2, 9)}` : undefined as any,
      workspace_id: currentWorkspace.id,
      category_id: categoryId,
      amount,
      month_date: monthDate,
    };

    if (isFallbackMode) {
      const filtered = budgets.filter(
        b => !(b.workspace_id === currentWorkspace.id && b.category_id === categoryId && b.month_date === monthDate)
      );
      const updated = [...filtered, bgt];
      setBudgets(updated);
      saveToLocalStorage('cui_budgets', updated);
      return;
    }

    // Upsert
    const { error } = await supabase
      .from('monthly_budgets')
      .upsert({
        workspace_id: currentWorkspace.id,
        category_id: categoryId,
        amount,
        month_date: monthDate,
      }, {
        onConflict: 'workspace_id,category_id,month_date',
      });

    if (error) throw error;
    
    // Refresh budgets list
    const { data } = await supabase.from('monthly_budgets').select('*').eq('workspace_id', currentWorkspace.id);
    if (data) setBudgets(data);
  };

  const saveSavingTarget = async (amount: number, targetDate: string) => {
    if (!currentWorkspace) return;

    const target: SavingTarget = {
      id: isFallbackMode ? `tgt-${Math.random().toString(36).substring(2, 9)}` : undefined as any,
      workspace_id: currentWorkspace.id,
      amount,
      target_date: targetDate,
    };

    if (isFallbackMode) {
      const filtered = savingTargets.filter(t => !(t.workspace_id === currentWorkspace.id && t.target_date === targetDate));
      const updated = [...filtered, target];
      setSavingTargets(updated);
      saveToLocalStorage('cui_saving_targets', updated);
      return;
    }

    const { error } = await supabase
      .from('saving_targets')
      .upsert({
        workspace_id: currentWorkspace.id,
        amount,
        target_date: targetDate,
      }, {
        onConflict: 'workspace_id,target_date',
      });

    if (error) throw error;
    
    const { data } = await supabase.from('saving_targets').select('*').eq('workspace_id', currentWorkspace.id);
    if (data) setSavingTargets(data);
  };

  // ----------------------------------------------------------------------------
  // Zakat
  // ----------------------------------------------------------------------------

  const addZakat = async (amount: number, year: number, options?: Partial<ZakatPayment>) => {
    if (!user) return;

    const newZakat: ZakatPayment = {
      id: isFallbackMode ? `zak-${Math.random().toString(36).substring(2, 9)}` : undefined as any,
      profile_id: user.id,
      amount,
      payment_date: options?.payment_date || new Date().toISOString(),
      notes: options?.notes,
      visibility: options?.visibility || 'private',
      recipient: options?.recipient,
      payment_method: options?.payment_method || 'Cash',
      zakat_year: year,
      is_deleted: false,
    };

    if (isFallbackMode) {
      const updated = [newZakat, ...zakatPayments];
      setZakatPayments(updated);
      saveToLocalStorage('cui_zakat', updated);
      return;
    }

    const { data, error } = await supabase
      .from('zakat_payments')
      .insert({
        profile_id: user.id,
        amount,
        payment_date: newZakat.payment_date,
        notes: newZakat.notes,
        visibility: newZakat.visibility,
        recipient: newZakat.recipient,
        payment_method: newZakat.payment_method,
        zakat_year: year,
      })
      .select()
      .single();

    if (error) throw error;
    setZakatPayments([data, ...zakatPayments]);
    await logAction('zakat_recorded', { amount });
  };

  const deleteZakat = async (zakatId: string) => {
    if (isFallbackMode) {
      const updated = zakatPayments.map(z => z.id === zakatId ? { ...z, is_deleted: true } : z);
      setZakatPayments(updated);
      saveToLocalStorage('cui_zakat', updated);
      return;
    }

    const { error } = await supabase
      .from('zakat_payments')
      .update({ is_deleted: true })
      .eq('id', zakatId);

    if (error) throw error;
    setZakatPayments(zakatPayments.map(z => z.id === zakatId ? { ...z, is_deleted: true } : z));
  };

  const editZakat = async (zakatId: string, updates: Partial<ZakatPayment>) => {
    if (isFallbackMode) {
      const updated = zakatPayments.map(z => z.id === zakatId ? { ...z, ...updates } : z);
      setZakatPayments(updated);
      saveToLocalStorage('cui_zakat', updated);
      return;
    }

    const { data, error } = await supabase
      .from('zakat_payments')
      .update(updates)
      .eq('id', zakatId)
      .select()
      .single();

    if (error) throw error;
    setZakatPayments(zakatPayments.map(z => z.id === zakatId ? data : z));
    await logAction('zakat_updated', { zakatId });
  };

  // ----------------------------------------------------------------------------
  // Settlements
  // ----------------------------------------------------------------------------

  const addSettlement = async (payerId: string, recipientId: string, amount: number, notes?: string) => {
    if (!currentWorkspace) return;

    const newSet: Settlement = {
      id: isFallbackMode ? `set-${Math.random().toString(36).substring(2, 9)}` : undefined as any,
      workspace_id: currentWorkspace.id,
      payer_id: payerId,
      recipient_id: recipientId,
      amount,
      currency: currentWorkspace.currency,
      settlement_date: new Date().toISOString(),
      notes,
      is_deleted: false,
    };

    if (isFallbackMode) {
      const updated = [newSet, ...settlements];
      setSettlements(updated);
      saveToLocalStorage('cui_settlements', updated);
      return;
    }

    const { data, error } = await supabase
      .from('settlements')
      .insert({
        workspace_id: currentWorkspace.id,
        payer_id: payerId,
        recipient_id: recipientId,
        amount,
        currency: currentWorkspace.currency,
        notes,
      })
      .select()
      .single();

    if (error) throw error;
    setSettlements([data, ...settlements]);
    await logAction('settlement_recorded', { amount });
  };

  const deleteSettlement = async (settlementId: string) => {
    if (isFallbackMode) {
      const updated = settlements.map(s => s.id === settlementId ? { ...s, is_deleted: true } : s);
      setSettlements(updated);
      saveToLocalStorage('cui_settlements', updated);
      return;
    }

    const { error } = await supabase
      .from('settlements')
      .update({ is_deleted: true })
      .eq('id', settlementId);

    if (error) throw error;
    setSettlements(settlements.map(s => s.id === settlementId ? { ...s, is_deleted: true } : s));
  };

  const addRecurringTemplate = async (
    type: 'expense' | 'income',
    amount: number,
    name: string,
    categoryId: string | null,
    visibility: 'private' | 'shared_selected' | 'shared_all',
    nextOccurrence: string,
    options?: any
  ) => {
    if (!currentWorkspace || !user) return;

    const templateId = isFallbackMode ? `temp-${Math.random().toString(36).substring(2, 9)}` : crypto.randomUUID();

    const newTemplate = {
      id: templateId,
      workspace_id: currentWorkspace.id,
      amount,
      currency: currentWorkspace.currency,
      merchant: name,
      category_id: categoryId,
      paid_by: user.id,
      visibility,
      type,
      notes: options?.notes || 'Recurring template',
      payment_method: options?.payment_method || 'Cash',
      frequency: options?.frequency || 'monthly',
      next_occurrence: nextOccurrence,
      is_active: true,
    };

    if (isFallbackMode) {
      const updated = [...recurringTemplates, newTemplate];
      setRecurringTemplates(updated);
      saveToLocalStorage('cui_recurring_templates', updated);
      return;
    }

    const { error } = await supabase.from('recurring_templates').insert({
      id: templateId,
      workspace_id: newTemplate.workspace_id,
      amount: newTemplate.amount,
      currency: newTemplate.currency,
      merchant: newTemplate.merchant,
      category_id: newTemplate.category_id,
      paid_by: newTemplate.paid_by,
      visibility: newTemplate.visibility,
      type: newTemplate.type,
      notes: newTemplate.notes,
      payment_method: newTemplate.payment_method,
      frequency: newTemplate.frequency,
      next_occurrence: newTemplate.next_occurrence,
    });

    if (error) throw error;

    setRecurringTemplates([...recurringTemplates, newTemplate]);
  };

  const deleteRecurringTemplate = async (id: string) => {
    if (isFallbackMode) {
      const updated = recurringTemplates.filter(t => t.id !== id);
      setRecurringTemplates(updated);
      saveToLocalStorage('cui_recurring_templates', updated);
      return;
    }

    const { error } = await supabase.from('recurring_templates').delete().eq('id', id);
    if (error) throw error;
    setRecurringTemplates(recurringTemplates.filter(t => t.id !== id));
  };

  // ----------------------------------------------------------------------------
  // Logging & Utilities
  // ----------------------------------------------------------------------------

  const logAction = async (action: string, metadata?: any) => {
    const log: AuditLog = {
      id: isFallbackMode ? `log-${Math.random().toString(36).substring(2, 9)}` : undefined as any,
      workspace_id: currentWorkspace?.id,
      user_id: user?.id,
      action,
      metadata,
      created_at: new Date().toISOString(),
    };

    setAuditLogs([log, ...auditLogs]);

    if (isFallbackMode) {
      saveToLocalStorage('cui_audit_logs', [log, ...auditLogs]);
      return;
    }

    await supabase.from('audit_logs').insert({
      workspace_id: currentWorkspace?.id,
      user_id: user?.id,
      action,
      metadata,
    });
  };

  const clearSmartInsights = () => {
    if (isFallbackMode) {
      localStorage.removeItem('cui_smart_insights');
    }
  };

  const purgeUserData = async () => {
    if (isFallbackMode) {
      localStorage.clear();
      setUser(null);
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setExpenses([]);
      setIncomes([]);
      setBudgets([]);
      setZakatPayments([]);
      setSettlements([]);
      setAuditLogs([]);
      return;
    }
    // Delete user profile will trigger cascade deletes inside Supabase
    if (user) {
      await supabase.from('profiles').delete().eq('id', user.id);
      await logOut();
    }
  };

  const importBackup = async (backupData: string) => {
    try {
      const parsed = JSON.parse(backupData);
      
      if (parsed.user) setUser(parsed.user);
      if (parsed.workspaces) setWorkspaces(parsed.workspaces);
      if (parsed.currentWorkspace) setCurrentWorkspace(parsed.currentWorkspace);
      if (parsed.members) setMembers(parsed.members);
      if (parsed.categories) setCategories(parsed.categories);
      if (parsed.expenses) setExpenses(parsed.expenses);
      if (parsed.incomes) setIncomes(parsed.incomes);
      if (parsed.budgets) setBudgets(parsed.budgets);
      if (parsed.savingTargets) setSavingTargets(parsed.savingTargets);
      if (parsed.zakatPayments) setZakatPayments(parsed.zakatPayments);
      if (parsed.settlements) setSettlements(parsed.settlements);
      if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);

      if (isFallbackMode) {
        if (parsed.user) saveToLocalStorage('cui_user', parsed.user);
        if (parsed.workspaces) saveToLocalStorage('cui_workspaces', parsed.workspaces);
        if (parsed.currentWorkspace) saveToLocalStorage('cui_curr_ws', parsed.currentWorkspace);
        if (parsed.members) saveToLocalStorage('cui_members', parsed.members);
        if (parsed.categories) saveToLocalStorage('cui_categories', parsed.categories);
        if (parsed.expenses) saveToLocalStorage('cui_expenses', parsed.expenses);
        if (parsed.incomes) saveToLocalStorage('cui_incomes', parsed.incomes);
        if (parsed.budgets) saveToLocalStorage('cui_budgets', parsed.budgets);
        if (parsed.savingTargets) saveToLocalStorage('cui_saving_targets', parsed.savingTargets);
        if (parsed.zakatPayments) saveToLocalStorage('cui_zakat', parsed.zakatPayments);
        if (parsed.settlements) saveToLocalStorage('cui_settlements', parsed.settlements);
        if (parsed.auditLogs) saveToLocalStorage('cui_audit_logs', parsed.auditLogs);
      }
      
      await logAction('backup_restored', { timestamp: new Date().toISOString() });
    } catch (e) {
      throw new Error('Invalid backup file format');
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        currentWorkspace,
        workspaces,
        members,
        invitations,
        categories,
        merchantRules,
        expenses,
        incomes,
        budgets,
        savingTargets,
        zakatPayments,
        settlements,
        auditLogs,
        isFallbackMode,
        isConnectionError,
        isLoading,
        signUp,
        logIn,
        logInWithGoogle,
        logOut,
        updateProfile,
        createWorkspace,
        updateWorkspaceSettings,
        switchWorkspace,
        leaveWorkspace,
        deleteWorkspace,
        createInvitation,
        revokeInvitation,
        joinWorkspace,
        removeMember,
        addCategory,
        archiveCategory,
        addMerchantRule,
        addExpense,
        editExpense,
        deleteExpense,
        addIncome,
        editIncome,
        deleteIncome,
        saveBudget,
        saveSavingTarget,
        addZakat,
        deleteZakat,
        editZakat,
        addSettlement,
        deleteSettlement,
        logAction,
        clearSmartInsights,
        purgeUserData,
        importBackup,
        recurringTemplates,
        addRecurringTemplate,
        deleteRecurringTemplate,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
