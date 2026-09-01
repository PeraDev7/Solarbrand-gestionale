# Documentazione Ufficiale e Guida Completa — Solarbrand Flow (Gestionale Lead)

> **Stato del Progetto**: 🟢 **ONLINE E ATTIVO IN PRODUZIONE SU HOSTINGER**  
> **URL Produzione**: [https://crm.solarbrandkg.it/](https://crm.solarbrandkg.it/)  
> **Repository GitHub (CI/CD)**: [https://github.com/PeraDev7/Solarbrand-gestionale](https://github.com/PeraDev7/Solarbrand-gestionale) (branch `main`)  
> **Versione**: 3.9 (Doppia Assegnazione Lead Telefonisti Multipli/Agente Singolo + Fix Critico Credenziali Erika)  
> **Architettura**: Vite + React 19 + TypeScript + Express + MariaDB / MySQL 8 (`mysql2/promise`) / SQLite locale (`better-sqlite3`)

---

## 1. Panoramica del Progetto & Flusso Operativo Real-World

**Solarbrand Flow** è un software gestionale web studiato specificamente per le aziende che vendono e installano **impianti fotovoltaici, pompe di calore e Comunità Energetiche (CER)**. 

L'applicazione supporta il flusso operativo aziendale completo con due portali distinti:

### 1.1 Portale Ufficio / Call Center (Super Admin & Telefonisti)
- **Qualifica e Chiamate**: Presenta i prodotti al telefono e qualifica i contatti.
- **Doppia Assegnazione Indipendente Lead (Novità v3.9)**:
  - **Telefonisti Assegnati (Multipli)**: L'amministratore può assegnare ogni lead a uno o più operatori/telefonisti tramite comodi selettori multi-checkbox (badge viola).
  - **Agente Commerciale (Singolo)**: Assegnazione dedicata a un solo venditore tramite menu a tendina (badge ambra).
  - **Regole di Visibilità Telefonisti**: Un telefonista visualizza i lead a lui affidati nominalmente (`assignedTelefonisti`) **oppure** tutti i lead che richiedono uno dei **Servizi** a lui assegnati nella gestione collaboratori (`services`).
- **Filtri Avanzati Toolbar**:
  - Menu a tendina separati: `Telefonista (Tutti)` / `⚠️ Senza Telefonista` / Singoli operatori.
  - Menu a tendina: `Agente (Tutti)` / `⚠️ Senza Agente` / Singoli commerciali.
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

## 2. Funzionalità Avanzate & Aggiornamenti Recenti (v3.9)

### 2.1 Doppia Assegnazione Lead (Telefonisti Multipli + Agente Singolo)
- **Nuovo campo DB `assignedTelefonisti` (JSON Array)**: Memorizza l'elenco dei telefonisti assegnati. `assignedColleague` mantiene l'agente commerciale venditore.
- **Migrazione Automatica Idempotente (`migrateAssignments()`)**: All'avvio del server, i lead esistenti che avevano un telefonista in `assignedColleague` sono stati migrati automaticamente nel nuovo array JSON, preservando i venditori.
- **Interfaccia `LeadModal.tsx` Rinnovata**:
  - Sezione Telefonisti (viola) con toggle-button multi-selezione.
  - Sezione Agente Commerciale (ambra) con selettore singolo dedicato.
- **Filtri Separati & Badge Colorati**: Due dropdown indipendenti nella toolbar di ricerca e badge distintivi 📞 e 💼 nella vista tabella e nella scheda dettaglio.

### 2.2 Risoluzione Bug Critico Credenziali Erika & Aggiornamento Login Admin
- **Causa del problema**: Nel backfill iniziale di `database.ts`, a ogni riavvio del server veniva forzato `email = 'erika@solarbrand.it'`, sovrascrivendo qualsiasi modifica manuale effettuata dall'amministratore.
- **Fix Implementato**: Rimosso il ripristino forzato. Il server preserva rigorosamente email e password personalizzate.
- **Nuove Credenziali di Produzione**:
  - **Email**: `eroikaphoto@gmail.com`
  - **Password**: `Eroika0987`
  - **Test Live**: Verificato con esito positivo direttamente su `https://crm.solarbrandkg.it/api/auth/login`.

### 2.3 Connettore IMAP Universale & Risoluzione `Command failed`
- **Scansione Compatibile con Hostinger**: Sostituito l'uso di `client.search({ since })` con UID con `client.fetch('1:*')` filtrato per data in JavaScript. Questo garantisce compatibilità al 100% con qualsiasi server IMAP (inclusi Hostinger, cPanel e Gmail).
- **Inbox Scanner Automatico**: Cattura sia le risposte alle campagne (`In-Reply-To`) sia le email spontanee inviate dai clienti censiti, allegandole allo storico del lead con protezione anti-duplicati (`[MSGID:...]` nascosto da UI).

### 2.4 Protezione Globale Anti-Autofill del Browser
- **Barra di Ricerca Lead**: Aggiunto `autoComplete="off"` e identificatore univoco `name="lead-search-query"` per impedire al browser di iniettare credenziali di login (es. `erika@solarbrand.it`) nel campo di ricerca.
- **Campo Token Apify**: Protetto con `autoComplete="off"` per evitare che i gestori password sovrascrivano il token API con le password salvate del CRM.

### 2.5 Lead Generation Google Maps (Apify Scraper) & Precisione Territoriale
- **Token API Organizzazione**: Integrazione diretta con Organization API Token (`Iride Suite Organization`).
- **Verifica Territoriale Reale**: Lo scraper estrae indirizzo completo, CAP e prefisso telefonico (es. `045` per Verona centro/lago e `0442` per Legnago/Bassa Veronese).
- **Arricchimento Contatti e Anti-Duplicati**: Navigazione automatizzata dei siti web aziendali per estrarre sia email che telefono validati.

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
9. `smtp_accounts`: Credenziali SMTP aziendali condivise (`smtp.hostinger.com:587` o server dedicati).
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
