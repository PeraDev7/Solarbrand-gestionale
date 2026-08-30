# Documentazione Ufficiale e Guida Completa — Solarbrand Flow (Gestionale Lead)

> **Stato del Progetto**: 🟢 **ONLINE E ATTIVO IN PRODUZIONE SU HOSTINGER**  
> **URL Produzione**: [https://crm.solarbrandkg.it/](https://crm.solarbrandkg.it/)  
> **Repository GitHub (CI/CD)**: [https://github.com/PeraDev7/Solarbrand-gestionale](https://github.com/PeraDev7/Solarbrand-gestionale) (branch `main`)  
> **Versione**: 3.6 (Architettura Dual-Engine + Google Calendar OAuth per-Agente + Gestione Assegnazione Lead + Auth Multi-Campo + Silent Polling)  
> **Architettura**: Vite + React 19 + TypeScript + Express + MySQL 8 (`mysql2/promise`) / SQLite locale (`better-sqlite3`)

---

## 1. Panoramica del Progetto & Flusso Operativo Real-World

**Solarbrand Flow** è un software gestionale web studiato specificamente per le aziende che vendono e installano **impianti fotovoltaici, pompe di calore e Comunità Energetiche (CER)**. 

L'applicazione supporta il flusso operativo aziendale completo con due portali distinti:

### 1.1 Portale Ufficio / Call Center (es. Erika, Laura, Luciana)
- **Qualifica e Chiamate**: Presenta i prodotti al telefono e qualifica i contatti. Tutti i telefonisti possono vedere l'intero database lead per lavorare liberamente le liste di chiamata.
- **Assegnazione Diretta Lead & Filtri Agente**:
  - Menu a tendina filtri nella tab *Gestione Lead* per filtrare per Telefonista assegnato, Agente commerciale, oppure *⚠️ Non Assegnati*.
  - Riassegnazione immediata 1-click direttamente dall'intestazione della scheda lead.
  - Assegnazione automatica predefinita durante l'importazione da file Excel/CSV.
- **Assegnazione Sopralluoghi & Richiami**: Fissa due tipologie distinte di appuntamento:
  - 📞 **Richiamo Telefonico Ufficio**: per ricontattare internamente il lead via telefono.
  - 🏠 **Sopralluogo Fisico Agente**: affida l'appuntamento sul campo ad uno specifico agente commerciale (es. *Marco Rossi*, *Stefano Bianchi*, ecc.).
- **Gestione Template Email & SMS di Sistema**: Gestisce i template email e SMS aziendali, inclusi i 2 template automatici di sistema (*Ringraziamento Post-Sopralluogo* e *Richiesta Recensione Stelline*).
- **Monitoraggio Esiti, Preventivi & Stelline Agenti**: Vede nello storico del cliente i report dei venditori, i preventivi allegati (WhatsApp, Cartaceo, Email) e la media valutazioni a stelline ricevuta dagli agenti.
- **Esportazione Report Attività (Excel & PDF Professionale)**: Genera report avanzati per presentazioni aziendali.

### 1.2 Portale Agenti Commerciali / Venditori (es. Marco Rossi, Stefano Bianchi, Alessandro Neri, ecc.)
- **Vista Appuntamenti Personali & Rating**: Vedono esclusivamente la lista sopralluoghi ed i lead affidati a loro, con il badge **Media Stelline (valutazione clienti)** in evidenza.
- **Sincronizzazione Google Calendar Personale (OAuth 2.0)**:
  - Ciascun agente commerciale collega autonomamente il proprio account Google personale/aziendale cliccando su *"Collega Google Calendar"*.
  - Quando l'ufficio fissa o riassegna un appuntamento all'agente, l'evento viene creato o aggiornato istantaneamente sul calendario Google del venditore assegnato.
- **Indirizzi Satellitari Direct-Click**: Apertura diretta su Google Maps in **vista satellitare zoomata (`t=k`)** per analizzare tetti ed immobili di privati ed aziende.
- **Compilazione Scheda Sopralluogo & Preventivo**:
  - **Spunta Presenza Obbligatoria**: selezione esplicita `[✓] SÌ, SOPRALLUOGO FATTO` oppure `[✗] NO, NON EFFETTUATO`.
  - **Automazione Email Post-Sopralluogo**: Invio automatico mail di ringraziamento a nome dell'azienda con protezione anti-duplicazione.
  - **Dettagli Immobile & Preventivo**: Potenza kWp, Pompa di Calore, Casa Privata/Azienda, caricamento preventivo PDF e modalità di consegna.

---

## 2. Nuove Funzionalità Avanzate & Aggiornamenti Recenti

### 2.1 Integrazione Google Calendar OAuth 2.0 su Dominio di Produzione
- **Dominio Attivo**: `https://crm.solarbrandkg.it`
- **Autenticazione OAuth 2.0 Centralizzata**: L'applicazione server gestisce l'handshake OAuth2 con Google Cloud Platform.
- **Sicurezza Variabili d'Ambiente**: I parametri `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `GOOGLE_REDIRECT_URI` sono configurati direttamente nel pannello sicuro di Hostinger (senza esporre secret nel repository git).

### 2.2 Autenticazione Flessibile e Sincronizzazione Super Admin
- **Accesso Multi-Identificatore**: È possibile effettuare il login inserendo l'email completa (`erika@solarbrand.it`), lo username (`erika`) o il nome visualizzato (`Erika`).
- **Verifica e Auto-Migrazione Password**: Il sistema supporta l'algoritmo di hashing `scrypt` e gestisce l'auto-aggiornamento trasparente per la password di avvio `SolarBrand2026!`.
- **Garantito Profilo Super Admin**: `initDb()` verifica e assicura sempre l'esistenza dell'account amministratore Erika con privilegi `admin`.

### 2.3 Eliminazione Sfarfallio UI (Silent Background Polling)
- I controlli di background eseguiti ogni 30 secondi per verificare nuovi appuntamenti e notifiche non mostrano più spinner bloccanti (`isInitial = false`), garantendo una navigazione fluida e senza flickering.
- Ottimizzazione caricamento report con endpoint dedicato `GET /api/history`.

### 2.4 Feedback Visivo e Trasparenza Gestione Team / Credenziali
- **Conferma Password Visibile**: Quando l'amministratore imposta o reimposta la password di un utente, viene mostrato un banner verde di successo contenente la password salvata in chiaro (in evidenza con font monospaziato), eliminando ogni ambiguità sul salvataggio.
- **Toggle Visibilità Password**: Aggiunta icona ad occhio (`Eye` / `EyeOff`) per visualizzare o mascherare la password durante la digitazione.
- **Feedback Immediato Modifica Email e Ruolo**: Banner e badge animati per confermare istantaneamente l'avvenuto aggiornamento di email e ruolo senza ricaricare la pagina o mostrare alert invasivi.
- **Password Iniziale in Creazione Profilo**: Possibilità di impostare direttamente la password iniziale durante la creazione di un nuovo operatore.

---

## 3. Guida alla Configurazione di Google Calendar OAuth

Per replicare o riconfigurare l'integrazione Google Calendar:

1. **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)):
   - Creare un nuovo progetto (es. `SolarBrand Flow`).
   - Abilitare la **Google Calendar API**.
2. **Schermata Consenso OAuth**:
   - Tipo utente: **Esterno**.
   - Nome App: `SolarBrand Flow`.
   - Email assistenza e sviluppatore: email aziendale.
   - Ambiti (Scopes): aggiungere `https://www.googleapis.com/auth/calendar.events`.
   - Homepage e Privacy URL: `https://solarbrandkg.it`.
3. **Credenziali (OAuth Client ID)**:
   - Tipo applicazione: **Applicazione Web**.
   - URI di reindirizzamento autorizzati:
     - `https://crm.solarbrandkg.it/api/auth/google/callback`
     - `http://localhost:3000/api/auth/google/callback` (per sviluppo locale)
4. **Configurazione su Hostinger**:
   - Inserire nelle *Variabili d'ambiente* dell'applicazione:
     ```env
     GOOGLE_CLIENT_ID=549446315818-cuk21asmn7oii38n16dhlib94961q8hl.apps.googleusercontent.com
     GOOGLE_CLIENT_SECRET=GOCSPX-PJf...[Configurato in Hostinger]
     GOOGLE_REDIRECT_URI=https://crm.solarbrandkg.it/api/auth/google/callback
     ```
   - Riavviare l'applicazione Node.js.

---

## 4. Architettura Tecnologica & Database

### 4.1 Schema Database (18 Tabelle)
1. `leads`: Anagrafica lead/clienti con `address`, `colleagueId`, stato preventivo e note.
2. `colleagues`: Operatori ed agenti con ruolo (`telefonista` | `venditore` | `admin`), `email`, `passwordHash`, rating stelline e `googleTokens`.
3. `sessions`: Token di sessione crittografici (scadenza 30 giorni) verificati dal middleware API.
4. `appointments`: Appuntamenti fissati con distinzione `appointmentType` (`call` | `visit`) e agente assegnato.
5. `visit_reports`: Schede sopralluogo compilate dagli agenti.
6. `history`: Storico eventi, chiamate, note, preventivi e variazioni di stato.
7. `services`: Servizi aziendali offerti.
8. `tasks`: Task e promemoria interni collegati ai lead.
9. `smtp_accounts`: Credenziali SMTP aziendali condivise per l'invio email.
10. `imap_accounts`: Configurazione caselle IMAP per il monitoraggio automatico delle risposte lead.
11. `email_templates`: Template email con corpo HTML.
12. `sms_templates`: Modelli di testo per SMS.
13. `settings`: Configurazioni di sistema e flag (chiave → valore).
14. `reviews`: Recensioni dei clienti con token monouso univoco.
15. `lead_attachments`: Registro dei file caricati e collegati ai singoli lead.
16. `email_campaigns`: Campagne di email marketing massive.
17. `email_campaign_recipients`: Destinatari campagne con tracking aperture, click e risposte.
18. `oauth_states`: Gestione stati temporanei handshake OAuth Google.

---

## 5. Configurazione Produzione Hostinger (Attiva)

- **URL Pubblico**: `https://crm.solarbrandkg.it/`
- **Repository**: `PeraDev7/Solarbrand-gestionale` (Branch: `main`)
- **Framework**: Express (Node.js 22.x) + Vite React 19 Frontend
- **Database MySQL**: Hostinger MySQL (`u437201618_solarbrand` @ `localhost:3306`)
- **Variabili d'ambiente in produzione**:
  ```env
  DB_TYPE=mysql
  DB_HOST=localhost
  DB_PORT=3306
  DB_NAME=u437201618_solarbrand
  DB_USER=u437201618_solarbrand
  DB_PASS=123Noscusa!1234
  DEMO_MODE=false
  PORT=3000
  GOOGLE_CLIENT_ID=549446315818-cuk21asmn7oii38n16dhlib94961q8hl.apps.googleusercontent.com
  GOOGLE_CLIENT_SECRET=GOCSPX-PJf...[Configurato in Hostinger]
  GOOGLE_REDIRECT_URI=https://crm.solarbrandkg.it/api/auth/google/callback
  ```
- **CI/CD**: Build automatica ed esecuzione ad ogni aggiornamento su branch `main`.
