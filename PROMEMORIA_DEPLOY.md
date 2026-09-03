# 📋 PROMEMORIA PERMANENTE — Solarbrand Flow (Gestionale Lead)

> 🟢 **STATO SISTEMA: ONLINE E ATTIVO SU HOSTINGER**  
> **URL PUBBLICO**: [https://crm.solarbrandkg.it/](https://crm.solarbrandkg.it/)  
> **REPOSITORY GITHUB (CI/CD)**: [https://github.com/PeraDev7/Solarbrand-gestionale](https://github.com/PeraDev7/Solarbrand-gestionale) (branch `main`)  
> **VERSIONE ATTUALE**: 4.9 (Allegati Email Completi: Allegati Fissi nei Template + Upload al Volo e Pesca da Documenti Lead nella Scheda)

---

## 🔑 RIEPILOGO PERMANENTE CREDENZIALI & ACCESSI

### 🗄️ Database MariaDB / MySQL (Hostinger)
| Parametro | Valore |
|---|---|
| **Host** | `localhost` |
| **Porta** | `3306` |
| **Nome Database** | `u437201618_solarbrand` |
| **Utente Database** | `u437201618_solarbrand` |
| **Password Database** | `123Noscusa!1234` |
| **Accesso phpMyAdmin** | Da Hostinger hPanel ➔ *Banche dati ➔ phpMyAdmin* |

### 👥 Account Iniziali Gestionale (Produzione)
Tutti gli account preesistenti (tranne Erika) hanno come password iniziale: **`SolarBrand2026!`**

| Nome | Ruolo | Email / Login | Password Iniziale | Note |
|---|---|---|---|---|
| **Erika** | `admin` | `eroikaphoto@gmail.com` (o `erika`) | `Eroika0987` | 👑 **Super Admin**: Gestione team, reset password, campagne email, template, import lead, tipologie |
| **Laura** | `telefonista` | `laura@solarbrand.it` | `SolarBrand2026!` | Ufficio / Call Center (lavora lead/tipologie assegnati, invio email da scheda, assegna agenti) |
| **Luciana** | `telefonista` | `luciana@solarbrand.it` | `SolarBrand2026!` | Ufficio / Call Center (lavora lead/tipologie assegnati, invio email da scheda, assegna agenti) |
| **Marco Rossi** | `venditore` | `marco.rossi@solarbrand.it` | `SolarBrand2026!` | Agente Commerciale |
| **Stefano Bianchi** | `venditore` | `stefano.bianchi@solarbrand.it` | `SolarBrand2026!` | Agente Commerciale |
| **Alessandro Neri** | `venditore` | `alessandro.neri@solarbrand.it` | `SolarBrand2026!` | Agente Commerciale |
| **Giuseppe Verde** | `venditore` | `giuseppe.verde@solarbrand.it` | `SolarBrand2026!` | Agente Commerciale |
| **Davide Ferrari** | `venditore` | `davide.ferrari@solarbrand.it` | `SolarBrand2026!` | Agente Commerciale |
| **Matteo Romano** | `venditore` | `matteo.romano@solarbrand.it` | `SolarBrand2026!` | Agente Commerciale |
| **Andrea Conti** | `venditore` | `andrea.conti@solarbrand.it` | `SolarBrand2026!` | Agente Commerciale |
| **Fabio Test** | `venditore` | `fabio_test@solarbrand.it` | `SolarBrand2026!` | Agente Commerciale |

---

## 🛡️ MATRICE PERMESSI RUOLI (v4.9)

| Funzionalità / Azione | Super Admin (`admin`) | Telefonista (`telefonista`) | Venditore (`venditore`) |
|---|:---:|:---:|:---:|
| **Visibilità Telefono ed Email in Scheda Lead** | ✅ (link `tel:` e `mailto:`) | ✅ (link `tel:` e `mailto:`) | ✅ (link `tel:` e `mailto:`) |
| **Importazione Massiva Lead (Excel/CSV/Apify)** | ✅ | ❌ | ❌ |
| **Creazione Manuale Nuovo Lead** | ✅ | ❌ | ❌ |
| **Cancellazione Lead (Cestino)** | ✅ | ✅ | ❌ (bloccato UI & backend 403) |
| **Invio SMS Rapido da Scheda** | ✅ | ❌ | ❌ (rimosso pulsante SMS) |
| **Tab Email da Scheda Lead** | ✅ (con allegati al volo/da lead) | ✅ (con allegati al volo/da lead) | ❌ (nascosta) |
| **Template Email Automatici (Post-Sopralluogo / Recensione)** | Modificabili in impostazioni | Invisibili nei selettori invio | Invisibili nei selettori invio |
| **Template Email Manuali con Allegati Fissi** | ✅ (può caricare allegati fissi) | ❌ (usa i template con allegati) | ❌ |
| **Fissa Appuntamento da Scheda Lead** | ✅ (sceglie agente/tipo) | ✅ (assegna ad agente) | ✅ (auto-assegnato a sé stesso + sync Google) |
| **Registra Attività in Storico** | ✅ (Chiamata o Nota) | ✅ (Chiamata o Nota) | Solo Nota (Chiamata rimossa) |
| **Note Automatiche Appuntamenti in Storico** | ✅ | ✅ | ✅ (visibile nella cronologia del lead) |
| **Creazione / Modifica Template Email** | ✅ | ❌ | ❌ |
| **Creazione / Invio Template SMS** | ✅ | ❌ | ❌ |
| **Configurazione Server SMTP & IMAP** | ✅ | ❌ | ❌ |
| **Creazione & Invio Campagne Massive** | ✅ | ❌ | ❌ |
| **Gestione Team, Tipologie & Password** | ✅ | ❌ | ❌ |
| **Assegnazione Agente Commerciale su Lead** | ✅ | ✅ | ❌ |
| **Assegnazione / Modifica Telefonisti su Lead** | ✅ | ❌ (riservato admin) | ❌ |
| **Calendario Appuntamenti: Altri Telefonisti** | ✅ (vede tutti o filtra) | ❌ (vede solo i propri e dei lead assegnati) | ❌ (solo i propri sopralluoghi) |
| **Visibilità Lead** | Tutti | Solo assegnati nominalmente O per Tipologia | Solo appuntamenti/lead assegnati |

*💡 **Gestione Team**: Da Erika (`eroikaphoto@gmail.com`), clicca su **Gestione Utenti / Team** in alto per aggiungere o modificare colleghi. Il sistema mostra la conferma visiva in chiaro della password impostata e permette di visualizzarla con l'icona occhio.*

---

## ⭐ SISTEMA STELLINE & RECENSIONI AGENTI (v4.3)

1. **Trigger Automatico su Chiusura Lead**:
   - Quando un lead passa allo stato **`Chiuso con successo`** (da un qualsiasi altro stato) e possiede un'email, il server genera istantaneamente un token univoco (UUID) e una riga nella tabella `reviews`.
   - **Persistenza Dati Cliente**: Nome ed email del lead vengono salvati direttamente nella tabella `reviews` al momento della generazione. Se il lead viene successivamente eliminato dal CRM, **la recensione e il nome del cliente rimangono per sempre conservati** nella scheda recensioni senza mai mostrare codici o perdere i dati.
   - Viene inviata una email automatica al cliente usando il template `review_request` (`tpl-review-request`), valorizzando i placeholder `{nome}`, `{azienda}`, `{agente}` e `{link_recensione}`.
2. **Pagina Pubblica di Valutazione (`/recensione?token=...`)**:
   - Pagina responsive con selezione a 5 stelle interattive (etichette: *Scarso, Sufficiente, Buono, Molto Buono, Eccellente!*).
   - Campo opzionale per commento/feedback testuale del cliente.
   - Protezione **monouso**: dopo l'invio (`usedAt` valorizzato), il link non può più essere riutilizzato e mostra una schermata di ringraziamento.
3. **Calcolo Automatico Medie in Tempo Reale**:
   - All'invio della recensione (`POST /api/reviews/submit`), il server calcola la media `AVG(rating)` e il totale recensioni `COUNT(*)` per l'agente commerciale indicato.
   - Aggiorna istantaneamente i campi `avgRating` e `reviewCount` nella tabella `colleagues`.
   - Il badge ⭐ con media e conteggio appare sia nel portale agente (`VendorApp.tsx`), sia nell'elenco operatori admin (`SuperAdminArea.tsx`).
4. **Pannello Gestione Recensioni nel Portale Admin**:
   - Nel modale **Gestione Team**, accessibile da Super Admin, è presente la tab **"Recensioni"** con:
     - Scorecard riassuntiva per agente (media numerica + stelline grafiche + conteggio).
     - Lista di tutte le recensioni con nome cliente permanente, agente associato, voto in stelle, commento in corsivo, data invio e data compilazione.
     - Badge di stato: *"In attesa di risposta"* per le recensioni inviate e non ancora compilate.
     - **Pulsante Cestino Singolo**: Consente all'admin di eliminare singole recensioni errate o di spam con ricalcolo immediato della media dell'agente.
     - **Pulsante "Azzera Recensioni Test"**: Per ripulire rapidamente tutte le recensioni di prova e azzerare le medie.

---

## 📧 CONFIGURAZIONE EMAIL, TRACKING & INBOX SCANNER

### 📤 SMTP Aziendale (Invio Campagne & Notifiche)
- **Account Principale**: `SolarBrand KG`
- **Host**: Configurato da interfaccia gestionale (es. `dms01.vhosting-it.net:465` o `smtp.hostinger.com:587`)
- **Email Mittente**: `info@solarbrandkg.it`
- **URL Pubblico Tracking**: `https://crm.solarbrandkg.it` (impostato automaticamente in `settings`)
- **Pixel Aperture**: GIF 1x1 trasparente (`/api/email-track/open?eid=...`)
- **Click Tracking**: Redirect 302 (`/api/email-track/click?eid=...&url=...`)

### 📥 IMAP Aziendale & Inbox Scanner (Lettura Risposte & Email)
- **Host**: `imap.hostinger.com` | **Porta**: `993` (SSL) | **Email**: `info@solarbrandkg.it`
- **Algoritmo Scansione**: Compatibile al 100% con Hostinger (`fetch 1:*` e filtro temporale in JS, senza query UID bloccanti).
- **Polling Automatico**: Eseguito in background ogni 10 minuti dal server.
- **Funzionalità**:
  1. **Risposte a Campagne**: Riconosce `In-Reply-To` / `References` e aggiorna le metriche della campagna.
  2. **Inbox Scanner per Lead**: Se un mittente corrisponde a un'email di un lead in anagrafica, aggiunge automaticamente una nota `📩 [EMAIL RICEVUTA]` con testo ed oggetto nella scheda del cliente.
  3. **Pulsante "Controlla ora"**: Forzatura manuale istantanea con feedback completo su risposte ed email abbinate.

---

## 🗺️ LEAD GENERATION GOOGLE MAPS (APIFY)

- **Tipo Token**: **Organization API Token** (Organizzazione `Iride Suite Organization`).
- **Comportamento Scraper**: 
  - Scansiona circa 3.5x-4x attività rispetto al target richiesto.
  - Visita i siti web aziendali per estrarre sia **Email** che **Telefono** validati.
  - Esclude automaticamente i contatti già presenti nel CRM (anti-duplicati).
  - Tempo medio di esecuzione: tra 1 e 2 minuti sui server Apify.

---

## 📅 INTEGRAZIONE GOOGLE CALENDAR (OAUTH 2.0)

- **Progetto Google Cloud**: `SolarBrand Flow`
- **Ambito API**: `https://www.googleapis.com/auth/calendar.events`
- **URI di Reindirizzamento**: `https://crm.solarbrandkg.it/api/auth/google/callback`
- **Funzionamento**: Ciascun venditore collega il proprio Google Calendar personale per ricevere sincronizzazioni istantanee degli appuntamenti fissati dall'ufficio.

---

## 💻 Ambiente Locale e Build su Windows

| Ruolo | Percorso |
|---|---|
| **Sorgenti & Repository GitHub** | `H:\Il mio Drive\Siti in TRAE\SolarBrand - gestionale chiamate\app vera e propria\` |
| **Runtime / Build Locale** | `C:\npm_tmp2\` |

### Procedura di Build e Push:
```powershell
cmd /c "xcopy /s /y /q src C:\npm_tmp2\src\ && copy /y server.ts C:\npm_tmp2\server.ts && cd /d C:\npm_tmp2 && npx vite build && npx esbuild server.ts --bundle --platform=node --format=cjs --outfile=dist/server.cjs --external:mysql2 --external:better-sqlite3 --external:nodemailer --external:imapflow --external:googleapis --external:vite"
cmd /c "xcopy /s /y /q C:\npm_tmp2\dist dist\"
git add -A
git commit -m "messaggio"
git push origin main
```
