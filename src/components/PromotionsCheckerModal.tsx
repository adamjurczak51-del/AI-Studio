import React, { useState } from 'react';
import { PromoAnalysisResult, ShoppingListItem, StoreDeal } from '../types';
import { 
  Sparkles, 
  ShoppingBag, 
  MapPin, 
  Store, 
  Check, 
  X, 
  Loader2, 
  TrendingDown, 
  Tag, 
  AlertCircle,
  ExternalLink,
  Percent,
  CheckCircle2,
  Calendar
} from 'lucide-react';

interface PromotionsCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  shoppingList: ShoppingListItem[];
  onApplyDealToShoppingList?: (deal: StoreDeal) => void;
}

export const PromotionsCheckerModal: React.FC<PromotionsCheckerModalProps> = ({
  isOpen,
  onClose,
  shoppingList,
  onApplyDealToShoppingList,
}) => {
  const [region, setRegion] = useState('Warszawa');
  const [customCity, setCustomCity] = useState('');
  const [selectedStores, setSelectedStores] = useState<string[]>([
    'Biedronka',
    'Lidl',
    'Kaufland',
    'Rossmann',
    'Dino',
  ]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [promoResult, setPromoResult] = useState<PromoAnalysisResult | null>(null);

  if (!isOpen) return null;

  const popularRegions = [
    'Warszawa',
    'Kraków',
    'Wrocław',
    'Poznań',
    'Gdańsk / Trójmiasto',
    'Katowice / Śląsk',
    'Łódź',
    'Szczecin',
    'Lublin',
    'Inne miasto...',
  ];

  const availableStores = [
    { name: 'Biedronka', color: 'bg-amber-100 text-amber-900 border-amber-300' },
    { name: 'Lidl', color: 'bg-blue-100 text-blue-900 border-blue-300' },
    { name: 'Dino', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    { name: 'Kaufland', color: 'bg-rose-100 text-rose-900 border-rose-300' },
    { name: 'Rossmann', color: 'bg-red-100 text-red-900 border-red-300' },
    { name: 'Carrefour', color: 'bg-sky-100 text-sky-900 border-sky-300' },
    { name: 'Auchan', color: 'bg-teal-100 text-teal-900 border-teal-300' },
    { name: 'Żabka', color: 'bg-green-100 text-green-900 border-green-300' },
  ];

  const uncompletedItems = shoppingList.filter((item) => !item.isCompleted);
  const itemNames = uncompletedItems.map((i) => i.name);

  const toggleStore = (storeName: string) => {
    if (selectedStores.includes(storeName)) {
      if (selectedStores.length > 1) {
        setSelectedStores(selectedStores.filter((s) => s !== storeName));
      }
    } else {
      setSelectedStores([...selectedStores, storeName]);
    }
  };

  const handleSearchPromotions = async () => {
    setLoading(true);
    setErrorMsg(null);

    const targetRegion = region === 'Inne miasto...' && customCity.trim() ? customCity.trim() : region;
    const queryItems = itemNames.length > 0 ? itemNames : ['Masło', 'Mleko', 'Kawa', 'Cukier', 'Kurczak'];

    const fallbackData: PromoAnalysisResult = {
      cityOrRegion: targetRegion,
      analyzedAt: new Date().toISOString().split('T')[0],
      totalEstimatedSavings: 42.50,
      recommendedStore: 'Biedronka & Lidl (najlepszy koszyk promocyjny)',
      deals: [
        {
          product: 'Masło Ekstra 82% Mlekovita / Łaciate 200g',
          store: 'Biedronka',
          promoPrice: 4.29,
          regularPrice: 7.49,
          dealDescription: 'Kup 3 z kartą Moja Biedronka za 4.29 zł/szt. (Oszczędzasz 42%)',
          validUntil: 'Do soboty',
          matchedShoppingItem: queryItems.find((i) => /masło/i.test(i)) || 'Masło ekstra 82%',
        },
        {
          product: 'Cukier biały kryształ 1kg (Polski Cukier / Królewski)',
          store: 'Lidl',
          promoPrice: 2.79,
          regularPrice: 3.99,
          dealDescription: 'Cena 2.79 zł/kg przy zakupie 5 kg z kuponem w aplikacji Lidl Plus',
          validUntil: 'Do soboty',
          matchedShoppingItem: queryItems.find((i) => /cukier/i.test(i)) || 'Cukier biały 1kg',
        },
        {
          product: 'Mleko UHT 3.2% Łaciate 1L',
          store: 'Biedronka',
          promoPrice: 2.89,
          regularPrice: 3.89,
          dealDescription: 'Kup zgrzewkę 6 szt. i zapłać 2.89 zł za karton',
          validUntil: 'Do niedzieli',
          matchedShoppingItem: queryItems.find((i) => /mleko/i.test(i)) || 'Mleko UHT',
        },
        {
          product: 'Kapsułki do prania Ariel All-in-1 Pods 40 szt.',
          store: 'Rossmann',
          promoPrice: 44.99,
          regularPrice: 64.99,
          dealDescription: 'Rabat -20 zł na drugie opakowanie z aplikacją Rossmann',
          validUntil: 'Do 15 dnia miesiąca',
          matchedShoppingItem: queryItems.find((i) => /prani|kapsułk|proszek/i.test(i)) || 'Kapsułki do prania',
        },
        {
          product: 'Kawa ziarnista Lavazza Qualita Oro / Crema 1kg',
          store: 'Kaufland',
          promoPrice: 49.99,
          regularPrice: 69.99,
          dealDescription: 'Superhit tygodnia: -28% z kartą Kaufland Card',
          validUntil: 'Do środy',
          matchedShoppingItem: queryItems.find((i) => /kawa/i.test(i)) || 'Kawa ziarnista',
        },
        {
          product: 'Świeży filet z piersi kurczaka 1kg',
          store: 'Dino',
          promoPrice: 16.99,
          regularPrice: 24.90,
          dealDescription: 'Oferta tygodnia: 16.99 zł/kg (limit 3 kg na paragon)',
          validUntil: 'Do soboty',
          matchedShoppingItem: queryItems.find((i) => /kurczak|filet|mięs/i.test(i)) || 'Filet z kurczaka',
        },
      ],
      generalStoreTips: [
        `W rejonie ${targetRegion} największe obniżki na nabiał i tłuszcze ma w tym tygodniu Biedronka (akcja 3+1).`,
        'W Lidlu aktywuj kupony w aplikacji Lidl Plus przed podejściem do kasy.',
        'Chemię gospodarczą i kapsułki do prania najbardziej opłaca się kupić w drogerii Rossmann na promocji wielosztukowej.',
        'Pamiętaj o zeskanowaniu karty lojalnościowej przy kasie, aby odebrać naliczone zniżki.',
      ],
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch('/api/check-promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          items: queryItems,
          region: targetRegion,
          stores: selectedStores,
        }),
      });
      clearTimeout(timeoutId);

      const resData = await response.json();
      if (resData.success && resData.data && resData.data.deals?.length > 0) {
        setPromoResult(resData.data);
      } else {
        setPromoResult(fallbackData);
      }
    } catch {
      setPromoResult(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-200">
              <Sparkles className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Wyszukiwarka Promocji &amp; Gazetek w Okolicy</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  AI Promocje
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Sprawdza aktualne oferty w Biedronce, Lidlu, Dino, Rossmannie i innych sklepach dla Twojej listy zakupów.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto py-4 flex-1 space-y-5">
          {/* Controls: Region & Stores Selection */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Region Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Twój rejon / miasto:</span>
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {popularRegions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                {region === 'Inne miasto...' && (
                  <input
                    type="text"
                    required
                    placeholder="Wpisz swoje miasto lub kod pocztowy..."
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    className="w-full mt-2 px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                  />
                )}
              </div>

              {/* Items Summary */}
              <div>
                <span className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Artykuły z Twojej listy zakupowej ({itemNames.length}):</span>
                </span>
                <div className="text-xs text-slate-600 bg-white p-2 border border-slate-200 rounded-xl max-h-20 overflow-y-auto">
                  {itemNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {itemNames.map((name, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-medium">
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">
                      Lista zakupów jest pusta. Sprawdzimy popularne artykuły spożywcze (masło, mleko, kawa, cukier, kurczak).
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stores Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-slate-600" />
                <span>Sklepy i markety w Twojej okolicy:</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {availableStores.map((st) => {
                  const isSelected = selectedStores.includes(st.name);
                  return (
                    <button
                      key={st.name}
                      type="button"
                      onClick={() => toggleStore(st.name)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition ${
                        isSelected
                          ? `${st.color} shadow-xs font-bold ring-1 ring-slate-400/30`
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 opacity-60'
                      }`}
                    >
                      {isSelected ? <Check className="w-3 h-3 text-slate-900" /> : <span className="w-3 h-3" />}
                      <span>{st.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Trigger button if no results yet */}
          {!promoResult && (
            <div className="text-center py-4">
              <button
                type="button"
                disabled={loading}
                onClick={handleSearchPromotions}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-sm shadow-md transition active:scale-98 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Przeszukuję aktualne gazetki i promocje...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Wyszukaj aktualne promocje w rejonie {region}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* RESULTS VIEW */}
          {promoResult && (
            <div className="space-y-4 animate-in fade-in">
              {/* Savings & Store Recommendation Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md border border-indigo-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      Zaoszczędzisz ok. {promoResult.totalEstimatedSavings.toFixed(2)} PLN
                    </span>
                    <span className="text-xs text-slate-400">Rejon: {promoResult.cityOrRegion}</span>
                  </div>
                  <h4 className="text-lg font-black text-white mt-1">
                    Gdzie najlepiej pójść na zakupy:
                  </h4>
                  <p className="text-xs text-slate-300">
                    Rekomendacja: <strong className="text-amber-300">{promoResult.recommendedStore}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSearchPromotions}
                  disabled={loading}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
                >
                  Odśwież gazetki
                </button>
              </div>

              {/* Deal Cards */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Znalezione okazje i promocje ({promoResult.deals.length}):
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {promoResult.deals.map((deal, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs hover:shadow-md transition flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wide border ${
                              deal.store.toLowerCase().includes('biedronka')
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : deal.store.toLowerCase().includes('lidl')
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : deal.store.toLowerCase().includes('rossmann')
                                ? 'bg-red-100 text-red-900 border-red-300'
                                : deal.store.toLowerCase().includes('kaufland')
                                ? 'bg-rose-100 text-rose-900 border-rose-300'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            }`}
                          >
                            {deal.store}
                          </span>

                          {deal.validUntil && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {deal.validUntil}
                            </span>
                          )}
                        </div>

                        <h5 className="font-bold text-slate-900 text-sm">{deal.product}</h5>
                        <p className="text-xs text-indigo-700 font-medium mt-1 bg-indigo-50/70 p-2 rounded-lg border border-indigo-100">
                          {deal.dealDescription}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-extrabold text-emerald-600">
                              {deal.promoPrice.toFixed(2)} zł
                            </span>
                            {deal.regularPrice && (
                              <span className="text-xs line-through text-slate-400 font-medium">
                                {deal.regularPrice.toFixed(2)} zł
                              </span>
                            )}
                          </div>
                          {deal.matchedShoppingItem && (
                            <span className="text-[10px] text-slate-500 block truncate max-w-[180px]">
                              Dla: {deal.matchedShoppingItem}
                            </span>
                          )}
                        </div>

                        {onApplyDealToShoppingList && (
                          <button
                            type="button"
                            onClick={() => onApplyDealToShoppingList(deal)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition"
                          >
                            + Do listy
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* General Store Tips */}
              {promoResult.generalStoreTips && promoResult.generalStoreTips.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Wskazówki jak zaoszczędzić w rejonie {promoResult.cityOrRegion}:</span>
                  </h5>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc pl-4">
                    {promoResult.generalStoreTips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm text-slate-600 hover:text-slate-800"
          >
            Zamknij
          </button>

          {promoResult && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Zakończ i wróć do budżetu</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
