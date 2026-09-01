# 📋 PROMEMORIA PERMANENTE — Solarbrand Flow (Gestionale Lead)

> 🟢 **STATO SISTEMA: ONLINE E ATTIVO SU HOSTINGER**  
> **URL PUBBLICO**: [https://crm.solarbrandkg.it/](https://crm.solarbrandkg.it/)  
> **REPOSITORY GITHUB (CI/CD)**: [https://github.com/PeraDev7/Solarbrand-gestionale](https://github.com/PeraDev7/Solarbrand-gestionale) (branch `main`)  
> **VERSIONE ATTUALE**: 3.9 (Assegnazione Doppia Lead Telefonisti/Agente + Fix Credenziali Erika)

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
| **Erika** | `admin` | `eroikaphoto@gmail.com` (o `erika`) | `Eroika0987` | 👑 **Super Admin**: Gestione team, reset password, campagne email |
| **Laura** | `telefonista` | `laura@solarbrand.it` | `SolarBrand2026!` | Ufficio / Call Center |
| **Luciana** | `telefonista` | `luciana@solarbrand.it` | `SolarBrand2026!` | Ufficio / Call Center |
| **Marco Rossi** | `venditore` | `marco.rossi@solarbrand.it` | `SolarBrand2026!` | Agente Commerciale |
| **Stefano Bianchi** | `venditore` | `stefano.bianchi@solarbrand.it` | `SolarBrand2026!` | Agente Commerciale |
| **Alessandro Neri** | `venditore` | `alessandro.neri@solarbrand.it` | `SolarBrand2026!` | Agente Commerciale |
| **Giuseppe Verde** | `venditore` | `giuseppe.verde@solarbrand.it` | `SolarBrand2026!` | Agente Commerciale |
| **Davide Ferrari** | `venditore` | `davide.ferrari@solarbrand.it` | `SolarBrand2026!` | Agente Commerciale |
| **Matteo Romano** | `venditore` | `matteo.romano@solarbrand.it` | `SolarBrand2026!` | Agente Commerciale |
| **Andrea Conti** | `venditore` | `andrea.conti@solarbrand.it` | `SolarBrand2026!` | Agente Commerciale |
| **Fabio Test** | `venditore` | `fabio_test@solarbrand.it` | `SolarBrand2026!` | Agente Commerciale |

*💡 **Gestione Team**: Da Erika (`erika@solarbrand.it`), clicca su **Gestione Utenti / Team** in alto per aggiungere o modificare colleghi. Il sistema mostra la conferma visiva in chiaro della password impostata e permette di visualizzarla con l'icona occhio.*

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
