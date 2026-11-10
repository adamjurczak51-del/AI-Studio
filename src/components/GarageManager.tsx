import React, { useState } from 'react';
import { Vehicle, RefuelLog, FamilyMember, Account, Category } from '../types';
import { 
  Car, 
  Fuel, 
  Gauge, 
  Wrench, 
  ShieldAlert, 
  Calendar, 
  Plus, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Droplets, 
  CreditCard, 
  TrendingDown, 
  Trash2, 
  Edit3, 
  Sparkles,
  ArrowRight,
  Receipt,
  Camera
} from 'lucide-react';

interface GarageManagerProps {
  vehicles: Vehicle[];
  refuelLogs: RefuelLog[];
  allMembers: FamilyMember[];
  accounts: Account[];
  categories: Category[];
  currentMember: FamilyMember;
  onAddVehicle: (veh: Omit<Vehicle, 'id'>) => void;
  onUpdateVehicle: (veh: Vehicle) => void;
  onDeleteVehicle: (id: string) => void;
  onRecordRefuel: (log: Omit<RefuelLog, 'id'>, updateVehicleFuel: boolean) => void;
  onRecordService: (vehicleId: string, updates: Partial<Vehicle>, cost?: number, accountId?: string) => void;
}

export const GarageManager: React.FC<GarageManagerProps> = ({
  vehicles,
  refuelLogs,
  allMembers,
  accounts,
  categories,
  currentMember,
  onAddVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onRecordRefuel,
  onRecordService,
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [isRefuelModalOpen, setIsRefuelModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);

  // Refuel Form States
  const [refuelLiters, setRefuelLiters] = useState('40.0');
  const [refuelTotalCost, setRefuelTotalCost] = useState('260.00');
  const [refuelStation, setRefuelStation] = useState('Orlen');
  const [refuelMileage, setRefuelMileage] = useState('');
  const [refuelFullTank, setRefuelFullTank] = useState(true);
  const [refuelAccountId, setRefuelAccountId] = useState(accounts[0]?.id || '');

  // Service Form States
  const [serviceType, setServiceType] = useState<'OIL' | 'INSPECTION' | 'INSURANCE'>('OIL');
  const [serviceDate, setServiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [serviceCost, setServiceCost] = useState('350.00');
  const [serviceMileage, setServiceMileage] = useState('');
  const [serviceAccountId, setServiceAccountId] = useState(accounts[0]?.id || '');

  // New Vehicle Form States
  const [newVehName, setNewVehName] = useState('');
  const [newVehPlate, setNewVehPlate] = useState('');
  const [newVehFuelType, setNewVehFuelType] = useState<Vehicle['fuelType']>('PETROL');
  const [newVehTank, setNewVehTank] = useState('50');
  const [newVehAvgConsumption, setNewVehAvgConsumption] = useState('6.5');
  const [newVehMileage, setNewVehMileage] = useState('120000');
  const [newVehMemberId, setNewVehMemberId] = useState(currentMember.id);
  const [newVehInspectionDate, setNewVehInspectionDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });
  const [newVehInsuranceDate, setNewVehInsuranceDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });

  const activeVehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];

  // Helper calculations for deadlines
  const getDaysDiff = (targetDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDaysSince = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - target.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Check if any vehicle needs urgent attention
  const vehiclesNeedingAttention = vehicles.filter((v) => {
    const inspectionDays = getDaysDiff(v.technicalInspectionDate);
    const insuranceDays = getDaysDiff(v.insuranceExpiryDate);
    const fuelPercent = (v.currentFuelLiters / v.tankCapacity) * 100;
    const daysSinceFuel = getDaysSince(v.lastRefuelDate);
    return inspectionDays <= 30 || insuranceDays <= 30 || fuelPercent <= 25 || daysSinceFuel >= 12;
  });

  // Open Refuel Modal for a specific vehicle
  const handleOpenRefuel = (veh: Vehicle) => {
    setSelectedVehicleId(veh.id);
    setRefuelMileage(veh.currentMileage.toString());
    setRefuelLiters((veh.tankCapacity - veh.currentFuelLiters).toFixed(1));
    const estimatedCost = (veh.tankCapacity - veh.currentFuelLiters) * 6.50;
    setRefuelTotalCost(Math.max(50, estimatedCost).toFixed(2));
    setIsRefuelModalOpen(true);
  };

  const handleSubmitRefuel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVehicle) return;

    const litersNum = parseFloat(refuelLiters) || 0;
    const costNum = parseFloat(refuelTotalCost) || 0;
    const mileageNum = parseInt(refuelMileage, 10) || activeVehicle.currentMileage;
    const pricePerLiter = litersNum > 0 ? parseFloat((costNum / litersNum).toFixed(2)) : 6.50;

    onRecordRefuel(
      {
        vehicleId: activeVehicle.id,
        date: new Date().toISOString().split('T')[0],
        liters: litersNum,
        totalCost: costNum,
        pricePerLiter,
        currentMileage: mileageNum,
        stationName: refuelStation,
        fullTank: refuelFullTank,
        accountId: refuelAccountId,
      },
      true
    );

    setIsRefuelModalOpen(false);
  };

  const handleSubmitService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVehicle) return;

    const costNum = parseFloat(serviceCost) || 0;
    const mileageNum = parseInt(serviceMileage, 10) || activeVehicle.currentMileage;

    const updates: Partial<Vehicle> = {};
    if (serviceType === 'OIL') {
      updates.lastOilServiceDate = serviceDate;
      updates.lastOilServiceMileage = mileageNum;
      updates.currentMileage = Math.max(activeVehicle.currentMileage, mileageNum);
    } else if (serviceType === 'INSPECTION') {
      updates.technicalInspectionDate = serviceDate;
      updates.technicalInspectionCost = costNum;
    } else if (serviceType === 'INSURANCE') {
      updates.insuranceExpiryDate = serviceDate;
      updates.insuranceCost = costNum;
    }

    onRecordService(activeVehicle.id, updates, costNum, serviceAccountId);
    setIsServiceModalOpen(false);
  };

  const handleSubmitNewVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehName.trim() || !newVehPlate.trim()) return;

    const assigned = allMembers.find((m) => m.id === newVehMemberId) || currentMember;

    onAddVehicle({
      name: newVehName.trim(),
      plateNumber: newVehPlate.trim().toUpperCase(),
      fuelType: newVehFuelType,
      tankCapacity: parseFloat(newVehTank) || 50,
      currentFuelLiters: (parseFloat(newVehTank) || 50) * 0.75,
      avgFuelConsumption: parseFloat(newVehAvgConsumption) || 6.0,
      currentMileage: parseInt(newVehMileage, 10) || 100000,
      assignedMemberId: assigned.id,
      assignedMemberName: assigned.name,
      technicalInspectionDate: newVehInspectionDate,
      insuranceExpiryDate: newVehInsuranceDate,
      lastOilServiceMileage: (parseInt(newVehMileage, 10) || 100000) - 2000,
      lastOilServiceDate: new Date().toISOString().split('T')[0],
      oilServiceIntervalKm: 15000,
      lastRefuelDate: new Date().toISOString().split('T')[0],
      lastRefuelLiters: 40,
      lastRefuelMileage: parseInt(newVehMileage, 10) || 100000,
      avatarEmoji: newVehFuelType === 'HYBRID' || newVehFuelType === 'ELECTRIC' ? '⚡' : '🚗',
    });

    setIsAddVehicleModalOpen(false);
    setNewVehName('');
    setNewVehPlate('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-blue-900/50">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <Car className="w-6 h-6 text-blue-300" />
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-200 border border-blue-400/30">
              Garaż &amp; Flota Samochodowa Rodziny
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Moje Samochody &amp; Asystent Paliwowy
          </h2>
          <p className="text-xs sm:text-sm text-blue-200 leading-relaxed">
            Inteligentny monitoring stanu paliwa, wyliczanie średniego spalania, pilnowanie terminów przeglądów technicznych, ubezpieczeń OC/AC i wymiany oleju.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsAddVehicleModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 text-xs sm:text-sm font-bold shadow-md transition active:scale-95"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Dodaj pojazd</span>
          </button>
        </div>
      </div>

      {/* PROACTIVE REFUELING & MAINTENANCE ALERT CARDS */}
      {vehiclesNeedingAttention.length > 0 && (
        <div className="space-y-3">
          {vehiclesNeedingAttention.map((v) => {
            const fuelPercent = (v.currentFuelLiters / v.tankCapacity) * 100;
            const daysSinceRefuel = getDaysSince(v.lastRefuelDate);
            const inspectionDays = getDaysDiff(v.technicalInspectionDate);
            const insuranceDays = getDaysDiff(v.insuranceExpiryDate);
            const estimatedRangeKm = Math.round((v.currentFuelLiters / v.avgFuelConsumption) * 100);

            return (
              <div
                key={v.id}
                className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-300/80 text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-md">
                    <Fuel className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm sm:text-base">
                        {v.name} ({v.plateNumber})
                      </span>
                      {fuelPercent <= 25 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                          Rezerwa paliwa (~{v.currentFuelLiters.toFixed(1)}L)
                        </span>
                      )}
                      {daysSinceRefuel >= 12 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-200 text-orange-950">
                          Tankowano {daysSinceRefuel} dni temu
                        </span>
                      )}
                      {inspectionDays <= 30 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-200 text-rose-900">
                          Przegląd za {inspectionDays} dni!
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 mt-1 leading-relaxed">
                      {fuelPercent <= 25 || daysSinceRefuel >= 12 ? (
                        <>
                          Szacowany zasięg wynosi <strong>~{estimatedRangeKm} km</strong> przy średnim spalaniu{' '}
                          <strong>{v.avgFuelConsumption} l/100km</strong>. Zaplanuj wizytę na stacji (np. Orlen) przy okazji najbliższego wyjazdu na zakupy lub do lekarza!
                        </>
                      ) : (
                        <>
                          Pamiętaj o zbliżającym się terminie badania technicznego ({v.technicalInspectionDate}).
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => handleOpenRefuel(v)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition active:scale-98"
                  >
                    <Fuel className="w-4 h-4" />
                    <span>Zatankuj teraz</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VEHICLES GRID */}
      {vehicles.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Car className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-bold text-slate-900 text-lg">Brak pojazdów w garażu domowym</h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Dodaj swój pierwszy samochód lub motocykl, aby asystent monitorował stan baku, terminy badań technicznych, ubezpieczenia OC/AC oraz terminy wymiany oleju.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddVehicleModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Dodaj pierwszy pojazd</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {vehicles.map((veh) => {
          const fuelPercent = Math.min(100, Math.max(0, Math.round((veh.currentFuelLiters / veh.tankCapacity) * 100)));
          const estimatedRangeKm = Math.round((veh.currentFuelLiters / veh.avgFuelConsumption) * 100);
          const inspectionDays = getDaysDiff(veh.technicalInspectionDate);
          const insuranceDays = getDaysDiff(veh.insuranceExpiryDate);
          const kmToOilService = (veh.lastOilServiceMileage + veh.oilServiceIntervalKm) - veh.currentMileage;
          const daysSinceRefuel = getDaysSince(veh.lastRefuelDate);

          return (
            <div
              key={veh.id}
              className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-md hover:border-blue-300 transition-all space-y-5"
            >
              {/* Vehicle Title & Driver */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center text-2xl shadow-md shadow-blue-200">
                    {veh.avatarEmoji || '🚗'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-slate-900">
                        {veh.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-300">
                        {veh.plateNumber}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Główny kierowca: <strong>{veh.assignedMemberName}</strong> • Silnik: {veh.fuelType}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVehicleId(veh.id);
                      setServiceMileage(veh.currentMileage.toString());
                      setIsServiceModalOpen(true);
                    }}
                    title="Odnotuj serwis, przegląd lub ubezpieczenie"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                  >
                    <Wrench className="w-4 h-4" />
                  </button>
                  {vehicles.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Czy na pewno usunąć pojazd ${veh.name}?`)) {
                          onDeleteVehicle(veh.id);
                        }
                      }}
                      title="Usuń pojazd"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* FUEL GAUGE & CONSUMPTION CARD */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-3 shadow-inner">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                    <Fuel className="w-4 h-4 text-amber-400" />
                    <span>Stan zbiornika paliwa</span>
                  </div>
                  <span className="font-mono font-bold text-amber-300">
                    {veh.currentFuelLiters.toFixed(1)} / {veh.tankCapacity} L ({fuelPercent}%)
                  </span>
                </div>

                {/* Progress Bar Gauge */}
                <div className="w-full bg-slate-700 h-3 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      fuelPercent <= 20
                        ? 'bg-rose-500 animate-pulse'
                        : fuelPercent <= 40
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${fuelPercent}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-700/60 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Zasięg szacowany</span>
                    <span className="text-xs sm:text-sm font-black text-white">
                      ~{estimatedRangeKm} km
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Średnie spalanie</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-400">
                      {veh.avgFuelConsumption} l/100km
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Ost. tankowanie</span>
                    <span className="text-xs sm:text-sm font-black text-amber-300">
                      {daysSinceRefuel === 0 ? 'Dzisiaj' : `${daysSinceRefuel} dni temu`}
                    </span>
                  </div>
                </div>
              </div>

              {/* KEY STATS & DEADLINES */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {/* Badanie techniczne */}
                <div
                  className={`p-3 rounded-xl border flex flex-col justify-between ${
                    inspectionDays <= 14
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : inspectionDays <= 30
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">
                    Badanie techniczne
                  </span>
                  <div className="font-bold text-xs sm:text-sm mt-1">
                    {veh.technicalInspectionDate}
                  </div>
                  <span className="text-[10px] font-medium mt-1">
                    {inspectionDays < 0
                      ? 'Po terminie!'
                      : inspectionDays === 0
                      ? 'Dzisiaj!'
                      : `Za ${inspectionDays} dni`}
                  </span>
                </div>

                {/* Ubezpieczenie OC/AC */}
                <div
                  className={`p-3 rounded-xl border flex flex-col justify-between ${
                    insuranceDays <= 14
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : insuranceDays <= 30
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">
                    Ubezpieczenie OC/AC
                  </span>
                  <div className="font-bold text-xs sm:text-sm mt-1">
                    {veh.insuranceExpiryDate}
                  </div>
                  <span className="text-[10px] font-medium mt-1">
                    {insuranceDays < 0 ? 'Po terminie!' : `Za ${insuranceDays} dni`}
                  </span>
                </div>

                {/* Serwis olejowy */}
                <div
                  className={`p-3 rounded-xl border flex flex-col justify-between ${
                    kmToOilService <= 1000
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : kmToOilService <= 3000
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">
                    Serwis &amp; Olej
                  </span>
                  <div className="font-bold text-xs sm:text-sm mt-1">
                    {kmToOilService <= 0 ? 'Wymień olej!' : `za ${kmToOilService.toLocaleString()} km`}
                  </div>
                  <span className="text-[10px] font-medium mt-1 text-slate-500">
                    Przebieg: {veh.currentMileage.toLocaleString()} km
                  </span>
                </div>
              </div>

              {/* Action Buttons for this vehicle */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleOpenRefuel(veh)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold shadow-xs transition active:scale-98"
                >
                  <Fuel className="w-4 h-4" />
                  <span>Zatankuj auto</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedVehicleId(veh.id);
                    setServiceMileage(veh.currentMileage.toString());
                    setIsServiceModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Odnotuj serwis</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* REFUEL HISTORY LOG TABLE */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-md space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Fuel className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              Ostatnie tankowania i koszty paliwa
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Automatyczne księgowanie w budżecie domowym
          </span>
        </div>

        {refuelLogs.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">
            Brak zarejestrowanych tankowań. Kliknij „Zatankuj auto”, aby dodać pierwsze tankowanie.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-2 px-3">Data</th>
                  <th className="py-2 px-3">Pojazd</th>
                  <th className="py-2 px-3">Stacja</th>
                  <th className="py-2 px-3">Litry</th>
                  <th className="py-2 px-3">Cena / L</th>
                  <th className="py-2 px-3">Koszt całkowity</th>
                  <th className="py-2 px-3">Licznik (km)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {refuelLogs.map((log) => {
                  const veh = vehicles.find((v) => v.id === log.vehicleId);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-600">{log.date}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {veh?.name || 'Pojazd'} ({veh?.plateNumber})
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{log.stationName}</td>
                      <td className="py-2.5 px-3 text-amber-700 font-bold">{log.liters.toFixed(1)} L</td>
                      <td className="py-2.5 px-3 text-slate-600">{log.pricePerLiter.toFixed(2)} zł</td>
                      <td className="py-2.5 px-3 font-black text-slate-900">
                        {log.totalCost.toFixed(2)} PLN
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{log.currentMileage.toLocaleString()} km</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: TANKOWANIE POJAZDU */}
      {isRefuelModalOpen && activeVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Fuel className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Zatankuj: {activeVehicle.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Rejestracja {activeVehicle.plateNumber} • Zbiornik {activeVehicle.tankCapacity}L
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRefuelModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitRefuel} className="space-y-3.5">
              {/* Szybki paragon z tankowania / testowe stacje */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-amber-700" />
                    <span>Wstaw dane z paragonu stacji paliw:</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setRefuelStation('Orlen');
                      setRefuelLiters('43.5');
                      setRefuelTotalCost('282.75');
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-semibold transition"
                  >
                    Orlen: 43.5L ON (282.75 zł)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRefuelStation('Circle K');
                      setRefuelLiters('28.0');
                      setRefuelTotalCost('181.72');
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-semibold transition"
                  >
                    Circle K: 28L Pb95 (181.72 zł)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRefuelStation('Shell');
                      setRefuelLiters('35.0');
                      setRefuelTotalCost('238.50');
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-semibold transition"
                  >
                    Shell: 35L V-Power (238.50 zł)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ilość litrów (L) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={refuelLiters}
                    onChange={(e) => {
                      setRefuelLiters(e.target.value);
                      const l = parseFloat(e.target.value) || 0;
                      setRefuelTotalCost((l * 6.50).toFixed(2));
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kwota całkowita (PLN) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={refuelTotalCost}
                    onChange={(e) => setRefuelTotalCost(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stacja paliw</label>
                  <select
                    value={refuelStation}
                    onChange={(e) => setRefuelStation(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Orlen">Orlen</option>
                    <option value="Circle K">Circle K</option>
                    <option value="Shell">Shell</option>
                    <option value="BP">BP</option>
                    <option value="Moya">Moya</option>
                    <option value="Kaufland Stacja">Kaufland Stacja</option>
                    <option value="Inna stacja">Inna stacja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Przebieg licznika (km)
                  </label>
                  <input
                    type="number"
                    value={refuelMileage}
                    onChange={(e) => setRefuelMileage(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Konto do rozliczenia wydatku w budżecie domowym *
                </label>
                <select
                  value={refuelAccountId}
                  onChange={(e) => setRefuelAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.balance.toFixed(2)} PLN)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="fullTank"
                  checked={refuelFullTank}
                  onChange={(e) => setRefuelFullTank(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="fullTank" className="text-xs font-semibold text-slate-700">
                  Zatankowano do pełna (zresetuj wskaźnik baku do 100%)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRefuelModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition active:scale-98"
                >
                  Zatwierdź tankowanie ({refuelTotalCost} PLN)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ODNOTUJ SERWIS / PRZEGLĄD */}
      {isServiceModalOpen && activeVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Serwis &amp; Terminy: {activeVehicle.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Zaktualizuj daty przeglądu, ubezpieczenia lub serwisu olejowego
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsServiceModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitService} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rodzaj serwisu / terminu
                </label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  <option value="OIL">🛢️ Wymiana oleju i filtrów</option>
                  <option value="INSPECTION">📋 Badanie techniczne (Przegląd)</option>
                  <option value="INSURANCE">🛡️ Przedłużenie ubezpieczenia OC/AC</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {serviceType === 'OIL' ? 'Data wymiany' : 'Nowy termin ważności'} *
                  </label>
                  <input
                    type="date"
                    required
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Koszt usługi (PLN)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={serviceCost}
                    onChange={(e) => setServiceCost(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>
              </div>

              {serviceType === 'OIL' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Przebieg przy wymianie oleju (km)
                  </label>
                  <input
                    type="number"
                    value={serviceMileage}
                    onChange={(e) => setServiceMileage(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Konto do rozliczenia (opcjonalnie)
                </label>
                <select
                  value={serviceAccountId}
                  onChange={(e) => setServiceAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.balance.toFixed(2)} PLN)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition active:scale-98"
                >
                  Zapisz serwis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DODAJ NOWY POJAZD */}
      {isAddVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Dodaj nowy pojazd do floty
                  </h3>
                  <p className="text-xs text-slate-500">
                    Wpisz parametry auta, pojemność baku i terminy
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddVehicleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitNewVehicle} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Marka i model *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="np. Ford Focus 1.5 TDCi"
                    value={newVehName}
                    onChange={(e) => setNewVehName(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Numer rejestracyjny *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="np. DW 12345"
                    value={newVehPlate}
                    onChange={(e) => setNewVehPlate(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-mono font-bold uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Paliwo</label>
                  <select
                    value={newVehFuelType}
                    onChange={(e) => setNewVehFuelType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="PETROL">Benzyna</option>
                    <option value="DIESEL">Diesel</option>
                    <option value="LPG">LPG</option>
                    <option value="HYBRID">Hybryda</option>
                    <option value="ELECTRIC">Elektryczny</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Zbiornik (L)</label>
                  <input
                    type="number"
                    value={newVehTank}
                    onChange={(e) => setNewVehTank(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Śr. spalanie (l/100km)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newVehAvgConsumption}
                    onChange={(e) => setNewVehAvgConsumption(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Aktualny przebieg (km)
                  </label>
                  <input
                    type="number"
                    value={newVehMileage}
                    onChange={(e) => setNewVehMileage(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Główny kierowca
                  </label>
                  <select
                    value={newVehMemberId}
                    onChange={(e) => setNewVehMemberId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    {allMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Termin badania technicznego
                  </label>
                  <input
                    type="date"
                    value={newVehInspectionDate}
                    onChange={(e) => setNewVehInspectionDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ważność ubezpieczenia OC/AC
                  </label>
                  <input
                    type="date"
                    value={newVehInsuranceDate}
                    onChange={(e) => setNewVehInsuranceDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddVehicleModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition active:scale-98"
                >
                  Dodaj do garażu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
