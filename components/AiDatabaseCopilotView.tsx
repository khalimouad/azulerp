'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Database,
  Key,
  ShieldCheck,
  AlertTriangle,
  Play,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  Clock,
  Paperclip,
  Image as ImageIcon,
  X,
  Code2,
  Table as TableIcon,
  Bot,
  User,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

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
    type: 'MUTATION',
  },
  {
    title: '💰 Recalculer Soldes Clients',
    prompt: 'Recalcule et mets à jour le solde de chaque client selon ses factures impayées.',
    type: 'MUTATION',
  },
  {
    title: '🚚 BLs Non Facturés',
    prompt: 'Affiche tous les bons de livraison qui sont encore en attente de facturation.',
    type: 'SELECT',
  },
  {
    title: '📊 Top 5 Impayés Clients',
    prompt: 'Donne-moi le top 5 des clients ayant les plus gros soldes impayés.',
    type: 'SELECT',
  },
  {
    title: '🔄 Valider tous les BLs',
    prompt: 'Passe tous les bons de livraison en état Brouillon à l\'état Validé.',
    type: 'MUTATION',
  },
  {
    title: '📦 Alertes Stock Minimum',
    prompt: 'Affiche les produits dont le stock actuel est inférieur ou égal au stock minimum.',
    type: 'SELECT',
  },
];

interface AiDatabaseCopilotViewProps {
  onDataChanged?: () => void;
}

export const AiDatabaseCopilotView: React.FC<AiDatabaseCopilotViewProps> = ({ onDataChanged }) => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-3.6-flash');
  const [isKeySettingsOpen, setIsKeySettingsOpen] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  const [inputPrompt, setInputPrompt] = useState('');
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSqlIds, setExpandedSqlIds] = useState<Record<string, boolean>>({});

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('azulerp_ai_copilot_messages_v2') || localStorage.getItem('verdeorto_ai_copilot_messages_v2');
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return [
      {
        id: 'welcome-msg',
        role: 'assistant',
        content: `Bonjour ! Je suis votre **Assistant IA Base de Données (Gemini)**.

Je peux répondre à vos questions, analyser vos documents et mettre à jour vos données en langage naturel.

✨ **Ce que vous pouvez faire :**
- 🔍 **Interroger vos données** (*« Quels sont les BLs en attente ? »*, *« Top 5 clients par chiffre d'affaires »*)
- ⚡ **Modifier et corriger** (*« Corrige les dates des factures du 01/09 au 31/08 »*, *« Valide tous les BLs du client Atlas »*)
- 📷 **Joindre des images** : Vous pouvez attacher une photo de facture papier, bon de livraison ou ticket pour que je l'analyse et enregistre les données correspondantes !`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load settings on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('azulerp_gemini_api_key') || localStorage.getItem('verdeorto_gemini_api_key') || '';
      const storedModel = localStorage.getItem('azulerp_gemini_model') || localStorage.getItem('verdeorto_gemini_model') || 'gemini-3.6-flash';
      setApiKey(storedKey);
      setModel(storedModel);
      if (!storedKey) {
        setIsKeySettingsOpen(true);
      }
    }
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('azulerp_ai_copilot_messages_v2', JSON.stringify(messages));
      } catch (_) {}
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSaveKey = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('azulerp_gemini_api_key', apiKey.trim());
      localStorage.setItem('azulerp_gemini_model', model);
      localStorage.removeItem('verdeorto_gemini_api_key');
      localStorage.removeItem('verdeorto_gemini_model');
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 2500);
      if (apiKey.trim()) {
        setIsKeySettingsOpen(false);
      }
    }
  };

  const handleClearHistory = () => {
    if (window.confirm('Voulez-vous réinitialiser l\'historique de la conversation ?')) {
      const initial: ChatMessage[] = [
        {
          id: String(Date.now()),
          role: 'assistant',
          content: 'Historique réinitialisé. En quoi puis-je vous aider aujourd\'hui ?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
      setMessages(initial);
      if (typeof window !== 'undefined') {
        localStorage.setItem('azulerp_ai_copilot_messages_v2', JSON.stringify(initial));
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

  // Handle Image Upload
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
    // Strip raw ```sql ... ``` blocks from user-visible narrative to keep the display clean
    return rawText.replace(/```sql[\s\S]*?```/gi, '').trim();
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputPrompt).trim();
    if ((!textToSend && attachedImages.length === 0) || isLoading) return;

    if (!apiKey.trim()) {
      setIsKeySettingsOpen(true);
      alert('Veuillez configurer votre clé API Google Gemini pour démarrer.');
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
        throw new Error(data.error || 'Erreur lors de la communication avec Gemini');
      }

      const assistantMsgId = String(Date.now() + 1);
      const cleanText = cleanAssistantText(data.text || '');

      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: cleanText || (data.sql ? 'Voici les résultats correspondants :' : data.text),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sql: data.sql,
        queryType: data.queryType,
      };

      // If it's a SELECT query, auto-execute it silently and show clean table!
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

      // Trigger app-wide refresh on mutations
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
                error: err?.message || 'Erreur lors de l\'exécution.',
              },
            };
          }
          return m;
        })
      );
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* 1. Sleek Minimalist Header */}
      <div className="bg-white dark:bg-slate-900 px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-blue-500 to-emerald-400 flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Assistant IA Gemini
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {model}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Copilote de gestion & analyse de base de données en langage naturel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsKeySettingsOpen(!isKeySettingsOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition ${
              apiKey.trim()
                ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{apiKey.trim() ? 'Clé Active' : 'Configurer Clé'}</span>
          </button>

          <button
            onClick={handleClearHistory}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Effacer la conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Key Settings Panel */}
      {isKeySettingsOpen && (
        <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-lg space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold">Configuration Clé API Google Gemini</h3>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 underline underline-offset-2"
            >
              <span>Obtenir une clé gratuite</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-medium text-slate-400">Clé API (Google AI Studio) :</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white font-mono focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Modèle :</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
              >
                <option value="gemini-3.6-flash">Gemini 3.6 Flash (Recommandé)</option>
                <option value="gemini-3.6-pro">Gemini 3.6 Pro</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setIsKeySettingsOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg"
            >
              Fermer
            </button>
            <button
              onClick={handleSaveKey}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition"
            >
              {keySaved ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>{keySaved ? 'Enregistré !' : 'Sauvegarder'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. Preset Suggestion Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {PRESET_PROMPTS.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(preset.prompt)}
            disabled={isLoading}
            className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 text-slate-700 dark:text-slate-300 transition active:scale-95 shadow-2xs"
          >
            {preset.title}
          </button>
        ))}
      </div>

      {/* 4. Sleek Gemini Chat Stream */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col min-h-[460px] max-h-[640px] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[80%] space-y-3 ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white dark:bg-indigo-600 rounded-2xl rounded-tr-xs px-4 py-3 text-xs sm:text-[13px] shadow-xs'
                    : 'text-slate-800 dark:text-slate-200 text-xs sm:text-[13px] leading-relaxed'
                }`}
              >
                {/* Images in User Bubble */}
                {msg.images && msg.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 pb-1">
                    {msg.images.map((img) => (
                      <div key={img.id} className="relative rounded-lg overflow-hidden border border-white/20 w-24 h-24 bg-black/20">
                        <img src={img.data} alt={img.name} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Narrative Text (Clean, no raw SQL blocks) */}
                <div className="whitespace-pre-wrap leading-relaxed font-normal">
                  {msg.content}
                </div>

                {/* Mutation Confirmation Card */}
                {msg.queryType === 'MUTATION' && !msg.executionResult && msg.sql && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 space-y-2 mt-2">
                    <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 text-xs font-semibold">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Modification prête à être appliquée sur votre base de données.</span>
                    </div>

                    <button
                      onClick={() => executeSqlForMessage(msg.id, msg.sql!, true)}
                      disabled={msg.isExecuting}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition active:scale-95 disabled:opacity-50"
                    >
                      {msg.isExecuting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Application en cours...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span>Confirmer et Appliquer la Modification</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Result Notification & Interactive Data Table */}
                {msg.executionResult && (
                  <div className="space-y-2 mt-2">
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium ${
                        msg.executionResult.success
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {msg.executionResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                        )}
                        <span>{msg.executionResult.message || (msg.executionResult.success ? 'Opération réussie' : 'Erreur')}</span>
                      </div>
                      {msg.executionResult.durationMs !== undefined && (
                        <span className="text-[11px] opacity-70 font-mono">
                          {msg.executionResult.durationMs} ms
                        </span>
                      )}
                    </div>

                    {/* Clean Minimalist Data Table */}
                    {msg.executionResult.success &&
                      msg.executionResult.rows &&
                      msg.executionResult.rows.length > 0 &&
                      msg.executionResult.columns && (
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 max-h-64 shadow-2xs">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                                {msg.executionResult.columns.map((col, idx) => (
                                  <th key={idx} className="px-3 py-2 font-bold whitespace-nowrap text-[11px] uppercase tracking-wider">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11.5px]">
                              {msg.executionResult.rows.slice(0, 50).map((row, rIdx) => (
                                <tr key={rIdx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                                  {msg.executionResult!.columns!.map((col, cIdx) => (
                                    <td key={cIdx} className="px-3 py-2 whitespace-nowrap text-slate-800 dark:text-slate-200">
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

                {/* Discreet Collapsible SQL Details (Hidden by default for non-technical elegance) */}
                {msg.sql && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => toggleSqlExpand(msg.id)}
                      className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1.5 transition font-mono"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>{expandedSqlIds[msg.id] ? 'Masquer la requête technique' : 'Voir la requête technique SQL'}</span>
                      {expandedSqlIds[msg.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {expandedSqlIds[msg.id] && (
                      <div className="mt-2 p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto border border-slate-800 relative">
                        <button
                          onClick={() => handleCopy(msg.sql!, msg.id)}
                          className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] hover:bg-slate-700 flex items-center gap-1"
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
                <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start items-center text-xs text-slate-500 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2.5 rounded-2xl text-xs text-slate-600 dark:text-slate-300">
                Gemini analyse votre demande...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 5. Sleek Gemini Floating Prompt Bar with Attachment */}
        <div className="p-3 sm:p-4 bg-slate-50/70 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 space-y-2">
          {/* Image Previews */}
          {attachedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              {attachedImages.map((img) => (
                <div
                  key={img.id}
                  className="relative group rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 w-16 h-16 bg-slate-200 dark:bg-slate-800"
                >
                  <img src={img.data} alt={img.name} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-rose-600 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-slate-700 px-3 py-2 shadow-2xs focus-within:border-indigo-500 transition">
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
              className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Joindre une photo de document (facture, BL, ticket...)"
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
              placeholder="Demandez une analyse, modification ou joignez un document..."
              className="flex-1 bg-transparent border-0 resize-none text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden py-1 max-h-28"
            />

            <button
              onClick={() => handleSend()}
              disabled={(!inputPrompt.trim() && attachedImages.length === 0) || isLoading}
              className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-xs transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              title="Envoyer"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
