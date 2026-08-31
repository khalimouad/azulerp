'use client';

import React, { useState, useRef } from 'react';
import { CompanyInfo } from '@/lib/types';
import {
  Building2,
  Save,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  MapPin,
  Sparkles,
  Eye,
  Upload,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  Sliders,
  Check,
} from 'lucide-react';

interface CompanySettingsViewProps {
  company: CompanyInfo;
  onSaveCompany: (c: CompanyInfo) => void;
}

export const CompanySettingsView: React.FC<CompanySettingsViewProps> = ({
  company,
  onSaveCompany,
}) => {
  const [form, setForm] = useState<CompanyInfo>({
    ...company,
    logo_mode: company.logo_mode || 'both',
    logo_placement: company.logo_placement || 'left',
  });
  const [saved, setSaved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCompany(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  };

  // Handle Logo File Conversion to Base64
  const processLogoFile = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('Veuillez sélectionner un fichier image valide (PNG, JPG, JPEG, WEBP, SVG).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Le fichier est trop volumineux (max 2 Mo). Veuillez choisir une image plus légère.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setForm((prev) => ({
        ...prev,
        logo_image: base64,
        logo_mode: prev.logo_mode || 'both',
      }));
    };
    reader.onerror = () => {
      setUploadError("Erreur lors de la lecture de l'image.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processLogoFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processLogoFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveLogo = () => {
    setForm((prev) => ({ ...prev, logo_image: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const partnerLines = (form.partenaire_coop || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const addressLines = (form.adresse_detail || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-emerald-600" />
            Paramètres des Documents & Identité
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Téléchargez le logo officiel de votre entreprise et personnalisez l'en-tête, les mentions légales et les identifiants fiscaux des Factures, BLs, BRs et Devis A5/A4.
          </p>
        </div>

        <button
          onClick={handleSubmit}
          className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition active:scale-95 shrink-0"
        >
          <Save className="w-4 h-4" />
          Enregistrer les modifications
        </button>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-xs animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Paramètres de l'entreprise et logo enregistrés avec succès ! Vos documents A5 et exports PDF sont instantanément mis à jour.</span>
        </div>
      )}

      {/* Real-time Header Preview Card */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Eye className="w-4 h-4 text-emerald-400" />
            Aperçu en direct de l'en-tête de document (A5)
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Rendu temps réel dynamique</span>
        </div>

        <div className="bg-white text-slate-900 p-5 rounded-xl border border-slate-200 shadow-inner">
          <div className="grid grid-cols-3 gap-3 items-start text-[11px]">
            {/* Left Col: Logo Image / Company Name & Detailed Address */}
            <div className="space-y-1 leading-tight">
              {/* Show uploaded logo image on left if placement is left */}
              {form.logo_image && form.logo_placement !== 'center' ? (
                <div className="mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.logo_image}
                    alt="Logo entreprise"
                    className="max-h-14 max-w-[140px] object-contain rounded"
                  />
                  {form.logo_mode === 'both' && form.nom && (
                    <h3 className="font-extrabold text-xs text-slate-950 uppercase tracking-tight mt-1">
                      {form.nom}
                    </h3>
                  )}
                </div>
              ) : (
                <h3 className="font-extrabold text-xs text-slate-950 uppercase tracking-tight">
                  {form.nom || '(Raison Sociale / Entreprise)'}
                </h3>
              )}

              {addressLines.length > 0 ? (
                addressLines.map((line, idx) => (
                  <p key={idx} className="text-[10px] text-slate-600">
                    {line}
                  </p>
                ))
              ) : (
                <>
                  <p className="text-[10px] text-slate-600">{form.adresse || 'Adresse de l\'entreprise'}</p>
                  <p className="text-[10px] text-slate-600">{form.ville || 'Marrakech'}</p>
                </>
              )}
              {form.telephone && (
                <p className="text-[10px] text-slate-700 pt-0.5 font-medium">Tel : {form.telephone}</p>
              )}
              {form.email && (
                <p className="text-[10px] text-slate-700">E-Mail : {form.email}</p>
              )}
            </div>

            {/* Center Col: Center Logo / Emblem & Sub-Mentions */}
            <div className="flex flex-col items-center justify-center text-center">
              {form.logo_image && form.logo_placement === 'center' ? (
                <div className="mb-2 flex flex-col items-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.logo_image}
                    alt="Logo entreprise"
                    className="max-h-14 max-w-[160px] object-contain rounded"
                  />
                </div>
              ) : (
                (form.logo_titre || form.nom) && (
                  <div className="border-2 border-emerald-700 rounded-full px-3.5 py-1 bg-emerald-50/50 shadow-xs mb-1.5 inline-flex flex-col items-center">
                    <div className="text-xs font-extrabold text-emerald-800 tracking-wide">
                      {form.logo_titre || form.nom}
                    </div>
                    {form.logo_sous_titre && (
                      <div className="text-[7.5px] italic text-emerald-700 font-medium -mt-0.5">
                        {form.logo_sous_titre}
                      </div>
                    )}
                  </div>
                )
              )}

              <div className="w-full -mt-2.5 sm:-mt-3 text-right p-0 pr-0 m-0">
                {partnerLines.map((line, idx) => (
                  <div key={idx} className="text-[8px] sm:text-[8.5px] font-bold text-slate-900 leading-tight uppercase p-0 m-0">
                    {line}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Col: Fiscal Identifiers */}
            <div className="text-[10px] leading-relaxed text-right font-mono space-y-0.5">
              {form.rc && (
                <div className="flex justify-end gap-2">
                  <span className="font-bold text-slate-800">RC :</span>
                  <span>{form.rc}</span>
                </div>
              )}
              {form.if_fiscal && (
                <div className="flex justify-end gap-2">
                  <span className="font-bold text-slate-800">IF :</span>
                  <span>{form.if_fiscal}</span>
                </div>
              )}
              {form.patente && (
                <div className="flex justify-end gap-2">
                  <span className="font-bold text-slate-800">PAT :</span>
                  <span>{form.patente}</span>
                </div>
              )}
              {form.cnss && (
                <div className="flex justify-end gap-2">
                  <span className="font-bold text-slate-800">CNSS :</span>
                  <span>{form.cnss}</span>
                </div>
              )}
              {form.ice && (
                <div className="flex justify-end gap-2">
                  <span className="font-bold text-slate-800">ICE :</span>
                  <span className="font-bold text-slate-950">{form.ice}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer preview */}
          {(form.agrement_onssa || form.banque || form.rib) && (
            <div className="border-t border-slate-200 mt-3 pt-2 text-center text-[9px] text-slate-600 font-mono space-y-0.5">
              {form.agrement_onssa && <div>Agrement ONSSA N° : {form.agrement_onssa}</div>}
              {(form.banque || form.rib) && (
                <div>
                  {form.banque ? `${form.banque} ` : ''}R.I.B : {form.rib || '—'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Logo Upload & Document Header Configuration (PRIMARY) */}
        <div className="bg-white p-6 rounded-2xl border-2 border-emerald-500/30 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  1. Logo Officiel des Documents (En-tête Factures / BLs / Devis)
                </h3>
                <p className="text-xs text-slate-500">
                  Téléversez votre logo sous format image pour l'imprimer directement en haut des documents.
                </p>
              </div>
            </div>

            {form.logo_image && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                <Check className="w-3.5 h-3.5" /> Logo actif
              </span>
            )}
          </div>

          {/* Upload Area */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            <div className="md:col-span-8">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                className="hidden"
                id="company-logo-upload-input"
              />

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/70 scale-[0.99]'
                    : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/80 bg-slate-50/40'
                }`}
              >
                <div className="flex flex-col items-center justify-center space-y-2.5">
                  <div className="p-3 bg-white text-emerald-600 rounded-full shadow-xs border border-slate-200">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Glissez-déposez votre logo ici, ou <span className="text-emerald-600 underline">parcourez vos fichiers</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Formats supportés : PNG, JPG, JPEG, WEBP, SVG (Recommandé avec fond transparent, max 2 Mo)
                    </p>
                  </div>
                </div>
              </div>

              {uploadError && (
                <p className="text-xs font-semibold text-rose-600 mt-2 flex items-center gap-1.5">
                  <span>⚠️</span> {uploadError}
                </p>
              )}
            </div>

            {/* Logo Preview & Actions */}
            <div className="md:col-span-4 bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center min-h-[140px]">
              {form.logo_image ? (
                <div className="space-y-3 w-full flex flex-col items-center">
                  <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-xs max-h-24 max-w-full flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={form.logo_image}
                      alt="Logo sélectionné"
                      className="max-h-20 max-w-[180px] object-contain"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-2xs transition flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Changer
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg shadow-2xs transition flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Supprimer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 space-y-1">
                  <ImageIcon className="w-8 h-8 mx-auto opacity-40" />
                  <p className="text-xs font-medium">Aucun logo téléversé</p>
                  <p className="text-[10.5px] text-slate-400">Le texte de Raison Sociale sera utilisé par défaut</p>
                </div>
              )}
            </div>
          </div>

          {/* Logo Display Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                Mode d'affichage dans l'en-tête
              </label>
              <select
                value={form.logo_mode || 'both'}
                onChange={(e) => setForm({ ...form, logo_mode: e.target.value as any })}
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="both">Logo Image + Raison Sociale & Coordonnées</option>
                <option value="logo_only">Logo Image Uniquement (sans texte Raison Sociale)</option>
                <option value="text_only">Texte Raison Sociale Uniquement (ignorer l'image)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                Position du Logo dans le document
              </label>
              <select
                value={form.logo_placement || 'left'}
                onChange={(e) => setForm({ ...form, logo_placement: e.target.value as any })}
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="left">En-tête Gauche (Au-dessus de l'adresse)</option>
                <option value="center">En-tête Centre (Emblème principal)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Raison Sociale & Forme Juridique (Facultatif / Complémentaire) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">2. Raison Sociale, Forme Juridique & Contact</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Raison Sociale / Nom de l'Entreprise
              </label>
              <input
                type="text"
                value={form.nom || ''}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                placeholder="ex: VERDEORTO SARL AU"
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Forme Juridique</label>
              <input
                type="text"
                value={form.forme_juridique || ''}
                onChange={(e) => setForm({ ...form, forme_juridique: e.target.value })}
                placeholder="ex: SARL AU, SARL, SA, SAS..."
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Capital Social (DH)</label>
              <input
                type="text"
                value={form.capital || ''}
                onChange={(e) => setForm({ ...form, capital: e.target.value })}
                placeholder="ex: 100 000,00"
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone Principal</label>
              <input
                type="text"
                value={form.telephone || ''}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                placeholder="ex: 0808551156 / 0524..."
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Commercial</label>
              <input
                type="email"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ex: contact@entreprise.ma"
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Emblème Central & Partenariats */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">3. Emblème Central, Marque & Mentions Partenaires</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Titre de l'Emblème Central (En-tête Centre)
              </label>
              <input
                type="text"
                value={form.logo_titre || ''}
                onChange={(e) => setForm({ ...form, logo_titre: e.target.value })}
                placeholder="ex: Verde Orto"
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-emerald-900"
              />
              <p className="text-[10.5px] text-slate-400 mt-1">Texte affiché en gras au centre si aucun logo central n'est choisi</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sous-titre / Slogan de l'Emblème
              </label>
              <input
                type="text"
                value={form.logo_sous_titre || ''}
                onChange={(e) => setForm({ ...form, logo_sous_titre: e.target.value })}
                placeholder="ex: Pâtes · Légumes · Fruits"
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 italic"
              />
              <p className="text-[10.5px] text-slate-400 mt-1">Texte affiché en italique sous le titre du logo</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mentions Partenariats / Coopérative / Agrément (Centre sous l'emblème, multi-lignes)
              </label>
              <textarea
                rows={3}
                value={form.partenaire_coop || ''}
                onChange={(e) => setForm({ ...form, partenaire_coop: e.target.value })}
                placeholder="PARTENER COOP AL OULFA&#10;FROMAGERIE AGREE&#10;LPL 21.08.17"
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <p className="text-[10.5px] text-slate-400 mt-1">Chaque saut de ligne sera imprimé comme une ligne distincte sous l'emblème central.</p>
            </div>
          </div>
        </div>

        {/* Section 4: Identifiants Légaux & Fiscaux */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">4. Identifiants Légaux & Fiscaux (Colonne Droite)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-mono">
                Identifiant Commun de l'Entreprise (ICE)
              </label>
              <input
                type="text"
                value={form.ice || ''}
                onChange={(e) => setForm({ ...form, ice: e.target.value })}
                placeholder="ex: 000194441000024"
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-mono">Identifiant Fiscal (IF)</label>
              <input
                type="text"
                value={form.if_fiscal || ''}
                onChange={(e) => setForm({ ...form, if_fiscal: e.target.value })}
                placeholder="ex: 3381764"
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-mono">Registre du Commerce (RC)</label>
              <input
                type="text"
                value={form.rc || ''}
                onChange={(e) => setForm({ ...form, rc: e.target.value })}
                placeholder="ex: 35265"
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-mono">Numéro CNSS</label>
              <input
                type="text"
                value={form.cnss || ''}
                onChange={(e) => setForm({ ...form, cnss: e.target.value })}
                placeholder="ex: 7788302"
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-mono">Taxe Professionnelle / Patente</label>
              <input
                type="text"
                value={form.patente || ''}
                onChange={(e) => setForm({ ...form, patente: e.target.value })}
                placeholder="ex: 46201837"
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Adresse & Localisation */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <MapPin className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-900">5. Adresse & Localisation (En-tête Gauche)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Adresse Détaillée Multi-lignes (Exactement imprimée sur les documents)
              </label>
              <textarea
                rows={4}
                value={form.adresse_detail || ''}
                onChange={(e) => setForm({ ...form, adresse_detail: e.target.value })}
                placeholder="Avenue Al Mouqaouama,&#10;Quartier Ain Merroudi&#10;Résidence DaVinci&#10;Bloc F, Magasin N°20&#10;Marrakech"
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <p className="text-[10.5px] text-slate-400 mt-1">Chaque ligne sera imprimée sous le logo ou la raison sociale en haut à gauche.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse Simple</label>
              <input
                type="text"
                value={form.adresse || ''}
                onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                placeholder="ex: Avenue Al Mouqaouama..."
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Code Postal</label>
                <input
                  type="text"
                  value={form.code_postal || ''}
                  onChange={(e) => setForm({ ...form, code_postal: e.target.value })}
                  placeholder="ex: 40000"
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Ville</label>
                <input
                  type="text"
                  list="verdeorto-cities"
                  value={form.ville || ''}
                  onChange={(e) => setForm({ ...form, ville: e.target.value })}
                  placeholder="ex: Marrakech"
                  className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 6: Coordonnées Bancaires & Agrément */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <CreditCard className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900">6. Banque, RIB & Agrément Sanitaire (Pied de page)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-mono">Agrément ONSSA N°</label>
              <input
                type="text"
                value={form.agrement_onssa || ''}
                onChange={(e) => setForm({ ...form, agrement_onssa: e.target.value })}
                placeholder="ex: PVCS.19.160.17"
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Banque & Agence</label>
              <input
                type="text"
                list="verdeorto-banks"
                value={form.banque || ''}
                onChange={(e) => setForm({ ...form, banque: e.target.value })}
                placeholder="ex: BANQUE POPULAIRE Agence Ben Tachfine"
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1 font-mono">
                Relevé d'Identité Bancaire (RIB - 24 positions)
              </label>
              <input
                type="text"
                value={form.rib || ''}
                onChange={(e) => setForm({ ...form, rib: e.target.value })}
                placeholder="ex: 145 450 21211 2604506 000 4 11"
                className="w-full px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Action Button Bottom */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition active:scale-95"
          >
            <Save className="w-4 h-4" />
            Enregistrer toutes les modifications
          </button>
        </div>
      </form>
    </div>
  );
};
