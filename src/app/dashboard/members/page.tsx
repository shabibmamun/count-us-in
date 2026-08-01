'use client';

import React, { useState } from 'react';
import { useApp, WorkspaceMember } from '@/context/AppContext';
import { Users, UserPlus, ShieldAlert, Trash2, Key, Link as LinkIcon, Check } from 'lucide-react';
import { format } from 'date-fns';

export default function MembersManagementPage() {
  const { 
    currentWorkspace, 
    members, 
    invitations, 
    createInvitation, 
    revokeInvitation, 
    removeMember,
    user 
  } = useApp();

  const isSolo = currentWorkspace?.type === 'solo';
  const currency = currentWorkspace?.currency || 'BDT';

  // State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check roles
  const myRole = members.find(m => m.profile_id === user?.id)?.role || 'member';
  const canInvite = myRole === 'owner' || myRole === 'admin';

  if (isSolo) {
    return (
      <div className="bg-white border border-border rounded-lg p-12 text-center max-w-xl mx-auto shadow-xs mt-8">
        <h2 className="text-xl font-bold text-primary mb-2">Members panel is for groups</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Solo spaces do not support member management. Switch to or create a group workspace to invite others.
        </p>
      </div>
    );
  }

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const link = await createInvitation(inviteEmail || undefined, inviteRole);
      setGeneratedLink(link);
      setInviteEmail('');
    } catch (err: any) {
      alert('Could not generate invitation: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-primary tracking-tight">Members & Group Setup</h1>
        <p className="text-xs text-muted-foreground mt-1">Invite trusted people and configure member privileges.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left column: members list */}
        <div className="md:col-span-2 space-y-6">
          {/* Members List Card */}
          <div className="bg-white border border-border rounded-lg shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border bg-background/30 flex items-center justify-between text-xs font-bold text-primary uppercase tracking-wider">
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> Workspace members</span>
              <span className="text-muted-foreground normal-case font-normal">Active count: {members.length} / 6</span>
            </div>

            <div className="divide-y divide-border">
              {members.map((m) => (
                <div key={m.profile_id} className="p-4 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center">
                      {m.display_name?.substring(0, 2).toUpperCase() || 'M'}
                    </div>
                    <div>
                      <p className="font-bold text-primary">{m.display_name} {m.profile_id === user?.id && '(You)'}</p>
                      <p className="text-[10px] text-muted-foreground capitalize mt-0.5">Role: {m.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Privilege controls */}
                    {myRole === 'owner' && m.profile_id !== user?.id && (
                      <button
                        onClick={() => removeMember(m.profile_id)}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-red-50 rounded-md transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Invitations ledger */}
          <div className="bg-white border border-border rounded-lg shadow-xs overflow-hidden">
            <div className="p-4 border-b border-border bg-background/30 text-xs font-bold text-primary uppercase tracking-wider">
              <span>Outstanding Invitations</span>
            </div>

            {invitations.filter(i => !i.is_used && !i.is_revoked).length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No outstanding invitations active.</p>
            ) : (
              <div className="divide-y divide-border">
                {invitations.filter(i => !i.is_used && !i.is_revoked).map((inv) => (
                  <div key={inv.id} className="p-4 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-primary">{inv.email || 'Open Invitation link'}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Expires on {format(new Date(inv.expires_at), 'MMM dd, yyyy')} • Role: {inv.role}
                      </p>
                    </div>
                    
                    {canInvite && (
                      <button
                        onClick={() => revokeInvitation(inv.id)}
                        className="px-2.5 py-1 border border-border hover:bg-red-50 text-destructive text-[10px] font-bold rounded-md"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Invite others */}
        <div className="space-y-6">
          {canInvite ? (
            <div className="bg-white border border-border rounded-lg p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-xs text-primary uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="h-4.5 w-4.5 text-muted-foreground" />
                Count someone in
              </h3>
              
              <p className="text-xs text-muted-foreground leading-relaxed">
                Invite someone you trust to join your shared space. Link token verifies securely before letting a new member enter.
              </p>

              <form onSubmit={handleCreateInvite} className="space-y-3 pt-2">
                <div>
                  <label htmlFor="invEmail" className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Email address (optional)</label>
                  <input
                    id="invEmail"
                    type="email"
                    placeholder="name@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full p-2 border border-border rounded-md text-xs bg-input"
                  />
                </div>

                <div>
                  <label htmlFor="invRole" className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">Role privilege</label>
                  <select
                    id="invRole"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full p-2 border border-border rounded-md text-xs bg-white"
                  >
                    <option value="member">Member (Add records only)</option>
                    <option value="admin">Admin (Manage budgets/members)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 bg-primary text-primary-foreground font-bold text-xs rounded-md hover:opacity-90 transition-all"
                >
                  {isLoading ? 'Generating...' : 'Generate Invite Link'}
                </button>
              </form>

              {/* Display generated link */}
              {generatedLink && (
                <div className="p-3 bg-secondary/30 border border-primary/20 rounded-md text-xs space-y-2 mt-4 animate-fade-in">
                  <span className="font-bold text-primary block uppercase text-[9px] tracking-wider">Invitation Link</span>
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="text"
                      readOnly
                      value={generatedLink}
                      className="w-full p-1 border border-border bg-white rounded-md text-[10px] text-muted-foreground"
                    />
                    <button
                      onClick={handleCopy}
                      className="p-1.5 bg-primary text-primary-foreground font-bold text-[10px] rounded-md shrink-0 flex items-center justify-center w-8 h-8"
                    >
                      {copied ? <Check className="h-4.5 w-4.5" /> : <LinkIcon className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-border rounded-lg p-5 shadow-xs flex items-start gap-2.5 text-xs text-muted-foreground">
              <ShieldAlert className="h-5 w-5 text-primary shrink-0" />
              <p>Invitation generation is restricted. Contact your workspace owner or admin to invite new members.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
