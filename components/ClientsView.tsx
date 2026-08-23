'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Client, BonLivraison, Facture, Produit, ClientTarif } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { TablePagination } from '@/components/TablePagination';
import {
  fetchClientTarifs,
  saveClientTarif,
  deleteClientTarif,
} from '@/lib/sqlite-service';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Truck,
  FileText,
  Phone,
  Mail,
  MapPin,
  Building,
  Tag,
  Percent,
  Check,
  X,
  Sparkles,
  ArrowRight,
  UserCheck,
  AlertCircle
} from 'lucide-react';

interface ClientsViewProps {
  clients: Client[];
  bonsLivraison?: BonLivraison[];
  factures?: Facture[];
  produits?: Produit[];
  onOpenNewClient: () => void;
  onEditClient: (client: Client) => void;
  onDeleteClient: (id: number) => void;
  onNewBlForClient: (client: Client) => void;
  onNewFactureForClient: (client: Client) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients = [],
  bonsLivraison = [],
  factures = [],
  produits = [],
  onOpenNewClient,
  onEditClient,
  onDeleteClient,
  onNewBlForClient,
  onNewFactureForClient,
}) => {
  // Safe local arrays
  const safeClients = useMemo(() => Array.isArray(clients) ? clients : [], [clients]);
  const safeBls = useMemo(() => Array.isArray(bonsLivraison) ? bonsLivraison : [], [bonsLivraison]);
  const safeFactures = useMemo(() => Array.isArray(factures) ? factures : [], [factures]);
  const safeProduits = useMemo(() => Array.isArray(produits) ? produits : [], [produits]);

  // Left half: Customer search & selection
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSociete, setSearchSociete] = useState('');
  const [searchVille, setSearchVille] = useState('');
  const [searchIce, setSearchIce] = useState('');
  const [rawSelectedClientId, setRawSelectedClientId] = useState<number | null>(null);

  // Pagination state for client list
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset page on search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, searchSociete, searchVille, searchIce]);

  // Compute selectedClientId safely without cascading render effect
  const selectedClientId = useMemo(() => {
    if (rawSelectedClientId !== null && safeClients.some((c) => c && c.id === rawSelectedClientId)) {
      return rawSelectedClientId;
    }
    return safeClients.length > 0 && safeClients[0] ? safeClients[0].id : null;
  }, [rawSelectedClientId, safeClients]);

  const setSelectedClientId = (id: number | null) => {
    setRawSelectedClientId(id);
  };

  // Right half: Customer Pricelist state
  const [clientTarifs, setClientTarifs] = useState<ClientTarif[]>([]);
  const [loadingTarifs, setLoadingTarifs] = useState(false);
  const [searchProductInPricelist, setSearchProductInPricelist] = useState('');
  
  // Modal state: Add/Edit custom price
  const [isTarifModalOpen, setIsTarifModalOpen] = useState(false);
  const [selectedProduitId, setSelectedProduitId] = useState<number>(() => {
    return safeProduits.length > 0 && safeProduits[0] ? safeProduits[0].id : 0;
  });
  const [customPriceHt, setCustomPriceHt] = useState<string>('');
  const [customRemisePct, setCustomRemisePct] = useState<string>('0');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [modalProductSearch, setModalProductSearch] = useState('');
  const [editingTarifId, setEditingTarifId] = useState<number | null>(null);

  // Load client tarifs whenever selectedClientId changes
  useEffect(() => {
    let isCancelled = false;
    async function loadTarifs() {
      if (!selectedClientId) {
        setClientTarifs([]);
        return;
      }
      setLoadingTarifs(true);
      try {
        const tarifs = await fetchClientTarifs(selectedClientId);
        if (!isCancelled) {
          setClientTarifs(Array.isArray(tarifs) ? tarifs : []);
        }
      } catch (err) {
        console.error('Error loading client tarifs:', err);
        if (!isCancelled) {
          setClientTarifs([]);
        }
      } finally {
        if (!isCancelled) {
          setLoadingTarifs(false);
        }
      }
    }
    loadTarifs();
    return () => {
      isCancelled = true;
    };
  }, [selectedClientId]);

  // Selected client object
  const selectedClient = useMemo(() => {
    return safeClients.find((c) => c && c.id === selectedClientId) || null;
  }, [safeClients, selectedClientId]);

  // Filtered clients list with comprehensive search across all fields
  const filteredClients = useMemo(() => {
    return safeClients.filter((c) => {
      if (!c) return false;
      // Global search bar
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesGlobal =
          (c.nom && c.nom.toLowerCase().includes(q)) ||
          (c.code && c.code.toLowerCase().includes(q)) ||
          (c.interlocuteur && c.interlocuteur.toLowerCase().includes(q)) ||
          (c.ville && c.ville.toLowerCase().includes(q)) ||
          (c.adresse && c.adresse.toLowerCase().includes(q)) ||
          (c.telephone && c.telephone.toLowerCase().includes(q)) ||
          (c.mobile && c.mobile.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.ice && c.ice.toLowerCase().includes(q)) ||
          (c.observations && c.observations.toLowerCase().includes(q));
        if (!matchesGlobal) return false;
      }

      // Column filters
      if (searchSociete && !c.nom?.toLowerCase().includes(searchSociete.toLowerCase()) && !c.interlocuteur?.toLowerCase().includes(searchSociete.toLowerCase())) return false;
      if (searchVille && !c.ville?.toLowerCase().includes(searchVille.toLowerCase())) return false;
      if (searchIce && !c.ice?.toLowerCase().includes(searchIce.toLowerCase())) return false;

      return true;
    });
  }, [safeClients, searchQuery, searchSociete, searchVille, searchIce]);

  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClients.slice(start, start + pageSize);
  }, [filteredClients, currentPage, pageSize]);

  // Client stats calculations
  const clientStats = useMemo(() => {
    const map = new Map<number, { blCount: number; pendingBlCount: number; totalFacture: number; unpaidFacture: number }>();
    for (const c of safeClients) {
      if (!c) continue;
      const clientBls = safeBls.filter((b) => b && b.client_id === c.id);
      const clientFactures = safeFactures.filter((f) => f && f.client_id === c.id);
      const blCount = clientBls.length;
      const pendingBlCount = clientBls.filter((b) => b && b.statut === 'En attente').length;
      const totalFacture = clientFactures.reduce((sum, f) => sum + (f?.total_ttc || 0), 0);
      const unpaidFacture = clientFactures.reduce((sum, f) => sum + (f?.reste_a_payer || 0), 0);
      map.set(c.id, { blCount, pendingBlCount, totalFacture, unpaidFacture });
    }
    return map;
  }, [safeClients, safeBls, safeFactures]);

  // Filtered client pricelist (search inside product grid)
  const filteredClientTarifs = useMemo(() => {
    const safeTarifs = Array.isArray(clientTarifs) ? clientTarifs : [];
    if (!searchProductInPricelist) return safeTarifs;
    const q = searchProductInPricelist.toLowerCase();
    return safeTarifs.filter((t) => {
      if (!t) return false;
      return (
        (t.produit_code && t.produit_code.toLowerCase().includes(q)) ||
        (t.produit_libelle && t.produit_libelle.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q))
      );
    });
  }, [clientTarifs, searchProductInPricelist]);

  // Handle open add/edit tarif modal
  const handleOpenAddTarif = () => {
    if (!selectedClient) return;
    setEditingTarifId(null);
    if (safeProduits.length > 0 && safeProduits[0]) {
      setSelectedProduitId(safeProduits[0].id);
      setCustomPriceHt(String(safeProduits[0].prix_ht || ''));
    } else {
      setSelectedProduitId(0);
      setCustomPriceHt('');
    }
    setCustomRemisePct('0');
    setCustomNotes('');
    setModalProductSearch('');
    setIsTarifModalOpen(true);
  };

  const handleOpenEditTarif = (tarif: ClientTarif) => {
    if (!tarif) return;
    setEditingTarifId(tarif.id);
    setSelectedProduitId(tarif.produit_id);
    setCustomPriceHt(String(tarif.prix_special_ht));
    setCustomRemisePct(String(tarif.remise_pct || 0));
    setCustomNotes(tarif.notes || '');
    setModalProductSearch('');
    setIsTarifModalOpen(true);
  };

  const handleSaveTarif = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !selectedProduitId) return;

    const price = parseFloat(customPriceHt);
    if (isNaN(price) || price < 0) {
      alert('Veuillez saisir un prix HT valide.');
      return;
    }

    const remise = parseFloat(customRemisePct) || 0;

    await saveClientTarif({
      client_id: selectedClient.id,
      produit_id: selectedProduitId,
      prix_special_ht: price,
      remise_pct: remise,
      notes: customNotes.trim(),
    });

    // Refresh tarifs
    const updated = await fetchClientTarifs(selectedClient.id);
    setClientTarifs(Array.isArray(updated) ? updated : []);
    setIsTarifModalOpen(false);
  };

  const handleDeleteTarif = async (id: number, productName?: string) => {
    if (!confirm(`Supprimer le tarif spécifique pour "${productName || 'ce produit'}" ?`)) return;
    await deleteClientTarif(id);
    if (selectedClientId) {
      const updated = await fetchClientTarifs(selectedClientId);
      setClientTarifs(Array.isArray(updated) ? updated : []);
    }
  };

  // Selected product in modal info
  const currentModalProduct = useMemo(() => {
    return safeProduits.find((p) => p && p.id === selectedProduitId) || null;
  }, [safeProduits, selectedProduitId]);

  // Filtered products for modal picker
  const modalFilteredProduits = useMemo(() => {
    if (!modalProductSearch) return safeProduits;
    const q = modalProductSearch.toLowerCase();
    return safeProduits.filter((p) => {
      if (!p) return false;
      return (
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.libelle && p.libelle.toLowerCase().includes(q)) ||
        (p.famille && p.famille.toLowerCase().includes(q)) ||
        (p.groupe && p.groupe.toLowerCase().includes(q))
      );
    });
  }, [safeProduits, modalProductSearch]);

  return (
    <div className="space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Gestion des Clients & Grilles Tarifaires Personnalisées
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {clients.length} comptes clients
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Sélectionnez un client à gauche pour gérer ses coordonnées et configurer ses prix et remises négociés à droite.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNewClient}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            + Nouveau Client
          </button>
        </div>
      </div>

      {/* Main 2-Halves Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ========================================================================= */}
        {/* LEFT HALF (6 Cols): CUSTOMER DIRECTORY & SELECTED CLIENT INFO */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[700px]">
            {/* Top Search & Filter Bar for Customers */}
            <div className="p-3 border-b border-slate-200 bg-slate-50/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-600" />
                  1. Annuaire des Clients
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {filteredClients.length} / {clients.length} trouvés
                </span>
              </div>

              {/* Global search input across all contact fields */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Recherche client (Nom, Contact, Ville, ICE, Tél, Mail)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white text-slate-800 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Customers Table / List */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-blue-700 text-white z-10">
                  <tr className="divide-x divide-blue-600 font-semibold text-[11px]">
                    <th className="py-2 px-2.5 w-16">Code</th>
                    <th className="py-2 px-2.5">Client / Société</th>
                    <th className="py-2 px-2">Ville</th>
                    <th className="py-2 px-2.5 font-mono">ICE</th>
                    <th className="py-2 px-2.5 text-right">Solde Dû</th>
                    <th className="py-2 px-2 text-center w-16">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredClients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Aucun client ne correspond à votre recherche.
                      </td>
                    </tr>
                  ) : (
                    paginatedClients.map((client) => {
                      const stats = clientStats.get(client.id) || { blCount: 0, pendingBlCount: 0, totalFacture: 0, unpaidFacture: 0 };
                      const isSelected = selectedClientId === client.id;

                      return (
                        <tr
                          key={client.id}
                          onClick={() => setSelectedClientId(client.id)}
                          className={`cursor-pointer transition divide-x divide-slate-100 ${
                            isSelected
                              ? 'bg-blue-50/90 border-l-4 border-l-blue-600 font-medium'
                              : 'hover:bg-slate-50/80 even:bg-slate-50/40'
                          }`}
                        >
                          <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600 font-semibold">
                            {client.code || `CL${String(client.id).padStart(3, '0')}`}
                          </td>
                          <td className="py-2 px-2.5">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {client.nom}
                              {isSelected && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-600 text-white">
                                  Sélectionné
                                </span>
                              )}
                            </div>
                            {client.interlocuteur && (
                              <div className="text-[10px] text-slate-500">{client.interlocuteur}</div>
                            )}
                          </td>
                          <td className="py-2 px-2 text-slate-700 whitespace-nowrap text-[11px]">
                            {client.ville || '-'}
                          </td>
                          <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600">
                            {client.ice || '-'}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                            {formatCurrency(stats.unpaidFacture, false)}
                          </td>
                          <td className="py-1.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => onEditClient(client)}
                                className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded transition"
                                title="Modifier"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  onDeleteClient(client.id);
                                  if (selectedClientId === client.id) setSelectedClientId(null);
                                }}
                                className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded transition"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Pagination */}
            <div className="border-t border-slate-200 bg-white">
              <TablePagination
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={filteredClients.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
                itemLabel="clients"
              />
            </div>

            {/* Bottom Card: Selected Client Details & Fast Actions */}
            {selectedClient && (
              <div className="p-3 border-t border-slate-200 bg-slate-50/90 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 bg-blue-100 text-blue-700 rounded">
                      <UserCheck className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{selectedClient.nom}</h4>
                      <p className="text-[10px] text-slate-500">
                        {selectedClient.interlocuteur ? `Contact: ${selectedClient.interlocuteur}` : 'Fiche client'} • ICE: {selectedClient.ice || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onNewBlForClient(selectedClient)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition"
                      title="Créer un BL"
                    >
                      <Truck className="w-3 h-3" />
                      + BL
                    </button>
                    <button
                      onClick={() => onNewFactureForClient(selectedClient)}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition"
                      title="Créer une Facture"
                    >
                      <FileText className="w-3 h-3" />
                      + Facture
                    </button>
                    <button
                      onClick={() => onEditClient(selectedClient)}
                      className="px-2 py-1 text-[10px] font-medium rounded bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
                    >
                      Fiche
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-slate-200/60">
                  <div className="text-slate-600 truncate">
                    <span className="text-slate-400">Ville:</span> <strong>{selectedClient.ville || 'Marrakech'}</strong>
                  </div>
                  <div className="text-slate-600 truncate">
                    <span className="text-slate-400">Tél:</span> <strong>{selectedClient.telephone || selectedClient.mobile || '-'}</strong>
                  </div>
                  <div className="text-slate-600 text-right truncate">
                    <span className="text-slate-400">Tarifs spé:</span>{' '}
                    <strong className="text-blue-700 font-mono">{clientTarifs.length} articles</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT HALF (6 Cols): PRODUCT PRICELIST & NEGOTIATED RATES FOR CLIENT */}
        {/* ========================================================================= */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[700px]">
            {/* Top Bar for Pricelist */}
            <div className="p-3 border-b border-slate-200 bg-slate-50/70 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-600" />
                    2. Grille Tarifaire Client (Prix & Remises)
                  </span>
                  {selectedClient ? (
                    <div className="text-xs font-semibold text-blue-700 mt-0.5 truncate">
                      Prix négociés pour : <span className="underline">{selectedClient.nom}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 mt-0.5">Aucun client sélectionné</div>
                  )}
                </div>

                <button
                  disabled={!selectedClient}
                  onClick={handleOpenAddTarif}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow-xs transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Ajouter Tarif Produit
                </button>
              </div>

              {/* Search bar inside customer pricelist */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  disabled={!selectedClient}
                  placeholder="Filtrer les articles du tarif client (code, désignation)..."
                  value={searchProductInPricelist}
                  onChange={(e) => setSearchProductInPricelist(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white text-slate-800 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
                />
              </div>
            </div>

            {/* Table of Custom Tariffs */}
            <div className="flex-1 overflow-y-auto">
              {!selectedClient ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
                  <Building className="w-10 h-10 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">Sélectionnez un client à gauche</p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Cliquez sur une ligne dans la liste des clients pour consulter, ajouter ou ajuster ses prix et remises personnalisés.
                  </p>
                </div>
              ) : loadingTarifs ? (
                <div className="h-full flex items-center justify-center p-8 text-slate-500 text-xs">
                  Chargement des tarifs spécifiques...
                </div>
              ) : filteredClientTarifs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
                  <Tag className="w-10 h-10 text-slate-300" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Aucun tarif personnalisé défini</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Ce client applique actuellement les <strong>prix standards du catalogue</strong>. Vous pouvez lui accorder un tarif négocié ou une remise dédiée.
                    </p>
                  </div>
                  <button
                    onClick={handleOpenAddTarif}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter le 1er tarif négocié
                  </button>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-emerald-800 text-white z-10">
                    <tr className="divide-x divide-emerald-700 font-semibold text-[11px]">
                      <th className="py-2 px-2.5 w-16">Code</th>
                      <th className="py-2 px-2.5">Article / Produit</th>
                      <th className="py-2 px-2 text-right">Prix Cat. HT</th>
                      <th className="py-2 px-2.5 text-right font-bold text-amber-200">Prix Client HT</th>
                      <th className="py-2 px-2 text-center w-16">Remise %</th>
                      <th className="py-2 px-2.5">Conditions / Notes</th>
                      <th className="py-2 px-2 text-center w-14">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredClientTarifs.map((tarif) => {
                      const standardPrice = tarif.prix_standard_ht || 0;
                      const customPrice = tarif.prix_special_ht;
                      const diff = customPrice - standardPrice;
                      const diffPct = standardPrice > 0 ? ((diff / standardPrice) * 100).toFixed(1) : 0;

                      return (
                        <tr key={tarif.id} className="hover:bg-emerald-50/50 transition divide-x divide-slate-100 even:bg-slate-50/40">
                          <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600 font-semibold">
                            {tarif.produit_code || '-'}
                          </td>
                          <td className="py-2 px-2.5">
                            <div className="font-semibold text-slate-900">{tarif.produit_libelle}</div>
                            <div className="text-[10px] text-slate-400">Unité: {tarif.produit_unite || 'U'} • TVA: {tarif.taux_tva || 20}%</div>
                          </td>
                          <td className="py-2 px-2 text-right font-mono text-slate-500 whitespace-nowrap">
                            {formatCurrency(standardPrice, false)}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap bg-emerald-50/50">
                            {formatCurrency(customPrice, false)}
                          </td>
                          <td className="py-2 px-2 text-center whitespace-nowrap">
                            {tarif.remise_pct && tarif.remise_pct > 0 ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                -{tarif.remise_pct}%
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">0%</span>
                            )}
                          </td>
                          <td className="py-2 px-2.5 text-slate-600 text-[11px]">
                            {tarif.notes || <span className="text-slate-300 italic">-</span>}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEditTarif(tarif)}
                                className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded transition"
                                title="Modifier"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteTarif(tarif.id, tarif.produit_libelle)}
                                className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded transition"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Bottom Summary Bar for Pricelist */}
            {selectedClient && (
              <div className="p-3 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between text-xs">
                <div className="text-slate-600">
                  Total tarifs négociés : <strong className="text-emerald-700 font-mono">{clientTarifs.length} articles</strong>
                </div>
                <div className="text-[11px] text-slate-500">
                  Ces prix s'appliqueront automatiquement lors de la création de <strong>BLs</strong> et <strong>Factures</strong>.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: AJOUTER / MODIFIER UN TARIF SPECIFIQUE CLIENT */}
      {/* ========================================================================= */}
      {isTarifModalOpen && selectedClient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-300" />
                  {editingTarifId ? 'Modifier le Tarif Négocié' : 'Ajouter un Tarif Spécifique Client'}
                </h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Client : <strong className="text-white">{selectedClient.nom}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsTarifModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTarif} className="p-5 space-y-4">
              {/* Product Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Article / Produit du Catalogue *
                </label>
                {!editingTarifId && (
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filtrer les produits du catalogue..."
                      value={modalProductSearch}
                      onChange={(e) => setModalProductSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 text-slate-800 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                <select
                  disabled={!!editingTarifId}
                  value={selectedProduitId}
                  onChange={(e) => {
                    const pid = parseInt(e.target.value, 10);
                    setSelectedProduitId(pid);
                    const prd = produits.find((p) => p.id === pid);
                    if (prd) {
                      setCustomPriceHt(String(prd.prix_ht));
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-white text-slate-800 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100 font-medium"
                >
                  {modalFilteredProduits.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.code}] {p.libelle} — Standard: {formatCurrency(p.prix_ht)} HT ({p.unite || 'U'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Standard Price Info Box */}
              {currentModalProduct && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500">Prix Catalogue Standard :</span>{' '}
                    <strong className="font-mono text-slate-900 font-bold">{formatCurrency(currentModalProduct.prix_ht)} HT</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">TVA :</span>{' '}
                    <strong className="font-mono text-slate-900">{currentModalProduct.taux_tva || 20}%</strong>
                  </div>
                </div>
              )}

              {/* Custom Negotiated Price and Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Prix Spécifique Client (HT) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={customPriceHt}
                      onChange={(e) => setCustomPriceHt(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-xs bg-white font-mono font-bold text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                      DH
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Remise Ligne Accordée (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={customRemisePct}
                      onChange={(e) => setCustomRemisePct(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 text-xs bg-white font-mono font-bold text-slate-900 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes / Conditions */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Conditions Particulières / Motif
                </label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Ex: Contrat annuel grand volume, franco de port..."
                  className="w-full px-3 py-2 text-xs bg-white text-slate-800 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Dialog Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsTarifModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition active:scale-95 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {editingTarifId ? 'Enregistrer Modifications' : 'Enregistrer le Tarif Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

