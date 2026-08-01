'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Settings, User, Sliders, ShieldCheck, Tag, Trash2, ShieldAlert } from 'lucide-react';

export default function SettingsPage() {
  const { 
    user, 
    currentWorkspace, 
    categories, 
    updateProfile, 
    updateWorkspaceSettings, 
    addCategory, 
    archiveCategory, 
    leaveWorkspace, 
    deleteWorkspace,
    purgeUserData 
  } = useApp();

  const router = useRouter();
  const isSolo = currentWorkspace?.type === 'solo';

  // Active Tab
  const [activeTab, setActiveTab] = useState<'profile' | 'workspace' | 'categories' | 'privacy' | 'sessions'>('profile');

  // Personal Profile states
  const [displayName, setDisplayName] = useState('');
  const [prefCurrency, setPrefCurrency] = useState('BDT');
  const [timezone, setTimezone] = useState('Asia/Dhaka');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Workspace parameters states
  const [workspaceName, setWorkspaceName] = useState('');
  const [budgetStartDay, setBudgetStartDay] = useState(1);
  const [savingTarget, setSavingTarget] = useState(0);
  const [isSavingWs, setIsSavingWs] = useState(false);

  // Custom Categories states
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Tag');
  const [isAddingCat, setIsAddingCat] = useState(false);

  // Initialization
  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name);
      setPrefCurrency(user.currency);
      setTimezone(user.timezone);
    }
    if (currentWorkspace) {
      setWorkspaceName(currentWorkspace.name);
      setBudgetStartDay(currentWorkspace.budget_start_day || 1);
      setSavingTarget(currentWorkspace.monthly_saving_target || 0);
    }
  }, [user, currentWorkspace]);

  // Actions
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateProfile({
        display_name: displayName,
        currency: prefCurrency,
        timezone,
      });
      alert('Profile updated successfully.');
    } catch (err: any) {
      alert('Could not update profile: ' + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWs(true);
    try {
      await updateWorkspaceSettings({
        name: workspaceName,
        budget_start_day: budgetStartDay,
        monthly_saving_target: savingTarget,
      });
      alert('Workspace parameters updated.');
    } catch (err: any) {
      alert('Could not update workspace parameters: ' + err.message);
    } finally {
      setIsSavingWs(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsAddingCat(true);
    try {
      await addCategory(newCatName.trim(), newCatIcon);
      setNewCatName('');
    } catch (err: any) {
      alert('Could not add category: ' + err.message);
    } finally {
      setIsAddingCat(false);
    }
  };

  const handleArchiveCat = async (catId: string) => {
    try {
      await archiveCategory(catId);
    } catch (err: any) {
      alert('Could not archive category: ' + err.message);
    }
  };

  const handleLeaveWs = async () => {
    if (confirm('Are you sure you want to leave this shared workspace?')) {
      await leaveWorkspace();
      router.push('/dashboard');
    }
  };

  const handleDeleteWs = async () => {
    if (confirm('Are you sure you want to delete this workspace and all its records permanently?')) {
      await deleteWorkspace();
      router.push('/dashboard');
    }
  };

  const handlePurgeAccount = async () => {
    if (confirm('WARNING: Are you sure you want to delete your entire account, all workspaces you own, and all financial records? This action is permanent.')) {
      await purgeUserData();
      router.push('/');
    }
  };

  return (
    <div className="space-y-8 w-full select-none">
      {/* Header */}
      <div className="border-b border-border pb-5">
        <h1 className="text-[32px] font-extrabold text-primary leading-tight tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1.5 font-medium">Configure profile, categories, and account privacy preferences.</p>
      </div>

      {/* Tabs Selector Navigation */}
      <div className="flex border-b border-border gap-2 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'profile' 
              ? 'border-[#0AA99D] text-[#073F3B]' 
              : 'border-transparent text-muted-foreground hover:text-primary'
          }`}
        >
          Profile
        </button>
        {currentWorkspace && (
          <button
            onClick={() => setActiveTab('workspace')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all shrink-0 ${
              activeTab === 'workspace' 
                ? 'border-[#0AA99D] text-[#073F3B]' 
                : 'border-transparent text-muted-foreground hover:text-primary'
            }`}
          >
            Workspace
          </button>
        )}
        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'categories' 
              ? 'border-[#0AA99D] text-[#073F3B]' 
              : 'border-transparent text-muted-foreground hover:text-primary'
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'privacy' 
              ? 'border-[#0AA99D] text-[#073F3B]' 
              : 'border-transparent text-muted-foreground hover:text-primary'
          }`}
        >
          Privacy & data
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all shrink-0 ${
            activeTab === 'sessions' 
              ? 'border-[#0AA99D] text-[#073F3B]' 
              : 'border-transparent text-muted-foreground hover:text-primary'
          }`}
        >
          Sessions
        </button>
      </div>

      {/* Tabs Content */}
      <div className="space-y-6">
        
        {/* Tab 1: Profile */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)] space-y-4 max-w-2xl animate-fade-in">
            <h3 className="font-bold text-sm text-primary flex items-center gap-2 border-b border-border pb-3">
              <User className="h-4.5 w-4.5 text-muted-foreground" />
              Personal profile
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-semibold text-primary">
              <div>
                <label htmlFor="disp" className="block text-[11px] text-muted-text uppercase font-bold mb-1">Display Name</label>
                <input
                  id="disp"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full p-3 border border-[#BFD1CA] rounded-[10px] bg-white text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cur" className="block text-[11px] text-muted-text uppercase font-bold mb-1">Preferred Currency</label>
                  <select
                    id="cur"
                    value={prefCurrency}
                    onChange={(e) => setPrefCurrency(e.target.value)}
                    className="w-full p-3 border border-[#BFD1CA] rounded-[10px] bg-white text-sm text-primary font-bold"
                  >
                    <option value="BDT">BDT (৳)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="tz" className="block text-[11px] text-muted-text uppercase font-bold mb-1">Time Zone</label>
                  <select
                    id="tz"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full p-3 border border-[#BFD1CA] rounded-[10px] bg-white text-sm text-primary font-bold"
                  >
                    <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
                    <option value="UTC">UTC (GMT+0)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="h-11 px-5 bg-[#073F3B] hover:bg-[#087F78] text-white font-bold rounded-[10px] transition-all shadow-xs"
              >
                {isSavingProfile ? 'Saving...' : 'Save profile details'}
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Workspace parameters */}
        {activeTab === 'workspace' && currentWorkspace && (
          <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)] space-y-4 max-w-2xl animate-fade-in">
            <h3 className="font-bold text-sm text-primary flex items-center gap-2 border-b border-border pb-3">
              <Sliders className="h-4.5 w-4.5 text-muted-foreground" />
              Workspace parameters
            </h3>

            <form onSubmit={handleSaveWorkspace} className="space-y-4 text-xs font-semibold text-primary">
              <div>
                <label htmlFor="wsTitle" className="block text-[11px] text-muted-text uppercase font-bold mb-1">Workspace title</label>
                <input
                  id="wsTitle"
                  type="text"
                  required
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full p-3 border border-[#BFD1CA] rounded-[10px] bg-white text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="bgtDay" className="block text-[11px] text-muted-text uppercase font-bold mb-1">Budget month start day</label>
                  <input
                    id="bgtDay"
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={budgetStartDay}
                    onChange={(e) => setBudgetStartDay(parseInt(e.target.value, 10))}
                    className="w-full p-3 border border-[#BFD1CA] rounded-[10px] bg-white text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="savTgt" className="block text-[11px] text-muted-text uppercase font-bold mb-1">Monthly savings target ({prefCurrency})</label>
                  <input
                    id="savTgt"
                    type="number"
                    min={0}
                    required
                    value={savingTarget}
                    onChange={(e) => setSavingTarget(parseFloat(e.target.value))}
                    className="w-full p-3 border border-[#BFD1CA] rounded-[10px] bg-white text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingWs}
                className="h-11 px-5 bg-[#073F3B] hover:bg-[#087F78] text-white font-bold rounded-[10px] transition-all shadow-xs"
              >
                {isSavingWs ? 'Saving...' : 'Save workspace parameters'}
              </button>
            </form>

            {/* Share Public Ledger Book Section */}
            <div className="border-t border-border pt-5 mt-5 space-y-3 font-semibold text-primary">
              <span className="block text-[11px] font-bold text-muted-text uppercase">Share Ledger Book</span>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                Generate a secure, read-only public sharing link. Anyone with this link can view the public transactions (expenses) in this ledger book. Private expenses are completely hidden.
              </p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/ledger/share/${currentWorkspace.id}` : ''}
                  className="flex-1 p-3 border border-[#BFD1CA] rounded-[10px] bg-[#F4F6F4]/60 text-xs font-mono text-muted-foreground select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      navigator.clipboard.writeText(`${window.location.origin}/ledger/share/${currentWorkspace.id}`);
                      alert('Share link copied to clipboard!');
                    }
                  }}
                  className="h-11 px-5 bg-[#0AA99D] hover:bg-[#087F78] text-white font-bold rounded-[10px] text-xs shrink-0 transition-all shadow-xs"
                >
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Custom Categories */}
        {activeTab === 'categories' && (
          <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)] space-y-5 max-w-2xl animate-fade-in">
            <h3 className="font-bold text-sm text-primary flex items-center gap-2 border-b border-border pb-3">
              <Tag className="h-4.5 w-4.5 text-muted-foreground" />
              Manage categories
            </h3>

            {/* List custom categories */}
            <div className="space-y-3">
              <span className="block text-[11px] font-bold text-muted-text uppercase">Active categories</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {categories.filter(c => !c.is_archived).map((cat) => (
                  <div key={cat.id} className="p-3 border border-border bg-[#F4F6F4]/50 rounded-[10px] flex justify-between items-center text-primary font-semibold">
                    <span>{cat.name}</span>
                    {cat.workspace_id !== null && (
                      <button
                        onClick={() => handleArchiveCat(cat.id)}
                        className="text-[10px] font-bold text-[#C85450] hover:underline"
                        title="Archive category"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} className="border-t border-border pt-4 text-xs space-y-3 font-semibold text-primary">
              <span className="block text-[11px] font-bold text-muted-text uppercase">Create new category</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Subscriptions"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 p-3 border border-[#BFD1CA] rounded-[10px] bg-white text-sm"
                />
                <button
                  type="submit"
                  disabled={isAddingCat}
                  className="h-11 px-5 bg-[#073F3B] hover:bg-[#087F78] text-white font-bold rounded-[10px] text-xs shrink-0 transition-all shadow-xs"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 4: Privacy & Data (includes Danger Zone bottom card) */}
        {activeTab === 'privacy' && (
          <div className="space-y-6 max-w-2xl animate-fade-in">
            <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)] space-y-4">
              <h3 className="font-bold text-sm text-primary flex items-center gap-1.5 border-b border-border pb-3">
                <ShieldCheck className="h-4.5 w-4.5 text-muted-foreground" />
                Privacy and data
              </h3>

              <div className="bg-[#EDF6F3] border border-[#BFD1CA] p-3 rounded-[10px] text-xs text-[#073F3B] font-bold">
                Your money stays under your control.
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Count Us In does not distribute, sell, or advertise based on your transactional entries. Your profile audit trail can be purged at any time.
              </p>
            </div>

            {/* Destructive Actions: Danger Zone Card (Isolated at the bottom) */}
            <div className="bg-white border border-[#C85450]/30 rounded-[16px] p-6 shadow-[0_3px_12px_rgba(200,84,80,0.04)] space-y-4">
              <h3 className="font-bold text-sm text-[#C85450] flex items-center gap-1.5 border-b border-[#C85450]/20 pb-3">
                <ShieldAlert className="h-4.5 w-4.5 text-[#C85450]" />
                Danger zone
              </h3>

              <div className="space-y-3">
                {!isSolo && (
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border border-border rounded-[10px] gap-2">
                    <div>
                      <span className="font-bold text-xs text-primary block">Leave shared workspace</span>
                      <span className="text-[10px] text-muted-foreground">Exit and transfer responsibilities.</span>
                    </div>
                    <button
                      onClick={handleLeaveWs}
                      className="px-3.5 py-2 border border-[#C85450] text-[#C85450] hover:bg-red-50 text-[11px] font-bold rounded-[8px] transition-all"
                    >
                      Leave workspace
                    </button>
                  </div>
                )}

                {user?.id === currentWorkspace?.created_by && (
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border border-border rounded-[10px] gap-2">
                    <div>
                      <span className="font-bold text-xs text-primary block">Delete workspace</span>
                      <span className="text-[10px] text-muted-foreground">Permanently delete workspace and all transactions.</span>
                    </div>
                    <button
                      onClick={handleDeleteWs}
                      className="px-3.5 py-2 bg-[#C85450] hover:bg-[#A93F3C] text-white text-[11px] font-bold rounded-[8px] transition-all"
                    >
                      Delete workspace
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border border-border rounded-[10px] gap-2">
                  <div>
                    <span className="font-bold text-xs text-primary block">Purge account and data</span>
                    <span className="text-[10px] text-muted-foreground">Delete your account, subscriptions, workspaces, and ledger.</span>
                  </div>
                  <button
                    onClick={handlePurgeAccount}
                    className="px-3.5 py-2 bg-[#C85450] hover:bg-[#A93F3C] text-white text-[11px] font-bold rounded-[8px] transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Purge data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Sessions */}
        {activeTab === 'sessions' && (
          <div className="bg-white border border-border rounded-[16px] p-6 shadow-[0_3px_12px_rgba(7,63,59,0.04)] space-y-4 max-w-2xl animate-fade-in">
            <h3 className="font-bold text-sm text-primary flex items-center gap-1.5 border-b border-border pb-3">
              <ShieldCheck className="h-4.5 w-4.5 text-muted-foreground" />
              Active sessions
            </h3>

            <div className="p-3 bg-[#EDF6F3] border border-[#BFD1CA] rounded-[10px] text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-primary text-sm font-bold">Web Client</span>
                <span className="text-[10px] text-[#0AA99D] font-bold">Active Now</span>
              </div>
              <span className="block text-[10px] text-muted-foreground">Chrome Browser • Dhaka, Bangladesh</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
