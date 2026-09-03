'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  X,
  Maximize2,
  Minimize2,
  Minus,
  Key,
  Paperclip,
  Trash2,
  Check,
  ShieldCheck,
  AlertTriangle,
  Play,
  CheckCircle2,
  Copy,
  Clock,
  ExternalLink,
  Code2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Cpu,
  User,
  Image as ImageIcon,
} from 'lucide-react';

interface AttachedImage {
  id: string;
  name: string;
  data: string; // base64
  mimeType: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  images?: AttachedImage[];
  sql?: string | null;
  queryType?: 'SELECT' | 'MUTATION' | null;
  executionResult?: {
    success: boolean;
    columns?: string[];
    rows?: any[];
    rowCount?: number;
    durationMs?: number;
    isMutation?: boolean;
    message?: string;
    error?: string;
  } | null;
  isExecuting?: boolean;
}

const PRESET_PROMPTS = [
  {
    title: '📅 Dates Factures Fin Août',
    prompt: 'Change les dates des factures qui ont la date 01/09/2026 vers 31/08/2026.',
  },
  {
    title: '💰 Recalculer Soldes Clients',
    prompt: 'Recalcule et mets à jour le solde de chaque client selon ses factures impayées.',
  },
  {
    title: '🚚 BLs Non Facturés',
    prompt: 'Affiche tous les bons de livraison qui sont encore en attente de facturation.',
  },
  {
    title: '📊 Top 5 Impayés',
    prompt: 'Donne-moi le top 5 des clients ayant les plus gros soldes impayés en 2026.',
  },
  {
    title: '📦 Alertes Stock',
    prompt: 'Affiche les produits dont le stock actuel est inférieur ou égal au stock minimum.',
  },
];

interface GeminiFloatingChatProps {
  onDataChanged?: () => void;
  defaultOpen?: boolean;
  onNavigateTab?: (tab: string) => void;
}

export const GeminiFloatingChat: React.FC<GeminiFloatingChatProps> = ({
  onDataChanged,
  defaultOpen = false,
  onNavigateTab,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isKeySettingsOpen, setIsKeySettingsOpen] = useState(false);

  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-3.6-flash');
  const [keySaved, setKeySaved] = useState(false);

  const [inputPrompt, setInputPrompt] = useState('');
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSqlIds, setExpandedSqlIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('verdeorto_gemini_messenger_msgs');
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return [
      {
        id: 'welcome-msg',
        role: 'assistant',
        content: `Bonjour ! Je suis votre **Assistant IA Gemini**.

Posez-moi n'importe quelle question sur vos factures, livraisons, clients, fournisseurs ou stocks (par défaut sur l'année 2026).

✨ **Fonctionnalités :**
- 💬 Réponses instantanées et analyses d'activité
- ⚡ Modifications et corrections directes sur la base Neon
- 📷 Joignez une photo de facture ou bon papier (\`📎\`) pour que je l'analyse automatiquement !`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  // Load API Key & Model
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('verdeorto_gemini_api_key') || '';
      const storedModel = localStorage.getItem('verdeorto_gemini_model') || 'gemini-3.6-flash';
      setApiKey(storedKey);
      setModel(storedModel);
    }
  }, []);

  // Save messages
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('verdeorto_gemini_messenger_msgs', JSON.stringify(messages));
      } catch (_) {}
    }
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSaveKey = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('verdeorto_gemini_api_key', apiKey.trim());
      localStorage.setItem('verdeorto_gemini_model', model);
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 2500);
      if (apiKey.trim()) {
        setIsKeySettingsOpen(false);
      }
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Voulez-vous réinitialiser l\'historique du chat IA ?')) {
      const initial: ChatMessage[] = [
        {
          id: String(Date.now()),
          role: 'assistant',
          content: 'Historique réinitialisé. En quoi puis-je vous aider ?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
      setMessages(initial);
      if (typeof window !== 'undefined') {
        localStorage.setItem('verdeorto_gemini_messenger_msgs', JSON.stringify(initial));
      }
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSqlExpand = (id: string) => {
    setExpandedSqlIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Data = event.target?.result as string;
        if (base64Data) {
          setAttachedImages((prev) => [
            ...prev,
            {
              id: `${Date.now()}_${Math.random()}`,
              name: file.name,
              data: base64Data,
              mimeType: file.type,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const removeImage = (id: string) => {
    setAttachedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const cleanAssistantText = (rawText: string): string => {
    return rawText.replace(/```sql[\s\S]*?```/gi, '').trim();
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputPrompt).trim();
    if ((!textToSend && attachedImages.length === 0) || isLoading) return;

    if (!apiKey.trim()) {
      setIsKeySettingsOpen(true);
      alert('Veuillez renseigner votre clé API Google Gemini pour discuter avec l\'assistant.');
      return;
    }

    const currentImages = [...attachedImages];
    const userMsgId = String(Date.now());
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: textToSend || 'Analyse ce document joint.',
      images: currentImages.length > 0 ? currentImages : undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputPrompt('');
    setAttachedImages([]);
    setIsLoading(true);

    try {
      const history = newMessages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          prompt: textToSend,
          conversationHistory: history,
          images: currentImages,
          apiKey: apiKey.trim(),
          model,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur Gemini');
      }

      const assistantMsgId = String(Date.now() + 1);
      const cleanText = cleanAssistantText(data.text || '');

      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: cleanText || (data.sql ? 'Voici les données correspondantes :' : data.text),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sql: data.sql,
        queryType: data.queryType,
      };

      if (data.sql && data.queryType === 'SELECT') {
        setMessages([...newMessages, { ...assistantMsg, isExecuting: true }]);
        executeSqlForMessage(assistantMsgId, data.sql, false, [...newMessages, assistantMsg]);
      } else {
        setMessages([...newMessages, assistantMsg]);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: `❌ **Erreur :** ${err?.message || 'Une erreur est survenue.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const executeSqlForMessage = async (
    msgId: string,
    sqlQuery: string,
    isMutation: boolean,
    currentMessages = messages
  ) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isExecuting: true } : m))
    );

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute_sql',
          query: sqlQuery,
          isMutation,
        }),
      });

      const data = await res.json();

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === msgId) {
            return {
              ...m,
              isExecuting: false,
              executionResult: {
                success: data.success,
                columns: data.columns,
                rows: data.rows,
                rowCount: data.rowCount,
                durationMs: data.durationMs,
                isMutation: data.isMutation,
                message: data.message,
                error: data.error,
              },
            };
          }
          return m;
        })
      );

      if (isMutation && data.success && onDataChanged) {
        onDataChanged();
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === msgId) {
            return {
              ...m,
              isExecuting: false,
              executionResult: {
                success: false,
                error: err?.message || 'Erreur SQL.',
              },
            };
          }
          return m;
        })
      );
    }
  };

  return (
    <>
      {/* 1. Floating Launcher Button (Messenger Style) */}
      {!isOpen && (
        <div className="fixed bottom-20 right-3 sm:bottom-6 sm:right-6 z-40 animate-in fade-in zoom-in-95 duration-200">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center justify-center w-11 h-11 sm:w-auto sm:h-auto sm:px-4 sm:py-3 rounded-full bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-105 active:scale-95 transition-all duration-200 touch-manipulation border border-white/20"
            aria-label="Ouvrir l'assistant IA Gemini"
            title="Assistant IA Gemini"
          >
            <div className="relative flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
            </div>
            <div className="hidden sm:flex flex-col text-left pr-1 ml-2">
              <span className="text-xs sm:text-sm font-black tracking-tight leading-tight">Gemini IA</span>
              <span className="text-[10px] text-indigo-200 font-medium leading-none">Assistant ERP</span>
            </div>
          </button>
        </div>
      )}

      {/* 2. Floating Messenger Chat Window or Fullscreen View */}
      {isOpen && (
        <div
          className={`fixed z-50 flex flex-col bg-white dark:bg-slate-900 shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 transition-all duration-300 ease-out ${
            isFullscreen
              ? 'inset-0 sm:inset-6 rounded-none sm:rounded-3xl'
              : 'inset-x-0 bottom-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[450px] h-[90dvh] sm:h-[640px] max-h-[92dvh] rounded-t-3xl sm:rounded-3xl'
          }`}
        >
          {/* Mobile Drag Indicator */}
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-2 sm:hidden shrink-0" />

          {/* Header */}
          <div className="px-4 py-3 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/90 rounded-t-3xl flex items-center justify-between gap-2 shrink-0 backdrop-blur-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 via-blue-500 to-purple-500 flex items-center justify-center text-white shadow-xs shrink-0">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    Gemini AI Copilot
                  </h3>
                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    2026
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
                  {apiKey.trim() ? model : 'Clé API requise'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsKeySettingsOpen(!isKeySettingsOpen)}
                className={`p-1.5 rounded-lg text-xs transition ${
                  apiKey.trim()
                    ? 'text-slate-400 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-800'
                    : 'text-amber-500 bg-amber-50 dark:bg-amber-950/60 animate-bounce'
                }`}
                title="Paramètres Clé API"
              >
                <Key className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleClearHistory}
                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
                title="Effacer l'historique"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition hidden sm:flex items-center justify-center"
                title={isFullscreen ? 'Fenêtre réduite' : 'Plein écran'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition"
                title="Réduire"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Key Settings Drawer */}
          {isKeySettingsOpen && (
            <div className="p-3.5 bg-slate-900 text-white text-xs border-b border-slate-800 space-y-2.5 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-400" />
                  Clé Google Gemini
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <span>Clé gratuite</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="space-y-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-hidden focus:border-indigo-500"
                />

                <div className="flex items-center justify-between gap-2">
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-hidden"
                  >
                    <option value="gemini-3.6-flash">Gemini 3.6 Flash (Recommandé)</option>
                    <option value="gemini-3.6-pro">Gemini 3.6 Pro</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleSaveKey}
                    className="px-3 py-1 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition shrink-0 flex items-center gap-1"
                  >
                    {keySaved ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    <span>{keySaved ? 'OK' : 'Enregistrer'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Preset Suggestions */}
          <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 overflow-x-auto flex items-center gap-1.5 shrink-0 scrollbar-none">
            {PRESET_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(p.prompt)}
                disabled={isLoading}
                className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-slate-700 transition"
              >
                {p.title}
              </button>
            ))}
          </div>

          {/* Conversation Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[86%] space-y-2.5 ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white dark:bg-indigo-600 rounded-2xl rounded-tr-xs px-3.5 py-2.5 text-xs shadow-xs'
                      : 'text-slate-800 dark:text-slate-200 text-xs leading-relaxed'
                  }`}
                >
                  {/* Images in user bubble */}
                  {msg.images && msg.images.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pb-1">
                      {msg.images.map((img) => (
                        <div key={img.id} className="relative rounded-lg overflow-hidden border border-white/20 w-20 h-20 bg-black/20">
                          <img src={img.data} alt={img.name} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Clean Narrative Text */}
                  <div className="whitespace-pre-wrap leading-relaxed font-normal">
                    {msg.content}
                  </div>

                  {/* Mutation Confirmation Card */}
                  {msg.queryType === 'MUTATION' && !msg.executionResult && msg.sql && (
                    <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-2 mt-1.5">
                      <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 text-[11px] font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Modification prête pour la base de données.</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => executeSqlForMessage(msg.id, msg.sql!, true)}
                        disabled={msg.isExecuting}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition active:scale-95 disabled:opacity-50"
                      >
                        {msg.isExecuting ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Application en cours...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>Appliquer la modification</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Result Notification & Interactive Table */}
                  {msg.executionResult && (
                    <div className="space-y-1.5 mt-1.5">
                      <div
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] font-medium ${
                          msg.executionResult.success
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
                            : 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {msg.executionResult.success ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          )}
                          <span>{msg.executionResult.message || (msg.executionResult.success ? 'Succès' : 'Erreur')}</span>
                        </div>
                        {msg.executionResult.durationMs !== undefined && (
                          <span className="text-[10px] opacity-70 font-mono">
                            {msg.executionResult.durationMs}ms
                          </span>
                        )}
                      </div>

                      {/* Clean Table */}
                      {msg.executionResult.success &&
                        msg.executionResult.rows &&
                        msg.executionResult.rows.length > 0 &&
                        msg.executionResult.columns && (
                          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 max-h-48 shadow-2xs">
                            <table className="w-full text-left text-[11px] border-collapse">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                                  {msg.executionResult.columns.map((col, idx) => (
                                    <th key={idx} className="px-2.5 py-1.5 font-bold whitespace-nowrap text-[10px] uppercase">
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[10.5px]">
                                {msg.executionResult.rows.slice(0, 30).map((row, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                    {msg.executionResult!.columns!.map((col, cIdx) => (
                                      <td key={cIdx} className="px-2.5 py-1.5 whitespace-nowrap text-slate-800 dark:text-slate-200">
                                        {row[col] !== null && row[col] !== undefined ? String(row[col]) : '—'}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                    </div>
                  )}

                  {/* Discreet Collapsible SQL */}
                  {msg.sql && (
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={() => toggleSqlExpand(msg.id)}
                        className="text-[10.5px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1 transition font-mono"
                      >
                        <Code2 className="w-3 h-3" />
                        <span>{expandedSqlIds[msg.id] ? 'Masquer SQL' : 'Voir SQL généré'}</span>
                        {expandedSqlIds[msg.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {expandedSqlIds[msg.id] && (
                        <div className="mt-1.5 p-2.5 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[10.5px] overflow-x-auto border border-slate-800 relative">
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.sql!, msg.id)}
                            className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] hover:bg-slate-700 flex items-center gap-1"
                          >
                            {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedId === msg.id ? 'Copié' : 'Copier'}</span>
                          </button>
                          <code>{msg.sql}</code>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs font-bold text-xs">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 justify-start items-center text-xs text-slate-500 animate-pulse">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-600 text-white flex items-center justify-center shrink-0">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 px-3.5 py-2 rounded-2xl text-xs text-slate-600 dark:text-slate-300">
                  Gemini réfléchit...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Input Box with Image Attachment */}
          <div className="p-3 pb-[max(env(safe-area-inset-bottom,0px),0.75rem)] bg-slate-50/90 dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800 rounded-b-3xl space-y-2 shrink-0">
            {attachedImages.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-1">
                {attachedImages.map((img) => (
                  <div
                    key={img.id}
                    className="relative group rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 w-12 h-12 bg-slate-200 dark:bg-slate-800"
                  >
                    <img src={img.data} alt={img.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-slate-900/90 text-white flex items-center justify-center hover:bg-rose-600 transition"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 shadow-2xs focus-within:border-indigo-500 transition">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                multiple
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Joindre une photo de document"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <textarea
                ref={textareaRef}
                rows={1}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Posez votre question ou joignez un document..."
                className="flex-1 bg-transparent border-0 resize-none text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden py-1 max-h-24"
              />

              <button
                type="button"
                onClick={() => handleSend()}
                disabled={(!inputPrompt.trim() && attachedImages.length === 0) || isLoading}
                className="p-1.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-xs transition active:scale-95 disabled:opacity-40 shrink-0"
                title="Envoyer"
              >
                {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
