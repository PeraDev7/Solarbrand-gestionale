import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';
import { randomUUID as cryptoRandomUUID, scryptSync } from 'crypto';
import { hashPassword } from './passwords.js';

export const DEMO_DEFAULT_PASSWORD = 'SolarBrand2026!';

// Detect mode: if DB_HOST, DB_USER, DB_NAME or DB_TYPE='mysql' is set, use MySQL.
const preferMySQL = process.env.DB_TYPE === 'mysql' || Boolean(process.env.DB_HOST || process.env.DB_USER || process.env.DB_NAME);

let mysqlPool: mysql.Pool | null = null;
let sqliteDb: any = null;
let isUsingMySQL = false;

// ── SQLite path resolution ───────────────────────────────────────────────────
function getSqlitePath(): string {
  const possiblePaths = [
    path.join(process.cwd(), 'data', 'app.db'),
    path.join('C:\\npm_tmp2', 'data', 'app.db'),
    path.join('H:\\Il mio Drive\\Siti in TRAE\\SolarBrand - gestionale chiamate\\app vera e propria', 'data', 'app.db'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  const defaultPath = path.join(process.cwd(), 'data', 'app.db');
  const dir = path.dirname(defaultPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return defaultPath;
}

function initSqlite(): any {
  const dbPath = getSqlitePath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  try {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    return db;
  } catch (err: any) {
    throw new Error(`Modulo better-sqlite3 non disponibile: ${err?.message || ''}. Configura le credenziali MySQL (DB_HOST, DB_USER, DB_PASS, DB_NAME).`);
  }
}

// Convert MySQL syntax to SQLite if running in SQLite fallback mode
function adaptSqlForSqlite(sql: string): string {
  return sql
    .replace(/INSERT\s+IGNORE\s+INTO/gi, 'INSERT OR IGNORE INTO')
    .replace(/ENGINE\s*=\s*InnoDB/gi, '')
    .replace(/DEFAULT\s+CHARSET\s*=\s*utf8mb4/gi, '')
    .replace(/COLLATE\s*=\s*utf8mb4_unicode_ci/gi, '');
}

// ── Generic DB Interface ─────────────────────────────────────────────────────
export const db = {
  async run(sql: string, params: any[] = []): Promise<{ changes: number; lastInsertRowid: number }> {
    if (isUsingMySQL && mysqlPool) {
      const [result] = await mysqlPool.execute(sql, params) as any;
      return { changes: result.affectedRows || 0, lastInsertRowid: result.insertId || 0 };
    } else {
      if (!sqliteDb) sqliteDb = initSqlite();
      const adapted = adaptSqlForSqlite(sql);
      const res = sqliteDb.prepare(adapted).run(...params);
      return { changes: res.changes || 0, lastInsertRowid: Number(res.lastInsertRowid || 0) };
    }
  },

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (isUsingMySQL && mysqlPool) {
      const [rows] = await mysqlPool.execute(sql, params) as any;
      return (rows as T[])[0];
    } else {
      if (!sqliteDb) sqliteDb = initSqlite();
      const adapted = adaptSqlForSqlite(sql);
      return sqliteDb.prepare(adapted).get(...params) as T | undefined;
    }
  },

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (isUsingMySQL && mysqlPool) {
      const [rows] = await mysqlPool.execute(sql, params) as any;
      return rows as T[];
    } else {
      if (!sqliteDb) sqliteDb = initSqlite();
      const adapted = adaptSqlForSqlite(sql);
      return sqliteDb.prepare(adapted).all(...params) as T[];
    }
  },

  async exec(sql: string): Promise<void> {
    if (isUsingMySQL && mysqlPool) {
      await mysqlPool.query(sql);
    } else {
      if (!sqliteDb) sqliteDb = initSqlite();
      const adapted = adaptSqlForSqlite(sql);
      sqliteDb.exec(adapted);
    }
  },

  async close(): Promise<void> {
    if (isUsingMySQL && mysqlPool) {
      await mysqlPool.end();
    } else if (sqliteDb) {
      try { sqliteDb.pragma('wal_checkpoint(TRUNCATE)'); } catch {}
      sqliteDb.close();
      sqliteDb = null;
    }
  },
};

// ── Schema helpers ───────────────────────────────────────────────────────────
async function q(sql: string): Promise<void> {
  await db.exec(sql);
}

async function addCol(table: string, column: string, definition: string): Promise<void> {
  try {
    if (isUsingMySQL) {
      await q(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    } else {
      // In SQLite, ignore type specifics like AUTO_INCREMENT or ENGINE
      const sqliteDef = definition.replace(/DOUBLE/gi, 'REAL').replace(/MEDIUMTEXT|LONGTEXT/gi, 'TEXT');
      await q(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${sqliteDef}`);
    }
  } catch (e: any) {
    // Column already exists or duplicate field error is fine
    const msg = String(e?.message || '');
    if (e.code !== 'ER_DUP_FIELDNAME' && !msg.includes('duplicate column')) {
      // ignore
    }
  }
}

// ── initDb ───────────────────────────────────────────────────────────────────
export async function initDb() {
  // 1. Try connecting to MySQL if requested
  const mysqlHost = process.env.DB_HOST || '';
  const mysqlUser = process.env.DB_USER || '';
  const mysqlPass = process.env.DB_PASS || '';
  const mysqlDb   = process.env.DB_NAME || 'solarbrand';
  const mysqlPort = Number(process.env.DB_PORT) || 3306;

  const useMySQL = process.env.DB_TYPE === 'mysql' || Boolean(mysqlHost || mysqlUser || mysqlDb !== 'solarbrand');

  if (useMySQL && mysqlHost) {
    try {
      const testPool = mysql.createPool({
        host: mysqlHost,
        user: mysqlUser,
        password: mysqlPass,
        database: mysqlDb,
        port: mysqlPort,
        waitForConnections: true,
        connectionLimit: 10,
        charset: 'utf8mb4',
      });
      // Test connection
      const conn = await testPool.getConnection();
      conn.release();
      mysqlPool = testPool;
      isUsingMySQL = true;
      console.log(`✅ Database: Connesso a MySQL (${mysqlHost}:${mysqlPort}/${mysqlDb})`);
    } catch (err: any) {
      console.warn(`⚠️ Impossibile connettersi a MySQL (${err.message}). Utilizzo database SQLite locale.`);
      isUsingMySQL = false;
    }
  }

  if (!isUsingMySQL) {
    sqliteDb = initSqlite();
    console.log(`✅ Database: Modalità Locale SQLite (${getSqlitePath()})`);
  }

  // 2. Initialize Schema
  if (isUsingMySQL) {
    await q('SET FOREIGN_KEY_CHECKS = 0');
  }

  await q(`CREATE TABLE IF NOT EXISTS leads (
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
  )`);

  await q(`CREATE TABLE IF NOT EXISTS history (
    id              VARCHAR(36) PRIMARY KEY,
    leadId          VARCHAR(36) NOT NULL,
    timestamp       TEXT NOT NULL,
    colleague       TEXT DEFAULT '',
    note            TEXT DEFAULT '',
    statusAfterCall TEXT DEFAULT '',
    type            TEXT DEFAULT 'note',
    attachmentName  TEXT DEFAULT '',
    attachmentUrl   TEXT DEFAULT ''
  )`);

  await q(`CREATE TABLE IF NOT EXISTS colleagues (
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
    createdAt         TEXT NOT NULL
  )`);

  await q(`CREATE TABLE IF NOT EXISTS sessions (
    token       VARCHAR(64) PRIMARY KEY,
    colleagueId VARCHAR(36) NOT NULL,
    createdAt   TEXT NOT NULL,
    expiresAt   TEXT NOT NULL
  )`);

  await q(`CREATE TABLE IF NOT EXISTS oauth_states (
    state     VARCHAR(64) PRIMARY KEY,
    vendorId  VARCHAR(36) NOT NULL,
    createdAt TEXT NOT NULL
  )`);

  await q(`CREATE TABLE IF NOT EXISTS services (
    id        VARCHAR(128) PRIMARY KEY,
    name      VARCHAR(191) NOT NULL,
    createdAt TEXT NOT NULL
  )`);

  await q(`CREATE TABLE IF NOT EXISTS appointments (
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
  )`);

  await q(`CREATE TABLE IF NOT EXISTS visit_reports (
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
  )`);

  await q(`CREATE TABLE IF NOT EXISTS tasks (
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
  )`);

  await q(`CREATE TABLE IF NOT EXISTS email_templates (
    id           VARCHAR(36) PRIMARY KEY,
    name         TEXT NOT NULL,
    subject      TEXT DEFAULT '',
    body         LONGTEXT DEFAULT NULL,
    templateType TEXT DEFAULT 'custom',
    createdAt    TEXT NOT NULL
  )`);

  await q(`CREATE TABLE IF NOT EXISTS sms_templates (
    id        VARCHAR(36) PRIMARY KEY,
    name      TEXT NOT NULL,
    body      TEXT DEFAULT '',
    createdAt TEXT NOT NULL
  )`);

  await q(`CREATE TABLE IF NOT EXISTS smtp_accounts (
    id         VARCHAR(36) PRIMARY KEY,
    name       TEXT NOT NULL,
    host       TEXT DEFAULT '',
    port       TEXT DEFAULT '587',
    user_email TEXT DEFAULT '',
    pass       TEXT DEFAULT '',
    createdAt  TEXT NOT NULL
  )`);

  await q(`CREATE TABLE IF NOT EXISTS settings (
    \`key\`   VARCHAR(191) PRIMARY KEY,
    value     TEXT DEFAULT ''
  )`);

  await q(`CREATE TABLE IF NOT EXISTS reviews (
    id         VARCHAR(36) PRIMARY KEY,
    leadId     TEXT DEFAULT '',
    vendorName TEXT DEFAULT '',
    rating     INT DEFAULT 5,
    comment    TEXT DEFAULT '',
    token      VARCHAR(36),
    usedAt     TEXT DEFAULT '',
    createdAt  TEXT NOT NULL
  )`);

  await q(`CREATE TABLE IF NOT EXISTS lead_attachments (
    id          VARCHAR(36) PRIMARY KEY,
    leadId      VARCHAR(36) NOT NULL,
    description TEXT NOT NULL,
    fileName    TEXT NOT NULL,
    filePath    TEXT NOT NULL,
    fileSize    INT DEFAULT 0,
    mimeType    TEXT DEFAULT '',
    uploadedBy  TEXT NOT NULL,
    createdAt   TEXT NOT NULL
  )`);

  await q(`CREATE TABLE IF NOT EXISTS email_campaigns (
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
  )`);

  await q(`CREATE TABLE IF NOT EXISTS email_campaign_recipients (
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
  )`);

  await q(`CREATE TABLE IF NOT EXISTS imap_accounts (
    id          VARCHAR(36) PRIMARY KEY,
    name        TEXT NOT NULL,
    host        TEXT DEFAULT '',
    port        TEXT DEFAULT '993',
    user_email  TEXT DEFAULT '',
    pass        TEXT DEFAULT '',
    useSSL      INT DEFAULT 1,
    lastChecked TEXT DEFAULT '',
    createdAt   TEXT NOT NULL
  )`);

  if (isUsingMySQL) {
    await q('SET FOREIGN_KEY_CHECKS = 1');
  }

  // ── Migrations ─────────────────────────────────────────────────────────────
  await addCol('colleagues', 'avgRating',    'DOUBLE DEFAULT 0');
  await addCol('colleagues', 'reviewCount',  'INT DEFAULT 0');
  await addCol('colleagues', 'username',     "TEXT DEFAULT ''");
  await addCol('colleagues', 'passwordHash', "TEXT DEFAULT ''");
  await addCol('colleagues', 'googleTokens', "TEXT DEFAULT ''");
  await addCol('colleagues', 'role',         "TEXT DEFAULT 'telefonista'");
  await addCol('colleagues', 'phone',        "TEXT DEFAULT ''");
  await addCol('colleagues', 'email',        "TEXT DEFAULT ''");
  await addCol('colleagues', 'pin',          "TEXT DEFAULT ''");

  await addCol('history', 'attachmentName', "TEXT DEFAULT ''");
  await addCol('history', 'attachmentUrl',  "TEXT DEFAULT ''");
  await addCol('history', 'type',           "TEXT DEFAULT 'note'");

  await addCol('leads', 'quoteStatus',          "TEXT DEFAULT 'nessuno'");
  await addCol('leads', 'quoteDeliveryMethod',   "TEXT DEFAULT ''");
  await addCol('leads', 'quoteFileName',         "TEXT DEFAULT ''");
  await addCol('leads', 'quoteDeliveredAt',      "TEXT DEFAULT ''");
  await addCol('leads', 'address',               "TEXT DEFAULT ''");
  await addCol('leads', 'assignedTelefonisti',   "TEXT DEFAULT '[]'");

  await addCol('visit_reports', 'visitStatus',          "TEXT DEFAULT 'effettuato'");
  await addCol('visit_reports', 'clientType',           "TEXT DEFAULT 'residenziale'");
  await addCol('visit_reports', 'hasHeatPump',          'INT DEFAULT 0');
  await addCol('visit_reports', 'quoteStatus',          "TEXT DEFAULT 'nessuno'");
  await addCol('visit_reports', 'quoteDeliveryMethod',  "TEXT DEFAULT ''");
  await addCol('visit_reports', 'quoteFileName',        "TEXT DEFAULT ''");
  await addCol('visit_reports', 'quoteFileData',        'LONGTEXT DEFAULT NULL');
  await addCol('visit_reports', 'quoteDeliveredAt',     "TEXT DEFAULT ''");

  await addCol('email_templates',            'templateType', "TEXT DEFAULT 'custom'");
  await addCol('email_campaigns',            'sendDelay',    'INT DEFAULT 3');
  await addCol('email_campaign_recipients',  'replyText',    "TEXT DEFAULT ''");
  await addCol('email_campaign_recipients',  'messageId',    "TEXT DEFAULT ''");
  await addCol('email_campaign_recipients',  'errorMsg',     "TEXT DEFAULT ''");
  await addCol('email_campaign_recipients',  'openedAt',     "TEXT DEFAULT ''");
  await addCol('email_campaign_recipients',  'clickedAt',    "TEXT DEFAULT ''");
  await addCol('email_campaign_recipients',  'repliedAt',    "TEXT DEFAULT ''");
  await addCol('appointments', 'appointmentType',     "TEXT DEFAULT 'visit'");
  await addCol('appointments', 'vendorGoogleEventId', "TEXT DEFAULT ''");

  // ── Backfill default email templates if missing ───────────────────────────
  const now = new Date().toISOString();
  const postVisitTpl = await db.get("SELECT * FROM email_templates WHERE templateType = 'post_visit'");
  if (!postVisitTpl) {
    await db.run(
      'INSERT INTO email_templates (id, name, subject, body, templateType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [
        'tpl-post-visit',
        'Ringraziamento Post-Sopralluogo',
        'Ringraziamento a seguito del sopralluogo effettuato - SolarBrand',
        '<p>Gentile <strong>{nome}</strong>,</p><p>La ringraziamo per il tempo che ci ha dedicato durante il sopralluogo svolto dal nostro consulente <strong>{agente}</strong>.</p><p>A nome della nostra azienda, Le confermiamo che rimaniamo a Sua completa disposizione per qualsiasi chiarimento o approfondimento sul preventivo e sulle soluzioni energetiche analizzate.</p><p>Un cordiale saluto,<br><strong>SolarBrand</strong></p>',
        'post_visit',
        now,
      ]
    );
  }

  const reviewReqTpl = await db.get("SELECT * FROM email_templates WHERE templateType = 'review_request'");
  if (!reviewReqTpl) {
    await db.run(
      'INSERT INTO email_templates (id, name, subject, body, templateType, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [
        'tpl-review-request',
        'Richiesta Recensione Consulente',
        'Come valuti la tua esperienza con il nostro consulente? - SolarBrand',
        '<p>Gentile <strong>{nome}</strong>,</p><p>Grazie per aver scelto SolarBrand! Ci piacerebbe conoscere la tua opinione sul servizio offerto dal consulente <strong>{agente}</strong> che ti ha seguito.</p><p>Ti chiediamo solo un minuto per lasciare una valutazione con un voto da 1 a 5 stelle al seguente link:</p><p style="text-align: center; margin: 25px 0;"><a href="{link_recensione}" style="background-color: #f59e0b; color: #ffffff; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">&#9733; Lascia la tua valutazione &#9733;</a></p><p>Se il pulsante non funziona, puoi copiare e incollare questo link nel tuo browser:<br><a href="{link_recensione}">{link_recensione}</a></p><p>Grazie per il tuo prezioso contributo!<br><strong>SolarBrand</strong></p>',
        'review_request',
        now,
      ]
    );
  }

  // ── Backfill default emails and passwords for colleagues if empty ───────────
  const defaultHash = hashPassword(DEMO_DEFAULT_PASSWORD);

  // Ensure default admin (Erika) exists and has password
  const erika = await db.get("SELECT * FROM colleagues WHERE id = 'erika' OR LOWER(email) = 'erika@solarbrand.it'") as any;
  if (!erika) {
    const services = ['Fotovoltaico 6kW','Fotovoltaico 10kW','Fotovoltaico 20kW','Fotovoltaico Industriale 100kW','Pompa di Calore','Comunità Energetica (CER)'];
    await db.run(
      `INSERT INTO colleagues (id, name, role, phone, email, services, visibleColleagues, username, passwordHash, createdAt) VALUES ('erika', 'Erika', 'admin', '', 'erika@solarbrand.it', ?, '[]', 'erika', ?, ?)`,
      [JSON.stringify(services), defaultHash, now]
    );
  } else {
    // Preserva email e passwordHash se già personalizzati dall'admin.
    // Garantisce solo role='admin' e username='erika'.
    // NON sovrascrivere l'email se è stata cambiata dall'utente!
    await db.run(
      `UPDATE colleagues SET role = 'admin', username = CASE WHEN (username IS NULL OR username = '') THEN 'erika' ELSE username END WHERE id = ?`,
      [erika.id]
    );
    // Imposta passwordHash di default SOLO se è ancora vuoto/non valido
    if (!erika.passwordHash || !erika.passwordHash.startsWith('scrypt$')) {
      await db.run(
        `UPDATE colleagues SET passwordHash = ? WHERE id = ?`,
        [defaultHash, erika.id]
      );
    }
    // ── Migrazione one-time credenziali Erika ───────────────────────────────
    // Aggiorna email e password SE ancora ai valori di default.
    // Dopo il primo avvio con questa versione, l'email sarà diversa e il blocco verrà saltato.
    const erikaCurrent = await db.get("SELECT email FROM colleagues WHERE id = ?", [erika.id]) as any;
    if (erikaCurrent && (erikaCurrent.email === 'erika@solarbrand.it' || erikaCurrent.email === '' || !erikaCurrent.email)) {
      const newHash = scryptSync('Eroika0987', '1f5888569e2b4b592f6c4b7c3dd6132c', 64).toString('hex');
      const newPwdHash = `scrypt$1f5888569e2b4b592f6c4b7c3dd6132c$${newHash}`;
      await db.run(
        `UPDATE colleagues SET email = 'eroikaphoto@gmail.com', passwordHash = ? WHERE id = ?`,
        [newPwdHash, erika.id]
      );
      console.log('[initDb] Credenziali Erika aggiornate: email=eroikaphoto@gmail.com');
    }
  }

  const allCols = await db.all('SELECT * FROM colleagues', []) as any[];
  for (const c of allCols) {
    let email = c.email || '';
    if (!email.trim()) {
      email = `${c.id}@solarbrand.it`;
    }
    let pwdHash = c.passwordHash || '';
    if (!pwdHash.trim() || !pwdHash.startsWith('scrypt$')) {
      pwdHash = defaultHash;
    }
    let role = c.role || 'telefonista';
    if (c.id === 'erika') {
      role = 'admin';
    }
    await db.run('UPDATE colleagues SET email = ?, passwordHash = ?, role = ? WHERE id = ?', [email, pwdHash, role, c.id]);
  }
}

export function parseJsonField(val: string | null | undefined): any[] {
  if (!val) return [];
  try {
    return JSON.parse(val);
  } catch {
    return [];
  }
}

export function randomUUID(): string {
  return cryptoRandomUUID();
}

export async function seedDemoDataIfNeeded() {
  const countRow = await db.get<any>('SELECT COUNT(*) as cnt FROM colleagues');
  const colleagueCount = Number(countRow?.cnt || 0);
  if (colleagueCount > 0) return;

  const now = new Date().toISOString();

  // 1. Seed Services
  const services = ['Fotovoltaico 6kW','Fotovoltaico 10kW','Fotovoltaico 20kW','Fotovoltaico Industriale 100kW','Pompa di Calore','Comunità Energetica (CER)'];
  for (const name of services) {
    await db.run(
      'INSERT INTO services (id, name, createdAt) VALUES (?, ?, ?)',
      [name.toLowerCase().replace(/[^a-z0-9]/g, '_'), name, now]
    );
  }

  // 2. Seed 7 Vendors & 3 Phone Operators
  const vendors = [
    { name: 'Marco Rossi',      phone: '3351234567', email: 'marco.rossi@solarbrand.it' },
    { name: 'Stefano Bianchi',  phone: '3352345678', email: 'stefano.bianchi@solarbrand.it' },
    { name: 'Alessandro Neri',  phone: '3353456789', email: 'alessandro.neri@solarbrand.it' },
    { name: 'Giuseppe Verde',   phone: '3354567890', email: 'giuseppe.verde@solarbrand.it' },
    { name: 'Davide Ferrari',   phone: '3355678901', email: 'davide.ferrari@solarbrand.it' },
    { name: 'Matteo Romano',    phone: '3356789012', email: 'matteo.romano@solarbrand.it' },
    { name: 'Andrea Conti',     phone: '3357890123', email: 'andrea.conti@solarbrand.it' },
  ];
  const operators = ['Erika', 'Laura', 'Luciana'];
  const demoPasswordHash = hashPassword(DEMO_DEFAULT_PASSWORD);

  for (const v of vendors) {
    const id = v.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    await db.run(
      `INSERT INTO colleagues (id, name, role, phone, email, services, visibleColleagues, username, passwordHash, createdAt) VALUES (?, ?, 'venditore', ?, ?, ?, '[]', ?, ?, ?)`,
      [id, v.name, v.phone, v.email, JSON.stringify(services), id, demoPasswordHash, now]
    );
  }

  for (const op of operators) {
    const id = op.toLowerCase();
    await db.run(
      `INSERT INTO colleagues (id, name, role, phone, email, services, visibleColleagues, username, passwordHash, createdAt) VALUES (?, ?, 'telefonista', '', ?, ?, '[]', ?, ?, ?)`,
      [id, op, `${id}@solarbrand.it`, JSON.stringify(services), id, demoPasswordHash, now]
    );
  }
}

// Auto-run initDb
initDb().catch(err => {
  console.error('❌ Errore inizializzazione database:', err.message || err);
});

/**
 * Migrazione one-time: sposta i telefonisti da assignedColleague a assignedTelefonisti.
 * I venditori rimangono in assignedColleague. Idempotente: salta i lead già migrati.
 */
export async function migrateAssignments(): Promise<void> {
  try {
    // Recupera tutti i colleghi con il loro ruolo
    const allColleagues = await db.all('SELECT name, role FROM colleagues') as { name: string; role: string }[];
    const telefonistiNames = new Set(allColleagues.filter(c => c.role === 'telefonista').map(c => c.name));

    // Recupera i lead con assignedColleague non vuoto ma assignedTelefonisti ancora vuoto/default
    const leads = await db.all(
      "SELECT id, assignedColleague, assignedTelefonisti FROM leads WHERE assignedColleague != '' AND assignedColleague IS NOT NULL"
    ) as { id: string; assignedColleague: string; assignedTelefonisti: string }[];

    let migrated = 0;
    for (const lead of leads) {
      const alreadyHasTel = (() => {
        try { const arr = JSON.parse(lead.assignedTelefonisti || '[]'); return Array.isArray(arr) && arr.length > 0; }
        catch { return false; }
      })();
      if (alreadyHasTel) continue; // già migrato

      if (telefonistiNames.has(lead.assignedColleague)) {
        // È un telefonista → sposta in assignedTelefonisti, svuota assignedColleague
        await db.run(
          "UPDATE leads SET assignedTelefonisti = ?, assignedColleague = '', updatedAt = ? WHERE id = ?",
          [JSON.stringify([lead.assignedColleague]), new Date().toISOString(), lead.id]
        );
        migrated++;
      }
      // Se è un venditore → lascia assignedColleague invariato
    }
    if (migrated > 0) console.log(`[migrateAssignments] Migrati ${migrated} lead: telefonista → assignedTelefonisti`);
  } catch (e: any) {
    console.error('[migrateAssignments] Errore:', e?.message || e);
  }
}

/**
 * Pulisce tutti i record orfani (appuntamenti, schede visita, task, storico, allegati)
 * appartenenti a lead che sono stati eliminati dal CRM.
 */
export async function cleanupOrphanRecords(): Promise<void> {
  try {
    await db.run('DELETE FROM appointments WHERE leadId NOT IN (SELECT id FROM leads)');
    await db.run('DELETE FROM visit_reports WHERE leadId NOT IN (SELECT id FROM leads)');
    await db.run('DELETE FROM tasks WHERE leadId NOT IN (SELECT id FROM leads)');
    await db.run('DELETE FROM history WHERE leadId NOT IN (SELECT id FROM leads)');
    await db.run('DELETE FROM lead_attachments WHERE leadId NOT IN (SELECT id FROM leads)');
    await db.run('DELETE FROM email_campaign_recipients WHERE leadId NOT IN (SELECT id FROM leads)');
    console.log('[cleanupOrphanRecords] Pulizia record orfani lead completata con successo');
  } catch (e: any) {
    console.error('[cleanupOrphanRecords] Errore pulizia orfani:', e?.message || e);
  }
}

