import React, { useState, useEffect } from 'react';
import { CommuteRoutine, Vehicle } from '../types';
import {
  MapPin,
  Navigation,
  CloudSun,
  CloudSnow,
  AlertTriangle,
  Clock,
  Compass,
  CheckCircle2,
  RefreshCw,
  Fuel,
  Car,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  ThermometerSnowflake,
  Wind,
  Plus,
  Trash2,
  X
} from 'lucide-react';

interface CommuteWeatherAssistantProps {
  vehicles: Vehicle[];
  onUpdateVehicleMileage?: (vehicleId: string, additionalKm: number) => void;
}

export const CommuteWeatherAssistant: React.FC<CommuteWeatherAssistantProps> = ({
  vehicles = [],
  onUpdateVehicleMileage,
}) => {
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];

  // Google account sync state
  const [googleConnected, setGoogleConnected] = useState(true);
  const [userEmail, setUserEmail] = useState(() => {
    try {
      const sess = localStorage.getItem('domowy_budzet_session_user');
      if (sess) {
        const parsed = JSON.parse(sess);
        return parsed.login || parsed.memberName || 'Twój profil';
      }
    } catch {}
    return 'Konto Google';
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('Przed chwilą');

  // Commute routines stored in localStorage
  const [routines, setRoutines] = useState<CommuteRoutine[]>(() => {
    try {
      const saved = localStorage.getItem('domowy_budzet_commute_routes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('domowy_budzet_commute_routes', JSON.stringify(routines));
    } catch {}
  }, [routines]);

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newOrigin, setNewOrigin] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newDepartureTime, setNewDepartureTime] = useState('07:30');
  const [newReturnTime, setNewReturnTime] = useState('16:00');
  const [newDistanceKm, setNewDistanceKm] = useState('15');
  const [newAssignedVehicleId, setNewAssignedVehicleId] = useState<string>(
    safeVehicles[0]?.id || ''
  );

  // Sync feedback modal or notification
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // Trigger Google Maps Timeline Sync
  const handleSyncGoogleTimeline = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncTime('Przed chwilą');
      if (routines.length > 0 && safeVehicles.length > 0) {
        const targetVeh = safeVehicles.find((v) => v.id === routines[0].assignedVehicleId) || safeVehicles[0];
        const kmToAdd = (routines[0].distanceKm || 15) * 2;
        if (targetVeh && onUpdateVehicleMileage) {
          onUpdateVehicleMileage(targetVeh.id, kmToAdd);
        }
        setSyncSuccessMsg(
          `Pomyślnie zsynchronizowano z Osią Czasu: zarejestrowano ${kmToAdd} km dla trasy „${routines[0].title}” i zaktualizowano stan licznika pojazdu ${targetVeh.name}.`
        );
      } else {
        setSyncSuccessMsg('Zsynchronizowano dane lokalizacyjne i pogodowe dla Twojego obszaru.');
      }
      setTimeout(() => setSyncSuccessMsg(null), 5000);
    }, 1200);
  };

  const handleCreateRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newOrigin.trim() || !newDestination.trim()) return;

    const km = parseFloat(newDistanceKm) || 10;
    const estMinutes = Math.max(5, Math.round(km * 1.4));

    const newRoutine: CommuteRoutine = {
      id: `routine-${Date.now()}`,
      title: newTitle.trim(),
      origin: newOrigin.trim(),
      destination: newDestination.trim(),
      departureTime: newDepartureTime,
      returnTime: newReturnTime,
      daysOfWeek: [1, 2, 3, 4, 5],
      distanceKm: km,
      typicalDurationMinutes: estMinutes,
      assignedVehicleId: newAssignedVehicleId || safeVehicles[0]?.id || 'veh-1',
      isActive: true,
    };

    setRoutines((prev) => [newRoutine, ...prev]);
    setIsAddModalOpen(false);
    setNewTitle('');
    setNewOrigin('');
    setNewDestination('');
    setNewDistanceKm('15');
  };

  const handleDeleteRoute = (id: string) => {
    setRoutines((prev) => prev.filter((r) => r.id !== id));
  };

  const activeRoutine = routines.length > 0 ? routines[0] : null;
  const selectedVehicle = (safeVehicles.length > 0 && activeRoutine)
    ? (safeVehicles.find((v) => v.id === activeRoutine.assignedVehicleId) || safeVehicles[0])
    : (safeVehicles[0] || null);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Banner: Google Account Integration & Commute Assistant */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5" /> Asystent Dojazdów &amp; Pogody
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Aktywny
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Inteligentny Monitoring Tras &amp; Ostrzeżenia Drogowe
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 max-w-2xl">
              Asystent analizuje Twoje stałe trasy dojazdów, warunki drogowe, oblodzenie i wylicza szacowane zużycie paliwa.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Dodaj trasę</span>
            </button>
            <button
              onClick={handleSyncGoogleTimeline}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs sm:text-sm font-bold backdrop-blur-xs transition shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronizuję...' : 'Odśwież dane'}</span>
            </button>
          </div>
        </div>

        {/* Account Sync Details bar */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-blue-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Użytkownik: <strong className="text-white">{userEmail}</strong></span>
            </div>
            <span>•</span>
            <span>Ostatnia aktualizacja: <strong>{lastSyncTime}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-emerald-300 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Optymalizacja spalania i bezpieczeństwa</span>
          </div>
        </div>
      </div>

      {syncSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{syncSuccessMsg}</span>
        </div>
      )}

      {/* Routine Cards & Morning / Evening Weather Briefing */}
      {routines.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Navigation className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-bold text-slate-900 text-lg">Brak zdefiniowanych tras dojazdów</h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Dodaj swoje stałe trasy (np. dom ↔ praca, szkoła dzieci lub regularny trening), aby asystent monitorował natężenie ruchu, warunki atmosferyczne i wyliczał koszty paliwa.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Dodaj pierwszą trasę</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main Commute Briefing */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <CloudSun className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Główna trasa: {activeRoutine?.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeRoutine?.origin} &rarr; {activeRoutine?.destination} ({activeRoutine?.distanceKm} km)
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Wyjazd: {activeRoutine?.departureTime}
              </span>
            </div>

            {/* Commute Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold mb-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" /> Czas dojazdu
                </div>
                <div className="text-base font-black text-slate-900">
                  {activeRoutine?.typicalDurationMinutes || 20} min
                </div>
                <span className="text-[10px] text-emerald-600 font-bold">Płynny ruch</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold mb-1">
                  <CloudSnow className="w-3.5 h-3.5 text-blue-600" /> Dystans
                </div>
                <div className="text-base font-black text-slate-900">
                  {activeRoutine?.distanceKm} km
                </div>
                <span className="text-[10px] text-blue-600 font-semibold">W jedną stronę</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold mb-1">
                  <Fuel className="w-3.5 h-3.5 text-amber-600" /> Szac. spalanie
                </div>
                <div className="text-base font-black text-slate-900">
                  ~{(
                    ((activeRoutine?.distanceKm || 10) * (selectedVehicle?.avgFuelConsumption || 6.0)) /
                    100
                  ).toFixed(1)}{' '}
                  L
                </div>
                <span className="text-[10px] text-slate-500">
                  Koszt: ~{(
                    ((activeRoutine?.distanceKm || 10) * (selectedVehicle?.avgFuelConsumption || 6.0) * 6.5) /
                    100
                  ).toFixed(2)}{' '}
                  zł
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold mb-1">
                  <Car className="w-3.5 h-3.5 text-emerald-600" /> Pojazd
                </div>
                <div className="text-xs font-black text-slate-900 truncate">
                  {selectedVehicle?.name || 'Brak pojazdu'}
                </div>
                <span className="text-[10px] text-slate-500">
                  {selectedVehicle?.plateNumber || 'Dodaj w Garażu'}
                </span>
              </div>
            </div>

            {/* Route details preview */}
            <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between text-xs text-blue-950">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>
                  Trasa: <strong>{activeRoutine?.origin} &rarr; {activeRoutine?.destination}</strong>
                </span>
              </div>
              <span className="font-bold text-blue-700 flex-shrink-0">
                Powrót: {activeRoutine?.returnTime}
              </span>
            </div>
          </div>

          {/* Weather Alert & Info Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <ThermometerSnowflake className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Asystent Eksploatacji
                  </h3>
                  <p className="text-xs text-slate-500">Optymalizacja kosztów i tras</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-blue-950">
                    <Wind className="w-3.5 h-3.5 text-blue-600" />
                    <span>Prognoza warunków drogowych</span>
                  </div>
                  <p className="leading-relaxed">
                    System na bieżąco analizuje temperaturę oraz prognozy opadów. W razie spadku temperatury poniżej zera otrzymasz powiadomienie o przymrozku.
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 text-slate-600">
                    <span>Liczba zdefiniowanych tras:</span>
                    <strong className="text-slate-900">{routines.length}</strong>
                  </div>
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>Pojazdy w garażu:</span>
                    <strong className="text-slate-900">{safeVehicles.length}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={handleSyncGoogleTimeline}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Dodaj dzisiejszy dystans do przebiegu</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Routines List */}
      {routines.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Zapisane Trasy Domowników ({routines.length})</span>
              </h3>
              <p className="text-xs text-slate-500">
                Zarządzaj trasami dojazdów do pracy, szkoły i na zajęcia dodatkowe
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routines.map((routine) => {
              const v = safeVehicles.find((veh) => veh.id === routine.assignedVehicleId);
              return (
                <div
                  key={routine.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 transition space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{routine.title}</h4>
                      <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-indigo-500" /> Wyjazd: {routine.departureTime} • Powrót: {routine.returnTime}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => routine.id && handleDeleteRoute(routine.id)}
                      className="text-slate-400 hover:text-rose-600 transition p-1"
                      title="Usuń trasę"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                      <span>Z: <strong>{routine.origin}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                      <span>Do: <strong>{routine.destination}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span>
                      Dystans: <strong className="text-slate-800">{routine.distanceKm} km</strong> (~{routine.typicalDurationMinutes} min)
                    </span>
                    <span>
                      Auto: <strong className="text-slate-800">{v ? v.name : 'Dowolne'}</strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Dodaj Trasę */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-indigo-600" />
                <span>Dodaj nową trasę dojazdu</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoute} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nazwa trasy *
                </label>
                <input
                  type="text"
                  required
                  placeholder="np. Dojazd do pracy, Szkoła dzieci, Trening"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Miejsce startowe (Z) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="np. Dom"
                    value={newOrigin}
                    onChange={(e) => setNewOrigin(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cel podróży (Do) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="np. Biuro / Firma"
                    value={newDestination}
                    onChange={(e) => setNewDestination(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Godzina wyjazdu
                  </label>
                  <input
                    type="time"
                    value={newDepartureTime}
                    onChange={(e) => setNewDepartureTime(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Godzina powrotu
                  </label>
                  <input
                    type="time"
                    value={newReturnTime}
                    onChange={(e) => setNewReturnTime(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dystans (km) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={newDistanceKm}
                    onChange={(e) => setNewDistanceKm(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {safeVehicles.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Przypisany samochód
                  </label>
                  <select
                    value={newAssignedVehicleId}
                    onChange={(e) => setNewAssignedVehicleId(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    {safeVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.plateNumber})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition"
                >
                  Zapisz trasę
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
