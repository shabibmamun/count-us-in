'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Plus, Settings, AlertCircle, Sparkles, TrendingUp, CalendarDays, Target, Edit3 } from 'lucide-react';
import { startOfMonth, endOfMonth, differenceInDays, format } from 'date-fns';

export default function OurPlanPage() {
  const { 
    currentWorkspace, 
    budgets, 
    savingTargets, 
    saveBudget, 
    saveSavingTarget, 
    categories,
    expenses,
    incomes,
    user
  } = useApp();

  const isSolo = currentWorkspace?.type === 'solo';
  const currency = currentWorkspace?.currency || 'BDT';

  const today = new Date();
  const currentMonthStr = format(today, 'yyyy-MM');
  const monthDate = `${currentMonthStr}-01`;
  const totalDays = differenceInDays(endOfMonth(today), startOfMonth(today)) + 1;
  const daysPassed = differenceInDays(today, startOfMonth(today)) + 1;
  const daysRemaining = differenceInDays(endOfMonth(today), today);

  // Configuration drawer states
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [isAddingCategoryCap, setIsAddingCategoryCap] = useState(false);

  // Form states
  const [selectedCategory, setSelectedCategory] = useState<string>(''); 
  const [budgetAmount, setBudgetAmount] = useState('');
  const [savingTargetVal, setSavingTargetVal] = useState('');

  // Calculate actual spending in current month
  const getCategorySpend = (catId: string | null) => {
    return expenses
      .filter(e => {
        const d = new Date(e.expense_date);
        const matchMonth = format(d, 'yyyy-MM') === currentMonthStr;
        const matchCat = catId === null || e.category_id === catId;
        return matchMonth && matchCat && !e.is_deleted;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(budgetAmount);
    if (isNaN(amt) || amt < 0) {
      alert('Budget amount must be a positive number.');
      return;
    }
    
    try {
      await saveBudget(amt, selectedCategory === '' ? null : selectedCategory, monthDate);
      setBudgetAmount('');
      setIsEditingLimit(false);
      setIsAddingCategoryCap(false);
    } catch (err: any) {
      alert('Could not set budget: ' + err.message);
    }
  };

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(savingTargetVal);
    if (isNaN(amt) || amt < 0) {
      alert('Saving target must be a positive number.');
      return;
    }

    try {
      await saveSavingTarget(amt, monthDate);
      setSavingTargetVal('');
      setIsEditingTarget(false);
    } catch (err: any) {
      alert('Could not save target: ' + err.message);
    }
  };

  // Calculations
  const overallBudget = budgets.find(b => b.category_id === null && b.month_date === monthDate);
  const activeSavingTarget = savingTargets.find(t => t.target_date === monthDate);
  const activeCategoryBudgets = budgets.filter(b => b.category_id !== null && b.month_date === monthDate);

  const currentMonthExpenses = expenses.filter(e => {
    const d = new Date(e.expense_date);
    return format(d, 'yyyy-MM') === currentMonthStr && !e.is_deleted;
  });

  const currentMonthIncomes = incomes.filter(i => {
    const d = new Date(i.income_date);
    return format(d, 'yyyy-MM') === currentMonthStr && !i.is_deleted;
  });

  const myIncomeTotal = currentMonthIncomes
    .filter(i => i.profile_id === user?.id)
    .reduce((sum, i) => sum + i.amount, 0);

  const myResponsibilityExpenses = currentMonthExpenses.reduce((sum, e) => {
    if (e.visibility === 'private') {
      return sum + (e.paid_by === user?.id ? e.amount : 0);
    }
    const myShare = e.participants?.find(p => p.profileId === user?.id);
    return sum + (myShare ? myShare.amount : 0);
  }, 0);

  const netSavingsAvailable = myIncomeTotal - myResponsibilityExpenses;

  return (
    <div className="space-y-8 w-full select-none">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-border pb-5">
        <div>
          <h1 className="text-[32px] font-extrabold text-primary leading-tight tracking-tight">Our plan</h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium">Set monthly limits, savings targets, and category caps.</p>
        </div>
      </div>

      {/* Main overall budget plan card (Top visual priority) */}
      <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)]">
        {overallBudget ? (
          (() => {
            const spent = getCategorySpend(null);
            const remaining = overallBudget.amount - spent;
            const percent = overallBudget.amount > 0 ? (spent / overallBudget.amount) * 100 : 0;
            const paceSpent = spent * (totalDays / daysPassed);

            return (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold text-brand-teal uppercase tracking-wider">Overall monthly limit</span>
                    <h2 className="text-3xl font-extrabold text-primary mt-1">
                      {currency} {overallBudget.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCategory('');
                      setBudgetAmount(overallBudget.amount.toString());
                      setIsEditingLimit(!isEditingLimit);
                    }}
                    className="h-9 px-4 bg-white text-[#073F3B] border border-[#9CB7AE] hover:bg-[#EDF6F3] font-semibold text-xs rounded-md transition-all flex items-center gap-1.5"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit limit
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 border-y border-border/60 text-xs">
                  <div>
                    <span className="block text-[10px] text-muted-text uppercase font-bold">Amount spent</span>
                    <span className="text-base font-bold text-primary">{currency} {spent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-text uppercase font-bold">Amount remaining</span>
                    <span className={`text-base font-bold ${remaining >= 0 ? 'text-primary' : 'text-[#C85450]'}`}>
                      {currency} {remaining.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-text uppercase font-bold">Paced projection</span>
                    <span className="text-base font-bold text-primary">{currency} {paceSpent.toLocaleString('en-US', { minimumFractionDigits: 0 })}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-muted-text uppercase font-bold">Days remaining</span>
                    <span className="text-base font-bold text-primary">{daysRemaining} days</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="w-full bg-[#EDF6F3] h-3 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${percent >= 100 ? 'bg-[#C85450]' : percent >= 90 ? 'bg-[#D28F1F]' : 'bg-[#0AA99D]'}`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-1.5 font-bold">
                    <span>{percent.toFixed(0)}% consumed</span>
                    <span className="uppercase">{percent >= 100 ? 'Budget exceeded' : percent >= 90 ? 'Approaching limit' : 'On track'}</span>
                  </div>
                </div>

                {/* Projected pace warning */}
                <div className="p-3.5 bg-[#EDF6F3]/50 border border-[#BFD1CA] rounded-[10px] text-xs leading-relaxed text-muted-foreground flex gap-2.5 items-start">
                  <AlertCircle className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    At the current pace, projected monthly spending is estimated to reach{' '}
                    <strong className="text-primary">{currency} {paceSpent.toFixed(2)}</strong> by month-end.{' '}
                    {paceSpent > overallBudget.amount 
                      ? 'This exceeds your spending cap. Look at category caps below to check limits.' 
                      : 'Great work! You are within your workspace plan boundaries.'}
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="py-12 text-center text-xs text-muted-foreground bg-[#F4F6F4]/50 rounded-[12px] border border-border">
            <p className="font-semibold text-sm text-primary mb-1">No overall monthly limit set</p>
            <p className="mb-4">Create a spending plan to monitor progress throughout the month.</p>
            <button
              onClick={() => {
                setSelectedCategory('');
                setBudgetAmount('');
                setIsEditingLimit(true);
              }}
              className="h-11 px-5 bg-[#073F3B] hover:bg-[#087F78] text-white font-semibold rounded-[10px] transition-all inline-block shadow-xs"
            >
              Set monthly limit
            </button>
          </div>
        )}
      </div>

      {/* Edit Limit Form Panel */}
      {isEditingLimit && (
        <form onSubmit={handleSaveBudget} className="bg-white border border-[#BFD1CA] rounded-[12px] p-5 space-y-4 max-w-md animate-fade-in text-xs">
          <h3 className="font-bold text-primary text-sm">Configure Overall Spending Cap</h3>
          <div>
            <label className="block text-[10px] font-bold text-muted-text uppercase mb-1">Limit Amount ({currency})</label>
            <input
              type="number"
              required
              placeholder="e.g. 10000"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              className="w-full p-2.5 border border-[#BFD1CA] rounded-[10px] text-sm bg-white text-primary"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="w-1/2 py-2 bg-[#073F3B] hover:bg-[#087F78] text-white font-bold rounded-md">Save Cap</button>
            <button type="button" onClick={() => setIsEditingLimit(false)} className="w-1/2 py-2 border border-border text-muted-foreground rounded-md">Cancel</button>
          </div>
        </form>
      )}

      {/* Secondary content grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Column 1: Savings target card */}
        <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)] flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-primary flex items-center gap-1.5">
                <Target className="h-4.5 w-4.5 text-muted-foreground" />
                Savings target
              </h3>
              <button
                onClick={() => {
                  setSavingTargetVal(activeSavingTarget ? activeSavingTarget.amount.toString() : '');
                  setIsEditingTarget(!isEditingTarget);
                }}
                className="text-xs font-bold text-[#0AA99D] hover:underline"
              >
                Edit target
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-[#EDF6F3] rounded-[10px] border border-[#BFD1CA]/60">
                <span className="block text-[9px] text-muted-text uppercase font-bold">Target amount</span>
                <span className="text-base font-extrabold text-primary">
                  {currency} {activeSavingTarget ? activeSavingTarget.amount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                </span>
              </div>
              <div className="p-3 bg-[#EDF6F3] rounded-[10px] border border-[#BFD1CA]/60">
                <span className="block text-[9px] text-muted-text uppercase font-bold">Currently available</span>
                <span className={`text-base font-extrabold ${netSavingsAvailable >= 0 ? 'text-primary' : 'text-[#C85450]'}`}>
                  {currency} {netSavingsAvailable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Savings Progress bar */}
            {activeSavingTarget && activeSavingTarget.amount > 0 && (
              <div>
                {(() => {
                  const target = activeSavingTarget.amount;
                  const available = Math.max(netSavingsAvailable, 0);
                  const progressPct = (available / target) * 100;
                  return (
                    <div className="space-y-1.5 text-xs">
                      <div className="w-full bg-[#EDF6F3] h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-[#E5A823]" 
                          style={{ width: `${Math.min(progressPct, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-text font-bold">
                        <span>{progressPct.toFixed(0)}% of target saved</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {isEditingTarget && (
              <form onSubmit={handleSaveTarget} className="space-y-3 pt-2 border-t border-border animate-fade-in text-xs">
                <input
                  type="number"
                  required
                  placeholder={`Savings target amount (${currency})`}
                  value={savingTargetVal}
                  onChange={(e) => setSavingTargetVal(e.target.value)}
                  className="w-full p-2 border border-[#BFD1CA] rounded-[10px] text-xs bg-white text-primary"
                />
                <div className="flex gap-2">
                  <button type="submit" className="w-1/2 py-2 bg-[#073F3B] hover:bg-[#087F78] text-white font-bold rounded-md">Save</button>
                  <button type="button" onClick={() => setIsEditingTarget(false)} className="w-1/2 py-2 border border-border text-muted-foreground rounded-md">Cancel</button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Column 2: Category budgets cap card */}
        <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)] space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-primary flex items-center gap-1.5">
              <Settings className="h-4.5 w-4.5 text-muted-foreground" />
              Category budgets
            </h3>
            <button
              onClick={() => {
                setSelectedCategory(categories.find(c => !c.is_archived)?.id || '');
                setBudgetAmount('');
                setIsAddingCategoryCap(!isAddingCategoryCap);
              }}
              className="text-xs font-bold text-[#0AA99D] hover:underline"
            >
              Add budget cap
            </button>
          </div>

          {isAddingCategoryCap && (
            <form onSubmit={handleSaveBudget} className="bg-[#F4F6F4] border border-border p-4 rounded-[10px] space-y-3 text-xs animate-fade-in">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-muted-text uppercase mb-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-2 border border-border rounded-md bg-white text-primary font-medium"
                  >
                    {categories.filter(c => !c.is_archived).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-muted-text uppercase mb-1">Limit ({currency})</label>
                  <input
                    type="number"
                    required
                    placeholder="Limit"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    className="w-full p-2 border border-border rounded-md bg-white text-primary"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="w-1/2 py-1.5 bg-[#073F3B] hover:bg-[#087F78] text-white font-bold rounded-md">Save</button>
                <button type="button" onClick={() => setIsAddingCategoryCap(false)} className="w-1/2 py-1.5 border border-border text-muted-foreground rounded-md">Cancel</button>
              </div>
            </form>
          )}

          {activeCategoryBudgets.length === 0 ? (
            <p className="text-xs text-muted-foreground leading-relaxed py-4 text-center">
              No specific category caps set. Set category caps to monitor dining, utilities, etc. separately.
            </p>
          ) : (
            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
              {activeCategoryBudgets.map((cb) => {
                const spent = getCategorySpend(cb.category_id);
                const percent = cb.amount > 0 ? (spent / cb.amount) * 100 : 0;
                const catName = categories.find(c => c.id === cb.category_id)?.name || 'Category';

                let barColor = 'bg-[#0AA99D]';
                if (percent >= 100) barColor = 'bg-[#C85450]';
                else if (percent >= 90) barColor = 'bg-[#D28F1F]';

                return (
                  <div key={cb.id} className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-primary">{catName}</span>
                      <span className="text-muted-foreground font-medium text-[10px]">
                        {currency} {spent.toFixed(0)} / {cb.amount.toFixed(0)} ({percent.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#EDF6F3] h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
