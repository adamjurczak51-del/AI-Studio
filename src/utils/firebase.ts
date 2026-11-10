import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  query,
  where,
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore (with explicit databaseId if provided in config)
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Test Firestore connection on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore client is offline or checking connection.');
    }
  }
}
testConnection();

// Utility to recursively sanitize data for Firestore (stripping undefined values and converting invalid formats)
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as any;
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean as any;
  }
  return obj;
}

// Set or update a single document in a household subcollection
export async function saveHouseholdDoc(
  householdId: string,
  subcollection: string,
  docId: string,
  data: any
) {
  try {
    const cleanData = sanitizeForFirestore(data);
    const docRef = doc(db, 'households', householdId, subcollection, docId);
    await setDoc(docRef, cleanData, { merge: true });
  } catch (err) {
    console.error(`Error saving ${subcollection}/${docId}:`, err);
  }
}

// Delete a document
export async function deleteHouseholdDoc(
  householdId: string,
  subcollection: string,
  docId: string
) {
  try {
    const docRef = doc(db, 'households', householdId, subcollection, docId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Error deleting ${subcollection}/${docId}:`, err);
  }
}

// Seed initial data if the household subcollections are empty
export async function seedHouseholdIfEmpty(
  householdId: string,
  data: {
    members: any[];
    accounts: any[];
    categories?: any[];
    pantry: any[];
    shoppingList: any[];
    messages: any[];
    calendarEvents: any[];
    vehicles: any[];
    refuelLogs: any[];
    transactions: any[];
  }
) {
  // STRICT: Only seed mock demo data if this is the explicit demo sandbox ('rodzina-glowna')
  // Real commercial families registered by users start 100% clean with only their own data!
  if (householdId !== 'rodzina-glowna') {
    return;
  }

  try {
    const membersSnap = await getDocs(collection(db, 'households', householdId, 'members'));
    if (membersSnap.empty) {
      const batch = writeBatch(db);

      // Seed household root
      batch.set(doc(db, 'households', householdId), {
        id: householdId,
        createdAt: new Date().toISOString(),
        synced: true,
      });

      // Seed members
      data.members.forEach((m) => {
        batch.set(doc(db, 'households', householdId, 'members', m.id), m);
      });

      // Seed accounts
      data.accounts.forEach((a) => {
        batch.set(doc(db, 'households', householdId, 'accounts', a.id), a);
      });

      // Seed pantry
      data.pantry.forEach((p) => {
        batch.set(doc(db, 'households', householdId, 'pantry', p.id), p);
      });

      // Seed shoppingList
      data.shoppingList.forEach((s) => {
        batch.set(doc(db, 'households', householdId, 'shoppingList', s.id), s);
      });

      // Seed messages
      data.messages.forEach((msg) => {
        batch.set(doc(db, 'households', householdId, 'messages', msg.id), msg);
      });

      // Seed calendar
      data.calendarEvents.forEach((ev) => {
        batch.set(doc(db, 'households', householdId, 'calendar', ev.id), ev);
      });

      // Seed vehicles
      data.vehicles.forEach((v) => {
        batch.set(doc(db, 'households', householdId, 'vehicles', v.id), v);
      });

      // Seed transactions
      data.transactions.forEach((tx) => {
        batch.set(doc(db, 'households', householdId, 'transactions', tx.id), tx);
      });

      await batch.commit();
      console.log(`Household ${householdId} seeded successfully to Firestore.`);
    }
  } catch (err) {
    console.error('Error seeding initial data to Firestore:', err);
  }
}

// =========================================================================
// COMMERCIAL MULTI-TENANT SAAS AUTH & INVITATION SYSTEM
// =========================================================================

export function normalizeLogin(login: string): string {
  return login
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '');
}

/**
 * 1. Register a new independent Household & Admin User
 */
export async function registerNewHouseholdAdmin(params: {
  adminName: string;
  adminLogin?: string;
  password: string;
  pin: string;
  familyName: string;
  accountName?: string;
  initialBalance?: number;
}): Promise<{ householdId: string; adminMemberId: string; loginKey: string }> {
  const householdSlug = normalizeLogin(params.familyName) || 'dom';
  const householdId = `${householdSlug}-${Date.now().toString(36)}`;
  const adminMemberId = `mem-admin-${Date.now().toString(36)}`;
  const accId = `acc-main-${Date.now().toString(36)}`;
  const rawLogin = params.adminLogin?.trim() || params.adminName.trim();
  const loginKey = normalizeLogin(rawLogin);

  const batch = writeBatch(db);

  // 1. Create Household Root
  const householdRef = doc(db, 'households', householdId);
  batch.set(householdRef, {
    id: householdId,
    familyName: params.familyName,
    adminMemberId,
    adminName: params.adminName,
    createdAt: new Date().toISOString(),
    isCommercial: true,
  });

  // 2. Create Admin Member (Full permissions)
  const memberRef = doc(db, 'households', householdId, 'members', adminMemberId);
  batch.set(memberRef, {
    id: adminMemberId,
    name: params.adminName,
    login: rawLogin,
    password: params.password,
    pin: params.pin,
    role: 'ADMIN',
    avatarColor: 'bg-indigo-600',
    avatarEmoji: '👑',
    assignedAccountIds: [accId],
    permissions: {
      canViewAllAccounts: true,
      canViewFamilyTotalBalance: true,
      canManageAccounts: true,
      canManageBudget: true,
      canManageCategories: true,
      canScanReceipts: true,
      canManagePantry: true,
      canManageFamily: true,
    },
    createdAt: new Date().toISOString(),
  });

  // 3. Create First Checking Account
  const accRef = doc(db, 'households', householdId, 'accounts', accId);
  batch.set(accRef, {
    id: accId,
    name: params.accountName || 'Konto Główne',
    type: 'checking',
    balance: params.initialBalance || 0,
    currency: 'PLN',
    color: 'bg-emerald-600',
    iconName: 'Wallet',
    ownerMemberIds: [adminMemberId],
  });

  // 4. Register in global Auth Users directory for rapid login
  const authRef = doc(db, 'authUsers', loginKey);
  batch.set(authRef, {
    loginKey,
    login: rawLogin,
    name: params.adminName,
    password: params.password,
    pin: params.pin,
    householdId,
    householdName: params.familyName,
    memberId: adminMemberId,
    role: 'ADMIN',
    createdAt: new Date().toISOString(),
  });

  await batch.commit();

  return { householdId, adminMemberId, loginKey };
}

// Helper for timeout protection so Firestore never blocks UI indefinitely
function withTimeout<T>(promise: Promise<T>, ms = 4000, fallbackVal?: T): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((resolve, reject) => {
    timeoutId = setTimeout(() => {
      if (fallbackVal !== undefined) {
        resolve(fallbackVal);
      } else {
        reject(new Error('TIMEOUT'));
      }
    }, ms);
  });
  return Promise.race([
    promise.then((val) => {
      clearTimeout(timeoutId);
      return val;
    }),
    timeoutPromise,
  ]);
}

/**
 * Helper to automatically register or update any family member in authUsers collection
 */
export async function registerMemberAuth(member: {
  id: string;
  name: string;
  role: string;
  pin?: string;
  password?: string;
  householdId: string;
  householdName: string;
}): Promise<void> {
  const loginKey = normalizeLogin(member.name);
  if (!loginKey) return;
  const userDoc = {
    loginKey,
    login: member.name,
    name: member.name,
    role: member.role,
    householdId: member.householdId,
    householdName: member.householdName,
    memberId: member.id,
    pin: member.pin || '1234',
    password: member.password || '',
    createdAt: new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, 'authUsers', loginKey), sanitizeForFirestore(userDoc), { merge: true });
    const simpleKey = member.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (simpleKey && simpleKey !== loginKey) {
      await setDoc(doc(db, 'authUsers', simpleKey), sanitizeForFirestore(userDoc), { merge: true });
    }
  } catch (err) {
    console.error('Error registering member auth in Firestore:', err);
  }
}

/**
 * 2. Authenticate User by Login + Password or PIN (with deep fuzzy search and household fallback)
 */
export async function authenticateCommercialUser(params: {
  login: string;
  password?: string;
  pin?: string;
}): Promise<{
  success: boolean;
  message?: string;
  userAuth?: any;
}> {
  const cleanLogin = params.login.trim();
  const loginKey = normalizeLogin(cleanLogin);
  if (!loginKey && !cleanLogin) {
    return { success: false, message: 'Podaj poprawny login lub imię i nazwisko.' };
  }

  // 1. Check local cache first for instant response
  let cachedUser: any = null;
  try {
    const raw = localStorage.getItem('cached_auth_' + loginKey);
    if (raw) cachedUser = JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading local auth cache:', e);
  }

  let userData = cachedUser;

  // 2. Direct document lookup in authUsers
  try {
    const authSnap = await withTimeout(getDoc(doc(db, 'authUsers', loginKey)), 3000, null);
    if (authSnap && authSnap.exists()) {
      userData = authSnap.data();
      try {
        localStorage.setItem('cached_auth_' + loginKey, JSON.stringify(userData));
      } catch {}
    }
  } catch (err: any) {
    console.warn('Firestore direct auth query notice:', err);
  }

  // 3. Fallback: Search all authUsers for name or login match (case-insensitive, ignoring dots/spaces)
  if (!userData) {
    try {
      const allAuthSnap = await withTimeout(getDocs(collection(db, 'authUsers')), 3500, null);
      if (allAuthSnap && !allAuthSnap.empty) {
        const rawLower = cleanLogin.toLowerCase();
        const matchedDoc = allAuthSnap.docs.find((d) => {
          const dData = d.data();
          const dName = (dData.name || '').toLowerCase();
          const dLogin = (dData.login || '').toLowerCase();
          const dKey = (dData.loginKey || d.id || '').toLowerCase();
          return (
            dKey === loginKey ||
            dName === rawLower ||
            dLogin === rawLower ||
            dKey.includes(loginKey) ||
            dName.includes(rawLower) ||
            rawLower.includes(dName)
          );
        });

        if (matchedDoc) {
          userData = matchedDoc.data();
          try {
            localStorage.setItem('cached_auth_' + loginKey, JSON.stringify(userData));
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Fuzzy auth query notice:', err);
    }
  }

  // 4. Fallback: Search members in households subcollections if member was registered without authUsers record
  if (!userData) {
    try {
      const hhSnap = await withTimeout(getDocs(collection(db, 'households')), 3500, null);
      if (hhSnap && !hhSnap.empty) {
        const rawLower = cleanLogin.toLowerCase();
        for (const hDoc of hhSnap.docs) {
          const memSnap = await withTimeout(getDocs(collection(db, 'households', hDoc.id, 'members')), 3000, null);
          if (memSnap && !memSnap.empty) {
            const matchedMem = memSnap.docs.find((m) => {
              const mData = m.data();
              const mName = (mData.name || '').toLowerCase();
              return (
                mName === rawLower ||
                normalizeLogin(mData.name || '') === loginKey ||
                mName.includes(rawLower) ||
                rawLower.includes(mName)
              );
            });

            if (matchedMem) {
              const mData = matchedMem.data();
              userData = {
                loginKey,
                login: mData.name,
                name: mData.name,
                role: mData.role || 'MEMBER',
                householdId: hDoc.id,
                householdName: hDoc.data()?.familyName || 'Gospodarstwo Domowe',
                memberId: matchedMem.id,
                pin: mData.pin || '1234',
                password: mData.password || '',
                createdAt: new Date().toISOString(),
              };
              // Save into authUsers collection for future fast logins
              await setDoc(doc(db, 'authUsers', loginKey), sanitizeForFirestore(userData));
              break;
            }
          }
        }
      }
    } catch (err) {
      console.warn('Fallback household member lookup notice:', err);
    }
  }

  if (!userData) {
    return { success: false, message: 'Nie znaleziono użytkownika o takim loginie / nazwisku w żadnej zarejestrowanej rodzinie.' };
  }

  // Check PIN first if PIN provided
  if (params.pin) {
    if (userData.pin === params.pin || (!userData.pin && params.pin === '1234')) {
      return { success: true, userAuth: userData };
    }
    return { success: false, message: 'Nieprawidłowy kod PIN. Wpisz poprawny PIN lub zaloguj się hasłem nadrzędnym.' };
  }

  // Check Password (master authority)
  if (params.password) {
    if (userData.password === params.password) {
      return { success: true, userAuth: userData };
    }
    return { success: false, message: 'Nieprawidłowe hasło nadrzędne.' };
  }

  return { success: false, message: 'Podaj hasło lub kod PIN.' };
}

/**
 * 3. Quick PIN login for a known member on the current device
 */
export async function quickPinLogin(householdId: string, memberId: string, pin: string): Promise<boolean> {
  try {
    const memSnap = await withTimeout(getDoc(doc(db, 'households', householdId, 'members', memberId)), 3000, null);
    if (memSnap && memSnap.exists()) {
      const data = memSnap.data();
      return data.pin === pin;
    }
  } catch (err) {
    console.error('Quick PIN check error:', err);
  }
  return false;
}

/**
 * 4. Create and Save a Personalized Invite Token for a Family Member
 */
export async function createPersonalizedInvite(invite: {
  token: string;
  householdId: string;
  householdName: string;
  invitedByMemberName: string;
  targetMemberId: string;
  targetMemberName: string;
  targetRole: string;
  assignedAccountIds: string[];
  permissions: any;
}): Promise<void> {
  const fullInvite = {
    ...invite,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  // 1. Save in localStorage for immediate retrieval on same origin/browser
  try {
    localStorage.setItem('cached_invite_' + invite.token, JSON.stringify(fullInvite));
  } catch (e) {
    console.warn('Could not cache invite locally', e);
  }

  // 2. Also save to server API store (fast HTTP proxy)
  try {
    fetch('/api/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullInvite),
    }).catch(() => {});
  } catch {}

  // 3. Save to Firestore invites collection with timeout protection
  try {
    const inviteRef = doc(db, 'invites', invite.token);
    await withTimeout(setDoc(inviteRef, sanitizeForFirestore(fullInvite)), 4000);

    // Also flag member in household as invitePending, ensuring name and role are ALWAYS preserved
    await withTimeout(
      setDoc(
        doc(db, 'households', invite.householdId, 'members', invite.targetMemberId),
        sanitizeForFirestore({
          id: invite.targetMemberId,
          name: invite.targetMemberName,
          role: invite.targetRole,
          isInvitePending: true,
          inviteCode: invite.token,
          invitedAt: new Date().toISOString(),
          assignedAccountIds: invite.assignedAccountIds,
          permissions: invite.permissions,
        }),
        { merge: true }
      ),
      4000
    );
  } catch (err) {
    console.warn('Firestore invite save warning (cached locally & on server):', err);
  }
}

/**
 * 5. Fetch Personalized Invite by Token (dual-channel with timeout)
 */
export async function fetchPersonalizedInvite(token: string): Promise<any | null> {
  // 1. Check local storage cache
  try {
    const cached = localStorage.getItem('cached_invite_' + token);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && (parsed.householdId || parsed.targetMemberName)) return parsed;
    }
  } catch (e) {
    console.warn('Local invite cache check error:', e);
  }

  // 2. Check server API
  try {
    const res = await fetch(`/api/invites/${encodeURIComponent(token)}`);
    if (res.ok) {
      const json = await res.json();
      if (json && json.invite) {
        try {
          localStorage.setItem('cached_invite_' + token, JSON.stringify(json.invite));
        } catch {}
        return json.invite;
      }
    }
  } catch (e) {
    // Graceful fallback
  }

  // 3. Check Firestore with 3.5s timeout
  try {
    const snap = await withTimeout(getDoc(doc(db, 'invites', token)), 3500, null);
    if (snap && snap.exists()) {
      const data = snap.data();
      try {
        localStorage.setItem('cached_invite_' + token, JSON.stringify(data));
      } catch {}
      return data;
    }
  } catch (err) {
    console.warn('Firestore invite lookup warning:', err);
  }

  return null;
}

/**
 * 6. Complete Member Registration via Personalized Invite Link
 */
export async function completeInviteRegistration(params: {
  inviteToken: string;
  login: string;
  name: string;
  password: string;
  pin: string;
  fallbackInviteData?: any;
}): Promise<{
  success: boolean;
  message?: string;
  householdId?: string;
  memberId?: string;
}> {
  let invite = await fetchPersonalizedInvite(params.inviteToken);
  if (!invite && params.fallbackInviteData) {
    invite = params.fallbackInviteData;
  }

  if (!invite) {
    return { success: false, message: 'Nieprawidłowy lub nieistniejący link zaproszenia.' };
  }

  if (invite.status === 'ACCEPTED') {
    return { success: false, message: 'To zaproszenie zostało już wcześniej wykorzystane. Zaloguj się swoim loginem i hasłem.' };
  }

  const rawLogin = params.login.trim();
  const loginKey = normalizeLogin(rawLogin);

  // 1. Cache auth info locally for immediate offline & fast login
  const authPayload = {
    loginKey,
    login: rawLogin,
    name: params.name || invite.targetMemberName,
    password: params.password,
    pin: params.pin,
    householdId: invite.householdId,
    householdName: invite.householdName,
    memberId: invite.targetMemberId,
    role: invite.targetRole,
    createdAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem('cached_auth_' + loginKey, JSON.stringify(authPayload));
    // Update local invite cache
    invite.status = 'ACCEPTED';
    invite.acceptedAt = new Date().toISOString();
    invite.acceptedByLogin = rawLogin;
    localStorage.setItem('cached_invite_' + params.inviteToken, JSON.stringify(invite));
  } catch (e) {
    console.warn('Local storage cache update error:', e);
  }

  // 2. Notify backend server API
  try {
    fetch(`/api/invites/${encodeURIComponent(params.inviteToken)}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: rawLogin }),
    }).catch(() => {});
  } catch {}

  // 3. Update Firestore with timeout protection
  try {
    const batch = writeBatch(db);

    const memberRef = doc(db, 'households', invite.householdId, 'members', invite.targetMemberId);
    batch.set(
      memberRef,
      {
        name: params.name || invite.targetMemberName,
        login: rawLogin,
        password: params.password,
        pin: params.pin,
        isInvitePending: false,
        lastLoginAt: new Date().toISOString(),
      },
      { merge: true }
    );

    const authRef = doc(db, 'authUsers', loginKey);
    batch.set(authRef, authPayload);

    const inviteRef = doc(db, 'invites', params.inviteToken);
    batch.update(inviteRef, {
      status: 'ACCEPTED',
      acceptedAt: new Date().toISOString(),
      acceptedByLogin: rawLogin,
    });

    await withTimeout(batch.commit(), 5000);
  } catch (err: any) {
    console.warn('Firestore commit completed or background synced:', err);
  }

  return {
    success: true,
    householdId: invite.householdId,
    memberId: invite.targetMemberId,
  };
}


