# Documentazione Ufficiale e Guida Completa — Solarbrand Flow (Gestionale Lead)

> **Stato del Progetto**: 🟢 **ONLINE E ATTIVO IN PRODUZIONE SU HOSTINGER**  
> **URL Produzione**: [https://crm.solarbrandkg.it/](https://crm.solarbrandkg.it/)  
> **Repository GitHub (CI/CD)**: [https://github.com/PeraDev7/Solarbrand-gestionale](https://github.com/PeraDev7/Solarbrand-gestionale) (branch `main`)  
> **Versione**: 4.13 (Sistema Unsubscribe GDPR One-Click conforme RFC 8058, separazione email dirette 1-to-1 da campagne massive, blocco automatico e badge lead)  
> **Architettura**: Vite + React 19 + TypeScript + Express + MariaDB / MySQL 8 (`mysql2/promise`) / SQLite locale (`better-sqlite3`)

---

## 1. Panoramica del Progetto & Flusso Operativo Real-World

**Solarbrand Flow** è un software gestionale web studiato specificamente per le aziende che vendono e installano **impianti fotovoltaici, pompe di calore e Comunità Energetiche (CER)**. 

L'applicazione supporta il flusso operativo aziendale completo con tre livelli di profilo:

### 1.1 Portale Super Admin (es. Erika — `eroikaphoto@gmail.com`)
- **Gestione Completa Database Lead**: Creazione manuale nuovi lead, importazione massiva da Excel/CSV, riassegnazione a telefonisti e agenti commerciali. Cancellazione sicura a cascata (rimuove istantaneamente appuntamenti, schede visita, task, storico e allegati associati al lead).
- **Tipologie Trattate dall'Azienda (ex Servizi)**: Configurazione e gestione delle tipologie di intervento (es. *Fotovoltaico Residenziale*, *Agricolo*, *Edile*, *Pompa di Calore*, *Comunità Energetica*).
- **Gestione Team & Collaboratori**: Creazione account, assegnazione ruoli (`admin`, `telefonista`, `venditore`), assegnazione tipologie gestite e **reset password istantaneo 1-click** (senza fastidiosi prompt o doppi controlli password).
- **Monitoraggio Recensioni e Valutazioni Clienti**: Tab dedicata *"Recensioni"* per consultare i voti a 5 stelle, i commenti lasciati dai clienti e le medie aggregate per ciascun venditore.
- **Campagne Email Marketing & Tracking**: Creazione ed invio di campagne email massive tramite account SMTP aziendale (`info@solarbrandkg.it`), monitoraggio aperture pixel 1x1, click 302 e risposte automatiche via IMAP.
- **Template Email & SMS Aziendali**: Creazione, modifica e gestione dei modelli di testo per comunicazioni rapide e automatiche.
- **Configurazioni Server**: Gestione account SMTP e caselle IMAP con Inbox Scanner.

### 1.2 Portale Ufficio / Call Center (Telefonisti — es. Laura, Luciana)
- **Visualizzazione Filtrata**: Visualizzano esclusivamente i lead assegnati direttamente a loro (`assignedTelefonisti`) **oppure** i lead con una delle **Tipologie** loro assegnate.
- **Qualifica e Chiamate**: Lavorano i lead, aggiornano lo stato, aggiungono note di chiamata e fissano appuntamenti.
- **Invio Email da Scheda Lead**: Possono inviare email singole direttamente dalla scheda del cliente, selezionando tra i template predefiniti creati dall'admin.
- **Assegnazione Riservata Solo ad Agenti Commerciali**: Possono assegnare il lead o il sopralluogo esclusivamente ad un **Agente Commerciale (venditore)**. Non possono assegnare né modificare i telefonisti assegnati al lead (privilegio riservato esclusivamente agli amministratori sia da interfaccia che da backend).
- **Isolamento Calendario Appuntamenti**: Nel Calendario Appuntamenti visualizzano **esclusivamente i propri appuntamenti fissati**. Non possono vedere gli appuntamenti degli altri telefonisti (filtraggio blindato lato frontend e forzato a livello server API `/api/appointments`), con badge fisso "I Miei Appuntamenti".
- **Restrizioni di Sicurezza**: NON possono importare file Excel/CSV, NON possono creare/modificare template, NON inviano SMS e NON hanno accesso a campagne o impostazioni server.

### 1.3 Portale Agenti Commerciali / Venditori (es. Marco Rossi, Stefano Bianchi, Alessandro Neri, Fabio Test, ecc.)
- **Vista Appuntamenti Personali & Rating**: Vedono esclusivamente la lista sopralluoghi ed i lead affidati a loro, con il badge **Media Stelline (valutazione clienti)** in evidenza. Gli appuntamenti di lead cancellati vengono rimossi automaticamente in tempo reale.
- **Sincronizzazione Google Calendar Personale (OAuth 2.0)**:
  - Ciascun agente commerciale collega autonomamente il proprio account Google personale/aziendale cliccando su *"Collega Google Calendar"*.
  - Quando l'ufficio fissa o riassegna un appuntamento all'agente, l'evento viene creato o aggiornato istantaneamente sul calendario Google del venditore assegnato.
- **Indirizzi Satellitari Direct-Click**: Apertura diretta su Google Maps in **vista satellitare zoomata (`t=k`)** per analizzare tetti ed immobili di privati ed aziende.
- **Compilazione Scheda Sopralluogo & Preventivo**:
  - **Spunta Presenza Obbligatoria**: selezione esplicita `[✓] SÌ, SOPRALLUOGO FATTO` oppure `[✗] NO, NON EFFETTUATO`.
  - **Automazione Email Post-Sopralluogo**: Invio automatico mail di ringraziamento a nome dell'azienda con protezione anti-duplicazione.
  - **Dettagli Immobile & Preventivo**: Potenza kWp, Pompa di Calore, Casa Privata/Azienda, caricamento preventivo PDF e modalità di consegna.

---

## 2. Funzionalità Avanzate & Aggiornamenti Recenti (v4.3)

### 2.1 Sistema Stelline & Recensioni Agenti (Verificato Live End-to-End)
- **Flusso Automatico su Chiusura Contratto**:
  - Quando un lead viene impostato sullo stato **`Chiuso con successo`** (e ha un indirizzo email), il backend genera in modo trasparente un record univoco con token crittografico nella tabella `reviews`.
  - **Persistenza Dati Cliente**: Nome ed email del cliente vengono archiviati direttamente nella riga della recensione (`leadName`, `leadEmail`). **Se il lead viene in seguito cancellato dal CRM, la recensione RESTA intatta** con il nome e l'email del cliente leggibili, senza mai mostrare codici ID o perdere le valutazioni.
  - Viene spedita in tempo reale una mail tramite SMTP usando il template `review_request` contenente il link personalizzato `https://crm.solarbrandkg.it/recensione?token=UUID`.
- **Interfaccia Web Recensioni Pubblica (`/recensione?token=...`)**:
  - Interfaccia dedicata, mobile-first, con sistema di valutazione a 5 stelle grafiche (hover e selezione animati con rating: *Scarso*, *Sufficiente*, *Buono*, *Molto Buono*, *Eccellente!*).
  - Box commento facoltativo per feedback qualitativo.
  - **Protezione Anti-Abuso Monouso**: Una volta completata la valutazione, il token viene marcato con data/ora (`usedAt`) e successivi accessi mostrano una pagina di ringraziamento, impedendo voti multipli.
- **Ricalcolo Automatico Medie Venditori**:
  - Al click di invio (`POST /api/reviews/submit`), il server esegue la media ponderata `AVG(rating)` e il conteggio `COUNT(*)` per l'agente commerciale assegnato e aggiorna istantaneamente i campi `avgRating` e `reviewCount` nella tabella `colleagues`.
  - La media aggiornata compare subito nel badge stelline del portale agente e in tutta la piattaforma.
- **Nuovo Tab "Recensioni" nell'Area Super Admin (`SuperAdminArea.tsx`) per TUTTI gli Admin**:
  - Accessibile a **qualsiasi utente con ruolo `admin`** (Erika, Fabio Slemer o qualsiasi amministratore futuro), non ristretto a un singolo account.
  - Navigazione a schede (`Team & Tipologie` / `Recensioni [N]`).
  - Scorecard grafiche in testata con media decimale, stelline dorate e totale recensioni per ciascun venditore.
  - Elenco analitico di tutte le recensioni con cliente, email, agente assegnato, voto, commento esteso, data di invio e data di compilazione (oppure badge *"In attesa di risposta"*).
  - **Eliminazione Singola Recensione con Cestino**: Ciascun admin può eliminare una recensione specifica (con ricalcolo automatico immediato delle medie dell'agente).
  - **Pulsante "Azzera Recensioni Test"**: Per ripulire in blocco tutte le recensioni di prova e resettare le statistiche a zero.
- **Nuovi Endpoint API Protetti**:
  - `GET /api/admin/reviews`: lista completa delle recensioni con fallback e join.
  - `DELETE /api/admin/reviews/:id`: cancellazione singola recensione con ricalcolo statistiche agente.
  - `DELETE /api/admin/reviews`: svuotamento totale recensioni e reset medie agenti.
  - Metodi client dedicati `api.getAdminReviews()`, `api.deleteAdminReview(id)` e `api.clearAllReviews()` in `src/lib/api.ts`.

### 2.2 Cancellazione a Cascata & Pulizia Automatica Record Orfani
- **Problema individuato**: Quando l'amministratore cancellava un lead dalla tabella `leads`, gli appuntamenti precedentemente fissati per quel cliente rimanevano orfani nella tabella `appointments` (e nelle schede visita / task), continuando ad apparire nella dashboard dell'agente assegnato.
- **Soluzione applicata**:
  - **DELETE a cascata in `server.ts`**: All'eliminazione di un lead, vengono automaticamente rimossi tutti i record collegati (`appointments`, `visit_reports`, `tasks`, `history`, `lead_attachments`, `email_campaign_recipients`), **mantenendo invece le recensioni e le valutazioni dei clienti** per preservare la reputazione storica degli agenti.
  - **Funzione `cleanupOrphanRecords()` all'avvio**: All'avvio del server viene eseguita una query di bonifica che elimina retroattivamente tutti i record orfani già presenti nel database.
  - **JOIN filtrata negli endpoint**: `GET /api/appointments` e `GET /api/visit-reports` utilizzano `INNER JOIN leads` per garantire al 100% che nessun appuntamento orfano possa mai essere inviato agli agenti.

### 2.3 Reset Password Istantaneo Admin (Senza Doppio Check)
- Quando un amministratore imposta una password per un collega in `SuperAdminArea.tsx`, l'operazione è istantanea con 1 solo click.
- Viene inviata la password desiderata direttamente ad un endpoint sicuro che la hasha e la salva, senza richiedere conferme ripetute.
- La password appena salvata viene mostrata a video all'amministratore con un pulsante rapido per copiarla o renderla visibile con l'icona dell'occhio.

### 2.4 Selezione Intere Tipologie per Campagne Email & Assegnazione Automatica all'Importazione (v4.4)
- **Selezione Rapida Intere Tipologie nelle Campagne Marketing (`EmailCampaignManager.tsx`)**:
  - Superata la selezione manuale riga per riga: caricamento dinamico di tutte le tipologie aziendali (`/api/services`).
  - **Pill/Badge Interattivi a 1-Click**: Ciascuna tipologia dispone di un pulsante rapido che mostra il numero esatto di lead con email disponibili per quel servizio (es. *Fotovoltaico Residenziale (24)*, *Comunità Energetica (11)*). Con un solo click è possibile selezionare o deselezionare in blocco tutti i destinatari appartenenti a quell'intera tipologia (`lead.services?.includes(tip) || lead.service === tip`).
  - **Filtro Tipologia Avanzato**: Menu a tendina dedicato per filtrare la tabella contatti per tipologia specifica, combinabile con la barra di ricerca testuale per nome/azienda/email.
  - **Azioni Cumulative Rapide**: Pulsanti per `+ Aggiungi filtrati (N)`, `- Togli filtrati` e `Azzera` selezione.
  - **Badge Grafico Tipologia**: Ogni scheda lead nella lista destinatari mostra un badge visivo colorato indicante le tipologie di interesse del cliente.
- **Assegnazione Automatica Multi-Ruolo & Tipologia all'Importazione Lead (`ImportLeadsModal.tsx`)**:
  - **Importazione Excel / CSV (`FileImportTab`)**:
    - Sezione predefinita con 3 selettori dedicati per le righe prive di colonne specifiche:
      1. 💼 **Agente Commerciale (Venditore)**
      2. 📞 **Telefonista (Ufficio / Call Center)**
      3. 🏷️ **Tipologia Trattata**
    - Mappatura automatica intelligente delle colonne file per `assignedColleague`, `assignedTelefonista` e `service`.
    - Anteprima in tempo reale che riflette istantaneamente i valori predefiniti scelti nei selettori.
    - Aggiornamento backend `/api/leads/import` con inserimento e aggiornamento completo dei campi `assignedColleague`, `assignedTelefonisti` (JSON array) e `services` (JSON array).
  - **Google Maps Scraper Apify (`ApifyGoogleMapsTab`)**:
    - Aggiunto box di configurazione con gli stessi 3 selettori (Agente Commerciale, Telefonista Ufficio, Tipologia Trattata) prima dell'avvio della ricerca su Maps.
    - Invio a `/api/leads/apify-search` e memorizzazione nei job asincroni Apify.
    - All'estrazione dei contatti arricchiti con telefono ed email da Maps, il server applica e registra direttamente i valori scelti su ciascun nuovo lead generato nel database.

### 2.5 Rinomina Globale "Servizi" ➔ "Tipologie"
- **Terminologia Allineata al Business**: Sostituita la dicitura *Servizi* con *Tipologie* (es. agricolo, edile, industriale, residenziale).
- **Adeguamento UI Completo**:
  - Dropdown toolbar: `Tipologia (Tutte)`.
  - Intestazione colonna tabella lead: `Tipologia`.
  - Modale lead (`LeadModal.tsx`): `Tipologie di Interesse`.
  - Gestione collaboratori (`SuperAdminArea.tsx`): `Tipologie Trattate dall'Azienda`.
  - Report e PDF (`ReportsView.tsx`): filtri e tabelle con intestazione `Tipologie`.

### 2.5 Restrizioni di Ruolo & Sicurezza Operatori Call Center
- **Pulsanti Amministrativi Riservati**:
  - Solo gli utenti con ruolo Super Admin possono visualizzare i pulsanti: *Template Email*, *Template SMS*, *Server SMTP*, *Server IMAP*, *Campagne Email Massive*, *Importa Lead* e *Nuovo Lead*.
- **Scheda Lead**: Rimosso il pulsante/tendina SMS per i profili con ruolo `telefonista`. Mantenuto il modulo invio email con selezione dei template aziendali.

### 2.6 Doppia Assegnazione Lead (Telefonisti Multipli + Agente Singolo)
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

### 2.6 Gestione Duplicati Intelligente in Importazione Apify Google Maps (v4.6)
- Aggiunta la modalità di gestione duplicati (`skip`, `use_existing`, `create_new`) anche nella tab Apify, speculare all'importazione file Excel/CSV.
- Il backend analizza sia l'indirizzo email che il numero di telefono (normalizzato senza spazi e con prefisso internazionale uniforme) rispetto ai lead già archiviati.
- Feedback visivo con contatori statistici (*Nuovi Importati*, *Aggiornati*, *Duplicati Saltati*) e accordion con il dettaglio nominativo riga per riga.

### 2.7 Restrizioni Scheda Lead per Agenti Commerciali (v4.6 - v4.7)
- **Eliminazione Lead Inibita**: Rimosso il pulsante cestino in alto a destra nella scheda e blocco 403 Forbidden su `DELETE /api/leads/:id` se il richiedente è un venditore.
- **Invio SMS Disabilitato**: Rimosso il pulsante rapido SMS per gli agenti.
- **Tab Email Nascosta**: Gli agenti non vedono la tab per inviare email promozionali/comunicazioni standard (riservata ad admin e telefonisti).
- **Attività in Storico**: Niente opzione "Chiamata"; gli agenti possono inserire solo "Nota".
- **Fissa Appuntamento con Auto-Assegnazione**: L'agente può fissare sopralluoghi, ma il sistema lo assegna in automatico esclusivamente a se stesso.
- **Sincronizzazione Automatica Google Calendar**: L'evento viene creato all'istante anche sul calendario Google personale dell'agente se collegato.
- **Visibilità Appuntamenti per Telefonisti**: I telefonisti vedono nel proprio calendario gli appuntamenti creati sugli stessi lead assegnati a loro.

### 2.8 Visibilità Completa e Diretta di Telefono ed Email in Schede e Calendari (v4.7)
- **Scheda Dettaglio Lead (`LeadDetail`)**: Posizionati subito sotto al nome del contatto due elementi in evidenza:
  - 📞 **Telefono** in chiaro con link cliccabile `tel:` per avviare subito la chiamata.
  - ✉️ **Email** in chiaro con link cliccabile `mailto:` per avviare il client di posta predefinito.
- **Dashboard Agenti (`VendorApp`)**: Sia nelle card appuntamenti che nei lead associati sono sempre visibili e cliccabili numero di telefono ed email.
- **Calendario Appuntamenti (`AppointmentsList`)**: In ogni card appuntamento sono riportati direttamente sia il telefono che l'email del cliente con badge dedicati.

### 2.9 Isolamento Template Email Automatici "One-Time" (v4.8)
- I due template di sistema automatici (*Ringraziamento Post-Sopralluogo* e *Richiesta Recensione Consulente* con token) rimangono modificabili solo nel pannello *Template Email* di amministrazione.
- **Esclusione dalla selezione manuale**: I due template sono stati filtrati ed esclusi sia dal menu a tendina della **scheda lead singola (`SendEmailForm`)** che dal creatore di **campagne massive (`EmailCampaignManager`)**.
- In questo modo non possono essere inviati per errore manualmente o duplicati, mantenendo il loro scopo esclusivo di automazioni di sistema one-time per singolo lead/evento.

### 2.10 Gestione Completa Allegati Email (Nei Template Fissi e Al Volo da Scheda Lead) (v4.9)
- **Allegati Fissi nei Template (`EmailTemplateManager`)**:
  - Aggiunta colonna `attachments LONGTEXT DEFAULT NULL` nella tabella `email_templates`.
  - Nella creazione o modifica di un template email l'amministratore può caricare documenti e PDF (es. brochure aziendale, schede tecniche di prodotto, listini).
  - Badge visivo nelle card template con conteggio file fissi allegati.
- **Invio Email da Scheda Lead (`SendEmailForm`)**:
  - Selezionando un template che possiede allegati fissi, i file vengono precaricati istantaneamente nella lista allegati dell'email.
  - **Caricamento al volo**: Pulsante *"Allega File"* per caricare sul momento documenti da disco.
  - **Pesca da Documenti Lead**: Pulsante *"Da Documenti Lead"* che apre un modal per scegliere e allegare con un click i file già salvati nella tab Allegati della scheda lead.
  - Gli allegati vengono convertiti in base64 e inviati tramite `nodemailer` con tracking del nome file nella nota di storico (`history`).

### 2.11 ErrorBoundary Globale + Fix Crash da Google Translate / Estensioni Chrome (v4.10 - v4.10.1)

#### Problema Rilevato — Schermata Bianca su Chrome (Erika, Surface Notebook)
- **Sintomo**: L'utente Erika (admin) su Microsoft Surface Notebook con Google Chrome vedeva la pagina diventare completamente bianca subito dopo aver assegnato o modificato un lead. Su altri PC e in modalità incognito il problema non si presentava.
- **Diagnosi**: Aggiunto un **React Error Boundary globale** (`src/components/ErrorBoundary.tsx`) che intercetta qualunque eccezione non gestita nell'albero React e la mostra all'utente invece dello schermo bianco, con messaggio di errore, stack trace e componenti coinvolti.
- **Errore Catturato** (visibile grazie all'ErrorBoundary):
  ```
  NotFoundError: Failed to execute 'insertBefore' on 'Node':
  The node before which the new node is to be inserted is not a child of this node.
  ```
- **Causa Radice**: L'errore **NON era un bug nel codice applicativo**, ma un conflitto tra React e una **estensione Chrome** (Google Translate o similare) installata sul browser di Erika. Le estensioni di traduzione modificano direttamente il DOM HTML, andando in conflitto con il reconciler di React che non trova più i nodi dove deve inserire elementi. In modalità incognito le estensioni sono disabilitate, per questo il problema non si presentava.

#### Soluzione Applicata
1. **`src/components/ErrorBoundary.tsx`** (nuovo): Componente React class-based che avvolge tutta l'app. In caso di crash mostra messaggio d'errore, stack trace, componente coinvolto e pulsanti per ricaricare o riprovare.
2. **`src/main.tsx`**: `<App />` avvolto con `<ErrorBoundary>` come wrapper globale.
3. **`index.html`**: Aggiunto `translate="no"` e `lang="it"` al tag `<html>` — impedisce a Google Translate e simili di modificare il DOM dell'applicazione, prevenendo il conflitto alla radice.

> **💡 Lezione Appresa**: Se un'app React crasha solo su un browser/PC specifico, sospettare sempre le **estensioni del browser** (Google Translate, Grammarly, LastPass, uBlock Origin). Il sintomo tipico è `insertBefore` / `removeChild` su `Node`. La fix è `translate="no"` sull'`<html>`.

### 2.12 Ottimizzazione Anti-Spam & Cattura Azioni Lead Pulita (v4.11)
Per evitare che i filtri antispam (Gmail, Outlook, Yahoo) classifichino le email inviate dal gestionale come spam/phishing mantenendo contemporaneamente al 100% il tracciamento delle azioni dei lead (apertura email, click sui link e risposte):
1. **Endpoint di Tracking Puliti**:
   - Apertura email: `/p/:eid` invece del sospetto `/api/email-track/open?eid=...` (GIF trasparente 1x1 con header anti-cache).
   - Click sui link: `/t/:token` invece del redirect esplicito `/api/email-track/click?url=...` (il token base64url crittografato include recipientId e destinazione, senza rivelare parametri query sospetti).
   - Mantenimento retrocompatibilità automatica con i vecchi endpoint per email già consegnate.
2. **Generazione Automatica Alternativa `text/plain`**:
   - Converte il codice HTML in testo formattato puro via `htmlToText()`, inviando email multipart (fondamentale per reputazione mittente e compatibilità).
3. **Display Name Mittente Corretto**:
   - Formattazione standard `"Nome" <email@dominio.it>` (es. `"SolarBrand KG" <info@solarbrandkg.it>`) anziché raw email string.
4. **Header `List-Unsubscribe` Conforme**:
   - Header `mailto:` integrato nativamente su ogni invio campagna, allineandosi ai requisiti per mittenti di massa Gmail/Yahoo 2024.
5. **Rimozione Header Personalizzati Sospetti**:
   - Eliminati header `X-Campaign-Id` e `X-Recipient-Id` che fungevano da signature di invio di massa non autenticato.

### 2.13 Modifica Nome Operatori e Tipologie da Gestione Team (v4.12)
Dal pannello **"Gestione Team, Tipologie & Ruoli Aziendali"** (riservato agli amministratori):
1. **Rinomina Operatori Inline (Pencil Icon)**:
   - Accanto al nome di ogni operatore è presente il pulsante Matita che trasforma il titolo in campo input con tasti di salvataggio rapido (`Enter` o spunta verde) e annullamento (`Esc` o croce rossa).
   - **Propagazione Automatica a Cascata nel Database**:
     - `leads.assignedColleague`: aggiornato se assegnato come commerciale principale;
     - `leads.assignedTelefonisti`: aggiornato all'interno dell'array JSON senza corrompere gli altri operatori assegnati;
     - `appointments.colleague` e `appointments.assignedVendor`: aggiornati per preservare lo storico appuntamenti e il calendario;
     - `visit_reports.vendorName`: aggiornato per mantenere intatte le schede sopralluogo compilate;
     - `history.colleague`: aggiornato in tutte le note ed eventi storici del CRM.
2. **Rinomina Tipologie Inline**:
   - Accanto al badge di ciascuna tipologia è presente l'icona Matita per modificare il nome al volo.
   - Il server propaga la modifica su tutti i lead (`leads.service` e array `leads.services`) e sui servizi assegnati ai collaboratori (`colleagues.services`).

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
19. `leads.unsubscribed`: Flag GDPR (0/1) che blocca l'invio di future campagne promozionali al contatto.

---

## 3.1 Deliverability Email & Sistema Disiscrizione GDPR (v4.13)

Per garantire che le email non finiscano in spam e rispettare i requisiti internazionali (Google, Yahoo, GDPR):

1. **Separazione Netta tra Invio Singolo Diretto ed Email Marketing**:
   - **Email Singole da Scheda Lead (`POST /api/send-email`)**: Utilizzate dalle operatrici dopo una chiamata o dai commerciali. **NON hanno intestazioni di marketing, NON hanno header `List-Unsubscribe` e NON hanno link di disiscrizione nel testo**. Vengono percepite dai provider (Gmail, Outlook) come corrispondenza privata diretta persona-a-persona.
   - **Campagne Email Massive (`POST /api/email-campaigns/:id/send`)**: Includono per legge gli header conformi **RFC 8058 One-Click** (`List-Unsubscribe: <https://crm.solarbrandkg.it/u/:token>`, `List-Unsubscribe-Post: List-Unsubscribe=One-Click`) e il link di disiscrizione nel piè di pagina.
2. **Endpoint di Disiscrizione Iper-Veloce (`/u/:token`)**:
   - Supporta richieste GET da browser (interfaccia pulita per l'utente) e richieste POST automatiche dei provider di posta (Google One-Click).
   - Registra istantaneamente `unsubscribed = 1` sul lead e su tutte le anagrafiche con la stessa email.
   - Inserisce automaticamente nello storico del lead: `🚫 [DISISCRIZIONE EMAIL] Il contatto ha revocato il consenso e si è disiscritto dalle comunicazioni email.`.
3. **Blocco Automatico ed Evidenza Visiva**:
   - Quando si caricano i destinatari in una campagna, i lead disiscritti vengono **esclusi automaticamente** (`skippedUnsubscribed`).
   - Nella scheda del lead compare il badge rosso in evidenza: `🚫 Disiscritto da Campagne Email`.
   - Se un'operatrice tenta di mandare una mail manuale, compare un banner di avviso giallo/rosso di cautela legale.
4. **Migliorie Tecniche Deliverability**:
   - Punteggio **10/10 su Mail-Tester** con SPF, DKIM, DMARC e Reverse DNS verificati sul server SMTP dedicato (`dms01.vhosting-it.net`).
   - Generazione automatica multipart `text/plain` via `htmlToText` in tandem con `text/html`.
   - Tracking aperture pixel trasparente `1x1` e tracking click senza query string sospette (`/p/:eid` e `/t/:token`).

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
