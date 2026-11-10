import React, { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  Apple, 
  Share2, 
  Copy, 
  Check, 
  Download, 
  QrCode, 
  Sparkles, 
  Laptop, 
  ExternalLink,
  ShieldCheck,
  Package,
  FileCode,
  AlertCircle,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';
import { getPublicAppUrl } from '../utils/urlHelper';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'download' | 'android' | 'ios'>('qr');
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Active app URL (ensures public access on mobile without 403 errors)
  const getAppShareUrl = () => {
    return getPublicAppUrl();
  };

  const shareUrl = getAppShareUrl();

  // Listen for beforeinstallprompt event on Android / Chromium
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detect if already running in standalone mode (installed PWA)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Domowy Budżet & Spiżarnia AI',
          text: 'Zainstaluj aplikację Domowy Budżet na telefonie bez logowania do konta Google!',
          url: shareUrl,
        });
      } catch (err) {
        console.log('Share canceled or failed', err);
      }
    } else {
      handleCopy();
    }
  };

  const handleTriggerInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(shareUrl)}&margin=10`;
  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-600 p-5 sm:p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-2xl shadow-inner flex-shrink-0">
              📱
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 mb-1">
                <Sparkles className="w-3 h-3" /> Wersja Publiczna (Bez logowania Google)
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Pobierz i zainstaluj na telefonie
              </h2>
              <p className="text-xs sm:text-sm text-indigo-100">
                Pobierz fizyczny pakiet instalacyjny lub zainstaluj aplikację na pulpicie telefonu.
              </p>
            </div>
          </div>
        </div>

        {/* Explain Direct Installation & Sharing */}
        <div className="bg-indigo-50 border-b border-indigo-200 px-4 sm:px-6 py-3 text-xs text-indigo-950 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Pobieranie i instalacja jak ze sklepu Google Play:</strong>
            <p className="mt-0.5 text-indigo-800 leading-relaxed">
              Aplikację możesz zainstalować bezpośrednio na telefonie w oficjalnym standardzie <strong>WebAPK Google Play</strong> (jednym kliknięciem w Chrome) LUB pobrać poniżej <strong>pełną paczkę instalacyjną (.ZIP)</strong> z kompletną aplikacją (HTML, JS, skrót Windows/Mac oraz projekt Android do wygenerowania pliku APK) i wysłać znajomemu!
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-4 sm:px-6 pt-2 bg-slate-50 gap-2 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex items-center gap-1.5 pb-2.5 pt-2 px-3 font-semibold text-xs sm:text-sm border-b-2 whitespace-nowrap transition ${
              activeTab === 'qr'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode className="w-4 h-4 text-indigo-600" />
            <span>Kod QR & Link (Dla Rodziny)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('download')}
            className={`flex items-center gap-1.5 pb-2.5 pt-2 px-3 font-semibold text-xs sm:text-sm border-b-2 whitespace-nowrap transition ${
              activeTab === 'download'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4 text-emerald-600" />
            <span>Fizyczne pobranie (.ZIP / APK)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('android')}
            className={`flex items-center gap-1.5 pb-2.5 pt-2 px-3 font-semibold text-xs sm:text-sm border-b-2 whitespace-nowrap transition ${
              activeTab === 'android'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Android (Chrome)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ios')}
            className={`flex items-center gap-1.5 pb-2.5 pt-2 px-3 font-semibold text-xs sm:text-sm border-b-2 whitespace-nowrap transition ${
              activeTab === 'ios'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Apple className="w-4 h-4 text-slate-800" />
            <span>iPhone (Safari)</span>
          </button>
        </div>

        {/* Tab 1: QR & Link (Public) */}
        {activeTab === 'qr' && (
          <div className="p-5 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 items-center">
              <div className="flex flex-col items-center text-center">
                <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200">
                  <img 
                    src={qrImageUrl} 
                    alt="Kod QR do otwarcia aplikacji bez logowania" 
                    className="w-44 h-44 object-contain rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-2 font-medium flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-indigo-600" /> Skieruj aparat telefonu na kod
                </span>
              </div>

              <div className="flex flex-col justify-between h-full space-y-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Bezpośredni dostęp dla każdego telefonu
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Ten kod QR otwiera aplikację <strong>bez konieczności logowania do konta Google</strong>.
                  </p>
                  <div className="mt-2 p-2 bg-slate-200/60 rounded-lg text-[11px] font-mono break-all text-slate-700">
                    {shareUrl}
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs transition"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">Skopiowano publiczny link!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>Kopiuj publiczny link (ais-pre)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleNativeShare}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Wyślij na WhatsApp / SMS / Messenger</span>
                  </button>

                  {deferredPrompt && (
                    <button
                      type="button"
                      onClick={handleTriggerInstall}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition animate-pulse"
                    >
                      <Download className="w-4 h-4" />
                      <span>Zainstaluj teraz na tym ekranie</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                <strong>Baza Firestore w chmurze jest w pełni połączona:</strong> Wszystkie telefony używające tego linku będą widzieć te same konta, spiżarnię i paragony w czasie rzeczywistym!
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: Fizyczne pobranie (.ZIP & Generator APK) */}
        {activeTab === 'download' && (
          <div className="p-5 sm:p-6 space-y-4">
            {/* Opcja 1: Pobranie Paczki ZIP */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      Pobierz kompletną paczkę aplikacji (.ZIP z wersją chmurową i offline)
                    </h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Paczka zawiera <strong>skrót i stronę do otwarcia wersji z synchronizacją na żywo w chmurze</strong> (<code className="bg-emerald-100 text-emerald-900 px-1 rounded font-bold">Otworz_Wersje_W_Chmurze_Live_Sync.html</code>), wersję lokalną offline (<code className="bg-slate-200 text-slate-900 px-1 rounded">Domowy_Budzet_Offline_Standalone.html</code>), skróty Windows (.bat/.url) i Mac/Linux (.sh) oraz projekt Android do generowania .APK.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                <a
                  href="/api/download-package"
                  download="Domowy-Budzet-Paczka-Instalacyjna.zip"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md transition active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Pobierz gotowy pakiet (.ZIP - 2 MB z Live Sync)</span>
                </a>
              </div>
            </div>

            {/* Opcja 2: Generowanie pliku APK na Androida */}
            <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Jak wygenerować fizyczny plik .APK na telefon Android?
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Aplikacja posiada pełny manifest PWA. Dzięki oficjalnemu narzędziu Google i Microsoft (<strong>PWABuilder</strong>) możesz wygenerować fizyczny instalator <code className="font-mono bg-indigo-100 text-indigo-900 px-1 rounded">.apk</code> w 1 kliknięcie:
                  </p>
                </div>
              </div>

              <ol className="text-xs text-slate-700 space-y-1.5 pl-6 list-decimal">
                <li>Kliknij poniższy przycisk, aby otworzyć oficjalny generator <strong>PWABuilder</strong>.</li>
                <li>Adres Twojej aplikacji publicznej jest już automatycznie podany.</li>
                <li>Wybierz platformę <strong>Android</strong> i kliknij <strong>„Download Package”</strong>.</li>
                <li>Otrzymasz bezpośredni plik instalatora <code className="font-bold">.apk</code>, który możesz przesłać na telefon kablem, Bluetooth lub przez WhatsApp.</li>
              </ol>

              <div className="pt-2">
                <a
                  href={pwaBuilderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Otwórz generator APK dla tej aplikacji (PWABuilder)</span>
                </a>
              </div>
            </div>

            {/* Uwaga o PWA */}
            <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
              <span>
                <strong>Wskazówka:</strong> Instalacja PWA bezpośrednio z przeglądarki Chrome („Zainstaluj aplikację”) daje dokładnie ten sam efekt co plik APK, ale nie wymaga wgrywania plików ani zezwalania na instalację z nieznanych źródeł!
              </span>
            </div>
          </div>
        )}

        {/* Tab 3: Instrukcja Android (Chrome) */}
        {activeTab === 'android' && (
          <div className="p-5 sm:p-6 space-y-3 bg-indigo-50/40 text-xs sm:text-sm text-slate-700">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                1
              </span>
              <div>
                <strong className="text-slate-900">Otwórz link w Chrome:</strong> Otwórz na telefonie adres <code className="bg-indigo-100 text-indigo-900 px-1 py-0.5 rounded font-mono text-xs">{shareUrl}</code> (lub zeskanuj kod QR z pierwszej zakładki).
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                2
              </span>
              <div>
                <strong className="text-slate-900">Dotknij menu trzech kropek (⋮):</strong> W prawym górnym rogu przeglądarki Google Chrome kliknij ikonkę trzech pionowych kropek.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                3
              </span>
              <div>
                <strong className="text-slate-900">Wybierz „Zainstaluj aplikację”:</strong> (lub „Dodaj do ekranu głównego”).
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                4
              </span>
              <div>
                <strong className="text-slate-900">Zatwierdź klikając „Zainstaluj”:</strong> Na pulpicie telefonu pojawi się osobna ikona aplikacji Domowy Budżet, która uruchamia się na pełnym ekranie i działa jak fizyczna aplikacja ze sklepu!
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Instrukcja iOS (Safari) */}
        {activeTab === 'ios' && (
          <div className="p-5 sm:p-6 space-y-3 bg-sky-50/40 text-xs sm:text-sm text-slate-700">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                1
              </span>
              <div>
                <strong className="text-slate-900">Otwórz w Safari:</strong> Zeskanuj kod QR aparatem iPhone'a i kliknij żółty link, lub wpisz w przeglądarce <strong>Safari</strong> adres: <code className="bg-sky-100 text-sky-900 px-1 py-0.5 rounded font-mono text-xs">{shareUrl}</code>.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                2
              </span>
              <div>
                <strong className="text-slate-900">Dotknij ikony Udostępnij:</strong> Na dolnym pasku Safari kliknij niebieską ikonę kwadratu ze strzałką w górę (⎋).
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                3
              </span>
              <div>
                <strong className="text-slate-900">Wybierz „Do ekranu początkowego”:</strong> Przewiń listę w dół i wybierz opcję z plusem ➕ <strong>„Do ekranu początkowego”</strong> (Add to Home Screen).
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                4
              </span>
              <div>
                <strong className="text-slate-900">Kliknij „Dodaj”:</strong> W prawym górnym rogu zatwierdź. Aplikacja natychmiast zagości na Twoim ekranie obok innych aplikacji!
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 px-5 sm:px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 hidden sm:inline">
            Status: 🟢 Baza Firestore Live Sync połączona
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition ml-auto"
          >
            Zamknij
          </button>
        </div>

      </div>
    </div>
  );
};
