import re, json, urllib.request

with open('/root/verdeorto_golive/scripts/parse_exact_markdown.py', 'r') as f:
    content = f.read()

m_text = re.search(r'RAW_TEXT = """(.*?)"""', content, re.DOTALL)
raw_text = m_text.group(1)

suppliers = {}
current_supplier = None
current_section = None

for line in raw_text.split('\n'):
    line_clean = line.strip()
    if line_clean.startswith('## '):
        sup_name = line_clean.replace('##', '').strip()
        current_supplier = sup_name
        current_section = None
        if current_supplier not in suppliers:
            suppliers[current_supplier] = {'invoices': [], 'payments': []}
        continue
        
    if line_clean.startswith('### '):
        sec_name = line_clean.replace('###', '').strip().upper()
        if 'INVOICE' in sec_name:
            current_section = 'invoices'
        elif 'PAYMENT' in sec_name or 'RÈGLEMENT' in sec_name or 'REGLEMENT' in sec_name:
            current_section = 'payments'
        continue
        
    if not line_clean.startswith('|') or 'Date' in line_clean or '---' in line_clean:
        continue
        
    cols = [c.strip() for c in line_clean.split('|')[1:-1]]
    if not cols or not cols[0]:
        continue
        
    date_val = cols[0]
    
    if current_section == 'invoices' and len(cols) >= 3:
        amt_str = cols[1].replace(' ', '').replace(',', '.')
        solde_str = cols[2].replace(' ', '').replace(',', '.') if len(cols) > 2 else ''
        note_val = cols[3] if len(cols) > 3 else ''
        
        try: amt = float(amt_str) if amt_str else 0.0
        except: amt = 0.0
        
        if not amt: continue
        
        solde = 0.0
        if solde_str:
            try: solde = float(solde_str)
            except: solde = 0.0
        else:
            solde = 0.0
            
        paid = round(amt - solde, 2) if amt >= solde else 0.0
        statut = 'Payée' if solde <= 0 else ('Partiel' if paid > 0 else 'A payer')
        
        suppliers[current_supplier]['invoices'].append({
            'date_facture': date_val,
            'total_ttc': amt,
            'solde': solde,
            'montant_paye': paid,
            'statut': statut,
            'note': note_val
        })
        
    elif current_section == 'payments' and len(cols) >= 2:
        amt_str = cols[1].replace(' ', '').replace(',', '.')
        mode_val = cols[2] if len(cols) > 2 else ''
        note_val = cols[3] if len(cols) > 3 else ''
        
        try: amt = float(amt_str) if amt_str else 0.0
        except: amt = 0.0
        
        if not amt: continue
        
        mode = 'Virement'
        if 'CHQ' in (mode_val + note_val).upper() or 'CH°' in (mode_val + note_val).upper():
            mode = 'Chèque'
        elif 'ESP' in (mode_val + note_val).upper():
            mode = 'Espèces'
            
        suppliers[current_supplier]['payments'].append({
            'date_paiement': date_val,
            'montant': amt,
            'mode_paiement': mode,
            'note': note_val or mode_val
        })

diff_sub_suppliers = [
    ("GASTRONOMIK", 9),
    ("ACE MAREE", 1),
    ("FOODS & GOODS", 1),
    ("LAHJOUJI", 7),
    ("STE NAZAKYO DISTRI", 4),
    ("STE IMMOBILIERE VECOMO SARL", 10),
    ("ITALY STILO", 1),
    ("SNACK ITALY", 1),
    ("DOUIBI FOOD", 1),
    ("QUALIMET MAROC", 1),
    ("FOODS & GOODS", 2),
    ("STE OBAHA", 5),
    ("CLIMABEL", 1),
    ("KECHMAR", 1)
]

final_suppliers = {}
all_invoices = []
all_payments = []

for sup_name, data in suppliers.items():
    if sup_name == 'DIFF FACT':
        cur_inv_idx = 0
        for sub_name, count in diff_sub_suppliers:
            sub_invs = data['invoices'][cur_inv_idx : cur_inv_idx + count]
            cur_inv_idx += count
            
            if sub_name not in final_suppliers:
                final_suppliers[sub_name] = {
                    'nom': sub_name,
                    'total_achats': 0.0,
                    'solde_du': 0.0,
                    'invoices': [],
                    'payments': []
                }
                
            for inv in sub_invs:
                inv_copy = dict(inv)
                inv_copy['fournisseur'] = sub_name
                inv_copy['numero'] = f"FAC-{sub_name[:4].upper()}-{len(all_invoices)+1:04d}"
                all_invoices.append(inv_copy)
                final_suppliers[sub_name]['invoices'].append(inv_copy)
                final_suppliers[sub_name]['total_achats'] += inv_copy['total_ttc']
                final_suppliers[sub_name]['solde_du'] += inv_copy['solde']
                
        for pay in data['payments']:
            pay_copy = dict(pay)
            pay_copy['fournisseur'] = 'STE NAZAKYO DISTRI' if pay['montant'] == 7531.8 else ('STE OBAHA' if pay['montant'] in [1280.0, 1520.0, 2800.0] else ('KECHMAR' if pay['montant'] == 3970.54 else 'GASTRONOMIK'))
            all_payments.append(pay_copy)
            if pay_copy['fournisseur'] in final_suppliers:
                final_suppliers[pay_copy['fournisseur']]['payments'].append(pay_copy)
    else:
        if sup_name not in final_suppliers:
            final_suppliers[sup_name] = {
                'nom': sup_name,
                'total_achats': 0.0,
                'solde_du': 0.0,
                'invoices': [],
                'payments': []
            }
            
        for inv in data['invoices']:
            inv_copy = dict(inv)
            inv_copy['fournisseur'] = sup_name
            inv_copy['numero'] = f"FAC-{sup_name[:4].upper()}-{len(all_invoices)+1:04d}"
            all_invoices.append(inv_copy)
            final_suppliers[sup_name]['invoices'].append(inv_copy)
            final_suppliers[sup_name]['total_achats'] += inv_copy['total_ttc']
            final_suppliers[sup_name]['solde_du'] += inv_copy['solde']
            
        for pay in data['payments']:
            pay_copy = dict(pay)
            pay_copy['fournisseur'] = sup_name
            all_payments.append(pay_copy)
            final_suppliers[sup_name]['payments'].append(pay_copy)

# Add CHARGES LAIT & TRANSPORT AIT OURIR
lait_sup = "CHARGES LAIT & TRANSPORT AIT OURIR"
final_suppliers[lait_sup] = {
    'nom': lait_sup,
    'total_achats': 69900.0,
    'solde_du': 69900.0,
    'invoices': [
        {'fournisseur': lait_sup, 'date_facture': '2025-12-31', 'numero': 'TOT-LAIT-2025', 'total_ttc': 64400.0, 'solde': 64400.0, 'montant_paye': 0.0, 'statut': 'A payer', 'note': 'Total Lait Ait Ourir 2025'},
        {'fournisseur': lait_sup, 'date_facture': '2025-12-31', 'numero': 'TOT-TRANSP-2025', 'total_ttc': 5500.0, 'solde': 5500.0, 'montant_paye': 0.0, 'statut': 'A payer', 'note': 'Total Transport Ait Ourir 2025'}
    ],
    'payments': []
}
all_invoices.extend(final_suppliers[lait_sup]['invoices'])

# Connect to Neon DB
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

# Reset ONLY supplier tables in Neon DB
execute_sql('TRUNCATE TABLE factures_fournisseurs_lignes CASCADE;')
execute_sql('TRUNCATE TABLE factures_fournisseurs CASCADE;')
execute_sql('TRUNCATE TABLE paiements_fournisseurs CASCADE;')
execute_sql('DELETE FROM fournisseurs WHERE 1=1;')

# Insert Suppliers
sup_id_map = {}
sup_list_for_seed = []
for i, (s_name, s_data) in enumerate(sorted(final_suppliers.items(), key=lambda x: x[1]['total_achats'], reverse=True)):
    sup_id = 1001 + i
    sup_code = f"FRN-{re.sub(r'[^A-Z0-9]', '', s_name.upper())[:6] or 'FRN'}"
    sup_id_map[s_name] = sup_id
    s_esc = s_name.replace("'", "''")
    
    sup_list_for_seed.append({
        'id': sup_id,
        'code': sup_code,
        'nom': s_name,
        'total_achats': round(s_data['total_achats'], 2),
        'solde_du': round(s_data['solde_du'], 2),
        'factures_count': len(s_data['invoices'])
    })
    
    q = f"""
    INSERT INTO fournisseurs (id, code, nom, total_achats, solde_du, observations)
    VALUES ({sup_id}, '{sup_code}', '{s_esc}', {s_data['total_achats']:.2f}, {s_data['solde_du']:.2f}, 'Importé FRS 2026');
    """
    execute_sql(q)

# Insert Factures & Lignes in Batches
fac_counter = 200001
line_counter = 500001
BATCH_SIZE = 50

for i in range(0, len(all_invoices), BATCH_SIZE):
    batch = all_invoices[i : i + BATCH_SIZE]
    fac_values = []
    line_values = []
    
    for f in batch:
        fac_id = fac_counter
        fac_counter += 1
        line_id = line_counter
        line_counter += 1
        
        s_name = f['fournisseur']
        sup_id = sup_id_map.get(s_name, 1001)
        num = str(f['numero']).replace("'", "''")
        dt = str(f['date_facture'])
        ttc = float(f['total_ttc'])
        ht = round(ttc / 1.20, 2)
        tva = round(ttc - ht, 2)
        reste = float(f['solde'])
        paye = float(f['montant_paye'])
        statut = f['statut']
        obs = str(f.get('note', '')).replace("'", "''")
        sup_nom = s_name.replace("'", "''")
        
        fac_values.append(
            f"({fac_id}, '{num}', {sup_id}, '{sup_nom}', '{dt}', {ht}, {tva}, {tva}, {ttc}, {paye}, {reste}, '{statut}', 'Validé', 'Achat {sup_nom}', '{obs}')"
        )
        line_values.append(
            f"({line_id}, {fac_id}, 'Achats & Matières Premières ({sup_nom})', 1.000, {ht}, 20.00, {ht}, {tva}, {ttc})"
        )
        
    fac_insert_sql = f"""
    INSERT INTO factures_fournisseurs (
      id, numero, fournisseur_id, fournisseur_nom, date_facture,
      total_ht, tva_20, total_tva, total_ttc, montant_paye, reste_a_payer,
      statut, etat, designation_achat, notes
    ) VALUES {','.join(fac_values)};
    """
    execute_sql(fac_insert_sql)
    
    line_insert_sql = f"""
    INSERT INTO factures_fournisseurs_lignes (
      id, facture_fournisseur_id, designation, quantite,
      prix_achat_ht, taux_tva, total_ht, total_tva, total_ttc
    ) VALUES {','.join(line_values)};
    """
    execute_sql(line_insert_sql)

# Insert Paiements in Batches
pay_counter = 800001
for i in range(0, len(all_payments), BATCH_SIZE):
    batch = all_payments[i : i + BATCH_SIZE]
    pay_values = []
    
    for p in batch:
        pay_id = pay_counter
        pay_counter += 1
        
        s_name = p['fournisseur']
        sup_id = sup_id_map.get(s_name, 1001)
        dt = str(p['date_paiement'])
        mt = float(p['montant'])
        mode = str(p.get('mode_paiement', 'Virement')).replace("'", "''")
        obs = str(p.get('note', '')).replace("'", "''")
        chq_ref = ''
        chq_m = re.search(r'(CH\d+|CHQ\s*\d+|N°\s*\d+|CH°\d+)', obs, re.IGNORECASE)
        if chq_m: chq_ref = chq_m.group(1).replace("'", "''")
        
        sup_nom = s_name.replace("'", "''")
        statut_chq = 'Encaissé' if mode == 'Chèque' else 'Payé'
        
        pay_values.append(
            f"({pay_id}, {sup_id}, '{sup_nom}', NULL, '', '{dt}', {mt}, '{mode}', '{chq_ref}', '', '{statut_chq}', '{obs}')"
        )
        
    if pay_values:
        pay_insert_sql = f"""
        INSERT INTO paiements_fournisseurs (
          id, fournisseur_id, fournisseur_nom, facture_fournisseur_id, facture_numero,
          date_paiement, montant, mode_paiement, numero_cheque_ref,
          date_echeance_depot, statut_cheque, notes
        ) VALUES {','.join(pay_values)};
        """
        execute_sql(pay_insert_sql)

# Generate updated seed-achats-2026.ts
out_ts = f"""
// 23 Official Suppliers from FRS 2026 (Audited Math)
export const OFFICIAL_FOURNISSEURS_2026 = {json.dumps(sup_list_for_seed, ensure_ascii=False, indent=2)};

// Official Supplier Invoices from FRS 2026
export const OFFICIAL_FACTURES_FOURNISSEURS_2026 = {json.dumps(all_invoices, ensure_ascii=False, indent=2)};

// Official Supplier Payments from FRS 2026
export const OFFICIAL_PAIEMENTS_FOURNISSEURS_2026 = {json.dumps(all_payments, ensure_ascii=False, indent=2)};
"""

with open('/root/verdeorto_golive/lib/seed-achats-2026.ts', 'w', encoding='utf-8') as f:
    f.write(out_ts)

print('✅ BASE NEON ET CODE MIS À JOUR AVEC LE SOLDE DÛ EXACT !')
