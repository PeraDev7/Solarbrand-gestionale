# 📋 PROMEMORIA PERMANENTE — SolarBrand Gestionale
## 💻 Situazione: Google Drive + npm su Windows

Google Drive su Windows (modalità **streaming/virtuale**) NON supporta l'estrazione
di archivi .tar che npm usa per installare i pacchetti. I file in node_modules/ vengono
scritti come 0 byte (vuoti), rendendo l'app non avviabile direttamente dalla cartella Drive.

---

## 📁 Cartelle del Progetto

| Ruolo | Percorso |
|---|---|
| **PRIMARIA** (codice sorgente) | H:\Il mio Drive\Siti in TRAE\SolarBrand - gestionale chiamate\app vera e propria\ |
| **SECONDARIA** (runtime locale) | C:\npm_tmp2\ |

La cartella PRIMARIA su Google Drive E' QUELLA GIUSTA per portare il progetto su Hostinger.
La cartella C:\npm_tmp2 serve SOLO per lo sviluppo locale su questo PC.

---

## ▶️ Per Avviare l'App in Locale (questo PC)

Fai doppio click su: **`AVVIA_APP_LOCALE.bat`** (nella cartella radice) oppure su `start-app.bat`.

Grazie all'architettura **Dual-Engine Universale**:
- L'applicazione rileva che sei in locale e usa automaticamente il database SQLite (`data/app.db`) con **tutti i 57 lead reali, 26 appuntamenti, colleghi e impostazioni**.
- **Nessuna installazione o configurazione di MySQL necessaria sul tuo PC**.
- Apre automaticamente il browser su `http://localhost:3000`.

---

## 🚀 DEPLOY SU HOSTINGER (Business Hosting o Cloud Hosting)

### 📌 Piano da acquistare
- **Hostinger Business Web Hosting** oppure **Cloud Startup**
- Verifica che sia presente il supporto **Node.js** (incluso nei piani Business e Cloud)
- Il piano include: Dominio + SSL gratuito + Database MySQL + Node.js = Tutto integrato su Hostinger!

---

### Step 1 — Crea il Database MySQL & Importa i Dati (1-Click)

1. Accedi a **hPanel** (pannello di controllo Hostinger).
2. Vai su **Database → Database MySQL**.
3. Crea un nuovo database (es. `u123456789_solarbrand`) con utente e password sicura.
4. Clicca su **Accedi a phpMyAdmin** accanto al database appena creato.
5. In phpMyAdmin, clicca sulla scheda in alto **Importa**.
6. Clicca su **Scegli file** e seleziona il file pronto presente nella cartella del progetto:
   `dump_mysql_solarbrand.sql`
7. Clicca **Esegui**: in 2 secondi verranno create tutte le 18 tabelle e importati tutti i **57 lead, 26 appuntamenti, colleghi, report e template**!

---

### Step 2 — Configura l'Applicazione Node.js su Hostinger

1. In hPanel vai su **Avanzate → Applicazione Node.js** (o cerca "Node.js").
2. Clicca su **Crea Applicazione**.
3. Imposta i parametri:
   - **Versione Node.js**: 20.x o 22.x
   - **Radice applicazione (Application root)**: `/public_html` (o `domains/tuodominio.it/public_html`)
   - **File di avvio (Application startup file)**: `dist/server.cjs`
   - **Porta**: 3000

---

### Step 3 — Carica i File del Progetto

Via **File Manager** di Hostinger o via **FTP/SFTP** (FileZilla), carica i file dalla cartella `app vera e propria` nella root dell'applicazione su Hostinger:

```
src/
assets/
index.html
package.json
ecosystem.config.cjs
dump_mysql_solarbrand.sql
migrate-sqlite-to-mysql.mjs
```

> ⚠️ **NON caricare**: `node_modules/`, `data/app.db`, `.env` (questi verranno gestiti sul server).

---

### Step 4 — Build & Installazione Dipendenze (via SSH di Hostinger)

Accedi al terminale SSH di Hostinger (attivabile da hPanel → **Accesso SSH**):
```bash
cd domains/tuodominio.it/public_html/

# 1. Installa tutte le dipendenze
npm install

# 2. Compila il frontend e il server
npm run build
```

---

### Step 5 — Configura le Variabili d'Ambiente su Hostinger

In hPanel → Applicazione Node.js → **Variabili di ambiente (Environment Variables)**, inserisci:

```env
NODE_ENV=production
PORT=3000
DEMO_MODE=false
ADMIN_PASSWORD=ScegliUnaPasswordAdminSicura!
OPERATOR_SECRET=PasswordOperatoriSicura

# Credenziali MySQL create al Passo 1:
DB_HOST=localhost
DB_USER=u123456789_solarbrand
DB_PASS=LaPasswordCheHaiSceltoPerMySQL
DB_NAME=u123456789_solarbrand
DB_PORT=3306

# Lead Generation (Google Maps Scraper su Apify - opzionale se salvato da interfaccia):
APIFY_TOKEN=

# Google Calendar (quando vorrai attivarlo):
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://tuodominio.it/api/auth/google/callback
```

---

### Step 6 — Avvio e Gestione con PM2

In hPanel clicca su **Riavvia Applicazione**.

Oppure via SSH con PM2:
```bash
pm2 start ecosystem.config.cjs
pm2 save
```

---

### Step 7 — Prima Configurazione in Produzione (DEMO_MODE)

1. Per il primissimo accesso, puoi lasciare momentaneamente `DEMO_MODE=true` per entrare come Erika (admin).
2. Entra in **Gestione Team** (icona ingranaggio).
3. Per ciascun telefonista e agente reale, clicca **Credenziali** e imposta la sua **email vera** e la sua **password personale**.
4. Rimuovi eventuali utenti di test non necessari.
5. Imposta `DEMO_MODE=false` nelle variabili d'ambiente di Hostinger e riavvia l'app. Da quel momento tutti accederanno in modo sicuro con email e password!

---

## 🤝 Supporto Installazione

Appena acquisterai l'hosting su Hostinger, **apri questa chat**: ti guiderò passo-passo nell'inserimento delle credenziali, nel caricamento dei file e nella prima configurazione online!
