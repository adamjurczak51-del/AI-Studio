import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  Lock, 
  User, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  QrCode, 
  Wallet,
  Smartphone,
  Eye,
  EyeOff,
  RotateCcw
} from 'lucide-react';
import { 
  registerNewHouseholdAdmin, 
  authenticateCommercialUser, 
  fetchPersonalizedInvite, 
  completeInviteRegistration,
  normalizeLogin
} from '../utils/firebase';

interface CommercialAuthScreenProps {
  onLoginSuccess: (session: {
    householdId: string;
    householdName: string;
    memberId: string;
    memberName: string;
    role: string;
    login: string;
  }) => void;
  onExploreDemo?: () => void;
}

export const CommercialAuthScreen: React.FC<CommercialAuthScreenProps> = ({
  onLoginSuccess,
}) => {
  // Mode: 'login' | 'register' | 'invite'
  const [mode, setMode] = useState<'login' | 'register' | 'invite'>('login');
  const [loginMethod, setLoginMethod] = useState<'pin' | 'password'>('pin');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Remembered user on this device
  const [savedUser, setSavedUser] = useState<{
    login: string;
    name: string;
    householdId: string;
    householdName: string;
    memberId: string;
    avatar?: string;
  } | null>(null);

  // Login form fields
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [pinInput, setPinInput] = useState('');

  // Register Admin fields
  const [regFamilyName, setRegFamilyName] = useState('');
  const [regAdminName, setRegAdminName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regAccountName, setRegAccountName] = useState('Konto Główne');
  const [regAccountBalance, setRegAccountBalance] = useState('2500');

  // Invite state
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<any | null>(null);
  const [inviteLogin, setInviteLogin] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [invitePin, setInvitePin] = useState('');

  // 1. Detect if invite parameter exists in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    const hh = params.get('hh');
    const hn = params.get('hn');
    const m = params.get('m');
    const n = params.get('n');
    const r = params.get('r');
    const by = params.get('by');

    if (token) {
      setInviteToken(token);
      setMode('invite');

      // Prepopulate immediate values from URL query parameters so phone never waits or 404s!
      if (n || hn || hh) {
        setInviteData({
          token,
          householdId: hh || 'rodzina-glowna',
          householdName: hn || 'Gospodarstwo Domowe',
          targetMemberId: m || `mem-${token}`,
          targetMemberName: n || 'Członek Rodziny',
          targetRole: r || 'MEMBER',
          invitedByMemberName: by || 'Administrator',
        });
        if (n) {
          setInviteName(n);
          setInviteLogin(n);
        }
      }

      loadInviteDetails(token, { hh, hn, m, n, r, by });
    }

    // Check localStorage for saved device user
    const saved = localStorage.getItem('domowy_budzet_saved_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSavedUser(parsed);
        setLoginInput(parsed.login || parsed.name || '');
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const loadInviteDetails = async (token: string, urlMeta?: any) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchPersonalizedInvite(token);
      if (data) {
        setInviteData(data);
        if (data.targetMemberName) {
          setInviteName(data.targetMemberName);
          setInviteLogin(data.targetMemberName);
        }
      } else if (urlMeta && (urlMeta.n || urlMeta.hn)) {
        // Keep data already extracted from URL parameters
      } else {
        // Fallback: let invited user complete setup gracefully even if network is slow
        setInviteData((prev: any) => prev || {
          householdName: 'Gospodarstwo Domowe',
          invitedByMemberName: 'Administrator',
          targetMemberName: 'Członek Rodziny',
          targetRole: 'MEMBER',
        });
      }
    } catch (err: any) {
      console.warn('Invite details lookup error:', err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Login (PIN or Password)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    const targetLogin = loginInput.trim();
    if (!targetLogin) {
      setErrorMessage('Podaj swój login lub imię i nazwisko.');
      setLoading(false);
      return;
    }

    try {
      const res = await authenticateCommercialUser({
        login: targetLogin,
        password: loginMethod === 'password' ? passwordInput : undefined,
        pin: loginMethod === 'pin' ? pinInput : undefined,
      });

      if (!res.success || !res.userAuth) {
        setErrorMessage(res.message || 'Błędne dane logowania.');
        setLoading(false);
        return;
      }

      const auth = res.userAuth;
      const session = {
        householdId: auth.householdId,
        householdName: auth.householdName,
        memberId: auth.memberId,
        memberName: auth.name,
        role: auth.role,
        login: auth.login,
      };

      // Save to device storage for quick PIN access next time
      localStorage.setItem('domowy_budzet_saved_user', JSON.stringify({
        login: auth.login,
        name: auth.name,
        householdId: auth.householdId,
        householdName: auth.householdName,
        memberId: auth.memberId,
      }));

      onLoginSuccess(session);
    } catch (err: any) {
      setErrorMessage('Wystąpił błąd podczas logowania: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle Register New Family & Admin
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regFamilyName.trim() || !regAdminName.trim()) {
      setErrorMessage('Uzupełnij nazwę rodziny oraz swoje imię i nazwisko.');
      return;
    }

    if (!regPassword || regPassword.length < 4) {
      setErrorMessage('Hasło nadrzędne musi mieć co najmniej 4 znaki.');
      return;
    }

    if (!regPin || regPin.length < 4) {
      setErrorMessage('Podaj 4-cyfrowy kod PIN do szybkiego logowania.');
      return;
    }

    setLoading(true);
    try {
      const result = await registerNewHouseholdAdmin({
        adminName: regAdminName.trim(),
        familyName: regFamilyName.trim(),
        password: regPassword,
        pin: regPin,
        accountName: regAccountName.trim() || 'Konto Główne',
        initialBalance: parseFloat(regAccountBalance) || 0,
      });

      const session = {
        householdId: result.householdId,
        householdName: regFamilyName.trim(),
        memberId: result.adminMemberId,
        memberName: regAdminName.trim(),
        role: 'ADMIN',
        login: regAdminName.trim(),
      };

      localStorage.setItem('domowy_budzet_saved_user', JSON.stringify({
        login: regAdminName.trim(),
        name: regAdminName.trim(),
        householdId: result.householdId,
        householdName: regFamilyName.trim(),
        memberId: result.adminMemberId,
      }));

      setSuccessMessage('Konto administratora i rodzina zostały pomyślnie utworzone!');
      setTimeout(() => {
        onLoginSuccess(session);
      }, 1000);
    } catch (err: any) {
      setErrorMessage('Błąd rejestracji rodziny: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Complete Personalized Invite Registration
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteToken) return;

    if (!invitePassword || invitePassword.length < 4) {
      setErrorMessage('Utwórz hasło nadrzędne (minimum 4 znaki).');
      return;
    }

    if (!invitePin || invitePin.length < 4) {
      setErrorMessage('Wpisz 4-cyfrowy kod PIN do szybkiego logowania.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await completeInviteRegistration({
        inviteToken,
        login: inviteLogin.trim() || inviteName.trim(),
        name: inviteName.trim(),
        password: invitePassword,
        pin: invitePin,
        fallbackInviteData: inviteData,
      });

      if (!res.success) {
        setErrorMessage(res.message || 'Błąd aktywacji konta.');
        setLoading(false);
        return;
      }

      const safeHouseholdName = inviteData?.householdName || 'Nasze Gospodarstwo Domowe';
      const safeRole = inviteData?.targetRole || 'MEMBER';
      const safeMemberName = inviteName.trim() || inviteLogin.trim();
      const safeMemberId = res.memberId || inviteData?.targetMemberId || `mem-${Date.now().toString(36)}`;
      const safeHouseholdId = res.householdId || inviteData?.householdId || 'household-default';

      const session = {
        householdId: safeHouseholdId,
        householdName: safeHouseholdName,
        memberId: safeMemberId,
        memberName: safeMemberName,
        role: safeRole,
        login: inviteLogin.trim(),
      };

      localStorage.setItem('domowy_budzet_saved_user', JSON.stringify({
        login: inviteLogin.trim(),
        name: safeMemberName,
        householdId: safeHouseholdId,
        householdName: safeHouseholdName,
        memberId: safeMemberId,
      }));

      // Clear invite parameter from URL without reload
      window.history.replaceState({}, document.title, window.location.pathname);

      setSuccessMessage('Konto zostało aktywowane! Witamy w rodzinie.');
      setTimeout(() => {
        onLoginSuccess(session);
      }, 1200);
    } catch (err: any) {
      setErrorMessage('Błąd aktywacji zaproszenia: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col justify-between p-4 sm:p-6 antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* Top Bar Branding */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-5 h-5 text-amber-200" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Domowy Budżet <span className="text-indigo-400">&amp; Gospodarstwo AI</span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Wersja Komercyjna SaaS
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Wielokontowy system zarządzania budżetem, samochodami i spiżarnią dla wielu rodzin
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Strefa Zabezpieczona</span>
        </div>
      </div>

      {/* Main Center Card */}
      <div className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden">
          
          {/* Subtle glow effect */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Mode Tabs (Hide if in invite flow) */}
          {mode !== 'invite' && (
            <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className={`py-2 rounded-xl transition ${
                  mode === 'login'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Logowanie
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                }}
                className={`py-2 rounded-xl transition ${
                  mode === 'register'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Załóż nową rodzinę
              </button>
            </div>
          )}

          {/* Messages */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* 1. LOGIN SCREEN (PIN OR PASSWORD)                          */}
          {/* ========================================================= */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {savedUser ? (
                /* Remembered user view */
                <div className="text-center space-y-3 pb-2">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-3xl mx-auto shadow-inner">
                    👤
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{savedUser.name}</h2>
                    <p className="text-xs text-indigo-300 font-medium">
                      Gospodarstwo: {savedUser.householdName}
                    </p>
                  </div>
                </div>
              ) : (
                /* Fresh login view */
                <div>
                  <h2 className="text-lg font-bold text-white">Zaloguj się do aplikacji</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Wprowadź swoje imię i nazwisko (login) oraz kod PIN lub hasło.
                  </p>
                </div>
              )}

              {/* Login/Name Field (editable if no saved user or when clicking change user) */}
              {(!savedUser || loginMethod === 'password') && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Login / Imię i Nazwisko
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={loginInput}
                      onChange={(e) => setLoginInput(e.target.value)}
                      placeholder="np. Adam Jurczak"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>
                </div>
              )}

              {/* Toggle Between Quick PIN and Master Password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">
                  {loginMethod === 'pin' ? 'Szybkie logowanie PIN' : 'Logowanie hasłem nadrzędnym'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod(loginMethod === 'pin' ? 'password' : 'pin');
                    setErrorMessage(null);
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  {loginMethod === 'pin' ? 'Użyj hasła nadrzędnego' : 'Użyj kodu PIN'}
                </button>
              </div>

              {/* Input for PIN */}
              {loginMethod === 'pin' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    4-cyfrowy kod PIN
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      maxLength={6}
                      required
                      inputMode="numeric"
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-center text-xl tracking-widest text-white placeholder-slate-700 font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 text-center">
                    Gdy zapomnisz kodu PIN, hasło nadrzędne zawsze pozwoli Ci się zalogować.
                  </p>
                </div>
              ) : (
                /* Input for Password */
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Hasło nadrzędne
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Wpisz hasło do konta"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-10 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 font-bold text-sm text-white rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                {loading ? (
                  <span>Logowanie...</span>
                ) : (
                  <>
                    <span>Zaloguj do gospodarstwa</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {savedUser && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSavedUser(null);
                      setLoginInput('');
                      setLoginMethod('password');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-300 transition"
                  >
                    Zaloguj się jako inny użytkownik / inna rodzina
                  </button>
                </div>
              )}
            </form>
          )}

          {/* ========================================================= */}
          {/* 2. REGISTER NEW HOUSEHOLD & ADMIN                           */}
          {/* ========================================================= */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 mb-1">
                  👑 Konto Administratora
                </span>
                <h2 className="text-lg font-bold text-white">Stwórz nową rodzinę</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Po rejestracji będziesz Administratorem i będziesz mógł dodawać kolejnych członków rodziny.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nazwa rodziny / Gospodarstwa
                </label>
                <div className="relative">
                  <Users className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={regFamilyName}
                    onChange={(e) => setRegFamilyName(e.target.value)}
                    placeholder="np. Rodzina Jurczak"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Twoje Imię i Nazwisko (Twój Login)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={regAdminName}
                    onChange={(e) => setRegAdminName(e.target.value)}
                    placeholder="np. Adam Jurczak"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Hasło nadrzędne
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min. 4 znaki"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Kod PIN (szybkie logowanie)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      maxLength={6}
                      required
                      inputMode="numeric"
                      value={regPin}
                      onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="4 cyfry"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nazwa pierwszego konta
                  </label>
                  <input
                    type="text"
                    value={regAccountName}
                    onChange={(e) => setRegAccountName(e.target.value)}
                    placeholder="np. Konto PKO BP"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Saldo początkowe (PLN)
                  </label>
                  <input
                    type="number"
                    value={regAccountBalance}
                    onChange={(e) => setRegAccountBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 font-bold text-sm text-white rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                {loading ? (
                  <span>Tworzenie gospodarstwa...</span>
                ) : (
                  <>
                    <span>Zarejestruj rodzinę i wejdź</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* 3. INVITE ACCEPTANCE ONBOARDING                             */}
          {/* ========================================================= */}
          {mode === 'invite' && (
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="text-center space-y-2 pb-1">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center text-2xl mx-auto shadow-lg shadow-amber-500/20">
                  💌
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-1">
                    Spersonalizowane Zaproszenie
                  </span>
                  <h2 className="text-lg font-bold text-white">
                    Dołącz do: {inviteData?.householdName || 'Rodziny'}
                  </h2>
                  <p className="text-xs text-slate-300">
                    Zaprosił Cię <strong>{inviteData?.invitedByMemberName || 'Administrator'}</strong> do profilu <strong>{inviteData?.targetMemberName}</strong>.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Twój Login / Imię i Nazwisko
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={inviteLogin}
                    onChange={(e) => setInviteLogin(e.target.value)}
                    placeholder="Wpisz swój login"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Utwórz hasło nadrzędne
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      placeholder="Min. 4 znaki"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Twój kod PIN do telefonu
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      maxLength={6}
                      required
                      inputMode="numeric"
                      value={invitePin}
                      onChange={(e) => setInvitePin(e.target.value.replace(/\D/g, ''))}
                      placeholder="4 cyfry"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400">
                Po aktywacji Twoje urządzenie zapamięta profil, a codzienne logowanie będzie odbywać się błyskawicznie kodem PIN. Hasło główne umożliwi odzyskanie dostępu w razie zapomnienia PINu.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 font-bold text-sm text-white rounded-xl shadow-lg shadow-amber-500/30 transition flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                {loading ? (
                  <span>Aktywacja profilu...</span>
                ) : (
                  <>
                    <span>Aktywuj konto i dołącz do rodziny</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

        </div>
      </div>

      {/* Footer Commercial Note */}
      <div className="max-w-md w-full mx-auto text-center text-[11px] text-slate-500 py-2">
        <span>Bezpieczna chmura Firestore Live Sync • Szyfrowane logowanie PIN + Hasło</span>
      </div>

    </div>
  );
};
