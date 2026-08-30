# 📋 PROMEMORIA PERMANENTE — Solarbrand Flow (Gestionale Lead)

> 🟢 **STATO SISTEMA: ONLINE E ATTIVO SU HOSTINGER**  
> **URL PUBBLICO**: [https://crm.solarbrandkg.it/](https://crm.solarbrandkg.it/)  
> **REPOSITORY GITHUB (CI/CD)**: [https://github.com/PeraDev7/Solarbrand-gestionale](https://github.com/PeraDev7/Solarbrand-gestionale) (branch `main`)

---

## 🔑 RIEPILOGO PERMANENTE CREDENZIALI & ACCESSI

### 🗄️ Database MySQL (Hostinger)
| Parametro | Valore |
|---|---|
| **Host** | `localhost` |
| **Porta** | `3306` |
| **Nome Database** | `u437201618_solarbrand` |
| **Utente Database** | `u437201618_solarbrand` |
| **Password Database** | `123Noscusa!1234` |
| **Accesso phpMyAdmin** | Da Hostinger hPanel ➔ *Banche dati ➔ phpMyAdmin* |

### 👥 Account Iniziali Gestionale (Produzione)
Tutti gli account preesistenti hanno come password iniziale: **`SolarBrand2026!`**

| Nome | Ruolo | Email / Login | Password Iniziale | Note |
|---|---|---|---|---|
| **Erika** | `admin` | `erika@solarbrand.it` (o `erika`) | `SolarBrand2026!` | 👑 **Super Admin**: Gestione team, reset password, campagne email |
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

*💡 **Come cambiare email/password**: Entra come Erika (`erika@solarbrand.it`), clicca su **Gestione Utenti / Team** in alto e modifica qualsiasi email, password o aggiungi nuovi colleghi.*

---

## 📅 INTEGRAZIONE GOOGLE CALENDAR (OAUTH 2.0)

Configurato con successo tramite Google Cloud Console e Hostinger:

- **Progetto Google Cloud**: `SolarBrand Flow`
- **Ambito API**: `https://www.googleapis.com/auth/calendar.events`
- **URI di Reindirizzamento Autorizzati**:
  - `https://crm.solarbrandkg.it/api/auth/google/callback`
  - `http://localhost:3000/api/auth/google/callback`
- **Variabili d'Ambiente su Hostinger**:
  ```env
  GOOGLE_CLIENT_ID=549446315818-cuk21asmn7oii38n16dhlib94961q8hl.apps.googleusercontent.com
  GOOGLE_CLIENT_SECRET=GOCSPX-PJf...[Configurato in Hostinger]
  GOOGLE_REDIRECT_URI=https://crm.solarbrandkg.it/api/auth/google/callback
  ```
- **Funzionamento**: Ciascun venditore accede al portale venditori su `https://crm.solarbrandkg.it` e clicca su *"Collega Google Calendar"*. L'app sincronizza gli appuntamenti direttamente sul suo calendario personale.

---

## 💻 Ambiente Locale e Build su Windows

Google Drive su Windows usa modalità streaming virtuale (i file estratti in `node_modules` sono vuoti). Per build e test locali:

| Ruolo | Percorso |
|---|---|
| **Sorgenti & Repository GitHub** | `H:\Il mio Drive\Siti in TRAE\SolarBrand - gestionale chiamate\app vera e propria\` |
| **Runtime / Build Locale** | `C:\npm_tmp2\` |

### Avvio Locale Semplice:
Doppio click su **`AVVIA_APP_LOCALE.bat`** (apre `http://localhost:3000` con SQLite e dati completi).

---

## 🚀 VARIABILI D'AMBIENTE COMPLETE IN PRODUZIONE (HOSTINGER)

Nel pannello di Hostinger ➔ *Node.js / Web App* ➔ *Variabili d'ambiente*:

```env
NODE_ENV=production
PORT=3000
DEMO_MODE=false
ADMIN_PASSWORD=SolarBrand2026!
OPERATOR_SECRET=Operatori2026!

DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=u437201618_solarbrand
DB_USER=u437201618_solarbrand
DB_PASS=123Noscusa!1234

GOOGLE_CLIENT_ID=549446315818-cuk21asmn7oii38n16dhlib94961q8hl.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-PJf...[Configurato in Hostinger]
GOOGLE_REDIRECT_URI=https://crm.solarbrandkg.it/api/auth/google/callback
```
