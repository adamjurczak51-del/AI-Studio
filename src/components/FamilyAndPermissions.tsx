import React, { useState } from 'react';
import { FamilyMember, FamilyRole, Account, FamilyPermissions } from '../types';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Check, 
  X, 
  Trash2, 
  Edit3, 
  Lock, 
  Unlock, 
  UserCheck, 
  Sparkles,
  Eye,
  KeyRound,
  QrCode,
  Copy,
  Share2,
  ExternalLink,
  Shield,
  Smartphone
} from 'lucide-react';
import { generateInviteQrSvg } from '../utils/qrCodeGenerator';
import { createPersonalizedInvite } from '../utils/firebase';
import { buildInviteUrl } from '../utils/urlHelper';

interface FamilyAndPermissionsProps {
  allMembers: FamilyMember[];
  currentMember: FamilyMember;
  accounts: Account[];
  householdId?: string;
  householdName?: string;
  onAddMember: (member: Omit<FamilyMember, 'id'>) => void;
  onUpdateMember: (member: FamilyMember) => void;
  onDeleteMember: (id: string) => void;
  onSwitchMember: (id: string) => void;
}

export const FamilyAndPermissions: React.FC<FamilyAndPermissionsProps> = ({
  allMembers,
  currentMember,
  accounts,
  householdId = 'rodzina-glowna',
  householdName = 'Nasze Gospodarstwo',
  onAddMember,
  onUpdateMember,
  onDeleteMember,
  onSwitchMember,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<FamilyMember | null>(null);
  const [inviteMemberTarget, setInviteMemberTarget] = useState<FamilyMember | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // New Member Form State - all 8 permissions explicitly controlled by checkboxes!
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<FamilyRole>('MANAGER');
  const [newEmoji, setNewEmoji] = useState('👩');
  const [newEmail, setNewEmail] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newAssignedAccounts, setNewAssignedAccounts] = useState<string[]>([]);
  
  // Independent permission checkboxes (default to full co-administrator permissions for Spouse/Mama)
  const [pCanViewAllAccounts, setPCanViewAllAccounts] = useState(true);
  const [pCanViewFamilyTotalBalance, setPCanViewFamilyTotalBalance] = useState(true);
  const [pCanManageAccounts, setPCanManageAccounts] = useState(true);
  const [pCanManageBudget, setPCanManageBudget] = useState(true);
  const [pCanManageCategories, setPCanManageCategories] = useState(true);
  const [pCanManageFamily, setPCanManageFamily] = useState(true);
  const [pCanScanReceipts, setPCanScanReceipts] = useState(true);
  const [pCanManagePantry, setPCanManagePantry] = useState(true);

  // When role changes in the Add form, provide helpful starting defaults
  const handleRoleChangeForNew = (role: FamilyRole) => {
    setNewRole(role);
    if (role === 'ADMIN' || role === 'MANAGER') {
      // Współmałżonek (MANAGER) & Administrator otrzymują pełne uprawnienia do kont, budżetu i rodziny
      setPCanViewAllAccounts(true);
      setPCanViewFamilyTotalBalance(true);
      setPCanManageAccounts(true);
      setPCanManageBudget(true);
      setPCanManageCategories(true);
      setPCanManageFamily(true);
      setPCanScanReceipts(true);
      setPCanManagePantry(true);
      if (role === 'MANAGER' && newEmoji === '👤') setNewEmoji('👩');
      if (role === 'ADMIN') setNewEmoji('👨‍💼');
    } else if (role === 'MEMBER') {
      setPCanViewAllAccounts(false);
      setPCanViewFamilyTotalBalance(true);
      setPCanManageAccounts(false);
      setPCanManageBudget(false);
      setPCanManageCategories(false);
      setPCanManageFamily(false);
      setPCanScanReceipts(true);
      setPCanManagePantry(true);
      setNewEmoji('👤');
    } else if (role === 'CHILD') {
      setPCanViewAllAccounts(false);
      setPCanViewFamilyTotalBalance(false);
      setPCanManageAccounts(false);
      setPCanManageBudget(false);
      setPCanManageCategories(false);
      setPCanManageFamily(false);
      setPCanScanReceipts(true);
      setPCanManagePantry(true);
      setNewEmoji('👦');
    }
  };

  const handleEmojiChangeForNew = (emoji: string) => {
    setNewEmoji(emoji);
  };

  const isAdmin = currentMember?.role === 'ADMIN' || currentMember?.role === 'MANAGER' || !!currentMember?.permissions?.canManageFamily || (Array.isArray(allMembers) && allMembers.length <= 2);

  const handleStartEditMember = (member: FamilyMember) => {
    const existingPerms = member.permissions || {
      canViewAllAccounts: member.role === 'ADMIN' || member.role === 'MANAGER',
      canViewFamilyTotalBalance: true,
      canManageAccounts: member.role === 'ADMIN' || member.role === 'MANAGER',
      canManageBudget: true,
      canManageCategories: true,
      canManageFamily: member.role === 'ADMIN' || member.role === 'MANAGER',
      canScanReceipts: true,
      canManagePantry: true,
    };

    setEditingMember({
      ...member,
      assignedAccountIds: member.assignedAccountIds || (accounts || []).map((a) => a.id),
      permissions: {
        canViewAllAccounts: existingPerms.canViewAllAccounts ?? (member.role === 'ADMIN' || member.role === 'MANAGER'),
        canViewFamilyTotalBalance: existingPerms.canViewFamilyTotalBalance !== false,
        canManageAccounts: existingPerms.canManageAccounts ?? (member.role === 'ADMIN' || member.role === 'MANAGER'),
        canManageBudget: existingPerms.canManageBudget !== false,
        canManageCategories: existingPerms.canManageCategories !== false,
        canManageFamily: existingPerms.canManageFamily ?? (member.role === 'ADMIN' || member.role === 'MANAGER'),
        canScanReceipts: existingPerms.canScanReceipts !== false,
        canManagePantry: existingPerms.canManagePantry !== false,
      },
    });
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newMemberId = `mem-${Date.now()}`;
    const token = `inv-${newMemberId}-${Date.now().toString(36)}`;
    const createdMember: FamilyMember = {
      id: newMemberId,
      name: newName.trim(),
      role: newRole,
      avatarColor: newRole === 'ADMIN' ? 'bg-indigo-600' : newRole === 'CHILD' ? 'bg-amber-500' : 'bg-rose-500',
      avatarEmoji: newEmoji,
      email: newEmail.trim() || '',
      pin: newPin.trim() || '',
      assignedAccountIds: newAssignedAccounts.length > 0 ? newAssignedAccounts : (accounts || []).map((a) => a.id),
      inviteCode: token,
      isInvitePending: true,
      invitedAt: new Date().toISOString(),
      permissions: {
        canViewAllAccounts: pCanViewAllAccounts,
        canViewFamilyTotalBalance: pCanViewFamilyTotalBalance,
        canManageAccounts: pCanManageAccounts,
        canManageBudget: pCanManageBudget,
        canManageCategories: pCanManageCategories,
        canManageFamily: pCanManageFamily,
        canScanReceipts: pCanScanReceipts,
        canManagePantry: pCanManagePantry,
      },
    };

    onAddMember(createdMember);

    setNewName('');
    setNewEmail('');
    setNewPin('');
    setShowAddModal(false);

    // Automatically open the personalized invite modal with QR code & WhatsApp share for this new member!
    handleOpenInviteModal(createdMember);
  };

  const handleSaveEditedMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    onUpdateMember(editingMember);
    setEditingMember(null);
  };

  // Generate Personalized Invite URL using public access URL
  const getInviteUrl = (member: FamilyMember) => {
    const token = member.inviteCode || `inv-${member.id}`;
    return buildInviteUrl(token, {
      householdId,
      householdName,
      targetMemberId: member.id,
      targetMemberName: member.name,
      targetRole: member.role,
      invitedBy: currentMember?.name || 'Administrator',
    });
  };

  const handleOpenInviteModal = async (member?: FamilyMember) => {
    if (!member) return;
    const token = member.inviteCode || `inv-${member.id}-${Date.now().toString(36)}`;
    const updatedMember = {
      ...member,
      inviteCode: token,
      isInvitePending: true,
      invitedAt: member.invitedAt || new Date().toISOString(),
    };
    setInviteMemberTarget(updatedMember);
    setShowInviteModal(true);

    try {
      await createPersonalizedInvite({
        token,
        householdId,
        householdName,
        invitedByMemberName: currentMember?.name || 'Administrator',
        targetMemberId: member.id,
        targetMemberName: member.name,
        targetRole: member.role,
        assignedAccountIds: member.assignedAccountIds || [],
        permissions: member.permissions || {
          canViewAllAccounts: false,
          canViewFamilyTotalBalance: true,
          canManageAccounts: false,
          canManageBudget: false,
          canManageCategories: false,
          canManageFamily: false,
          canScanReceipts: true,
          canManagePantry: true,
        },
      });

      if (!member.inviteCode) {
        onUpdateMember(updatedMember);
      }
    } catch (err) {
      console.error('Failed to save invite in Firestore:', err);
    }
  };

  const handleCopyInviteLink = (url: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleNativeShare = async (url: string, memberName: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Dołącz do rodziny ${householdName} w aplikacji Domowy Budżet AI`,
          text: `Cześć ${memberName}! Zapraszam Cię do aplikacji Domowy Budżet dla naszego gospodarstwa domowego (${householdName}). Otwórz ten link na telefonie, aby aktywować swój profil:`,
          url: url,
        });
      } catch (e) {
        // user cancelled or share failed
      }
    } else {
      handleCopyInviteLink(url);
    }
  };

  const safeMembers = (Array.isArray(allMembers) ? allMembers : []).filter(
    (m) => m && m.name && m.name.trim() !== '' && m.name !== 'undefined' && m.role
  );
  const safeAccounts = Array.isArray(accounts) ? accounts : [];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-900/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <ShieldCheck className="w-6 h-6 text-indigo-300" />
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              Bezpieczeństwo &amp; Precyzyjne Uprawnienia
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Członkowie Rodziny &amp; Dostęp do Kont
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200 leading-relaxed">
            Każda osoba ma indywidualne uprawnienia (niezależne od roli czy awatara). Możesz zaprosić domowników linkiem lub kodem QR do otwarcia na telefonie.
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2.5 flex-wrap">
            {safeMembers.length > 0 && (
              <button
                onClick={() => {
                  handleOpenInviteModal(safeMembers[1] || safeMembers[0]);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95"
              >
                <QrCode className="w-4 h-4" />
                <span>Zaproś kodem QR / Linkiem</span>
              </button>
            )}

            <button
              onClick={() => {
                setNewAssignedAccounts(safeAccounts.map((a) => a.id));
                handleRoleChangeForNew('MANAGER');
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Nowa osoba</span>
            </button>
          </div>
        )}
      </div>

      {/* Members List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {safeMembers.map((member) => {
          const isCurrentUser = member.id === currentMember?.id;
          const assignedAccs = safeAccounts.filter((a) => (member.assignedAccountIds || []).includes(a.id));
          const perms = member.permissions || {
            canViewAllAccounts: false,
            canViewFamilyTotalBalance: true,
            canManageAccounts: false,
            canManageBudget: false,
            canManageCategories: false,
            canManageFamily: false,
            canScanReceipts: true,
            canManagePantry: true,
          };

          return (
            <div
              key={member.id}
              className={`p-5 rounded-3xl border bg-white shadow-md hover:shadow-lg transition flex flex-col justify-between space-y-4 ${
                isCurrentUser ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200'
              }`}
            >
              <div>
                {/* Member header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center text-2xl shadow-sm">
                      {member.avatarEmoji || '👤'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-slate-900 leading-tight">
                          {member.name || 'Członek rodziny'}
                        </h3>
                        {member.pin && (
                          <span title="Profil chroniony kodem PIN" className="p-0.5 rounded text-amber-600 bg-amber-50">
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block mt-0.5">
                        {member.role === 'ADMIN'
                          ? '👑 Główny Administrator'
                          : member.role === 'MANAGER'
                          ? '💍 Współmałżonek (Współadministrator)'
                          : member.role === 'CHILD'
                          ? '👦 Dziecko'
                          : '👤 Członek rodziny'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenInviteModal(member)}
                      title="Wygeneruj spersonalizowany link i kod QR na telefon"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStartEditMember(member)}
                      title="Edytuj profil i uprawnienia"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {safeMembers.length > 1 && member.role !== 'ADMIN' && (
                      <button
                        onClick={() => setMemberToDelete(member)}
                        title="Usuń profil z rodziny"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Visible Accounts Box */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 mb-3">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase">
                    <span>Widoczne subkonta:</span>
                    <span className="text-indigo-600">
                      {perms.canViewAllAccounts ? 'Wszystkie konta' : `${assignedAccs.length} z ${safeAccounts.length}`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {perms.canViewAllAccounts ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                        Pełny wgląd (wszystkie subkonta)
                      </span>
                    ) : assignedAccs.length === 0 ? (
                      <span className="text-slate-400 text-[11px] italic">Brak przypisanych subkont</span>
                    ) : (
                      assignedAccs.map((a) => (
                        <span key={a.id} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-medium">
                          {(a.name || 'Konto').split(' ')[0]}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Explicit Permissions Badges List */}
                <div className="space-y-1.5 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Nadane uprawnienia:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <span className={`px-2 py-1 rounded-lg flex items-center gap-1.5 ${
                      perms.canViewFamilyTotalBalance ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'bg-slate-100 text-slate-400 line-through'
                    }`}>
                      {perms.canViewFamilyTotalBalance ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-slate-400" />}
                      <span>Saldo główne</span>
                    </span>

                    <span className={`px-2 py-1 rounded-lg flex items-center gap-1.5 ${
                      perms.canManageAccounts ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'bg-slate-100 text-slate-400 line-through'
                    }`}>
                      {perms.canManageAccounts ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-slate-400" />}
                      <span>Zarządzanie kontami</span>
                    </span>

                    <span className={`px-2 py-1 rounded-lg flex items-center gap-1.5 ${
                      perms.canManageBudget ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'bg-slate-100 text-slate-400 line-through'
                    }`}>
                      {perms.canManageBudget ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-slate-400" />}
                      <span>Budżet i limity</span>
                    </span>

                    <span className={`px-2 py-1 rounded-lg flex items-center gap-1.5 ${
                      perms.canScanReceipts ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'bg-slate-100 text-slate-400 line-through'
                    }`}>
                      {perms.canScanReceipts ? <Check className="w-3 h-3 text-emerald-600" /> : <X className="w-3 h-3 text-slate-400" />}
                      <span>Skaner paragonów</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Member Card Actions */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500">Status profilu:</span>
                  {member.isInvitePending ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      ⏳ Oczekuje na dołączenie
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      ✅ Konto aktywne
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenInviteModal(member)}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                    title="Wygeneruj kod QR i link na telefon dla tej osoby"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Zaproś na telefon</span>
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleStartEditMember(member)}
                      className="py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center justify-center gap-1 border border-indigo-200"
                      title="Zmień uprawnienia i przypisane subkonta"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Uprawnienia</span>
                    </button>
                  )}

                  {isAdmin && allMembers.length > 1 && member.role !== 'ADMIN' && (
                    <button
                      type="button"
                      onClick={() => setMemberToDelete(member)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition border border-rose-200"
                      title="Usuń profil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: ZAPROŚ KODEM QR / LINKIEM */}
      {showInviteModal && inviteMemberTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-6 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Zaproś do aplikacji: {inviteMemberTarget.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Zeskanuj aparat telefonu lub wyślij link przez WhatsApp / SMS
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {/* QR Code Presentation */}
            <div className="p-5 bg-slate-50 rounded-3xl border border-slate-200 inline-block mx-auto shadow-inner">
              <div
                dangerouslySetInnerHTML={{
                  __html: generateInviteQrSvg(getInviteUrl(inviteMemberTarget), 200),
                }}
              />
              <span className="text-[11px] font-semibold text-slate-500 mt-2 block">
                Skieruj aparat telefonu, aby otworzyć aplikację
              </span>
            </div>

            <div className="space-y-2 text-left">
              <label className="block text-xs font-bold text-slate-700">
                Bezpośredni link dołączenia:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getInviteUrl(inviteMemberTarget)}
                  className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl select-all truncate"
                />
                <button
                  type="button"
                  onClick={() => handleCopyInviteLink(getInviteUrl(inviteMemberTarget))}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 flex-shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedLink ? 'Skopiowano!' : 'Kopiuj'}</span>
                </button>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs flex justify-between items-center">
                <span>Kod rodziny: <strong className="font-mono text-indigo-700">{householdId}</strong></span>
                <span>Login: <strong className="text-slate-900">{inviteMemberTarget.name}</strong></span>
              </div>
            </div>

            {/* Direct Send Buttons: WhatsApp + Native Phone Share */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                  `Cześć ${inviteMemberTarget.name}! Zapraszam Cię do aplikacji Domowy Budżet naszego gospodarstwa domowego (${householdName}). Otwórz ten link na telefonie, aby aktywować profil: ` + getInviteUrl(inviteMemberTarget)
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Wyślij WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => handleNativeShare(getInviteUrl(inviteMemberTarget), inviteMemberTarget.name)}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Udostępnij (SMS)</span>
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 text-left">
              <strong>Zabezpieczenie profilu:</strong> {inviteMemberTarget.name} utworzy własne hasło nadrzędne i kod PIN na telefonie, a w aplikacji otrzyma dokładnie te uprawnienia i dostęp do subkont, które skonfigurujesz.
            </div>

            <button
              type="button"
              onClick={() => setShowInviteModal(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
            >
              Gotowe / Zamknij
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: DODAJ CZŁONKA RODZINY (Z WSZYSTKIMI 8 CHECKBOXAMI) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <span>Dodaj nowego członka rodziny</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Imię / Kto to jest *</label>
                  <input
                    type="text"
                    required
                    placeholder="np. Mama (Anna), Córka Zosia..."
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Awatar</label>
                  <select
                    value={newEmoji}
                    onChange={(e) => handleEmojiChangeForNew(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="👩">👩 Mama</option>
                    <option value="👨">👨 Tata</option>
                    <option value="👧">👧 Córka</option>
                    <option value="👦">👦 Syn</option>
                    <option value="👵">👵 Babcia</option>
                    <option value="👴">👴 Dziadek</option>
                    <option value="👤">👤 Użytkownik</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rola w rodzinie</label>
                  <select
                    value={newRole}
                    onChange={(e) => handleRoleChangeForNew(e.target.value as FamilyRole)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold text-indigo-700"
                  >
                    <option value="MANAGER">💍 Współmałżonek (Współadministrator)</option>
                    <option value="MEMBER">👤 Członek rodziny (Dorosły)</option>
                    <option value="CHILD">👦 Dziecko (Ograniczone)</option>
                    <option value="ADMIN">👑 Główny Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PIN profilu (4 cyfry)</label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="np. 1234 (opcjonalnie)"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Accounts assignment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Przypisane subkonta dla tej osoby:
                </label>
                <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-32 overflow-y-auto">
                  {accounts.map((acc) => (
                    <label key={acc.id} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newAssignedAccounts.includes(acc.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewAssignedAccounts([...newAssignedAccounts, acc.id]);
                          } else {
                            setNewAssignedAccounts(newAssignedAccounts.filter((id) => id !== acc.id));
                          }
                        }}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span>{acc.name} ({acc.balance.toFixed(2)} zł)</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* INDIVIDUAL EXPLICIT PERMISSION CHECKBOXES */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-900 block">
                  Szczegółowe uprawnienia (zaznacz co dokładnie może ta osoba):
                </span>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={pCanViewAllAccounts}
                    onChange={(e) => setPCanViewAllAccounts(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Może widzieć WSZYSTKIE subkonta (jeśli odznaczone: tylko przypisane powyżej)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={pCanViewFamilyTotalBalance}
                    onChange={(e) => setPCanViewFamilyTotalBalance(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Może widzieć łączne saldo całego gospodarstwa domowego</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={pCanManageAccounts}
                    onChange={(e) => setPCanManageAccounts(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Może zakładać, edytować i zamykać subkonta</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={pCanManageBudget}
                    onChange={(e) => setPCanManageBudget(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Może planować budżet i ustalać limity wydatków</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={pCanManageCategories}
                    onChange={(e) => setPCanManageCategories(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Może tworzyć nowe kategorie wydatków i przychodów</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={pCanScanReceipts}
                    onChange={(e) => setPCanScanReceipts(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Może skanować i rejestrować paragony fiskalne</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={pCanManagePantry}
                    onChange={(e) => setPCanManagePantry(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Może zarządzać magazynem i zgłaszać zużyte opakowania</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={pCanManageFamily}
                    onChange={(e) => setPCanManageFamily(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Może zarządzać członkami rodziny (uprawnienie Administratora)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition active:scale-98"
                >
                  Utwórz członka rodziny
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDYTUJ UPRAWNIENIA CZŁONKA (KOMPLETNE 8 CHECKBOXÓW!) */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                <span>Edycja uprawnień: {editingMember.name}</span>
              </h3>
              <button
                onClick={() => setEditingMember(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEditedMember} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Imię / Nazwa</label>
                  <input
                    type="text"
                    required
                    value={editingMember.name}
                    onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Awatar</label>
                  <select
                    value={editingMember.avatarEmoji || '👤'}
                    onChange={(e) => setEditingMember({ ...editingMember, avatarEmoji: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="👩">👩 Mama</option>
                    <option value="👨">👨 Tata</option>
                    <option value="👧">👧 Córka</option>
                    <option value="👦">👦 Syn</option>
                    <option value="👵">👵 Babcia</option>
                    <option value="👴">👴 Dziadek</option>
                    <option value="👤">👤 Użytkownik</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rola w rodzinie</label>
                  <select
                    value={editingMember.role}
                    onChange={(e) => {
                      const newR = e.target.value as FamilyRole;
                      const isCoAdmin = newR === 'ADMIN' || newR === 'MANAGER';
                      setEditingMember({
                        ...editingMember,
                        role: newR,
                        permissions: isCoAdmin
                          ? {
                              canViewAllAccounts: true,
                              canViewFamilyTotalBalance: true,
                              canManageAccounts: true,
                              canManageBudget: true,
                              canManageCategories: true,
                              canManageFamily: true,
                              canScanReceipts: true,
                              canManagePantry: true,
                            }
                          : (editingMember.permissions || {
                              canViewAllAccounts: false,
                              canViewFamilyTotalBalance: true,
                              canManageAccounts: false,
                              canManageBudget: false,
                              canManageCategories: false,
                              canManageFamily: false,
                              canScanReceipts: true,
                              canManagePantry: true,
                            }),
                      });
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold text-indigo-700"
                  >
                    <option value="MANAGER">💍 Współmałżonek (Współadministrator)</option>
                    <option value="MEMBER">👤 Członek rodziny (Dorosły)</option>
                    <option value="CHILD">👦 Dziecko (Ograniczone)</option>
                    <option value="ADMIN">👑 Główny Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PIN zabezpieczający (4 cyfry)</label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="np. 1234"
                    value={editingMember.pin || ''}
                    onChange={(e) => setEditingMember({ ...editingMember, pin: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Subaccounts */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Przypisane subkonta (widoczne dla tego użytkownika):
                </label>
                <div className="space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-32 overflow-y-auto">
                  {(accounts || []).map((acc) => {
                    const isChecked = (editingMember.assignedAccountIds || []).includes(acc.id);
                    return (
                      <label key={acc.id} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const cur = editingMember.assignedAccountIds || [];
                            const newIds = e.target.checked
                              ? [...cur, acc.id]
                              : cur.filter((id) => id !== acc.id);
                            setEditingMember({ ...editingMember, assignedAccountIds: newIds });
                          }}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span>{acc.name} ({acc.balance.toFixed(2)} zł)</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ALL 8 EXPLICIT EDITABLE PERMISSIONS WITH SAFE FALLBACKS */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-900 block">
                  Uprawnienia szczegółowe:
                </span>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={!!editingMember.permissions?.canViewAllAccounts}
                    onChange={(e) =>
                      setEditingMember({
                        ...editingMember,
                        permissions: { ...(editingMember.permissions || {}), canViewAllAccounts: e.target.checked } as any,
                      })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Może widzieć WSZYSTKIE subkonta (jeśli odznaczone: tylko przypisane powyżej)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={editingMember.permissions?.canViewFamilyTotalBalance !== false}
                    onChange={(e) =>
                      setEditingMember({
                        ...editingMember,
                        permissions: { ...(editingMember.permissions || {}), canViewFamilyTotalBalance: e.target.checked } as any,
                      })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Może widzieć łączne saldo całego gospodarstwa domowego</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={!!editingMember.permissions?.canManageAccounts}
                    onChange={(e) =>
                      setEditingMember({
                        ...editingMember,
                        permissions: { ...(editingMember.permissions || {}), canManageAccounts: e.target.checked } as any,
                      })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Może zakładać, edytować i zamykać subkonta</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={editingMember.permissions?.canManageBudget !== false}
                    onChange={(e) =>
                      setEditingMember({
                        ...editingMember,
                        permissions: { ...(editingMember.permissions || {}), canManageBudget: e.target.checked } as any,
                      })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Może planować budżet i ustalać limity wydatków</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={editingMember.permissions?.canManageCategories !== false}
                    onChange={(e) =>
                      setEditingMember({
                        ...editingMember,
                        permissions: { ...(editingMember.permissions || {}), canManageCategories: e.target.checked } as any,
                      })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Może zarządzać kategoriami wydatków i przychodów</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={editingMember.permissions?.canScanReceipts !== false}
                    onChange={(e) =>
                      setEditingMember({
                        ...editingMember,
                        permissions: { ...(editingMember.permissions || {}), canScanReceipts: e.target.checked } as any,
                      })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Może skanować i rejestrować paragony</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={editingMember.permissions?.canManagePantry !== false}
                    onChange={(e) =>
                      setEditingMember({
                        ...editingMember,
                        permissions: { ...(editingMember.permissions || {}), canManagePantry: e.target.checked } as any,
                      })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Może zarządzać magazynem i zgłaszać zużyte opakowania</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={!!editingMember.permissions?.canManageFamily}
                    onChange={(e) =>
                      setEditingMember({
                        ...editingMember,
                        permissions: { ...(editingMember.permissions || {}), canManageFamily: e.target.checked } as any,
                      })
                    }
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Może zarządzać członkami rodziny (uprawnienie Administratora)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-md transition active:scale-98"
                >
                  Zapisz uprawnienia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: BEZPIECZNE POTWIERDZENIE USUNIĘCIA (Zastępuje zablokowany w iframe window.confirm) */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-2xl mx-auto shadow-inner">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">
                Usunąć profil z rodziny?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Czy na pewno chcesz usunąć profil <strong>{memberToDelete.name}</strong> ({memberToDelete.role === 'MANAGER' ? 'Współmałżonek' : memberToDelete.role === 'CHILD' ? 'Dziecko' : 'Członek rodziny'})? Osoba ta straci dostęp do subkont i budżetu domowego.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteMember(memberToDelete.id);
                  setMemberToDelete(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-200 transition"
              >
                Tak, usuń osobę
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
