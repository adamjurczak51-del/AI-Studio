import React, { useState } from 'react';
import { Transaction, Account, Category, FamilyMember } from '../types';
import { 
  History, 
  Search, 
  ArrowDownRight, 
  ArrowUpRight, 
  ArrowRightLeft, 
  Receipt, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  Filter,
  Calendar,
  Sparkles
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  allMembers: FamilyMember[];
  currentMember: FamilyMember;
  onDeleteTransaction: (id: string) => void;
  onOpenReceiptScanner: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  accounts,
  categories,
  allMembers,
  currentMember,
  onDeleteTransaction,
  onOpenReceiptScanner,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterAccount, setFilterAccount] = useState<string>('ALL');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // Filter based on user permissions
  const accessibleAccountIds = currentMember.permissions.canViewAllAccounts
    ? accounts.map((a) => a.id)
    : (currentMember.assignedAccountIds || []);

  const filteredTransactions = transactions.filter((tx) => {
    // Permission check: only show transactions on accessible accounts
    if (!accessibleAccountIds.includes(tx.accountId) && !accessibleAccountIds.includes(tx.toAccountId || '')) {
      return false;
    }

    const matchesSearch =
      tx.title.toLowerCase().includes(search.toLowerCase()) ||
      tx.categoryName.toLowerCase().includes(search.toLowerCase()) ||
      tx.memberName.toLowerCase().includes(search.toLowerCase()) ||
      tx.shopName?.toLowerCase().includes(search.toLowerCase());

    const matchesType = filterType === 'ALL' || tx.type === filterType;
    const matchesAccount = filterAccount === 'ALL' || tx.accountId === filterAccount || tx.toAccountId === filterAccount;

    return matchesSearch && matchesType && matchesAccount;
  });

  return (
    <div className="space-y-4">
      {/* Search & Filter Controls */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Szukaj po tytule, sklepie, osobie lub kategorii..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="ALL">Wszystkie typy</option>
            <option value="EXPENSE">Tylko Wydatki</option>
            <option value="INCOME">Tylko Przychody</option>
            <option value="TRANSFER">Przelewy między kontami</option>
          </select>

          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl bg-slate-50 text-slate-700 focus:outline-none"
          >
            <option value="ALL">Wszystkie konta</option>
            {accounts
              .filter((a) => accessibleAccountIds.includes(a.id))
              .map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Transactions Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filteredTransactions.map((tx) => {
          const isExpense = tx.type === 'EXPENSE';
          const isIncome = tx.type === 'INCOME';
          const isTransfer = tx.type === 'TRANSFER';
          const isExpanded = expandedTxId === tx.id;
          const account = accounts.find((a) => a.id === tx.accountId);
          const toAccount = tx.toAccountId ? accounts.find((a) => a.id === tx.toAccountId) : null;

          return (
            <div key={tx.id} className="p-4 hover:bg-slate-50/70 transition">
              <div className="flex items-center justify-between gap-4">
                {/* Left: Icon & Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isExpense
                        ? 'bg-rose-50 text-rose-600'
                        : isIncome
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-sky-50 text-sky-600'
                    }`}
                  >
                    {isExpense ? (
                      <ArrowDownRight className="w-5 h-5" />
                    ) : isIncome ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowRightLeft className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-sm truncate">{tx.title}</h4>
                      {tx.items && tx.items.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                          <Receipt className="w-3 h-3" />
                          Paragon AI ({tx.items.length} pozycji)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                      <span>{tx.date}</span>
                      <span>•</span>
                      <span className="font-medium text-slate-700">{account?.name || 'Konto'}</span>
                      {toAccount && <span>&rarr; {toAccount.name}</span>}
                      <span>•</span>
                      <span className="text-slate-600">{tx.memberName}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Expand button */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <span
                      className={`text-base font-extrabold tracking-tight block ${
                        isExpense ? 'text-slate-900' : isIncome ? 'text-emerald-600' : 'text-sky-600'
                      }`}
                    >
                      {isExpense ? '-' : isIncome ? '+' : ''}
                      {tx.amount.toFixed(2)} PLN
                    </span>
                    <span className="text-[11px] text-slate-500 block">{tx.categoryName}</span>
                  </div>

                  {tx.items && tx.items.length > 0 && (
                    <button
                      onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                      className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition"
                      title="Pokaż pozycje z paragonu"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  )}

                  {currentMember.permissions.canManageAccounts && (
                    <button
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 rounded transition"
                      title="Usuń transakcję"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable Line Items from Scanned Receipt */}
              {isExpanded && tx.items && (
                <div className="mt-3 pt-3 border-t border-slate-100 pl-13 pr-4 animate-in fade-in">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Pozycje z paragonu fiskalnego:
                  </h5>
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    {tx.items.map((it: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs text-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-mono">{i + 1}.</span>
                          <span className="font-semibold text-slate-900">{it.name}</span>
                          <span className="text-slate-500">
                            ({it.quantity} {it.unit})
                          </span>
                          {it.isPantryItem && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-1.5 py-0.2 rounded">
                              W spiżarni
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-slate-900">{it.totalPrice.toFixed(2)} zł</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">Brak zarejestrowanych operacji</p>
            <p className="text-xs text-slate-500">Zeskanuj paragon lub dodaj transakcję ręcznie.</p>
          </div>
        )}
      </div>
    </div>
  );
};
