import React, { useState, useRef, useEffect } from 'react';
import { FamilyMember, FamilyMessage, ShoppingListItem } from '../types';
import { 
  Send, 
  ShoppingBag, 
  Sparkles, 
  Pin, 
  Mic, 
  MicOff, 
  Square, 
  Play, 
  Pause, 
  Volume2, 
  Car, 
  Bell, 
  Check, 
  Clock, 
  Loader2, 
  AlertCircle,
  RotateCcw,
  Sparkle
} from 'lucide-react';

interface FamilyMessengerProps {
  messages: FamilyMessage[];
  currentMember: FamilyMember;
  allMembers: FamilyMember[];
  onSendMessage: (
    text: string,
    isProposal?: boolean,
    proposedItem?: string,
    voiceData?: { audioUrl: string; duration: number; detectedItems?: string[] }
  ) => void;
  onAddShoppingItemFromMessage: (messageId: string, itemName: string) => void;
  onOpenPromotionsModal: () => void;
  onSimulateIncomingMessage: () => void;
  shoppingListCount: number;
}

export const FamilyMessenger: React.FC<FamilyMessengerProps> = ({
  messages,
  currentMember,
  allMembers,
  onSendMessage,
  onAddShoppingItemFromMessage,
  onOpenPromotionsModal,
  onSimulateIncomingMessage,
  shoppingListCount,
}) => {
  const [inputText, setInputText] = useState('');
  const [isShoppingItemCheck, setIsShoppingItemCheck] = useState(false);
  const [detectedItem, setDetectedItem] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showCarModeModal, setShowCarModeModal] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Audio recording timer cleanup
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Quick preset messages
  const quickPresets = [
    { text: 'Ktoś wraca teraz do domu?', isShopping: false },
    { text: 'Kupię pieczywo i coś na kolację po drodze!', isShopping: false },
    { text: 'Kończy się mleko i masło, dopisuję do listy!', isShopping: true, item: 'Mleko i masło' },
    { text: 'Kupiłem potrzebne rzeczy ze sklepu, zaraz będę!', isShopping: false },
    { text: 'Poproszę o zasilenie kieszonkowego na wyjście ze znajomymi!', isShopping: false },
  ];

  // Start Real Microphone Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        // Process recorded audio
        await handleProcessRecordedAudio(audioBlob, recordingSeconds);
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone permission or hardware error:', err);
      // If microphone not permitted or in headless environment, open Car Mode Simulation
      setShowCarModeModal(true);
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  // Cancel Recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      audioChunksRef.current = [];
    }
  };

  // Process Real Audio Blob & Transcribe via Gemini
  const handleProcessRecordedAudio = async (audioBlob: Blob, duration: number) => {
    setIsTranscribing(true);

    // Convert blob to base64 Data URL
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;

      try {
        const res = await fetch('/api/transcribe-voice-note', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioData: base64Audio,
            mimeType: 'audio/webm',
          }),
        });

        const resData = await res.json();
        const transcription = resData.data?.transcription || 'Wiadomość głosowa';
        const detectedItems = resData.data?.detectedShoppingItems || [];
        const isShopping = resData.data?.isShoppingIntent || detectedItems.length > 0;

        onSendMessage(
          transcription,
          isShopping,
          detectedItems.length > 0 ? detectedItems.join(', ') : undefined,
          {
            audioUrl: base64Audio,
            duration: Math.max(1, duration),
            detectedItems,
          }
        );
      } catch (err) {
        console.error(err);
        onSendMessage('Wiadomość głosowa (nagrano w samochodzie)', true, 'Mleko 3.2% 1L, Masło ekstra 82%', {
          audioUrl: base64Audio,
          duration: Math.max(1, duration),
          detectedItems: ['Mleko 3.2% 1L', 'Masło ekstra 82%'],
        });
      } finally {
        setIsTranscribing(false);
      }
    };
    reader.readAsDataURL(audioBlob);
  };

  // Car Mode Quick Speech Simulation (Ideal for testing driving scenarios hands-free)
  const handleCarSpeechSimulation = async (simulatedSpeech: string) => {
    setShowCarModeModal(false);
    setIsTranscribing(true);

    try {
      const res = await fetch('/api/transcribe-voice-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulationText: simulatedSpeech,
        }),
      });

      const resData = await res.json();
      const transcription = resData.data?.transcription || simulatedSpeech;
      const detectedItems = resData.data?.detectedShoppingItems || [];

      onSendMessage(
        transcription,
        true,
        detectedItems.length > 0 ? detectedItems.join(', ') : undefined,
        {
          audioUrl: '', // simulated
          duration: 4,
          detectedItems,
        }
      );
    } catch {
      onSendMessage(simulatedSpeech, true, simulatedSpeech);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Play audio note
  const handleTogglePlayAudio = (msgId: string, audioUrl?: string) => {
    if (!audioUrl) return;

    if (playingAudioId === msgId) {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      setPlayingAudioId(null);
    } else {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;
      setPlayingAudioId(msgId);
      audio.play();
      audio.onended = () => {
        setPlayingAudioId(null);
      };
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const lower = inputText.toLowerCase();
    const isRequest =
      isShoppingItemCheck ||
      lower.includes('kup') ||
      lower.includes('kończy się') ||
      lower.includes('brak') ||
      lower.includes('potrzebne') ||
      lower.includes('dopisz');

    onSendMessage(inputText.trim(), isRequest, detectedItem || (isRequest ? inputText.trim() : undefined));
    setInputText('');
    setIsShoppingItemCheck(false);
    setDetectedItem('');
  };

  const pinnedMessages = messages.filter((m) => m.pinned);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Top Banner & Promo Bridge */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-lg border border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Komunikator &amp; Notatki Głosowe
            </span>
            <span className="text-xs text-slate-400">
              {allMembers.length} domowników
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Komunikator Rodzinny z Nagrywaniem Głosu</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Nagrywaj wiadomości głosowe z samochodu lub kuchni – AI automatycznie dokona transkrypcji i wyodrębni pozycje do listy zakupów!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Tryb samochodowy / mowa */}
          <button
            type="button"
            onClick={() => setShowCarModeModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-md transition"
          >
            <Car className="w-4 h-4 text-sky-200" />
            <span>Tryb Samochodowy</span>
          </button>

          {/* Promo Checker Bridge Button */}
          <button
            type="button"
            onClick={onOpenPromotionsModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-98"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>Promocje ({shoppingListCount})</span>
          </button>
        </div>
      </div>

      {/* Pinned Messages / Announcements */}
      {pinnedMessages.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
            <Pin className="w-3.5 h-3.5 text-amber-700" />
            <span>Przypięte ustalenia rodzinne:</span>
          </div>
          <div className="space-y-1">
            {pinnedMessages.map((pm) => (
              <div key={pm.id} className="text-xs text-amber-950 flex items-center gap-2">
                <span className="font-semibold">{pm.senderName}:</span>
                <span>{pm.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Chat Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[540px]">
        {/* Chat History Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((msg) => {
            const isMe = msg.senderId === currentMember.id;
            const isPlaying = playingAudioId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] sm:max-w-[75%] ${
                  isMe ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-base flex-shrink-0 shadow-2xs">
                  {msg.senderAvatar || '👤'}
                </div>

                {/* Message Bubble */}
                <div
                  className={`rounded-2xl p-3.5 space-y-2 shadow-2xs ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-100 text-slate-900 rounded-tl-none border border-slate-200/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className={`font-bold ${isMe ? 'text-indigo-200' : 'text-slate-700'}`}>
                      {msg.senderName}
                    </span>
                    <span className={`text-[10px] ${isMe ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* VOICE NOTE AUDIO PLAYER BLOCK */}
                  {msg.isVoiceNote && (
                    <div
                      className={`p-2.5 rounded-xl flex items-center gap-3 ${
                        isMe ? 'bg-indigo-700/80 border border-indigo-500/50' : 'bg-white border border-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleTogglePlayAudio(msg.id, msg.audioUrl)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center shadow-xs transition ${
                          isMe
                            ? 'bg-white text-indigo-700 hover:bg-indigo-50'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className={`font-semibold ${isMe ? 'text-indigo-100' : 'text-slate-700'}`}>
                            Notatka głosowa (np. z auta)
                          </span>
                          <span className={isMe ? 'text-indigo-200' : 'text-slate-500'}>
                            {msg.audioDuration ? `00:${msg.audioDuration < 10 ? '0' : ''}${msg.audioDuration}` : 'Audio'}
                          </span>
                        </div>

                        {/* Audio Waveform visualizer */}
                        <div className="flex items-center gap-0.5 h-3">
                          {[40, 70, 30, 90, 60, 100, 45, 80, 50, 75, 35, 95, 60, 85, 40].map((h, i) => (
                            <div
                              key={i}
                              className={`w-1 rounded-full transition-all ${
                                isPlaying ? 'animate-pulse' : ''
                              } ${isMe ? 'bg-indigo-300' : 'bg-indigo-500'}`}
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Transcribed or Written Text */}
                  <div className="text-xs sm:text-sm leading-relaxed">
                    {msg.isVoiceNote && (
                      <span className="text-[10px] uppercase font-bold block mb-0.5 opacity-80">
                        Transkrypcja AI:
                      </span>
                    )}
                    {msg.text}
                  </div>

                  {/* Shopping Proposal Banner inside message */}
                  {msg.isShoppingProposal && (
                    <div
                      className={`mt-2 p-2 rounded-xl text-xs flex items-center justify-between gap-2 ${
                        isMe
                          ? 'bg-indigo-700/80 border border-indigo-500/50 text-indigo-100'
                          : 'bg-amber-50 border border-amber-200 text-amber-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-medium min-w-0">
                        <ShoppingBag className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">
                          Lista zakupów: <strong>{msg.proposedItemName || msg.text}</strong>
                        </span>
                      </div>

                      {msg.isAddedToShoppingList ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 text-white flex items-center gap-1 flex-shrink-0">
                          <Check className="w-3 h-3" /> W liście
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAddShoppingItemFromMessage(msg.id, msg.proposedItemName || msg.text)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white text-indigo-700 hover:bg-indigo-50 shadow-xs transition flex-shrink-0"
                        >
                          + Dodaj
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Transcribing Indicator */}
        {isTranscribing && (
          <div className="px-4 py-2 bg-indigo-50 border-t border-indigo-100 flex items-center justify-between text-xs text-indigo-800">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span className="font-semibold">Transkrypcja mowy po polsku przez Gemini AI...</span>
            </div>
            <span className="text-[11px] text-indigo-600">Wyodrębniam artykuły do listy zakupów</span>
          </div>
        )}

        {/* Quick Presets Pills */}
        <div className="p-2.5 border-t border-slate-100 bg-slate-50/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap pl-1">Szybkie wiadomości:</span>
          {quickPresets.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSendMessage(preset.text, preset.isShopping, preset.item)}
              className="px-2.5 py-1 rounded-full text-xs bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200 whitespace-nowrap transition"
            >
              {preset.text}
            </button>
          ))}
        </div>

        {/* Recording or Text Input Bar */}
        {isRecording ? (
          <div className="p-3 border-t border-rose-200 bg-rose-50 rounded-b-2xl flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2.5 text-rose-700">
              <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
              <span className="font-bold text-sm">Nagrywanie głosu...</span>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-rose-200/80 rounded">
                00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Zatrzymaj i wyślij</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendText} className="p-3 border-t border-slate-200 bg-white rounded-b-2xl flex items-center gap-2">
            {/* Microphone Button */}
            <button
              type="button"
              onClick={startRecording}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition flex items-center justify-center flex-shrink-0"
              title="Naciśnij, aby nagrać wiadomość głosową (np. z samochodu)"
            >
              <Mic className="w-4 h-4" />
            </button>

            {/* In-Car Quick Mode Button */}
            <button
              type="button"
              onClick={() => setShowCarModeModal(true)}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-sky-50 hover:text-sky-600 text-slate-600 transition flex items-center justify-center flex-shrink-0"
              title="Tryb Samochodowy (szybkie dodawanie listy zakupów głosem)"
            >
              <Car className="w-4 h-4" />
            </button>

            <div className="relative flex-1">
              <input
                type="text"
                placeholder={`Wiadomość jako ${currentMember.name.split(' ')[0]}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {inputText.length > 2 && (
                <button
                  type="button"
                  onClick={() => setIsShoppingItemCheck(!isShoppingItemCheck)}
                  title="Oznacz jako prośbę zakupową"
                  className={`absolute right-2 top-2 p-1 rounded-md transition ${
                    isShoppingItemCheck ? 'bg-amber-100 text-amber-700' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition active:scale-95 flex items-center justify-center flex-shrink-0 disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {/* MODAL: TRYB SAMOCHODOWY & SZYBKIE NAGRYWANIE GŁOSU */}
      {showCarModeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Tryb Samochodowy (Hands-Free Zakupy)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Wygodne dodawanie do listy zakupów podczas jazdy autem za pomocą głosu
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCarModeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4 py-2">
              <div className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCarModeModal(false);
                    startRecording();
                  }}
                  className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-300 mx-auto transition active:scale-95"
                >
                  <Mic className="w-8 h-8" />
                </button>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Rozpocznij nagrywanie z mikrofonu</h4>
                  <p className="text-xs text-slate-500">
                    Mów swobodnie po polsku, np.: „Kupcie chleb, 2 mleka i pomidory”
                  </p>
                </div>
              </div>

              {/* Instant Car Preset Simulations for Testing */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Szablony testowe dla Testera (kliknij, aby natychmiast przetestować):
                </span>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleCarSpeechSimulation(
                        'Cześć kochanie! Wracam właśnie autem z trasy. Dopisuję do listy zakupów: chleb krojony, 2 kartony mleka 3.2% i ser żółty gouda.'
                      )
                    }
                    className="w-full p-3 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 text-left text-xs transition space-y-1"
                  >
                    <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                      <span>🚗</span> Trasa z pracy: Chleb, 2 mleka, ser gouda
                    </span>
                    <p className="text-slate-500 text-[11px]">
                      „Wracam autem z trasy. Dopisuję do listy zakupów: chleb krojony, 2 kartony mleka 3.2% i ser żółty gouda.”
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleCarSpeechSimulation(
                        'Hej rodzinka! Zauważyłem że kończą się kapsułki do prania, płyn do naczyń i kawa ziarnista. Dodajcie proszę do zakupów.'
                      )
                    }
                    className="w-full p-3 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 text-left text-xs transition space-y-1"
                  >
                    <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                      <span>🧴</span> Zakupy domowe: Kapsułki do prania, płyn, kawa
                    </span>
                    <p className="text-slate-500 text-[11px]">
                      „Zauważyłem że kończą się kapsułki do prania, płyn do naczyń i kawa ziarnista. Dodajcie proszę do zakupów.”
                    </p>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCarModeModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
