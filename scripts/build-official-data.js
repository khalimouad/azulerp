const fs = require('fs');
const path = require('path');

function parseSemicolonCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  
  const headers = parseLine(lines[0]);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && !values[0])) continue;
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx] !== undefined ? values[idx].trim() : '';
    });
    rows.push(row);
  }
  return rows;
}

function parseLine(line) {
  const tokens = [];
  let insideQuote = false;
  let current = '';
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      insideQuote = !insideQuote;
    } else if (char === ';' && !insideQuote) {
      tokens.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  tokens.push(current.trim());
  return tokens;
}

// 1. Categories
const catRows = parseSemicolonCSV(path.join(__dirname, '../data/categories.txt'));
const categories = catRows.map(r => ({
  id: parseInt(r['IDCategorie'] || r['N° Enr.'] || '0', 10),
  libelle: r['libelle'] || ''
})).filter(c => c.libelle);

// 2. Familles
const famRows = parseSemicolonCSV(path.join(__dirname, '../data/familles.txt'));
const familles = famRows.map(r => ({
  id: parseInt(r['IDFamille'] || r['N° Enr.'] || '0', 10),
  libelle: r['Libelle'] || '',
  categorie_id: parseInt(r['IDCategorie'] || '0', 10)
})).filter(f => f.libelle);

const famMap = {};
familles.forEach(f => { famMap[f.id] = f.libelle; });
const catMap = {};
categories.forEach(c => { catMap[c.id] = c.libelle; });

// 3. Marques
const marqRows = parseSemicolonCSV(path.join(__dirname, '../data/marques.txt'));
const marques = marqRows.map(r => ({
  id: parseInt(r['IDMarque'] || r['N° Enr.'] || '0', 10),
  libelle: r['Libelle'] || ''
})).filter(m => m.libelle);
const marqMap = {};
marques.forEach(m => { marqMap[m.id] = m.libelle; });

// 4. Fournisseurs
const fourRows = parseSemicolonCSV(path.join(__dirname, '../data/fournisseurs.txt'));
const fournisseurs = fourRows.map((r, idx) => {
  const num = r['NumFournisseur'] || String(idx + 1);
  const code = 'FR' + String(num).padStart(3, '0');
  const nom = r['Societe'] || r['Nom'] || `Fournisseur ${num}`;
  const interlocuteur = [r['Nom'], r['Prénom']].filter(Boolean).join(' ') || r['Civilite'] || '';
  return {
    code,
    nom: nom.replace(/^"+|"+$/g, '').trim(),
    interlocuteur: interlocuteur.replace(/^"+|"+$/g, '').trim(),
    adresse: (r['Adresse'] || '').replace(/^"+|"+$/g, '').trim(),
    cp: r['CodePostal'] || '40000',
    ville: r['Ville'] || 'MARRAKECH',
    tel: r['Telephone'] || '',
    gsm: r['GSM'] || '',
    fax: r['Fax'] || '',
    email: r['EMail'] || '',
    ice: r['ICE'] || '',
    observations: r['Observations'] || ''
  };
}).filter(f => f.nom && f.nom !== 'NBNBNB' && f.nom !== 'JGHHGHJ' && f.nom !== 'NBNBN' && f.nom !== 'JJGJNVBVB' && f.nom !== 'LLJKJK');

// 5. Clients
const cliRows = parseSemicolonCSV(path.join(__dirname, '../data/clients.txt'));
const clients = cliRows.map((r, idx) => {
  const id = r['IDClient'] || String(idx + 1);
  const code = 'CL' + String(id).padStart(3, '0');
  let nom = r['Societe'] || r['NomClient'] || r['nom'] || `Client ${id}`;
  nom = nom.replace(/^"+|"+$/g, '').trim();
  if (nom === 'Annuller') return null;

  const interlocuteur = (r['NomClient'] || r['nom'] || r['Prénom'] || '').replace(/^"+|"+$/g, '').trim();
  const adresse = (r['Adresse'] || '').replace(/^"+|"+$/g, '').trim();
  const ville = (r['Ville'] || 'MARRAKECH').replace(/^"+|"+$/g, '').trim();
  const cp = (r['CodePostal'] || '40000').replace(/^"+|"+$/g, '').trim();
  const tel = (r['Telephone'] || r['tel'] || '').replace(/^"+|"+$/g, '').trim();
  const mobile = (r['GSM'] || '').replace(/^"+|"+$/g, '').trim();
  const ice = (r['ICE'] || '').replace(/^"+|"+$/g, '').trim();
  const email = (r['EMail'] || r['adresseEmail'] || '').replace(/^"+|"+$/g, '').trim();
  const solde = parseFloat(r['solde'] || '0') || 0;
  const observations = (r['Observations'] || '').replace(/^"+|"+$/g, '').trim();

  return {
    code,
    nom: nom || `Client ${id}`,
    interlocuteur: interlocuteur !== nom ? interlocuteur : '',
    adresse,
    cp,
    ville: ville || 'MARRAKECH',
    tel: tel === '0' ? '' : tel,
    mobile: mobile === '0' ? '' : mobile,
    email,
    ice,
    solde,
    observations
  };
}).filter(Boolean);

// 6. Produits
const prdRows = parseSemicolonCSV(path.join(__dirname, '../data/produits.txt'));
const produits = prdRows.map((r, idx) => {
  const code = r['RefArticle'] || `PRD${String(idx + 1).padStart(3, '0')}`;
  const libelle = (r['Designation'] || `Article ${code}`).replace(/^"+|"+$/g, '').trim();
  const famId = parseInt(r['IDFamille'] || '0', 10);
  const familleName = famMap[famId] || 'DIVERS';
  const marqId = parseInt(r['IDMarque'] || '0', 10);
  const marqueName = marqMap[marqId] || '';
  
  const prix_achat = parseFloat(r['PrixAchat'] || '0') || 0;
  const prix_ht = parseFloat(r['PrixVente'] || '0') || Math.round(prix_achat * 1.3);
  const stock = parseFloat(r['QteStock'] || '50') || 50;
  const min = parseFloat(r['QteMin'] || '10') || 10;
  const tva = parseFloat(r['TVA'] || '20') || 20;
  const unite = (r['Unite'] || 'U').trim() || 'U';

  return {
    code,
    libelle,
    groupe: 'ALIMENTAIRE',
    famille: familleName,
    marque: marqueName,
    unite,
    taux_tva: tva,
    prix_ht,
    prix_achat,
    stock_actuel: stock,
    stock_min: min
  };
});

console.log(`Parsed:
- Categories: ${categories.length}
- Familles: ${familles.length}
- Marques: ${marques.length}
- Fournisseurs: ${fournisseurs.length}
- Clients: ${clients.length}
- Produits: ${produits.length}
`);

// Write official-seed-data.ts
const tsContent = `// Official datasets parsed from user migration files
export interface SeedCategory {
  id: number;
  libelle: string;
}

export interface SeedFamille {
  id: number;
  libelle: string;
  categorie_id: number;
}

export interface SeedMarque {
  id: number;
  libelle: string;
}

export interface SeedClient {
  code: string;
  nom: string;
  interlocuteur: string;
  adresse: string;
  cp: string;
  ville: string;
  tel: string;
  mobile: string;
  email: string;
  ice: string;
  solde: number;
  observations: string;
}

export interface SeedFournisseur {
  code: string;
  nom: string;
  interlocuteur: string;
  adresse: string;
  cp: string;
  ville: string;
  tel: string;
  gsm: string;
  fax: string;
  email: string;
  ice: string;
  observations: string;
}

export interface SeedProduit {
  code: string;
  libelle: string;
  groupe: string;
  famille: string;
  marque?: string;
  unite: string;
  taux_tva: number;
  prix_ht: number;
  prix_achat: number;
  stock_actuel: number;
  stock_min: number;
}

export const OFFICIAL_CATEGORIES: SeedCategory[] = ${JSON.stringify(categories, null, 2)};

export const OFFICIAL_FAMILLES: SeedFamille[] = ${JSON.stringify(familles, null, 2)};

export const OFFICIAL_MARQUES: SeedMarque[] = ${JSON.stringify(marques, null, 2)};

export const OFFICIAL_FOURNISSEURS: SeedFournisseur[] = ${JSON.stringify(fournisseurs, null, 2)};

export const OFFICIAL_CLIENTS: SeedClient[] = ${JSON.stringify(clients, null, 2)};

export const OFFICIAL_PRODUITS: SeedProduit[] = ${JSON.stringify(produits, null, 2)};
`;

fs.writeFileSync(path.join(__dirname, '../lib/official-seed-data.ts'), tsContent, 'utf-8');
console.log('Successfully generated /lib/official-seed-data.ts');
