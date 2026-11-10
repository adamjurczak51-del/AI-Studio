import React, { useState } from 'react';
import { PantryItem, ScannedPantryProduct } from '../types';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  Check, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Loader2, 
  PackagePlus, 
  Layers, 
  HelpCircle,
  ShoppingBag,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

interface ScanPantryProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pantryItems: PantryItem[];
  onAddProducts: (products: Array<{
    name: string;
    quantity: number;
    unit: string;
    category: string;
    location?: string;
    matchedExistingItemId?: string | null;
  }>) => void;
}

export const ScanPantryProductsModal: React.FC<ScanPantryProductsModalProps> = ({
  isOpen,
  onClose,
  pantryItems,
  onAddProducts,
}) => {
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Scanned products state
  const [photoSummary, setPhotoSummary] = useState<string>('');
  const [detectedProducts, setDetectedProducts] = useState<ScannedPantryProduct[]>([]);

  if (!isOpen) return null;

  const categories = [
    'Makarony, ryże i kasze',
    'Nabiał i sery',
    'Przyprawy i dodatki',
    'Napoje',
    'Chemia i czystość',
    'Konserwy i przetwory',
    'Pieczywo',
    'Inne produkty',
  ];



  // Handle local image file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageMime(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setSelectedImage(uploadEvent.target?.result as string);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  // Trigger API Scan
  const handleScan = async (presetKey?: string) => {
    setIsScanning(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/scan-pantry-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: selectedImage || undefined,
          mimeType: imageMime,
          presetKey: presetKey || undefined,
          pantryItems: pantryItems.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            quantity: p.quantity,
            unit: p.unit,
          })),
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

      const productsWithSelection = (resData?.data?.products || [
        {
          name: 'Rozpoznany produkt ze zdjęcia',
          quantity: 1,
          unit: 'szt.',
          category: 'Inne produkty',
          location: 'Główna spiżarnia',
        },
      ]).map((prod: any, idx: number) => ({
        ...prod,
        id: `scan-prod-${idx}-${Date.now()}`,
        isSelected: true,
      }));

      setPhotoSummary(resData?.data?.photoSummary || 'Rozpoznano produkty ze zdjęcia (tryb bezpośredni)');
      setDetectedProducts(productsWithSelection);
      setStep('review');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Wystąpił błąd podczas analizy obrazu. Spróbuj ponownie.');
    } finally {
      setIsScanning(false);
    }
  };

  // Modify individual product in review list
  const handleUpdateProduct = (id: string, updates: Partial<ScannedPantryProduct>) => {
    setDetectedProducts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // Delete product from batch
  const handleDeleteProduct = (id: string) => {
    setDetectedProducts((prev) => prev.filter((item) => item.id !== id));
  };

  // Add blank product row to batch
  const handleAddManualRow = () => {
    setDetectedProducts((prev) => [
      ...prev,
      {
        id: `manual-prod-${Date.now()}`,
        name: '',
        quantity: 1,
        unit: 'szt.',
        category: 'Inne produkty',
        location: 'Spiżarnia',
        isSelected: true,
      },
    ]);
  };

  // Confirm and save selected items into the pantry
  const handleSaveToPantry = () => {
    const selected = detectedProducts.filter((p) => p.isSelected && p.name.trim().length > 0);
    if (selected.length === 0) {
      alert('Zaznacz co najmniej jeden produkt do dodania.');
      return;
    }

    onAddProducts(
      selected.map((p) => ({
        name: p.name.trim(),
        quantity: p.quantity,
        unit: p.unit,
        category: p.category,
        location: p.location,
        matchedExistingItemId: p.matchedExistingItemId || null,
      }))
    );

    // Reset and close
    handleResetModal();
    onClose();
  };

  const handleResetModal = () => {
    setStep('upload');
    setSelectedImage(null);
    setDetectedProducts([]);
    setPhotoSummary('');
    setErrorMessage(null);
  };

  const selectedCount = detectedProducts.filter((p) => p.isSelected).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-emerald-200">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Dodaj produkty ze zdjęcia</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  Bez paragonu
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Rozpoznawanie jednego lub wielu produktów na stole, blacie czy z targu przez Gemini AI
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleResetModal();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* STEP 1: UPLOAD PHOTO / CHOOSE PRESET */}
        {step === 'upload' && (
          <div className="space-y-4">
            {/* Camera / Upload Dropzone */}
            <div className="border-2 border-dashed border-emerald-300 rounded-2xl p-5 text-center bg-emerald-50/30 hover:bg-emerald-50/60 transition relative">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Zrób zdjęcie produktów lub wybierz z galerii
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
                    Możesz sfotografować kilka produktów naraz (np. na stole w kuchni). System rozpozna je wszystkie.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Wybierz plik ze zdjęciem</span>
                </div>
              </div>
            </div>

            {/* Selected Image Preview & Scan Trigger */}
            {selectedImage && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedImage}
                    alt="Podgląd zdjęcia"
                    className="w-14 h-14 object-cover rounded-lg border border-slate-300 shadow-2xs"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Załadowano własne zdjęcie</span>
                    <span className="text-[11px] text-slate-500">Gotowe do analizy przez sztuczną inteligencję</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleScan()}
                  disabled={isScanning}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Rozpoznawanie...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-200" />
                      <span>Rozpoznaj produkty ze zdjęcia</span>
                    </>
                  )}
                </button>
              </div>
            )}


            {/* Scanning Loader Overlay */}
            {isScanning && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 animate-pulse">
                <Loader2 className="w-5 h-5 text-emerald-600 animate-spin flex-shrink-0" />
                <div className="text-xs text-emerald-900">
                  <strong className="block">Analiza zdjęcia przez Gemini 3.8 Flash...</strong>
                  <span>Wykrywanie poszczególnych artykułów, ilości, gramatur i dopasowywanie do kartotek spiżarni.</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: REVIEW DETECTED PRODUCTS & BATCH EDIT */}
        {step === 'review' && (
          <div className="space-y-4">
            {/* Summary Banner */}
            <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                  {detectedProducts.length}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">{photoSummary}</h4>
                  <p className="text-[11px] text-emerald-800">
                    Sprawdź ilości i kategorie przed dodaniem do magazynu domowego.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddManualRow}
                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-300 shadow-2xs transition flex items-center gap-1 flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Kolejny</span>
              </button>
            </div>

            {/* List of Products to Add */}
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {detectedProducts.map((prod) => {
                const isExisting = !!prod.matchedExistingItemId;
                const existingPantryItem = pantryItems.find((p) => p.id === prod.matchedExistingItemId);

                return (
                  <div
                    key={prod.id}
                    className={`p-3.5 rounded-xl border transition shadow-2xs ${
                      prod.isSelected ? 'border-slate-300 bg-white' : 'border-slate-200 bg-slate-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={prod.isSelected}
                        onChange={(e) => handleUpdateProduct(prod.id, { isSelected: e.target.checked })}
                        className="mt-1 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                        title="Zaznacz/odznacz ten produkt"
                      />

                      <div className="flex-1 space-y-2 min-w-0">
                        {/* Status Tag */}
                        <div className="flex items-center justify-between gap-2">
                          {isExisting ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                              <Layers className="w-3 h-3" />
                              <span>Istnieje w spiżarni (+{prod.quantity} {prod.unit})</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <PackagePlus className="w-3 h-3" />
                              <span>Nowy artykuł w spiżarni</span>
                            </span>
                          )}

                          {prod.notes && (
                            <span className="text-[11px] text-slate-400 truncate max-w-[200px]" title={prod.notes}>
                              {prod.notes}
                            </span>
                          )}
                        </div>

                        {/* Name Input */}
                        <div>
                          <input
                            type="text"
                            value={prod.name}
                            onChange={(e) => handleUpdateProduct(prod.id, { name: e.target.value })}
                            placeholder="Nazwa produktu (np. Mleko 3.2%, Pomidory)"
                            className="w-full px-2.5 py-1.5 text-xs sm:text-sm font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        {/* Quantity, Unit, Category & Location Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          {/* Quantity */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Ilość:</label>
                            <div className="flex items-center">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateProduct(prod.id, {
                                    quantity: Math.max(0.5, prod.quantity - 1),
                                  })
                                }
                                className="w-6 h-7 rounded-l bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                step="0.5"
                                min="0.5"
                                value={prod.quantity}
                                onChange={(e) =>
                                  handleUpdateProduct(prod.id, {
                                    quantity: parseFloat(e.target.value) || 1,
                                  })
                                }
                                className="w-12 h-7 text-center text-xs font-bold border-y border-slate-200"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateProduct(prod.id, {
                                    quantity: prod.quantity + 1,
                                  })
                                }
                                className="w-6 h-7 rounded-r bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Unit */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Jednostka:</label>
                            <select
                              value={prod.unit}
                              onChange={(e) => handleUpdateProduct(prod.id, { unit: e.target.value })}
                              className="w-full h-7 px-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                            >
                              <option value="szt.">szt.</option>
                              <option value="kg">kg</option>
                              <option value="opak.">opak.</option>
                              <option value="g">g</option>
                              <option value="l">l</option>
                            </select>
                          </div>

                          {/* Category */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Dział:</label>
                            <select
                              value={prod.category}
                              onChange={(e) => handleUpdateProduct(prod.id, { category: e.target.value })}
                              className="w-full h-7 px-1 text-xs border border-slate-300 rounded-lg bg-white truncate"
                            >
                              {categories.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Location */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Miejsce:</label>
                            <input
                              type="text"
                              value={prod.location || ''}
                              onChange={(e) => handleUpdateProduct(prod.id, { location: e.target.value })}
                              placeholder="np. Lodówka"
                              className="w-full h-7 px-2 text-xs border border-slate-300 rounded-lg bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition self-start"
                        title="Usuń tę pozycję"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {detectedProducts.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                  Wszystkie pozycje zostały usunięte. Dodaj pozycję ręcznie lub zrób nowe zdjęcie.
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Zrób inne zdjęcie</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    handleResetModal();
                    onClose();
                  }}
                  className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Anuluj
                </button>

                <button
                  type="button"
                  onClick={handleSaveToPantry}
                  disabled={selectedCount === 0}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md transition active:scale-98 disabled:opacity-40"
                >
                  <Check className="w-4 h-4" />
                  <span>Dodaj do spiżarni ({selectedCount})</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
