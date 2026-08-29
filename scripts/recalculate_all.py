import json, urllib.request

CONN_STR = 'postgresql://neondb_owner:npg_sDWQHVNl40Ux@ep-mute-bonus-axewz7d8-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require'
SQL_ENDPOINT = 'https://ep-mute-bonus-axewz7d8-pooler.c-4.us-east-2.aws.neon.tech/sql'

def execute_sql(query):
    req = urllib.request.Request(
        SQL_ENDPOINT,
        data=json.dumps({'query': query}).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'Neon-Connection-String': CONN_STR},
        method='POST'
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))

# 1. Fetch all suppliers, invoices, and payments
suppliers_res = execute_sql('SELECT * FROM fournisseurs ORDER BY id ASC;')
factures_res = execute_sql('SELECT * FROM factures_fournisseurs ORDER BY id ASC;')
paiements_res = execute_sql('SELECT * FROM paiements_fournisseurs ORDER BY id ASC;')

suppliers = suppliers_res.get('rows', [])
factures = factures_res.get('rows', [])
paiements = paiements_res.get('rows', [])

print(f"Loaded {len(suppliers)} suppliers, {len(factures)} invoices, {len(paiements)} payments from Neon.")

# 2. Recalculate each invoice
updated_factures = []
supplier_stats = {s['id']: {'total_achats': 0.0, 'solde_du': 0.0, 'total_paye': 0.0, 'count': 0} for s in suppliers}

for f in factures:
    fac_id = int(f['id'])
    sup_id = int(f['fournisseur_id'])
    ttc = round(float(f.get('total_ttc') or 0.0), 2)
    ht = round(ttc / 1.20, 2)
    tva = round(ttc - ht, 2)
    
    # Existing values or note checks
    paye = round(float(f.get('montant_paye') or 0.0), 2)
    reste = round(float(f.get('reste_a_payer') or ttc), 2)
    
    # If reste was not specified or equals ttc and paye > 0
    if paye > 0 and reste == ttc:
        reste = max(0.0, round(ttc - paye, 2))
    elif reste < ttc and paye == 0:
        paye = max(0.0, round(ttc - reste, 2))
    elif reste == 0 and paye == 0 and ttc > 0:
        reste = ttc
        
    # Status calculation
    if reste <= 0 or paye >= ttc:
        statut = 'Payée'
        reste = 0.0
        paye = ttc
    elif paye > 0 and reste > 0:
        statut = 'Partiel'
    else:
        statut = 'A payer'
        reste = ttc
        paye = 0.0
        
    updated_factures.append({
        'id': fac_id,
        'fournisseur_id': sup_id,
        'fournisseur_nom': f.get('fournisseur_nom', ''),
        'numero': f.get('numero', ''),
        'date_facture': f.get('date_facture', '2025-01-01'),
        'total_ht': ht,
        'tva_20': tva,
        'total_tva': tva,
        'total_ttc': ttc,
        'montant_paye': paye,
        'reste_a_payer': reste,
        'statut': statut,
        'etat': 'Validé',
        'designation_achat': f.get('designation_achat', f"Achat {f.get('fournisseur_nom', '')}"),
        'notes': f.get('notes', '')
    })
    
    if sup_id in supplier_stats:
        supplier_stats[sup_id]['total_achats'] += ttc
        supplier_stats[sup_id]['solde_du'] += reste
        supplier_stats[sup_id]['total_paye'] += paye
        supplier_stats[sup_id]['count'] += 1

# 3. Batch update factures_fournisseurs in Neon DB
BATCH_SIZE = 50
for i in range(0, len(updated_factures), BATCH_SIZE):
    batch = updated_factures[i : i + BATCH_SIZE]
    case_ht = ' '.join([f"WHEN id = {fac['id']} THEN {fac['total_ht']}" for fac in batch])
    case_tva = ' '.join([f"WHEN id = {fac['id']} THEN {fac['total_tva']}" for fac in batch])
    case_ttc = ' '.join([f"WHEN id = {fac['id']} THEN {fac['total_ttc']}" for fac in batch])
    case_paye = ' '.join([f"WHEN id = {fac['id']} THEN {fac['montant_paye']}" for fac in batch])
    case_reste = ' '.join([f"WHEN id = {fac['id']} THEN {fac['reste_a_payer']}" for fac in batch])
    case_statut = ' '.join([f"WHEN id = {fac['id']} THEN '{fac['statut']}'" for fac in batch])
    ids = ','.join([str(fac['id']) for fac in batch])
    
    q = f"""
    UPDATE factures_fournisseurs
    SET
      total_ht = CASE {case_ht} ELSE total_ht END,
      tva_20 = CASE {case_tva} ELSE tva_20 END,
      total_tva = CASE {case_tva} ELSE total_tva END,
      total_ttc = CASE {case_ttc} ELSE total_ttc END,
      montant_paye = CASE {case_paye} ELSE montant_paye END,
      reste_a_payer = CASE {case_reste} ELSE reste_a_payer END,
      statut = CASE {case_statut} ELSE statut END,
      etat = 'Validé'
    WHERE id IN ({ids});
    """
    execute_sql(q)

# 4. Update suppliers in Neon DB
updated_suppliers = []
for s in suppliers:
    s_id = int(s['id'])
    stats = supplier_stats.get(s_id, {'total_achats': 0.0, 'solde_du': 0.0, 'total_paye': 0.0, 'count': 0})
    ach = round(stats['total_achats'], 2)
    sol = round(stats['solde_du'], 2)
    
    execute_sql(f"""
      UPDATE fournisseurs
      SET total_achats = {ach:.2f}, solde_du = {sol:.2f}
      WHERE id = {s_id};
    """)
    
    updated_suppliers.append({
        'id': s_id,
        'code': s.get('code', f"FRN-{s_id}"),
        'nom': s.get('nom', ''),
        'total_achats': ach,
        'solde_du': sol,
        'factures_count': stats['count']
    })

# 5. Update seed-achats-2026.ts
out_ts = f"""
// 23 Official Suppliers from FRS 2026 (Recalculated)
export const OFFICIAL_FOURNISSEURS_2026 = {json.dumps(updated_suppliers, ensure_ascii=False, indent=2)};

// 471 Official Supplier Invoices from FRS 2026 (Recalculated)
export const OFFICIAL_FACTURES_FOURNISSEURS_2026 = {json.dumps(updated_factures, ensure_ascii=False, indent=2)};

// 248 Official Supplier Payments from FRS 2026
export const OFFICIAL_PAIEMENTS_FOURNISSEURS_2026 = {json.dumps(paiements, ensure_ascii=False, indent=2)};
"""

with open('/root/verdeorto_golive/lib/seed-achats-2026.ts', 'w', encoding='utf-8') as f:
    f.write(out_ts)

print("✅ TOUS LES CHAMPS ET STATUTS ONT ÉTÉ RECALCULÉS ET SYNCHRONISÉS DANS NEON DB !")
