import React, { useState } from 'react';
import { Category, Transaction, FamilyMember } from '../types';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  Edit2, 
  Check, 
  AlertCircle,
  Tag,
  DollarSign,
  Layers,
  Sparkles,
  ShoppingBag,
  Home,
  Fuel,
  HeartPulse,
  Shirt,
  Briefcase,
  Baby,
  RefreshCcw
} from 'lucide-react';

interface BudgetAndCategoriesProps {
  categories: Category[];
  transactions: Transaction[];
  currentMember: FamilyMember;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onUpdateCategory: (category: Category) => void;
  onDeleteCategory: (id: string) => void;
  onClearAllCategories?: () => void;
}

const COLOR_PALETTE = [
  '#10b981', '#06b6d4', '#3b82f6', '#6366f1', 
  '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444', 
  '#f59e0b', '#84cc16', '#14b8a6', '#64748b'
];

export const BudgetAndCategories: React.FC<BudgetAndCategoriesProps> = ({
  categories,
  transactions,
  currentMember,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onClearAllCategories,
}) => {
  const [activeTab, setActiveTab] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // New Category State
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [catColor, setCatColor] = useState('#10b981');
  const [catBudget, setCatBudget] = useState('');
  const [catSubcategories, setCatSubcategories] = useState('');

  // Edit Category State
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [editColor, setEditColor] = useState('#10b981');
  const [editBudget, setEditBudget] = useState('');
  const [editSubcategories, setEditSubcategories] = useState('');

  const canManage = currentMember?.permissions?.canManageCategories ?? true;

  // Calculate current month spending per category
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const currentMonthTransactions = transactions.filter((t) => t.date && t.date.startsWith(currentMonth));

  const spendingByCategory: Record<string, number> = {};
  currentMonthTransactions.forEach((t) => {
    if (t.type === 'EXPENSE' && t.categoryId) {
      spendingByCategory[t.categoryId] = (spendingByCategory[t.categoryId] || 0) + t.amount;
    }
  });

  const totalMonthlyBudget = categories
    .filter((c) => c.type === 'EXPENSE' && !!c.monthlyBudget)
    .reduce((sum, c) => sum + (c.monthlyBudget || 0), 0);

  const totalMonthlySpent = Object.values(spendingByCategory).reduce((sum, val) => sum + val, 0);

  // Open Create Modal
  const handleOpenAddModal = (type: 'EXPENSE' | 'INCOME') => {
    setCatName('');
    setCatType(type);
    setCatColor(type === 'EXPENSE' ? '#ef4444' : '#10b981');
    setCatBudget('');
    setCatSubcategories('');
    setShowAddModal(true);
  };

  // Submit Create Category
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    const subs = catSubcategories
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    onAddCategory({
      name: catName.trim(),
      type: catType,
      color: catColor,
      icon: catType === 'EXPENSE' ? 'ShoppingBag' : 'Briefcase',
      monthlyBudget: catType === 'EXPENSE' ? (parseFloat(catBudget) > 0 ? parseFloat(catBudget) : undefined) : undefined,
      subcategories: subs.length > 0 ? subs : ['Ogólne'],
    });

    setCatName('');
    setCatSubcategories('');
    setCatBudget('');
    setShowAddModal(false);
  };

  // Open Edit Modal
  const handleStartEdit = (category: Category) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditType(category.type);
    setEditColor(category.color || '#10b981');
    setEditBudget(category.monthlyBudget ? category.monthlyBudget.toString() : '');
    setEditSubcategories(category.subcategories ? category.subcategories.join(', ') : '');
  };

  // Submit Edit Category
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editName.trim()) return;

    const subs = editSubcategories
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const updated: Category = {
      ...editingCategory,
      name: editName.trim(),
      type: editType,
      color: editColor,
      monthlyBudget: editType === 'EXPENSE' ? (parseFloat(editBudget) > 0 ? parseFloat(editBudget) : undefined) : undefined,
      subcategories: subs.length > 0 ? subs : ['Ogólne'],
    };

    onUpdateCategory(updated);
    setEditingCategory(null);
  };

  const displayedCategories = categories.filter((c) => c.type === activeTab);
  const expenseCategoriesCount = categories.filter((c) => c.type === 'EXPENSE').length;
  const incomeCategoriesCount = categories.filter((c) => c.type === 'INCOME').length;

  return (
    <div className="space-y-6">
      {/* Top Budget Summary Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Planowanie Budżetowe
              </span>
              <span className="text-xs text-slate-400">
                Kategorie: {categories.length} ogółem
              </span>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Własne Kategorie i Limity Miesięczne
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Definiuj własne działy wydatków i wpływów, edytuj limity kwotowe w dowolnym momencie i kontroluj bilans gospodarstwa domowego.
            </p>
          </div>

          <div className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-2xl flex items-center gap-6 shadow-inner">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Wydano w tym miesiącu:</span>
              <strong className="text-xl font-black text-rose-400">
                {totalMonthlySpent.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł
              </strong>
            </div>
            <div className="border-l border-slate-700 pl-6">
              <span className="text-xs text-slate-400 block font-medium">Łączny limit kategorii:</span>
              <strong className="text-xl font-black text-indigo-300">
                {totalMonthlyBudget > 0
                  ? `${totalMonthlyBudget.toLocaleString('pl-PL', { minimumFractionDigits: 2 })} zł`
                  : 'Brak limitów'}
              </strong>
            </div>
          </div>
        </div>

        {/* Total Budget Progress Bar */}
        {totalMonthlyBudget > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="text-slate-300 font-medium">
                Wykorzystanie planu wydatków:
              </span>
              <span className="font-bold text-white">
                {Math.round((totalMonthlySpent / totalMonthlyBudget) * 100)}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  totalMonthlySpent > totalMonthlyBudget
                    ? 'bg-rose-500'
                    : totalMonthlySpent > totalMonthlyBudget * 0.8
                    ? 'bg-amber-400'
                    : 'bg-emerald-500'
                }`}
                style={{
                  width: `${Math.min(100, (totalMonthlySpent / totalMonthlyBudget) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabs & Add Button Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('EXPENSE')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-2 ${
              activeTab === 'EXPENSE'
                ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingDown className="w-4 h-4 text-rose-500" />
            <span>Kategorie Wydatków ({expenseCategoriesCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('INCOME')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-2 ${
              activeTab === 'INCOME'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>Kategorie Przychodów ({incomeCategoriesCount})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {categories.length > 0 && canManage && onClearAllCategories && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-semibold text-xs transition border border-transparent hover:border-rose-200"
              title="Wyczyść wszystkie kategorie z bazy"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Wyczyść listę</span>
            </button>
          )}

          {canManage && (
            <button
              type="button"
              onClick={() => handleOpenAddModal(activeTab)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-200 transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nowa kategoria</span>
            </button>
          )}
        </div>
      </div>

      {/* Categories Grid or Empty State */}
      {displayedCategories.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white border border-dashed border-slate-300 rounded-3xl space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-100">
            <Tag className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-slate-900">
              Brak zdefiniowanych kategorii {activeTab === 'EXPENSE' ? 'wydatków' : 'przychodów'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Twoja lista kategorii jest pusta. Dodaj własne działy, nadaj im kolory, podkategorie i miesięczne limity kwotowe.
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => handleOpenAddModal(activeTab)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Utwórz pierwszą kategorię {activeTab === 'EXPENSE' ? 'wydatku' : 'przychodu'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedCategories.map((category) => {
            const spent = spendingByCategory[category.id] || 0;
            const limit = category.monthlyBudget || 0;
            const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;
            const isOverBudget = limit > 0 && spent > limit;

            return (
              <div
                key={category.id}
                className={`p-5 rounded-2xl border bg-white shadow-xs hover:shadow-md transition flex flex-col justify-between ${
                  isOverBudget ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0"
                        style={{ backgroundColor: category.color || '#6366f1' }}
                      >
                        <Tag className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm leading-snug truncate">
                          {category.name}
                        </h4>
                        <span className="text-[11px] text-slate-500 block">
                          {category.subcategories?.length || 0} podkategorie
                        </span>
                      </div>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(category)}
                          className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
                          title="Edytuj tę kategorię"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCategoryToDelete(category)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                          title="Usuń tę kategorię"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Subcategories tags */}
                  <div className="flex flex-wrap gap-1.5 my-3">
                    {category.subcategories && category.subcategories.slice(0, 5).map((sub: string, i: number) => (
                      <span
                        key={i}
                        className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700"
                      >
                        {sub}
                      </span>
                    ))}
                    {category.subcategories && category.subcategories.length > 5 && (
                      <span className="text-[10px] text-slate-400 px-1 py-0.5 font-medium">
                        +{category.subcategories.length - 5} więcej
                      </span>
                    )}
                  </div>
                </div>

                {/* Expense Limit & Progress Bar */}
                {category.type === 'EXPENSE' && (
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Wydano w tym m-cu:</span>
                      <span className="font-bold text-slate-900">
                        {spent.toFixed(2)} zł / {limit > 0 ? `${limit.toFixed(2)} zł` : 'Bez limitu'}
                      </span>
                    </div>

                    {limit > 0 && (
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOverBudget ? 'bg-rose-500' : percent > 80 ? 'bg-amber-400' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, percent)}%` }}
                        />
                      </div>
                    )}

                    {isOverBudget && (
                      <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Przekroczono plan o {(spent - limit).toFixed(2)} zł!
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: NOWA KATEGORIA */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <span>Utwórz nową kategorię {catType === 'EXPENSE' ? 'wydatków' : 'przychodów'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nazwa kategorii *</label>
                <input
                  type="text"
                  required
                  placeholder="np. Zwierzęta & Weterynarz, Remont & Ogród, Paliwo"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Typ kategorii</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCatType('EXPENSE');
                      if (catColor === '#10b981') setCatColor('#ef4444');
                    }}
                    className={`py-2 text-xs font-bold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                      catType === 'EXPENSE'
                        ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                    <span>Wydatek (Koszty)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCatType('INCOME');
                      if (catColor === '#ef4444') setCatColor('#10b981');
                    }}
                    className={`py-2 text-xs font-bold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                      catType === 'INCOME'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Przychód (Wpływy)</span>
                  </button>
                </div>
              </div>

              {catType === 'EXPENSE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Miesięczny plan / limit kwotowy (PLN)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="10"
                      min="0"
                      placeholder="np. 600 (opcjonalnie)"
                      value={catBudget}
                      onChange={(e) => setCatBudget(e.target.value)}
                      className="w-full px-3 py-2 pr-10 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">zł</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Podkategorie (oddzielone przecinkami)
                </label>
                <input
                  type="text"
                  placeholder="np. Karma, Weterynarz, Szczepienia, Akcesoria"
                  value={catSubcategories}
                  onChange={(e) => setCatSubcategories(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Kolor etykiety</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PALETTE.map((col) => (
                    <button
                      type="button"
                      key={col}
                      onClick={() => setCatColor(col)}
                      style={{ backgroundColor: col }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition ${
                        catColor === col ? 'ring-2 ring-offset-2 ring-slate-800 scale-110 shadow-sm' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      {catColor === col && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                >
                  Utwórz kategorię
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDYCJA KATEGORII */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                <span>Edycja kategorii: {editingCategory.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nazwa kategorii *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Typ kategorii</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditType('EXPENSE')}
                    className={`py-2 text-xs font-bold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                      editType === 'EXPENSE'
                        ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                    <span>Wydatek (Koszty)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType('INCOME')}
                    className={`py-2 text-xs font-bold rounded-xl border transition flex items-center justify-center gap-1.5 ${
                      editType === 'INCOME'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Przychód (Wpływy)</span>
                  </button>
                </div>
              </div>

              {editType === 'EXPENSE' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Miesięczny plan / limit kwotowy (PLN)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="10"
                      min="0"
                      placeholder="Pozostaw puste dla braku limitu"
                      value={editBudget}
                      onChange={(e) => setEditBudget(e.target.value)}
                      className="w-full px-3 py-2 pr-10 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">zł</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Podkategorie (oddzielone przecinkami)
                </label>
                <input
                  type="text"
                  placeholder="np. Sklep 1, Sklep 2, Usługi"
                  value={editSubcategories}
                  onChange={(e) => setEditSubcategories(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Kolor etykiety</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {COLOR_PALETTE.map((col) => (
                    <button
                      type="button"
                      key={col}
                      onClick={() => setEditColor(col)}
                      style={{ backgroundColor: col }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition ${
                        editColor === col ? 'ring-2 ring-offset-2 ring-slate-800 scale-110 shadow-sm' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      {editColor === col && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                >
                  Zapisz zmiany
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: POTWIERDZENIE USUNIĘCIA POJEDYNCZEJ KATEGORII */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Usunąć kategorię "{categoryToDelete.name}"?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Kategoria zostanie usunięta z listy i zsynchronizowana ze wszystkimi urządzeniami rodziny.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteCategory(categoryToDelete.id);
                  setCategoryToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition"
              >
                Usuń kategorię
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: POTWIERDZENIE CZYSZCZENIA WSZYSTKICH KATEGORII */}
      {showClearConfirm && onClearAllCategories && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Wyczyścić całą listę kategorii?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Z bazy zostaną usunięte wszystkie kategorie ({categories.length} szt.). Będziesz mógł zacząć od całkowicie czystego konta i dodać tylko te, których naprawdę potrzebujesz.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearAllCategories();
                  setShowClearConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition"
              >
                Tak, wyczyść wszystko
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
