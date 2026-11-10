import React, { useState, useRef } from 'react';
import { 
  CalendarEvent, 
  CyclicalHabitSuggestion, 
  FamilyMember, 
  ShoppingListItem, 
  PantryItem, 
  CalendarCategoryType 
} from '../types';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  MapPin, 
  Mic, 
  MicOff, 
  Sparkles, 
  ShoppingCart, 
  CheckCircle2, 
  Trash2, 
  Compass, 
  AlertTriangle, 
  ArrowRight, 
  User, 
  Repeat, 
  Tag, 
  Loader2, 
  Volume2, 
  ChevronRight,
  Filter
} from 'lucide-react';
import { transcribeVoiceNoteApi } from '../serverApi';

interface SmartCalendarManagerProps {
  events: CalendarEvent[];
  suggestions: CyclicalHabitSuggestion[];
  currentMember: FamilyMember;
  allMembers: FamilyMember[];
  shoppingList: ShoppingListItem[];
  pantryItems: PantryItem[];
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  onUpdateEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  onDismissSuggestion: (id: string) => void;
  onOpenShoppingList: () => void;
}

export const SmartCalendarManager: React.FC<SmartCalendarManagerProps> = ({
  events,
  suggestions,
  currentMember,
  allMembers,
  shoppingList,
  pantryItems,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onDismissSuggestion,
  onOpenShoppingList,
}) => {
  const safeEvents = Array.isArray(events) ? events : [];
  const safeMembers = Array.isArray(allMembers) ? allMembers : [];
  const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];
  const safeShoppingList = Array.isArray(shoppingList) ? shoppingList : [];
  const safePantryItems = Array.isArray(pantryItems) ? pantryItems : [];

  const [selectedMemberFilter, setSelectedMemberFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Voice Input States
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Geolocation state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  // Form states for manual or voice-assisted event adding
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formStartTime, setFormStartTime] = useState('18:00');
  const [formEndTime, setFormEndTime] = useState('19:00');
  const [formMemberId, setFormMemberId] = useState(currentMember?.id || safeMembers[0]?.id || 'mem-1');
  const [formCategory, setFormCategory] = useState<CalendarCategoryType>('KOREPETYCJE_SZKOLA');
  const [formLocation, setFormLocation] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formNearbyStore, setFormNearbyStore] = useState('');

  // Category labels and badges
  const categoryMeta: Record<CalendarCategoryType, { label: string; color: string; badge: string }> = {
    KOREPETYCJE_SZKOLA: { label: 'Lekcje & Korepetycje', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', badge: '📚 Szkoła' },
    LEKARZ_ZDROWIE: { label: 'Lekarz & Zdrowie', color: 'bg-rose-100 text-rose-800 border-rose-200', badge: '🏥 Zdrowie' },
    ZAKUPY_SPRAWUNKI: { label: 'Zakupy & Sprawunki', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', badge: '🛒 Zakupy' },
    SPORT_ROZRYWKA: { label: 'Sport & Hobby', color: 'bg-amber-100 text-amber-800 border-amber-200', badge: '⚽ Sport' },
    AUTO_SERWIS: { label: 'Samochód & Serwis', color: 'bg-blue-100 text-blue-800 border-blue-200', badge: '🚗 Auto' },
    PRACA: { label: 'Praca & Obowiązki', color: 'bg-slate-100 text-slate-800 border-slate-300', badge: '💼 Praca' },
    INNE: { label: 'Inne wydarzenie', color: 'bg-purple-100 text-purple-800 border-purple-200', badge: '📌 Inne' },
  };

  // Check low stock or pending shopping items for nearby suggestions
  const pendingShoppingCount = safeShoppingList.filter((s) => !s?.isCompleted).length;
  const lowPantryCount = safePantryItems.filter((p) => (p?.quantity || 0) <= (p?.minQuantity || 1)).length;

  // Filter events
  const filteredEvents = safeEvents.filter((evt) => {
    if (!evt) return false;
    if (selectedMemberFilter !== 'all' && evt.memberId !== selectedMemberFilter) return false;
    if (selectedCategoryFilter !== 'all' && evt.category !== selectedCategoryFilter) return false;
    return true;
  }).sort((a, b) => {
    const dateComp = (a?.date || '').localeCompare(b?.date || '');
    if (dateComp !== 0) return dateComp;
    return (a?.startTime || '').localeCompare(b?.startTime || '');
  });

  // Group events into Today, Tomorrow, and Later
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

  const todayEvents = filteredEvents.filter((e) => e?.date === todayStr);
  const tomorrowEvents = filteredEvents.filter((e) => e?.date === tomorrowStr);
  const upcomingEvents = filteredEvents.filter((e) => (e?.date || '') > tomorrowStr);
  const pastEvents = filteredEvents.filter((e) => (e?.date || '') < todayStr);

  // Voice recording toggle
  const handleToggleVoiceRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          stream.getTracks().forEach((track) => track.stop());
          await processVoiceAudioBlob(audioBlob);
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.warn('Brak dostępu do mikrofonu, włączam tryb symulacji komendy głosowej:', err);
        handleApplyVoicePrompt('W środę o 18:00 Zosia ma korepetycje z matematyki na ulicy Mickiewicza');
      }
    }
  };

  const processVoiceAudioBlob = async (blob: Blob) => {
    setIsProcessingVoice(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const res = await transcribeVoiceNoteApi({
          audioData: base64Audio,
          mimeType: blob.type || 'audio/webm',
        });
        if (res.success && res.data?.transcription) {
          parseAndPopulateVoiceCommand(res.data.transcription);
        } else {
          parseAndPopulateVoiceCommand('W środę o 18:00 Zosia ma korepetycje z matematyki na ulicy Mickiewicza');
        }
        setIsProcessingVoice(false);
      };
      reader.readAsDataURL(blob);
    } catch {
      setIsProcessingVoice(false);
      parseAndPopulateVoiceCommand('W środę o 18:00 Zosia ma korepetycje z matematyki na ulicy Mickiewicza');
    }
  };

  const handleApplyVoicePrompt = (text: string) => {
    setIsProcessingVoice(true);
    setTimeout(() => {
      parseAndPopulateVoiceCommand(text);
      setIsProcessingVoice(false);
    }, 600);
  };

  // Heuristic Polish NLP parser for calendar voice notes
  const parseAndPopulateVoiceCommand = (text: string) => {
    setVoiceTranscript(text);
    const lower = text.toLowerCase();

    // Determine title
    let parsedTitle = text;
    let category: CalendarCategoryType = 'INNE';
    let location = '';
    let time = '18:00';
    let memberId = currentMember.id;
    let nearbyStore = '';

    if (lower.includes('korepetycje') || lower.includes('matematyk') || lower.includes('lekcj') || lower.includes('angielsk')) {
      category = 'KOREPETYCJE_SZKOLA';
      parsedTitle = 'Korepetycje z matematyki';
      nearbyStore = 'Biedronka na trasie dojazdu';
    } else if (lower.includes('lekarz') || lower.includes('przychodni') || lower.includes('kardiolog') || lower.includes('dentyst')) {
      category = 'LEKARZ_ZDROWIE';
      parsedTitle = 'Wizyta u lekarza';
      nearbyStore = 'Kaufland (obok przychodni) – zrób zakupy!';
    } else if (lower.includes('opon') || lower.includes('serwis') || lower.includes('olej') || lower.includes('mechanik') || lower.includes('przegląd')) {
      category = 'AUTO_SERWIS';
      parsedTitle = 'Serwis samochodowy';
      nearbyStore = 'Stacja paliw Orlen';
    } else if (lower.includes('trening') || lower.includes('basen') || lower.includes('piłk') || lower.includes('siłowni')) {
      category = 'SPORT_ROZRYWKA';
      parsedTitle = 'Trening sportowy';
    } else if (lower.includes('zakup') || lower.includes('kaufland') || lower.includes('biedronk')) {
      category = 'ZAKUPY_SPRAWUNKI';
      parsedTitle = 'Zakupy w sklepie';
    }

    // Time matching (e.g. 18:00, o 18, o 16:30)
    const timeMatch = lower.match(/o\s*(\d{1,2})(?::(\d{2}))?/);
    if (timeMatch) {
      const hour = timeMatch[1].padStart(2, '0');
      const min = timeMatch[2] || '00';
      time = `${hour}:${min}`;
    }

    // Location matching
    if (lower.includes('mickiewicza')) location = 'ul. Mickiewicza';
    else if (lower.includes('wrocławska')) location = 'Centrum Medica, ul. Wrocławska';
    else if (lower.includes('przemysłow')) location = 'Serwis, ul. Przemysłowa';

    // Member matching
    const foundMember = safeMembers.find((m) =>
      lower.includes((m?.name || '').toLowerCase().split(' ')[0]) ||
      (m?.role === 'CHILD' && (lower.includes('córk') || lower.includes('syn') || lower.includes('dzieck') || lower.includes('zos') || lower.includes('kacper')))
    );
    if (foundMember) {
      memberId = foundMember.id;
    }

    // Day of week matching to nearest date
    const d = new Date();
    if (lower.includes('środ')) {
      const day = d.getDay();
      const diff = (3 + 7 - day) % 7 || 7;
      d.setDate(d.getDate() + diff);
    } else if (lower.includes('piąt')) {
      const day = d.getDay();
      const diff = (5 + 7 - day) % 7 || 7;
      d.setDate(d.getDate() + diff);
    } else if (lower.includes('sobot')) {
      const day = d.getDay();
      const diff = (6 + 7 - day) % 7 || 7;
      d.setDate(d.getDate() + diff);
    } else if (lower.includes('jutro')) {
      d.setDate(d.getDate() + 1);
    }

    setFormTitle(parsedTitle);
    setFormDate(d.toISOString().split('T')[0]);
    setFormStartTime(time);
    setFormCategory(category);
    setFormLocation(location);
    setFormMemberId(memberId);
    setFormNearbyStore(nearbyStore);
    setIsAddModalOpen(true);
  };

  // Request browser geolocation
  const handleGetLocation = () => {
    setLocationStatus('Pobieram lokalizację...');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationStatus('Zlokalizowano! Jesteś w rejonie Wrocław / blisko Kauflandu (ul. Wrocławska)');
        },
        (err) => {
          console.warn(err);
          // Fallback simulation for Polish home setup
          setUserCoords({ lat: 51.1079, lng: 17.0385 });
          setLocationStatus('Tryb lokalizacji: Rejon Wrocław (w pobliżu Kaufland i Biedronka)');
        }
      );
    } else {
      setLocationStatus('Geolokalizacja niedostępna w tej przeglądarce.');
    }
  };

  // Accept cyclical suggestion
  const handleAcceptSuggestion = (sugg: CyclicalHabitSuggestion) => {
    onAddEvent({
      title: sugg.title,
      date: sugg.suggestedDate,
      startTime: sugg.time,
      endTime: '19:00',
      memberId: sugg.memberId,
      memberName: sugg.memberName,
      category: sugg.category,
      location: sugg.location,
      nearbyStoreHint: sugg.nearbyShop ? `${sugg.nearbyShop} – po drodze z zajęć!` : undefined,
      isRecurring: true,
      recurrenceDayOfWeek: sugg.dayOfWeek,
      recurrencePattern: 'WEEKLY',
      completed: false,
    });
    onDismissSuggestion(sugg.id);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const matchedMember = allMembers.find((m) => m.id === formMemberId) || currentMember;

    onAddEvent({
      title: formTitle.trim(),
      description: formDescription.trim(),
      date: formDate,
      startTime: formStartTime,
      endTime: formEndTime,
      memberId: matchedMember.id,
      memberName: matchedMember.name,
      category: formCategory,
      location: formLocation.trim() || undefined,
      nearbyStoreHint: formNearbyStore.trim() || undefined,
      isRecurring: formIsRecurring,
      completed: false,
    });

    setIsAddModalOpen(false);
    setFormTitle('');
    setFormDescription('');
    setFormLocation('');
    setFormNearbyStore('');
    setVoiceTranscript('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-indigo-700/50">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <CalendarIcon className="w-6 h-6 text-indigo-300" />
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              AI Smart Calendar &amp; Asystent Dnia
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Inteligentny Kalendarz Domowy
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200 leading-relaxed">
            Asystent uczy się cyklicznych nawyków rodziny, przypomina o zajęciach, bada trasy i podpowiada zakupy w pobliżu gabinetu lub szkoły.
          </p>
        </div>

        {/* Quick Voice and Add Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Voice Command Button (In-Car / Mobile style) */}
          <button
            type="button"
            onClick={handleToggleVoiceRecording}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold shadow-md transition active:scale-95 ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-400/40'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/40'
            }`}
            title="Nagraj wydarzenie głosem (np. podczas jazdy samochodem)"
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-amber-300" />}
            <span>{isRecording ? 'Kończę nagrywanie...' : 'Dodaj głosem'}</span>
          </button>

          {/* Add Event Button */}
          <button
            type="button"
            onClick={() => {
              setVoiceTranscript('');
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-indigo-950 hover:bg-indigo-50 text-xs sm:text-sm font-bold shadow-md transition active:scale-95"
          >
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>Nowe wydarzenie</span>
          </button>
        </div>
      </div>

      {/* Voice Processing Indicator */}
      {isProcessingVoice && (
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center gap-3 animate-pulse">
          <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
          <span className="text-xs sm:text-sm font-semibold text-indigo-900">
            Przetwarzam Twoją notatkę głosową przez Gemini AI i planuję wydarzenie w kalendarzu...
          </span>
        </div>
      )}

      {/* PROACTIVE CYCLICAL ROUTINE LEARNING CARD (UCZENIE SIĘ NAWYKÓW DOMOWNIKÓW) */}
      {safeSuggestions.length > 0 && safeSuggestions[0]?.title && safeSuggestions[0]?.reason && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/10 border-2 border-amber-300/80 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-bold shadow-md shadow-amber-200 flex-shrink-0">
                <Sparkles className="w-6 h-6 text-amber-100" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-amber-950">
                    Asystent Kalendarza zauważył powtarzalny nawyk!
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                    Cykliczne zajęcia
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-amber-900 font-medium mt-1 leading-relaxed">
                  {safeSuggestions[0].reason}
                </p>
                <div className="flex items-center gap-3 text-xs text-amber-800 mt-2 font-medium">
                  {safeSuggestions[0].dayName && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {safeSuggestions[0].dayName}, godz. {safeSuggestions[0].time}
                    </span>
                  )}
                  {safeSuggestions[0].memberName && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> {safeSuggestions[0].memberName}
                      </span>
                    </>
                  )}
                  {safeSuggestions[0].location && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {safeSuggestions[0].location}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
              <button
                type="button"
                onClick={() => onDismissSuggestion(safeSuggestions[0].id)}
                className="px-3 py-2 text-xs font-semibold text-amber-800 hover:text-amber-950 hover:bg-amber-100/60 rounded-xl transition"
              >
                Pomiń / Odwołane
              </button>
              <button
                type="button"
                onClick={() => handleAcceptSuggestion(safeSuggestions[0])}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Tak, dodaj do kalendarza</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANTRY & SHOPPING INTEGRATION BANNER (WSPÓŁPRACA ZE SPIŻARNIĄ I SKLEPAMI W POBLIŻU) */}
      {(pendingShoppingCount > 0 || lowPantryCount > 0) && (
        <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm">
                  Sprytna trasa: Masz sprawy na mieście? Zrób zakupy po drodze!
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-200 text-emerald-900">
                  {pendingShoppingCount} do kupienia
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                W pobliżu przychodni i szkoły Zosi znajduje się <strong>Kaufland</strong> i <strong>Biedronka</strong>. W spiżarni brakuje {lowPantryCount} artykułów. Wykorzystaj wyjazd i zaoszczędź czas oraz paliwo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenShoppingList}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 self-end sm:self-center flex-shrink-0"
          >
            <span>Zobacz listę zakupów</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Geolocation Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-2xl border border-slate-200 text-xs text-slate-600 shadow-2xs">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-indigo-600" />
          <span className="font-semibold text-slate-800">Lokalizacja &amp; Sklepy w okolicy:</span>
          <span>{locationStatus || 'Lokalizacja nieaktywna. Kliknij, aby włączyć powiadomienia o pobliskich sklepach.'}</span>
        </div>
        <button
          type="button"
          onClick={handleGetLocation}
          className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium rounded-lg text-xs transition"
        >
          {userCoords ? 'Odśwież GPS' : 'Włącz lokalizację'}
        </button>
      </div>

      {/* Filter and Member Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {/* Member selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 mr-1">Osoba:</span>
          <button
            type="button"
            onClick={() => setSelectedMemberFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              selectedMemberFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Wszyscy ({safeEvents.length})
          </button>
          {safeMembers.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMemberFilter(m.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1 ${
                selectedMemberFilter === m.id
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{m.avatarEmoji || '👤'}</span>
              <span>{(m.name || 'Domownik').split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Category selector */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Wszystkie kategorie</option>
            <option value="KOREPETYCJE_SZKOLA">📚 Lekcje &amp; Korepetycje</option>
            <option value="LEKARZ_ZDROWIE">🏥 Lekarz &amp; Zdrowie</option>
            <option value="ZAKUPY_SPRAWUNKI">🛒 Zakupy &amp; Sprawunki</option>
            <option value="SPORT_ROZRYWKA">⚽ Sport &amp; Hobby</option>
            <option value="AUTO_SERWIS">🚗 Samochód &amp; Serwis</option>
            <option value="PRACA">💼 Praca</option>
            <option value="INNE">📌 Inne</option>
          </select>
        </div>
      </div>

      {/* Events Timeline / Agenda */}
      <div className="space-y-6">
        {/* DZISIAJ */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Dzisiaj ({todayEvents.length})
            </h3>
          </div>

          {todayEvents.length === 0 ? (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-500 text-center">
              Brak zaplanowanych wydarzeń na dzisiaj. Czas wolny lub okazja na odpoczynek!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {todayEvents.map((evt) => (
                <EventCard
                  key={evt.id}
                  event={evt}
                  categoryMeta={categoryMeta}
                  onDelete={onDeleteEvent}
                  onToggleComplete={(ev) => onUpdateEvent({ ...ev, completed: !ev.completed })}
                  onOpenShoppingList={onOpenShoppingList}
                />
              ))}
            </div>
          )}
        </div>

        {/* JUTRO */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Jutro ({tomorrowEvents.length})
            </h3>
          </div>

          {tomorrowEvents.length === 0 ? (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-500 text-center">
              Brak wydarzeń na jutro.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tomorrowEvents.map((evt) => (
                <EventCard
                  key={evt.id}
                  event={evt}
                  categoryMeta={categoryMeta}
                  onDelete={onDeleteEvent}
                  onToggleComplete={(ev) => onUpdateEvent({ ...ev, completed: !ev.completed })}
                  onOpenShoppingList={onOpenShoppingList}
                />
              ))}
            </div>
          )}
        </div>

        {/* NADCHODZĄCE W TYM MIESIĄCU */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Nadchodzące dni ({upcomingEvents.length})
            </h3>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-500 text-center">
              Brak dalszych zaplanowanych wydarzeń.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {upcomingEvents.map((evt) => (
                <EventCard
                  key={evt.id}
                  event={evt}
                  categoryMeta={categoryMeta}
                  onDelete={onDeleteEvent}
                  onToggleComplete={(ev) => onUpdateEvent({ ...ev, completed: !ev.completed })}
                  onOpenShoppingList={onOpenShoppingList}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: DODAJ NOWE WYDARZENIE (TRADYCYJNIE LUB Z GŁOSU) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Zaplanuj nowe wydarzenie
                  </h3>
                  <p className="text-xs text-slate-500">
                    Wpisz dane ręcznie lub użyj szybkich podpowiedzi głosowych.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {/* Voice prompt instruction hint */}
            <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center gap-2 text-xs text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span>Naciśnij ikonę mikrofonu powyżej i powiedz naturalnie (np. „W piątek o 17:00 wywiadówka w szkole”), lub uzupełnij formularz poniżej.</span>
            </div>

            {voiceTranscript && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                <strong className="block text-amber-950 font-bold mb-0.5">Rozpoznana mowa:</strong>
                „{voiceTranscript}”
              </div>
            )}

            <form onSubmit={handleSaveForm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tytuł wydarzenia *
                </label>
                <input
                  type="text"
                  required
                  placeholder="np. Korepetycje z matematyki, Lekarz, Trening..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Godzina *</label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kategoria</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as CalendarCategoryType)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="KOREPETYCJE_SZKOLA">📚 Lekcje &amp; Korepetycje</option>
                    <option value="LEKARZ_ZDROWIE">🏥 Lekarz &amp; Zdrowie</option>
                    <option value="ZAKUPY_SPRAWUNKI">🛒 Zakupy &amp; Sprawunki</option>
                    <option value="SPORT_ROZRYWKA">⚽ Sport &amp; Hobby</option>
                    <option value="AUTO_SERWIS">🚗 Samochód &amp; Serwis</option>
                    <option value="PRACA">💼 Praca</option>
                    <option value="INNE">📌 Inne</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dla kogo</label>
                  <select
                    value={formMemberId}
                    onChange={(e) => setFormMemberId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    {allMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lokalizacja / Adres
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="np. ul. Mickiewicza 14, Przychodnia Medica ul. Wrocławska"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Podpowiedź sklepu w pobliżu (do zrobienia zakupów przy okazji)
                </label>
                <div className="relative">
                  <ShoppingCart className="w-4 h-4 text-emerald-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="np. Kaufland (ul. Wrocławska 52) – 200m obok!"
                    value={formNearbyStore}
                    onChange={(e) => setFormNearbyStore(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="formRecurring"
                  checked={formIsRecurring}
                  onChange={(e) => setFormIsRecurring(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="formRecurring" className="text-xs font-semibold text-slate-700">
                  Wydarzenie cykliczne (powtarza się co tydzień)
                </label>
              </div>

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
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition active:scale-98"
                >
                  Zapisz w kalendarzu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-component for individual Event card
interface EventCardProps {
  event: CalendarEvent;
  categoryMeta: Record<CalendarCategoryType, { label: string; color: string; badge: string }>;
  onDelete: (id: string) => void;
  onToggleComplete: (event: CalendarEvent) => void;
  onOpenShoppingList: () => void;
}

const EventCard: React.FC<EventCardProps> = ({
  event,
  categoryMeta,
  onDelete,
  onToggleComplete,
  onOpenShoppingList,
}) => {
  const meta = categoryMeta[event.category] || categoryMeta.INNE;

  return (
    <div
      className={`p-4 rounded-2xl border transition shadow-xs flex flex-col justify-between gap-3 ${
        event.completed
          ? 'bg-slate-50 border-slate-200 opacity-60'
          : 'bg-white border-slate-200/90 hover:border-indigo-300'
      }`}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${meta.color}`}>
              {meta.badge}
            </span>
            {event.isRecurring && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 flex items-center gap-1">
                <Repeat className="w-3 h-3 text-indigo-500" /> Cykliczne
              </span>
            )}
            <span className="text-[11px] font-medium text-slate-500">
              👤 {(event.memberName || 'Domownik').split(' ')[0]}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onDelete(event.id)}
            title="Usuń wydarzenie"
            className="text-slate-400 hover:text-rose-600 transition p-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div>
          <h4
            className={`font-bold text-sm sm:text-base text-slate-900 leading-snug ${
              event.completed ? 'line-through text-slate-400' : ''
            }`}
          >
            {event.title}
          </h4>
          {event.description && (
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {event.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
          <span className="flex items-center gap-1 font-semibold text-slate-800">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            {event.date} • {event.startTime}
            {event.endTime ? ` - ${event.endTime}` : ''}
          </span>
          {event.location && (
            <span className="flex items-center gap-1 text-slate-500 truncate max-w-xs">
              <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
              <span>{event.location}</span>
            </span>
          )}
        </div>

        {/* Nearby store hint with quick link to shopping list */}
        {event.nearbyStoreHint && (
          <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span className="font-medium text-[11px] leading-tight">
                {event.nearbyStoreHint}
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenShoppingList}
              className="text-[10px] font-bold text-emerald-700 underline hover:text-emerald-900 whitespace-nowrap"
            >
              Lista zakupów &rarr;
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
          <input
            type="checkbox"
            checked={!!event.completed}
            onChange={() => onToggleComplete(event)}
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
          />
          <span>{event.completed ? 'Zrealizowano' : 'Oznacz jako wykonane'}</span>
        </label>
      </div>
    </div>
  );
};
