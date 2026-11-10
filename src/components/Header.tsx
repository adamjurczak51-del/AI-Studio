import React from 'react';
import { FamilyMember } from '../types';
import { 
  Users, 
  Receipt, 
  PackageMinus, 
  PlusCircle, 
  ShieldCheck, 
  UserCheck, 
  Sparkles,
  ChevronDown,
  RotateCcw,
  MessageSquare,
  Camera,
  ShoppingCart,
  Smartphone,
  LogOut
} from 'lucide-react';

interface HeaderProps {
  currentMember: FamilyMember;
  allMembers: FamilyMember[];
  householdName?: string;
  onLogout?: () => void;
  onSwitchMember: (memberId: string) => void;
  onOpenReceiptScanner: () => void;
  onOpenEmptyPackageScanner: () => void;
  onOpenPromotionsModal: () => void;
  onOpenScanProductsModal?: () => void;
  onOpenLiveAssistant?: () => void;
  pendingShoppingSession?: any;
  onOpenNewTransaction: () => void;
  onResetData: () => void;
  onOpenInstallModal?: () => void;
  totalHouseholdBalance: number;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unreadCount?: number;
  calendarBadgeCount?: number;
  garageBadgeCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentMember,
  allMembers,
  householdName,
  onLogout,
  onSwitchMember,
  onOpenReceiptScanner,
  onOpenEmptyPackageScanner,
  onOpenPromotionsModal,
  onOpenScanProductsModal,
  onOpenLiveAssistant,
  pendingShoppingSession,
  onOpenNewTransaction,
  onResetData,
  onOpenInstallModal,
  totalHouseholdBalance,
  activeTab,
  setActiveTab,
  unreadCount = 0,
  calendarBadgeCount = 0,
  garageBadgeCount = 0,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const roleLabels: Record<string, { label: string; badge: string; color: string }> = {
    ADMIN: { label: 'Administrator', badge: 'Admin', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    MANAGER: { label: 'Zarządzający', badge: 'Zarządca', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    MEMBER: { label: 'Członek rodziny', badge: 'Użytkownik', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    CHILD: { label: 'Dziecko (Ograniczony)', badge: 'Dziecko', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  };

  const navItems = [
    { id: 'dashboard', label: 'Pulpit & Konta', icon: 'LayoutDashboard' },
    { id: 'pantry', label: 'Magazyn & Spiżarnia', icon: 'Package' },
    { id: 'calendar', label: 'Kalendarz & Asystent', icon: 'Calendar' },
    { id: 'garage', label: 'Moje Samochody', icon: 'Car' },
    { id: 'commute', label: 'Trasy & Pogoda', icon: 'Navigation' },
    { id: 'messages', label: 'Komunikator & Czat', icon: 'MessageSquare' },
    { id: 'budget', label: 'Budżet & Kategorie', icon: 'PieChart' },
    { id: 'transactions', label: 'Historia Operacji', icon: 'History' },
    { id: 'family', label: 'Rodzina & Uprawnienia', icon: 'Users' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top Commercial Bar */}
      <div className="bg-slate-900 text-slate-200 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/60">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-white tracking-wide text-[11px]">Chmura: Aktywna (Live Sync)</span>
          </div>

          {householdName && (
            <div className="flex items-center gap-1.5 text-slate-300 text-xs">
              <span className="text-slate-400">Gospodarstwo:</span>
              <strong className="text-white font-semibold">{householdName}</strong>
            </div>
          )}
        </div>

        {/* User profile & quick actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1 rounded-full border border-slate-700">
            <span className="text-sm">{currentMember.avatarEmoji || '👤'}</span>
            <span className="font-medium text-white text-xs">{currentMember.name}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              currentMember.role === 'ADMIN'
                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/40'
                : currentMember.role === 'MANAGER'
                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40'
                : 'bg-blue-500/30 text-blue-300 border border-blue-400/40'
            }`}>
              {roleLabels[currentMember.role]?.badge || currentMember.role}
            </span>
          </div>

          {(currentMember.role === 'ADMIN' || currentMember.permissions.canManageFamily) && (
            <button
              onClick={() => setActiveTab('family')}
              title="Zarządzaj członkami rodziny, dodawaj profile i nadawaj uprawnienia"
              className="px-2.5 py-1 bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700/60 text-indigo-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Users className="w-3.5 h-3.5 text-indigo-300" />
              <span className="hidden sm:inline">Panel Rodziny</span>
            </button>
          )}

          {onOpenInstallModal && (
            <button
              onClick={onOpenInstallModal}
              title="Zainstaluj aplikację na telefonie (Android / iPhone) lub komputerze"
              className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition shadow-xs ring-1 ring-white/20"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-200" />
              <span>📱 Zainstaluj aplikację</span>
            </button>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              title="Wyloguj z profilu i przejdź do ekranu logowania / PIN"
              className="px-2.5 py-1 bg-slate-800 hover:bg-rose-950/70 border border-slate-700 hover:border-rose-700 text-slate-300 hover:text-rose-200 rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Wyloguj</span>
            </button>
          )}
        </div>
      </div>

      {/* Main App Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Family Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Domowy Budżet <span className="text-indigo-600">&amp; Spiżarnia</span>
                  {householdName && (
                    <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 hidden md:inline">
                      {householdName}
                    </span>
                  )}
                </h1>
                <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                  AI OCR + Magazyn
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Chmura: Aktywna (Live Sync)</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Zalogowano jako: <strong className="text-slate-800">{currentMember.name}</strong> •{' '}
                <span className="text-indigo-600 font-medium">
                  {roleLabels[currentMember.role]?.label || currentMember.role}
                </span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Asystent Zakupów na Żywo (Skaner Koszyka w sklepie) */}
            {onOpenLiveAssistant && (
              <button
                onClick={onOpenLiveAssistant}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg transition shadow-xs active:scale-98 ${
                  pendingShoppingSession
                    ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-300 animate-pulse'
                    : 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white shadow-rose-200'
                }`}
                title="Skanuj produkty kamerą podczas zakupów w sklepie (np. Kaufland) - podlicza koszyk i dodaje do magazynu"
              >
                <ShoppingCart className="w-4 h-4 text-white" />
                <span className="hidden sm:inline">Asystent Zakupów</span>
                <span className="sm:hidden">Koszyk</span>
                {pendingShoppingSession && (
                  <span className="ml-1 px-1.5 py-0.2 bg-white text-amber-700 text-[10px] font-black rounded-full">
                    {pendingShoppingSession.items.length}
                  </span>
                )}
              </button>
            )}

            {/* Skaner Paragonów */}
            {currentMember.permissions.canScanReceipts && (
              <button
                onClick={onOpenReceiptScanner}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 active:scale-98 transition shadow-xs shadow-indigo-300 relative"
              >
                <Receipt className="w-4 h-4" />
                <span className="hidden sm:inline">Skanuj Paragon</span>
                <span className="sm:hidden">Paragon</span>
                {pendingShoppingSession && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full"></span>
                )}
              </button>
            )}

            {/* Skaner Produktów bez Paragonu */}
            {currentMember.permissions.canManagePantry && onOpenScanProductsModal && (
              <button
                onClick={onOpenScanProductsModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 active:scale-98 transition shadow-xs shadow-emerald-200"
                title="Dodaj produkty ze zdjęcia bez paragonu (np. z targu lub blatu)"
              >
                <Camera className="w-4 h-4 text-emerald-200" />
                <span className="hidden sm:inline">Produkty (zdjęcie)</span>
                <span className="sm:hidden">Produkty</span>
              </button>
            )}

            {/* Skaner Zużytych Opakowań */}
            {currentMember.permissions.canManagePantry && (
              <button
                onClick={onOpenEmptyPackageScanner}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 active:scale-98 transition shadow-xs shadow-amber-200"
                title="Zrób zdjęcie pustego opakowania aby odjąć produkt ze spiżarni"
              >
                <PackageMinus className="w-4 h-4" />
                <span className="hidden sm:inline">Zużyte opakowanie</span>
                <span className="sm:hidden">Zużycie</span>
              </button>
            )}

            {/* Sprawdź Promocje */}
            <button
              onClick={onOpenPromotionsModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 active:scale-98 transition shadow-xs shadow-amber-200"
              title="Sprawdź promocje w okolicznych sklepach dla listy zakupowej"
            >
              <Sparkles className="w-4 h-4 text-amber-100" />
              <span className="hidden sm:inline">Promocje</span>
            </button>

            {/* Nowa Operacja */}
            <button
              onClick={onOpenNewTransaction}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
            >
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              <span className="hidden md:inline">Nowa operacja</span>
            </button>

            {/* Pobierz na telefon (PWA) */}
            {onOpenInstallModal && (
              <button
                onClick={onOpenInstallModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition"
                title="Pobierz aplikację na telefon jako ikonę na ekranie głównym"
              >
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span className="hidden xl:inline">Na telefon</span>
                <span className="xl:hidden">📱</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-4 border-t border-slate-100 overflow-x-auto scrollbar-none py-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>{item.label}</span>
                {item.id === 'messages' && unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                    {unreadCount}
                  </span>
                )}
                {item.id === 'calendar' && calendarBadgeCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                    {calendarBadgeCount}
                  </span>
                )}
                {item.id === 'garage' && garageBadgeCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                    {garageBadgeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
