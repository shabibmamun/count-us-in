'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { 
  BarChart3, 
  Download, 
  Upload, 
  Printer, 
  PieChart, 
  TrendingUp, 
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

export default function ReportsPage() {
  const { 
    currentWorkspace, 
    expenses, 
    incomes, 
    zakatPayments, 
    settlements, 
    categories, 
    members,
    importBackup,
    user 
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currency = currentWorkspace?.currency || 'BDT';
  const isSolo = currentWorkspace?.type === 'solo';

  // Period state
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'last_month' | 'year'>('month');

  // Active filters for charts
  const activeExpenses = expenses.filter(e => !e.is_deleted);
  const activeIncomes = incomes.filter(i => !i.is_deleted);
  const activeZakat = zakatPayments.filter(z => !z.is_deleted);

  // Compute date intervals
  const getInterval = () => {
    const now = new Date();
    switch (period) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case 'month':
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case 'last_month':
        return { start: startOfDay(subDays(now, 60)), end: endOfDay(subDays(now, 30)) };
      case 'year':
        return { start: startOfDay(subDays(now, 365)), end: endOfDay(now) };
    }
  };

  const interval = getInterval();

  const periodExpenses = activeExpenses.filter(e => {
    const d = new Date(e.expense_date);
    return isWithinInterval(d, interval);
  });

  const periodIncomes = activeIncomes.filter(i => {
    const d = new Date(i.income_date);
    return isWithinInterval(d, interval);
  });

  // Calculate totals
  const totalExpense = periodExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncome = periodIncomes.reduce((sum, i) => sum + i.amount, 0);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Group Spending by Category
  const categoryTotals = categories.map(cat => {
    const total = periodExpenses
      .filter(e => e.category_id === cat.id)
      .reduce((sum, e) => sum + e.amount, 0);
    return { name: cat.name, total };
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  // Group Spending by Member
  const memberTotals = members.map(m => {
    const total = periodExpenses
      .filter(e => e.paid_by === m.profile_id)
      .reduce((sum, e) => sum + e.amount, 0);
    return { name: m.display_name || 'Member', total };
  }).filter(m => m.total > 0);

  // Largest expenses
  const largestExpenses = [...periodExpenses].sort((a, b) => b.amount - a.amount).slice(0, 5);

  // ----------------------------------------------------------------------------
  // EXPORTS HELPERS
  // ----------------------------------------------------------------------------
  const downloadCSV = (csvContent: string, fileName: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExpensesCSV = () => {
    let csv = 'ID,Date,Merchant,Category,Amount,Paid By,Visibility,Notes,Payment Method\n';
    activeExpenses.forEach(e => {
      const catName = categories.find(c => c.id === e.category_id)?.name || 'Category';
      const payerName = members.find(m => m.profile_id === e.paid_by)?.display_name || 'Member';
      csv += `"${e.id}","${e.expense_date}","${e.merchant.replace(/"/g, '""')}","${catName}",${e.amount},"${payerName}","${e.visibility}","${(e.notes || '').replace(/"/g, '""')}","${e.payment_method}"\n`;
    });
    downloadCSV(csv, 'expenses_export');
  };

  const exportIncomesCSV = () => {
    let csv = 'ID,Date,Type,Amount,Recorded By,Visibility,Notes\n';
    activeIncomes.forEach(i => {
      const recorderName = members.find(m => m.profile_id === i.profile_id)?.display_name || 'Member';
      csv += `"${i.id}","${i.income_date}","${i.income_type}",${i.amount},"${recorderName}","${i.visibility}","${(i.notes || '').replace(/"/g, '""')}"\n`;
    });
    downloadCSV(csv, 'income_export');
  };

  const exportZakatCSV = () => {
    let csv = 'ID,Date,Zakat Year,Amount,Notes,Visibility,Recipient,Payment Method\n';
    activeZakat.forEach(z => {
      csv += `"${z.id}","${z.payment_date}",${z.zakat_year},${z.amount},"${(z.notes || '').replace(/"/g, '""')}","${z.visibility}","${(z.recipient || '').replace(/"/g, '""')}","${z.payment_method}"\n`;
    });
    downloadCSV(csv, 'zakat_export');
  };

  const exportSettlementsCSV = () => {
    let csv = 'ID,Date,Sender,Recipient,Amount,Currency,Notes\n';
    settlements.filter(s => !s.is_deleted).forEach(s => {
      const payerName = members.find(m => m.profile_id === s.payer_id)?.display_name || 'Member';
      const recName = members.find(m => m.profile_id === s.recipient_id)?.display_name || 'Member';
      csv += `"${s.id}","${s.settlement_date}","${payerName}","${recName}",${s.amount},"${s.currency}","${(s.notes || '').replace(/"/g, '""')}"\n`;
    });
    downloadCSV(csv, 'settlements_export');
  };

  const exportBackupJSON = () => {
    const backup = {
      workspace: currentWorkspace,
      user,
      members,
      categories,
      expenses: activeExpenses,
      incomes: activeIncomes,
      zakatPayments: activeZakat,
      settlements: settlements.filter(s => !s.is_deleted),
    };
    const str = JSON.stringify(backup, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `count-us-in_backup_${format(new Date(), 'yyyy-MM-dd')}.json`);
    link.click();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        await importBackup(text);
        alert('Workspace backup successfully restored!');
        window.location.reload();
      } catch (err: any) {
        alert('Backup restoration failed: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 w-full select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-[32px] font-extrabold text-primary leading-tight tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium">Generate financial summaries and back up data.</p>
        </div>
 
        {/* Period Picker */}
        <div className="bg-white border border-[#BFD1CA] p-1 rounded-[10px] flex gap-1 text-xs font-semibold">
          {(['today', 'week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-[8px] capitalize transition-all ${
                period === p ? 'bg-[#073F3B] text-white' : 'text-muted-foreground hover:text-primary'
              }`}
            >
              {p === 'week' ? 'Last 7 days' : p === 'month' ? 'Last 30 days' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Main KPI summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)]">
          <span className="text-[11px] font-bold text-brand-teal uppercase tracking-wider">Total income</span>
          <h3 className="text-[28px] font-extrabold text-primary mt-2">
            {currency} {totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h3>
        </div>
 
        <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)]">
          <span className="text-[11px] font-bold text-brand-teal uppercase tracking-wider">Total spending</span>
          <h3 className="text-[28px] font-extrabold text-primary mt-2">
            {currency} {totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h3>
        </div>
 
        <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)]">
          <span className="text-[11px] font-bold text-brand-teal uppercase tracking-wider">Savings margin</span>
          <h3 className={`text-[28px] font-extrabold mt-2 ${netSavings >= 0 ? 'text-primary' : 'text-[#C85450]'}`}>
            {currency} {netSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h3>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-text font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E5A823]"></span>
            <span>{savingsRate.toFixed(0)}% savings rate</span>
          </div>
        </div>
      </div>

      {/* Visual Charts section (Restrained, neat SVG charting) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
      {/* Visual Charts section */}
      <div className={`grid grid-cols-1 ${isSolo ? 'grid-cols-1' : 'md:grid-cols-2'} gap-6`}>
        
        {/* Category Spent Pie Chart Ring */}
        <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)] space-y-4">
          <h3 className="font-bold text-sm text-primary flex items-center gap-1.5">
            <PieChart className="h-4.5 w-4.5 text-muted-foreground" />
            Spending by category
          </h3>
 
          {categoryTotals.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No categories recorded in this period.</p>
          ) : (
            <div className="space-y-4">
              {categoryTotals.slice(0, 5).map((ct, idx) => {
                const percent = totalExpense > 0 ? (ct.total / totalExpense) * 100 : 0;
                const barColors = ['bg-[#073F3B]', 'bg-[#0AA99D]', 'bg-[#E5A823]', 'bg-[#087F78]'];
                const colorClass = barColors[idx % barColors.length];

                return (
                  <div key={idx} className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-primary">{ct.name}</span>
                      <span className="text-muted-foreground font-semibold text-[10px]">
                        {currency} {ct.total.toFixed(0)} ({percent.toFixed(0)}%)
                      </span>
                    </div>
                    {/* Ring bar */}
                    <div className="w-full bg-[#EDF6F3] h-2 rounded-full overflow-hidden">
                      <div className={`${colorClass} h-full rounded-full`} style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
 
        {/* Member Spent summary - Hidden completely in solo mode */}
        {!isSolo && (
          <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)] space-y-4">
            <h3 className="font-bold text-sm text-primary flex items-center gap-1.5">
              <BarChart3 className="h-4.5 w-4.5 text-muted-foreground" />
              Spending by member
            </h3>
 
            {memberTotals.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">No member spends recorded in this period.</p>
            ) : (
              <div className="space-y-4">
                {memberTotals.map((mt, idx) => {
                  const percent = totalExpense > 0 ? (mt.total / totalExpense) * 100 : 0;
                  return (
                    <div key={idx} className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-primary">{mt.name}</span>
                        <span className="text-muted-foreground font-semibold text-[10px]">
                          {currency} {mt.total.toFixed(0)} ({percent.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-[#EDF6F3] h-2 rounded-full overflow-hidden">
                        <div className="bg-[#0AA99D] h-full rounded-full" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
 
      </div>

      </div>

      {/* Largest Expenses & review summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Largest Expenses list */}
        <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)] md:col-span-2 space-y-4">
          <h3 className="font-bold text-sm text-primary">Largest expenses this period</h3>
          {largestExpenses.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No expenses recorded.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {largestExpenses.map((le) => (
                <div key={le.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-primary block text-sm">{le.merchant}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 inline-block">
                      {format(new Date(le.expense_date), 'MMM dd, yyyy')} • {categories.find(c => c.id === le.category_id)?.name}
                    </span>
                  </div>
                  <strong className="text-primary font-extrabold text-sm">{currency} {le.amount.toFixed(2)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>
 
        {/* Print summary card */}
        <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)] flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-primary flex items-center gap-1.5">
              <Printer className="h-4.5 w-4.5 text-muted-foreground" />
              Month in review
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Export a print-friendly summary sheet of the current month’s budgets, expenses, and split settlement details.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="h-11 bg-white text-[#073F3B] border border-[#9CB7AE] hover:bg-[#EDF6F3] font-semibold text-xs rounded-[10px] w-full mt-4 flex items-center justify-center gap-1.5 transition-all"
          >
            Print monthly review
          </button>
        </div>
 
      </div>

      {/* CSV & JSON backups panel */}
      <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)] space-y-6">
        <div>
          <h2 className="text-base font-bold text-primary flex items-center gap-1.5">
            <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
            Data export & backups
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Download CSV records or generate a full backup file.</p>
        </div>
 
        {/* Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button
            onClick={exportExpensesCSV}
            className="p-4 border border-border rounded-[12px] bg-background hover:bg-[#EDF6F3] transition-all flex flex-col items-center justify-center gap-2 text-center"
          >
            <Download className="h-4.5 w-4.5 text-[#073F3B]" />
            <span className="font-bold text-[9px] text-[#073F3B] uppercase tracking-wider">Expenses CSV</span>
          </button>
 
          <button
            onClick={exportIncomesCSV}
            className="p-4 border border-border rounded-[12px] bg-background hover:bg-[#EDF6F3] transition-all flex flex-col items-center justify-center gap-2 text-center"
          >
            <Download className="h-4.5 w-4.5 text-[#073F3B]" />
            <span className="font-bold text-[9px] text-[#073F3B] uppercase tracking-wider">Incomes CSV</span>
          </button>
 
          <button
            onClick={exportZakatCSV}
            className="p-4 border border-border rounded-[12px] bg-background hover:bg-[#EDF6F3] transition-all flex flex-col items-center justify-center gap-2 text-center"
          >
            <Download className="h-4.5 w-4.5 text-[#073F3B]" />
            <span className="font-bold text-[9px] text-[#073F3B] uppercase tracking-wider">Zakat CSV</span>
          </button>
 
          <button
            onClick={exportSettlementsCSV}
            className="p-4 border border-border rounded-[12px] bg-background hover:bg-[#EDF6F3] transition-all flex flex-col items-center justify-center gap-2 text-center"
          >
            <Download className="h-4.5 w-4.5 text-[#073F3B]" />
            <span className="font-bold text-[9px] text-[#073F3B] uppercase tracking-wider">Settlements CSV</span>
          </button>
        </div>
 
        {/* JSON workspace backup / restore */}
        <div className="border-t border-border pt-5 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          <div className="space-y-2">
            <h4 className="font-bold text-primary text-sm">Download JSON workspace backup</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Export your entire workspace profile including members, expenses, incomes, and settlements into a single backup file.
            </p>
            <button
              onClick={exportBackupJSON}
              className="h-10 px-4 bg-[#073F3B] hover:bg-[#087F78] text-white font-semibold text-xs rounded-md transition-all flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" /> Download backup
            </button>
          </div>
 
          <div className="space-y-2">
            <h4 className="font-bold text-primary text-sm">Restore workspace backup</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upload a previously downloaded JSON backup file to overwrite your current local workspace records.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-10 px-4 border border-[#9CB7AE] text-[#073F3B] hover:bg-[#EDF6F3] font-semibold text-xs rounded-md transition-all flex items-center gap-1.5"
            >
              <Upload className="h-4 w-4" /> Import backup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
