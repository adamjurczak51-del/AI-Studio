import React, { useState } from 'react';
import { Account, FamilyMember } from '../types';
import {
  Sparkles,
  ShieldCheck,
  Check,
  X,
  Users,
  Wallet,
  KeyRound,
  Trash2,
  QrCode,
  Share2,
  Info
} from 'lucide-react';
import { generateInviteQrSvg } from '../utils/qrCodeGenerator';
import { getPublicAppUrl } from '../utils/urlHelper';

interface CleanFamilyOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInitializeCleanHousehold: (config: {
    familyName: string;
    adminName: string;
    adminAvatar: string;
    adminPin: string;
    accountName: string;
    accountBalance: number;
    clearPantry: boolean;
    clearTransactions: boolean;
    clearMessages: boolean;
  }) => void;
  onRestoreDemoData: () => void;
}

export const CleanFamilyOnboardingModal: React.FC<CleanFamilyOnboardingModalProps> = ({
  isOpen,
  onClose,
  onInitializeCleanHousehold,
  onRestoreDemoData,
}) => {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [familyName, setFamilyName] = useState('Rodzina Jurczak');
  const [adminName, setAdminName] = useState('Adam');
  const [adminAvatar, setAdminAvatar] = useState('👨‍💼');
  const [adminPin, setAdminPin] = useState('1234');
  const [accountName, setAccountName] = useState('Konto PKO BP - Wspólne');
  const [accountBalance, setAccountBalance] = useState('3500.00');

  const [clearPantry, setClearPantry] = useState(true);
  const [clearTransactions, setClearTransactions] = useState(true);
  const [clearMessages, setClearMessages] = useState(true);

  // Invite state after initialization
  const [inviteLink, setInviteLink] = useState('');
  const [inviteQrSvg, setInviteQrSvg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleStartClean = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim() || !familyName.trim()) return;

    onInitializeCleanHousehold({
      familyName,
      adminName,
      adminAvatar,
      adminPin,
      accountName: accountName || 'Konto Główne',
      accountBalance: parseFloat(accountBalance) || 0,
      clearPantry,
      clearTransactions,
      clearMessages,
    });

    const publicBase = getPublicAppUrl();
    const url = `${publicBase}/?joinFamily=${encodeURIComponent(familyName)}&ref=clean_setup`;
    setInviteLink(url);
    setInviteQrSvg(generateInviteQrSvg(url));
    setStep('success');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8">
        {step === 'form' ? (
          <form onSubmit={handleStartClean} className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Czysty Start dla Twojej Rodziny
                  </h3>
                  <p className="text-xs text-slate-500">
                    Rozpocznij testy na żywym organizmie bez fikcyjnych danych demonstracyjnych
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Przygotowanie aplikacji do codziennego użytku z rodziną:</p>
                <p className="text-slate-700">
                  Ta funkcja utworzy profil główny z kodem PIN, pierwsze konto bankowe i wyczyści przykładowe paragony oraz fikcyjną spiżarnię, pozwalając na zapraszanie domowników kodem QR lub linkiem.
                </p>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nazwa Waszego gospodarstwa domowego:
                </label>
                <input
                  type="text"
                  required
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="np. Rodzina Jurczak"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Imię Administratora (Głowy Rodziny):
                  </label>
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="np. Adam"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Twój 4-cyfrowy kod PIN profilu:
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      maxLength={4}
                      required
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value)}
                      placeholder="np. 1234"
                      className="w-full px-3 py-2 pl-9 border border-slate-300 rounded-xl font-mono tracking-widest text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                </div>
              </div>

              {/* Initial Bank Account */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-indigo-600" /> Pierwsze prawdziwe konto bankowe:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nazwa konta:
                    </label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="np. PKO BP Główne"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Saldo początkowe (PLN):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={accountBalance}
                      onChange={(e) => setAccountBalance(e.target.value)}
                      placeholder="np. 3500.00"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Checkboxes to clear mock data */}
              <div className="space-y-2 pt-1 text-xs">
                <span className="font-bold text-slate-700 block">Elementy do wyczyszczenia:</span>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={clearTransactions}
                    onChange={(e) => setClearTransactions(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Wyczyść przykładowe paragony i historię transakcji</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={clearPantry}
                    onChange={(e) => setClearPantry(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Wyczyść przykładowe stany magazynowe w spiżarni (dodacie swoje ze zdjęć lub paragonów)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={clearMessages}
                    onChange={(e) => setClearMessages(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Wyczyść czat i wiadomości komunikatora</span>
                </label>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={onRestoreDemoData}
                className="text-xs text-slate-500 hover:text-slate-800 underline"
              >
                Przywróć bazę demonstracyjną (Kowalski)
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Rozpocznij czysty start</span>
                </button>
              </div>
            </div>
          </form>
        ) : (
          /* Step 2: Immediate Invite & QR Code for Family */
          <div className="space-y-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Gospodarstwo &bdquo;{familyName}&rdquo; jest gotowe!
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Zalogowano administratora: <strong>{adminName}</strong>. Zeskanuj poniższy kod aparatem telefonu żony lub dzieci, aby natychmiast dołączyli do rodziny:
              </p>
            </div>

            {/* Rendered SVG QR Code */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl max-w-xs mx-auto shadow-inner flex flex-col items-center">
              <div
                className="bg-white p-3 rounded-xl shadow-xs border border-slate-200"
                dangerouslySetInnerHTML={{ __html: inviteQrSvg }}
              />
              <span className="text-[11px] font-bold text-slate-600 mt-3 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-indigo-600" /> Zeskanuj aparatem telefonu
              </span>
            </div>

            {/* Direct Link */}
            <div className="space-y-2 text-left">
              <label className="block text-xs font-bold text-slate-700">
                Lub wyślij bezpośredni link zaproszeniowy przez WhatsApp / SMS:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-600 select-all font-mono"
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{copiedLink ? 'Skopiowano!' : 'Kopiuj'}</span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md transition"
              >
                Przejdź do aplikacji &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
