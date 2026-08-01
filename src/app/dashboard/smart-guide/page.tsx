'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Lightbulb, Info, AlertTriangle, Cpu, TrendingUp, Sparkles } from 'lucide-react';
import { format, startOfMonth, subDays } from 'date-fns';

export default function SmartGuidePage() {
  const { 
    expenses, 
    currentWorkspace, 
    categories, 
    budgets, 
    zakatPayments,
    incomes,
    user
  } = useApp();
  
  const currency = currentWorkspace?.currency || 'BDT';
  const today = new Date();
  const currentMonthStr = format(today, 'yyyy-MM');

  // Filter active records
  const activeExpenses = expenses.filter(e => !e.is_deleted);
  const activeIncomes = incomes.filter(i => !i.is_deleted);

  // ----------------------------------------------------------------------------
  // DETECT INSIGHTS (Deterministic Algorithms)
  // ----------------------------------------------------------------------------
  const insights: { type: 'info' | 'warning' | 'success'; text: string }[] = [];

  // Helper values
  const currentMonthExpenses = activeExpenses.filter(e => 
    format(new Date(e.expense_date), 'yyyy-MM') === currentMonthStr
  );
  const totalSpentThisMonth = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 1. Highest Spending Category
  const catTotals = categories.map(cat => {
    const total = currentMonthExpenses
      .filter(e => e.category_id === cat.id)
      .reduce((sum, e) => sum + e.amount, 0);
    return { name: cat.name, total };
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  if (catTotals.length > 0) {
    insights.push({
      type: 'info',
      text: `Your highest spending category this month is **${catTotals[0].name}** at **${currency} ${catTotals[0].total.toFixed(2)}**.`
    });
  }

  // 2. Budgets Approaching Limits
  const currentBudgets = budgets.filter(b => b.month_date.substring(0, 7) === currentMonthStr);
  currentBudgets.forEach(b => {
    const spent = currentMonthExpenses
      .filter(e => b.category_id === null || e.category_id === b.category_id)
      .reduce((sum, e) => sum + e.amount, 0);
    
    if (b.amount > 0) {
      const percentage = (spent / b.amount) * 100;
      const targetName = b.category_id === null 
        ? 'Overall monthly budget limit' 
        : `Category budget limit for **${categories.find(c => c.id === b.category_id)?.name}**`;
        
      if (percentage >= 100) {
        insights.push({
          type: 'warning',
          text: `${targetName} has exceeded the plan. Spent: **${currency} ${spent.toFixed(2)}** (Cap: **${currency} ${b.amount.toFixed(2)}**).`
        });
      } else if (percentage >= 90) {
        insights.push({
          type: 'warning',
          text: `${targetName} has reached **${percentage.toFixed(0)}%** of the plan. Capital conservation is recommended.`
        });
      } else if (percentage >= 75) {
        insights.push({
          type: 'info',
          text: `${targetName} has reached **${percentage.toFixed(0)}%** of the plan.`
        });
      }
    }
  });

  // 3. Month-over-Month changes
  const lastMonthStr = format(subDays(startOfMonth(today), 15), 'yyyy-MM');
  const lastMonthExpenses = activeExpenses.filter(e => 
    format(new Date(e.expense_date), 'yyyy-MM') === lastMonthStr
  );
  const totalSpentLastMonth = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  if (totalSpentLastMonth > 0) {
    const diff = totalSpentThisMonth - totalSpentLastMonth;
    const diffPercent = (Math.abs(diff) / totalSpentLastMonth) * 100;
    if (diff > 500) {
      insights.push({
        type: 'info',
        text: `Total spending this month is **${currency} ${Math.abs(diff).toFixed(2)} (${diffPercent.toFixed(0)}%)** higher than last month's total.`
      });
    } else if (diff < -500) {
      insights.push({
        type: 'success',
        text: `Total spending is **${currency} ${Math.abs(diff).toFixed(2)} (${diffPercent.toFixed(0)}%)** lower than last month's pace. Outstanding budget management!`
      });
    }
  }

  // 4. Duplicate Transaction Detection (same merchant, date, amount +/- 2%)
  const checkedIds = new Set<string>();
  currentMonthExpenses.forEach(e1 => {
    currentMonthExpenses.forEach(e2 => {
      if (e1.id !== e2.id && !checkedIds.has(e1.id) && !checkedIds.has(e2.id)) {
        const isSameMerchant = e1.merchant.toLowerCase() === e2.merchant.toLowerCase();
        const isSameAmount = Math.abs(e1.amount - e2.amount) / e1.amount < 0.02;
        const isCloseDate = Math.abs(new Date(e1.expense_date).getTime() - new Date(e2.expense_date).getTime()) < 24 * 60 * 60 * 1000;

        if (isSameMerchant && isSameAmount && isCloseDate) {
          insights.push({
            type: 'warning',
            text: `Possible duplicate transaction detected: **${e1.merchant}** was recorded twice for **${currency} ${e1.amount.toFixed(2)}** on adjacent dates.`
          });
          checkedIds.add(e1.id);
          checkedIds.add(e2.id);
        }
      }
    });
  });

  // 5. Zakat Payments Tracker Observation
  const activeZakat = zakatPayments.filter(z => !z.is_deleted);
  const zakatPaidThisYear = activeZakat
    .filter(z => new Date(z.payment_date).getFullYear() === today.getFullYear())
    .reduce((sum, z) => sum + z.amount, 0);

  if (zakatPaidThisYear > 0) {
    insights.push({
      type: 'success',
      text: `You have recorded **${currency} ${zakatPaidThisYear.toLocaleString()}** in Zakat contributions for the calendar year ${today.getFullYear()}.`
    });
  }

  // 6. Savings and pace estimates
  const myTotalIncome = activeIncomes
    .filter(i => i.profile_id === user?.id && format(new Date(i.income_date), 'yyyy-MM') === currentMonthStr)
    .reduce((sum, i) => sum + i.amount, 0);

  if (myTotalIncome > 0 && totalSpentThisMonth > 0) {
    const netSavings = myTotalIncome - totalSpentThisMonth;
    insights.push({
      type: 'info',
      text: `Based on your recorded income, your estimated remaining savings for this cycle are **${currency} ${netSavings.toFixed(2)}**.`
    });
  }

  return (
    <div className="space-y-8 w-full select-none">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-border pb-5">
        <div>
          <h1 className="text-[32px] font-extrabold text-primary leading-tight tracking-tight">Smart guide</h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium">
            Simple observations based on the information you have recorded.
          </p>
        </div>
      </div>

      {/* Observations list */}
      <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)] space-y-6">
        <h2 className="text-base font-bold text-primary flex items-center gap-1.5 border-b border-border pb-3">
          <Lightbulb className="h-5 w-5 text-[#E5A823]" />
          Household financial observations
        </h2>

        {insights.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground leading-relaxed space-y-2">
            <Info className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <p>No observations available. Add more income, expenses, and monthly budget caps to unlock deterministic financial insights.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((ins, idx) => {
              const Icon = ins.type === 'warning' ? AlertTriangle : ins.type === 'success' ? TrendingUp : Info;
              const borderCol = ins.type === 'warning' ? 'border-amber-200 bg-amber-50/20' : ins.type === 'success' ? 'border-green-200 bg-green-50/20' : 'border-slate-200 bg-slate-50/20';
              const iconCol = ins.type === 'warning' ? 'text-warning' : ins.type === 'success' ? 'text-accent' : 'text-primary';

              return (
                <div 
                  key={idx} 
                  className={`p-4 border rounded-lg flex items-start gap-3.5 text-xs leading-relaxed text-muted-foreground ${borderCol}`}
                >
                  <Icon className={`h-5 w-5 shrink-0 ${iconCol}`} />
                  <div 
                    dangerouslySetInnerHTML={{ __html: ins.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className="text-[10px] text-muted-foreground border-t border-border pt-4 flex gap-1.5 items-center">
          <Info className="h-4 w-4 shrink-0" />
          <span>Note: Estimates are projection calculations. This dashboard does not provide tax, legal, religious, or investment advice.</span>
        </div>
      </div>

    </div>
  );
}
