'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { calculateSettlements, MemberBalance } from '@/lib/calculations';
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft, 
  PiggyBank, 
  AlertCircle, 
  TrendingUp, 
  History,
  Coins,
  ArrowRight,
  Receipt,
  Bell,
  MessageSquare,
  Mail
} from 'lucide-react';
import { differenceInDays, endOfMonth, startOfMonth, format } from 'date-fns';

export default function DashboardOverview() {
  const { 
    user, 
    currentWorkspace, 
    expenses, 
    incomes, 
    categories,
    budgets, 
    zakatPayments,
    settlements,
    auditLogs,
    members,
    recurringTemplates
  } = useApp();

  const isSolo = currentWorkspace?.type === 'solo';
  const currency = currentWorkspace?.currency || 'BDT';

  // Get active month filters (current calendar month)
  const today = new Date();
  const startMonth = startOfMonth(today);
  const endMonth = endOfMonth(today);
  const totalDaysInMonth = differenceInDays(endMonth, startMonth) + 1;
  const daysRemaining = differenceInDays(endMonth, today);

  // Filter current month data (ignore soft-deleted records)
  const currentMonthExpenses = expenses.filter(e => {
    const d = new Date(e.expense_date);
    return d >= startMonth && d <= endMonth && !e.is_deleted;
  });

  const currentMonthIncomes = incomes.filter(i => {
    const d = new Date(i.income_date);
    return d >= startMonth && d <= endMonth && !i.is_deleted;
  });

  const upcomingBills = recurringTemplates.filter(t => {
    if (!t.is_active || t.type !== 'expense') return false;
    const diff = differenceInDays(new Date(t.next_occurrence), today);
    return diff >= 0 && diff <= 5;
  });

  const currentMonthZakat = zakatPayments.filter(z => {
    const d = new Date(z.payment_date);
    return d >= startMonth && d <= endMonth && !z.is_deleted;
  });

  // Calculate totals
  // Expenses visibility splits
  // Private expenses are ONLY included in personal context
  const privateExpensesTotal = currentMonthExpenses
    .filter(e => e.visibility === 'private' && e.paid_by === user?.id)
    .reduce((sum, e) => sum + e.amount, 0);

  const sharedExpensesTotal = currentMonthExpenses
    .filter(e => e.visibility !== 'private')
    .reduce((sum, e) => sum + e.amount, 0);

  // For overall summary:
  // If group workspace: total expenses = shared expenses paid by me + private expenses paid by me
  // If solo workspace: total expenses = all expenses paid by me
  const totalExpensesPaidByMe = currentMonthExpenses
    .filter(e => e.paid_by === user?.id)
    .reduce((sum, e) => sum + e.amount, 0);

  const myResponsibilityExpenses = currentMonthExpenses.reduce((sum, e) => {
    // If it's private, I pay 100%
    if (e.visibility === 'private') {
      return sum + (e.paid_by === user?.id ? e.amount : 0);
    }
    // If shared, find my share from participants array
    const myShare = e.participants?.find(p => p.profileId === user?.id);
    return sum + (myShare ? myShare.amount : 0);
  }, 0);

  // Total visible group income vs personal income
  const myIncomeTotal = currentMonthIncomes
    .filter(i => i.profile_id === user?.id)
    .reduce((sum, i) => sum + i.amount, 0);

  const totalGroupIncome = currentMonthIncomes.reduce((sum, i) => sum + i.amount, 0);

  const totalZakatPaid = currentMonthZakat.reduce((sum, z) => sum + z.amount, 0);

  // Financial Position Cards
  const netIncomeRemaining = myIncomeTotal - myResponsibilityExpenses;
  const savingsRate = myIncomeTotal > 0 ? (netIncomeRemaining / myIncomeTotal) * 100 : 0;

  // Group Multi-member Settlement Calculations
  const memberBalances: MemberBalance[] = members.map(m => {
    // Shared expenses paid by this member
    const paid = expenses
      .filter(e => !e.is_deleted && e.visibility !== 'private' && e.paid_by === m.profile_id)
      .reduce((sum, e) => sum + e.amount, 0);

    // Shared responsibility assigned to this member
    const responsibility = expenses
      .filter(e => !e.is_deleted && e.visibility !== 'private')
      .reduce((sum, e) => {
        const share = e.participants?.find(p => p.profileId === m.profile_id);
        return sum + (share ? share.amount : 0);
      }, 0);

    // Settlements paid by this member
    const settledPaid = settlements
      .filter(s => !s.is_deleted && s.payer_id === m.profile_id)
      .reduce((sum, s) => sum + s.amount, 0);

    // Settlements received by this member
    const settledReceived = settlements
      .filter(s => !s.is_deleted && s.recipient_id === m.profile_id)
      .reduce((sum, s) => sum + s.amount, 0);

    return {
      profileId: m.profile_id,
      displayName: m.display_name || 'Group Member',
      paid,
      responsibility,
      settledPaid,
      settledReceived,
    };
  });

  const settlementEngine = calculateSettlements(memberBalances);
  const myPosition = settlementEngine.positions.find(p => p.profileId === user?.id);

  // Budget progress
  // Overall spending cap vs actual spent in workspace
  const workspaceBudget = budgets.find(b => b.category_id === null && b.month_date.substring(0, 7) === format(today, 'yyyy-MM'));
  const overallBudgetLimit = workspaceBudget ? workspaceBudget.amount : 0;
  
  // Total workspace expense amount (shared + private visible in workspace)
  const totalWorkspaceSpent = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const budgetPercentage = overallBudgetLimit > 0 ? (totalWorkspaceSpent / overallBudgetLimit) * 100 : 0;

  let budgetStatus = 'On track';
  let budgetStatusColor = 'bg-accent text-accent-foreground';
  if (budgetPercentage >= 100) {
    budgetStatus = 'Over the planned amount';
    budgetStatusColor = 'bg-destructive text-destructive-foreground';
  } else if (budgetPercentage >= 90) {
    budgetStatus = 'Close to the limit';
    budgetStatusColor = 'bg-warning text-warning-foreground';
  } else if (budgetPercentage >= 75) {
    budgetStatus = 'Keep an eye on this';
    budgetStatusColor = 'bg-warning/70 text-warning-foreground';
  }

  return (
    <div className="space-y-8">
      {upcomingBills.length > 0 && (
        <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-5 space-y-3 animate-fade-in">
          <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
            <Bell className="h-4.5 w-4.5 text-amber-700 animate-bounce" />
            Upcoming Bill Reminders
          </h3>
          <div className="divide-y divide-amber-200/60 text-xs">
            {upcomingBills.map(bill => {
              const diff = differenceInDays(new Date(bill.next_occurrence), today);
              const dueLabel = diff === 0 ? 'today' : diff === 1 ? 'tomorrow' : `in ${diff} days`;
              const msg = `Reminder: The bill for *${bill.merchant}* of *${currency} ${bill.amount.toFixed(2)}* is due ${dueLabel} (${bill.next_occurrence}). Let's get it settled!`;
              
              const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
              const emailUrl = `mailto:?subject=${encodeURIComponent(`Bill Reminder: ${bill.merchant}`)}&body=${encodeURIComponent(msg)}`;

              return (
                <div key={bill.id} className="py-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="font-semibold text-primary block sm:inline">{bill.merchant} bill</span>
                    <span className="text-[11px] text-muted-foreground sm:ml-1.5">
                      Amount: <strong>{currency} {bill.amount.toFixed(2)}</strong> • Due <strong>{dueLabel}</strong>
                    </span>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold rounded-md flex items-center justify-center gap-1"
                    >
                      <MessageSquare className="h-3.5 w-3.5 animate-pulse" /> Notify WhatsApp
                    </a>
                    <a
                      href={emailUrl}
                      className="flex-1 sm:flex-none px-2.5 py-1.5 border border-border bg-white hover:bg-secondary text-primary text-[10px] font-bold rounded-md flex items-center justify-center gap-1"
                    >
                      <Mail className="h-3.5 w-3.5" /> Notify Email
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-[32px] font-extrabold text-primary leading-tight tracking-tight">Here’s where things stand</h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium">
            {user?.display_name || 'Guest User'}’s {currentWorkspace?.type === 'solo' ? 'Personal space' : currentWorkspace?.name || 'Shared space'} • {format(today, 'MMMM yyyy')} • {daysRemaining} days remaining
          </p>
        </div>
        
        {/* Quick actions */}
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <Link
            href="/dashboard/expenses/add"
            className="flex-1 sm:flex-none h-11 px-5 bg-[#073F3B] hover:bg-[#087F78] text-white font-semibold rounded-[10px] flex items-center justify-center gap-2 text-sm shadow-xs transition-all"
          >
            <Plus className="h-4 w-4" />
            Add expense
          </Link>
          <Link
            href="/dashboard/expenses/add?ocr=true"
            className="flex-1 sm:flex-none h-11 px-5 bg-white text-[#073F3B] border border-[#9CB7AE] hover:bg-[#EDF6F3] font-semibold rounded-[10px] flex items-center justify-center gap-2 text-sm transition-all"
          >
            Scan receipt
          </Link>
        </div>
      </div>

      {/* Empty State Check */}
      {expenses.filter(e => !e.is_deleted).length === 0 ? (
        <div className="bg-white border border-border rounded-[16px] p-12 text-center max-w-xl mx-auto shadow-[0_3px_12px_rgba(7,63,59,0.04)] mt-8">
          <div className="w-14 h-14 bg-secondary text-primary rounded-full flex items-center justify-center mx-auto mb-5">
            <Receipt className="h-7 w-7 text-[#073F3B]" />
          </div>
          <h2 className="text-lg font-bold text-primary mb-2">Nothing counted yet</h2>
          <p className="text-xs text-muted-foreground leading-relaxed mb-6">
            Add your first expense to begin building your monthly view.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/dashboard/expenses/add"
              className="h-11 px-5 bg-[#073F3B] hover:bg-[#087F78] text-white font-semibold rounded-[10px] flex items-center justify-center text-xs transition-all shadow-xs"
            >
              Add expense
            </Link>
            <Link
              href="/dashboard/income"
              className="h-11 px-5 bg-white text-[#073F3B] border border-[#9CB7AE] hover:bg-[#EDF6F3] font-semibold rounded-[10px] flex items-center justify-center text-xs transition-all"
            >
              Add income
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 select-none">
            
            {/* Card 1: Income */}
            <div className="bg-white border border-border rounded-[16px] p-6 flex flex-col justify-between shadow-[0_3px_12px_rgba(7,63,59,0.04)]">
              <div className="flex justify-between items-start text-muted-foreground">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-teal">Income</span>
                <ArrowUpRight className="h-4.5 w-4.5 text-[#0AA99D]" />
              </div>
              <div className="mt-4">
                <h3 className="text-[30px] font-extrabold text-primary leading-none">
                  {currency} {myIncomeTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-[10px] text-muted-text mt-1.5 font-medium">Recorded this month</p>
              </div>
            </div>
 
            {/* Card 2: Spending */}
            <div className="bg-white border border-border rounded-[16px] p-6 flex flex-col justify-between shadow-[0_3px_12px_rgba(7,63,59,0.04)]">
              <div className="flex justify-between items-start text-muted-foreground">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-teal">
                  {isSolo ? 'Spending' : 'My calculated share'}
                </span>
                <ArrowDownLeft className="h-4.5 w-4.5 text-[#C85450]" />
              </div>
              <div className="mt-4">
                <h3 className="text-[30px] font-extrabold text-primary leading-none">
                  {currency} {(isSolo ? totalExpensesPaidByMe : myResponsibilityExpenses).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-[10px] text-muted-text mt-1.5 font-medium">
                  {isSolo ? 'Personal expenses recorded this month' : 'Includes personal and shared responsibility'}
                </p>
              </div>
            </div>
 
            {/* Card 3: Available after spending / Unfunded spending */}
            <div className="bg-white border border-border rounded-[16px] p-6 flex flex-col justify-between shadow-[0_3px_12px_rgba(7,63,59,0.04)]">
              <div className="flex justify-between items-start text-muted-foreground">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-teal">
                  {myIncomeTotal > 0 ? 'Available after spending' : 'Unfunded spending'}
                </span>
                <PiggyBank className="h-4.5 w-4.5 text-[#073F3B]" />
              </div>
              <div className="mt-4">
                <h3 className={`text-[30px] font-extrabold leading-none ${myIncomeTotal > 0 && netIncomeRemaining >= 0 ? 'text-primary' : 'text-[#C85450]'}`}>
                  {currency} {Math.abs(myIncomeTotal > 0 ? netIncomeRemaining : (isSolo ? totalExpensesPaidByMe : myResponsibilityExpenses)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                {myIncomeTotal > 0 ? (
                  <div className="flex items-center gap-1 mt-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#E5A823]"></span>
                    <span className="text-[10px] text-muted-text font-semibold">
                      {savingsRate >= 0 ? savingsRate.toFixed(0) : '0'}% savings rate
                    </span>
                  </div>
                ) : (
                  <div className="mt-1.5 text-[10px] text-muted-text font-semibold flex flex-col gap-1">
                    <span>Savings rate: —</span>
                    <p className="font-medium text-muted-foreground">Add income to calculate your savings rate.</p>
                  </div>
                )}
              </div>
            </div>
 
            {/* Card 4: Monthly Plan */}
            <div className="bg-white border border-border rounded-[16px] p-6 flex flex-col justify-between shadow-[0_3px_12px_rgba(7,63,59,0.04)]">
              <div className="flex justify-between items-start text-muted-foreground">
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand-teal">Monthly plan</span>
                <AlertCircle className="h-4.5 w-4.5 text-[#073F3B]" />
              </div>
              <div className="mt-4">
                <h3 className="text-[30px] font-extrabold text-primary leading-none">
                  {overallBudgetLimit > 0 ? `${budgetPercentage.toFixed(0)}%` : 'No plan'}
                </h3>
                <p className="text-[10px] text-muted-text mt-1.5 font-medium">
                  {overallBudgetLimit > 0 
                    ? `${currency} ${(overallBudgetLimit - totalWorkspaceSpent).toFixed(0)} remaining` 
                    : 'Set an overall limit to monitor budget'}
                </p>
              </div>
            </div>
 
          </div>

          {/* Group dynamics context block */}
          {!isSolo && (
            <div className="bg-white border border-border rounded-lg p-6 shadow-xs">
              <h2 className="text-lg font-bold text-primary mb-4">How everyone contributed</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                {/* 1. Balances table */}
                <div className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground font-bold">
                          <th className="pb-2">Member</th>
                          <th className="pb-2 text-right">Paid</th>
                          <th className="pb-2 text-right">Share Assigned</th>
                          <th className="pb-2 text-right">Net Position</th>
                        </tr>
                      </thead>
                      <tbody>
                        {memberBalances.map((mb) => {
                          const net = mb.paid - mb.responsibility + mb.settledPaid - mb.settledReceived;
                          return (
                            <tr key={mb.profileId} className="border-b border-border/50">
                              <td className="py-2.5 font-semibold text-primary">{mb.displayName}</td>
                              <td className="py-2.5 text-right">{currency} {mb.paid.toFixed(2)}</td>
                              <td className="py-2.5 text-right">{currency} {mb.responsibility.toFixed(2)}</td>
                              <td className={`py-2.5 text-right font-bold ${net > 0.01 ? 'text-accent' : net < -0.01 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {net > 0.01 ? '+' : ''}{net.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Settle summary */}
                <div className="p-4 bg-background border border-border rounded-md flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-primary mb-2">Current balance position</h3>
                    <div className="space-y-2 mt-3">
                      {settlementEngine.positions.map((pos) => {
                        if (Math.abs(pos.netPosition) <= 0.05) return null;
                        const isOwed = pos.netPosition > 0;
                        return (
                          <p key={pos.profileId} className="text-xs leading-relaxed text-muted-foreground">
                            <strong>{pos.displayName}</strong> has contributed{' '}
                            <span className={isOwed ? 'text-accent font-semibold' : 'text-destructive font-semibold'}>
                              {currency} {Math.abs(pos.netPosition).toFixed(2)}
                            </span>{' '}
                            {isOwed ? 'more than' : 'less than'} their calculated share.
                          </p>
                        );
                      })}
                      
                      {settlementEngine.transfers.length === 0 && (
                        <p className="text-xs text-accent font-semibold flex items-center gap-1">
                          ✓ Everyone is completely balanced.
                        </p>
                      )}
                    </div>
                  </div>

                  {settlementEngine.transfers.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/80">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Suggested Settlement Transfer</p>
                      <div className="bg-white border border-border p-2.5 rounded-md flex justify-between items-center text-xs">
                        <div>
                          <span className="font-semibold text-primary">{settlementEngine.transfers[0].fromName}</span>
                          <span className="text-muted-foreground mx-1">pays</span>
                          <span className="font-semibold text-primary">{settlementEngine.transfers[0].toName}</span>
                        </div>
                        <span className="font-bold text-primary">{currency} {settlementEngine.transfers[0].amount.toFixed(2)}</span>
                      </div>
                      <Link 
                        href="/dashboard/balance" 
                        className="text-xs font-semibold text-primary mt-3 flex items-center gap-1 hover:underline self-start"
                      >
                        Record a settlement payment <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Spending Plan and Zakat Tracker */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: Overall spending plan */}
            <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)] lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-bold text-primary">Overall spending plan</h2>
                {overallBudgetLimit > 0 ? (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-secondary text-primary`}>
                    {budgetStatus}
                  </span>
                ) : (
                  <Link 
                    href="/dashboard/plan" 
                    className="text-xs font-semibold text-[#0AA99D] hover:underline"
                  >
                    Create a plan
                  </Link>
                )}
              </div>
 
              {overallBudgetLimit > 0 ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Overall Workspace Spend ({budgetPercentage.toFixed(0)}%)</span>
                      <span className="font-bold text-primary">
                        {currency} {totalWorkspaceSpent.toFixed(2)} / {overallBudgetLimit.toFixed(2)}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-[#EDF6F3] h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          budgetPercentage >= 100 ? 'bg-[#C85450]' : budgetPercentage >= 90 ? 'bg-[#D28F1F]' : 'bg-[#0AA99D]'
                        }`}
                        style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
 
                  <p className="text-xs text-muted-foreground leading-relaxed pt-2">
                    {budgetPercentage >= 100 
                      ? 'You have exceeded the spending cap for this month. Review your reports to see where you can adjust.'
                      : `You have BDT ${(overallBudgetLimit - totalWorkspaceSpent).toFixed(2)} left in your budget with ${daysRemaining} days remaining in the month.`}
                  </p>
                </div>
              ) : (
                <div className="py-8 text-center bg-[#F4F6F4] rounded-[12px] border border-border">
                  <p className="text-xs text-muted-foreground mb-4">No monthly plan yet. Set an overall spending limit and category budgets to track your progress.</p>
                  <Link
                    href="/dashboard/plan"
                    className="px-4 py-2 bg-[#073F3B] hover:bg-[#087F78] text-white font-semibold text-xs rounded-md transition-all inline-block"
                  >
                    Create a plan
                  </Link>
                </div>
              )}
            </div>
 
            {/* Right: Zakat Tracker card */}
            <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)] flex flex-col justify-between">
              <div>
                <h2 className="text-base font-bold text-primary mb-3">Zakat Tracker</h2>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  Record and review your Zakat payments privately.
                </p>
                <div className="p-3 bg-[#EDF6F3] rounded-[10px] border border-[#BFD1CA] flex justify-between items-center text-xs mb-4">
                  <span className="font-semibold text-primary flex items-center gap-1.5"><Coins className="h-4 w-4 text-[#073F3B]" /> Zakat recorded this month</span>
                  <span className="font-bold text-primary">{currency} {totalZakatPaid.toFixed(2)}</span>
                </div>
              </div>
              <Link 
                href="/dashboard/zakat" 
                className="px-4 py-2 border border-[#9CB7AE] text-[#073F3B] hover:bg-[#EDF6F3] font-semibold text-xs rounded-md text-center transition-all w-full block"
              >
                Record Zakat payment
              </Link>
            </div>
 
          </div>

          {/* Bottom: Latest Workspace Activities */}
          <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)]">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-base font-bold text-primary flex items-center gap-2">
                <History className="h-4.5 w-4.5 text-muted-foreground" />
                Latest activity
              </h2>
              <Link href="/dashboard/activity" className="text-xs font-bold text-[#0AA99D] hover:underline">
                View all activity
              </Link>
            </div>
 
            {auditLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No recent actions recorded.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {auditLogs.slice(0, 5).map((log) => {
                  let prettyAction = log.action.replace(/_/g, ' ');
                  let prettyDesc = '';
                  
                  // Safe metadata parsing
                  try {
                    const meta = log.metadata;
                    if (meta && typeof meta === 'object') {
                      if (log.action.includes('expense') && meta.amount) {
                        const mName = meta.merchant || 'Expense';
                        const catLabel = categories.find(c => c.id === meta.category_id)?.name || 'General';
                        prettyAction = 'Expense ' + (log.action.includes('add') ? 'added' : log.action.includes('delete') ? 'deleted' : 'updated');
                        prettyDesc = `${mName} · ${catLabel} · ${currency} ${meta.amount}`;
                      } else if (log.action.includes('income') && meta.amount) {
                        const incType = meta.income_type || 'Income';
                        prettyAction = 'Income ' + (log.action.includes('add') ? 'recorded' : log.action.includes('delete') ? 'deleted' : 'updated');
                        prettyDesc = `${incType} · ${currency} ${meta.amount}`;
                      } else if (log.action.includes('zakat') && meta.amount) {
                        prettyAction = 'Zakat payment recorded';
                        prettyDesc = `${currency} ${meta.amount}`;
                      } else if (log.action.includes('budget') && meta.amount) {
                        prettyAction = 'Monthly plan limit updated';
                        prettyDesc = `New limit: ${currency} ${meta.amount}`;
                      }
                    }
                  } catch (e) {}

                  const actor = members.find(m => m.profile_id === log.user_id)?.display_name || 'A user';
                  const timestampStr = format(new Date(log.created_at), 'MMM dd, hh:mm a');

                  return (
                    <div key={log.id} className="py-3.5 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-primary text-sm capitalize">{prettyAction}</p>
                        {prettyDesc ? (
                          <p className="text-xs text-[#073F3B] font-semibold mt-1 bg-secondary/40 px-2 py-0.5 rounded-sm inline-block">
                            {prettyDesc}
                          </p>
                        ) : null}
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          Added by {actor}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-text font-bold">
                        {timestampStr}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
