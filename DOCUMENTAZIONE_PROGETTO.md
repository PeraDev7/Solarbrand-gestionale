# Documentazione Ufficiale e Guida Completa — Solarbrand Flow (Gestionale Lead)

> **Stato del Progetto**: 🟢 **ONLINE E ATTIVO IN PRODUZIONE SU HOSTINGER**  
> **URL Produzione**: [https://crm.solarbrandkg.it/](https://crm.solarbrandkg.it/)  
> **Repository GitHub (CI/CD)**: [https://github.com/PeraDev7/Solarbrand-gestionale](https://github.com/PeraDev7/Solarbrand-gestionale) (branch `main`)  
> **Versione**: 3.7 (Tracking Email End-to-End + Inbox Scanner IMAP Automatico + Compatibilità MariaDB Key + Dual-Engine)  
> **Architettura**: Vite + React 19 + TypeScript + Express + MariaDB / MySQL 8 (`mysql2/promise`) / SQLite locale (`better-sqlite3`)

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
- **Campagne Email Marketing & Tracking Completo**:
  - Creazione ed invio massivo email tramite account SMTP aziendale (`info@solarbrandkg.it`).
  - **Pixel Tracking 1x1 Invisibile**: traccia l'esatto momento dell'apertura email.
  - **Click Tracking con Redirect 302**: riscrive i link nelle email e traccia l'interazione del lead.
  - **Inbox Scanner & Monitoraggio Risposte IMAP**: intercetta sia le risposte alle campagne sia le email spontanee inviate dai clienti registrati.
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

## 2. Funzionalità Avanzate & Aggiornamenti Recenti (v3.7)

### 2.1 Tracking Email End-to-End & Monitoraggio Campagne
- **Verificato e Attivo Live**: Il sistema di tracking (`/api/email-track/open` e `/api/email-track/click`) è collaudato con successo sul dominio `https://crm.solarbrandkg.it`.
- **Pixel di Tracciamento**: GIF trasparente 1x1 iniettata automaticamente nel body delle email con timestamp preciso di apertura.
- **Riscrizione Link Click-Tracking**: Ogni link contenuto nei template viene convertito in URL tracciato che registra il click e redireziona istantaneamente all'URL di destinazione.

### 2.2 Inbox Scanner IMAP & Riconoscimento Automatico Risposte
- **Scanner Intelligente per Mittente**: Ad ogni ciclo di polling (ogni 10 minuti o manuale tramite pulsante *"Controlla ora"*), il server analizza la casella IMAP (`imap.hostinger.com:993`).
- **Doppio Canale di Riconoscimento**:
  1. **Risposte Campagne (`In-Reply-To`)**: aggiorna i contatori della campagna e segna il lead come *Ha risposto*.
  2. **Email Spontanee da Lead Anagrafica**: se un lead già censito nel gestionale invia un'email di sua iniziativa o risponde a una mail manuale, il messaggio viene automaticamente allegato alla sua scheda storica con etichetta `📩 [EMAIL RICEVUTA]`.
- **Estrazione Testo Pulito & Multipart**: Estrazione avanzata del corpo plain-text anche da email multipart/HTML, eliminando quote e firme automatiche.
- **Deduplicazione Sicura `[MSGID:...]`**: Ogni email memorizza internamente il Message-ID per evitare duplicazioni nei controlli successivi. Il tag tecnico viene mascherato nell'interfaccia utente per mantenere le note pulite.

### 2.3 Compatibilità SQL MariaDB (Keyword Escaping)
- **Risoluzione Parola Riservata `` `key` ``**: Tutte le query che interagiscono con la tabella `settings` utilizzano i backtick di protezione per la colonna `` `key` ``, garantendo la compatibilità totale con i vincoli sintattici di MariaDB su Hostinger.

### 2.4 Lead Generation B2B con Google Maps (Apify Scraper)
- **Token API Organizzazione**: Integrazione centralizzata con token organizzazione Apify con toggle occhio per visualizzazione sicura.
- **Target Count Garantito (Multi-Round Auto-Espansione)**: Garanzia di estrazione dell'esatto numero di contatti completi (SIA email SIA telefono validi) con buffer di campionamento 3.5x-4x.

---

## 3. Schema Database (18 Tabelle)

1. `leads`: Anagrafica lead/clienti con `address`, `colleagueId`, stato preventivo e note.
2. `colleagues`: Operatori ed agenti con ruolo (`telefonista` | `venditore` | `admin`), `email`, `passwordHash`, rating stelline e `googleTokens`.
3. `sessions`: Token di sessione crittografici (scadenza 30 giorni) verificati dal middleware API.
4. `appointments`: Appuntamenti fissati con distinzione `appointmentType` (`call` | `visit`) e agente assegnato.
5. `visit_reports`: Schede sopralluogo compilate dagli agenti.
6. `history`: Storico eventi, chiamate, note, preventivi, aperture/click email e messaggi ricevuti.
7. `services`: Servizi aziendali offerti.
8. `tasks`: Task e promemoria interni collegati ai lead.
9. `smtp_accounts`: Credenziali SMTP aziendali condivise (`smtp.hostinger.com:587`).
10. `imap_accounts`: Configurazione caselle IMAP per monitoraggio risposte e inbox scanner (`imap.hostinger.com:993`).
11. `email_templates`: Template email con segnaposto dinamici (`{nome}`, `{azienda}`, ecc.).
12. `sms_templates`: Modelli di testo per SMS.
13. `settings`: Configurazioni di sistema e flag (chiave → valore con colonna protetta `` `key` ``).
14. `reviews`: Recensioni dei clienti con token monouso univoco.
15. `lead_attachments`: Registro dei file caricati e collegati ai singoli lead.
16. `email_campaigns`: Campagne di email marketing massive con contatori (inviati, aperti, cliccati, risposte).
17. `email_campaign_recipients`: Destinatari campagne con tracking aperture, click e risposte.
18. `oauth_states`: Gestione stati temporanei handshake OAuth Google.

---

## 4. Configurazione Produzione Hostinger (Attiva)

- **URL Pubblico**: `https://crm.solarbrandkg.it/`
- **Repository**: `PeraDev7/Solarbrand-gestionale` (Branch: `main`)
- **Framework**: Express (Node.js 22.x) + Vite React 19 Frontend
- **Database**: Hostinger MariaDB/MySQL (`u437201618_solarbrand` @ `localhost:3306`)
- **Variabili d'ambiente configurate**:
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
