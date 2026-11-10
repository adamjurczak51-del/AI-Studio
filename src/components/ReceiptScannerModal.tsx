import React, { useState, useRef } from 'react';
import { Account, Category, FamilyMember, ScannedReceiptResult, LiveShoppingSession, Vehicle } from '../types';
import { 
  Receipt, 
  Camera, 
  Upload, 
  FileText, 
  Sparkles, 
  Check, 
  X, 
  AlertCircle, 
  Loader2, 
  Plus, 
  Trash2, 
  Store, 
  Calendar, 
  CreditCard,
  ShoppingBag,
  PackageCheck,
  ShoppingCart,
  ShieldCheck,
  Car
} from 'lucide-react';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  currentMember: FamilyMember;
  allMembers: FamilyMember[];
  pendingShoppingSessions?: LiveShoppingSession[];
  preselectedSessionId?: string | null;
  vehicles?: Vehicle[];
  onSaveReceipt: (data: {
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
      items: any[];
      linkedShoppingSessionId?: string;
      isReconciledFromBasket?: boolean;
      assignedVehicleId?: string;
      isVehicleExpense?: boolean;
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
  }) => void;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  currentMember,
  allMembers,
  pendingShoppingSessions = [],
  preselectedSessionId = null,
  vehicles = [],
  onSaveReceipt,
}) => {
  const [activeInputTab, setActiveInputTab] = useState<'photo' | 'text'>('photo');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reconciliation with live basket session (Anti-Duplication)
  const [linkedSessionId, setLinkedSessionId] = useState<string | null>(preselectedSessionId);

  // Vehicle assignment & refuel integration
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [updateVehicleFuel, setUpdateVehicleFuel] = useState<boolean>(true);

  // Scanned / Extracted result
  const [scanResult, setScanResult] = useState<ScannedReceiptResult | null>(null);

  // Form selection for saving
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [selectedMemberId, setSelectedMemberId] = useState(currentMember.id);
  const [syncToPantry, setSyncToPantry] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle image upload from file or camera
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Safe client-side heuristic receipt parser (works seamlessly offline or on static CDN like Netlify)
  const parseReceiptLocally = (
    text: string,
    image: string | null,
    availableCategories: Category[]
  ): ScannedReceiptResult => {
    const defaultCategory = availableCategories[0]?.name || 'Spożywcze & Supermarket';
    const today = new Date().toISOString().split('T')[0];

    if (!text || text.trim().length === 0) {
      return {
        shopName: image ? 'Paragon ze zdjęcia' : 'Zakupy',
        date: today,
        totalAmount: 0,
        receiptNumber: `PAR-${Date.now().toString().slice(-6)}`,
        paymentMethod: 'Karta płatnicza',
        suggestedAccount: 'Konto Główne',
        items: [
          {
            name: 'Pozycja 1',
            quantity: 1,
            unit: 'szt.',
            unitPrice: 0,
            totalPrice: 0,
            category: defaultCategory,
            isPantryItem: true,
            pantryCategory: 'Inne produkty',
          },
        ],
      };
    }

    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

    // 1. Detect Shop Name
    let detectedShop = '';
    const textLower = text.toLowerCase();
    if (textLower.includes('biedronka') || textLower.includes('jeronimo')) {
      detectedShop = 'Biedronka';
    } else if (textLower.includes('lidl')) {
      detectedShop = 'Lidl';
    } else if (textLower.includes('kaufland')) {
      detectedShop = 'Kaufland';
    } else if (textLower.includes('dino')) {
      detectedShop = 'Dino';
    } else if (textLower.includes('rossmann')) {
      detectedShop = 'Rossmann';
    } else if (textLower.includes('hebe')) {
      detectedShop = 'Hebe';
    } else if (textLower.includes('orlen')) {
      detectedShop = 'PKN Orlen';
    } else if (textLower.includes('bp ') || textLower.includes('british petroleum')) {
      detectedShop = 'BP';
    } else if (textLower.includes('shell')) {
      detectedShop = 'Shell';
    } else if (textLower.includes('żabka') || textLower.includes('zabka')) {
      detectedShop = 'Żabka';
    } else if (textLower.includes('auchan')) {
      detectedShop = 'Auchan';
    } else if (textLower.includes('carrefour')) {
      detectedShop = 'Carrefour';
    } else if (textLower.includes('castorama')) {
      detectedShop = 'Castorama';
    } else if (textLower.includes('leroy')) {
      detectedShop = 'Leroy Merlin';
    } else if (textLower.includes('pepco')) {
      detectedShop = 'Pepco';
    } else if (textLower.includes('action')) {
      detectedShop = 'Action';
    } else {
      const candidate = lines.find(
        (l) => !/paragon|fiskalny|witamy|sklep|data|nip/i.test(l) && l.length > 2
      );
      detectedShop = candidate ? candidate.slice(0, 40) : 'Zakupy';
    }

    // 2. Detect Date
    let detectedDate = today;
    const dateMatch = text.match(/\b(202[4-9][\.\-/]\d{2}[\.\-/]\d{2}|\d{2}[\.\-/]\d{2}[\.\-/]202[4-9])\b/);
    if (dateMatch) {
      const rawD = dateMatch[1].replace(/[\.\/]/g, '-');
      if (rawD.startsWith('202')) {
        detectedDate = rawD;
      } else {
        const parts = rawD.split('-');
        if (parts.length === 3) {
          detectedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
    }

    // 3. Detect Receipt Number
    let receiptNr = '';
    const nrMatch = text.match(/(?:nr|paragon|rachunek|dok)[:\s#]*([a-zA-Z0-9/\-]+)/i);
    if (nrMatch && nrMatch[1].length >= 3) {
      receiptNr = nrMatch[1];
    }

    // 4. Detect Total
    let totalAmount = 0;
    const totalMatch = text.match(/(?:suma|razem|do zapłaty|zapłacono|total|suma pln)[:\s]*([\d\s]+[,\.]\d{2})/i);
    if (totalMatch) {
      totalAmount = parseFloat(totalMatch[1].replace(/\s/g, '').replace(',', '.')) || 0;
    }

    const categorizeItem = (name: string): { category: string; isPantry: boolean; pantryCat?: string } => {
      const n = name.toLowerCase();
      if (/paliwo|efecta|verva|diesel|benzyna|pb95|pb98|lpg|on\b/.test(n)) {
        return { category: 'Paliwo & Transport', isPantry: false };
      }
      if (/proszek|kapsułki|ariel|vizir|fairy|płyn|szampon|mydło|pasta|papier|ręcznik|domestos|gąbka|zmywark|chustecz|dezodorant/.test(n)) {
        return { category: 'Chemia & Kosmetyki', isPantry: true, pantryCat: 'Chemia i czystość' };
      }
      if (/lek|tabletki|syrop|maść|paracetamol|ibuprom|apap|witamina|apteka|opatrunek/.test(n)) {
        return { category: 'Zdrowie & Leki', isPantry: false };
      }
      if (/kawa|herbata|sok|woda|cola|pepsi|napój|piwo|wino/.test(n)) {
        return { category: 'Spożywcze & Supermarket', isPantry: true, pantryCat: 'Napoje' };
      }
      if (/chleb|bułka|bagietka|kajzerka|drożdż/.test(n)) {
        return { category: 'Spożywcze & Supermarket', isPantry: true, pantryCat: 'Pieczywo' };
      }
      if (/makaron|ryż|kasza|mąka|cukier|olej|oliwa/.test(n)) {
        return { category: 'Spożywcze & Supermarket', isPantry: true, pantryCat: 'Makarony, ryże i kasze' };
      }
      if (/ser|mleko|jogurt|masło|twaróg|śmietana|kefir|jaj/.test(n)) {
        return { category: 'Spożywcze & Supermarket', isPantry: true, pantryCat: 'Nabiał i sery' };
      }
      if (/czekolad|ciast|baton|cukierki|chipsy|paluszki/.test(n)) {
        return { category: 'Spożywcze & Supermarket', isPantry: true, pantryCat: 'Przekąski i słodycze' };
      }
      return { category: defaultCategory, isPantry: true, pantryCat: 'Inne produkty' };
    };

    // 5. Detect Items
    const items: ScannedReceiptResult['items'] = [];
    const priceRegex = /([\d\s]+[,\.]\d{2})\s*(?:[A-Da-d]|zł|pln)?$/;
    const multRegex = /(\d+(?:[\.,]\d+)?)\s*(?:szt|kg|opak|l|litr)?\s*[*xX]\s*(\d+[\.,]\d{2})/;

    for (const line of lines) {
      if (/suma|razem|podatek|fiskalny|karta|gotówka|blik|reszta|nip|ptub|ptua/i.test(line)) {
        continue;
      }
      const pMatch = line.match(priceRegex);
      if (pMatch) {
        const priceVal = parseFloat(pMatch[1].replace(/\s/g, '').replace(',', '.'));
        let rawName = line.slice(0, pMatch.index).trim();
        let qty = 1;
        let unit = 'szt.';
        let uPrice = priceVal;

        const mMatch = rawName.match(multRegex);
        if (mMatch) {
          qty = parseFloat(mMatch[1].replace(',', '.')) || 1;
          uPrice = parseFloat(mMatch[2].replace(',', '.')) || priceVal;
          rawName = rawName.replace(multRegex, '').trim();
        }

        rawName = rawName.replace(/^\d+[\.\)]\s*/, '').replace(/[=*]$/, '').trim();

        if (rawName.length > 1 && priceVal > 0) {
          const catInfo = categorizeItem(rawName);
          items.push({
            name: rawName,
            quantity: qty,
            unit,
            unitPrice: uPrice,
            totalPrice: priceVal,
            category: catInfo.category,
            isPantryItem: catInfo.isPantry,
            pantryCategory: catInfo.pantryCat,
          });
        }
      }
    }

    if (items.length === 0) {
      const amount = totalAmount > 0 ? totalAmount : 0;
      const catInfo = categorizeItem(detectedShop);
      items.push({
        name: `Zakupy (${detectedShop})`,
        quantity: 1,
        unit: 'szt.',
        unitPrice: amount,
        totalPrice: amount,
        category: catInfo.category,
        isPantryItem: catInfo.isPantry,
        pantryCategory: catInfo.pantryCat,
      });
    }

    if (totalAmount === 0 && items.length > 0) {
      totalAmount = Math.round(items.reduce((s, it) => s + it.totalPrice, 0) * 100) / 100;
    }

    return {
      shopName: detectedShop,
      date: detectedDate,
      totalAmount,
      receiptNumber: receiptNr || undefined,
      paymentMethod: 'Karta płatnicza',
      suggestedAccount: 'Konto Główne',
      items,
    };
  };

  // Run AI Receipt Extraction via /api/scan-receipt with defensive fallback
  const processReceipt = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      let parsed: ScannedReceiptResult | null = null;

      try {
        const response = await fetch('/api/scan-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: imagePreview,
            text: rawText,
            categories: categories.map((c) => c.name),
          }),
        });

        // Defensively read text to avoid SyntaxError: Unexpected token '<', "<!DOCTYPE"...
        const responseText = await response.text();
        if (responseText && !responseText.trim().startsWith('<')) {
          const resData = JSON.parse(responseText);
          if (resData.success && resData.data) {
            parsed = resData.data;
          }
        }
      } catch (backendErr) {
        console.warn('Backend OCR route unavailable or returned non-JSON, using local parser:', backendErr);
      }

      // If backend did not provide valid JSON (e.g. running statically on Netlify), run local parser
      if (!parsed) {
        parsed = parseReceiptLocally(rawText, imagePreview, categories);
      }

      setScanResult(parsed);
    } catch (err: any) {
      console.error(err);
      // Fallback guarantees user is never blocked
      const fallback = parseReceiptLocally(rawText, imagePreview, categories);
      setScanResult(fallback);
    } finally {
      setLoading(false);
    }
  };

  // Add custom item line to scan result
  const addItem = () => {
    if (!scanResult) return;
    const defaultCat = categories.find((c) => c.type === 'EXPENSE')?.name || 'Spożywcze & Supermarket';
    const newItem = {
      name: 'Nowy produkt',
      quantity: 1,
      unit: 'szt.',
      unitPrice: 0,
      totalPrice: 0,
      category: defaultCat,
      isPantryItem: true,
      pantryCategory: 'Inne produkty',
    };
    setScanResult({
      ...scanResult,
      items: [...scanResult.items, newItem],
    });
  };

  // Edit item inside scan result
  const updateResultItem = (index: number, field: string, value: any) => {
    if (!scanResult) return;
    const newItems = [...scanResult.items];
    newItems[index] = { ...newItems[index], [field]: value };
    // Recalculate total
    const newTotal = newItems.reduce((acc, it) => acc + (Number(it.totalPrice) || 0), 0);
    setScanResult({
      ...scanResult,
      totalAmount: Math.round(newTotal * 100) / 100,
      items: newItems,
    });
  };

  const removeItem = (index: number) => {
    if (!scanResult) return;
    const newItems = scanResult.items.filter((_: any, i: number) => i !== index);
    const newTotal = newItems.reduce((acc: number, it: any) => acc + (Number(it.totalPrice) || 0), 0);
    setScanResult({
      ...scanResult,
      totalAmount: Math.round(newTotal * 100) / 100,
      items: newItems,
    });
  };

  // Check if receipt relates to vehicles (fuel, screenwash, oil, wipers, petrol stations)
  const isAutoReceipt = React.useMemo(() => {
    if (!scanResult) return false;
    const textToSearch = `${scanResult.shopName || ''} ${scanResult.items.map((it: any) => (it.name || '') + ' ' + (it.category || '')).join(' ')}`.toLowerCase();
    const autoKeywords = [
      'orlen', 'shell', 'bp', 'circle k', 'moya', 'lotos', 'amic', 'stacja paliw',
      'paliw', 'diesel', 'pb95', 'pb98', 'efecta', 'v-power', 'olej silnik', 'spryskiwac',
      'wycieracz', 'adblue', 'motoryzac', 'samochod'
    ];
    return autoKeywords.some((kw) => textToSearch.includes(kw));
  }, [scanResult]);

  // Detected fuel item
  const detectedFuelItem = React.useMemo(() => {
    if (!scanResult) return null;
    return scanResult.items.find((it: any) => {
      const n = (it.name || '').toLowerCase();
      return (
        n.includes('paliw') ||
        n.includes('diesel') ||
        n.includes('pb95') ||
        n.includes('pb98') ||
        n.includes('efecta') ||
        n.includes('v-power') ||
        n.includes('on ') ||
        n.includes(' lpg') ||
        n.includes('benzyn')
      );
    });
  }, [scanResult]);

  // If auto receipt detected and vehicle not chosen yet, pick first vehicle by default
  React.useEffect(() => {
    if (isAutoReceipt && vehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [isAutoReceipt, vehicles, selectedVehicleId]);

  // Save the receipt to Budget & Pantry
  const handleFinalSave = () => {
    if (!scanResult) return;

    const matchedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];
    const matchedMember = allMembers.find((m) => m.id === selectedMemberId) || currentMember;

    // Determine primary category
    const mainCategoryName = scanResult.items[0]?.category || 'Spożywcze & Supermarket';
    const matchedCategory = categories.find((c) => c.name.toLowerCase() === mainCategoryName.toLowerCase()) || categories[0];

    // If reconciled with an existing basket session, do NOT re-add to pantry to avoid duplication!
    const isReconciled = !!linkedSessionId;
    const pantryItemsToAdd = (syncToPantry && !isReconciled)
      ? scanResult.items
          .filter((item: any) => item.isPantryItem)
          .map((item: any) => ({
            name: item.name,
            category: item.pantryCategory || 'Makarony, ryże i kasze',
            quantity: item.quantity || 1,
            unit: item.unit || 'szt.',
          }))
      : [];

    let vehicleRefuelData: any = undefined;
    if (selectedVehicleId && detectedFuelItem && updateVehicleFuel) {
      const liters = detectedFuelItem.quantity > 3
        ? detectedFuelItem.quantity
        : (detectedFuelItem.unitPrice ? Math.round((detectedFuelItem.totalPrice / detectedFuelItem.unitPrice) * 10) / 10 : Math.round((detectedFuelItem.totalPrice / 6.20) * 10) / 10);
      const unitPrice = detectedFuelItem.unitPrice || Math.round((detectedFuelItem.totalPrice / (liters || 1)) * 100) / 100;

      vehicleRefuelData = {
        vehicleId: selectedVehicleId,
        liters: Math.max(liters, 1),
        pricePerLiter: unitPrice,
        totalCost: detectedFuelItem.totalPrice,
        stationName: scanResult.shopName || 'Stacja Paliw',
        fullTank: true,
      };
    }

    onSaveReceipt({
      transaction: {
        date: scanResult.date || new Date().toISOString().split('T')[0],
        title: isReconciled
          ? `Rozliczenie paragonu: ${scanResult.shopName || 'Kaufland'}`
          : isAutoReceipt && selectedVehicleId
          ? `Auto (${vehicles.find(v => v.id === selectedVehicleId)?.name || 'Pojazd'}): ${scanResult.shopName || 'Wydatki samochodowe'}`
          : `Paragon: ${scanResult.shopName || 'Zakupy'}`,
        amount: scanResult.totalAmount,
        accountId: matchedAccount.id,
        categoryId: matchedCategory.id,
        categoryName: matchedCategory.name,
        memberId: matchedMember.id,
        memberName: matchedMember.name,
        shopName: scanResult.shopName,
        receiptNumber: scanResult.receiptNumber,
        linkedShoppingSessionId: linkedSessionId || undefined,
        isReconciledFromBasket: isReconciled,
        assignedVehicleId: selectedVehicleId || undefined,
        isVehicleExpense: isAutoReceipt || !!selectedVehicleId,
        items: scanResult.items.map((it: any, idx: number) => ({
          id: `item-${Date.now()}-${idx}`,
          name: it.name,
          quantity: it.quantity,
          unit: it.unit,
          unitPrice: it.unitPrice || it.totalPrice / (it.quantity || 1),
          totalPrice: it.totalPrice,
          category: it.category,
          isPantryItem: it.isPantryItem,
          pantryCategory: it.pantryCategory,
        })),
      },
      pantryItemsToAdd,
      reconciledSessionId: linkedSessionId || undefined,
      vehicleRefuelData,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Inteligentny Skaner Paragonów &amp; E-maili</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-500" /> AI OCR Gemini
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Wykrywa produkty, ceny, przypisuje kategorie i automatycznie uzupełnia stan spiżarni domowej!
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

        {/* Modal Body - Scrollable */}
        <div className="overflow-y-auto py-4 flex-1 space-y-5">
          {!scanResult ? (
            <>
              {/* Tabs for Input - Real scanning & text import */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setActiveInputTab('photo')}
                  className={`pb-2.5 px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
                    activeInputTab === 'photo'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Zdjęcie lub Skan paragonu</span>
                </button>
                <button
                  onClick={() => setActiveInputTab('text')}
                  className={`pb-2.5 px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
                    activeInputTab === 'text'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Import tekstu / E-paragon (Lidl, Biedronka)</span>
                </button>
              </div>

              {/* TAB 1: PHOTO */}
              {activeInputTab === 'photo' && (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-50 hover:bg-indigo-50/20"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageUpload}
                      className="hidden"
                    />

                    {imagePreview ? (
                      <div className="space-y-3">
                        <img
                          src={imagePreview}
                          alt="Podgląd paragonu"
                          className="max-h-64 mx-auto rounded-lg shadow-sm border border-slate-200 object-contain"
                        />
                        <p className="text-xs text-indigo-600 font-medium">Kliknij, aby zmienić zdjęcie</p>
                      </div>
                    ) : (
                      <div className="py-6 space-y-2">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 mx-auto flex items-center justify-center">
                          <Upload className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800">Zrób zdjęcie aparatem lub wybierz plik z paragonem</h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                          Obsługiwane formaty: aparat w telefonie, pliki JPG, PNG, WEBP ze skanera lub galerii.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: TEXT / EMAIL IMPORT */}
              {activeInputTab === 'text' && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700">
                    Wklej treść e-maila lub podsumowanie z aplikacji lojalnościowej (Lidl Plus, Moja Biedronka, Kaufland, Rossmann):
                  </label>
                  <textarea
                    rows={9}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Wklej tutaj treść e-paragonu lub skopiowany tekst zakupów..."
                    className="w-full px-3 py-2 text-xs sm:text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500">
                    System automatycznie rozpozna sklep, datę, kwotę oraz poszczególne pozycje towarowe.
                  </p>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </>
          ) : (
            /* WYNIK ROZPOZNANIA PARAGONU (INTERAKTYWNA WERYFIKACJA) */
            <div className="space-y-5 animate-in fade-in">
              {/* Receipt Summary Box */}
              <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-400 block">Wykryty sklep / sprzedawca:</span>
                  <input
                    type="text"
                    value={scanResult.shopName}
                    onChange={(e) => setScanResult({ ...scanResult, shopName: e.target.value })}
                    className="bg-transparent border-b border-slate-700 text-lg font-bold text-white focus:outline-none focus:border-indigo-400"
                  />
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span>Data: {scanResult.date}</span>
                    {scanResult.receiptNumber && <span>Nr: {scanResult.receiptNumber}</span>}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Łączna kwota do rozliczenia:</span>
                  <div className="text-2xl font-black text-emerald-400">
                    {scanResult.totalAmount.toFixed(2)} PLN
                  </div>
                </div>
              </div>

              {/* OCHRONA PRZED DUBLOWANIEM: Powiązanie z koszykiem na żywo */}
              {pendingShoppingSessions.length > 0 && (
                <div
                  className={`p-4 rounded-xl border transition ${
                    linkedSessionId
                      ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                      : 'bg-amber-50/90 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-2xs ${
                          linkedSessionId ? 'bg-emerald-600' : 'bg-amber-500'
                        }`}
                      >
                        <ShoppingCart className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">
                            {linkedSessionId
                              ? 'Ochrona przed dublowaniem aktywna!'
                              : 'Wykryto zakupy ze skanera koszyka na żywo'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/80 border border-current">
                            {pendingShoppingSessions[0]?.storeName} ({pendingShoppingSessions[0]?.items.length} pozycji)
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          {linkedSessionId
                            ? 'Produkty z koszyka zostały już dodane do magazynu w trakcie zakupów. Zeskanowanie tego paragonu zaktualizuje ostateczną kwotę i numer fiskalny BEZ ponownego dodawania artykułów do spiżarni.'
                            : `Czy ten paragon dotyczy wcześniejszych zakupów w ${pendingShoppingSessions[0]?.storeName}? Powiąż go, aby nie dodawać drugi raz tych samych produktów do spiżarni.`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (linkedSessionId) {
                            setLinkedSessionId(null);
                          } else {
                            setLinkedSessionId(pendingShoppingSessions[0].id);
                            setSyncToPantry(false);
                          }
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
                          linkedSessionId
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-amber-600 text-white hover:bg-amber-700'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>{linkedSessionId ? 'Powiązano (Bez dublowania)' : 'Powiąż z koszykiem'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Automotive & Refuel Assignment Card (User request 2: 'widząc paragon dotyczący auta zapytać do którego auta przypisać zakup') */}
              {vehicles.length > 0 && (
                <div
                  className={`p-4 rounded-xl border transition ${
                    isAutoReceipt ? 'bg-amber-50/90 border-amber-300 shadow-2xs' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-2xs ${
                        isAutoReceipt ? 'bg-amber-600' : 'bg-slate-600'
                      }`}
                    >
                      <Car className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">
                          {isAutoReceipt
                            ? '🚗 Wykryto zakup motoryzacyjny / stację paliw!'
                            : 'Przypisanie wydatku do auta w rodzinie (opcjonalnie)'}
                        </span>
                        {isAutoReceipt && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                            Wykryto: Paliwo / Akcesoria samochodowe
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Do którego auta przypisać ten wydatek? Wybór pojazdu pozwoli na automatyczną analizę kosztów eksploatacji w zakładce Garaż.
                      </p>

                      {/* Vehicle selection buttons */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                        {vehicles.map((v) => {
                          const isSelected = selectedVehicleId === v.id;
                          return (
                            <button
                              type="button"
                              key={v.id}
                              onClick={() => setSelectedVehicleId(isSelected ? null : v.id)}
                              className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition ${
                                isSelected
                                  ? 'bg-amber-100/90 border-amber-500 text-amber-950 font-bold shadow-xs ring-1 ring-amber-400'
                                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{v.avatarEmoji || (v.name.includes('Skoda') ? '🚙' : '🚗')}</span>
                                <div>
                                  <div className="text-xs font-bold leading-tight">
                                    {v.name}
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {v.plateNumber} • {v.fuelType}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] font-semibold text-slate-500 block">
                                  Bak: {v.currentFuelLiters}/{v.tankCapacity || v.fuelTankCapacity || 50}L
                                </span>
                                <span
                                  className={`text-[10px] font-bold ${
                                    isSelected ? 'text-amber-800' : 'text-slate-400'
                                  }`}
                                >
                                  {isSelected ? '✓ Wybrany' : 'Wybierz'}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Fuel sync toggle if fuel detected */}
                      {detectedFuelItem && selectedVehicleId && (
                        <div className="mt-3 flex items-center gap-2 p-2.5 bg-white rounded-lg border border-amber-200 text-xs">
                          <input
                            type="checkbox"
                            id="updateFuelTank"
                            checked={updateVehicleFuel}
                            onChange={(e) => setUpdateVehicleFuel(e.target.checked)}
                            className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                          />
                          <label htmlFor="updateFuelTank" className="font-semibold text-amber-950 cursor-pointer">
                            ⛽ Zaktualizuj stan paliwa w baku ({detectedFuelItem.name} — {detectedFuelItem.totalPrice.toFixed(2)} PLN) i dodaj wpis do historii tankowań w Garażu
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Assignment controls: which account and which family member */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Z którego konta pokryć wydatek?
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (Saldo: {acc.balance.toFixed(2)} PLN)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kto z rodziny dokonał zakupu?
                  </label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {allMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pantry sync checkbox option */}
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <input
                  type="checkbox"
                  id="syncPantry"
                  checked={syncToPantry}
                  onChange={(e) => setSyncToPantry(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                />
                <label htmlFor="syncPantry" className="text-xs sm:text-sm font-semibold text-emerald-900 cursor-pointer flex items-center gap-1.5">
                  <PackageCheck className="w-4 h-4 text-emerald-600" />
                  <span>Automatycznie uzupełnij stany w domowej spiżarni dla oznaczonych produktów spożywczych i chemii</span>
                </label>
              </div>

              {/* Items Breakdown Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Rozpoznane pozycje z paragonu ({scanResult.items.length})
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Możesz poprawić nazwę, kategorię lub zaznaczyć czy dodać do spiżarni
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Pozycja / Towar</th>
                        <th className="py-2.5 px-3 w-20">Ilość</th>
                        <th className="py-2.5 px-3 w-24">Cena łączna</th>
                        <th className="py-2.5 px-3">Kategoria budżetu</th>
                        <th className="py-2.5 px-3 text-center">Do spiżarni?</th>
                        <th className="py-2.5 px-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {scanResult.items.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateResultItem(idx, 'name', e.target.value)}
                              className="w-full font-medium text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none"
                            />
                            {item.isPantryItem && (
                              <span className="text-[10px] text-emerald-600 block">
                                Dział spiżarni: {item.pantryCategory || 'Makarony & Kasze'}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.1"
                                value={item.quantity}
                                onChange={(e) => updateResultItem(idx, 'quantity', parseFloat(e.target.value) || 1)}
                                className="w-12 px-1 py-0.5 border border-slate-200 rounded text-center text-xs"
                              />
                              <span className="text-slate-500 text-[11px]">{item.unit || 'szt.'}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            <input
                              type="number"
                              step="0.01"
                              value={item.totalPrice}
                              onChange={(e) => updateResultItem(idx, 'totalPrice', parseFloat(e.target.value) || 0)}
                              className="w-16 px-1 py-0.5 border border-slate-200 rounded text-right font-semibold text-xs"
                            />{' '}
                            zł
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={item.category}
                              onChange={(e) => updateResultItem(idx, 'category', e.target.value)}
                              className="w-full py-1 px-1.5 border border-slate-200 rounded text-xs text-slate-700 bg-slate-50"
                            >
                              {categories
                                .filter((c) => c.type === 'EXPENSE')
                                .map((c) => (
                                  <option key={c.id} value={c.name}>
                                    {c.name}
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={item.isPantryItem}
                              onChange={(e) => updateResultItem(idx, 'isPantryItem', e.target.checked)}
                              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                              title="Czy po zapisie dodać ten towar do domowego magazynu spiżarni?"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-2.5 flex justify-end">
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Dodaj kolejną pozycję</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 flex-shrink-0">
          {!scanResult ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm text-slate-600 hover:text-slate-800"
              >
                Anuluj
              </button>
              <button
                type="button"
                disabled={loading || (!imagePreview && !rawText.trim())}
                onClick={processReceipt}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-md transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analizuję paragon przez Gemini AI...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Rozpoznaj pozycje (Gemini AI OCR)</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setScanResult(null)}
                className="px-4 py-2 text-xs sm:text-sm text-slate-600 hover:text-slate-800"
              >
                &larr; Wróć do skanera
              </button>
              <button
                type="button"
                onClick={handleFinalSave}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition"
              >
                <Check className="w-4 h-4" />
                <span>Zatwierdź i zaktualizuj budżet oraz spiżarnię</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
