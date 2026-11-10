import React, { useState } from 'react';
import { Account, FamilyMember } from '../types';
import { 
  Landmark, 
  PiggyBank, 
  Banknote, 
  CreditCard, 
  ShieldCheck, 
  TrendingUp, 
  Plus, 
  ArrowRightLeft, 
  Sparkles, 
  Lock, 
  Target,
  Edit2,
  Check,
  X,
  Trash2,
  Github,
  Copy,
  CheckCircle2,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

interface AccountsOverviewProps {
  accounts: Account[];
  currentMember: FamilyMember;
  allMembers: FamilyMember[];
  onAddAccount: (account: Omit<Account, 'id'>) => void;
  onUpdateAccount: (account: Account) => void;
  onDeleteAccount: (accountId: string) => void;
  onTransfer: (fromAccountId: string, toAccountId: string, amount: number, note: string) => void;
  onOpenReceiptScanner: () => void;
  onOpenEmptyPackageScanner: () => void;
}

export const AccountsOverview: React.FC<AccountsOverviewProps> = ({
  accounts,
  currentMember,
  allMembers,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onTransfer,
  onOpenReceiptScanner,
  onOpenEmptyPackageScanner,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // New Account Form State
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<Account['type']>('savings');
  const [newAccBalance, setNewAccBalance] = useState<string>('0');
  const [newAccGoal, setNewAccGoal] = useState<string>('');
  const [newAccColor, setNewAccColor] = useState('#3b82f6');
  const [newAccOwners, setNewAccOwners] = useState<string[]>([currentMember.id]);
  const [newAccDesc, setNewAccDesc] = useState('');

  // Edit Account Form State
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editAccName, setEditAccName] = useState('');
  const [editAccType, setEditAccType] = useState<Account['type']>('checking');
  const [editAccBalance, setEditAccBalance] = useState<string>('0');
  const [editAccGoal, setEditAccGoal] = useState<string>('');
  const [editAccColor, setEditAccColor] = useState('#3b82f6');
  const [editAccOwners, setEditAccOwners] = useState<string[]>([]);
  const [editAccDesc, setEditAccDesc] = useState('');

  // Delete Account Confirmation Modal State
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  // GitHub & Netlify Integration Modal State
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Transfer Form State
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('Zasilenie subkonta');

  // Filter accounts based on user permissions
  const visibleAccounts = currentMember.permissions.canViewAllAccounts
    ? accounts
    : accounts.filter(
        (acc) =>
          (currentMember.assignedAccountIds || []).includes(acc.id) ||
          (acc.ownerMemberIds || []).includes(currentMember.id)
      );

  // Compute Total Balance
  const totalBalance = visibleAccounts.reduce((sum, acc) => sum + acc.balance, 0);
  const allAccountsTotal = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  // Savings / Goals breakdown
  const savingsAccounts = visibleAccounts.filter((a) => a.type === 'savings' || a.type === 'piggybank');
  const totalSavings = savingsAccounts.reduce((sum, acc) => sum + acc.balance, 0);

  const getAccountIcon = (type: Account['type']) => {
    switch (type) {
      case 'checking':
        return <Landmark className="w-5 h-5" />;
      case 'savings':
        return <ShieldCheck className="w-5 h-5" />;
      case 'cash':
        return <Banknote className="w-5 h-5" />;
      case 'piggybank':
        return <PiggyBank className="w-5 h-5" />;
      case 'investment':
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const getAccountTypeLabel = (type: Account['type']) => {
    switch (type) {
      case 'checking':
        return 'Konto bieżące / codzienne';
      case 'savings':
        return 'Oszczędnościowe';
      case 'cash':
        return 'Gotówka / portfel';
      case 'piggybank':
        return 'Skarbonka / cel';
      case 'investment':
        return 'Inwestycje / lokaty';
      default:
        return 'Konto bankowe';
    }
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) return;

    onAddAccount({
      name: newAccName.trim(),
      type: newAccType,
      balance: parseFloat(newAccBalance) || 0,
      currency: 'PLN',
      color: newAccColor,
      iconName: newAccType === 'savings' ? 'ShieldCheck' : newAccType === 'piggybank' ? 'PiggyBank' : 'Landmark',
      ownerMemberIds: newAccOwners.length > 0 ? newAccOwners : [currentMember.id],
      goalAmount: newAccGoal ? parseFloat(newAccGoal) : undefined,
      description: newAccDesc.trim(),
    });

    // Reset & close
    setNewAccName('');
    setNewAccBalance('0');
    setNewAccGoal('');
    setNewAccDesc('');
    setShowAddModal(false);
  };

  const handleStartEdit = (acc: Account) => {
    setEditingAccount(acc);
    setEditAccName(acc.name);
    setEditAccType(acc.type);
    setEditAccBalance(acc.balance.toString());
    setEditAccGoal(acc.goalAmount ? acc.goalAmount.toString() : '');
    setEditAccColor(acc.color || '#3b82f6');
    setEditAccOwners(acc.ownerMemberIds && acc.ownerMemberIds.length > 0 ? acc.ownerMemberIds : [currentMember.id]);
    setEditAccDesc(acc.description || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editAccName.trim()) return;

    onUpdateAccount({
      ...editingAccount,
      name: editAccName.trim(),
      type: editAccType,
      balance: parseFloat(editAccBalance) || 0,
      goalAmount: editAccGoal ? parseFloat(editAccGoal) : undefined,
      color: editAccColor,
      ownerMemberIds: editAccOwners.length > 0 ? editAccOwners : [currentMember.id],
      description: editAccDesc.trim(),
    });

    setEditingAccount(null);
  };

  const handleDeleteClick = (acc: Account) => {
    if (accounts.length <= 1) {
      alert('Nie można usunąć jedynego konta! W systemie musi pozostać co najmniej jedno aktywne konto finansowe.');
      return;
    }
    setAccountToDelete(acc);
  };

  const handleConfirmDelete = () => {
    if (!accountToDelete) return;
    onDeleteAccount(accountToDelete.id);
    setAccountToDelete(null);
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(transferAmount);
    if (!transferFrom || !transferTo || isNaN(amount) || amount <= 0) return;
    if (transferFrom === transferTo) return;

    onTransfer(transferFrom, transferTo, amount, transferNote);
    setTransferAmount('');
    setShowTransferModal(false);
  };

  return (
    <div className="space-y-6">
      {/* GŁÓWNE SALDO RODZINY / GŁÓWNY BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-10 w-48 h-48 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {currentMember.permissions.canViewFamilyTotalBalance ? 'Główne Saldo Całej Rodziny' : 'Dostępne Saldo Użytkownika'}
              </span>
              <span className="text-xs text-slate-400">
                {visibleAccounts.length} {visibleAccounts.length === 1 ? 'konto' : visibleAccounts.length < 5 ? 'konta' : 'kont'}
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                {totalBalance.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-indigo-400 font-medium">PLN</span>
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              {currentMember.permissions.canViewFamilyTotalBalance ? (
                <>Zintegrowane podsumowanie wszystkich subkont domowych, oszczędności, gotówki i skarbonek.</>
              ) : (
                <>Widzisz saldo tylko tych kont, do których administrator przyznał Ci uprawnienia.</>
              )}
            </p>
          </div>

          {/* Quick Action Buttons on Banner */}
          <div className="flex flex-wrap items-center gap-2.5">
            {currentMember.permissions.canManageAccounts && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>Utwórz nowe konto</span>
              </button>
            )}

            {visibleAccounts.length >= 2 && (
              <button
                onClick={() => {
                  setTransferFrom(visibleAccounts[0].id);
                  setTransferTo(visibleAccounts[1].id);
                  setShowTransferModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs sm:text-sm rounded-xl transition-all"
              >
                <ArrowRightLeft className="w-4 h-4 text-sky-400" />
                <span>Przelew między kontami</span>
              </button>
            )}
          </div>
        </div>

        {/* Small stats bar under banner */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-300">
          <div>
            <span className="text-slate-400 block">Środki bieżące:</span>
            <strong className="text-slate-100 font-semibold text-sm">
              {visibleAccounts
                .filter((a) => a.type === 'checking' || a.type === 'cash')
                .reduce((s, a) => s + a.balance, 0)
                .toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block">Oszczędności &amp; Cele:</span>
            <strong className="text-emerald-400 font-semibold text-sm">
              {totalSavings.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} PLN
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block">Aktywne subkonta:</span>
            <strong className="text-slate-100 font-semibold text-sm">
              {visibleAccounts.length} z {accounts.length} w systemie
            </strong>
          </div>
          <div>
            <span className="text-slate-400 block">Rola w rodzinie:</span>
            <strong className="text-indigo-400 font-semibold text-sm">
              {currentMember.role} ({currentMember.name.split(' ')[0]})
            </strong>
          </div>
        </div>
      </div>

      {/* SECTION HEADER: DYNAMIC ACCOUNTS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Twoje Konta i Subkonta Finansowe</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-normal">
              Dynamiczna liczba kont ({visibleAccounts.length})
            </span>
          </h3>
          <p className="text-xs text-slate-500">
            Możesz tworzyć, edytować i usuwać dowolne konta (na wakacje, remont, zakupy, oszczędności czy kieszonkowe dla dzieci).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowGithubModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition shadow-xs"
            title="Instrukcja i komendy do połączenia aplikacji z GitHub i Netlify"
          >
            <Github className="w-3.5 h-3.5 text-slate-200" />
            <span>Połącz z GitHub</span>
          </button>

          {currentMember.permissions.canManageAccounts && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Dodaj konto</span>
            </button>
          )}
        </div>
      </div>

      {/* ACCOUNTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {visibleAccounts.map((account) => {
          const owners = allMembers.filter((m) => (account.ownerMemberIds || []).includes(m.id));
          const hasGoal = !!account.goalAmount && account.goalAmount > 0;
          const goalPercent = hasGoal ? Math.min(100, Math.round((account.balance / account.goalAmount!) * 100)) : 0;

          return (
            <div
              key={account.id}
              className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between relative group"
            >
              {/* Account top header */}
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs"
                      style={{ backgroundColor: account.color }}
                    >
                      {getAccountIcon(account.type)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{account.name}</h4>
                      <span className="text-[11px] text-slate-500 font-medium">{getAccountTypeLabel(account.type)}</span>
                    </div>
                  </div>

                  {currentMember.permissions.canManageAccounts && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(account);
                        }}
                        title="Edytuj dane i saldo konta"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(account);
                        }}
                        title="Usuń konto"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {account.description && (
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">{account.description}</p>
                )}

                {/* Balance display */}
                <div className="my-3">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                    Dostępne saldo
                  </span>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">
                    {account.balance.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    <span className="text-xs font-semibold text-slate-500">{account.currency}</span>
                  </div>
                </div>

                {/* Goal progress bar if set */}
                {hasGoal && (
                  <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-slate-600 font-medium flex items-center gap-1">
                        <Target className="w-3 h-3 text-indigo-500" /> Cel oszczędnościowy:
                      </span>
                      <span className="font-bold text-slate-800">
                        {goalPercent}% ({account.goalAmount?.toLocaleString('pl-PL')} zł)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${goalPercent}%`,
                          backgroundColor: account.color,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Account footer: Assigned family members */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px]">Właściciele:</span>
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {owners.map((owner) => (
                      <span
                        key={owner.id}
                        title={owner.name}
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] ring-2 ring-white"
                      >
                        {owner.avatarEmoji || owner.name[0]}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Quick transfer button to/from this account */}
                <button
                  onClick={() => {
                    setTransferFrom(account.id);
                    const other = visibleAccounts.find((a) => a.id !== account.id);
                    if (other) setTransferTo(other.id);
                    setShowTransferModal(true);
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  <span>Przelew</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: UTWÓRZ NOWE KONTO (DYNAMICZNE) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Utwórz nowe konto finansowe</h3>
                <p className="text-xs text-slate-500">
                  Możesz utworzyć dowolną liczbę subkont (np. Wakacje 2026, Remont, Nowe auto, Skarbonka)
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nazwa konta *</label>
                <input
                  type="text"
                  required
                  placeholder="np. Fundusz Wakacyjny 2026, Skarbonka Zosi, Gotówka Euro"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Typ konta</label>
                  <select
                    value={newAccType}
                    onChange={(e) => setNewAccType(e.target.value as Account['type'])}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="checking">Konto bieżące / codzienne</option>
                    <option value="savings">Oszczędnościowe / lokata</option>
                    <option value="cash">Gotówka / portfel</option>
                    <option value="piggybank">Skarbonka / cel</option>
                    <option value="investment">Inwestycyjne</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Saldo początkowe (PLN)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAccBalance}
                    onChange={(e) => setNewAccBalance(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cel oszczędnościowy (opcjonalnie)
                  </label>
                  <input
                    type="number"
                    step="1"
                    placeholder="np. 5000 zł"
                    value={newAccGoal}
                    onChange={(e) => setNewAccGoal(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kolor wizualny</label>
                  <div className="flex items-center gap-1.5 mt-1">
                    {['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'].map((col) => (
                      <button
                        type="button"
                        key={col}
                        onClick={() => setNewAccColor(col)}
                        style={{ backgroundColor: col }}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition ${
                          newAccColor === col ? 'ring-2 ring-offset-2 ring-slate-800' : 'opacity-80'
                        }`}
                      >
                        {newAccColor === col && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kto w rodzinie zarządza tym kontem?
                </label>
                <div className="flex flex-wrap gap-2">
                  {allMembers.map((member) => {
                    const isSelected = (newAccOwners || []).includes(member.id);
                    return (
                      <button
                        type="button"
                        key={member.id}
                        onClick={() => {
                          if (isSelected) {
                            if (newAccOwners.length > 1) {
                              setNewAccOwners(newAccOwners.filter((id) => id !== member.id));
                            }
                          } else {
                            setNewAccOwners([...newAccOwners, member.id]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>{member.avatarEmoji || '👤'}</span>
                        <span>{member.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-indigo-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Opis lub przeznaczenie</label>
                <input
                  type="text"
                  placeholder="np. Odłożone pieniądze na wakacyjny wyjazd do Włoch"
                  value={newAccDesc}
                  onChange={(e) => setNewAccDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
                >
                  Utwórz konto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRZELEW MIĘDZY KONTAMI */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                <span>Przelew między kontami</span>
              </h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Z konta (źródło)</label>
                <select
                  value={transferFrom}
                  onChange={(e) => setTransferFrom(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {visibleAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} (Dostępne: {a.balance.toFixed(2)} PLN)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Na konto (cel)</label>
                <select
                  value={transferTo}
                  onChange={(e) => setTransferTo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {visibleAccounts.map((a) => (
                    <option key={a.id} value={a.id} disabled={a.id === transferFrom}>
                      {a.name} (Saldo: {a.balance.toFixed(2)} PLN)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kwota przelewu (PLN) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tytuł przelewu</label>
                <input
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
                >
                  Wykonaj transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDYCJA ISTNIEJĄCEGO KONTA */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-indigo-600" />
                  <span>Edytuj konto: {editingAccount.name}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Możesz zaktualizować nazwę, saldo, cel oszczędnościowy, kolor i uprawnionych właścicieli.
                </p>
              </div>
              <button
                onClick={() => setEditingAccount(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nazwa konta *</label>
                <input
                  type="text"
                  required
                  value={editAccName}
                  onChange={(e) => setEditAccName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Typ konta</label>
                  <select
                    value={editAccType}
                    onChange={(e) => setEditAccType(e.target.value as Account['type'])}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="checking">Konto bieżące / codzienne</option>
                    <option value="savings">Oszczędnościowe / lokata</option>
                    <option value="cash">Gotówka / portfel</option>
                    <option value="piggybank">Skarbonka / cel</option>
                    <option value="investment">Inwestycyjne</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Aktualne saldo (PLN) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editAccBalance}
                    onChange={(e) => setEditAccBalance(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cel oszczędnościowy (opcjonalnie)
                  </label>
                  <input
                    type="number"
                    step="1"
                    placeholder="np. 10000 zł"
                    value={editAccGoal}
                    onChange={(e) => setEditAccGoal(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kolor wizualny</label>
                  <div className="flex items-center gap-1.5 mt-1">
                    {['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'].map((col) => (
                      <button
                        type="button"
                        key={col}
                        onClick={() => setEditAccColor(col)}
                        style={{ backgroundColor: col }}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition ${
                          editAccColor === col ? 'ring-2 ring-offset-2 ring-slate-800' : 'opacity-80'
                        }`}
                      >
                        {editAccColor === col && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kto w rodzinie zarządza tym kontem?
                </label>
                <div className="flex flex-wrap gap-2">
                  {allMembers.map((member) => {
                    const isSelected = (editAccOwners || []).includes(member.id);
                    return (
                      <button
                        type="button"
                        key={member.id}
                        onClick={() => {
                          if (isSelected) {
                            if (editAccOwners.length > 1) {
                              setEditAccOwners(editAccOwners.filter((id) => id !== member.id));
                            }
                          } else {
                            setEditAccOwners([...editAccOwners, member.id]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>{member.avatarEmoji || '👤'}</span>
                        <span>{member.name}</span>
                        {isSelected && <Check className="w-3 h-3 text-indigo-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Opis lub przeznaczenie</label>
                <input
                  type="text"
                  placeholder="np. Wydatki bieżące na dom i rachunki"
                  value={editAccDesc}
                  onChange={(e) => setEditAccDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const acc = editingAccount;
                    setEditingAccount(null);
                    handleDeleteClick(acc);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Usuń to konto</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAccount(null)}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
                  >
                    Zapisz zmiany
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: POTWIERDZENIE USUNIĘCIA KONTA */}
      {accountToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Usunąć konto finansowe?</h3>
                <p className="text-xs text-slate-500">Operacja usunie to konto z Twojego gospodarstwa domowego.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Nazwa:</span>
                <strong className="text-slate-900">{accountToDelete.name}</strong>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Saldo konta:</span>
                <strong className="text-slate-900">
                  {accountToDelete.balance.toFixed(2)} {accountToDelete.currency}
                </strong>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Typ:</span>
                <span className="text-slate-700">{getAccountTypeLabel(accountToDelete.type)}</span>
              </div>
            </div>

            <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              Wszystkie wcześniejsze paragony i historia transakcji pozostaną bezpiecznie w archiwum, ale konto nie będzie już widoczne na liście.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Tak, usuń konto</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: POŁĄCZENIE Z GITHUB & NETLIFY DLA AUTOMATYCZNYCH AKTUALIZACJI */}
      {showGithubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <Github className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Połącz aplikację z GitHub & Netlify</h3>
                  <p className="text-xs text-slate-500">
                    Automatyczne aktualizacje: każda zmiana w kodzie sama odświeża Twoją stronę www
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGithubModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600">
              {/* Krok 1 */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">Krok 1: Utwórz repozytorium na GitHub</span>
                  <a
                    href="https://github.com/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline"
                  >
                    Otwórz github.com/new <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p>
                  Zaloguj się na swoje konto GitHub i utwórz nowe repozytorium (np. o nazwie <code>domowy-budzet</code>).
                  Możesz wybrać repozytorium prywatne (Private) lub publiczne. Nie twórz pliku README na GitHubie (projekt już go ma).
                </p>
              </div>

              {/* Krok 2 */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 text-sm block">
                  Krok 2: Wypchnij kod ze swojego komputera do GitHuba
                </span>
                <p>
                  Otwórz terminal (lub PowerShell / Wiersz Poleceń) w wypakowanym folderze z aplikacją i wklej kolejno komendy:
                </p>

                <div className="relative bg-slate-950 text-slate-200 p-3 rounded-lg font-mono text-[11px] leading-relaxed overflow-x-auto">
                  <pre>{`git init
git add .
git commit -m "Domowy Budzet - Pelna aplikacja z chmura"
git branch -M main
git remote add origin https://github.com/TWOJ_LOGIN_GITHUB/domowy-budzet.git
git push -u origin main`}</pre>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyCode(
                        `git init\ngit add .\ngit commit -m "Domowy Budzet - Pelna aplikacja z chmura"\ngit branch -M main\ngit remote add origin https://github.com/TWOJ_LOGIN_GITHUB/domowy-budzet.git\ngit push -u origin main`,
                        'git-cmds'
                      )
                    }
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] flex items-center gap-1"
                  >
                    {copiedCmd === 'git-cmds' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Skopiowano!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Kopiuj komendy
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  * Zastąp <code>TWOJ_LOGIN_GITHUB</code> swoim rzeczywistym loginem na GitHubie.
                </p>
              </div>

              {/* Krok 3 */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">Krok 3: Podłącz repozytorium do Netlify</span>
                  <a
                    href="https://app.netlify.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline"
                  >
                    Otwórz app.netlify.com <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>W panelu Netlify kliknij <strong>„Add new site”</strong> &rarr; <strong>„Import an existing project”</strong>.</li>
                  <li>Wybierz <strong>GitHub</strong> i zaznacz utworzone repozytorium <code>domowy-budzet</code>.</li>
                  <li>
                    Netlify <strong>automatycznie odczyta plik netlify.toml</strong> dołączony do aplikacji:
                    <ul className="list-disc list-inside ml-4 mt-1 text-slate-500">
                      <li>Build command: <code>vite build</code></li>
                      <li>Publish directory: <code>dist</code></li>
                    </ul>
                  </li>
                  <li>Kliknij <strong>„Deploy site”</strong>.</li>
                </ol>
              </div>

              {/* Zaleta */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                <p className="font-semibold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Jak działa automatyczna aktualizacja:
                </p>
                <p className="text-[11px] text-emerald-800 mt-1">
                  Od momentu połączenia z GitHubem, za każdym razem gdy wgrasz nowy kod (komenda <code>git push</code>), Netlify sam pobierze zmiany, skompiluje stronę i zaktualizuje ją w ciągu 30 sekund pod Twoim adresem www! Wszystkie dane i transakcje rodziny w chmurze Firestore pozostają nienaruszone.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowGithubModal(false)}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
              >
                Rozumiem, zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
