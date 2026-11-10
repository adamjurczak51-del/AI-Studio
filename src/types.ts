export type FamilyRole = 'ADMIN' | 'MANAGER' | 'MEMBER' | 'CHILD';

export interface FamilyPermissions {
  canViewAllAccounts: boolean;
  canManageAccounts: boolean;
  canManageCategories: boolean;
  canManageBudget: boolean;
  canManageFamily: boolean;
  canManagePantry: boolean;
  canScanReceipts: boolean;
  canViewFamilyTotalBalance: boolean;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: FamilyRole;
  avatarColor: string;
  avatarEmoji?: string;
  assignedAccountIds: string[];
  permissions: FamilyPermissions;
  email?: string;
  login?: string; // Login / Imię i Nazwisko użytkownika
  password?: string; // Hasło główne nadrzędne
  pin?: string; // 4-cyfrowy kod PIN do szybkiego logowania
  isInvitePending?: boolean;
  inviteCode?: string;
  invitedAt?: string;
  lastLoginAt?: string;
}

export interface UserAuthProfile {
  login: string;
  passwordHash: string;
  pin: string;
  householdId: string;
  householdName: string;
  memberId: string;
  memberName: string;
  role: FamilyRole;
  createdAt: string;
}

export interface PersonalizedInvite {
  token: string;
  householdId: string;
  householdName: string;
  invitedByMemberName: string;
  targetMemberId: string;
  targetMemberName: string;
  targetRole: FamilyRole;
  assignedAccountIds: string[];
  permissions: FamilyPermissions;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED';
  createdAt: string;
}

export type AccountType = 'checking' | 'savings' | 'cash' | 'card' | 'piggybank' | 'investment';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  color: string;
  iconName: string;
  ownerMemberIds: string[];
  goalAmount?: number;
  accountNumber?: string;
  description?: string;
  isArchived?: boolean;
}

export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export interface TransactionItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  category: string;
  isPantryItem?: boolean;
  pantryCategory?: string;
}

export interface Transaction {
  id: string;
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
  receiptNumber?: string;
  shopName?: string;
  items?: TransactionItem[];
  createdAt: string;
  linkedShoppingSessionId?: string;
  isReconciledFromBasket?: boolean;
  assignedVehicleId?: string;
  isVehicleExpense?: boolean;
}

export interface CommuteRoutine {
  id?: string;
  title?: string;
  origin?: string;
  destination?: string;
  departureTime: string; // np. "06:30"
  returnTime?: string; // np. "16:00"
  daysOfWeek: number[]; // [1, 2, 3, 4, 5] (Pn-Pt)
  distanceKm?: number;
  typicalDurationMinutes?: number;
  distanceKmOneWay?: number;
  assignedVehicleId: string;
  googleConnected?: boolean;
  googleAccountEmail?: string;
  lastSyncDate?: string;
  enabled?: boolean;
  isActive?: boolean;
  workAddress?: string;
  homeAddress?: string;
}

export interface HouseholdConfig {
  familyName: string;
  currency: string;
  isCleanProductionMode: boolean;
  securityPinRequired: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: 'EXPENSE' | 'INCOME';
  icon: string;
  color: string;
  monthlyBudget?: number;
  subcategories: string[];
  isDefault?: boolean;
}

export interface PantryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minQuantity: number;
  expiryDate?: string;
  lastPurchasedDate?: string;
  location?: string;
  notes?: string;
  receiptItemId?: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  isCompleted: boolean;
  pantryItemId?: string;
  addedByMemberId?: string;
  addedAt: string;
}

export interface ScannedReceiptResult {
  shopName: string;
  date: string;
  totalAmount: number;
  receiptNumber?: string;
  paymentMethod?: string;
  suggestedAccount?: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    category: string;
    isPantryItem: boolean;
    pantryCategory?: string;
  }>;
}

export interface EmptyPackageResult {
  recognizedProduct: string;
  brand?: string;
  category: string;
  matchedItemId: string | null;
  matchedItemName: string | null;
  quantityUsed: number;
  isEmpty: boolean;
  addToShoppingList: boolean;
  confidenceNote: string;
}

export interface ScannedPantryProduct {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  location?: string;
  matchedExistingItemId?: string | null;
  matchedExistingItemName?: string | null;
  confidence?: 'high' | 'medium' | 'low';
  notes?: string;
  isSelected?: boolean;
}

export interface ScannedPantryProductsResult {
  photoSummary: string;
  products: ScannedPantryProduct[];
}

export interface FamilyMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderRole: string;
  text: string;
  timestamp: string;
  isShoppingProposal?: boolean;
  proposedItemName?: string;
  isAddedToShoppingList?: boolean;
  pinned?: boolean;
  isVoiceNote?: boolean;
  audioUrl?: string;
  audioDuration?: number;
  detectedShoppingItems?: string[];
}

export interface StoreDeal {
  product: string;
  store: string;
  promoPrice: number;
  regularPrice?: number;
  dealDescription: string;
  validUntil?: string;
  sourceUrl?: string;
  matchedShoppingItem?: string;
}

export interface PromoAnalysisResult {
  cityOrRegion: string;
  analyzedAt: string;
  totalEstimatedSavings: number;
  recommendedStore: string;
  deals: StoreDeal[];
  generalStoreTips: string[];
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  senderAvatar?: string;
  senderName?: string;
  type: 'MESSAGE' | 'VOICE_NOTE' | 'SHOPPING_REQUEST' | 'PROMO_ALERT' | 'EXPENSE_ADDED' | 'PANTRY_LOW' | 'BASKET_SESSION' | 'CALENDAR_REMINDER' | 'COMMUTE_ALERT';
  read?: boolean;
  actionTab?: string;
}

export interface LiveBasketItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  category: string;
  pantryCategory?: string;
  isPantryItem: boolean;
  photoUrl?: string;
  confidenceNote?: string;
  scannedAt: string;
  reconciled?: boolean;
}

export interface LiveShoppingSession {
  id: string;
  storeName: string;
  startedAt: string;
  completedAt?: string;
  memberId: string;
  memberName: string;
  accountId: string;
  categoryId: string;
  status: 'ACTIVE' | 'COMPLETED_WAITING_RECEIPT' | 'RECONCILED_WITH_RECEIPT';
  items: LiveBasketItem[];
  estimatedTotal: number;
  actualReceiptTotal?: number;
  receiptNumber?: string;
  reconciledAt?: string;
}

export interface ScannedBasketProductResult {
  name: string;
  estimatedPrice: number;
  quantity: number;
  unit: string;
  category: string;
  pantryCategory?: string;
  isPantryItem: boolean;
  confidenceNote: string;
}

// ----------------------------------------------------
// INTELIGENTNY KALENDARZ DOMOWY I ASYSTENT CYKLI
// ----------------------------------------------------
export type CalendarCategoryType = 
  | 'KOREPETYCJE_SZKOLA'
  | 'LEKARZ_ZDROWIE'
  | 'ZAKUPY_SPRAWUNKI'
  | 'SPORT_ROZRYWKA'
  | 'AUTO_SERWIS'
  | 'PRACA'
  | 'INNE';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime?: string; // HH:mm
  memberId: string;
  memberName: string;
  category: CalendarCategoryType;
  location?: string;
  nearbyStoreHint?: string; // np. "Kaufland przy ul. Wrocławskiej"
  isRecurring?: boolean;
  recurrenceDayOfWeek?: number; // 1=Pon, 2=Wt, 3=Śr, 4=Czw, 5=Pt, 6=Sob, 0=Ndz
  recurrencePattern?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  completed?: boolean;
  createdAt?: string;
}

export interface CyclicalHabitSuggestion {
  id: string;
  title: string;
  memberId: string;
  memberName: string;
  dayOfWeek: number; // np. 3 dla środy
  dayName: string; // "Środa"
  time: string; // "18:00"
  category: CalendarCategoryType;
  location: string;
  reason: string;
  suggestedDate: string; // YYYY-MM-DD
  nearbyShop?: string;
}

// ----------------------------------------------------
// MOJE SAMOCHODY & GARAŻ DOMOWY
// ----------------------------------------------------
export type FuelType = 'DIESEL' | 'PETROL' | 'LPG' | 'HYBRID' | 'ELECTRIC';

export interface Vehicle {
  id: string;
  name: string; // np. "Skoda Octavia Combi 2.0 TDI"
  brand?: string;
  model?: string;
  plateNumber: string; // np. "DW 4821A"
  fuelType: FuelType;
  tankCapacity: number; // np. 50 (litry)
  fuelTankCapacity?: number;
  currentFuelLiters: number; // szacowana aktualna ilość paliwa (l)
  avgFuelConsumption: number; // l/100km
  averageFuelConsumption?: number;
  currentMileage: number; // aktualny przebieg km (np. 184500)
  assignedMemberId: string;
  assignedMemberName: string;
  
  // Przegląd techniczny
  technicalInspectionDate: string; // YYYY-MM-DD
  technicalInspectionCost?: number;
  
  // Ubezpieczenie OC / AC
  insuranceExpiryDate: string; // YYYY-MM-DD
  insuranceCost?: number;
  insurancePolicyNumber?: string;
  insuranceCompany?: string;
  
  // Serwis i wymiana oleju
  lastOilServiceMileage: number; // km przy ostatnim serwisie
  lastOilServiceDate: string;
  oilServiceIntervalKm: number; // np. 15000 km
  
  // Ostatnie tankowanie
  lastRefuelDate: string; // YYYY-MM-DD
  lastRefuelLiters: number;
  lastRefuelMileage: number;
  
  avatarEmoji: string;
  colorHex?: string;
}

export interface RefuelLog {
  id: string;
  vehicleId: string;
  date: string;
  liters: number;
  totalCost: number;
  pricePerLiter: number;
  currentMileage: number;
  stationName: string; // np. "Orlen", "Shell", "Circle K", "Kaufland Stacja"
  fullTank: boolean;
  accountId?: string;
  receiptNumber?: string;
  receiptImageUrl?: string;
}



