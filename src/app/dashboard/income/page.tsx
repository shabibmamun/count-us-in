'use client';

import React, { useState } from 'react';
import { useApp, Income } from '@/context/AppContext';
import { Plus, Trash2, Wallet, ArrowUpRight, Check, Edit3 } from 'lucide-react';
import { format } from 'date-fns';

export default function IncomeTrackingPage() {
  const { 
    currentWorkspace, 
    incomes, 
    addIncome, 
    editIncome,
    deleteIncome, 
    addRecurringTemplate,
    members,
    user,
    recurringTemplates
  } = useApp();

  const isSolo = currentWorkspace?.type === 'solo';
  const currency = currentWorkspace?.currency || 'BDT';

  // Form states
  const [amount, setAmount] = useState('');
  const [incomeType, setIncomeType] = useState<Income['income_type']>('Salary');
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [visibility, setVisibility] = useState<Income['visibility']>('shared_all');
  const [notes, setNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('monthly');

  // Edit Modal States
  const [editIncomeItem, setEditIncomeItem] = useState<Income | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editIncomeType, setEditIncomeType] = useState<Income['income_type']>('Salary');
  const [editIncomeDate, setEditIncomeDate] = useState('');
  const [editVisibility, setEditVisibility] = useState<Income['visibility']>('private');
  const [editNotes, setEditNotes] = useState('');

  const handleStartEdit = (inc: Income) => {
    setEditIncomeItem(inc);
    setEditAmount(inc.amount.toString());
    setEditIncomeType(inc.income_type);
    setEditIncomeDate(inc.income_date.substring(0, 10));
    setEditVisibility(inc.visibility);
    setEditNotes(inc.notes || '');
  };

  const handleSaveEdit = async () => {
    if (!editIncomeItem) return;
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Income amount must be greater than zero.');
      return;
    }

    try {
      await editIncome(editIncomeItem.id, {
        amount: amt,
        income_type: editIncomeType,
        income_date: editIncomeDate + 'T12:00:00Z',
        visibility: editVisibility,
        notes: editNotes,
      });
      setEditIncomeItem(null);
    } catch (e: any) {
      alert('Could not update income: ' + e.message);
    }
  };

  // Filter out soft deleted incomes
  const activeIncomes = incomes.filter(i => !i.is_deleted);

  React.useEffect(() => {
    if (currentWorkspace) {
      setVisibility('shared_all');
    }
  }, [currentWorkspace]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      alert('Income amount must be greater than zero.');
      return;
    }

    try {
      await addIncome(amtNum, incomeType, visibility, {
        income_date: incomeDate + 'T12:00:00Z',
        notes: notes,
      });

      if (isRecurring) {
        const d = new Date(incomeDate + 'T12:00:00Z');
        d.setMonth(d.getMonth() + 1);
        const nextOcc = d.toISOString().split('T')[0];

        await addRecurringTemplate(
          'income',
          amtNum,
          incomeType,
          null,
          visibility,
          nextOcc,
          { frequency: recurringFrequency, notes }
        );
      }

      // Clear Form
      setAmount('');
      setNotes('');
      setIsRecurring(false);
      setIsAdding(false);
    } catch (e: any) {
      alert('Could not save income: ' + e.message);
    }
  };

  return (
    <div className="space-y-8 w-full select-none">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-border pb-5">
        <div>
          <h1 className="text-[32px] font-extrabold text-primary leading-tight tracking-tight">Income tracking</h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium">Record and manage monthly income entries.</p>
        </div>
        
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="h-11 px-5 bg-[#073F3B] hover:bg-[#087F78] text-white font-semibold rounded-[10px] flex items-center justify-center gap-2 text-sm shadow-xs transition-all"
        >
          <Plus className="h-4 w-4" />
          {isAdding ? 'Close form' : 'Record income'}
        </button>
      </div>

      {/* Income Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-teal">Income this month</span>
          <h3 className="text-[28px] font-extrabold text-primary mt-2">
            {currency} {activeIncomes.reduce((sum, inc) => sum + inc.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h3>
        </div>
        <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-teal">Recurring income</span>
          <h3 className="text-[28px] font-extrabold text-primary mt-2">
            {currency} {recurringTemplates.filter(t => t.type === 'income' && t.is_active).reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h3>
        </div>
        <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-brand-teal">Income sources</span>
          <h3 className="text-[28px] font-extrabold text-primary mt-2">
            {activeIncomes.map(i => i.income_type).filter((v, idx, self) => self.indexOf(v) === idx).length} active
          </h3>
        </div>
      </div>

      {/* Income Entry Form Card */}
      {isAdding && (
        <form 
          onSubmit={handleSave}
          className="bg-white border border-border rounded-lg p-6 shadow-xs space-y-4"
        >
          <h3 className="font-bold text-sm text-primary uppercase tracking-wider">Record Income Entry</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="amount" className="block text-xs font-semibold text-primary mb-1">
                Income Amount ({currency})
              </label>
              <input
                id="amount"
                type="number"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-input text-sm font-bold text-primary"
              />
            </div>

            <div>
              <label htmlFor="incomeType" className="block text-xs font-semibold text-primary mb-1">
                Source
              </label>
              <select
                id="incomeType"
                value={incomeType}
                onChange={(e) => setIncomeType(e.target.value as any)}
                className="w-full px-3 py-2 border border-border rounded-md bg-input text-sm"
              >
                <option value="Salary">Salary</option>
                <option value="Business income">Business income</option>
                <option value="Bonus">Bonus</option>
                <option value="Freelance income">Freelance income</option>
                <option value="Rental income">Rental income</option>
                <option value="Investment income">Investment income</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Recurring Option */}
          <div className="p-3 bg-background border border-border rounded-md space-y-3">
            <div className="flex items-center gap-2">
              <input
                id="isRec"
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-border focus:ring-primary h-4 w-4"
              />
              <label htmlFor="isRec" className="text-xs font-semibold text-primary">
                Make this a recurring monthly income
              </label>
            </div>

            {isRecurring && (
              <div className="flex gap-2 items-center text-xs animate-fade-in">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Frequency</span>
                <select
                  value={recurringFrequency}
                  onChange={(e) => setRecurringFrequency(e.target.value)}
                  className="p-1 border border-border rounded bg-white text-xs text-primary"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            )}
          </div>

          {/* Toggle details */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs font-bold text-primary hover:underline block text-left"
          >
            {showAdvanced ? '─ Hide details' : '┼ Show details (Date, Visibility, Notes)'}
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-2 border-t border-border/60 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="incomeDate" className="block text-xs font-semibold text-primary mb-1">
                    Received Date
                  </label>
                  <input
                    id="incomeDate"
                    type="date"
                    required
                    value={incomeDate}
                    onChange={(e) => setIncomeDate(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-input text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="visibility" className="block text-xs font-semibold text-primary mb-1">
                    Visibility
                  </label>
                  <select
                    id="visibility"
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as any)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-input text-sm"
                  >
                    <option value="private">Private (Only me)</option>
                    {!isSolo && (
                      <option value="shared_all">Visible to the whole group</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-xs font-semibold text-primary mb-1">
                  Notes (optional)
                </label>
                <input
                  id="notes"
                  type="text"
                  placeholder="e.g. Monthly salary payout"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-input text-sm"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-md hover:opacity-90"
            >
              Save income record
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-6 py-2 border border-border text-muted-foreground hover:text-primary rounded-md text-xs"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Income History Summary */}
      <div className="bg-white border border-border rounded-lg shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border bg-background/30 flex items-center justify-between">
          <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            Income ledger
          </h2>
          <span className="text-xs text-muted-foreground">Total records: {activeIncomes.length}</span>
        </div>

        {activeIncomes.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground leading-relaxed bg-[#F4F6F4]/50">
            <p className="font-medium text-sm text-primary mb-1 text-center">No income recorded yet</p>
            <p className="mb-4">Add salary, business, freelance, rental, or other income to calculate your monthly financial position.</p>
            <button
              onClick={() => setIsAdding(true)}
              className="h-9 px-4 bg-[#073F3B] hover:bg-[#087F78] text-white font-semibold rounded-[10px] transition-all inline-block"
            >
              Record income
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {activeIncomes.map((inc) => {
              const memberName = members.find(m => m.profile_id === inc.profile_id)?.display_name || 'Member';
              return (
                <div 
                  key={inc.id}
                  className="p-4 flex justify-between items-center gap-4 hover:bg-background/20 transition-colors text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary text-primary flex items-center justify-center font-bold">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-primary">{inc.income_type}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Recorded by {memberName} on {format(new Date(inc.income_date), 'MMM dd, yyyy')}
                        {inc.visibility === 'private' ? (
                          <span className="ml-2 bg-[#E7F3EF] text-[#506A64] px-1.5 py-0.5 rounded-md font-bold text-[9px]">Private</span>
                        ) : (
                          <span className="ml-2 bg-[#EDF6F3] text-[#0AA99D] px-1.5 py-0.5 rounded-md font-bold text-[9px]">Shared</span>
                        )}
                      </p>
                      {inc.notes && <p className="text-[10px] text-muted-foreground mt-1 italic">"{inc.notes}"</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 font-semibold">
                    <span className="font-extrabold text-sm text-primary">
                      {currency} {inc.amount.toFixed(2)}
                    </span>
                    
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => handleStartEdit(inc)}
                        className="p-1.5 text-muted-foreground hover:text-primary rounded-md hover:bg-background transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteIncome(inc.id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* EDIT INCOME MODAL */}
      {editIncomeItem && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="bg-white border border-border rounded-lg p-6 max-w-md w-full space-y-4 shadow-xl text-xs">
            <h3 className="font-extrabold text-base text-primary uppercase tracking-wider border-b border-border pb-2">
              Edit Income Record
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-primary mb-1 font-bold">Amount ({currency})</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-input font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-primary mb-1">Source</label>
                <select
                  value={editIncomeType}
                  onChange={(e) => setEditIncomeType(e.target.value as any)}
                  className="w-full p-2 border border-border rounded-md bg-white font-medium text-primary"
                >
                  <option value="Salary">Salary</option>
                  <option value="Business income">Business income</option>
                  <option value="Bonus">Bonus</option>
                  <option value="Freelance income">Freelance income</option>
                  <option value="Rental income">Rental income</option>
                  <option value="Investment income">Investment income</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-primary mb-1">Received Date</label>
                  <input
                    type="date"
                    value={editIncomeDate}
                    onChange={(e) => setEditIncomeDate(e.target.value)}
                    className="w-full p-2 border border-border rounded-md bg-input"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-primary mb-1">Visibility</label>
                  <select
                    value={editVisibility}
                    onChange={(e) => setEditVisibility(e.target.value as any)}
                    className="w-full p-2 border border-border rounded-md bg-white font-medium text-primary"
                  >
                    <option value="private">Private</option>
                    {!isSolo && (
                      <option value="shared_all">Visible to group</option>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-primary mb-1">Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-input"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveEdit}
                className="w-1/2 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-md hover:opacity-90 transition-all"
              >
                Save Updates
              </button>
              <button
                onClick={() => setEditIncomeItem(null)}
                className="w-1/2 py-2 border border-border text-primary font-bold text-xs rounded-md hover:bg-secondary transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
