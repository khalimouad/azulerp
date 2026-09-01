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
  Table as TableIcon,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu,
  CornerDownLeft,
  ArrowRight,
  Clock,
  Layers,
  FileCode,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
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
    prompt: 'Génère la requête SQL pour recalculer et mettre à jour le solde de chaque client en additionnant le reste à payer de ses factures impayées.',
    type: 'MUTATION',
  },
  {
    title: '🚚 BLs Non Facturés',
    prompt: 'Affiche tous les bons de livraison qui sont en attente de facturation avec le nom du client et le montant TTC.',
    type: 'SELECT',
  },
  {
    title: '📊 Top 5 Impayés Clients',
    prompt: 'Donne-moi le top 5 des clients avec le solde impayé le plus élevé.',
    type: 'SELECT',
  },
  {
    title: '🔄 Valider tous les BLs Brouillon',
    prompt: 'Passe tous les bons de livraison qui sont en état Brouillon à l\'état Validé.',
    type: 'MUTATION',
  },
  {
    title: '📦 Alertes Rupture Stock',
    prompt: 'Affiche tous les produits dont le stock actuel est inférieur ou égal au stock minimum d\'alerte.',
    type: 'SELECT',
  },
  {
    title: '🧾 Factures du Mois d\'Août 2026',
    prompt: 'Liste toutes les factures émises en Août 2026 avec leur client, total HT, TVA 20%, et Total TTC.',
    type: 'SELECT',
  },
];

interface AiDatabaseCopilotViewProps {
  onDataChanged?: () => void;
}

export const AiDatabaseCopilotView: React.FC<AiDatabaseCopilotViewProps> = ({ onDataChanged }) => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.5-flash');
  const [isKeySettingsOpen, setIsKeySettingsOpen] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('verdeorto_ai_copilot_messages');
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return [
      {
        id: 'welcome-msg',
        role: 'assistant',
        content: `Bonjour ! Je suis votre **Assistant IA Base de Données (Gemini Data Copilot)** pour Verde Orto.

Je connais l'ensemble du schéma de votre base de données PostgreSQL (clients, produits, BLs, factures, règlements, fournisseurs, etc.).

Vous pouvez me demander en langage naturel :
- 🔍 **D'interroger des données** (ex: *« Montre-moi les BLs du client Atlas »*)
- ⚡ **De modifier ou corriger des données** (ex: *« Change les dates des factures du 01/09/2026 vers 31/08/2026 »*)
- 📊 **D'analyser et recalculer** (ex: *« Recalcule le solde de tous les clients »*)

Pour commencer, assurez-vous que votre clé API Google Gemini est configurée ci-dessus.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load API Key & Model from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKey = localStorage.getItem('verdeorto_gemini_api_key') || '';
      const storedModel = localStorage.getItem('verdeorto_gemini_model') || 'gemini-2.5-flash';
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
        localStorage.setItem('verdeorto_ai_copilot_messages', JSON.stringify(messages));
      } catch (_) {}
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    if (window.confirm('Voulez-vous réinitialiser l\'historique de la conversation ?')) {
      const initial: ChatMessage[] = [
        {
          id: String(Date.now()),
          role: 'assistant',
          content: 'Historique réinitialisé. En quoi puis-je vous aider sur votre base de données ?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ];
      setMessages(initial);
      if (typeof window !== 'undefined') {
        localStorage.setItem('verdeorto_ai_copilot_messages', JSON.stringify(initial));
      }
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputPrompt).trim();
    if (!textToSend || isLoading) return;

    if (!apiKey.trim()) {
      setIsKeySettingsOpen(true);
      alert('Veuillez renseigner votre clé API Google Gemini pour utiliser l\'assistant IA.');
      return;
    }

    const userMsgId = String(Date.now());
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputPrompt('');
    setIsLoading(true);

    try {
      // Build conversation history for context
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
          apiKey: apiKey.trim(),
          model,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la communication avec Gemini');
      }

      const assistantMsgId = String(Date.now() + 1);
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: data.text || 'Requête analysée.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sql: data.sql,
        queryType: data.queryType,
      };

      // If it's a SELECT query, auto-execute it for convenience!
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
    // Set executing state
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

      // If data was mutated, trigger app-wide refresh
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
                error: err?.message || 'Erreur lors de l\'exécution SQL.',
              },
            };
          }
          return m;
        })
      );
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-12 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                Assistant IA Base de Données
              </h2>
              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <Cpu className="w-3 h-3 text-indigo-400" />
                Gemini Copilot
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Interrogez, modifiez et corrigez vos données PostgreSQL en langage naturel avec vérification et exécution sécurisée.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsKeySettingsOpen(!isKeySettingsOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition shadow-xs ${
              apiKey.trim()
                ? 'bg-slate-800 text-emerald-400 border-emerald-500/30 hover:bg-slate-700'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 animate-bounce'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{apiKey.trim() ? 'Clé Gemini Configurée' : 'Configurer Clé Gemini'}</span>
            {isKeySettingsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleClearHistory}
            className="p-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
            title="Effacer la conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Collapsible API Key & Model Settings Panel */}
      {isKeySettingsOpen && (
        <div className="bg-slate-950/90 text-slate-200 p-4 sm:p-5 rounded-2xl border border-indigo-900/50 shadow-md space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Paramètres de l'API Google Gemini</h3>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 underline underline-offset-2"
            >
              <span>Obtenir une clé gratuite sur Google AI Studio</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                Clé API Gemini (API Key) :
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-hidden focus:border-indigo-500 transition"
              />
              <p className="text-[11px] text-slate-500">
                La clé est stockée localement dans votre navigateur et n'est jamais partagée.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400">Modèle IA :</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:border-indigo-500 transition"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Rapide & Précis)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Raisonnement Complexe)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setIsKeySettingsOpen(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg transition"
            >
              Fermer
            </button>
            <button
              onClick={handleSaveKey}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow transition active:scale-95"
            >
              {keySaved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Enregistré !</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Enregistrer la clé</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 3. Preset Action Chips */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
          Suggestions rapides d'opérations :
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {PRESET_PROMPTS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(preset.prompt)}
              disabled={isLoading}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 ${
                preset.type === 'MUTATION'
                  ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                  : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
              }`}
            >
              <span>{preset.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Chat Conversation Feed */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col h-[560px] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 text-xs leading-relaxed space-y-3 shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700/60 rounded-tl-none'
                }`}
              >
                {/* Message Header & Time */}
                <div className="flex items-center justify-between gap-4 text-[10px] opacity-70 pb-1 border-b border-current/10 font-mono">
                  <span>{msg.role === 'user' ? 'Vous' : 'Gemini Data Copilot'}</span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Main Text Content */}
                <div className="whitespace-pre-wrap font-sans text-xs sm:text-[13px] leading-relaxed">
                  {msg.content}
                </div>

                {/* SQL Code Block */}
                {msg.sql && (
                  <div className="space-y-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 font-mono">
                          Requête PostgreSQL générée :
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                            msg.queryType === 'MUTATION'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border border-blue-300 dark:border-blue-700'
                          }`}
                        >
                          {msg.queryType === 'MUTATION' ? '⚡ MODIFICATION (ÉCRITURE)' : '🔍 LECTURE (SELECT)'}
                        </span>
                      </div>

                      <button
                        onClick={() => handleCopy(msg.sql!, msg.id)}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Copié</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copier SQL</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11.5px] overflow-x-auto border border-slate-800 leading-relaxed shadow-inner">
                      <code>{msg.sql}</code>
                    </pre>

                    {/* Action Execution Button for Mutations or Selects */}
                    {msg.queryType === 'MUTATION' && !msg.executionResult && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mt-2">
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>Cette requête va modifier les données dans votre base Neon.</span>
                        </div>
                        <button
                          onClick={() => executeSqlForMessage(msg.id, msg.sql!, true)}
                          disabled={msg.isExecuting}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow transition active:scale-95 disabled:opacity-50"
                        >
                          {msg.isExecuting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Exécution en cours...</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" />
                              <span>Exécuter cette modification</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Execution Result Display */}
                    {msg.executionResult && (
                      <div
                        className={`p-3 rounded-xl border mt-2 space-y-2 ${
                          msg.executionResult.success
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                            : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs font-bold">
                          <div className="flex items-center gap-1.5">
                            {msg.executionResult.success ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                            )}
                            <span>
                              {msg.executionResult.success
                                ? msg.executionResult.message || 'Exécution réussie'
                                : 'Erreur d\'exécution'}
                            </span>
                          </div>
                          {msg.executionResult.durationMs !== undefined && (
                            <span className="text-[10px] opacity-70 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {msg.executionResult.durationMs} ms
                            </span>
                          )}
                        </div>

                        {msg.executionResult.error && (
                          <div className="text-xs text-rose-600 dark:text-rose-400 font-mono bg-rose-100 dark:bg-rose-900/40 p-2 rounded-lg">
                            {msg.executionResult.error}
                          </div>
                        )}

                        {/* Interactive Data Table for Results */}
                        {msg.executionResult.success &&
                          msg.executionResult.rows &&
                          msg.executionResult.rows.length > 0 &&
                          msg.executionResult.columns && (
                            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 max-h-60 mt-2 shadow-inner">
                              <table className="w-full text-left text-[11px] font-mono border-collapse">
                                <thead>
                                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                                    {msg.executionResult.columns.map((col, idx) => (
                                      <th key={idx} className="p-2 font-bold whitespace-nowrap">
                                        {col}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {msg.executionResult.rows.slice(0, 50).map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                      {msg.executionResult!.columns!.map((col, cIdx) => (
                                        <td
                                          key={cIdx}
                                          className="p-2 whitespace-nowrap text-slate-800 dark:text-slate-200"
                                        >
                                          {row[col] !== null && row[col] !== undefined
                                            ? String(row[col])
                                            : 'NULL'}
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
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs font-bold text-xs">
                  U
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start items-center text-xs text-slate-500 animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700 text-xs">
                Gemini réfléchit et génère la solution SQL...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 5. Prompt Input Box */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Posez une question ou demandez une modification de données (ex: « Change les dates des factures du 01/09/2026 vers 31/08/2026 »)..."
            className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl resize-none focus:outline-hidden focus:border-indigo-500 transition placeholder:text-slate-400"
          />

          <button
            onClick={() => handleSend()}
            disabled={!inputPrompt.trim() || isLoading}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center"
            title="Envoyer (Entrée)"
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
  );
};
