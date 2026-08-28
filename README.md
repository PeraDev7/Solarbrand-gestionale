<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# SolarBrand — Gestionale Lead & Commerciale Fotovoltaico (v3.0 - MySQL)

Software gestionale web completo per la qualifica lead, gestione appuntamenti e sopralluoghi commerciali per aziende di installazione **fotovoltaico, pompe di calore e Comunità Energetiche (CER)**.

---

## 🗄️ Database & Architettura (v3.0)

- **Backend**: Node.js / Express asincrono (`mysql2/promise` con connection pool).
- **Database**: MySQL nativo (adatto per Hostinger Business/Cloud Hosting).
- **Dati esportati pronti per Hostinger**:
  - `dump_mysql_solarbrand.sql` (1-click import in phpMyAdmin di Hostinger con tutti i 57 lead, 26 appuntamenti, colleghi, report e template).
  - `migrate-sqlite-to-mysql.mjs` (script di migrazione da riga di comando).

---

## 🚀 Come Avviare in Locale (Windows)

Fare doppio click sul file launcher presente nella cartella radice:
```
AVVIA_APP_LOCALE.bat
```
oppure `start-app.bat`.

Lo script provvederà a:
1. Sincronizzare il codice sorgente con l'ambiente locale in `C:\npm_tmp2`.
2. Connettersi al database MySQL locale specificato nel file `.env`.
3. Aprire automaticamente il browser su **`http://localhost:3000`**.

---

## 🖥️ Deploy su Hostinger (Business o Cloud Hosting)

La cartella su Google Drive è la cartella **PRIMARIA E CORRETTA** per il deploy su Hostinger.

Per la guida completa passo-passo al deploy su Hostinger (creazione database, phpMyAdmin import, configurazione Node.js App e variabili d'ambiente), fare riferimento a:
- [PROMEMORIA_DEPLOY.md](../PROMEMORIA_DEPLOY.md)
- [DOCUMENTAZIONE_PROGETTO.md](../DOCUMENTAZIONE_PROGETTO.md)
