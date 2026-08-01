'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp, Expense } from '@/context/AppContext';
import { calculateSplit } from '@/lib/calculations';
import { 
  Search, 
  SlidersHorizontal, 
  Trash2, 
  Copy, 
  Edit3, 
  Eye, 
  Plus,
  ArrowRight,
  TrendingDown,
  MoreVertical,
  Paperclip
} from 'lucide-react';
import { format } from 'date-fns';

export default function ExpensesHistoryPage() {
  const { 
    currentWorkspace, 
    expenses, 
    categories, 
    members, 
    deleteExpense, 
    addExpense,
    editExpense,
    user 
  } = useApp();

  const isSolo = currentWorkspace?.type === 'solo';
  const currency = currentWorkspace?.currency || 'BDT';

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPayer, setSelectedPayer] = useState('');
  const [selectedVisibility, setSelectedVisibility] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [hasReceipt, setHasReceipt] = useState<boolean | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // Deletion modal state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Detail Modal
  const [activeDetailsExpense, setActiveDetailsExpense] = useState<Expense | null>(null);

  // Active Row Action Dropdown
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Edit Modal States
  const [editExpenseItem, setEditExpenseItem] = useState<Expense | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editMerchant, setEditMerchant] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editVisibility, setEditVisibility] = useState<'private' | 'shared_all' | 'shared_selected'>('private');
  const [editNotes, setEditNotes] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('Cash');

  const handleStartEdit = (exp: Expense) => {
    setEditExpenseItem(exp);
    setEditAmount(exp.amount.toString());
    setEditMerchant(exp.merchant);
    setEditCategoryId(exp.category_id);
    setEditDate(exp.expense_date.substring(0, 10));
    setEditVisibility(exp.visibility);
    setEditNotes(exp.notes || '');
    setEditPaymentMethod(exp.payment_method || 'Cash');
  };

  const handleSaveEdit = async () => {
    if (!editExpenseItem) return;
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('Amount must be a positive number.');
      return;
    }
    if (!editMerchant.trim()) {
      alert('Merchant is required.');
      return;
    }

    try {
      await editExpense(editExpenseItem.id, {
        amount: amt,
        merchant: editMerchant,
        category_id: editCategoryId,
        expense_date: editDate + 'T12:00:00Z',
        visibility: editVisibility,
        notes: editNotes,
        payment_method: editPaymentMethod,
      });
      setEditExpenseItem(null);
    } catch (e: any) {
      alert('Could not update expense: ' + e.message);
    }
  };

  // Filter and sort operation
  const activeExpenses = expenses.filter(e => !e.is_deleted);

  const filteredExpenses = activeExpenses.filter((e) => {
    // 1. Search text matching (merchant, notes, category)
    const matchText = searchTerm.toLowerCase();
    const catName = categories.find(c => c.id === e.category_id)?.name || '';
    const matchesSearch = 
      e.merchant.toLowerCase().includes(matchText) ||
      (e.notes && e.notes.toLowerCase().includes(matchText)) ||
      catName.toLowerCase().includes(matchText);

    if (!matchesSearch) return false;

    // 2. Category matching
    if (selectedCategory && e.category_id !== selectedCategory) return false;

    // 3. Payer matching
    if (selectedPayer && e.paid_by !== selectedPayer) return false;

    // 4. Visibility matching
    if (selectedVisibility) {
      if (selectedVisibility === 'private' && e.visibility !== 'private') return false;
      if (selectedVisibility === 'shared' && e.visibility === 'private') return false;
    }

    // 5. Min/Max amount matching
    const minAmt = parseFloat(minAmount);
    const maxAmt = parseFloat(maxAmount);
    if (!isNaN(minAmt) && e.amount < minAmt) return false;
    if (!isNaN(maxAmt) && e.amount > maxAmt) return false;

    // 6. Receipt presence
    if (hasReceipt !== null) {
      const receiptPresent = !!e.receipt_url;
      if (hasReceipt !== receiptPresent) return false;
    }

    return true;
  });

  // Apply sorting
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    if (sortBy === 'date_desc') {
      return new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime();
    }
    if (sortBy === 'date_asc') {
      return new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime();
    }
    if (sortBy === 'amount_desc') {
      return b.amount - a.amount;
    }
    if (sortBy === 'amount_asc') {
      return a.amount - b.amount;
    }
    return 0;
  });

  // Paginated List
  const totalItems = sortedExpenses.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedExpenses = sortedExpenses.slice(startIndex, startIndex + itemsPerPage);

  // Group by Date
  const groupExpensesByDate = (list: Expense[]) => {
    const groups: Record<string, Expense[]> = {};
    for (const exp of list) {
      const dateStr = format(new Date(exp.expense_date), 'yyyy-MM-dd');
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(exp);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  };

  const groupedExpenses = groupExpensesByDate(paginatedExpenses);

  // Delete Action Handler
  const handleDeleteConfirm = async () => {
    if (deleteConfirmId) {
      await deleteExpense(deleteConfirmId);
      setDeleteConfirmId(null);
      if (activeDetailsExpense?.id === deleteConfirmId) {
        setActiveDetailsExpense(null);
      }
    }
  };

  // Duplicate Action Handler
  const handleDuplicate = async (exp: Expense) => {
    try {
      const newParticipants = exp.participants?.map(p => ({
        profileId: p.profileId,
        value: p.value,
      })) || [];

      await addExpense(
        exp.amount,
        `${exp.merchant} (Copy)`,
        exp.category_id,
        exp.paid_by,
        exp.visibility,
        newParticipants,
        exp.split_method || 'equal',
        {
          notes: exp.notes,
          payment_method: exp.payment_method,
          receipt_url: exp.receipt_url,
        }
      );
      alert('Expense successfully duplicated!');
    } catch (e: any) {
      alert('Duplication failed: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-primary tracking-tight">Spending History</h1>
          <p className="text-xs text-muted-foreground mt-1">Review and manage your workspace expenses.</p>
        </div>
        <Link
          href="/dashboard/expenses/add"
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-md hover:opacity-90 transition-all text-xs"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </Link>
      </div>

      {/* Search & Filter Options */}
      <div className="bg-white border border-border rounded-lg p-4 shadow-xs space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search merchant, notes, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-md bg-input text-xs"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 px-3 py-2 border border-border rounded-md hover:bg-secondary text-xs text-primary font-semibold"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Detailed filters panel */}
        {showFilters && (
          <div className="pt-3 border-t border-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Category dropdown */}
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full p-2 border border-border rounded-md bg-white"
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Payer dropdown */}
            {!isSolo && (
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Paid by</label>
                <select
                  value={selectedPayer}
                  onChange={(e) => setSelectedPayer(e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-white"
                >
                  <option value="">All Members</option>
                  {members.map(m => (
                    <option key={m.profile_id} value={m.profile_id}>{m.display_name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Visibility dropdown */}
            {!isSolo && (
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Visibility</label>
                <select
                  value={selectedVisibility}
                  onChange={(e) => setSelectedVisibility(e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-white"
                >
                  <option value="">All Visibility</option>
                  <option value="private">Private to me</option>
                  <option value="shared">Shared with group</option>
                </select>
              </div>
            )}

            {/* Receipt filter */}
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Receipt attached</label>
              <select
                value={hasReceipt === null ? '' : hasReceipt ? 'yes' : 'no'}
                onChange={(e) => {
                  const val = e.target.value;
                  setHasReceipt(val === '' ? null : val === 'yes');
                }}
                className="w-full p-2 border border-border rounded-md bg-white"
              >
                <option value="">Any</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            {/* Min Amount */}
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Min Amount</label>
              <input
                type="number"
                placeholder="e.g. 100"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-full p-2 border border-border rounded-md bg-white"
              />
            </div>

            {/* Max Amount */}
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Max Amount</label>
              <input
                type="number"
                placeholder="e.g. 5000"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-full p-2 border border-border rounded-md bg-white"
              />
            </div>

            {/* Sorting */}
            <div>
              <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Sort by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full p-2 border border-border rounded-md bg-white"
              >
                <option value="date_desc">Newest first</option>
                <option value="date_asc">Oldest first</option>
                <option value="amount_desc">Highest amount</option>
                <option value="amount_asc">Lowest amount</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Empty State Check */}
      {sortedExpenses.length === 0 ? (
        <div className="bg-white border border-border rounded-lg p-12 text-center shadow-xs">
          <div className="w-12 h-12 bg-secondary text-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-primary text-sm mb-1">No transactions found</h3>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
            We couldn’t find any expenses matching these filters. Try modifying your search or filters.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Expenses Grouped List */}
          {groupedExpenses.map(([dateStr, list]) => (
            <div key={dateStr} className="space-y-2">
              <span className="block text-xs font-bold text-primary uppercase tracking-wider px-1">
                {format(new Date(dateStr), 'eeee, MMMM dd, yyyy')}
              </span>
              
              <div className="bg-white border border-border rounded-lg divide-y divide-border/60 shadow-xs overflow-hidden">
                {list.map((exp) => {
                  const cat = categories.find(c => c.id === exp.category_id);
                  const payerName = members.find(m => m.profile_id === exp.paid_by)?.display_name || 'Member';
                  
                  return (
                    <div 
                      key={exp.id}
                      className="p-4 flex justify-between items-center gap-4 hover:bg-background/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-md bg-secondary text-primary flex items-center justify-center shrink-0">
                          {cat ? cat.name.substring(0, 2).toUpperCase() : 'EX'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-primary truncate">{exp.merchant}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium flex items-center gap-1">
                            <span className="bg-secondary text-primary px-1.5 py-0.5 rounded-sm font-semibold">{cat?.name}</span>
                            <span>•</span>
                            <span>Paid by {payerName}</span>
                            <span>•</span>
                            {exp.visibility === 'private' ? (
                              <span className="bg-[#E7F3EF] text-[#506A64] px-1.5 py-0.5 rounded-md font-bold">Private</span>
                            ) : exp.visibility === 'shared_all' ? (
                              <span className="bg-[#EDF6F3] text-[#0AA99D] px-1.5 py-0.5 rounded-md font-bold">Shared</span>
                            ) : (
                              <span className="bg-[#EDF6F3] text-[#087F78] px-1.5 py-0.5 rounded-md font-bold">Selected members</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5 font-extrabold text-sm text-primary">
                          {exp.receipt_url && (
                            <Paperclip className="h-3.5 w-3.5 text-brand-teal" />
                          )}
                          <span>{currency} {exp.amount.toFixed(2)}</span>
                        </div>
                        
                        {/* Transaction Dropdown Action Menu */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(activeMenuId === exp.id ? null : exp.id);
                            }}
                            className="p-1 text-muted-foreground hover:text-primary rounded-md hover:bg-background transition-all"
                            title="Actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          
                          {activeMenuId === exp.id && (
                            <>
                              {/* Click-outside backdrop overlay */}
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setActiveMenuId(null)}
                              />
                              <div className="absolute right-0 mt-1 w-32 bg-white border border-border rounded-md shadow-lg py-1 z-20 animate-fade-in text-xs font-semibold select-none">
                                <button
                                  onClick={() => {
                                    setActiveDetailsExpense(exp);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-primary hover:bg-secondary/50 flex items-center gap-1.5"
                                >
                                  <Eye className="h-3.5 w-3.5 text-[#0AA99D]" /> View
                                </button>
                                <button
                                  onClick={() => {
                                    handleStartEdit(exp);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-primary hover:bg-secondary/50 flex items-center gap-1.5"
                                >
                                  <Edit3 className="h-3.5 w-3.5 text-[#087F78]" /> Edit
                                </button>
                                <button
                                  onClick={() => {
                                    handleDuplicate(exp);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-primary hover:bg-secondary/50 flex items-center gap-1.5"
                                >
                                  <Copy className="h-3.5 w-3.5 text-[#E5A823]" /> Duplicate
                                </button>
                                <button
                                  onClick={() => {
                                    setDeleteConfirmId(exp.id);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 text-destructive hover:bg-red-50 flex items-center gap-1.5"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-[#C85450]" /> Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center text-xs text-muted-foreground border-t border-border pt-4 px-2">
              <span>Showing {startIndex + 1} - {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} transactions</span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="px-3 py-1 border border-border rounded-md hover:bg-white disabled:opacity-50 font-bold"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="px-3 py-1 border border-border rounded-md hover:bg-white disabled:opacity-50 font-bold"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="bg-white border border-border rounded-lg p-6 max-w-sm w-full space-y-4 shadow-xl">
            <h3 className="font-bold text-lg text-primary">Delete transaction?</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This action will remove the expense from all settlement statements and budget counts. It cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleDeleteConfirm}
                className="w-1/2 py-2 bg-destructive text-destructive-foreground font-bold text-xs rounded-md hover:opacity-90 transition-all"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="w-1/2 py-2 border border-border text-primary font-bold text-xs rounded-md hover:bg-secondary transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILS SLIDEOVER / MODAL */}
      {activeDetailsExpense && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="bg-white border border-border rounded-lg p-6 max-w-md w-full space-y-5 shadow-xl">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Transaction Details</span>
                <h3 className="font-extrabold text-xl text-primary mt-1">{activeDetailsExpense.merchant}</h3>
              </div>
              <span className="font-black text-lg text-primary">
                {currency} {activeDetailsExpense.amount.toFixed(2)}
              </span>
            </div>

            {/* Receipt Preview */}
            {activeDetailsExpense.receipt_url && (
              <div className="border border-border rounded-md overflow-hidden bg-background max-h-48 flex items-center justify-center">
                <img 
                  src={activeDetailsExpense.receipt_url} 
                  alt="Receipt Scan" 
                  className="object-contain max-h-48 w-full"
                />
              </div>
            )}

            <div className="space-y-3 text-xs border-y border-border py-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span className="font-semibold text-primary">
                  {categories.find(c => c.id === activeDetailsExpense.category_id)?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expense Date</span>
                <span className="font-semibold text-primary">
                  {format(new Date(activeDetailsExpense.expense_date), 'MMMM dd, yyyy')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-semibold text-primary">{activeDetailsExpense.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Visibility</span>
                <span className="font-semibold text-primary uppercase">{activeDetailsExpense.visibility.replace(/_/g, ' ')}</span>
              </div>
              {activeDetailsExpense.notes && (
                <div className="flex flex-col gap-1 pt-1">
                  <span className="text-muted-foreground">Notes</span>
                  <span className="p-2 bg-background border border-border rounded-md italic">{activeDetailsExpense.notes}</span>
                </div>
              )}
            </div>

            {/* Split participants details */}
            {activeDetailsExpense.visibility !== 'private' && activeDetailsExpense.participants && (
              <div className="space-y-2">
                <span className="block text-[10px] font-bold text-muted-foreground uppercase">Assigned Split Shares</span>
                <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                  {activeDetailsExpense.participants.map((part) => {
                    const name = members.find(m => m.profile_id === part.profileId)?.display_name || 'Member';
                    return (
                      <div key={part.profileId} className="flex justify-between items-center text-xs bg-background p-1.5 rounded-md border border-border/50">
                        <span>{name}</span>
                        <span className="font-bold text-primary">{currency} {part.amount.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setActiveDetailsExpense(null)}
                className="w-full py-2 bg-primary text-primary-foreground font-bold text-xs rounded-md hover:opacity-90"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editExpenseItem && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-xs flex items-center justify-center p-6 z-50">
          <div className="bg-white border border-border rounded-lg p-6 max-w-md w-full space-y-4 shadow-xl text-xs overflow-y-auto max-h-[90vh]">
            <h3 className="font-extrabold text-base text-primary uppercase tracking-wider border-b border-border pb-2">
              Edit Expense Details
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-primary mb-1">Amount ({currency})</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-input font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-primary mb-1">Merchant / Payee</label>
                <input
                  type="text"
                  value={editMerchant}
                  onChange={(e) => setEditMerchant(e.target.value)}
                  className="w-full p-2 border border-border rounded-md bg-input font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-primary mb-1">Category</label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="w-full p-2 border border-border rounded-md bg-white font-medium text-primary"
                  >
                    {categories.filter(c => !c.is_archived).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-primary mb-1">Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full p-2 border border-border rounded-md bg-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-primary mb-1">Payment Method</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="w-full p-2 border border-border rounded-md bg-white text-primary font-medium"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Bank">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-primary mb-1">Visibility</label>
                  <select
                    value={editVisibility}
                    onChange={(e) => setEditVisibility(e.target.value as any)}
                    className="w-full p-2 border border-border rounded-md bg-white text-primary font-medium"
                  >
                    <option value="private">Private</option>
                    {!isSolo && (
                      <option value="shared_all">Shared with everyone</option>
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
                onClick={() => setEditExpenseItem(null)}
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
