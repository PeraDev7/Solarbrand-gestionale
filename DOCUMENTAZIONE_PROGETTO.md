# Documentazione Ufficiale e Guida Completa — SolarBrand Gestionale Lead

> **Stato del Progetto**: 🟢 **ONLINE E ATTIVO IN PRODUZIONE SU HOSTINGER**  
> **URL Produzione**: [https://maroon-giraffe-522842.hostingersite.com/](https://maroon-giraffe-522842.hostingersite.com/)  
> **Repository GitHub (CI/CD)**: [https://github.com/PeraDev7/Solarbrand-gestionale](https://github.com/PeraDev7/Solarbrand-gestionale) (branch `main`)  
> **Versione**: 3.5 (Architettura Dual-Engine: SQLite Locale Zero-Config + MySQL Produzione Hostinger + Google Maps Scraper Apify + Auth Sicura + Google Calendar Per-Agente)  
> **Architettura**: Vite + React 19 + TypeScript + Express + MySQL 8 (`mysql2/promise`) / SQLite locale (`better-sqlite3`)

---

## 1. Panoramica del Progetto & Flusso Operativo Real-World

**SolarBrand Gestionale Lead** è un software gestionale web studiato specificamente per le aziende che vendono e installano **impianti fotovoltaici, pompe di calore e Comunità Energetiche (CER)**. 

L'applicazione supporta il flusso operativo aziendale completo con due portali distinti:

### 1.1 Portale Ufficio / Call Center (es. Erika, Laura, Luciana)
- **Qualifica e Chiamate**: Presenta i prodotti al telefono e qualifica i contatti.
- **Assegnazione Sopralluoghi & Richiami**: Fissa due tipologie distinte di appuntamento:
  - 📞 **Richiamo Telefonico Ufficio**: per ricontattare internamente il lead via telefono.
  - 🏠 **Sopralluogo Fisico Agente**: affida l'appuntamento sul campo ad uno specifico agente commerciale (es. *Fabio Test*, *Marco Rossi*, *Alessandro Neri*).
- **Filtri Visibilità Telefonisti**: Di default ciascuna telefonista vede le proprie attività fissate, con un pulsante toggle rapido **`Solo Miei (Erika)` / `Vedi Tutti i Telefonisti`** per passare alla visione globale.
- **Gestione Template Email & SMS di Sistema**: Gestisce i template email e SMS aziendali, inclusi i 2 template automatici di sistema (*Ringraziamento Post-Sopralluogo* e *Richiesta Recensione Stelline*).
- **Monitoraggio Esiti, Preventivi & Stelline Agenti**: Vede nello storico del cliente i report dei venditori, i preventivi allegati (WhatsApp, Cartaceo, Email) e la media valutazioni a stelline ricevuta dagli agenti.
- **Esportazione Report Attività (Excel & PDF Professionale)**: Genera report avanzati per presentazioni aziendali.

### 1.2 Portale Agenti Commerciali / Venditori (es. Fabio Test, Marco Rossi, Stefano Bianchi, ecc.)
- **Vista Appuntamenti Personali & Rating**: Vedono la lista sopralluoghi assegnati ed il proprio badge con la **Media Stelline (valutazione clienti)** in cima al portale.
- **Sincronizzazione Google Calendar Personale**: Ciascun agente collega autonomamente il **PROPRIO account Google Calendar personale** tramite OAuth2 (bottone "Collega Google Calendar" nel proprio portale). Quando una telefonista fissa/riassegna un appuntamento a quell'agente, l'evento viene creato/aggiornato automaticamente sul SUO calendario Google — indipendentemente da quale account Google usi la telefonista che lo ha fissato. Richiede che sul server siano configurate le variabili `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` (vedi §3.4).
- **Indirizzi Satellitari Direct-Click**: Apertura diretta su Google Maps in **vista satellitare zoomata (`t=k`)** per analizzare tetti ed immobili di privati ed aziende.
- **Compilazione Scheda Sopralluogo & Preventivo**:
  - **Spunta Presenza Obbligatoria (Default Deselezionato)**: l'agente deve selezionare esplicitamente `[✓] SÌ, SOPRALLUOGO FATTO` oppure `[✗] NO, NON EFFETTUATO`.
  - **Automazione Email Post-Sopralluogo**: Al click su *Sopralluogo Fatto*, viene inviata una mail automatica di ringraziamento a nome dell'azienda (con blocco di sicurezza anti-duplicazione).
  - **Dettagli Immobile & Preventivo**: Potenza kWp, Pompa di Calore, Casa Privata/Azienda, carica PDF del preventivo e registra la modalità di consegna (WhatsApp, Cartaceo, Email).

---

## 2. Nuove Funzionalità Avanzate & Migliorie Recenti

### 2.1 Architettura Dual-Engine Universale (v3.0)
- **Zero-Config Locale**: Facendo doppio click su `AVVIA_APP_LOCALE.bat`, l'applicazione si avvia all'istante su Windows senza richiedere l'installazione di MySQL locale, operando su SQLite (`data/app.db`) con tutti i 57 lead reali.
- **Supporto MySQL Nativo per Hostinger**: Quando l'app rileva le variabili d'ambiente di MySQL (`DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`), passa in modalità MySQL ad alte prestazioni con connection pool asincrono (`connectionLimit: 10`).
- **File di Dump Completo `dump_mysql_solarbrand.sql`**: Generato per l'importazione **1-Click** su **phpMyAdmin di Hostinger**. Contiene tutte le 18 tabelle e tutti i dati storici:
  - 57 Lead completi (telefoni, note, indirizzi, stati, preventivi).
  - 11 Colleghi (operatori, venditori, credenziali admin).
  - 26 Appuntamenti e sopralluoghi.
  - 11 Report di visita completi con kWp ed esiti.
  - Template Email, Template SMS, Account SMTP e Servizi aziendali.
- **Script di Migrazione Automatica `migrate-sqlite-to-mysql.mjs`**: Disponibile per chi preferisce la migrazione da riga di comando.

### 2.2 Export Report Attività in PDF Professionale (Impaginato & Grafico)
- **Design Professionale per Presentazioni**: Impaginazione vettoriale ad alto impatto grafico con copertina brandizzata SolarBrand, header e footer con numerazione dinamica `Pag. X di N`.
- **Riepiloghi KPI e Statistiche**:
  - **4 KPI Cards in Evidenza**: Totale Attività, Contatti Lavorati, Appuntamenti, Tasso Conversione.
  - **Tabella Riepilogo per Operatore**: Conteggio dettagliato di chiamate, appuntamenti, email, note e lead unici per operatore.
  - **Tabella Riepilogo per Servizio/Prodotto**: Analisi di conversione suddivisa per tipo impianto (es. Fotovoltaico 10kW, Pompa di Calore).
- **Dettaglio Attività e Wrap Multilinea**:
  - Colonna *Note / Esito* con wrapping multilinea completo (`rowPageBreak: 'avoid'`).
  - **Sanificazione Caratteri Unicode/Emoji**: Conversione automatica delle emoji e dei simboli 4-byte (`📄` -> `[DOC]`, `📱` -> `[WA]`, `📧` -> `[EMAIL]`, `🏆` -> `[WIN]`) per font standard.

### 2.3 Indirizzi Cliccabili su Google Maps (Vista Satellitare Diretta)
- **Campo `address` Integrato**: Presente nelle schede dei lead, nella lista appuntamenti e nelle schede visita degli agenti.
- **Modalità Satellitare Auto-Zoom (`t=k`)**: Cliccando sull'indirizzo viene aperta una nuova pagina di Google Maps centrata e zoomata sulla foto aerea del tetto dell'immobile.
- **Importazione Automatica**: Riconosciuto da file Excel/CSV e Google Maps Scraper (Apify con arricchimento contatti ed email).

### 2.4 Gestione Allegati Documenti per Lead / Clienti
- **Tab `📎 Allegati` nella Scheda Lead**: Sia gli Agenti che i Telefonisti possono allegare documenti (bollette, visure camerali, contratti fino a 50MB per file).
- **Storage su File System**: I file vengono memorizzati nella cartella `data/uploads/<leadId>/` e i metadati registrati nella tabella `lead_attachments`.

### 2.5 Template Email Automatici & Valutazione Stelline Agente
- **Template di Sistema Protetti**:
  - `post_visit`: Inviata automaticamente dopo il primo sopralluogo effettuato.
  - `review_request`: Inviata automaticamente al lead quando lo stato viene cambiato in `"Chiuso con successo"`.
- **Pagina Pubblica Recensione (`/recensione?token=...`)**:
  - Valutazione da 1 a 5 stelle con commento. Ricalcolo automatico di `avgRating` e `reviewCount` per l'agente.

### 2.6 Lead Generation Territoriale B2B con Google Maps Scraper (Apify)
- **Sostituzione Apollo/Clay con Google Maps Scraper**: Rimozione totale dei webhook Clay e dell'API Apollo a favore del crawler Google Maps su Apify (`compass~crawler-google-places`).
- **Filtro Qualità Rigoroso 100%**: Vengono ammessi e salvati nel CRM **esclusivamente i contatti con SIA Email SIA Telefono validi** ed estratti da fonti affidabili o dal sito web aziendale.
- **Arricchimento Referenti Aziendali**: Estrazione di nominativi chiave (CEO, Direttori, Titolari), ruoli, numeri diretti e profili aziendali.
- **Flusso Asincrono & Logica Multi-Round**:
  - Polling a intervalli di 3s con feedback in tempo reale (tempo trascorso, messaggi di avanzamento, conteggio lead trovati).
  - Meccanismo di auto-espansione: se il numero di contatti con email e telefono è inferiore al target richiesto, il batch size viene automaticamente raddoppiato fino a 2 round aggiuntivi.
- **Normalizzazione & Deduplicazione**: Formattazione numeri in standard E.164 (`+39...`) e scarto automatico dei contatti già presenti nel CRM per email o telefono.
- **Lancio Rapido Newsletter**: Schermata di successo con collegamento diretto alla creazione guidata di campagne email per i lead appena estratti.

---

## 3. Architettura Tecnologica & Infrastruttura

### 3.1 Schema Database (18 Tabelle)
1. `leads`: Anagrafica lead/clienti con campo `address`, stato preventivo e note.
2. `colleagues`: Operatori ed agenti con colonna `role` (`telefonista` | `venditore` | `admin`), `email` + `passwordHash`, rating stelline e `googleTokens`.
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

### 3.2 Login Reale per Telefonista/Agente, Ruolo Admin & Modalità Demo
- **Autenticazione**: Email + password (hash sicuro `scrypt`). Ogni chiamata API richiede il Bearer Token di sessione.
- **`DEMO_MODE` (variabile `.env`)**:
  - `true`: Mostra l'accesso rapido 1-click nella schermata di login (ideale per test locali).
  - `false` (Produzione): Disattiva completamente l'accesso rapido; telefonisti e agenti devono inserire le proprie credenziali personali.
- **Ruolo Admin**: Riservato ai profili con `role = 'admin'` (es. Erika). Permette di gestire il team, aggiungere/eliminare operatori e reimpostare password.

### 3.3 Avvio Locale & Sviluppo
- Fare doppio click su **`AVVIA_APP_LOCALE.bat`** (nella cartella radice) o su `start-app.bat`.
- L'app sincronizza i file, avvia il server locale con SQLite e apre automaticamente il browser all'indirizzo `http://localhost:3000`.

### 3.4 Configurazione Google Calendar (per-agente)
1. In [Google Cloud Console](https://console.cloud.google.com/) abilitare la **Google Calendar API**.
2. Creare un **OAuth Client ID** (tipo Applicazione Web).
3. Aggiungere come Redirect URI: `https://tuodominio.it/api/auth/google/callback`.
4. Inserire `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` nelle variabili d'ambiente.
5. Ciascun agente autorizza il proprio account con un click su "Collega Google Calendar".

---

## 4. Configurazione Produzione Hostinger (Attiva)

L'applicazione è distribuita tramite la funzione **"Implementa app web"** di Hostinger collegata direttamente al repository GitHub:

- **URL Pubblico**: `https://maroon-giraffe-522842.hostingersite.com/`
- **Repository**: `PeraDev7/Solarbrand-gestionale` (Branch: `main`)
- **Framework**: Express (Node.js 22.x)
- **File di ingresso**: `server.js` (con dynamic import su `dist/server.cjs`)
- **Database MySQL**: Hostinger MySQL (`u437201618_solarbrand` @ `localhost:3306`)
- **Variabili d'ambiente configurate in produzione**:
  ```env
  DB_TYPE=mysql
  DB_HOST=localhost
  DB_PORT=3306
  DB_NAME=u437201618_solarbrand
  DB_USER=u437201618_solarbrand
  DB_PASS=123Noscusa!1234
  DEMO_MODE=false
  PORT=3000
  ```
- **Flusso CI/CD**: Ogni `git push origin main` attiva automaticamente la build (`npm run build`) e il riavvio del container su Hostinger.

---
*Documentazione aggiornata ufficialmente alla versione 3.5 (Produzione Live su Hostinger + CI/CD GitHub).*
