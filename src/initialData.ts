import { 
  Account, 
  Category, 
  FamilyMember, 
  FamilyMessage, 
  PantryItem, 
  ShoppingListItem, 
  StoreDeal, 
  Transaction,
  CalendarEvent,
  CyclicalHabitSuggestion,
  Vehicle,
  RefuelLog
} from './types';

export const INITIAL_MEMBERS: FamilyMember[] = [
  {
    id: 'mem-1',
    name: 'Główny Administrator',
    role: 'ADMIN',
    avatarColor: 'bg-indigo-600',
    avatarEmoji: '👑',
    email: '',
    assignedAccountIds: ['acc-1'],
    permissions: {
      canViewAllAccounts: true,
      canManageAccounts: true,
      canManageCategories: true,
      canManageBudget: true,
      canManageFamily: true,
      canManagePantry: true,
      canScanReceipts: true,
      canViewFamilyTotalBalance: true,
    },
  },
];

export const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'acc-1',
    name: 'Konto Główne',
    type: 'checking',
    balance: 0.00,
    currency: 'PLN',
    color: '#3b82f6',
    iconName: 'Landmark',
    ownerMemberIds: ['mem-1'],
    description: 'Konto codzienne',
  },
];

export const INITIAL_CATEGORIES: Category[] = [];


export const INITIAL_PANTRY: PantryItem[] = [];

export const INITIAL_SHOPPING_LIST: ShoppingListItem[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_MESSAGES: FamilyMessage[] = [];

// ----------------------------------------------------
// DANE POCZĄTKOWE: KALENDARZ DOMOWY & ASYSTENT
// ----------------------------------------------------
export const INITIAL_CALENDAR_EVENTS: CalendarEvent[] = [];

export const INITIAL_CYCLICAL_SUGGESTIONS: CyclicalHabitSuggestion[] = [];

// ----------------------------------------------------
// DANE POCZĄTKOWE: MOJE SAMOCHODY & GARAŻ DOMOWY
// ----------------------------------------------------
export const INITIAL_VEHICLES: Vehicle[] = [];

export const INITIAL_REFUEL_LOGS: RefuelLog[] = [];



