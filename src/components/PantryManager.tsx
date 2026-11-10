import React, { useState } from 'react';
import { PantryItem, ShoppingListItem, FamilyMember } from '../types';
import { 
  Package, 
  ShoppingBag, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  Check, 
  Trash2, 
  Edit3, 
  Sparkles,
  Camera,
  Layers,
  CheckCircle,
  PackageCheck
} from 'lucide-react';

interface PantryManagerProps {
  pantryItems: PantryItem[];
  shoppingList: ShoppingListItem[];
  currentMember: FamilyMember;
  onUpdatePantryItem: (item: PantryItem) => void;
  onAddPantryItem: (item: Omit<PantryItem, 'id'>) => void;
  onDeletePantryItem: (id: string) => void;
  onUpdateShoppingItem: (item: ShoppingListItem) => void;
  onAddShoppingItem: (item: Omit<ShoppingListItem, 'id' | 'addedAt'>) => void;
  onDeleteShoppingItem: (id: string) => void;
  onOpenEmptyPackageScanner: () => void;
  onOpenReceiptScanner: () => void;
  onOpenPromotionsModal: () => void;
  onOpenScanProductsModal: () => void;
}

export const PantryManager: React.FC<PantryManagerProps> = ({
  pantryItems,
  shoppingList,
  currentMember,
  onUpdatePantryItem,
  onAddPantryItem,
  onDeletePantryItem,
  onUpdateShoppingItem,
  onAddShoppingItem,
  onDeleteShoppingItem,
  onOpenEmptyPackageScanner,
  onOpenReceiptScanner,
  onOpenPromotionsModal,
  onOpenScanProductsModal,
}) => {
  const [subTab, setSubTab] = useState<'pantry' | 'shoppingList'>('pantry');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // New Item Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Makarony, ryże i kasze');
  const [newQuantity, setNewQuantity] = useState('2');
  const [newUnit, setNewUnit] = useState('szt.');
  const [newMinQuantity, setNewMinQuantity] = useState('1');
  const [newLocation, setNewLocation] = useState('Szafka w kuchni');

  // New Shopping Item input
  const [newShopItemName, setNewShopItemName] = useState('');
  const [newShopItemQty, setNewShopItemQty] = useState('1');

  const categories = [
    'ALL',
    'Makarony, ryże i kasze',
    'Nabiał i sery',
    'Przyprawy i dodatki',
    'Napoje',
    'Chemia i czystość',
    'Konserwy i przetwory',
    'Pieczywo',
    'Inne produkty',
  ];

  // Filter items
  const filteredItems = pantryItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const lowStockItems = pantryItems.filter((item) => item.quantity <= item.minQuantity);

  const handleCreatePantryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    onAddPantryItem({
      name: newName.trim(),
      category: newCategory,
      quantity: parseFloat(newQuantity) || 1,
      unit: newUnit,
      minQuantity: parseFloat(newMinQuantity) || 1,
      location: newLocation.trim() || undefined,
    });

    setNewName('');
    setShowAddModal(false);
  };

  const handleAddQuickShoppingItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopItemName.trim()) return;

    onAddShoppingItem({
      name: newShopItemName.trim(),
      quantity: parseFloat(newShopItemQty) || 1,
      unit: 'szt.',
      category: 'Spożywcze & Supermarket',
      isCompleted: false,
      addedByMemberId: currentMember.id,
    });

    setNewShopItemName('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 text-white shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Magazyn Domowy &amp; Spiżarnia
            </span>
            {lowStockItems.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/30 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {lowStockItems.length} {lowStockItems.length === 1 ? 'produkt na wyczerpaniu' : 'produkty na wyczerpaniu'}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Stan Spiżarni &amp; Magazynu Produktów
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Stany magazynowe uzupełniają się automatycznie ze skanowanych paragonów oraz zmniejszają po zrobieniu zdjęcia pustego opakowania.
          </p>
        </div>

        {/* Quick action triggers */}
        <div className="flex flex-wrap items-center gap-2">
          {currentMember.permissions.canManagePantry && (
            <button
              onClick={onOpenScanProductsModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition"
              title="Zrób zdjęcie jednemu lub wielu produktom bez paragonu aby dodać je do spiżarni"
            >
              <Camera className="w-4 h-4 text-emerald-200" />
              <span>Dodaj ze zdjęcia (bez paragonu)</span>
            </button>
          )}

          {currentMember.permissions.canScanReceipts && (
            <button
              onClick={onOpenReceiptScanner}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs sm:text-sm shadow-md transition"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Dodaj z paragonu</span>
            </button>
          )}

          {currentMember.permissions.canManagePantry && (
            <button
              onClick={onOpenEmptyPackageScanner}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs sm:text-sm shadow-md transition"
            >
              <Camera className="w-4 h-4" />
              <span>Zdejmij stan (opakowanie)</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs: Spiżarnia vs Lista Zakupów */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex space-x-2">
          <button
            onClick={() => setSubTab('pantry')}
            className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
              subTab === 'pantry'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Stan Magazynu ({pantryItems.length})</span>
          </button>
          <button
            onClick={() => setSubTab('shoppingList')}
            className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
              subTab === 'shoppingList'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Lista Zakupów &amp; Braki ({shoppingList.filter((i) => !i.isCompleted).length})</span>
          </button>
        </div>

        {subTab === 'pantry' && (
          <div className="flex items-center gap-2">
            {currentMember.permissions.canManagePantry && (
              <button
                onClick={onOpenScanProductsModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs"
                title="Szybkie dodawanie produktów ze zdjęcia bez paragonu"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Skanuj produkty</span>
              </button>
            )}
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ręcznie dodaj produkt</span>
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: STAN MAGAZYNU */}
      {subTab === 'pantry' && (
        <div className="space-y-4">
          {/* Search & Category Filter Pills */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Szukaj w spiżarni..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white font-semibold shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat === 'ALL' ? 'Wszystkie działy' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Pantry Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const isLowStock = item.quantity <= item.minQuantity;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition bg-white flex flex-col justify-between shadow-xs hover:shadow-md ${
                    isLowStock ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[11px] font-semibold text-slate-500 px-2 py-0.5 rounded-md bg-slate-100">
                        {item.category}
                      </span>
                      {isLowStock && (
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Niski stan
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                    {item.location && (
                      <p className="text-xs text-slate-500 mt-0.5">Miejsce: {item.location}</p>
                    )}
                  </div>

                  {/* Stock adjuster controls */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Ilość w spiżarni:
                      </span>
                      <div className="text-lg font-black text-slate-900">
                        {item.quantity} <span className="text-xs font-semibold text-slate-500">{item.unit}</span>
                      </div>
                    </div>

                    {/* +/- adjustment buttons */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                      <button
                        onClick={() => {
                          const newQ = Math.max(0, item.quantity - 1);
                          onUpdatePantryItem({ ...item, quantity: newQ });
                        }}
                        title="Zmniejsz o 1 (lub użyj skanera pustych opakowań)"
                        className="w-7 h-7 rounded-md bg-white hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition shadow-2xs"
                      >
                        -
                      </button>
                      <button
                        onClick={() => {
                          onUpdatePantryItem({ ...item, quantity: item.quantity + 1 });
                        }}
                        title="Zwiększ stan o 1"
                        className="w-7 h-7 rounded-md bg-white hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition shadow-2xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Brak produktów pasujących do filtru</p>
              <p className="text-xs text-slate-500">Zeskanuj paragon lub dodaj pozycje ręcznie do magazynu.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LISTA ZAKUPÓW & BRAKÓW */}
      {subTab === 'shoppingList' && (
        <div className="space-y-4">
          {/* BANER SPRAWDZANIA PROMOCJI W GAZETKACH */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-50 to-orange-50 border border-amber-300 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-amber-200">
                <Sparkles className="w-5 h-5 text-amber-100" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>Wyszukiwarka promocji w okolicznych sklepach</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                    Biedronka, Lidl, Dino, Kaufland
                  </span>
                </h4>
                <p className="text-xs text-slate-600">
                  Sprawdź, które artykuły z Twojej listy zakupowej są teraz w promocji lub gazetkach w Twoim rejonie.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenPromotionsModal}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition active:scale-98 whitespace-nowrap flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Sprawdź promocje na te artykuły</span>
            </button>
          </div>

          {/* Quick Add Shopping Item Form */}
          <form
            onSubmit={handleAddQuickShoppingItem}
            className="flex gap-2 p-3 bg-white border border-slate-200 rounded-xl shadow-xs"
          >
            <input
              type="text"
              required
              placeholder="Co trzeba dokupić? (np. Jajka ściółkowe 10 szt, Chleb, Masło)"
              value={newShopItemName}
              onChange={(e) => setNewShopItemName(e.target.value)}
              className="flex-1 px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="number"
              step="1"
              min="1"
              value={newShopItemQty}
              onChange={(e) => setNewShopItemQty(e.target.value)}
              className="w-16 px-2 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg text-center font-bold"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-lg shadow-xs transition"
            >
              + Dodaj do listy
            </button>
          </form>

          {/* Shopping items list */}
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 shadow-xs">
            {shoppingList.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 flex items-center justify-between gap-3 transition ${
                  item.isCompleted ? 'bg-slate-50/70' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={item.isCompleted}
                    onChange={(e) => onUpdateShoppingItem({ ...item, isCompleted: e.target.checked })}
                    className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span
                      className={`text-sm font-semibold block ${
                        item.isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {item.name}
                    </span>
                    <span className="text-xs text-slate-500">
                      Ilość: {item.quantity} {item.unit} • Kategoria: {item.category}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteShoppingItem(item.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition"
                  title="Usuń z listy"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {shoppingList.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-500">
                Lista zakupów jest pusta! Gdy w spiżarni skończy się produkt lub rozpoznasz puste opakowanie, pojawi się tutaj automatycznie.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: DODAJ RĘCZNIE DO SPIŻARNI */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Dodaj produkt do spiżarni</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreatePantryItem} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nazwa produktu *</label>
                <input
                  type="text"
                  required
                  placeholder="np. Mąka pszenna typ 500 1kg, Kawa ziarnista"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dział / Kategoria</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {categories.filter((c) => c !== 'ALL').map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ilość</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    className="w-full px-2 py-2 text-sm border border-slate-300 rounded-lg text-center font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jednostka</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full px-2 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="szt.">szt.</option>
                    <option value="opak.">opak.</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="l">l</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Próg min.</label>
                  <input
                    type="number"
                    step="1"
                    value={newMinQuantity}
                    onChange={(e) => setNewMinQuantity(e.target.value)}
                    className="w-full px-2 py-2 text-sm border border-slate-300 rounded-lg text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Miejsce przechowywania</label>
                <input
                  type="text"
                  placeholder="np. Szafka górna, Lodówka, Spiżarnia regał 2"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                >
                  Dodaj do magazynu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
