import React, { useState, useRef } from 'react';
import { Account, Category, FamilyMember, LiveBasketItem, LiveShoppingSession, ShoppingListItem } from '../types';
import { 
  ShoppingCart, 
  Camera, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles, 
  Store, 
  Loader2, 
  AlertCircle, 
  Clock, 
  Receipt, 
  ArrowRight,
  ShieldCheck,
  PackageCheck,
  ChevronRight,
  HelpCircle,
  Tag
} from 'lucide-react';

interface LiveShoppingAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMember: FamilyMember;
  accounts: Account[];
  categories: Category[];
  shoppingList?: ShoppingListItem[];
  activeSession?: LiveShoppingSession | null;
  onSaveSession: (session: LiveShoppingSession, addPantryItems?: boolean) => void;
  onOpenReceiptScanner?: (sessionId?: string) => void;
}

export const LiveShoppingAssistantModal: React.FC<LiveShoppingAssistantModalProps> = ({
  isOpen,
  onClose,
  currentMember,
  accounts,
  categories,
  shoppingList = [],
  activeSession = null,
  onSaveSession,
  onOpenReceiptScanner,
}) => {
  // Store Selection (Kaufland is selected by default as requested by user!)
  const [selectedStore, setSelectedStore] = useState<string>(
    activeSession?.storeName || 'Kaufland'
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    activeSession?.accountId || accounts[0]?.id || ''
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    activeSession?.categoryId || 'cat-food'
  );

  // Cart items
  const [basketItems, setBasketItems] = useState<LiveBasketItem[]>(
    activeSession?.items || []
  );

  // Sync or clear when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (activeSession) {
        setBasketItems(activeSession.items || []);
        setSelectedStore(activeSession.storeName || 'Kaufland');
      }
    }
  }, [isOpen, activeSession]);

  // Scanner states
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick Manual Item Input
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualQty, setManualQty] = useState('1');

  const handleClearBasket = () => {
    setBasketItems([]);
    setManualName('');
    setManualPrice('');
    setErrorMessage(null);
  };

  if (!isOpen) return null;

  const stores = ['Kaufland', 'Biedronka', 'Lidl', 'Dino', 'Rossmann', 'Inny supermarket'];

  // Calculate live running total
  const estimatedTotal = basketItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  // Scan product via Camera photo or Preset
  const handleScanProduct = async (imageFile?: File, presetKey?: string) => {
    setIsScanning(true);
    setErrorMessage(null);

    let base64Image: string | undefined = undefined;
    let mimeType = 'image/jpeg';

    if (imageFile) {
      mimeType = imageFile.type || 'image/jpeg';
      base64Image = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(imageFile);
      });
    }

    try {
      const res = await fetch('/api/scan-basket-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Image,
          mimeType,
          storeName: selectedStore,
          presetKey,
        }),
      });

      const resText = await res.text();
      let resData: any = null;
      if (resText && !resText.trim().startsWith('<')) {
        try {
          resData = JSON.parse(resText);
        } catch {
          resData = null;
        }
      }

      const prod = resData?.data || {
        name: 'Produkt do koszyka',
        estimatedPrice: 6.50,
        quantity: 1,
        unit: 'szt.',
        category: 'Spożywcze & Supermarket',
        isPantryItem: true,
      };
      const newItem: LiveBasketItem = {
        id: `basket-item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: prod.name,
        price: prod.estimatedPrice || 5.0,
        quantity: prod.quantity || 1,
        unit: prod.unit || 'szt.',
        category: prod.category || 'Spożywcze & Supermarket',
        pantryCategory: prod.pantryCategory || 'Inne produkty',
        isPantryItem: prod.isPantryItem !== false,
        confidenceNote: prod.confidenceNote,
        scannedAt: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      };

      setBasketItems((prev) => [newItem, ...prev]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Błąd skanowania produktu do koszyka');
    } finally {
      setIsScanning(false);
    }
  };

  // Add item manually
  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualPrice) return;

    const newItem: LiveBasketItem = {
      id: `basket-item-${Date.now()}`,
      name: manualName.trim(),
      price: parseFloat(manualPrice) || 0,
      quantity: parseFloat(manualQty) || 1,
      unit: 'szt.',
      category: 'Spożywcze & Supermarket',
      pantryCategory: 'Inne produkty',
      isPantryItem: true,
      scannedAt: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
    };

    setBasketItems((prev) => [newItem, ...prev]);
    setManualName('');
    setManualPrice('');
    setManualQty('1');
  };

  // Update quantity in basket
  const handleUpdateQuantity = (id: string, delta: number) => {
    setBasketItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQ = Math.max(0.5, item.quantity + delta);
            return { ...item, quantity: newQ };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  // Remove from basket
  const handleRemoveItem = (id: string) => {
    setBasketItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Finish shopping session in store
  const handleCompleteShopping = () => {
    if (basketItems.length === 0) {
      alert('Koszyk jest pusty! Zeskanuj lub dodaj przynajmniej jeden artykuł.');
      return;
    }

    const session: LiveShoppingSession = {
      id: activeSession?.id || `live-shop-${Date.now()}`,
      storeName: selectedStore,
      startedAt: activeSession?.startedAt || new Date().toISOString(),
      completedAt: new Date().toISOString(),
      memberId: currentMember.id,
      memberName: currentMember.name,
      accountId: selectedAccountId,
      categoryId: selectedCategoryId,
      status: 'COMPLETED_WAITING_RECEIPT',
      items: basketItems,
      estimatedTotal: parseFloat(estimatedTotal.toFixed(2)),
    };

    onSaveSession(session, true);
    setBasketItems([]);
    setManualName('');
    setManualPrice('');
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-5 my-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-amber-200">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Asystent Zakupów na Żywo (Skaner Koszyka)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  Podliczanie na bieżąco
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Skanuj produkty aparatem podczas wkładania do wózka, sprawdzaj kwotę i nie dubluj pozycji przy paragonie.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Live Running Total Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400">Sklep:</span>
              <span className="font-bold text-amber-400 text-sm">{selectedStore}</span>
              <span className="text-slate-500">•</span>
              <span className="text-[11px] text-slate-300">
                Konto: <strong>{selectedAccount?.name}</strong> ({selectedAccount?.balance.toFixed(2)} zł)
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {estimatedTotal.toFixed(2)} zł
              </span>
              <span className="text-xs text-slate-300">
                ({basketItems.length} {basketItems.length === 1 ? 'artykuł' : 'artykułów'} w koszyku)
              </span>
              {basketItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearBasket}
                  className="text-[11px] font-semibold text-rose-300 hover:text-white hover:underline transition ml-1"
                  title="Wyczyść wszystkie pozycje z koszyka"
                >
                  Wyczyść
                </button>
              )}
            </div>
          </div>

          {/* Quick status pill */}
          <div className="p-2.5 rounded-xl bg-white/10 border border-white/10 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Ochrona przed dublowaniem</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug max-w-xs">
              Po zatwierdzeniu produkty trafią do magazynu, a późniejszy paragon z {selectedStore} zaktualizuje tylko ceny!
            </p>
          </div>
        </div>

        {/* Store & Account Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Wybierz sklep, w którym robisz zakupy:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {stores.map((store) => (
                <button
                  key={store}
                  type="button"
                  onClick={() => setSelectedStore(store)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    selectedStore === store
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {store}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Konto do rozliczenia zakupów:
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.balance.toFixed(2)} zł)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SCANNER TRIGGER: Camera / Upload & Tester Presets */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-amber-600" />
              <span>Skanuj produkt wkładany do koszyka (aparat / etykieta cenowa):</span>
            </span>
            {isScanning && (
              <span className="text-xs font-bold text-amber-600 flex items-center gap-1 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Analiza przez Gemini AI...</span>
              </span>
            )}
          </div>

          {/* Camera File Input */}
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="flex-1 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleScanProduct(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <div className="p-3 rounded-xl border-2 border-dashed border-amber-300 hover:border-amber-500 bg-amber-50/40 hover:bg-amber-50 text-center transition flex items-center justify-center gap-2 text-xs font-bold text-amber-900">
                <Camera className="w-4 h-4 text-amber-600" />
                <span>Kliknij, aby zrobić zdjęcie produktu aparatem w sklepie</span>
              </div>
            </label>
          </div>



          {/* Error Message if any */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* BASKET ITEMS LIST */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Zawartość Twojego koszyka ({basketItems.length}):
            </span>
            {basketItems.length > 0 && (
              <span className="text-[11px] text-slate-500">
                Suma szacunkowa: <strong className="text-slate-900">{estimatedTotal.toFixed(2)} zł</strong>
              </span>
            )}
          </div>

          <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
            {basketItems.map((item) => {
              const lineTotal = item.price * item.quantity;
              return (
                <div
                  key={item.id}
                  className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 truncate">{item.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                        {item.scannedAt}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Cena jedn.: <strong>{item.price.toFixed(2)} zł</strong> • {item.pantryCategory || item.category}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(item.id, -1)}
                      className="w-6 h-6 rounded bg-white hover:bg-slate-200 font-bold flex items-center justify-center text-slate-700 shadow-2xs"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-bold text-xs">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQuantity(item.id, 1)}
                      className="w-6 h-6 rounded bg-white hover:bg-slate-200 font-bold flex items-center justify-center text-slate-700 shadow-2xs"
                    >
                      +
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="w-16 text-right font-black text-slate-900">
                    {lineTotal.toFixed(2)} zł
                  </div>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition"
                    title="Usuń z koszyka"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {basketItems.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                Koszyk jest pusty. Zrób zdjęcie produktu aparatem lub wpisz artykuł ręcznie poniżej.
              </div>
            )}
          </div>
        </div>

        {/* Ręczne szybkie dodanie jeśli brak etykiety */}
        <form
          onSubmit={handleAddManualItem}
          className="flex gap-2 p-2 bg-slate-100 rounded-xl text-xs items-center"
        >
          <span className="font-bold text-slate-600 whitespace-nowrap pl-1">Ręcznie:</span>
          <input
            type="text"
            placeholder="Nazwa artykułu..."
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Cena zł"
            value={manualPrice}
            onChange={(e) => setManualPrice(e.target.value)}
            className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-bold text-center"
          />
          <button
            type="submit"
            disabled={!manualName.trim() || !manualPrice}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition disabled:opacity-40"
          >
            + Dodaj
          </button>
        </form>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Kontynuuj zakupy w tle
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCompleteShopping}
              disabled={basketItems.length === 0}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md transition active:scale-98 disabled:opacity-40"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Zatwierdź zakupy &amp; dodaj do magazynu ({estimatedTotal.toFixed(2)} zł)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
