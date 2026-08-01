'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Logo from '@/components/Logo';
import { BookOpen, ShieldCheck, Coins, Calendar, Tag, ArrowLeft, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface SharedWorkspace {
  id: string;
  name: string;
  currency: string;
}

interface SharedExpense {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  expense_date: string;
  category_id: string;
  payment_method: string;
}

interface Category {
  id: string;
  name: string;
}

export default function SharedLedgerPage() {
  const { id } = useParams();
  const [workspace, setWorkspace] = useState<SharedWorkspace | null>(null);
  const [expenses, setExpenses] = useState<SharedExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchSharedLedger = async () => {
      setLoading(true);
      try {
        // 1. Fetch Workspace Metadata
        const { data: wsData, error: wsError } = await supabase
          .from('workspaces')
          .select('id, name, currency')
          .eq('id', id)
          .single();

        if (wsError || !wsData) {
          throw new Error('Workspace not found or is not shared.');
        }

        setWorkspace(wsData);

        // 2. Fetch Categories
        const { data: catData } = await supabase
          .from('categories')
          .select('id, name');
        
        setCategories(catData || []);

        // 3. Fetch public expenses only
        const { data: expData, error: expError } = await supabase
          .from('expenses')
          .select('id, merchant, amount, currency, expense_date, category_id, payment_method')
          .eq('workspace_id', id)
          .eq('visibility', 'shared_all')
          .eq('is_deleted', false)
          .order('expense_date', { ascending: false });

        if (expError) throw expError;

        setExpenses(expData || []);
      } catch (err: any) {
        console.error('Error fetching shared ledger:', err);
        setError(err.message || 'Could not load the shared ledger book.');
        
        setWorkspace(null);
        setExpenses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSharedLedger();
  }, [id]);

  const totalPublicSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F4EC] flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 text-[#0AA99D] animate-spin mb-4" />
        <p className="text-sm font-semibold text-[#073F3B]">Retrieving secure ledger book...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F4EC] py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8 select-none">
        
        {/* Top Header Logotype */}
        <div className="flex justify-between items-center border-b border-[#D9E4DF] pb-5">
          <Logo className="h-8" variant="horizontal" />
          <Link
            href="/"
            className="flex items-center gap-1 text-xs font-bold text-[#0AA99D] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to main
          </Link>
        </div>

        {/* Ledger Title */}
        <div className="bg-white border border-[#D9E4DF] rounded-[16px] p-6 sm:p-8 shadow-[0_3px_12px_rgba(7,63,59,0.02)] space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#EDF6F3] rounded-[10px] text-[#073F3B]">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#0AA99D] uppercase tracking-wider">Shared Ledger Book</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#073F3B] leading-tight mt-0.5">
                {workspace?.name}
              </h1>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
            This page shows the public expenses list. Only items explicitly shared with the group reflect here. All private items are safely filtered out.
          </p>
        </div>

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-[#D9E4DF] rounded-[12px] p-5 shadow-[0_2px_8px_rgba(7,63,59,0.02)]">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Total public spending</span>
            <span className="text-xl font-black text-[#073F3B]">
              {workspace?.currency} {totalPublicSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-white border border-[#D9E4DF] rounded-[12px] p-5 shadow-[0_2px_8px_rgba(7,63,59,0.02)]">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Public entries</span>
            <span className="text-xl font-black text-[#073F3B]">
              {expenses.length} transactions
            </span>
          </div>

          <div className="bg-white border border-[#D9E4DF] rounded-[12px] p-5 shadow-[0_2px_8px_rgba(7,63,59,0.02)]">
            <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Active currency</span>
            <span className="text-xl font-black text-[#0AA99D]">
              {workspace?.currency}
            </span>
          </div>
        </div>

        {/* Privacy Shield Banner */}
        <div className="bg-[#EDF6F3] border border-[#BFD1CA] rounded-[12px] p-4 flex gap-3 items-start">
          <ShieldCheck className="h-5 w-5 text-[#073F3B] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-[#073F3B]">Privacy guarantee</h4>
            <p className="text-[11px] text-[#556964] leading-relaxed">
              No private ledger logs or private splits are exposed. Count Us In enforces strict RLS policies to safeguard personal entries.
            </p>
          </div>
        </div>

        {/* Ledger Transaction History List */}
        <div className="bg-white border border-[#D9E4DF] rounded-[16px] shadow-[0_3px_12px_rgba(7,63,59,0.02)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#D9E4DF] bg-[#EDF6F3]/10">
            <h3 className="font-bold text-xs text-[#073F3B] uppercase tracking-wider">Shared transactions</h3>
          </div>

          {expenses.length === 0 ? (
            <div className="py-12 text-center">
              <Coins className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground font-medium">No public expenses recorded in this ledger book yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F7F4EC]/40 text-muted-foreground font-bold border-b border-[#D9E4DF]">
                    <th className="p-4 pl-6">Merchant / Details</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Method</th>
                    <th className="p-4 pr-6 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9E4DF]/50 text-primary font-semibold">
                  {expenses.map((exp) => {
                    const cat = categories.find(c => c.id === exp.category_id);
                    return (
                      <tr key={exp.id} className="hover:bg-[#F7F4EC]/20 transition-all">
                        <td className="p-4 pl-6 font-bold">{exp.merchant}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#EDF6F3] text-[#073F3B] rounded-full text-[10px] font-bold">
                            <Tag className="h-3 w-3" /> {cat ? cat.name : 'Expense'}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {new Date(exp.expense_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="p-4 text-muted-foreground">{exp.payment_method}</td>
                        <td className="p-4 pr-6 text-right font-bold text-primary">
                          {exp.currency} {exp.amount.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Call to Action */}
        <div className="text-center pt-5 border-t border-[#D9E4DF]">
          <span className="text-[10px] text-muted-foreground font-bold uppercase block mb-3">Want to collaborate and split bills?</span>
          <Link
            href="/signup"
            className="h-10 px-5 bg-[#073F3B] hover:bg-[#087F78] text-white font-bold rounded-[10px] text-xs transition-all inline-flex items-center gap-2 shadow-xs"
          >
            Create your account <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

      </div>
    </div>
  );
}
