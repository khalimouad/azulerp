'use client';

import React, { useState, useMemo } from 'react';
import { BOM, BOMInputLine, BOMOutputLine, Produit } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { ProductSearchSelect } from '@/components/ProductSearchSelect';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Layers,
  Factory,
  Boxes,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Info,
  DollarSign,
  TrendingUp,
  X,
  PackageCheck
} from 'lucide-react';

interface CreateBomViewProps {
  produits: Produit[];
  bomToEdit?: BOM | null;
  onBack: () => void;
  onSave: (data: BOM) => Promise<void>;
}

const COMMON_UNITS = ['Kg', 'L', 'U', 'G', 'ML', 'MTR', 'PACK', 'CARTON', 'BIDON'];

export const CreateBomView: React.FC<CreateBomViewProps> = ({
  produits = [],
  bomToEdit,
  onBack,
  onSave,
}) => {
  // Parse existing outputs from notes if saved in metadata
  const initialOutputs = useMemo<BOMOutputLine[]>(() => {
    if (bomToEdit?.outputs && bomToEdit.outputs.length > 0) {
      return bomToEdit.outputs;
    }
    if (bomToEdit?.notes && bomToEdit.notes.includes('<!--BOM_OUTPUTS:')) {
      try {
        const match = bomToEdit.notes.match(/<!--BOM_OUTPUTS:(.*?)-->/);
        if (match && match[1]) {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.warn('Could not parse metadata outputs', e);
      }
    }
    if (bomToEdit?.produit_fini_nom) {
      return [
        {
          produit_id: bomToEdit.produit_fini_id,
          produit_nom: bomToEdit.produit_fini_nom,
          quantite: bomToEdit.quantite_produite || 1,
          unite: bomToEdit.unite || 'Kg',
          est_dechet: false,
          pourcentage_repartition: 100,
        },
      ];
    }
    // Default first product if available
    const firstP = produits[0];
    return [
      {
        produit_id: firstP?.id,
        produit_nom: firstP?.libelle || 'Produit Fini Principal',
        quantite: 100,
        unite: firstP?.unite || 'Kg',
        est_dechet: false,
        pourcentage_repartition: 100,
      },
      {
        produit_nom: 'Rebut / Déchet de fabrication',
        quantite: 5,
        unite: 'Kg',
        est_dechet: true,
        pourcentage_repartition: 0,
      },
    ];
  }, [bomToEdit, produits]);

  // Initial inputs
  const initialInputs = useMemo<BOMInputLine[]>(() => {
    if (bomToEdit?.inputs && bomToEdit.inputs.length > 0) {
      return bomToEdit.inputs;
    }
    if (bomToEdit?.composants && bomToEdit.composants.length > 0) {
      return bomToEdit.composants.map((c) => ({
        produit_id: c.produit_id,
        produit_nom: c.produit_nom,
        quantite: Number(c.quantite) || 1,
        unite: c.unite || 'Kg',
        cout_unitaire: Number(c.cout_unitaire) || 0,
        cout_total: Number(c.cout_total) || 0,
      }));
    }
    const defaultRaw = produits.find((p) => (p.groupe || '').toLowerCase().includes('mat') || (p.famille || '').toLowerCase().includes('mat')) || produits[0];
    return [
      {
        produit_id: defaultRaw?.id,
        produit_nom: defaultRaw?.libelle || 'Matière première brute',
        quantite: 105,
        unite: defaultRaw?.unite || 'Kg',
        cout_unitaire: Number(defaultRaw?.prix_achat_ht || defaultRaw?.prix_achat || 15),
        cout_total: 105 * Number(defaultRaw?.prix_achat_ht || defaultRaw?.prix_achat || 15),
      },
    ];
  }, [bomToEdit, produits]);

  // Form State
  const [code, setCode] = useState<string>(
    bomToEdit?.code || `BOM-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`
  );
  const [nom, setNom] = useState<string>(bomToEdit?.nom || '');
  const [version, setVersion] = useState<string>(bomToEdit?.version || '1.0');
  const [actif, setActif] = useState<boolean>(bomToEdit?.actif ?? true);
  const [notes, setNotes] = useState<string>(() => {
    if (!bomToEdit?.notes) return '';
    // Strip metadata tag for user editing
    return bomToEdit.notes.replace(/<!--BOM_OUTPUTS:.*?-->/g, '').trim();
  });

  // Inputs and Outputs lines
  const [inputs, setInputs] = useState<BOMInputLine[]>(initialInputs);
  const [outputs, setOutputs] = useState<BOMOutputLine[]>(initialOutputs);

  // Operational costs
  const [coutMainOeuvre, setCoutMainOeuvre] = useState<number>(
    bomToEdit?.cout_main_oeuvre_estime ?? 150
  );
  const [fraisGeneraux, setFraisGeneraux] = useState<number>(
    bomToEdit?.frais_generaux_estime ?? 50
  );

  const [isSaving, setIsSaving] = useState(false);

  // Helper map for quick product lookup
  const productsById = useMemo(() => {
    const map = new Map<number, Produit>();
    produits.forEach((p) => map.set(Number(p.id), p));
    return map;
  }, [produits]);

  // Live calculations
  const totalInputQty = useMemo(() => {
    return inputs.reduce((sum, i) => sum + (Number(i.quantite) || 0), 0);
  }, [inputs]);

  const totalInputCost = useMemo(() => {
    return inputs.reduce(
      (sum, i) =>
        sum +
        (Number(i.cout_total) ||
          (Number(i.quantite) || 0) * (Number(i.cout_unitaire) || 0)),
      0
    );
  }, [inputs]);

  const totalFinishedQty = useMemo(() => {
    return outputs
      .filter((o) => !o.est_dechet)
      .reduce((sum, o) => sum + (Number(o.quantite) || 0), 0);
  }, [outputs]);

  const totalWasteQty = useMemo(() => {
    return outputs
      .filter((o) => o.est_dechet)
      .reduce((sum, o) => sum + (Number(o.quantite) || 0), 0);
  }, [outputs]);

  const totalOutputQty = useMemo(() => {
    return totalFinishedQty + totalWasteQty;
  }, [totalFinishedQty, totalWasteQty]);

  // Total global cost
  const totalCost = useMemo(() => {
    return (
      totalInputCost + Number(coutMainOeuvre || 0) + Number(fraisGeneraux || 0)
    );
  }, [totalInputCost, coutMainOeuvre, fraisGeneraux]);

  // Global material yield %
  const globalYieldPct = useMemo(() => {
    if (totalInputQty <= 0) return 100;
    const yieldVal = ((totalInputQty - totalWasteQty) / totalInputQty) * 100;
    return Math.max(0, Math.min(100, Math.round(yieldVal * 10) / 10));
  }, [totalInputQty, totalWasteQty]);

  // Sum of output cost allocations
  const totalAllocationPct = useMemo(() => {
    return outputs
      .filter((o) => !o.est_dechet)
      .reduce((sum, o) => sum + (Number(o.pourcentage_repartition) || 0), 0);
  }, [outputs]);

  // Primary finished unit cost
  const primaryUnitCost = useMemo(() => {
    if (totalFinishedQty <= 0) return 0;
    return Math.round((totalCost / totalFinishedQty) * 100) / 100;
  }, [totalCost, totalFinishedQty]);

  // --- Handlers for Intrants (Inputs) ---
  const handleAddInput = () => {
    const firstP = produits[0];
    const unitPrice = Number(firstP?.prix_achat_ht || firstP?.prix_achat || 0);
    setInputs((prev) => [
      ...prev,
      {
        id: `inp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        produit_id: firstP?.id,
        produit_nom: firstP?.libelle || '',
        quantite: 1,
        unite: firstP?.unite || 'Kg',
        cout_unitaire: unitPrice,
        cout_total: unitPrice,
      },
    ]);
  };

  const handleSelectInputProduct = (index: number, productId: number) => {
    const prod = productsById.get(Number(productId));
    if (!prod) return;

    setInputs((prev) => {
      const copy = [...prev];
      const current = copy[index];
      const unitCost = Number(prod.prix_achat_ht || prod.prix_achat || current.cout_unitaire || 0);
      const qty = Number(current.quantite) || 1;
      copy[index] = {
        ...current,
        produit_id: Number(prod.id),
        produit_nom: prod.libelle,
        unite: prod.unite || current.unite || 'Kg',
        cout_unitaire: unitCost,
        cout_total: Math.round(qty * unitCost * 100) / 100,
      };
      return copy;
    });
  };

  const handleUpdateInput = (
    index: number,
    field: keyof BOMInputLine,
    value: any
  ) => {
    setInputs((prev) => {
      const copy = [...prev];
      const current = { ...copy[index], [field]: value };
      if (field === 'quantite' || field === 'cout_unitaire') {
        const q = Number(field === 'quantite' ? value : current.quantite) || 0;
        const c = Number(field === 'cout_unitaire' ? value : current.cout_unitaire) || 0;
        current.cout_total = Math.round(q * c * 100) / 100;
      }
      copy[index] = current;
      return copy;
    });
  };

  const handleDeleteInput = (index: number) => {
    if (inputs.length <= 1) {
      alert('Une nomenclature doit comporter au moins un intrant (matière première).');
      return;
    }
    setInputs((prev) => prev.filter((_, i) => i !== index));
  };

  // --- Handlers for Extrants (Outputs) ---
  const handleAddOutput = (estDechet: boolean = false) => {
    const firstP = produits[0];
    setOutputs((prev) => [
      ...prev,
      {
        id: `out-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        produit_id: estDechet ? undefined : firstP?.id,
        produit_nom: estDechet ? 'Déchet / Rebut' : firstP?.libelle || '',
        quantite: estDechet ? 1 : 10,
        unite: estDechet ? 'Kg' : firstP?.unite || 'Kg',
        est_dechet: estDechet,
        pourcentage_repartition: estDechet ? 0 : 100,
      },
    ]);
  };

  const handleSelectOutputProduct = (index: number, productId: number) => {
    const prod = productsById.get(Number(productId));
    if (!prod) return;

    setOutputs((prev) => {
      const copy = [...prev];
      const current = copy[index];
      copy[index] = {
        ...current,
        produit_id: Number(prod.id),
        produit_nom: prod.libelle,
        unite: prod.unite || current.unite || 'Kg',
      };
      return copy;
    });
  };

  const handleUpdateOutput = (
    index: number,
    field: keyof BOMOutputLine,
    value: any
  ) => {
    setOutputs((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleDeleteOutput = (index: number) => {
    if (outputs.length <= 1) {
      alert('Une nomenclature doit comporter au moins un extrant (produit fini ou déchet).');
      return;
    }
    setOutputs((prev) => prev.filter((_, i) => i !== index));
  };

  // --- Form Submission ---
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!nom.trim()) {
      alert('Veuillez saisir un nom pour cette nomenclature.');
      return;
    }

    const cleanInputs = inputs.filter((i) => i.produit_nom.trim() !== '');
    if (cleanInputs.length === 0) {
      alert('Veuillez ajouter au moins une matière première (intrant).');
      return;
    }

    const cleanOutputs = outputs.filter((o) => o.produit_nom.trim() !== '');
    if (cleanOutputs.length === 0) {
      alert('Veuillez ajouter au moins un produit fini ou déchet (extrant).');
      return;
    }

    const firstFinished =
      cleanOutputs.find((o) => !o.est_dechet) || cleanOutputs[0];
    const totalFinishedQty =
      cleanOutputs
        .filter((o) => !o.est_dechet)
        .reduce((sum, o) => sum + (Number(o.quantite) || 0), 0) || 1;

    // Calculate individual estimated costs for outputs
    const enrichedOutputs = cleanOutputs.map((o) => {
      if (o.est_dechet) {
        return {
          ...o,
          cout_unitaire_estime: 0,
          cout_total_estime: 0,
        };
      }
      const share = (Number(o.pourcentage_repartition) || 100) / 100;
      const allocatedCost = totalCost * share;
      const unit = Number(o.quantite) > 0 ? allocatedCost / Number(o.quantite) : 0;
      return {
        ...o,
        cout_unitaire_estime: Math.round(unit * 100) / 100,
        cout_total_estime: Math.round(allocatedCost * 100) / 100,
      };
    });

    // Embed metadata outputs tag into notes so full multi-output structure is never lost
    const outputsMeta = `<!--BOM_OUTPUTS:${JSON.stringify(enrichedOutputs)}-->`;
    const cleanNotes = notes.replace(/<!--BOM_OUTPUTS:.*?-->/g, '').trim();
    const finalNotes = cleanNotes ? `${cleanNotes}\n\n${outputsMeta}` : outputsMeta;

    const bomPayload: BOM = {
      id: bomToEdit?.id,
      code: code.trim(),
      nom: nom.trim(),
      version: version.trim() || '1.0',
      actif,
      produit_fini_id: firstFinished.produit_id,
      produit_fini_nom: firstFinished.produit_nom,
      quantite_produite: totalFinishedQty,
      unite: firstFinished.unite || 'Kg',
      inputs: cleanInputs,
      outputs: enrichedOutputs,
      composants: cleanInputs.map((i) => ({
        produit_id: i.produit_id,
        produit_nom: i.produit_nom,
        quantite: Number(i.quantite) || 1,
        unite: i.unite || 'Kg',
        cout_unitaire: Number(i.cout_unitaire) || 0,
        cout_total: Number(i.cout_total) || 0,
      })),
      cout_matieres_estime: totalInputCost,
      cout_main_oeuvre_estime: Number(coutMainOeuvre) || 0,
      frais_generaux_estime: Number(fraisGeneraux) || 0,
      cout_revient_unitaire: primaryUnitCost,
      rendement_pct: globalYieldPct,
      notes: finalNotes,
    };

    setIsSaving(true);
    try {
      await onSave(bomPayload);
      onBack();
    } catch (err: any) {
      alert('Erreur lors de l’enregistrement de la nomenclature: ' + (err?.message || 'Erreur inconnue'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-16 max-w-7xl mx-auto">
      {/* Top Action Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 backdrop-blur-md bg-white/95">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour aux Nomenclatures</span>
          </button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              {bomToEdit
                ? `Modifier la Nomenclature : ${bomToEdit.nom}`
                : 'Nouvelle Nomenclature de Fabrication (BOM)'}
            </h2>
            <p className="text-xs text-slate-500">
              Formulation multi-intrants (matières), multi-extrants (produits finis & coproduits), calculs de coûts et rendement
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg transition active:scale-95"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement en cours...' : 'Enregistrer la Nomenclature'}
          </button>
        </div>
      </div>

      {/* KPI Flash Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Coût Matières Premières</span>
            <Boxes className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatCurrency(totalInputCost)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {inputs.length} intrant(s) ({totalInputQty.toFixed(2)} unités)
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Coût Opérationnel</span>
            <Factory className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">
            {formatCurrency(Number(coutMainOeuvre || 0) + Number(fraisGeneraux || 0))}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            MO: {formatCurrency(coutMainOeuvre)} | Frais: {formatCurrency(fraisGeneraux)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Coût de Revient Global</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-indigo-700">
            {formatCurrency(totalCost)}
          </div>
          <div className="text-[11px] text-indigo-600 font-medium mt-1">
            Soit {formatCurrency(primaryUnitCost)} / unité nette
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Rendement Matière</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-xl font-black ${
                globalYieldPct >= 90
                  ? 'text-emerald-600'
                  : globalYieldPct >= 75
                  ? 'text-amber-600'
                  : 'text-rose-600'
              }`}
            >
              {globalYieldPct}%
            </span>
            <span className="text-xs text-slate-500 font-medium">
              (Pertes: {totalWasteQty.toFixed(2)})
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                globalYieldPct >= 90
                  ? 'bg-emerald-500'
                  : globalYieldPct >= 75
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, globalYieldPct))}%` }}
            />
          </div>
        </div>
      </div>

      {/* SECTION 1: Informations Générales */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">
              1. Identification & Paramètres de la Nomenclature
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-2 cursor-pointer">
              <span>Statut :</span>
              <input
                type="checkbox"
                checked={actif}
                onChange={(e) => setActif(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500"
              />
              <span className={`text-xs font-bold ${actif ? 'text-emerald-700' : 'text-slate-400'}`}>
                {actif ? 'Active' : 'Archivée / Inactive'}
              </span>
            </label>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Code de la Nomenclature *
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ex: BOM-HUILE-75CL"
              className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nom complet de la Nomenclature *
            </label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="ex: Fabrication Huile d'Olive Vierge Extra 75cl (Ligne A)"
              className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Version de révision
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0"
              className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Instructions opératoires, mode opératoire ou notes techniques
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Consignes de température, durée de malaxage, tolérance de rejet..."
              className="w-full px-3 py-2 text-xs font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: Intrants & Matières Premières */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">
              2. Intrants & Matières Premières Consommées (Multi-Composants)
            </h3>
            <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
              {inputs.length} composant(s)
            </span>
          </div>

          <button
            type="button"
            onClick={handleAddInput}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter une matière première</span>
          </button>
        </div>

        <div className="p-5 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="pb-3 w-[40%]">Article du Catalogue (Produit / Matière)</th>
                <th className="pb-3 w-[15%]">Quantité</th>
                <th className="pb-3 w-[12%]">Unité</th>
                <th className="pb-3 w-[15%]">Coût Unitaire HT (DH)</th>
                <th className="pb-3 w-[13%] text-right">Total HT (DH)</th>
                <th className="pb-3 w-[5%] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inputs.map((inp, idx) => {
                const prod = inp.produit_id ? productsById.get(Number(inp.produit_id)) : null;
                return (
                  <tr key={inp.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 pr-3">
                      <div className="space-y-1">
                        <ProductSearchSelect
                          products={produits}
                          value={inp.produit_id}
                          onChange={(pId) => handleSelectInputProduct(idx, pId)}
                          accent="blue"
                        />
                        {prod && (
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 pl-1">
                            <span>Code: <strong className="font-mono text-slate-700">{prod.code}</strong></span>
                            <span>•</span>
                            <span>Stock en magasin: <strong className={Number(prod.stock_actuel) > 0 ? 'text-emerald-700' : 'text-rose-600'}>{prod.stock_actuel} {prod.unite || 'U'}</strong></span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 pr-3">
                      <input
                        type="number"
                        step="any"
                        min="0.001"
                        value={inp.quantite}
                        onChange={(e) =>
                          handleUpdateInput(idx, 'quantite', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 bg-white"
                      />
                    </td>

                    <td className="py-2.5 pr-3">
                      <select
                        value={inp.unite}
                        onChange={(e) => handleUpdateInput(idx, 'unite', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                      >
                        {COMMON_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-2.5 pr-3">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={inp.cout_unitaire}
                        onChange={(e) =>
                          handleUpdateInput(idx, 'cout_unitaire', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-right"
                      />
                    </td>

                    <td className="py-2.5 pr-3 text-right font-bold text-slate-900">
                      {formatCurrency(Number(inp.cout_total) || Number(inp.quantite) * Number(inp.cout_unitaire))}
                    </td>

                    <td className="py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteInput(idx)}
                        title="Supprimer cette ligne d'intrant"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition active:scale-90 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50/70 font-bold text-slate-800">
                <td className="py-3 pl-2">Total Intrants Consommés</td>
                <td className="py-3 text-blue-700 font-bold">{totalInputQty.toFixed(2)}</td>
                <td className="py-3 text-slate-500 text-[11px] font-normal">unités cumulées</td>
                <td className="py-3 text-right text-slate-500 font-medium">Sous-total Matières :</td>
                <td className="py-3 text-right text-blue-700 text-sm font-bold">
                  {formatCurrency(totalInputCost)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* SECTION 3: Extrants, Produits Finis & Coproduits / Déchets */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">
              3. Extrants : Produits Finis, Sous-Produits & Rebuts
            </h3>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
              {outputs.length} extrant(s)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAddOutput(false)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Produit Fini / Coproduit</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddOutput(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Déchet / Rebut</span>
            </button>
          </div>
        </div>

        <div className="p-5 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="pb-3 w-[36%]">Article Extrant (Produit Fini ou Déchet)</th>
                <th className="pb-3 w-[15%]">Type d'Extrant</th>
                <th className="pb-3 w-[13%]">Quantité Produite</th>
                <th className="pb-3 w-[10%]">Unité</th>
                <th className="pb-3 w-[12%] text-right">% Imputation Coût</th>
                <th className="pb-3 w-[10%] text-right">Coût Est. / Unité</th>
                <th className="pb-3 w-[4%] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {outputs.map((out, idx) => {
                const prod = out.produit_id ? productsById.get(Number(out.produit_id)) : null;
                const share = (Number(out.pourcentage_repartition) || (out.est_dechet ? 0 : 100)) / 100;
                const allocatedCost = totalCost * share;
                const unitEst = Number(out.quantite) > 0 ? allocatedCost / Number(out.quantite) : 0;

                return (
                  <tr
                    key={out.id || idx}
                    className={`transition-colors ${
                      out.est_dechet ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-2.5 pr-3">
                      {out.est_dechet ? (
                        <div>
                          <input
                            type="text"
                            value={out.produit_nom}
                            onChange={(e) => handleUpdateOutput(idx, 'produit_nom', e.target.value)}
                            placeholder="ex: Rebut de coupe, déchet résiduel..."
                            className="w-full px-2.5 py-1.5 text-xs font-semibold border border-amber-300 rounded-lg text-amber-900 bg-white focus:ring-2 focus:ring-amber-500"
                          />
                          <span className="text-[10px] text-amber-700 pl-1">
                            Perte matière / rebut comptabilisé dans le calcul de rendement
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <ProductSearchSelect
                            products={produits}
                            value={out.produit_id}
                            onChange={(pId) => handleSelectOutputProduct(idx, pId)}
                            accent="emerald"
                          />
                          {prod && (
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 pl-1">
                              <span>Code: <strong className="font-mono text-slate-700">{prod.code}</strong></span>
                              <span>•</span>
                              <span>Prix Vente HT standard: <strong>{formatCurrency(prod.prix_ht)}</strong></span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 pr-3">
                      <select
                        value={out.est_dechet ? 'dechet' : (out.pourcentage_repartition || 0) < 100 && outputs.length > 1 ? 'coproduit' : 'principal'}
                        onChange={(e) => {
                          const isWaste = e.target.value === 'dechet';
                          handleUpdateOutput(idx, 'est_dechet', isWaste);
                          if (isWaste) {
                            handleUpdateOutput(idx, 'pourcentage_repartition', 0);
                          }
                        }}
                        className={`w-full px-2 py-1.5 text-xs rounded-lg font-semibold border ${
                          out.est_dechet
                            ? 'bg-amber-50 border-amber-300 text-amber-800'
                            : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        }`}
                      >
                        <option value="principal">Produit Fini Principal</option>
                        <option value="coproduit">Co-produit / Sous-produit</option>
                        <option value="dechet">Déchet / Rebut</option>
                      </select>
                    </td>

                    <td className="py-2.5 pr-3">
                      <input
                        type="number"
                        step="any"
                        min="0.001"
                        value={out.quantite}
                        onChange={(e) =>
                          handleUpdateOutput(idx, 'quantite', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-900 bg-white"
                      />
                    </td>

                    <td className="py-2.5 pr-3">
                      <select
                        value={out.unite}
                        onChange={(e) => handleUpdateOutput(idx, 'unite', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                      >
                        {COMMON_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="py-2.5 pr-3 text-right">
                      {out.est_dechet ? (
                        <span className="text-xs text-slate-400 font-medium">0%</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={out.pourcentage_repartition ?? 100}
                            onChange={(e) =>
                              handleUpdateOutput(
                                idx,
                                'pourcentage_repartition',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-16 px-2 py-1.5 text-xs font-bold border border-slate-300 rounded-lg text-right focus:ring-2 focus:ring-emerald-500"
                          />
                          <span className="text-xs text-slate-500">%</span>
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 pr-3 text-right font-bold text-slate-800">
                      {out.est_dechet ? (
                        <span className="text-slate-400 font-normal">-</span>
                      ) : (
                        formatCurrency(unitEst)
                      )}
                    </td>

                    <td className="py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteOutput(idx)}
                        title="Supprimer cette ligne d'extrant"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition active:scale-90 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50/70 font-bold text-slate-800">
                <td className="py-3 pl-2">Totaux Extrants</td>
                <td className="py-3 text-emerald-700">
                  Nets: {totalFinishedQty.toFixed(2)} | Déchets: {totalWasteQty.toFixed(2)}
                </td>
                <td className="py-3 text-slate-700">{totalOutputQty.toFixed(2)}</td>
                <td className="py-3 text-slate-500 text-[11px] font-normal">unités totales</td>
                <td className="py-3 text-right">
                  <span
                    className={`text-xs font-bold ${
                      totalAllocationPct === 100
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                    }`}
                  >
                    Somme % : {totalAllocationPct}%
                  </span>
                </td>
                <td className="py-3 text-right text-emerald-700 font-bold">
                  {formatCurrency(primaryUnitCost)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          {totalAllocationPct !== 100 && totalFinishedQty > 0 && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Attention : la somme des imputations de coûts des produits finis est de <strong>{totalAllocationPct}%</strong> (recommandé : 100%).
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: Coûts de Transformation & Bilan Final */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">
              4. Coûts de Transformation & Synthèse Économique
            </h3>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Main-d’œuvre directe estimée (DH)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={coutMainOeuvre}
                onChange={(e) => setCoutMainOeuvre(parseFloat(e.target.value) || 0)}
                placeholder="150"
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Salaires horaires, opérateurs de ligne et techniciens affectés au lot
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Frais généraux d’atelier & machines (DH)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={fraisGeneraux}
                onChange={(e) => setFraisGeneraux(parseFloat(e.target.value) || 0)}
                placeholder="50"
                className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Amortissement matériel, électricité, consommables d’entretien
              </span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-2 flex items-center justify-between">
              <span>Bilan Financier Prévisionnel</span>
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </h4>

            <div className="flex justify-between text-xs text-slate-600">
              <span>1. Total Matières Premières :</span>
              <strong className="text-slate-900 font-mono">{formatCurrency(totalInputCost)}</strong>
            </div>

            <div className="flex justify-between text-xs text-slate-600">
              <span>2. Main d'œuvre directe :</span>
              <strong className="text-slate-900 font-mono">{formatCurrency(coutMainOeuvre)}</strong>
            </div>

            <div className="flex justify-between text-xs text-slate-600">
              <span>3. Frais généraux d'atelier :</span>
              <strong className="text-slate-900 font-mono">{formatCurrency(fraisGeneraux)}</strong>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
              <span>Coût Total de Production :</span>
              <span className="text-indigo-700 font-mono">{formatCurrency(totalCost)}</span>
            </div>

            <div className="p-3 bg-indigo-50/70 rounded-lg border border-indigo-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-indigo-950">Coût de Revient Unitaire Référence</div>
                <div className="text-[11px] text-indigo-700">Pour {totalFinishedQty.toFixed(2)} unité(s) nette(s)</div>
              </div>
              <div className="text-lg font-black text-indigo-700 font-mono">
                {formatCurrency(primaryUnitCost)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Floating/Sticky Save Button Bar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-md">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Annuler et retourner</span>
        </button>

        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Enregistrement en cours...' : 'Enregistrer la Nomenclature (BOM)'}
        </button>
      </div>
    </div>
  );
};
