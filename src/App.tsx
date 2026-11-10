/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Account, 
  Category, 
  FamilyMember, 
  FamilyMessage,
  PantryItem, 
  ShoppingListItem, 
  StoreDeal,
  Transaction,
  TransactionType,
  AppNotification,
  LiveShoppingSession,
  CalendarEvent,
  CyclicalHabitSuggestion,
  Vehicle,
  RefuelLog
} from './types';
import { 
  INITIAL_ACCOUNTS, 
  INITIAL_CATEGORIES, 
  INITIAL_MEMBERS, 
  INITIAL_MESSAGES, 
  INITIAL_PANTRY, 
  INITIAL_SHOPPING_LIST, 
  INITIAL_TRANSACTIONS,
  INITIAL_CALENDAR_EVENTS,
  INITIAL_CYCLICAL_SUGGESTIONS,
  INITIAL_VEHICLES,
  INITIAL_REFUEL_LOGS
} from './initialData';
import { Header } from './components/Header';
import { AccountsOverview } from './components/AccountsOverview';
import { PantryManager } from './components/PantryManager';
import { FamilyMessenger } from './components/FamilyMessenger';
import { BudgetAndCategories } from './components/BudgetAndCategories';
import { FamilyAndPermissions } from './components/FamilyAndPermissions';
import { TransactionList } from './components/TransactionList';
import { ReceiptScannerModal } from './components/ReceiptScannerModal';
import { EmptyPackageScannerModal } from './components/EmptyPackageScannerModal';
import { NewTransactionModal } from './components/NewTransactionModal';
import { PromotionsCheckerModal } from './components/PromotionsCheckerModal';
import { ScanPantryProductsModal } from './components/ScanPantryProductsModal';
import { LiveShoppingAssistantModal } from './components/LiveShoppingAssistantModal';
import { SmartCalendarManager } from './components/SmartCalendarManager';
import { GarageManager } from './components/GarageManager';
import { CommuteWeatherAssistant } from './components/CommuteWeatherAssistant';
import { InstallAppModal } from './components/InstallAppModal';
import { CommercialAuthScreen } from './components/CommercialAuthScreen';
import { playNotificationChime, triggerDesktopNotification, requestNotificationPermission } from './utils/notifications';
import { db, saveHouseholdDoc, deleteHouseholdDoc, seedHouseholdIfEmpty, registerMemberAuth } from './utils/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Bell, Volume2, X, MessageSquare, ArrowRight, ShoppingCart, Store, Calendar, Car } from 'lucide-react';

export interface ActiveSession {
  householdId: string;
  householdName: string;
  memberId: string;
  memberName: string;
  role: string;
  login: string;
}

// Helper to detect if booted session is a commercial family (should not load mock Kowalski data)
const isCommercialBoot = (() => {
  if (typeof window === 'undefined') return false;
  try {
    const s = localStorage.getItem('domowy_budzet_session_user');
    if (s) {
      const parsed = JSON.parse(s);
      if (parsed.householdId && parsed.householdId !== 'rodzina-glowna') return true;
    }
    const hid = localStorage.getItem('domowy_budzet_household_id');
    if (hid && hid !== 'rodzina-glowna') return true;
  } catch {}
  return false;
})();

export default function App() {
  // LocalStorage State Initialization with Fallback to Polish Seed Data
  const [members, setMembers] = useState<FamilyMember[]>(() => {
    const saved = localStorage.getItem('domowy_budzet_members');
    if (!saved) return isCommercialBoot ? [] : INITIAL_MEMBERS;
    try {
      const parsed: FamilyMember[] = JSON.parse(saved);
      return parsed
        .filter((m) => m && m.name && m.name.trim() !== '' && m.name !== 'undefined' && m.role)
        .map((m) => ({
          ...m,
          assignedAccountIds: Array.isArray(m.assignedAccountIds) ? m.assignedAccountIds : ['acc-1'],
          permissions: m.permissions || INITIAL_MEMBERS[0].permissions,
        }));
    } catch {
      return isCommercialBoot ? [] : INITIAL_MEMBERS;
    }
  });

  const [currentMemberId, setCurrentMemberId] = useState<string>(() => {
    const saved = localStorage.getItem('domowy_budzet_active_member');
    return saved || 'mem-1';
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('domowy_budzet_accounts');
    if (!saved) return isCommercialBoot ? [] : INITIAL_ACCOUNTS;
    try {
      const parsed: any[] = JSON.parse(saved);
      return parsed.map((acc) => ({
        ...acc,
        ownerMemberIds: Array.isArray(acc.ownerMemberIds)
          ? acc.ownerMemberIds
          : (acc.ownerMemberId ? [acc.ownerMemberId] : ['mem-1']),
      }));
    } catch {
      return isCommercialBoot ? [] : INITIAL_ACCOUNTS;
    }
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('domowy_budzet_categories');
    if (!saved) return [];
    try {
      const parsed: Category[] = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (c) =>
          c &&
          c.name &&
          !c.isDefault &&
          !c.id.startsWith('cat-inc-') &&
          c.id !== 'cat-1' &&
          c.id !== 'cat-2' &&
          c.id !== 'cat-3' &&
          c.id !== 'cat-4' &&
          c.id !== 'cat-5' &&
          c.id !== 'cat-6' &&
          c.id !== 'cat-7' &&
          c.id !== 'cat-8'
      );
    } catch {
      return [];
    }
  });

  const [pantryItems, setPantryItems] = useState<PantryItem[]>(() => {
    const saved = localStorage.getItem('domowy_budzet_pantry');
    return saved ? JSON.parse(saved) : (isCommercialBoot ? [] : INITIAL_PANTRY);
  });

  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>(() => {
    const saved = localStorage.getItem('domowy_budzet_shopping');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Filter out any obsolete mock items
          return parsed.filter((p: any) => p.id !== 'shop-1' && p.id !== 'shop-2' && p.id !== 'shop-3');
        }
      } catch {}
    }
    return [];
  });

  const [messages, setMessages] = useState<FamilyMessage[]>(() => {
    const saved = localStorage.getItem('domowy_budzet_messages');
    return saved ? JSON.parse(saved) : (isCommercialBoot ? [] : INITIAL_MESSAGES);
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('domowy_budzet_transactions');
    return saved ? JSON.parse(saved) : (isCommercialBoot ? [] : INITIAL_TRANSACTIONS);
  });

  const [liveSessions, setLiveSessions] = useState<LiveShoppingSession[]>(() => {
    const saved = localStorage.getItem('domowy_budzet_live_sessions');
    return saved ? JSON.parse(saved) : [];
  });

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => {
    const saved = localStorage.getItem('domowy_budzet_calendar_events');
    return saved ? JSON.parse(saved) : (isCommercialBoot ? [] : INITIAL_CALENDAR_EVENTS);
  });

  const [cyclicalSuggestions, setCyclicalSuggestions] = useState<CyclicalHabitSuggestion[]>(() => {
    const saved = localStorage.getItem('domowy_budzet_cyclical_suggestions');
    return saved ? JSON.parse(saved) : (isCommercialBoot ? [] : INITIAL_CYCLICAL_SUGGESTIONS);
  });

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem('domowy_budzet_vehicles');
    return saved ? JSON.parse(saved) : (isCommercialBoot ? [] : INITIAL_VEHICLES);
  });

  const [refuelLogs, setRefuelLogs] = useState<RefuelLog[]>(() => {
    const saved = localStorage.getItem('domowy_budzet_refuel_logs');
    return saved ? JSON.parse(saved) : (isCommercialBoot ? [] : INITIAL_REFUEL_LOGS);
  });

  // UI State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isEmptyPackageModalOpen, setIsEmptyPackageModalOpen] = useState(false);
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [isPromotionsModalOpen, setIsPromotionsModalOpen] = useState(false);
  const [isScanProductsModalOpen, setIsScanProductsModalOpen] = useState(false);
  const [isLiveAssistantModalOpen, setIsLiveAssistantModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [preselectedReceiptSessionId, setPreselectedReceiptSessionId] = useState<string | null>(null);
  const [activeNotification, setActiveNotification] = useState<AppNotification | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);

  // Auto-dismiss in-app notification toast after 6 seconds
  useEffect(() => {
    if (activeNotification) {
      const timer = setTimeout(() => {
        setActiveNotification(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [activeNotification]);

  // Reset unread message count when user navigates to messages tab
  useEffect(() => {
    if (activeTab === 'messages') {
      setUnreadMessagesCount(0);
    }
  }, [activeTab]);

  // Sync to LocalStorage on Change
  useEffect(() => {
    localStorage.setItem('domowy_budzet_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('domowy_budzet_active_member', currentMemberId);
  }, [currentMemberId]);

  useEffect(() => {
    localStorage.setItem('domowy_budzet_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('domowy_budzet_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('domowy_budzet_pantry', JSON.stringify(pantryItems));
  }, [pantryItems]);

  useEffect(() => {
    localStorage.setItem('domowy_budzet_shopping', JSON.stringify(shoppingList));
  }, [shoppingList]);

  useEffect(() => {
    localStorage.setItem('domowy_budzet_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('domowy_budzet_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('domowy_budzet_live_sessions', JSON.stringify(liveSessions));
  }, [liveSessions]);

  useEffect(() => {
    localStorage.setItem('domowy_budzet_calendar_events', JSON.stringify(calendarEvents));
  }, [calendarEvents]);

  useEffect(() => {
    localStorage.setItem('domowy_budzet_cyclical_suggestions', JSON.stringify(cyclicalSuggestions));
  }, [cyclicalSuggestions]);

  useEffect(() => {
    localStorage.setItem('domowy_budzet_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem('domowy_budzet_refuel_logs', JSON.stringify(refuelLogs));
  }, [refuelLogs]);

  // Commercial SaaS Session (Multi-family / multi-device login)
  const [sessionUser, setSessionUser] = useState<ActiveSession | null>(() => {
    // If URL contains an invite token, do not auto-login: show the CommercialAuthScreen in invite onboarding mode
    const params = new URLSearchParams(window.location.search);
    if (params.get('invite')) {
      return null;
    }
    const saved = localStorage.getItem('domowy_budzet_session_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [householdName, setHouseholdName] = useState<string>(() => {
    return localStorage.getItem('domowy_budzet_household_name') || 'Nasze Gospodarstwo Domowe';
  });

  // Household identifier for real-time Cloud Sync
  const [householdId, setHouseholdId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('joinFamily') || params.get('household');
    if (fromUrl) {
      const clean = fromUrl.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      localStorage.setItem('domowy_budzet_household_id', clean);
      return clean;
    }
    const savedSession = localStorage.getItem('domowy_budzet_session_user');
    if (savedSession) {
      try {
        const s = JSON.parse(savedSession);
        if (s.householdId) return s.householdId;
      } catch {}
    }
    const saved = localStorage.getItem('domowy_budzet_household_id');
    return saved || 'rodzina-glowna';
  });

  const handleLoginSuccess = (session: ActiveSession) => {
    setSessionUser(session);
    setHouseholdId(session.householdId);
    setHouseholdName(session.householdName);
    setCurrentMemberId(session.memberId);
    localStorage.setItem('domowy_budzet_session_user', JSON.stringify(session));
    localStorage.setItem('domowy_budzet_household_id', session.householdId);
    localStorage.setItem('domowy_budzet_household_name', session.householdName);
    localStorage.setItem('domowy_budzet_active_member', session.memberId);

    // If commercial family (not demo sandbox), ensure memory starts completely clean for Firestore sync
    if (session.householdId !== 'rodzina-glowna') {
      setPantryItems([]);
      setShoppingList([]);
      setMessages([]);
      setTransactions([]);
      setVehicles([]);
      setCalendarEvents([]);
      setRefuelLogs([]);
      setLiveSessions([]);
      setCategories((prev) =>
        prev.filter((c) => !c.isDefault && !c.id.startsWith('cat-inc-') && !c.id.startsWith('cat-'))
      );
    }

    if (window.location.search.includes('invite')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('domowy_budzet_session_user');
    setSessionUser(null);
  };

  const handleExploreDemo = () => {
    const demoSession: ActiveSession = {
      householdId: 'rodzina-glowna',
      householdName: 'Gospodarstwo Kowalskich (Demo)',
      memberId: 'mem-1',
      memberName: 'Jan (Głowa Rodziny)',
      role: 'ADMIN',
      login: 'demo',
    };
    handleLoginSuccess(demoSession);
  };

  // 1. Initial Firestore Seed if this household database is empty
  useEffect(() => {
    seedHouseholdIfEmpty(householdId, {
      members,
      accounts,
      pantry: pantryItems,
      shoppingList,
      messages,
      calendarEvents,
      vehicles,
      refuelLogs,
      transactions,
    });
  }, [householdId]);

  // 2. Real-time Firestore Listeners: when another device (phone or laptop) makes an update, all devices get it live!
  useEffect(() => {
    const handleSnapshotError = (err: any) => {
      console.warn('Firestore live sync notice (app continues safely with local state):', err);
    };

    const unsubs = [
      onSnapshot(
        collection(db, 'households', householdId, 'shoppingList'),
        (snapshot) => {
          const items = snapshot.docs.map((d) => d.data() as ShoppingListItem);
          setShoppingList(items);
        },
        handleSnapshotError
      ),
      onSnapshot(
        collection(db, 'households', householdId, 'pantry'),
        (snapshot) => {
          const items = snapshot.docs.map((d) => d.data() as PantryItem);
          setPantryItems(items);
        },
        handleSnapshotError
      ),
      onSnapshot(
        collection(db, 'households', householdId, 'messages'),
        (snapshot) => {
          const msgs = snapshot.docs.map((d) => d.data() as FamilyMessage);
          msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          setMessages(msgs);
        },
        handleSnapshotError
      ),
      onSnapshot(
        collection(db, 'households', householdId, 'calendar'),
        (snapshot) => {
          const evs = snapshot.docs.map((d) => d.data() as CalendarEvent);
          setCalendarEvents(evs);
        },
        handleSnapshotError
      ),
      onSnapshot(
        collection(db, 'households', householdId, 'transactions'),
        (snapshot) => {
          const txs = snapshot.docs.map((d) => d.data() as Transaction);
          txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setTransactions(txs);
        },
        handleSnapshotError
      ),
      onSnapshot(
        collection(db, 'households', householdId, 'vehicles'),
        (snapshot) => {
          const vehs = snapshot.docs.map((d) => d.data() as Vehicle);
          setVehicles(vehs);
        },
        handleSnapshotError
      ),
      onSnapshot(
        collection(db, 'households', householdId, 'accounts'),
        (snapshot) => {
          const accs = snapshot.docs.map((d) => d.data() as Account);
          if (accs.length > 0) {
            setAccounts(accs);
          }
        },
        handleSnapshotError
      ),
      onSnapshot(
        collection(db, 'households', householdId, 'members'),
        (snapshot) => {
          const mems = snapshot.docs
            .map((d) => d.data() as FamilyMember)
            .filter((m) => m && m.name && m.name.trim() !== '' && m.name !== 'undefined' && m.role);
          if (mems.length > 0) {
            setMembers(mems);
          }
        },
        handleSnapshotError
      ),
      onSnapshot(
        collection(db, 'households', householdId, 'categories'),
        (snapshot) => {
          const cats = snapshot.docs.map((d) => d.data() as Category);
          if (cats.length > 0) {
            setCategories(cats);
          } else if (snapshot.empty && householdId !== 'rodzina-glowna') {
            setCategories([]);
          }
        },
        handleSnapshotError
      ),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [householdId]);

  // Current logged in member (guaranteed non-null fallback matching authenticated session)
  const sessionFallbackMember: FamilyMember = sessionUser ? {
    id: sessionUser.memberId,
    name: sessionUser.memberName,
    role: (sessionUser.role as any) || 'ADMIN',
    avatarColor: 'bg-indigo-600',
    avatarEmoji: sessionUser.role === 'ADMIN' ? '👑' : '👤',
    assignedAccountIds: accounts.map((a) => a.id),
    permissions: {
      canViewAllAccounts: sessionUser.role === 'ADMIN',
      canViewFamilyTotalBalance: true,
      canManageAccounts: sessionUser.role === 'ADMIN',
      canManageBudget: true,
      canManageCategories: true,
      canScanReceipts: true,
      canManagePantry: true,
      canManageFamily: sessionUser.role === 'ADMIN',
    },
  } : INITIAL_MEMBERS[0];

  const currentMember = (Array.isArray(members) && members.length > 0)
    ? (members.find((m) => m.id === currentMemberId) || members[0] || sessionFallbackMember)
    : sessionFallbackMember;

  // Global Household Total Net Worth (Sum of all active accounts)
  const totalHouseholdBalance = (Array.isArray(accounts) ? accounts : []).reduce(
    (sum, acc) => sum + (acc.balance || 0),
    0
  );

  // 1. ADD ACCOUNT (DYNAMIC SUB-ACCOUNTS)
  const handleAddAccount = (newAcc: Omit<Account, 'id'>) => {
    const id = `acc-${Date.now()}`;
    const createdAccount: Account = { ...newAcc, id };
    setAccounts((prev) => [...prev, createdAccount]);
    saveHouseholdDoc(householdId, 'accounts', createdAccount.id, createdAccount);

    setMembers((prev) =>
      prev.map((m) => {
        if ((newAcc.ownerMemberIds || []).includes(m.id)) {
          const updated = {
            ...m,
            assignedAccountIds: Array.from(new Set([...(m.assignedAccountIds || []), id])),
          };
          saveHouseholdDoc(householdId, 'members', updated.id, updated);
          return updated;
        }
        return m;
      })
    );
  };

  const handleUpdateAccount = (updatedAcc: Account) => {
    setAccounts((prev) => prev.map((a) => (a.id === updatedAcc.id ? updatedAcc : a)));
    saveHouseholdDoc(householdId, 'accounts', updatedAcc.id, updatedAcc);
  };

  const handleDeleteAccount = (accountId: string) => {
    if (accounts.length <= 1) {
      alert('W gospodarstwie domowym musi pozostać co najmniej jedno aktywne konto!');
      return;
    }

    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    deleteHouseholdDoc(householdId, 'accounts', accountId);

    // Clean up member assigned accounts
    setMembers((prev) =>
      prev.map((m) => {
        if ((m.assignedAccountIds || []).includes(accountId)) {
          const updated = {
            ...m,
            assignedAccountIds: (m.assignedAccountIds || []).filter((id) => id !== accountId),
          };
          saveHouseholdDoc(householdId, 'members', updated.id, updated);
          return updated;
        }
        return m;
      })
    );
  };

  // 2. TRANSFER BETWEEN ACCOUNTS
  const handleTransfer = (fromId: string, toId: string, amount: number, note: string) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === fromId) {
          return { ...acc, balance: acc.balance - amount };
        }
        if (acc.id === toId) {
          return { ...acc, balance: acc.balance + amount };
        }
        return acc;
      })
    );

    const fromAcc = accounts.find((a) => a.id === fromId);
    const toAcc = accounts.find((a) => a.id === toId);

    const tx: Transaction = {
      id: `tx-tr-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      title: `Przelew: ${fromAcc?.name} -> ${toAcc?.name}`,
      amount,
      type: 'TRANSFER',
      accountId: fromId,
      toAccountId: toId,
      categoryId: 'cat-transfer',
      categoryName: 'Transfer między kontami',
      memberId: currentMember.id,
      memberName: currentMember.name,
      notes: note,
      createdAt: new Date().toISOString(),
    };

    setTransactions((prev) => [tx, ...prev]);
  };

  // 3. SAVE RECEIPT (OCR RESULT -> TRANSACTION + PANTRY INVENTORY RESTOCK + ANTI-DUPLICATION)
  const handleSaveReceipt = (data: {
    transaction: {
      date: string;
      title: string;
      amount: number;
      accountId: string;
      categoryId: string;
      categoryName: string;
      memberId: string;
      memberName: string;
      shopName: string;
      receiptNumber?: string;
      linkedShoppingSessionId?: string;
      isReconciledFromBasket?: boolean;
      assignedVehicleId?: string;
      isVehicleExpense?: boolean;
      items: any[];
    };
    pantryItemsToAdd: Array<{
      name: string;
      category: string;
      quantity: number;
      unit: string;
    }>;
    reconciledSessionId?: string;
    vehicleRefuelData?: {
      vehicleId: string;
      liters: number;
      pricePerLiter: number;
      totalCost: number;
      stationName: string;
      fullTank: boolean;
    };
  }) => {
    // Deduct from account balance
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === data.transaction.accountId) {
          return { ...acc, balance: acc.balance - data.transaction.amount };
        }
        return acc;
      })
    );

    // If reconciled with a live shopping basket session, update status to RECONCILED_WITH_RECEIPT
    if (data.reconciledSessionId) {
      setLiveSessions((prev) =>
        prev.map((sess) => {
          if (sess.id === data.reconciledSessionId) {
            return {
              ...sess,
              status: 'RECONCILED_WITH_RECEIPT' as const,
              actualReceiptTotal: data.transaction.amount,
              receiptNumber: data.transaction.receiptNumber,
            };
          }
          return sess;
        })
      );
    }

    // Create transaction
    const newTx: Transaction = {
      id: `tx-rec-${Date.now()}`,
      date: data.transaction.date,
      title: data.transaction.title,
      amount: data.transaction.amount,
      type: 'EXPENSE',
      accountId: data.transaction.accountId,
      categoryId: data.transaction.categoryId,
      categoryName: data.transaction.categoryName,
      memberId: data.transaction.memberId,
      memberName: data.transaction.memberName,
      shopName: data.transaction.shopName,
      receiptNumber: data.transaction.receiptNumber,
      linkedShoppingSessionId: data.transaction.linkedShoppingSessionId,
      isReconciledFromBasket: data.transaction.isReconciledFromBasket,
      assignedVehicleId: data.transaction.assignedVehicleId,
      isVehicleExpense: data.transaction.isVehicleExpense,
      items: data.transaction.items,
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);
    saveHouseholdDoc(householdId, 'transactions', newTx.id, newTx);

    // Automotive Refuel Sync (User request 2: 'widząc paragon dotyczący auta zapytać do którego auta przypisać zakup i zapisać tankowanie')
    if (data.vehicleRefuelData) {
      const vRefuel = data.vehicleRefuelData;
      setVehicles((prev) =>
        prev.map((v) => {
          if (v.id === vRefuel.vehicleId) {
            const cap = v.tankCapacity || v.fuelTankCapacity || 50;
            const updatedFuel = Math.min(cap, Math.round((v.currentFuelLiters + vRefuel.liters) * 10) / 10);
            const updatedV = {
              ...v,
              currentFuelLiters: updatedFuel,
              lastRefuelDate: data.transaction.date,
            };
            saveHouseholdDoc(householdId, 'vehicles', updatedV.id, updatedV);
            return updatedV;
          }
          return v;
        })
      );

      const targetCar = vehicles.find((v) => v.id === vRefuel.vehicleId);
      const newRefuelLog: RefuelLog = {
        id: `refuel-${Date.now()}`,
        vehicleId: vRefuel.vehicleId,
        date: data.transaction.date,
        liters: vRefuel.liters,
        pricePerLiter: vRefuel.pricePerLiter,
        totalCost: vRefuel.totalCost,
        currentMileage: targetCar?.currentMileage || 164000,
        fullTank: vRefuel.fullTank,
        stationName: vRefuel.stationName,
        receiptNumber: data.transaction.receiptNumber,
      };
      setRefuelLogs((prev) => [newRefuelLog, ...prev]);
    }

    // Uzupełnienie magazynu / spiżarni - TYLKO jeśli nie powiązano z koszykiem na żywo!
    // Dzięki temu gdy użytkownik zeskanuje paragon w domu, produkty NIE zostaną zdublowane.
    if (!data.reconciledSessionId && data.pantryItemsToAdd && data.pantryItemsToAdd.length > 0) {
      setPantryItems((prev) => {
        const next = [...prev];
        data.pantryItemsToAdd.forEach((newItem) => {
          const existingIdx = next.findIndex(
            (p) =>
              p.name.toLowerCase().includes(newItem.name.toLowerCase().slice(0, 10)) ||
              newItem.name.toLowerCase().includes(p.name.toLowerCase().slice(0, 10))
          );

          if (existingIdx >= 0) {
            const updatedItem = {
              ...next[existingIdx],
              quantity: next[existingIdx].quantity + newItem.quantity,
              lastPurchasedDate: data.transaction.date,
            };
            next[existingIdx] = updatedItem;
            saveHouseholdDoc(householdId, 'pantry', updatedItem.id, updatedItem);
          } else {
            const createdPantryItem: PantryItem = {
              id: `pan-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              name: newItem.name,
              category: newItem.category || 'Makarony, ryże i kasze',
              quantity: newItem.quantity,
              unit: newItem.unit || 'szt.',
              minQuantity: 1,
              lastPurchasedDate: data.transaction.date,
            };
            next.push(createdPantryItem);
            saveHouseholdDoc(householdId, 'pantry', createdPantryItem.id, createdPantryItem);
          }
        });
        return next;
      });
    }

    // Powiadomienie w aplikacji
    const isReconciled = !!data.reconciledSessionId;
    let toastTitle = isReconciled ? 'Paragon powiązany z koszykiem (Bez dublowania)' : 'Zapisano paragon';
    let toastDesc = isReconciled
      ? `Paragon (${data.transaction.shopName || 'Kaufland'} - ${data.transaction.amount.toFixed(2)} PLN) został powiązany. Zaktualizowano wydatek, a stan magazynu NIE został zdublowany.`
      : `Zaksięgowano paragon (${data.transaction.shopName || 'Zakupy'} - ${data.transaction.amount.toFixed(2)} PLN) i uzupełniono spiżarnię.`;

    if (data.vehicleRefuelData) {
      const v = vehicles.find((veh) => veh.id === data.vehicleRefuelData?.vehicleId);
      const vehicleTitle = v ? (v.name || `${v.brand || ''} ${v.model || ''}`.trim()) : 'auto';
      toastTitle = `Zapisano paragon i zatankowano ${vehicleTitle}!`;
      toastDesc = `Zaksięgowano wydatek ${data.transaction.amount.toFixed(2)} PLN oraz uzupełniono stan paliwa o ${data.vehicleRefuelData.liters.toFixed(1)} L w pojeździe ${vehicleTitle}.`;
    }

    setActiveNotification({
      id: `notif-${Date.now()}`,
      type: 'EXPENSE_ADDED',
      title: toastTitle,
      message: toastDesc,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      senderName: data.transaction.memberName,
      senderAvatar: data.vehicleRefuelData ? '⛽' : '🧾',
    });
    playNotificationChime();
  };

  // Google Maps timeline mileage sync handler
  const handleUpdateVehicleMileage = (vehicleId: string, additionalKm: number) => {
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id === vehicleId) {
          const newMileage = v.currentMileage + additionalKm;
          const consumption = v.avgFuelConsumption || v.averageFuelConsumption || 5.5;
          const fuelUsed = (additionalKm / 100) * consumption;
          const newFuel = Math.max(0, Math.round((v.currentFuelLiters - fuelUsed) * 10) / 10);
          return {
            ...v,
            currentMileage: newMileage,
            currentFuelLiters: newFuel,
          };
        }
        return v;
      })
    );

    setActiveNotification({
      id: `notif-${Date.now()}`,
      type: 'CALENDAR_REMINDER',
      title: 'Zaktualizowano przebieg z Google Maps!',
      message: `Dodano ${additionalKm} km z dzisiejszej trasy do licznika pojazdu oraz przeliczono zużycie paliwa.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      senderName: 'Asystent Tras',
      senderAvatar: '🧭',
    });
    playNotificationChime();
  };

  // 3b. SAVE LIVE SHOPPING BASKET SESSION (SKANER KOSZYKA W SKLEPIE)
  const handleSaveLiveSession = (session: LiveShoppingSession) => {
    // 1. Zapisz sesję w historii
    setLiveSessions((prev) => [session, ...prev.filter((s) => s.id !== session.id)]);

    // 2. Dodaj artykuły do magazynu / spiżarni OD RAZU po zakończeniu zakupów w sklepie
    if (session.items && session.items.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      setPantryItems((prev) => {
        const next = [...prev];
        session.items.forEach((item) => {
          const existingIdx = next.findIndex(
            (p) =>
              p.name.toLowerCase().includes(item.name.toLowerCase().slice(0, 10)) ||
              item.name.toLowerCase().includes(p.name.toLowerCase().slice(0, 10))
          );

          if (existingIdx >= 0) {
            next[existingIdx] = {
              ...next[existingIdx],
              quantity: next[existingIdx].quantity + item.quantity,
              lastPurchasedDate: today,
            };
          } else {
            next.push({
              id: `pan-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              name: item.name,
              category: item.pantryCategory || 'Makarony, ryże i kasze',
              quantity: item.quantity,
              unit: item.unit || 'szt.',
              minQuantity: 1,
              lastPurchasedDate: today,
            });
          }
        });
        return next;
      });
    }

    // 3. Zaktualizuj listę zakupów (oznacz kupione produkty jako zrealizowane)
    setShoppingList((prev) =>
      prev.map((shopItem) => {
        const matched = session.items.find(
          (it) =>
            it.name.toLowerCase().includes(shopItem.name.toLowerCase()) ||
            shopItem.name.toLowerCase().includes(it.name.toLowerCase())
        );
        if (matched) {
          return { ...shopItem, isCompleted: true };
        }
        return shopItem;
      })
    );

    // 4. Wyświetl powiadomienie
    setActiveNotification({
      id: `notif-${Date.now()}`,
      type: 'PANTRY_LOW',
      title: `Koszyk zatwierdzony (${session.storeName})!`,
      message: `Dodano ${session.items.length} pozycji do magazynu (wstępna suma: ${session.estimatedTotal.toFixed(2)} PLN). Po otrzymaniu paragonu zeskanuj go — aplikacja połączy go bez dublowania artykułów.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      senderName: session.memberName,
      senderAvatar: '🛒',
    });
    playNotificationChime();
  };

  // 4. CONSUME ITEM (EMPTY PACKAGE SCANNER DEDUCTION)
  const handleConsumeItem = (data: {
    pantryItemId: string;
    quantityUsed: number;
    addToShoppingList: boolean;
    productName: string;
  }) => {
    let itemAfterDeduction: PantryItem | null = null;

    setPantryItems((prev) =>
      prev.map((item) => {
        if (item.id === data.pantryItemId) {
          const newQty = Math.max(0, item.quantity - data.quantityUsed);
          const updated = { ...item, quantity: newQty };
          itemAfterDeduction = updated;
          return updated;
        }
        return item;
      })
    );

    if (data.addToShoppingList) {
      setShoppingList((prev) => {
        const existing = prev.find((s) => s.name.toLowerCase() === data.productName.toLowerCase());
        if (existing) {
          return prev.map((s) => (s.id === existing.id ? { ...s, isCompleted: false } : s));
        }
        return [
          {
            id: `shop-${Date.now()}`,
            name: data.productName,
            quantity: data.quantityUsed || 1,
            unit: itemAfterDeduction?.unit || 'szt.',
            category: itemAfterDeduction?.category || 'Spożywcze & Supermarket',
            isCompleted: false,
            pantryItemId: data.pantryItemId,
            addedByMemberId: currentMember.id,
            addedAt: new Date().toISOString().split('T')[0],
          },
          ...prev,
        ];
      });
    }
  };

  // 4b. ADD PRODUCTS FROM PHOTO (WITHOUT RECEIPT)
  const handleSaveProductsFromPhoto = (products: Array<{
    name: string;
    quantity: number;
    unit: string;
    category: string;
    location?: string;
    matchedExistingItemId?: string | null;
  }>) => {
    const today = new Date().toISOString().split('T')[0];

    setPantryItems((prev) => {
      const next = [...prev];

      products.forEach((p) => {
        let existingIdx = -1;

        if (p.matchedExistingItemId) {
          existingIdx = next.findIndex((item) => item.id === p.matchedExistingItemId);
        }

        if (existingIdx === -1) {
          existingIdx = next.findIndex(
            (item) =>
              item.name.toLowerCase() === p.name.toLowerCase() ||
              (item.name.toLowerCase().includes(p.name.toLowerCase().slice(0, 10)) &&
                item.category === p.category)
          );
        }

        if (existingIdx >= 0) {
          next[existingIdx] = {
            ...next[existingIdx],
            quantity: next[existingIdx].quantity + p.quantity,
            lastPurchasedDate: today,
            location: p.location || next[existingIdx].location,
          };
        } else {
          next.push({
            id: `pan-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: p.name,
            category: p.category,
            quantity: p.quantity,
            unit: p.unit || 'szt.',
            minQuantity: 1,
            location: p.location || 'Spiżarnia',
            lastPurchasedDate: today,
          });
        }
      });

      return next;
    });

    // Play chime sound and show confirmation toast
    playNotificationChime();
    setActiveNotification({
      id: `notif-${Date.now()}`,
      title: 'Uzupełniono spiżarnię ze zdjęcia!',
      message: `Pomyślnie dodano ${products.length} ${
        products.length === 1 ? 'produkt' : 'produkty/ów'
      } bez paragonu. Stan magazynu został zaktualizowany.`,
      timestamp: new Date().toISOString(),
      senderAvatar: '📸',
      type: 'MESSAGE',
      read: false,
      actionTab: 'pantry',
    });
  };

  // 5. MANUAL TRANSACTION HANDLER
  const handleAddManualTransaction = (txData: {
    date: string;
    title: string;
    amount: number;
    type: TransactionType;
    accountId: string;
    toAccountId?: string;
    categoryId: string;
    categoryName: string;
    memberId: string;
    memberName: string;
    notes?: string;
  }) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (txData.type === 'EXPENSE' && acc.id === txData.accountId) {
          return { ...acc, balance: acc.balance - txData.amount };
        }
        if (txData.type === 'INCOME' && acc.id === txData.accountId) {
          return { ...acc, balance: acc.balance + txData.amount };
        }
        if (txData.type === 'TRANSFER') {
          if (acc.id === txData.accountId) return { ...acc, balance: acc.balance - txData.amount };
          if (acc.id === txData.toAccountId) return { ...acc, balance: acc.balance + txData.amount };
        }
        return acc;
      })
    );

    const newTx: Transaction = {
      id: `tx-${Date.now()}`,
      ...txData,
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [newTx, ...prev]);
    saveHouseholdDoc(householdId, 'transactions', newTx.id, newTx);
  };

  // 6. FAMILY MESSENGER & SHOPPING PROPOSALS
  const handleSendMessage = (
    text: string, 
    isProposal?: boolean, 
    proposedItem?: string,
    voiceData?: { audioUrl: string; duration: number; detectedItems?: string[] }
  ) => {
    const newMsg: FamilyMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentMember.id,
      senderName: currentMember.name,
      senderAvatar: currentMember.avatarEmoji || '👤',
      senderRole: currentMember.role,
      text,
      timestamp: new Date().toISOString(),
      isShoppingProposal: isProposal,
      proposedItemName: proposedItem,
      isAddedToShoppingList: isProposal ? true : false,
      isVoiceNote: !!voiceData,
      audioUrl: voiceData?.audioUrl,
      audioDuration: voiceData?.duration,
      detectedShoppingItems: voiceData?.detectedItems,
    };
    setMessages((prev) => [...prev, newMsg]);
    saveHouseholdDoc(householdId, 'messages', newMsg.id, newMsg);

    // If it is a shopping proposal, automatically add it to the shopping list!
    if (isProposal && proposedItem) {
      const newShopItem: ShoppingListItem = {
        id: `shop-${Date.now()}`,
        name: proposedItem,
        quantity: 1,
        unit: 'szt.',
        category: 'Spożywcze & Supermarket',
        isCompleted: false,
        addedByMemberId: currentMember.id,
        addedAt: new Date().toISOString().split('T')[0],
      };
      setShoppingList((prev) => {
        if (prev.some((item) => item.name.toLowerCase() === proposedItem.toLowerCase())) {
          return prev;
        }
        return [...prev, newShopItem];
      });
      saveHouseholdDoc(householdId, 'shoppingList', newShopItem.id, newShopItem);
    }
  };

  // 6b. SIMULATE INCOMING MESSAGE WITH SOUND CHIME & TOAST NOTIFICATION
  const handleSimulateIncomingMessage = () => {
    // Select other member (not current member)
    const otherMembers = members.filter((m) => m.id !== currentMember.id);
    const sender = otherMembers.length > 0 
      ? otherMembers[Math.floor(Math.random() * otherMembers.length)] 
      : members[0];

    const sampleScenarios = [
      {
        text: 'Cześć! Wracam z pracy i wstępuję do sklepu. Dopisuję do listy zakupów: chleb tostowy, 2 mleka 3.2% i masło extra.',
        isProposal: true,
        item: 'Chleb tostowy, 2 mleka 3.2%, masło extra',
        type: 'SHOPPING_REQUEST' as const,
      },
      {
        text: 'Ktoś wypił ostatni sok pomarańczowy? Dodałam do listy zakupów!',
        isProposal: true,
        item: 'Sok pomarańczowy 100%',
        type: 'SHOPPING_REQUEST' as const,
      },
      {
        text: 'W Biedronce jest promocja na kawę ziarnistą 1kg za 39,99 zł! Kupić jedno opakowanie?',
        isProposal: true,
        item: 'Kawa ziarnista 1kg (Promocja Biedronka)',
        type: 'PROMO_ALERT' as const,
      },
      {
        text: 'Zrobiłem przelew na konto oszczędnościowe z premii kwartalnej. Saldo rodzinne wzrosło!',
        isProposal: false,
        type: 'MESSAGE' as const,
      },
      {
        text: 'Kończą się tabletki do zmywarki i płyn do naczyń. Dopisane do listy!',
        isProposal: true,
        item: 'Tabletki do zmywarki, płyn do naczyń',
        type: 'SHOPPING_REQUEST' as const,
      },
    ];

    const pick = sampleScenarios[Math.floor(Math.random() * sampleScenarios.length)];

    const incomingMsg: FamilyMessage = {
      id: `msg-${Date.now()}`,
      senderId: sender.id,
      senderName: sender.name,
      senderAvatar: sender.avatarEmoji || '👤',
      senderRole: sender.role,
      text: pick.text,
      timestamp: new Date().toISOString(),
      isShoppingProposal: pick.isProposal,
      proposedItemName: pick.item,
      isAddedToShoppingList: pick.isProposal ? true : false,
    };

    setMessages((prev) => [...prev, incomingMsg]);

    if (pick.isProposal && pick.item) {
      setShoppingList((prev) => {
        if (prev.some((item) => item.name.toLowerCase() === pick.item!.toLowerCase())) {
          return prev;
        }
        return [
          ...prev,
          {
            id: `shop-${Date.now()}`,
            name: pick.item!,
            quantity: 1,
            unit: 'szt.',
            category: 'Spożywcze & Supermarket',
            isCompleted: false,
            addedByMemberId: sender.id,
            addedAt: new Date().toISOString().split('T')[0],
          },
        ];
      });
    }

    // 1. Play Web Audio Harmonic Chime
    playNotificationChime();

    // 2. Trigger native OS / browser notification if permitted
    triggerDesktopNotification(
      `Wiadomość od: ${sender.name}`,
      pick.text
    );

    // 3. Set In-App Toast
    setActiveNotification({
      id: `notif-${Date.now()}`,
      title: `Wiadomość od: ${sender.name}`,
      message: pick.text,
      timestamp: new Date().toISOString(),
      senderAvatar: sender.avatarEmoji,
      senderName: sender.name,
      type: pick.type,
      read: false,
      actionTab: 'messages',
    });

    // 4. Increment unread count if user is on another tab
    if (activeTab !== 'messages') {
      setUnreadMessagesCount((prev) => prev + 1);
    }
  };

  const handleAddShoppingItemFromMessage = (messageId: string, itemName: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, isAddedToShoppingList: true } : m))
    );
    setShoppingList((prev) => {
      if (prev.some((item) => item.name.toLowerCase() === itemName.toLowerCase())) {
        return prev;
      }
      return [
        ...prev,
        {
          id: `shop-${Date.now()}`,
          name: itemName,
          quantity: 1,
          unit: 'szt.',
          category: 'Spożywcze & Supermarket',
          isCompleted: false,
          addedByMemberId: currentMember.id,
          addedAt: new Date().toISOString().split('T')[0],
        },
      ];
    });
  };

  // 7. APPLY DEAL TO SHOPPING LIST
  const handleApplyDealToShoppingList = (deal: StoreDeal) => {
    setShoppingList((prev) => {
      const matchIdx = prev.findIndex(
        (item) =>
          deal.matchedShoppingItem &&
          item.name.toLowerCase().includes(deal.matchedShoppingItem.toLowerCase())
      );
      if (matchIdx >= 0) {
        const next = [...prev];
        next[matchIdx] = {
          ...next[matchIdx],
          name: `${deal.product} [${deal.store}: ${deal.promoPrice} zł]`,
        };
        return next;
      }
      return [
        ...prev,
        {
          id: `shop-${Date.now()}`,
          name: `${deal.product} [${deal.store}: ${deal.promoPrice} zł]`,
          quantity: 1,
          unit: 'szt.',
          category: 'Spożywcze & Supermarket',
          isCompleted: false,
          addedByMemberId: currentMember.id,
          addedAt: new Date().toISOString().split('T')[0],
        },
      ];
    });
  };

  // 8. CATEGORY MANAGEMENT
  const handleAddCategory = (newCat: Omit<Category, 'id'>) => {
    const id = `cat-${Date.now()}`;
    const created: Category = { ...newCat, id };
    setCategories((prev) => [...prev, created]);
    saveHouseholdDoc(householdId, 'categories', id, created);
  };

  const handleUpdateCategory = (updatedCat: Category) => {
    setCategories((prev) => prev.map((c) => (c.id === updatedCat.id ? updatedCat : c)));
    saveHouseholdDoc(householdId, 'categories', updatedCat.id, updatedCat);
  };

  const handleDeleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    deleteHouseholdDoc(householdId, 'categories', id);
  };

  const handleClearAllCategories = () => {
    categories.forEach((c) => {
      deleteHouseholdDoc(householdId, 'categories', c.id);
    });
    setCategories([]);
    localStorage.removeItem('domowy_budzet_categories');
  };

  // 9. FAMILY MEMBER MANAGEMENT
  const handleAddMember = (newMem: FamilyMember | Omit<FamilyMember, 'id'>) => {
    const id = ('id' in newMem && newMem.id) ? newMem.id : `mem-${Date.now()}`;
    const created: FamilyMember = { ...newMem, id };
    setMembers((prev) => {
      const exists = prev.some((m) => m.id === id);
      return exists ? prev.map((m) => (m.id === id ? created : m)) : [...prev, created];
    });
    saveHouseholdDoc(householdId, 'members', created.id, created);
    registerMemberAuth({
      id: created.id,
      name: created.name,
      role: created.role,
      pin: created.pin,
      householdId,
      householdName,
    });
  };

  const handleUpdateMember = (updatedMem: FamilyMember) => {
    setMembers((prev) => prev.map((m) => (m.id === updatedMem.id ? updatedMem : m)));
    saveHouseholdDoc(householdId, 'members', updatedMem.id, updatedMem);
    registerMemberAuth({
      id: updatedMem.id,
      name: updatedMem.name,
      role: updatedMem.role,
      pin: updatedMem.pin,
      householdId,
      householdName,
    });
  };

  const handleDeleteMember = (id: string) => {
    if (members.length <= 1) return;
    setMembers((prev) => prev.filter((m) => m.id !== id));
    deleteHouseholdDoc(householdId, 'members', id);
    if (currentMemberId === id) {
      const remaining = members.filter((m) => m.id !== id);
      if (remaining.length > 0) {
        setCurrentMemberId(remaining[0].id);
      }
    }
  };

  // 10. CALENDAR HANDLERS
  const handleAddCalendarEvent = (event: Omit<CalendarEvent, 'id'>) => {
    const id = `evt-${Date.now()}`;
    const newEvent: CalendarEvent = { ...event, id };
    setCalendarEvents((prev) => [...prev, newEvent]);
    saveHouseholdDoc(householdId, 'calendar', newEvent.id, newEvent);

    setActiveNotification({
      id: `notif-${Date.now()}`,
      type: 'MESSAGE',
      title: 'Dodano wydarzenie do kalendarza!',
      message: `${newEvent.title} (${newEvent.date} ${newEvent.startTime})`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      senderName: newEvent.memberName,
      senderAvatar: '📅',
    });
    playNotificationChime();
  };

  const handleUpdateCalendarEvent = (event: CalendarEvent) => {
    setCalendarEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
    saveHouseholdDoc(householdId, 'calendar', event.id, event);
  };

  const handleDeleteCalendarEvent = (id: string) => {
    setCalendarEvents((prev) => prev.filter((e) => e.id !== id));
    deleteHouseholdDoc(householdId, 'calendar', id);
  };

  const handleDismissSuggestion = (id: string) => {
    setCyclicalSuggestions((prev) => prev.filter((s) => s.id !== id));
  };

  // 11. VEHICLE & GARAGE HANDLERS
  const handleAddVehicle = (veh: Omit<Vehicle, 'id'>) => {
    const id = `veh-${Date.now()}`;
    const newVeh: Vehicle = { ...veh, id };
    setVehicles((prev) => [...prev, newVeh]);
    saveHouseholdDoc(householdId, 'vehicles', newVeh.id, newVeh);

    setActiveNotification({
      id: `notif-${Date.now()}`,
      type: 'MESSAGE',
      title: 'Dodano pojazd do garażu!',
      message: `${newVeh.name} (${newVeh.plateNumber})`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      senderName: currentMember.name,
      senderAvatar: '🚗',
    });
    playNotificationChime();
  };

  const handleUpdateVehicle = (veh: Vehicle) => {
    setVehicles((prev) => prev.map((v) => (v.id === veh.id ? veh : v)));
    saveHouseholdDoc(householdId, 'vehicles', veh.id, veh);
  };

  const handleDeleteVehicle = (id: string) => {
    if (vehicles.length <= 1) return;
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    deleteHouseholdDoc(householdId, 'vehicles', id);
  };

  const handleRecordRefuel = (
    log: Omit<RefuelLog, 'id'>,
    updateVehicleFuel: boolean
  ) => {
    const refuelId = `ref-${Date.now()}`;
    const newLog: RefuelLog = { ...log, id: refuelId };
    setRefuelLogs((prev) => [newLog, ...prev]);

    // Update vehicle fuel and odometer
    if (updateVehicleFuel) {
      setVehicles((prev) =>
        prev.map((v) => {
          if (v.id === log.vehicleId) {
            const newFuel = log.fullTank
              ? v.tankCapacity
              : Math.min(v.tankCapacity, v.currentFuelLiters + log.liters);
            const newMileage = Math.max(v.currentMileage, log.currentMileage);

            // Recalculate average consumption if previous distance known
            let newAvg = v.avgFuelConsumption;
            if (v.lastRefuelMileage && newMileage > v.lastRefuelMileage && log.liters > 0) {
              const distance = newMileage - v.lastRefuelMileage;
              if (distance > 50) {
                const calculated = (log.liters / distance) * 100;
                newAvg = parseFloat(calculated.toFixed(1));
              }
            }

            return {
              ...v,
              currentFuelLiters: newFuel,
              currentMileage: newMileage,
              lastRefuelDate: log.date,
              lastRefuelLiters: log.liters,
              lastRefuelMileage: newMileage,
              avgFuelConsumption: newAvg,
            };
          }
          return v;
        })
      );
    }

    // Deduct from account balance if accountId provided
    if (log.accountId && log.totalCost > 0) {
      setAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id === log.accountId) {
            return { ...acc, balance: acc.balance - log.totalCost };
          }
          return acc;
        })
      );

      // Create transaction
      const veh = vehicles.find((v) => v.id === log.vehicleId);
      const fuelCategory = categories.find((c) => c.name.toLowerCase().includes('paliwo') || c.name.toLowerCase().includes('auto'));
      const newTx: Transaction = {
        id: `tx-fuel-${Date.now()}`,
        date: log.date,
        title: `Tankowanie ${log.stationName}: ${veh?.name || 'Auto'}`,
        amount: log.totalCost,
        type: 'EXPENSE',
        accountId: log.accountId,
        categoryId: fuelCategory?.id || 'cat-paliwo',
        categoryName: fuelCategory?.name || 'Paliwo & Transport',
        memberId: currentMember.id,
        memberName: currentMember.name,
        shopName: log.stationName,
        createdAt: new Date().toISOString(),
      };
      setTransactions((prev) => [newTx, ...prev]);
    }

    setActiveNotification({
      id: `notif-${Date.now()}`,
      type: 'EXPENSE_ADDED',
      title: 'Zatankowano auto!',
      message: `Zatankowano ${log.liters.toFixed(1)} L (${log.totalCost.toFixed(2)} PLN) na stacji ${log.stationName}. Rozliczono w budżecie.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      senderName: currentMember.name,
      senderAvatar: '⛽',
    });
    playNotificationChime();
  };

  const handleRecordService = (
    vehicleId: string,
    updates: Partial<Vehicle>,
    cost?: number,
    accountId?: string
  ) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === vehicleId ? { ...v, ...updates } : v))
    );

    if (cost && cost > 0 && accountId) {
      setAccounts((prev) =>
        prev.map((acc) => {
          if (acc.id === accountId) {
            return { ...acc, balance: acc.balance - cost };
          }
          return acc;
        })
      );

      const veh = vehicles.find((v) => v.id === vehicleId);
      const autoCategory = categories.find((c) => c.name.toLowerCase().includes('paliwo') || c.name.toLowerCase().includes('auto'));
      const newTx: Transaction = {
        id: `tx-serv-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        title: `Serwis/Termin: ${veh?.name || 'Pojazd'}`,
        amount: cost,
        type: 'EXPENSE',
        accountId,
        categoryId: autoCategory?.id || 'cat-serwis',
        categoryName: autoCategory?.name || 'Serwis & Utrzymanie',
        memberId: currentMember.id,
        memberName: currentMember.name,
        createdAt: new Date().toISOString(),
      };
      setTransactions((prev) => [newTx, ...prev]);
    }
  };

  // 12. RESET DEMO DATA
  const handleResetData = () => {
    if (window.confirm('Czy na pewno zresetować dane demonstracyjne do stanu początkowego?')) {
      localStorage.clear();
      setMembers(INITIAL_MEMBERS);
      setCurrentMemberId('mem-1');
      setAccounts(INITIAL_ACCOUNTS);
      setCategories(INITIAL_CATEGORIES);
      setPantryItems(INITIAL_PANTRY);
      setShoppingList(INITIAL_SHOPPING_LIST);
      setMessages(INITIAL_MESSAGES);
      setTransactions(INITIAL_TRANSACTIONS);
      setLiveSessions([]);
      setCalendarEvents(INITIAL_CALENDAR_EVENTS);
      setCyclicalSuggestions(INITIAL_CYCLICAL_SUGGESTIONS);
      setVehicles(INITIAL_VEHICLES);
      setRefuelLogs(INITIAL_REFUEL_LOGS);
    }
  };

  const pendingSessions = liveSessions.filter((s) => s.status === 'COMPLETED_WAITING_RECEIPT');
  const activePendingSession = pendingSessions.length > 0 ? pendingSessions[0] : null;

  if (!sessionUser) {
    return (
      <CommercialAuthScreen
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Sticky Header with Member Selector, Quick Buttons, and Tabs */}
      <Header
        currentMember={currentMember}
        allMembers={members}
        householdName={householdName}
        onLogout={handleLogout}
        onSwitchMember={(id) => setCurrentMemberId(id)}
        onOpenReceiptScanner={() => {
          setPreselectedReceiptSessionId(activePendingSession?.id || null);
          setIsReceiptModalOpen(true);
        }}
        onOpenEmptyPackageScanner={() => setIsEmptyPackageModalOpen(true)}
        onOpenPromotionsModal={() => setIsPromotionsModalOpen(true)}
        onOpenScanProductsModal={() => setIsScanProductsModalOpen(true)}
        onOpenLiveAssistant={() => setIsLiveAssistantModalOpen(true)}
        pendingShoppingSession={activePendingSession}
        onOpenNewTransaction={() => setIsNewTxModalOpen(true)}
        onResetData={handleResetData}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        totalHouseholdBalance={totalHouseholdBalance}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadCount={unreadMessagesCount}
        calendarBadgeCount={cyclicalSuggestions.length}
        garageBadgeCount={vehicles.filter((v) => (v.currentFuelLiters / v.tankCapacity) <= 0.25).length}
      />

      {/* Banner informujący o oczekującym koszyku w sklepie */}
      {activePendingSession && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white shadow-sm border-b border-amber-800">
          <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-white/20">
                <ShoppingCart className="w-4 h-4 text-amber-200" />
              </span>
              <div>
                <span className="font-bold">Oczekujący koszyk: {activePendingSession.storeName}</span>
                <span className="ml-2">
                  (wstępna suma: <strong>{activePendingSession.estimatedTotal.toFixed(2)} PLN</strong>, {activePendingSession.items.length} pozycji dodanych do magazynu).
                </span>
                <span className="hidden lg:inline ml-2 text-amber-200">
                  Zeskanuj paragon kasowy — ostateczna kwota zostanie zaktualizowana bez dublowania artykułów!
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setPreselectedReceiptSessionId(activePendingSession.id);
                  setIsReceiptModalOpen(true);
                }}
                className="px-3 py-1 bg-white hover:bg-amber-100 text-amber-950 font-bold rounded-lg text-xs shadow-xs transition flex items-center gap-1.5"
              >
                <span>Skanuj paragon (Bez dublowania)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating In-App Notification Toast */}
      {activeNotification && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md w-full bg-slate-900 text-white rounded-2xl shadow-2xl border border-indigo-500/40 p-4 transition-all duration-300 animate-in slide-in-from-top-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-xl flex-shrink-0">
              {activeNotification.senderAvatar || '🔔'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  {activeNotification.title}
                </span>
                <span className="text-[10px] text-slate-400">Teraz</span>
              </div>
              <p className="text-xs text-slate-200 mt-1 line-clamp-2 leading-relaxed">
                {activeNotification.message}
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('messages');
                    setActiveNotification(null);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Otwórz czat</span>
                  <ArrowRight className="w-3 h-3 ml-0.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveNotification(null)}
                  className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                >
                  Zamknij
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveNotification(null)}
              className="text-slate-400 hover:text-slate-200 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Tab 1: Dashboard & Accounts */}
        {activeTab === 'dashboard' && (
          <AccountsOverview
            accounts={accounts}
            currentMember={currentMember}
            allMembers={members}
            onAddAccount={handleAddAccount}
            onUpdateAccount={handleUpdateAccount}
            onDeleteAccount={handleDeleteAccount}
            onTransfer={handleTransfer}
            onOpenReceiptScanner={() => setIsReceiptModalOpen(true)}
            onOpenEmptyPackageScanner={() => setIsEmptyPackageModalOpen(true)}
          />
        )}

        {/* Tab 2: Pantry & Magazyn */}
        {activeTab === 'pantry' && (
          <PantryManager
            pantryItems={pantryItems}
            shoppingList={shoppingList}
            currentMember={currentMember}
            onUpdatePantryItem={(item) => {
              setPantryItems((prev) => prev.map((p) => (p.id === item.id ? item : p)));
              saveHouseholdDoc(householdId, 'pantry', item.id, item);
            }}
            onAddPantryItem={(item) => {
              const newItem = { ...item, id: `pan-${Date.now()}` };
              setPantryItems((prev) => [...prev, newItem]);
              saveHouseholdDoc(householdId, 'pantry', newItem.id, newItem);
            }}
            onDeletePantryItem={(id) => {
              setPantryItems((prev) => prev.filter((p) => p.id !== id));
              deleteHouseholdDoc(householdId, 'pantry', id);
            }}
            onUpdateShoppingItem={(item) => {
              setShoppingList((prev) => prev.map((s) => (s.id === item.id ? item : s)));
              saveHouseholdDoc(householdId, 'shoppingList', item.id, item);
            }}
            onAddShoppingItem={(item) => {
              const newItem = { ...item, id: `shop-${Date.now()}`, addedAt: new Date().toISOString().split('T')[0] };
              setShoppingList((prev) => [newItem, ...prev]);
              saveHouseholdDoc(householdId, 'shoppingList', newItem.id, newItem);
            }}
            onDeleteShoppingItem={(id) => {
              setShoppingList((prev) => prev.filter((s) => s.id !== id));
              deleteHouseholdDoc(householdId, 'shoppingList', id);
            }}
            onOpenEmptyPackageScanner={() => setIsEmptyPackageModalOpen(true)}
            onOpenReceiptScanner={() => setIsReceiptModalOpen(true)}
            onOpenPromotionsModal={() => setIsPromotionsModalOpen(true)}
            onOpenScanProductsModal={() => setIsScanProductsModalOpen(true)}
          />
        )}

        {/* Tab 3: Inteligentny Kalendarz & Asystent Dnia */}
        {activeTab === 'calendar' && (
          <SmartCalendarManager
            events={calendarEvents}
            suggestions={cyclicalSuggestions}
            currentMember={currentMember}
            allMembers={members}
            shoppingList={shoppingList}
            pantryItems={pantryItems}
            onAddEvent={handleAddCalendarEvent}
            onUpdateEvent={handleUpdateCalendarEvent}
            onDeleteEvent={handleDeleteCalendarEvent}
            onDismissSuggestion={handleDismissSuggestion}
            onOpenShoppingList={() => setActiveTab('pantry')}
          />
        )}

        {/* Tab 4: Moje Samochody & Garaż Domowy */}
        {activeTab === 'garage' && (
          <GarageManager
            vehicles={vehicles}
            refuelLogs={refuelLogs}
            allMembers={members}
            accounts={accounts}
            categories={categories}
            currentMember={currentMember}
            onAddVehicle={handleAddVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            onRecordRefuel={handleRecordRefuel}
            onRecordService={handleRecordService}
          />
        )}

        {/* Tab: Trasy, Dojazdy & Pogoda (Google Timeline Assistant) */}
        {activeTab === 'commute' && (
          <CommuteWeatherAssistant
            vehicles={vehicles}
            onUpdateVehicleMileage={handleUpdateVehicleMileage}
          />
        )}

        {/* Tab 5: Komunikator & Czat Rodzinny */}
        {activeTab === 'messages' && (
          <FamilyMessenger
            messages={messages}
            currentMember={currentMember}
            allMembers={members}
            onSendMessage={handleSendMessage}
            onAddShoppingItemFromMessage={handleAddShoppingItemFromMessage}
            onOpenPromotionsModal={() => setIsPromotionsModalOpen(true)}
            onSimulateIncomingMessage={handleSimulateIncomingMessage}
            shoppingListCount={shoppingList.filter((i) => !i.isCompleted).length}
          />
        )}

        {/* Tab 4: Budget & Categories */}
        {activeTab === 'budget' && (
          <BudgetAndCategories
            categories={categories}
            transactions={transactions}
            currentMember={currentMember}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
            onClearAllCategories={handleClearAllCategories}
          />
        )}

        {/* Tab 5: Transactions History */}
        {activeTab === 'transactions' && (
          <TransactionList
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            allMembers={members}
            currentMember={currentMember}
            onDeleteTransaction={(id) =>
              setTransactions((prev) => prev.filter((t) => t.id !== id))
            }
            onOpenReceiptScanner={() => setIsReceiptModalOpen(true)}
          />
        )}

        {/* Tab 6: Family & Permissions */}
        {activeTab === 'family' && (
          <FamilyAndPermissions
            allMembers={members}
            currentMember={currentMember}
            accounts={accounts}
            householdId={householdId}
            householdName={householdName}
            onAddMember={handleAddMember}
            onUpdateMember={handleUpdateMember}
            onDeleteMember={handleDeleteMember}
            onSwitchMember={(id) => setCurrentMemberId(id)}
          />
        )}
      </main>

      {/* MODAL 1: Skaner Paragonów */}
      <ReceiptScannerModal
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setPreselectedReceiptSessionId(null);
        }}
        accounts={accounts}
        categories={categories}
        currentMember={currentMember}
        allMembers={members}
        pendingShoppingSessions={pendingSessions}
        preselectedSessionId={preselectedReceiptSessionId}
        vehicles={vehicles}
        onSaveReceipt={handleSaveReceipt}
      />

      {/* MODAL 2: Skaner Pustych Opakowań */}
      <EmptyPackageScannerModal
        isOpen={isEmptyPackageModalOpen}
        onClose={() => setIsEmptyPackageModalOpen(false)}
        pantryItems={pantryItems}
        onConsumeItem={handleConsumeItem}
      />

      {/* MODAL 3: Ręczna Operacja */}
      <NewTransactionModal
        isOpen={isNewTxModalOpen}
        onClose={() => setIsNewTxModalOpen(false)}
        accounts={accounts}
        categories={categories}
        currentMember={currentMember}
        allMembers={members}
        onAddTransaction={handleAddManualTransaction}
      />

      {/* MODAL 4: Sprawdzanie Promocji na podstawie Listy Zakupowej */}
      <PromotionsCheckerModal
        isOpen={isPromotionsModalOpen}
        onClose={() => setIsPromotionsModalOpen(false)}
        shoppingList={shoppingList}
        onApplyDealToShoppingList={handleApplyDealToShoppingList}
      />

      {/* MODAL 5: Dodawanie Produktów ze Zdjęcia (bez paragonu) */}
      <ScanPantryProductsModal
        isOpen={isScanProductsModalOpen}
        onClose={() => setIsScanProductsModalOpen(false)}
        pantryItems={pantryItems}
        onAddProducts={handleSaveProductsFromPhoto}
      />

      {/* MODAL 6: Asystent Zakupów na Żywo (Skaner Koszyka w sklepie) */}
      <LiveShoppingAssistantModal
        isOpen={isLiveAssistantModalOpen}
        onClose={() => setIsLiveAssistantModalOpen(false)}
        currentMember={currentMember}
        accounts={accounts}
        categories={categories}
        shoppingList={shoppingList}
        onSaveSession={handleSaveLiveSession}
        onOpenReceiptScanner={(sessionId) => {
          setPreselectedReceiptSessionId(sessionId || null);
          setIsReceiptModalOpen(true);
        }}
      />

      {/* MODAL 7: Pobierz / Zainstaluj na telefon (PWA) */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </div>
  );
}
