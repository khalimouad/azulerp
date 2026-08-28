import json, urllib.request, re, time

CONN_STR = 'postgresql://neondb_owner:npg_sDWQHVNl40Ux@ep-mute-bonus-axewz7d8-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require'
SQL_ENDPOINT = 'https://ep-mute-bonus-axewz7d8-pooler.c-4.us-east-2.aws.neon.tech/sql'

def execute_sql(query, params=None):
    payload = {'query': query}
    if params:
        payload['params'] = params
    req = urllib.request.Request(
        SQL_ENDPOINT,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Neon-Connection-String': CONN_STR
        },
        method='POST'
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"❌ SQL Error on query: {query[:120]}...")
        print("Response:", e.read().decode('utf-8'))
        raise

print('🔌 1. Initialisation des tables dans Neon PostgreSQL...')

DDL_STATEMENTS = [
'''
CREATE TABLE IF NOT EXISTS company_info (
  id SERIAL PRIMARY KEY,
  nom VARCHAR(255) NOT NULL DEFAULT 'VERDEORTO SARL AU',
  forme_juridique VARCHAR(100) DEFAULT 'SARL AU',
  capital VARCHAR(100) DEFAULT '100 000,00',
  adresse TEXT NOT NULL DEFAULT 'Avenue Al Mouqaouama, Quartier Ain Merroudi, Résidence DaVinci, Bloc F, Magasin N°20',
  adresse_detail TEXT,
  code_postal VARCHAR(20) DEFAULT '40000',
  ville VARCHAR(100) DEFAULT 'Marrakech',
  pays VARCHAR(100) DEFAULT 'Maroc',
  telephone VARCHAR(50) DEFAULT '0808551156 / 0678301643',
  fax VARCHAR(50),
  email VARCHAR(150) DEFAULT 'verdeorto@gmail.com',
  site_web VARCHAR(255),
  ice VARCHAR(50) NOT NULL DEFAULT '000194441000024',
  if_fiscal VARCHAR(50) DEFAULT '3381764',
  rc VARCHAR(50) DEFAULT '35265',
  cnss VARCHAR(50) DEFAULT '7788302',
  patente VARCHAR(50) DEFAULT '46201837',
  agrement_onssa VARCHAR(100),
  partenaire_coop TEXT,
  logo_titre VARCHAR(255),
  logo_sous_titre VARCHAR(255),
  logo_image TEXT,
  logo_mode VARCHAR(50) DEFAULT 'both',
  logo_placement VARCHAR(50) DEFAULT 'left',
  banque_nom VARCHAR(100) DEFAULT 'Banque Populaire',
  banque_rib VARCHAR(100) DEFAULT '181 450 21111 00000000000 00',
  banque_swift VARCHAR(50),
  devise VARCHAR(20) DEFAULT 'DH (MAD)',
  taux_tva_defaut NUMERIC(5, 2) DEFAULT 20.00,
  notes_facture TEXT DEFAULT 'Merci pour votre confiance. Verde Orto Marrakech.',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
''',
'''
CREATE TABLE IF NOT EXISTS fournisseurs (
  id BIGINT PRIMARY KEY,
  code VARCHAR(50),
  nom VARCHAR(255) NOT NULL,
  interlocuteur VARCHAR(255),
  adresse TEXT,
  code_postal VARCHAR(20),
  ville VARCHAR(100),
  telephone VARCHAR(50),
  gsm VARCHAR(50),
  mobile VARCHAR(50),
  fax VARCHAR(50),
  email VARCHAR(150),
  ice VARCHAR(50),
  observations TEXT,
  notes TEXT,
  solde_du NUMERIC(15, 2) DEFAULT 0.00,
  total_achats NUMERIC(15, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
''',
'''
CREATE TABLE IF NOT EXISTS factures_fournisseurs (
  id BIGINT PRIMARY KEY,
  numero VARCHAR(100) NOT NULL,
  fournisseur_id BIGINT NOT NULL,
  fournisseur_nom VARCHAR(255) NOT NULL,
  fournisseur_ice VARCHAR(50),
  date_facture VARCHAR(50) NOT NULL,
  date_echeance VARCHAR(50),
  total_ht NUMERIC(15, 2) DEFAULT 0.00,
  tva_20 NUMERIC(15, 2) DEFAULT 0.00,
  tva_10 NUMERIC(15, 2) DEFAULT 0.00,
  tva_7 NUMERIC(15, 2) DEFAULT 0.00,
  total_tva NUMERIC(15, 2) DEFAULT 0.00,
  total_ttc NUMERIC(15, 2) DEFAULT 0.00,
  montant_paye NUMERIC(15, 2) DEFAULT 0.00,
  reste_a_payer NUMERIC(15, 2) DEFAULT 0.00,
  statut VARCHAR(50) DEFAULT 'A payer',
  etat VARCHAR(50) DEFAULT 'Validé',
  designation_achat TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
''',
'''
CREATE TABLE IF NOT EXISTS factures_fournisseurs_lignes (
  id BIGINT PRIMARY KEY,
  facture_fournisseur_id BIGINT NOT NULL,
  produit_id BIGINT,
  designation VARCHAR(255) NOT NULL,
  quantite NUMERIC(15, 3) DEFAULT 1.000,
  prix_achat_ht NUMERIC(15, 4) DEFAULT 0.0000,
  taux_tva NUMERIC(5, 2) DEFAULT 20.00,
  total_ht NUMERIC(15, 2) DEFAULT 0.00,
  total_tva NUMERIC(15, 2) DEFAULT 0.00,
  total_ttc NUMERIC(15, 2) DEFAULT 0.00
);
''',
'''
CREATE TABLE IF NOT EXISTS paiements_fournisseurs (
  id BIGINT PRIMARY KEY,
  fournisseur_id BIGINT NOT NULL,
  fournisseur_nom VARCHAR(255) NOT NULL,
  facture_fournisseur_id BIGINT,
  facture_numero VARCHAR(100),
  date_paiement VARCHAR(50) NOT NULL,
  montant NUMERIC(15, 2) NOT NULL,
  mode_paiement VARCHAR(100) DEFAULT 'Chèque',
  numero_cheque_ref VARCHAR(100),
  banque_emettrice VARCHAR(100),
  date_echeance_depot VARCHAR(50),
  statut_cheque VARCHAR(100) DEFAULT 'En attente',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
'''
]

for stmt in DDL_STATEMENTS:
    execute_sql(stmt.strip())
print('✅ Tables vérifiées / créées avec succès.')

# 2. Load data
with open('/root/verdeorto_golive/prepared_achats.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

factures = data.get('factures', [])
paiements = data.get('paiements', [])

print(f'📦 Chargement de {len(factures)} factures d\'achat et {len(paiements)} paiements.')

# 3. Group suppliers
suppliers = {}
sup_counter = 1001
for f in factures:
    s_name = f.get('fournisseur') or f.get('feuille') or 'Divers'
    if s_name not in suppliers:
        code_clean = re.sub(r'[^A-Z0-9]', '', s_name.upper())[:6] or 'FRN'
        suppliers[s_name] = {
            'id': sup_counter,
            'code': f'FRN-{code_clean}',
            'nom': s_name,
            'total_achats': 0.0,
            'solde_du': 0.0
        }
        sup_counter += 1
    sup = suppliers[s_name]
    sup['total_achats'] += float(f.get('total_ttc', 0))
    sup['solde_du'] += float(f.get('solde', 0))

print(f'🏢 2. Injection de {len(suppliers)} Fournisseurs...')
for s_name, sup in suppliers.items():
    s_esc = sup['nom'].replace("'", "''")
    q = f"""
    INSERT INTO fournisseurs (id, code, nom, total_achats, solde_du, observations)
    VALUES ({sup['id']}, '{sup['code']}', '{s_esc}', {sup['total_achats']:.2f}, {sup['solde_du']:.2f}, 'Importé Google Sheets')
    ON CONFLICT (id) DO UPDATE SET
      nom = EXCLUDED.nom,
      total_achats = EXCLUDED.total_achats,
      solde_du = EXCLUDED.solde_du;
    """
    execute_sql(q)

print(f'🧾 3. Injection par lots de {len(factures)} Factures d\'achats et leurs lignes...')
fac_counter = 200001
line_counter = 500001
fac_id_by_num = {}

BATCH_SIZE = 50
for i in range(0, len(factures), BATCH_SIZE):
    batch = factures[i:i + BATCH_SIZE]
    fac_values = []
    line_values = []
    
    for f in batch:
        s_name = f.get('fournisseur') or f.get('feuille')
        sup = suppliers.get(s_name, {'id': 1001, 'nom': s_name})
        fac_id = fac_counter
        fac_counter += 1
        line_id = line_counter
        line_counter += 1
        
        num = str(f.get('numero', '')).replace("'", "''")
        fac_id_by_num[f.get('numero')] = fac_id
        
        dt = str(f.get('date_facture', '2025-01-01'))
        ttc = float(f.get('total_ttc', 0))
        ht = round(ttc / 1.20, 2)
        tva = round(ttc - ht, 2)
        paye = float(f.get('montant_paye', 0))
        reste = float(f.get('solde', ttc - paye))
        statut = 'Payée' if reste <= 0 else ('Partiellement payée' if paye > 0 else 'A payer')
        obs = str(f.get('observation', '')).replace("'", "''")
        sup_nom = str(sup['nom']).replace("'", "''")
        
        fac_values.append(
            f"({fac_id}, '{num}', {sup['id']}, '{sup_nom}', '{dt}', {ht}, {tva}, {tva}, {ttc}, {paye}, {reste}, '{statut}', 'Validé', 'Achat {sup_nom}', '{obs}')"
        )
        line_values.append(
            f"({line_id}, {fac_id}, 'Achats & Matières Premières ({sup_nom})', 1.000, {ht}, 20.00, {ht}, {tva}, {ttc})"
        )
        
    fac_insert_sql = f"""
    INSERT INTO factures_fournisseurs (
      id, numero, fournisseur_id, fournisseur_nom, date_facture,
      total_ht, tva_20, total_tva, total_ttc, montant_paye, reste_a_payer,
      statut, etat, designation_achat, notes
    ) VALUES {','.join(fac_values)}
    ON CONFLICT (id) DO UPDATE SET
      total_ttc = EXCLUDED.total_ttc,
      montant_paye = EXCLUDED.montant_paye,
      reste_a_payer = EXCLUDED.reste_a_payer,
      statut = EXCLUDED.statut,
      notes = EXCLUDED.notes;
    """
    execute_sql(fac_insert_sql)
    
    line_insert_sql = f"""
    INSERT INTO factures_fournisseurs_lignes (
      id, facture_fournisseur_id, designation, quantite,
      prix_achat_ht, taux_tva, total_ht, total_tva, total_ttc
    ) VALUES {','.join(line_values)}
    ON CONFLICT (id) DO UPDATE SET
      total_ht = EXCLUDED.total_ht,
      total_ttc = EXCLUDED.total_ttc;
    """
    execute_sql(line_insert_sql)
    print(f"  -> {min(i + BATCH_SIZE, len(factures))} / {len(factures)} factures insérées...")

print(f'💳 4. Injection par lots de {len(paiements)} Règlements Fournisseurs...')
pay_counter = 800001
for i in range(0, len(paiements), BATCH_SIZE):
    batch = paiements[i:i + BATCH_SIZE]
    pay_values = []
    for p in batch:
        sup = suppliers.get(p.get('fournisseur'), {'id': 1001, 'nom': p.get('fournisseur')})
        pay_id = pay_counter
        pay_counter += 1
        
        fac_num = str(p.get('facture_numero', '')).replace("'", "''")
        fac_id = fac_id_by_num.get(p.get('facture_numero'), 'NULL')
        dt = str(p.get('date_paiement', '2025-01-01'))
        mt = float(p.get('montant', 0))
        mode = str(p.get('mode_paiement', 'Chèque')).replace("'", "''")
        chq_ref = str(p.get('numero_cheque_ref', '')).replace("'", "''")
        ech_depot = str(p.get('date_echeance_depot', '')).replace("'", "''")
        obs = str(p.get('observation', '')).replace("'", "''")
        sup_nom = str(sup['nom']).replace("'", "''")
        statut_chq = 'Encaissé' if mode == 'Chèque' else 'Payé'
        
        pay_values.append(
            f"({pay_id}, {sup['id']}, '{sup_nom}', {fac_id}, '{fac_num}', '{dt}', {mt}, '{mode}', '{chq_ref}', '{ech_depot}', '{statut_chq}', '{obs}')"
        )
        
    pay_insert_sql = f"""
    INSERT INTO paiements_fournisseurs (
      id, fournisseur_id, fournisseur_nom, facture_fournisseur_id, facture_numero,
      date_paiement, montant, mode_paiement, numero_cheque_ref,
      date_echeance_depot, statut_cheque, notes
    ) VALUES {','.join(pay_values)}
    ON CONFLICT (id) DO UPDATE SET
      montant = EXCLUDED.montant,
      mode_paiement = EXCLUDED.mode_paiement,
      numero_cheque_ref = EXCLUDED.numero_cheque_ref,
      notes = EXCLUDED.notes;
    """
    execute_sql(pay_insert_sql)
    print(f"  -> {min(i + BATCH_SIZE, len(paiements))} / {len(paiements)} paiements insérés...")

# 5. Verify database counts
print('\n🔍 5. Vérification finale des données en base Neon...')
counts_res = execute_sql('''
SELECT 
  (SELECT count(*) FROM fournisseurs) as nb_fournisseurs,
  (SELECT count(*) FROM factures_fournisseurs) as nb_factures,
  (SELECT count(*) FROM factures_fournisseurs_lignes) as nb_lignes,
  (SELECT count(*) FROM paiements_fournisseurs) as nb_paiements,
  (SELECT coalesce(sum(total_ttc), 0) FROM factures_fournisseurs) as total_achats_mad,
  (SELECT coalesce(sum(montant), 0) FROM paiements_fournisseurs) as total_reglements_mad,
  (SELECT coalesce(sum(reste_a_payer), 0) FROM factures_fournisseurs) as reste_a_payer_total_mad;
''')

print('📊 RÉSULTAT DIRECT DE NEON POSTGRESQL :')
print(json.dumps(counts_res.get('rows', []), indent=2))
