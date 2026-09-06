'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Paperclip,
  X,
  Copy,
  Check,
  Code2,
  Database,
  ChevronDown,
  ChevronUp,
  Key,
  Trash2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  HelpCircle,
  Play,
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
  sql?: string;
  queryType?: 'SELECT' | 'MUTATION';
  executionResult?: {
    rows?: any[];
    rowCount?: number;
    error?: string;
  };
}

interface AiSidebarCopilotProps {
  onDataChanged?: () => void;
  onNavigateTab?: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
}

export const AiSidebarCopilot: React.FC<AiSidebarCopilotProps> = ({
  onDataChanged,
  onNavigateTab,
  collapsed,
  setCollapsed,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-3.8-flash');
  const [isKeySettingsOpen, setIsKeySettingsOpen] = useState(false);
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
        const saved = localStorage.getItem('azulerp_gemini_sidebar_msgs');
        if (saved) return JSON.parse(saved);
      } catch (_) {}
    }
    return [
      {
        id: 'welcome-msg',
        role: 'assistant',
        content: `Bonjour ! Je suis votre **Copilot IA (Gemini 3.8)**.

Je suis connecté à votre base Neon en direct pour répondre à vos questions et exécuter vos actions.

💡 **Idées d'actions :**
- « Quels sont les BLs en attente ? »
- « Top 5 clients par chiffre d'affaires »
- « Quels produits sont sous le stock min ? »
- 📎 Joignez une photo de facture papier pour l'enregistrer !`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  // Load API Key & Model
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedKey =
        localStorage.getItem('azulerp_gemini_api_key') ||
        localStorage.getItem('verdeorto_gemini_api_key') ||
        '';
      let storedModel =
        localStorage.getItem('azulerp_gemini_model') ||
        localStorage.getItem('verdeorto_gemini_model') ||
        'gemini-3.8-flash';
      if (storedModel === 'gemini-3.6-flash' || !storedModel) {
        storedModel = 'gemini-3.8-flash';
        localStorage.setItem('azulerp_gemini_model', 'gemini-3.8-flash');
      }
      setApiKey(storedKey);
      setModel(storedModel);
    }
  }, []);

  // Save messages
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('azulerp_gemini_sidebar_msgs', JSON.stringify(messages));
      } catch (_) {}
    }
    if (!collapsed) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, collapsed]);

  const handleSaveKey = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('azulerp_gemini_api_key', apiKey.trim());
      localStorage.setItem('azulerp_gemini_model', model);
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 2500);
      if (apiKey.trim()) {
        setIsKeySettingsOpen(false);
      }
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Voulez-vous réinitialiser l'historique du Copilot IA ?")) {
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
        localStorage.setItem('azulerp_gemini_sidebar_msgs', JSON.stringify(initial));
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
      alert("Veuillez renseigner votre clé API Google Gemini pour démarrer le Copilot.");
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
        content: cleanText || (data.sql ? 'Voici les informations demandées :' : data.text),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sql: data.sql,
        queryType: data.queryType,
      };

      if (data.sql) {
        try {
          const sqlRes = await fetch('/api/ai/copilot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'execute_sql',
              query: data.sql,
              isMutation: data.queryType === 'MUTATION',
            }),
          });
          const sqlData = await sqlRes.json();
          if (sqlData.success) {
            assistantMsg.executionResult = {
              rows: sqlData.rows,
              rowCount: sqlData.rowCount,
            };
            if (data.queryType === 'MUTATION' && onDataChanged) {
              onDataChanged();
            }
          } else {
            assistantMsg.executionResult = { error: sqlData.error || 'Erreur SQL' };
          }
        } catch (sqlErr: any) {
          assistantMsg.executionResult = { error: sqlErr.message || 'Erreur exécution' };
        }
      }

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 2),
          role: 'assistant',
          content: `⚠️ **Erreur :** ${err.message || 'Impossible de contacter Gemini.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    'Quels sont les BLs en attente ?',
    'Top 5 clients par chiffre d’affaires',
    'Articles sous le stock minimum',
    'Factures impayées',
  ];

  // If collapsed: show sleek 58px icon rail
  if (collapsed) {
    return (
      <aside
        className="hidden lg:flex flex-col items-center justify-between py-3 px-1.5 w-[58px] bg-slate-950 border-r border-slate-800/80 shrink-0 select-none h-full z-20"
        title="Ouvrir le Copilot IA"
      >
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 hover:scale-105 active:scale-95 transition cursor-pointer"
            title="Agrandir le Copilot IA"
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
          </button>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Connecté à Neon" />
          <span className="text-[10px] font-bold text-slate-400 rotate-90 whitespace-nowrap mt-8 tracking-wider">
            COPILOT IA
          </span>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition cursor-pointer"
          title="Déplier le panneau IA"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>
      </aside>
    );
  }

  // Expanded Left Copilot Sidebar (~330px width)
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        onClick={() => setCollapsed(true)}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden"
      />

      <aside className="fixed inset-y-0 left-0 z-50 w-[310px] sm:w-[330px] lg:static lg:z-10 lg:w-[330px] h-full bg-slate-950 border-r border-slate-800/80 flex flex-col shrink-0 select-none overflow-hidden shadow-2xl">
      {/* 1. Header Bar */}
      <div className="px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white tracking-tight">Copilot IA</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                Gemini 3.8
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <span>Prêt • Assistant direct</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setIsKeySettingsOpen(!isKeySettingsOpen)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Configuration Clé API Gemini"
          >
            <Key className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleClearHistory}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Effacer l'historique"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="Réduire le volet IA"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Key Settings Drawer (collapsible) */}
      {isKeySettingsOpen && (
        <div className="p-3 bg-slate-900 border-b border-slate-800 space-y-2 text-xs text-slate-300 animate-in fade-in slide-in-from-top-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              Clé Google Gemini
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Clé gratuite</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500"
          />

          <div className="flex items-center gap-2">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="flex-1 px-2 py-1 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none"
            >
              <option value="gemini-3.8-flash">Gemini 3.8 Flash (Défaut)</option>
              <option value="gemini-3.8-pro">Gemini 3.8 Pro</option>
              <option value="gemini-3.8">Gemini 3.8</option>
              <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
              <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            </select>

            <button
              type="button"
              onClick={handleSaveKey}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer shrink-0"
            >
              {keySaved ? 'Sauvegardé' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* 3. Quick Chips Banner */}
      <div className="px-2.5 py-1.5 bg-slate-900/40 border-b border-slate-800/60 overflow-x-auto no-scrollbar flex items-center gap-1 shrink-0">
        {quickPrompts.map((qp, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(qp)}
            className="text-[10px] whitespace-nowrap px-2 py-1 rounded-md bg-slate-800/80 hover:bg-blue-900/40 hover:text-blue-200 border border-slate-700/60 text-slate-300 transition active:scale-95 cursor-pointer shrink-0"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* 4. Chat Messages Scroll Stream */}
      <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs leading-relaxed no-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Sender and time */}
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-0.5 px-1">
              <span>{msg.role === 'user' ? 'Vous' : 'Copilot IA'}</span>
              <span>•</span>
              <span>{msg.timestamp}</span>
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[92%] rounded-2xl p-3 shadow-xs space-y-2 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-xs'
                  : 'bg-slate-900 text-slate-200 border border-slate-800/80 rounded-bl-xs'
              }`}
            >
              {/* Attached images preview */}
              {msg.images && msg.images.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {msg.images.map((img) => (
                    <img
                      key={img.id}
                      src={img.data}
                      alt={img.name}
                      className="w-14 h-14 object-cover rounded-lg border border-white/20"
                    />
                  ))}
                </div>
              )}

              {/* Text content */}
              <div className="whitespace-pre-wrap font-sans text-xs">
                {msg.content}
              </div>

              {/* Collapsible SQL Query Card */}
              {msg.sql && (
                <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => toggleSqlExpand(msg.id)}
                    className="w-full flex items-center justify-between text-indigo-300 hover:text-indigo-200 font-mono text-[10px] py-0.5 cursor-pointer"
                  >
                    <span className="flex items-center gap-1">
                      <Code2 className="w-3 h-3" />
                      Requête Neon {msg.queryType || 'SQL'}
                    </span>
                    {expandedSqlIds[msg.id] ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>

                  {expandedSqlIds[msg.id] && (
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 font-mono text-[10px] text-emerald-400 overflow-x-auto relative">
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.sql || '', msg.id)}
                        className="absolute right-1.5 top-1.5 p-1 rounded bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                        title="Copier SQL"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <pre className="pr-6">{msg.sql}</pre>
                    </div>
                  )}

                  {/* Execution result preview */}
                  {msg.executionResult && (
                    <div className="mt-1">
                      {msg.executionResult.error ? (
                        <div className="p-1.5 rounded bg-rose-950/50 border border-rose-800/50 text-rose-300 text-[10px]">
                          {msg.executionResult.error}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400">
                          {msg.executionResult.rowCount !== undefined && (
                            <span className="text-emerald-400 font-bold">
                              ✓ {msg.executionResult.rowCount} ligne(s) impactée(s)
                            </span>
                          )}
                          {Array.isArray(msg.executionResult.rows) && msg.executionResult.rows.length > 0 && (
                            <div className="mt-1 max-h-36 overflow-auto bg-slate-950 rounded border border-slate-800 p-1">
                              <table className="w-full text-[9px] text-left">
                                <thead>
                                  <tr className="text-slate-500 border-b border-slate-800">
                                    {Object.keys(msg.executionResult.rows[0]).slice(0, 3).map((col) => (
                                      <th key={col} className="p-1 font-mono">{col}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {msg.executionResult.rows.slice(0, 4).map((row, rIdx) => (
                                    <tr key={rIdx} className="border-b border-slate-900 hover:bg-slate-900/50">
                                      {Object.values(row).slice(0, 3).map((val: any, cIdx) => (
                                        <td key={cIdx} className="p-1 font-mono truncate max-w-[80px]">
                                          {String(val)}
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
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs animate-pulse">
            <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
            <span>Gemini analyse les données...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 5. Input Bar & Attachments */}
      <div className="p-2.5 bg-slate-900/80 border-t border-slate-800/80 shrink-0 space-y-2">
        {/* Attached previews */}
        {attachedImages.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {attachedImages.map((img) => (
              <div key={img.id} className="relative group shrink-0">
                <img
                  src={img.data}
                  alt={img.name}
                  className="w-10 h-10 object-cover rounded-lg border border-slate-700"
                />
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="flex items-end gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1.5 focus-within:border-blue-500 transition">
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
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer shrink-0"
            title="Joindre une photo (facture papier, BL, ticket)"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <textarea
            ref={textareaRef}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Posez une question ou demandez une action..."
            rows={1}
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 resize-none focus:outline-none max-h-24 py-1"
          />

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={(!inputPrompt.trim() && attachedImages.length === 0) || isLoading}
            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition active:scale-95 cursor-pointer shrink-0"
            title="Envoyer (Entrée)"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
    </>
  );
};
