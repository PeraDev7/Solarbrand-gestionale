#!/usr/bin/env node
/**
 * ============================================================
 *  MIGRAZIONE DATI: SQLite → MySQL
 *  SolarBrand Gestionale Chiamate
 * ============================================================
 *
 * COME USARLO:
 *
 *   1. Configura le variabili di connessione MySQL qui sotto
 *      (o crea un file .env.migrate con quelle variabili)
 *
 *   2. Assicurati di avere il database MySQL già creato su Hostinger
 *      (hPanel → MySQL Databases → crea il DB vuoto)
 *
 *   3. Esegui (dalla cartella "app vera e propria"):
 *         node --experimental-vm-modules migrate-sqlite-to-mysql.mjs
 *      oppure:
 *         node migrate-sqlite-to-mysql.mjs
 *
 *   4. Lo script:
 *      a. Crea tutte le tabelle (se non esistono)
 *      b. Migra ogni riga da ogni tabella
 *      c. Stampa un report finale
 *
 * NOTA: Lo script NON cancella i dati esistenti nel MySQL —
 * usa INSERT IGNORE quindi i duplicati vengono saltati silenziosamente.
 * ============================================================
 */

import Database from 'better-sqlite3';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ── Configurazione ────────────────────────────────────────────────────────────
// Modifica questi valori oppure metti un file .env.migrate nella stessa cartella

const SQLITE_PATH = process.env.SQLITE_PATH
  || path.join(path.dirname(fileURLToPath(import.meta.url)), 'data', 'app.db');

const MYSQL_CONFIG = {
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASS     || '',
  database: process.env.DB_NAME     || 'solarbrand',
  port:     Number(process.env.DB_PORT || 3306),
  charset:  'utf8mb4',
  multipleStatements: true,
};

// ── Schema MySQL (identico a database.ts) ─────────────────────────────────────
const SCHEMA_SQL = `
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS leads (
  id                  VARCHAR(36) PRIMARY KEY,
  name                TEXT NOT NULL,
  company             TEXT DEFAULT '',
  phone               TEXT DEFAULT '',
  email               TEXT DEFAULT '',
  status              TEXT DEFAULT 'Nuovo',
  type                TEXT DEFAULT 'Lead',
  service             TEXT DEFAULT '',
  services            TEXT DEFAULT '[]',
  assignedColleague   TEXT DEFAULT '',
  notes               TEXT DEFAULT '',
  address             TEXT DEFAULT '',
  source              TEXT DEFAULT '',
  quoteStatus         TEXT DEFAULT 'nessuno',
  quoteDeliveryMethod TEXT DEFAULT '',
  quoteFileName       TEXT DEFAULT '',
  quoteDeliveredAt    TEXT DEFAULT '',
  createdAt           TEXT NOT NULL,
  updatedAt           TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS history (
  id              VARCHAR(36) PRIMARY KEY,
  leadId          VARCHAR(36) NOT NULL,
  timestamp       TEXT NOT NULL,
  colleague       TEXT DEFAULT '',
  note            TEXT DEFAULT '',
  statusAfterCall TEXT DEFAULT '',
  type            TEXT DEFAULT 'note',
  attachmentName  TEXT DEFAULT '',
  attachmentUrl   TEXT DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS colleagues (
  id                VARCHAR(36) PRIMARY KEY,
  name              VARCHAR(191) NOT NULL,
  services          TEXT DEFAULT '[]',
  visibleColleagues TEXT DEFAULT '[]',
  role              TEXT DEFAULT 'telefonista',
  phone             TEXT DEFAULT '',
  email             TEXT DEFAULT '',
  pin               TEXT DEFAULT '',
  username          TEXT DEFAULT '',
  passwordHash      TEXT DEFAULT '',
  googleTokens      TEXT DEFAULT '',
  avgRating         DOUBLE DEFAULT 0,
  reviewCount       INT DEFAULT 0,
  createdAt         TEXT NOT NULL,
  UNIQUE KEY uniq_colleague_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessions (
  token       VARCHAR(64) PRIMARY KEY,
  colleagueId VARCHAR(36) NOT NULL,
  createdAt   TEXT NOT NULL,
  expiresAt   TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS oauth_states (
  state     VARCHAR(64) PRIMARY KEY,
  vendorId  VARCHAR(36) NOT NULL,
  createdAt TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS services (
  id        VARCHAR(128) PRIMARY KEY,
  name      VARCHAR(191) NOT NULL,
  createdAt TEXT NOT NULL,
  UNIQUE KEY uniq_service_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS appointments (
  id                  VARCHAR(36) PRIMARY KEY,
  leadId              VARCHAR(36) NOT NULL,
  leadName            TEXT DEFAULT '',
  colleague           TEXT DEFAULT '',
  assignedVendor      TEXT DEFAULT '',
  dateTime            TEXT NOT NULL,
  title               TEXT DEFAULT '',
  notes               TEXT DEFAULT '',
  appointmentType     TEXT DEFAULT 'visit',
  googleEventId       TEXT DEFAULT '',
  vendorGoogleEventId TEXT DEFAULT '',
  visitStatus         TEXT DEFAULT 'pending',
  visitCompletedAt    TEXT DEFAULT '',
  completed           TEXT DEFAULT 'false',
  createdAt           TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS visit_reports (
  id                  VARCHAR(36) PRIMARY KEY,
  appointmentId       VARCHAR(36) NOT NULL,
  leadId              VARCHAR(36) NOT NULL,
  vendorName          TEXT DEFAULT '',
  visitDate           TEXT NOT NULL,
  visitStatus         TEXT DEFAULT 'effettuato',
  clientType          TEXT DEFAULT 'residenziale',
  kwpSystem           DOUBLE DEFAULT 0,
  hasHeatPump         INT DEFAULT 0,
  outcome             TEXT DEFAULT '',
  contractValue       DOUBLE DEFAULT 0,
  notes               TEXT DEFAULT '',
  nextAction          TEXT DEFAULT '',
  roofType            TEXT DEFAULT '',
  consumption         DOUBLE DEFAULT 0,
  photos              MEDIUMTEXT DEFAULT NULL,
  quoteStatus         TEXT DEFAULT 'nessuno',
  quoteDeliveryMethod TEXT DEFAULT '',
  quoteFileName       TEXT DEFAULT '',
  quoteFileData       LONGTEXT DEFAULT NULL,
  quoteDeliveredAt    TEXT DEFAULT '',
  createdAt           TEXT NOT NULL,
  updatedAt           TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tasks (
  id            VARCHAR(36) PRIMARY KEY,
  leadId        VARCHAR(36) NOT NULL,
  leadName      TEXT DEFAULT '',
  createdBy     TEXT DEFAULT '',
  assignedTo    TEXT DEFAULT '',
  description   TEXT DEFAULT '',
  dueDate       TEXT DEFAULT '',
  completed     TEXT DEFAULT 'false',
  createdAt     TEXT NOT NULL,
  googleEventId TEXT DEFAULT '',
  appointmentId TEXT DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS email_templates (
  id           VARCHAR(36) PRIMARY KEY,
  name         TEXT NOT NULL,
  subject      TEXT DEFAULT '',
  body         LONGTEXT DEFAULT NULL,
  templateType TEXT DEFAULT 'custom',
  createdAt    TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sms_templates (
  id        VARCHAR(36) PRIMARY KEY,
  name      TEXT NOT NULL,
  body      TEXT DEFAULT '',
  createdAt TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS smtp_accounts (
  id         VARCHAR(36) PRIMARY KEY,
  name       TEXT NOT NULL,
  host       TEXT DEFAULT '',
  port       TEXT DEFAULT '587',
  user_email TEXT DEFAULT '',
  pass       TEXT DEFAULT '',
  createdAt  TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS settings (
  \`key\`   VARCHAR(191) PRIMARY KEY,
  value     TEXT DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reviews (
  id         VARCHAR(36) PRIMARY KEY,
  leadId     TEXT DEFAULT '',
  vendorName TEXT DEFAULT '',
  rating     INT DEFAULT 5,
  comment    TEXT DEFAULT '',
  token      VARCHAR(36) UNIQUE,
  usedAt     TEXT DEFAULT '',
  createdAt  TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS lead_attachments (
  id          VARCHAR(36) PRIMARY KEY,
  leadId      VARCHAR(36) NOT NULL,
  description TEXT NOT NULL,
  fileName    TEXT NOT NULL,
  filePath    TEXT NOT NULL,
  fileSize    INT DEFAULT 0,
  mimeType    TEXT DEFAULT '',
  uploadedBy  TEXT NOT NULL,
  createdAt   TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS email_campaigns (
  id           VARCHAR(36) PRIMARY KEY,
  name         TEXT NOT NULL,
  templateId   VARCHAR(36) NOT NULL,
  smtpId       VARCHAR(36) NOT NULL,
  status       TEXT DEFAULT 'draft',
  totalSent    INT DEFAULT 0,
  totalOpened  INT DEFAULT 0,
  totalClicked INT DEFAULT 0,
  totalReplied INT DEFAULT 0,
  sendDelay    INT DEFAULT 3,
  createdBy    TEXT DEFAULT '',
  createdAt    TEXT NOT NULL,
  sentAt       TEXT DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS email_campaign_recipients (
  id         VARCHAR(36) PRIMARY KEY,
  campaignId VARCHAR(36) NOT NULL,
  leadId     VARCHAR(36) NOT NULL,
  email      TEXT NOT NULL,
  leadName   TEXT DEFAULT '',
  status     TEXT DEFAULT 'pending',
  openedAt   TEXT DEFAULT '',
  clickedAt  TEXT DEFAULT '',
  repliedAt  TEXT DEFAULT '',
  replyText  TEXT DEFAULT '',
  messageId  TEXT DEFAULT '',
  sentAt     TEXT DEFAULT '',
  errorMsg   TEXT DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS imap_accounts (
  id          VARCHAR(36) PRIMARY KEY,
  name        TEXT NOT NULL,
  host        TEXT DEFAULT '',
  port        TEXT DEFAULT '993',
  user_email  TEXT DEFAULT '',
  pass        TEXT DEFAULT '',
  useSSL      INT DEFAULT 1,
  lastChecked TEXT DEFAULT '',
  createdAt   TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
`;

// ── Ordine di migrazione (rispetta le FK logiche) ─────────────────────────────
const MIGRATION_ORDER = [
  'services',
  'colleagues',
  'sessions',
  'oauth_states',
  'leads',
  'history',
  'appointments',
  'visit_reports',
  'tasks',
  'smtp_accounts',
  'imap_accounts',
  'email_templates',
  'sms_templates',
  'settings',
  'reviews',
  'lead_attachments',
  'email_campaigns',
  'email_campaign_recipients',
];

// ── Colonne che vanno trattate come numeri interi (0/1) ───────────────────────
const INTEGER_COLS = new Set([
  'useSSL', 'hasHeatPump', 'fileSize', 'rating',
  'totalSent', 'totalOpened', 'totalClicked', 'totalReplied', 'sendDelay',
  'reviewCount',
]);

// ── Colonne che vanno trattate come DOUBLE ────────────────────────────────────
const DOUBLE_COLS = new Set([
  'kwpSystem', 'contractValue', 'consumption', 'avgRating',
]);

// ── Funzione principale ───────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SolarBrand — Migrazione SQLite → MySQL');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  // 1. Apri SQLite
  if (!fs.existsSync(SQLITE_PATH)) {
    console.error(`❌ Database SQLite non trovato: ${SQLITE_PATH}`);
    console.error('   Assicurati di eseguire lo script dalla cartella "app vera e propria"');
    process.exit(1);
  }
  const sqlite = new Database(SQLITE_PATH, { readonly: true });
  console.log(`✅ SQLite aperto: ${SQLITE_PATH}`);

  // 2. Connetti a MySQL
  let pool;
  try {
    pool = mysql.createPool({ ...MYSQL_CONFIG, waitForConnections: true, connectionLimit: 5 });
    const conn = await pool.getConnection();
    console.log(`✅ MySQL connesso: ${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port} → ${MYSQL_CONFIG.database}`);
    conn.release();
  } catch (err) {
    console.error('❌ Connessione MySQL fallita:', err.message);
    console.error('   Controlla DB_HOST, DB_USER, DB_PASS, DB_NAME nel file .env');
    process.exit(1);
  }

  // 3. Crea schema MySQL
  console.log('');
  console.log('📐 Creazione schema MySQL (se non esiste)...');
  try {
    await pool.query(SCHEMA_SQL);
    console.log('   Schema OK');
  } catch (err) {
    console.error('❌ Errore creazione schema:', err.message);
    process.exit(1);
  }

  // 4. Migra ogni tabella
  console.log('');
  console.log('📦 Migrazione dati...');
  console.log('');

  const stats = {};
  let totalRows = 0;
  let totalErrors = 0;

  for (const tableName of MIGRATION_ORDER) {
    // Verifica che la tabella esista in SQLite
    const tableExists = sqlite.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).get(tableName);

    if (!tableExists) {
      console.log(`   ⏭  ${tableName.padEnd(30)} (non esiste in SQLite, saltata)`);
      stats[tableName] = { migrated: 0, skipped: 0, errors: 0 };
      continue;
    }

    // Leggi tutte le righe da SQLite
    let rows;
    try {
      rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
    } catch (err) {
      console.error(`   ❌ ${tableName}: errore lettura SQLite: ${err.message}`);
      stats[tableName] = { migrated: 0, skipped: 0, errors: 1 };
      totalErrors++;
      continue;
    }

    if (rows.length === 0) {
      console.log(`   ○  ${tableName.padEnd(30)} (vuota, 0 righe)`);
      stats[tableName] = { migrated: 0, skipped: 0, errors: 0 };
      continue;
    }

    // Ottieni le colonne dal primo record
    const cols = Object.keys(rows[0]);

    // Costruisci la query INSERT IGNORE
    const colList = cols.map(c => `\`${c}\``).join(', ');
    const placeholders = cols.map(() => '?').join(', ');
    const insertSql = `INSERT IGNORE INTO \`${tableName}\` (${colList}) VALUES (${placeholders})`;

    let migrated = 0;
    let errors = 0;

    // Inserisci in batch
    const BATCH_SIZE = 100;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      for (const row of batch) {
        const values = cols.map(col => {
          const val = row[col];
          if (val === null || val === undefined) return null;
          // Conversioni tipo
          if (INTEGER_COLS.has(col)) return Number(val) || 0;
          if (DOUBLE_COLS.has(col)) return Number(val) || 0;
          // Booleani SQLite (0/1) per colonne "completed" → mantieni come stringa 'true'/'false'
          return String(val);
        });

        try {
          await pool.execute(insertSql, values);
          migrated++;
        } catch (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            // Skip duplicates silently
          } else {
            console.error(`   ⚠  ${tableName} id=${row.id || '?'}: ${err.message}`);
            errors++;
          }
        }
      }
    }

    const status = errors > 0 ? '⚠ ' : '✅';
    const errMsg = errors > 0 ? ` (${errors} errori)` : '';
    console.log(`   ${status} ${tableName.padEnd(30)} ${migrated.toString().padStart(5)} righe migrate${errMsg}`);

    stats[tableName] = { migrated, skipped: rows.length - migrated - errors, errors };
    totalRows += migrated;
    totalErrors += errors;
  }

  // 5. Report finale
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  RIEPILOGO MIGRAZIONE');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Tabelle migrate: ${MIGRATION_ORDER.length}`);
  console.log(`  Righe totali:    ${totalRows}`);
  console.log(`  Errori:          ${totalErrors}`);
  console.log('');

  if (totalErrors === 0) {
    console.log('  ✅ Migrazione completata con successo!');
  } else {
    console.log('  ⚠  Migrazione completata con qualche errore (vedi sopra).');
    console.log('     Verifica manualmente le righe con errore su MySQL.');
  }
  console.log('');
  console.log('  PROSSIMI PASSI:');
  console.log('  1. Verifica i dati nel pannello MySQL di Hostinger');
  console.log('  2. Carica la cartella data/uploads/ su Hostinger via FTP');
  console.log('     (i file allegati ai lead/preventivi sono in quella cartella)');
  console.log('  3. Avvia l\'app su Hostinger e testa il login');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');

  // Chiudi connessioni
  sqlite.close();
  await pool.end();
}

main().catch(err => {
  console.error('Errore fatale:', err);
  process.exit(1);
});
