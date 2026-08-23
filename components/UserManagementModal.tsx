'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  KeyRound,
  Shield,
  Trash2,
  Edit2,
  Check,
  X,
  Lock,
  Mail,
  User,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { AppUser, UserRole } from '@/lib/types';
import {
  fetchUsers,
  createUserInDb,
  updateUserInDb,
  deleteUserFromDb
} from '@/lib/sqlite-service';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  onUserUpdated?: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated
}) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [username, setUsername] = useState('');
  const [nomComplet, setNomComplet] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('CAISSE');
  const [pinCode, setPinCode] = useState('1234');
  const [motDePasse, setMotDePasse] = useState('password123');

  const resetForm = useCallback(() => {
    setIsEditing(false);
    setEditingUserId(null);
    setUsername('');
    setNomComplet('');
    setEmail('');
    setRole('CAISSE');
    setPinCode('1234');
    setMotDePasse('password123');
    setError(null);
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchUsers();
      setUsers(list);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    if (isOpen) {
      (async () => {
        setLoading(true);
        try {
          const list = await fetchUsers();
          if (active) {
            setUsers(list);
          }
        } catch (err: any) {
          if (active) {
            setError(err?.message || 'Erreur lors du chargement des utilisateurs');
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      })();
    }
    return () => {
      active = false;
    };
  }, [isOpen]);

  const handleStartEdit = (u: AppUser) => {
    setIsEditing(true);
    setEditingUserId(u.id);
    setUsername(u.username);
    setNomComplet(u.nom_complet);
    setEmail(u.email || '');
    setRole(u.role);
    setPinCode(u.pin_code || '1234');
    setMotDePasse('');
    setError(null);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username.trim() || !nomComplet.trim()) {
      setError('Veuillez remplir au minimum le nom complet et l\'identifiant.');
      return;
    }

    try {
      if (isEditing && editingUserId) {
        await updateUserInDb(editingUserId, {
          username: username.trim(),
          nom_complet: nomComplet.trim(),
          email: email.trim() || undefined,
          role,
          pin_code: pinCode.trim() || undefined,
          mot_de_passe: motDePasse.trim() || undefined
        });
        setSuccess('Utilisateur mis à jour avec succès.');
      } else {
        if (!motDePasse.trim()) {
          setError('Le mot de passe est obligatoire pour un nouvel utilisateur.');
          return;
        }
        await createUserInDb({
          username: username.trim(),
          nom_complet: nomComplet.trim(),
          email: email.trim() || undefined,
          role,
          pin_code: pinCode.trim() || '1234',
          mot_de_passe: motDePasse.trim()
        });
        setSuccess('Nouvel utilisateur créé avec succès.');
      }

      await loadUsers();
      resetForm();
      if (onUserUpdated) onUserUpdated();
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de l\'enregistrement');
    }
  };

  const handleDeleteUser = async (id: number, name: string) => {
    if (id === 1) {
      setError("L'administrateur principal ne peut pas être supprimé.");
      return;
    }
    if (currentUser?.id === id) {
      setError("Vous ne pouvez pas supprimer le compte actuellement connecté.");
      return;
    }

    if (window.confirm(`Confirmez-vous la suppression de l'utilisateur "${name}" ?`)) {
      try {
        await deleteUserFromDb(id);
        setSuccess(`Utilisateur ${name} supprimé.`);
        await loadUsers();
        if (onUserUpdated) onUserUpdated();
      } catch (err: any) {
        setError(err?.message || 'Erreur lors de la suppression');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Gestion des Utilisateurs & Accès</h2>
              <p className="text-xs text-slate-400">
                Gérez les comptes, mots de passe, codes PIN et rôles d'accès
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Notifications */}
          {error && (
            <div className="p-3 bg-red-950/70 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: User List */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Utilisateurs enregistrés ({users.length})
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + Nouveau
                </button>
              </div>

              <div className="space-y-2">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                      editingUserId === u.id
                        ? 'bg-blue-950/40 border-blue-500'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        u.role === 'ADMIN'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : u.role === 'CAISSE'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {u.avatar || u.nom_complet.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">{u.nom_complet}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'ADMIN'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : u.role === 'CAISSE'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-blue-950 text-blue-300 border border-blue-800'
                          }`}>
                            {u.role}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                          <span>@{u.username}</span>
                          <span>•</span>
                          <span className="text-slate-500">PIN: {u.pin_code || '---'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(u)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition"
                        title="Modifier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {u.id !== 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id, u.nom_complet)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Create / Edit Form */}
            <div className="lg:col-span-5 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                {isEditing ? <Edit2 className="w-3.5 h-3.5 text-blue-400" /> : <UserPlus className="w-3.5 h-3.5 text-emerald-400" />}
                {isEditing ? 'Modifier utilisateur' : 'Ajouter un utilisateur'}
              </h3>

              <form onSubmit={handleSaveUser} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-300">
                    Nom Complet
                  </label>
                  <input
                    type="text"
                    value={nomComplet}
                    onChange={(e) => setNomComplet(e.target.value)}
                    placeholder="Ex: Yassine Benali"
                    required
                    className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-300">
                      Identifiant (@username)
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="yassine"
                      required
                      className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-300">
                      Rôle d'accès
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="ADMIN">Administrateur (Complet)</option>
                      <option value="CAISSE">Opérateur Caisse (POS)</option>
                      <option value="GESTIONNAIRE">Gestion Commerciale</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-300">
                    Email (Optionnel)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yassine@verdeorto.ma"
                    className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-300">
                      Code PIN (4 chiffres)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="1234"
                      className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-300">
                      {isEditing ? 'Nouveau mot de passe' : 'Mot de passe'}
                    </label>
                    <input
                      type="password"
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                      placeholder={isEditing ? 'Laisser vide si inchangé' : '••••••••'}
                      className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  {isEditing && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 rounded-lg"
                    >
                      Annuler
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm"
                  >
                    {isEditing ? 'Enregistrer' : 'Créer l\'utilisateur'}
                  </button>
                </div>
              </form>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
