-- ============================================================
-- DUMP COMPLETO SOLARBRAND GESTIONALE PER MYSQL (HOSTINGER)
-- Generato automaticamente da data/app.db (SQLite)
-- Pronto per l'importazione diretta in phpMyAdmin su Hostinger
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- Tabella `services`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `services` (
  `id` VARCHAR(128) PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL,
  `createdAt` TEXT NOT NULL,
  UNIQUE KEY `uniq_service_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `services` (`id`, `name`, `createdAt`) VALUES
  ('impianto_fotovoltaico_6kw', 'Impianto Fotovoltaico 6kW', '2026-08-01T17:53:46.319Z'),
  ('impianto_fotovoltaico_10kw___accumulo', 'Impianto Fotovoltaico 10kW + Accumulo', '2026-08-01T17:53:46.319Z'),
  ('pompa_di_calore_high_efficiency', 'Pompa di Calore High Efficiency', '2026-08-01T17:53:46.319Z'),
  ('comunit__energetica__cer_', 'Comunità Energetica (CER)', '2026-08-01T17:53:46.319Z');

-- ------------------------------------------------------------
-- Tabella `colleagues`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `colleagues` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(191) NOT NULL,
  `services` TEXT DEFAULT '[]',
  `visibleColleagues` TEXT DEFAULT '[]',
  `role` TEXT DEFAULT 'telefonista',
  `phone` TEXT DEFAULT '',
  `email` TEXT DEFAULT '',
  `pin` TEXT DEFAULT '',
  `username` TEXT DEFAULT '',
  `passwordHash` TEXT DEFAULT '',
  `googleTokens` TEXT DEFAULT '',
  `avgRating` DOUBLE DEFAULT 0,
  `reviewCount` INT DEFAULT 0,
  `createdAt` TEXT NOT NULL,
  UNIQUE KEY `uniq_colleague_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `colleagues` (`id`, `name`, `services`, `visibleColleagues`, `role`, `phone`, `email`, `pin`, `avgRating`, `reviewCount`, `createdAt`) VALUES
  ('erika', 'Erika', '["Impianto Fotovoltaico 6kW","Impianto Fotovoltaico 10kW + Accumulo","Pompa di Calore High Efficiency","Comunità Energetica (CER)"]', '[]', 'admin', '', '', '', 0.0, 0, '2026-08-01T17:53:46.319Z'),
  ('laura', 'Laura', '["Impianto Fotovoltaico 6kW","Impianto Fotovoltaico 10kW + Accumulo","Pompa di Calore High Efficiency","Comunità Energetica (CER)"]', '[]', 'telefonista', '', '', '', 0.0, 0, '2026-08-01T17:53:46.319Z'),
  ('luciana', 'Luciana', '["Impianto Fotovoltaico 6kW","Impianto Fotovoltaico 10kW + Accumulo","Pompa di Calore High Efficiency","Comunità Energetica (CER)"]', '[]', 'telefonista', '', '', '', 0.0, 0, '2026-08-01T17:53:46.319Z'),
  ('marco_rossi', 'Marco Rossi', '["Impianto Fotovoltaico 6kW","Impianto Fotovoltaico 10kW + Accumulo","Pompa di Calore High Efficiency","Comunità Energetica (CER)"]', '[]', 'venditore', '+39 347 1122334', 'marco.rossi@solarbrand.it', '', 0.0, 0, '2026-08-01T17:53:46.319Z'),
  ('stefano_bianchi', 'Stefano Bianchi', '["Impianto Fotovoltaico 6kW","Impianto Fotovoltaico 10kW + Accumulo","Pompa di Calore High Efficiency","Comunità Energetica (CER)"]', '[]', 'venditore', '+39 335 9988776', 'stefano.bianchi@solarbrand.it', '', 0.0, 0, '2026-08-01T17:53:46.319Z'),
  ('alessandro_neri', 'Alessandro Neri', '["Impianto Fotovoltaico 6kW","Impianto Fotovoltaico 10kW + Accumulo","Pompa di Calore High Efficiency","Comunità Energetica (CER)"]', '[]', 'venditore', '+39 320 5544332', 'alessandro.neri@solarbrand.it', '', 0.0, 0, '2026-08-01T17:53:46.319Z'),
  ('giuseppe_verde', 'Giuseppe Verde', '["Impianto Fotovoltaico 6kW","Impianto Fotovoltaico 10kW + Accumulo","Pompa di Calore High Efficiency","Comunità Energetica (CER)"]', '[]', 'venditore', '+39 340 7766554', 'giuseppe.verde@solarbrand.it', '', 0.0, 0, '2026-08-01T17:53:46.319Z'),
  ('davide_ferrari', 'Davide Ferrari', '["Impianto Fotovoltaico 6kW","Impianto Fotovoltaico 10kW + Accumulo","Pompa di Calore High Efficiency","Comunità Energetica (CER)"]', '[]', 'venditore', '+39 339 2233445', 'davide.ferrari@solarbrand.it', '', 0.0, 0, '2026-08-01T17:53:46.319Z'),
  ('matteo_romano', 'Matteo Romano', '["Impianto Fotovoltaico 6kW","Impianto Fotovoltaico 10kW + Accumulo","Pompa di Calore High Efficiency","Comunità Energetica (CER)"]', '[]', 'venditore', '+39 348 8877665', 'matteo.romano@solarbrand.it', '', 0.0, 0, '2026-08-01T17:53:46.319Z'),
  ('andrea_conti', 'Andrea Conti', '["Impianto Fotovoltaico 6kW","Impianto Fotovoltaico 10kW + Accumulo","Pompa di Calore High Efficiency","Comunità Energetica (CER)"]', '[]', 'venditore', '+39 331 4455667', 'andrea.conti@solarbrand.it', '', 0.0, 0, '2026-08-01T17:53:46.319Z'),
  ('fabio_test', 'Fabio Test', '[]', '[]', 'venditore', '', '', '', 0.0, 0, '2026-08-03T07:58:05.758Z');

-- ------------------------------------------------------------
-- Tabella `sessions`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sessions` (
  `token` VARCHAR(64) PRIMARY KEY,
  `colleagueId` VARCHAR(36) NOT NULL,
  `createdAt` TEXT NOT NULL,
  `expiresAt` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (Tabella `sessions` creata vuota)

-- ------------------------------------------------------------
-- Tabella `oauth_states`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `oauth_states` (
  `state` VARCHAR(64) PRIMARY KEY,
  `vendorId` VARCHAR(36) NOT NULL,
  `createdAt` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (Tabella `oauth_states` creata vuota)

-- ------------------------------------------------------------
-- Tabella `leads`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `leads` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` TEXT NOT NULL,
  `company` TEXT DEFAULT '',
  `phone` TEXT DEFAULT '',
  `email` TEXT DEFAULT '',
  `status` TEXT DEFAULT 'Nuovo',
  `type` TEXT DEFAULT 'Lead',
  `service` TEXT DEFAULT '',
  `services` TEXT DEFAULT '[]',
  `assignedColleague` TEXT DEFAULT '',
  `notes` TEXT DEFAULT '',
  `address` TEXT DEFAULT '',
  `source` TEXT DEFAULT '',
  `quoteStatus` TEXT DEFAULT 'nessuno',
  `quoteDeliveryMethod` TEXT DEFAULT '',
  `quoteFileName` TEXT DEFAULT '',
  `quoteDeliveredAt` TEXT DEFAULT '',
  `createdAt` TEXT NOT NULL,
  `updatedAt` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `leads` (`id`, `name`, `company`, `phone`, `email`, `status`, `type`, `service`, `services`, `assignedColleague`, `notes`, `address`, `source`, `quoteStatus`, `quoteDeliveryMethod`, `quoteFileName`, `quoteDeliveredAt`, `createdAt`, `updatedAt`) VALUES
  ('lead_marco_rossi_1', 'Giovanni Rossi', 'Ristorante La Pergola Srl', '+39 3151483337', 'giovanni.rossi@gmail.com', 'Interessato', 'Lead', 'Impianto Fotovoltaico 10kW + Accumulo', '["Impianto Fotovoltaico 10kW + Accumulo"]', 'Erika', 'Lead interessato a Impianto Fotovoltaico 10kW + Accumulo. Contatto gestito da Erika.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_marco_rossi_2', 'Maria Bianchi', 'Hotel Bellavista SpA', '+39 3530249709', 'maria.bianchi@gmail.com', 'Chiuso con successo', 'Cliente', 'Pompa di Calore High Efficiency', '["Pompa di Calore High Efficiency"]', 'Erika', 'Lead interessato a Pompa di Calore High Efficiency. Contatto gestito da Erika.', 'Via Lungomare 3, Desenzano del Garda', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_marco_rossi_3', 'Luca Moretti', 'Officine Meccaniche Beretta', '+39 3670859999', 'fabioslemer@gmail.com', 'Interessato', 'Lead', 'Impianto Fotovoltaico 10kW + Accumulo', '["Impianto Fotovoltaico 10kW + Accumulo"]', 'Erika', 'Lead interessato a Impianto Fotovoltaico 10kW + Accumulo. Contatto gestito da Erika.', 'Via Montenapoleone 8, Milano', 'demo', 'nessuno', '', '', '2026-08-03T08:26:33.900Z', '2026-08-01T17:53:46.319Z', '2026-08-03T08:26:33.900Z'),
  ('lead_marco_rossi_4', 'Francesca Russo', 'Supermercato Fresco & Più', '+39 3499251281', 'francesca.russo@gmail.com', 'Da richiamare', 'Lead', 'Comunità Energetica (CER)', '["Comunità Energetica (CER)"]', 'Erika', 'Lead interessato a Comunità Energetica (CER). Contatto gestito da Erika.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_marco_rossi_5', 'Roberto Esposito', 'Residenza Villa Serena', '+39 3611136154', 'roberto.esposito@gmail.com', 'Chiamato - Nessuna Risposta', 'Lead', 'Impianto Fotovoltaico 6kW', '["Impianto Fotovoltaico 6kW"]', 'Erika', 'Lead interessato a Impianto Fotovoltaico 6kW. Contatto gestito da Erika.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_marco_rossi_6', 'Elena Ricci', 'Panificio Del Sole Snc', '+39 3783822229', 'elena.ricci@gmail.com', 'Interessato', 'Lead', 'Impianto Fotovoltaico 6kW', '["Impianto Fotovoltaico 6kW"]', 'Erika', 'Lead interessato a Impianto Fotovoltaico 6kW. Contatto gestito da Erika.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_marco_rossi_7', 'Fabio Marini', 'Agriturismo Le Querce', '+39 3477032780', 'fabio.marini@gmail.com', 'Chiuso con successo', 'Cliente', 'Pompa di Calore High Efficiency', '["Pompa di Calore High Efficiency"]', 'Erika', 'Lead interessato a Pompa di Calore High Efficiency. Contatto gestito da Erika.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_marco_rossi_8', 'Chiara Lombardi', 'Autolavaggio Speed Clean', '+39 3730444979', 'chiara.lombardi@gmail.com', 'Non interessato', 'Lead', 'Impianto Fotovoltaico 10kW + Accumulo', '["Impianto Fotovoltaico 10kW + Accumulo"]', 'Erika', 'Lead interessato a Impianto Fotovoltaico 10kW + Accumulo. Contatto gestito da Erika.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_stefano_bianchi_1', 'Paolo Barbieri', 'Ristorante La Pergola Srl', '+39 3369872775', 'paolo.barbieri@gmail.com', 'Interessato', 'Lead', 'Impianto Fotovoltaico 10kW + Accumulo', '["Impianto Fotovoltaico 10kW + Accumulo"]', 'Laura', 'Lead interessato a Impianto Fotovoltaico 10kW + Accumulo. Contatto gestito da Laura.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_stefano_bianchi_2', 'Silvia Fontan', 'Hotel Bellavista SpA', '+39 3239773113', 'silvia.fontan@gmail.com', 'Chiuso con successo', 'Cliente', 'Pompa di Calore High Efficiency', '["Pompa di Calore High Efficiency"]', 'Laura', 'Lead interessato a Pompa di Calore High Efficiency. Contatto gestito da Laura.', 'Via Lungomare 3, Desenzano del Garda', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_stefano_bianchi_3', 'Stefano Colombo', 'Officine Meccaniche Beretta', '+39 3767095298', 'stefano.colombo@gmail.com', 'Nuovo', 'Lead', 'Impianto Fotovoltaico 10kW + Accumulo', '["Impianto Fotovoltaico 10kW + Accumulo"]', 'Laura', 'Lead interessato a Impianto Fotovoltaico 10kW + Accumulo. Contatto gestito da Laura.', 'Via Montenapoleone 8, Milano', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_stefano_bianchi_4', 'Giulia Galli', 'Supermercato Fresco & Più', '+39 3927437603', 'giulia.galli@gmail.com', 'Da richiamare', 'Lead', 'Comunità Energetica (CER)', '["Comunità Energetica (CER)"]', 'Laura', 'Lead interessato a Comunità Energetica (CER). Contatto gestito da Laura.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_stefano_bianchi_5', 'Antonio Conti', 'Residenza Villa Serena', '+39 3241843205', 'antonio.conti@gmail.com', 'Chiamato - Nessuna Risposta', 'Lead', 'Impianto Fotovoltaico 6kW', '["Impianto Fotovoltaico 6kW"]', 'Laura', 'Lead interessato a Impianto Fotovoltaico 6kW. Contatto gestito da Laura.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_stefano_bianchi_6', 'Martina Costa', 'Panificio Del Sole Snc', '+39 3237715864', 'martina.costa@gmail.com', 'Interessato', 'Lead', 'Impianto Fotovoltaico 6kW', '["Impianto Fotovoltaico 6kW"]', 'Laura', 'Lead interessato a Impianto Fotovoltaico 6kW. Contatto gestito da Laura.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_stefano_bianchi_7', 'Daniele De Luca', 'Agriturismo Le Querce', '+39 3408423604', 'daniele.de.luca@gmail.com', 'Chiuso con successo', 'Cliente', 'Pompa di Calore High Efficiency', '["Pompa di Calore High Efficiency"]', 'Laura', 'Lead interessato a Pompa di Calore High Efficiency. Contatto gestito da Laura.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_stefano_bianchi_8', 'Sara Rizzo', 'Autolavaggio Speed Clean', '+39 3728116033', 'sara.rizzo@gmail.com', 'Non interessato', 'Lead', 'Impianto Fotovoltaico 10kW + Accumulo', '["Impianto Fotovoltaico 10kW + Accumulo"]', 'Laura', 'Lead interessato a Impianto Fotovoltaico 10kW + Accumulo. Contatto gestito da Laura.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_alessandro_neri_1', 'Matteo Bruno', 'Ristorante La Pergola Srl', '+39 3531757827', 'matteo.bruno@gmail.com', 'Interessato', 'Lead', 'Impianto Fotovoltaico 10kW + Accumulo', '["Impianto Fotovoltaico 10kW + Accumulo"]', 'Luciana', 'Lead interessato a Impianto Fotovoltaico 10kW + Accumulo. Contatto gestito da Luciana.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_alessandro_neri_2', 'Valentina Manca', 'Hotel Bellavista SpA', '+39 3227397946', 'valentina.manca@gmail.com', 'Chiuso con successo', 'Cliente', 'Pompa di Calore High Efficiency', '["Pompa di Calore High Efficiency"]', 'Luciana', 'Lead interessato a Pompa di Calore High Efficiency. Contatto gestito da Luciana.', 'Via Lungomare 3, Desenzano del Garda', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_alessandro_neri_3', 'Simone Ferri', 'Officine Meccaniche Beretta', '+39 3824082877', 'simone.ferri@gmail.com', 'Nuovo', 'Lead', 'Impianto Fotovoltaico 10kW + Accumulo', '["Impianto Fotovoltaico 10kW + Accumulo"]', 'Luciana', 'Lead interessato a Impianto Fotovoltaico 10kW + Accumulo. Contatto gestito da Luciana.', 'Via Montenapoleone 8, Milano', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_alessandro_neri_4', 'Federica De Santis', 'Supermercato Fresco & Più', '+39 3675249321', 'federica.de.santis@gmail.com', 'Da richiamare', 'Lead', 'Comunità Energetica (CER)', '["Comunità Energetica (CER)"]', 'Luciana', 'Lead interessato a Comunità Energetica (CER). Contatto gestito da Luciana.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_alessandro_neri_5', 'Alberto Sereni', 'Residenza Villa Serena', '+39 3195933975', 'alberto.sereni@gmail.com', 'Chiamato - Nessuna Risposta', 'Lead', 'Impianto Fotovoltaico 6kW', '["Impianto Fotovoltaico 6kW"]', 'Luciana', 'Lead interessato a Impianto Fotovoltaico 6kW. Contatto gestito da Luciana.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_alessandro_neri_6', 'Camilla Piras', 'Panificio Del Sole Snc', '+39 3537257551', 'camilla.piras@gmail.com', 'Interessato', 'Lead', 'Impianto Fotovoltaico 6kW', '["Impianto Fotovoltaico 6kW"]', 'Luciana', 'Lead interessato a Impianto Fotovoltaico 6kW. Contatto gestito da Luciana.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_alessandro_neri_7', 'Enrico Villa', 'Agriturismo Le Querce', '+39 3197799401', 'enrico.villa@gmail.com', 'Chiuso con successo', 'Cliente', 'Pompa di Calore High Efficiency', '["Pompa di Calore High Efficiency"]', 'Luciana', 'Lead interessato a Pompa di Calore High Efficiency. Contatto gestito da Luciana.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_alessandro_neri_8', 'Beatrice Greco', 'Autolavaggio Speed Clean', '+39 3710300482', 'beatrice.greco@gmail.com', 'Non interessato', 'Lead', 'Impianto Fotovoltaico 10kW + Accumulo', '["Impianto Fotovoltaico 10kW + Accumulo"]', 'Luciana', 'Lead interessato a Impianto Fotovoltaico 10kW + Accumulo. Contatto gestito da Luciana.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_giuseppe_verde_1', 'Massimo Gatti', 'Ristorante La Pergola Srl', '+39 3795595014', 'massimo.gatti@gmail.com', 'Interessato', 'Lead', 'Impianto Fotovoltaico 10kW + Accumulo', '["Impianto Fotovoltaico 10kW + Accumulo"]', 'Erika', 'Lead interessato a Impianto Fotovoltaico 10kW + Accumulo. Contatto gestito da Erika.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_giuseppe_verde_2', 'Alessia Serra', 'Hotel Bellavista SpA', '+39 3641486495', 'alessia.serra@gmail.com', 'Chiuso con successo', 'Cliente', 'Pompa di Calore High Efficiency', '["Pompa di Calore High Efficiency"]', 'Erika', 'Lead interessato a Pompa di Calore High Efficiency. Contatto gestito da Erika.', 'Via Lungomare 3, Desenzano del Garda', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_giuseppe_verde_3', 'Claudio Lazzari', 'Officine Meccaniche Beretta', '+39 3121058489', 'fabioslemer@gmail.com', 'Interessato', 'Lead', 'Impianto Fotovoltaico 10kW + Accumulo', '["Impianto Fotovoltaico 10kW + Accumulo"]', 'Erika', 'Lead interessato a Impianto Fotovoltaico 10kW + Accumulo. Contatto gestito da Erika.', 'Via Montenapoleone 8, Milano', 'demo', 'consegnato', 'whatsapp', '', '2026-08-03T08:10:58.201Z', '2026-08-01T17:53:46.319Z', '2026-08-03T08:10:58.205Z'),
  ('lead_giuseppe_verde_4', 'Giorgia Vitale', 'Supermercato Fresco & Più', '+39 3912184742', 'giorgia.vitale@gmail.com', 'Da richiamare', 'Lead', 'Comunità Energetica (CER)', '["Comunità Energetica (CER)"]', 'Erika', 'Lead interessato a Comunità Energetica (CER). Contatto gestito da Erika.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_giuseppe_verde_5', 'Andrea Palmeri', 'Residenza Villa Serena', '+39 3737402654', 'andrea.palmeri@gmail.com', 'Chiamato - Nessuna Risposta', 'Lead', 'Impianto Fotovoltaico 6kW', '["Impianto Fotovoltaico 6kW"]', 'Erika', 'Lead interessato a Impianto Fotovoltaico 6kW. Contatto gestito da Erika.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_giuseppe_verde_6', 'Eleonora Basile', 'Panificio Del Sole Snc', '+39 3227426757', 'eleonora.basile@gmail.com', 'Interessato', 'Lead', 'Impianto Fotovoltaico 6kW', '["Impianto Fotovoltaico 6kW"]', 'Erika', 'Lead interessato a Impianto Fotovoltaico 6kW. Contatto gestito da Erika.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_giuseppe_verde_7', 'Vincenzo Messina', 'Agriturismo Le Querce', '+39 3397284972', 'vincenzo.messina@gmail.com', 'Chiuso con successo', 'Cliente', 'Pompa di Calore High Efficiency', '["Pompa di Calore High Efficiency"]', 'Erika', 'Lead interessato a Pompa di Calore High Efficiency. Contatto gestito da Erika.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_giuseppe_verde_8', 'Claudia Pellegrini', 'Autolavaggio Speed Clean', '+39 3821485336', 'claudia.pellegrini@gmail.com', 'Non interessato', 'Lead', 'Impianto Fotovoltaico 10kW + Accumulo', '["Impianto Fotovoltaico 10kW + Accumulo"]', 'Erika', 'Lead interessato a Impianto Fotovoltaico 10kW + Accumulo. Contatto gestito da Erika.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_davide_ferrari_1', 'Federico Fiore', 'Ristorante La Pergola Srl', '+39 3394151831', 'federico.fiore@gmail.com', 'Interessato', 'Lead', 'Impianto Fotovoltaico 10kW + Accumulo', '["Impianto Fotovoltaico 10kW + Accumulo"]', 'Laura', 'Lead interessato a Impianto Fotovoltaico 10kW + Accumulo. Contatto gestito da Laura.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_davide_ferrari_2', 'Ilaria Monti', 'Hotel Bellavista SpA', '+39 3396148683', 'ilaria.monti@gmail.com', 'Chiuso con successo', 'Cliente', 'Pompa di Calore High Efficiency', '["Pompa di Calore High Efficiency"]', 'Laura', 'Lead interessato a Pompa di Calore High Efficiency. Contatto gestito da Laura.', 'Via Lungomare 3, Desenzano del Garda', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_davide_ferrari_3', 'Gianluca De Angelis', 'Officine Meccaniche Beretta', '+39 3944394692', 'gianluca.de.angelis@gmail.com', 'Nuovo', 'Lead', 'Impianto Fotovoltaico 10kW + Accumulo', '["Impianto Fotovoltaico 10kW + Accumulo"]', 'Laura', 'Lead interessato a Impianto Fotovoltaico 10kW + Accumulo. Contatto gestito da Laura.', 'Via Montenapoleone 8, Milano', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_davide_ferrari_4', 'Nicoletta Parisi', 'Supermercato Fresco & Più', '+39 3515983884', 'nicoletta.parisi@gmail.com', 'Da richiamare', 'Lead', 'Comunità Energetica (CER)', '["Comunità Energetica (CER)"]', 'Laura', 'Lead interessato a Comunità Energetica (CER). Contatto gestito da Laura.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_davide_ferrari_5', 'Riccardo Carbone', 'Residenza Villa Serena', '+39 3613815232', 'riccardo.carbone@gmail.com', 'Chiamato - Nessuna Risposta', 'Lead', 'Impianto Fotovoltaico 6kW', '["Impianto Fotovoltaico 6kW"]', 'Laura', 'Lead interessato a Impianto Fotovoltaico 6kW. Contatto gestito da Laura.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_davide_ferrari_6', 'Denise Rinaldi', 'Panificio Del Sole Snc', '+39 3173519020', 'denise.rinaldi@gmail.com', 'Interessato', 'Lead', 'Impianto Fotovoltaico 6kW', '["Impianto Fotovoltaico 6kW"]', 'Laura', 'Lead interessato a Impianto Fotovoltaico 6kW. Contatto gestito da Laura.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_davide_ferrari_7', 'Valerio Santoro', 'Agriturismo Le Querce', '+39 3999071577', 'valerio.santoro@gmail.com', 'Chiuso con successo', 'Cliente', 'Pompa di Calore High Efficiency', '["Pompa di Calore High Efficiency"]', 'Laura', 'Lead interessato a Pompa di Calore High Efficiency. Contatto gestito da Laura.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_davide_ferrari_8', 'Serena Amato', 'Autolavaggio Speed Clean', '+39 3222151745', 'serena.amato@gmail.com', 'Non interessato', 'Lead', 'Impianto Fotovoltaico 10kW + Accumulo', '["Impianto Fotovoltaico 10kW + Accumulo"]', 'Laura', 'Lead interessato a Impianto Fotovoltaico 10kW + Accumulo. Contatto gestito da Laura.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_matteo_romano_1', 'Davide Silvestri', 'Ristorante La Pergola Srl', '+39 3579796910', 'davide.silvestri@gmail.com', 'Interessato', 'Lead', 'Impianto Fotovoltaico 10kW + Accumulo', '["Impianto Fotovoltaico 10kW + Accumulo"]', 'Luciana', 'Lead interessato a Impianto Fotovoltaico 10kW + Accumulo. Contatto gestito da Luciana.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_matteo_romano_2', 'Monica Riva', 'Hotel Bellavista SpA', '+39 3338393654', 'monica.riva@gmail.com', 'Chiuso con successo', 'Cliente', 'Pompa di Calore High Efficiency', '["Pompa di Calore High Efficiency"]', 'Luciana', 'Lead interessato a Pompa di Calore High Efficiency. Contatto gestito da Luciana.', 'Via Lungomare 3, Desenzano del Garda', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_matteo_romano_3', 'Tommaso Donati', 'Officine Meccaniche Beretta', '+39 3271692381', 'tommaso.donati@gmail.com', 'Nuovo', 'Lead', 'Impianto Fotovoltaico 10kW + Accumulo', '["Impianto Fotovoltaico 10kW + Accumulo"]', 'Luciana', 'Lead interessato a Impianto Fotovoltaico 10kW + Accumulo. Contatto gestito da Luciana.', 'Via Montenapoleone 8, Milano', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_matteo_romano_4', 'Cristina Gallo', 'Supermercato Fresco & Più', '+39 3347809635', 'cristina.gallo@gmail.com', 'Da richiamare', 'Lead', 'Comunità Energetica (CER)', '["Comunità Energetica (CER)"]', 'Luciana', 'Lead interessato a Comunità Energetica (CER). Contatto gestito da Luciana.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_matteo_romano_5', 'Emanuele Longo', 'Residenza Villa Serena', '+39 3450984868', 'emanuele.longo@gmail.com', 'Chiamato - Nessuna Risposta', 'Lead', 'Impianto Fotovoltaico 6kW', '["Impianto Fotovoltaico 6kW"]', 'Luciana', 'Lead interessato a Impianto Fotovoltaico 6kW. Contatto gestito da Luciana.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_matteo_romano_6', 'Chiara Sanna', 'Panificio Del Sole Snc', '+39 3516264497', 'chiara.sanna@gmail.com', 'Interessato', 'Lead', 'Impianto Fotovoltaico 6kW', '["Impianto Fotovoltaico 6kW"]', 'Luciana', 'Lead interessato a Impianto Fotovoltaico 6kW. Contatto gestito da Luciana.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_matteo_romano_7', 'Lorenzo Leone', 'Agriturismo Le Querce', '+39 3214047442', 'lorenzo.leone@gmail.com', 'Chiuso con successo', 'Cliente', 'Pompa di Calore High Efficiency', '["Pompa di Calore High Efficiency"]', 'Luciana', 'Lead interessato a Pompa di Calore High Efficiency. Contatto gestito da Luciana.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_matteo_romano_8', 'Sonia Martinelli', 'Autolavaggio Speed Clean', '+39 3705334017', 'sonia.martinelli@gmail.com', 'Non interessato', 'Lead', 'Impianto Fotovoltaico 10kW + Accumulo', '["Impianto Fotovoltaico 10kW + Accumulo"]', 'Luciana', 'Lead interessato a Impianto Fotovoltaico 10kW + Accumulo. Contatto gestito da Luciana.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_andrea_conti_1', 'Giacomo D\'Amico', 'Ristorante La Pergola Srl', '+39 3163971180', 'giacomo.d.amico@gmail.com', 'Interessato', 'Lead', 'Impianto Fotovoltaico 10kW + Accumulo', '["Impianto Fotovoltaico 10kW + Accumulo"]', 'Erika', 'Lead interessato a Impianto Fotovoltaico 10kW + Accumulo. Contatto gestito da Erika.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_andrea_conti_2', 'Veronica Fabbri', 'Hotel Bellavista SpA', '+39 3611329587', 'veronica.fabbri@gmail.com', 'Chiuso con successo', 'Cliente', 'Pompa di Calore High Efficiency', '["Pompa di Calore High Efficiency"]', 'Erika', 'Lead interessato a Pompa di Calore High Efficiency. Contatto gestito da Erika.', 'Via Lungomare 3, Desenzano del Garda', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_andrea_conti_3', 'Michele Testa', 'Officine Meccaniche Beretta', '+39 3756066525', 'fabioslemer@gmail.com', 'Interessato', 'Lead', 'Impianto Fotovoltaico 10kW + Accumulo', '["Impianto Fotovoltaico 10kW + Accumulo"]', 'Erika', 'Lead interessato a Impianto Fotovoltaico 10kW + Accumulo. Contatto gestito da Erika.', 'Via Montenapoleone 8, Milano', 'demo', 'nessuno', '', '', '2026-08-03T08:22:07.438Z', '2026-08-01T17:53:46.319Z', '2026-08-03T08:23:33.651Z'),
  ('lead_andrea_conti_4', 'Tiziana Bellini', 'Supermercato Fresco & Più', '+39 3106271558', 'tiziana.bellini@gmail.com', 'Da richiamare', 'Lead', 'Comunità Energetica (CER)', '["Comunità Energetica (CER)"]', 'Erika', 'Lead interessato a Comunità Energetica (CER). Contatto gestito da Erika.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_andrea_conti_5', 'Maurizio Mariani', 'Residenza Villa Serena', '+39 3695627863', 'maurizio.mariani@gmail.com', 'Chiamato - Nessuna Risposta', 'Lead', 'Impianto Fotovoltaico 6kW', '["Impianto Fotovoltaico 6kW"]', 'Erika', 'Lead interessato a Impianto Fotovoltaico 6kW. Contatto gestito da Erika.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_andrea_conti_6', 'Serafina Conti', 'Panificio Del Sole Snc', '+39 3486661862', 'serafina.conti@gmail.com', 'Interessato', 'Lead', 'Impianto Fotovoltaico 6kW', '["Impianto Fotovoltaico 6kW"]', 'Erika', 'Lead interessato a Impianto Fotovoltaico 6kW. Contatto gestito da Erika.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_andrea_conti_7', 'Pietro Giordano', 'Agriturismo Le Querce', '+39 3437190001', 'pietro.giordano@gmail.com', 'Chiuso con successo', 'Cliente', 'Pompa di Calore High Efficiency', '["Pompa di Calore High Efficiency"]', 'Erika', 'Lead interessato a Pompa di Calore High Efficiency. Contatto gestito da Erika.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('lead_andrea_conti_8', 'Patrizia Ferrara', 'Autolavaggio Speed Clean', '+39 3806185720', 'patrizia.ferrara@gmail.com', 'Non interessato', 'Lead', 'Impianto Fotovoltaico 10kW + Accumulo', '["Impianto Fotovoltaico 10kW + Accumulo"]', 'Erika', 'Lead interessato a Impianto Fotovoltaico 10kW + Accumulo. Contatto gestito da Erika.', '', 'demo', 'nessuno', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('0e2f8c7c-cda8-49b4-964c-61736d6adbbf', 'Mario Rossi DeGrigi', 'DeGrigi srl', '+3965740121564', 'fabioslemer@gmail.com', 'Interessato', 'Lead', '', '[]', 'Erika', '', '', 'manual', 'nessuno', '', '', '2026-08-03T08:34:54.922Z', '2026-08-03T08:32:17.536Z', '2026-08-03T08:34:54.922Z');

-- ------------------------------------------------------------
-- Tabella `history`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `history` (
  `id` VARCHAR(36) PRIMARY KEY,
  `leadId` VARCHAR(36) NOT NULL,
  `timestamp` TEXT NOT NULL,
  `colleague` TEXT DEFAULT '',
  `note` TEXT DEFAULT '',
  `statusAfterCall` TEXT DEFAULT '',
  `type` TEXT DEFAULT 'note',
  `attachmentName` TEXT DEFAULT '',
  `attachmentUrl` TEXT DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `history` (`id`, `leadId`, `timestamp`, `colleague`, `note`, `statusAfterCall`, `type`, `attachmentName`, `attachmentUrl`) VALUES
  ('69d048be-51bf-471a-8056-552e2c3252b3', 'lead_giuseppe_verde_3', '2026-08-03T08:10:58.205Z', 'Fabio Test', '[Report Sopralluogo Fabio Test] ✓ SOPRALLUOGO EFFETTUATO (🏢 Azienda - 20 kWp). ', 'Interessato', 'visit_report', '', ''),
  ('e0ab7cd8-9885-46d7-ac7c-2c84bf73f376', 'lead_giuseppe_verde_3', '2026-08-03T08:10:58.205Z', 'Fabio Test', '📄 [PREVENTIVO CONSEGNATO] Modalità: 📱 Inviato via WhatsApp. ', 'Interessato', 'quote', '', ''),
  ('97d70258-a7b1-4c50-b427-aaed3f24c999', 'lead_andrea_conti_3', '2026-08-03T08:22:07.438Z', 'Fabio Test', '[Report Sopralluogo Fabio Test] ✓ SOPRALLUOGO EFFETTUATO (🏢 Azienda - 80 kWp | 🔥 Pompa di Calore: SÌ). ', 'Interessato', 'visit_report', '', ''),
  ('63ca118b-31af-4dd2-8d04-9425a14215fd', 'lead_marco_rossi_3', '2026-08-03T08:26:33.900Z', 'Fabio Test', '[Report Sopralluogo Fabio Test] ✓ SOPRALLUOGO EFFETTUATO (🏢 Azienda - 80 kWp). ', 'Interessato', 'visit_report', '', ''),
  ('4063ad54-e3d2-4766-bfac-66fdbbfb6cd0', '0e2f8c7c-cda8-49b4-964c-61736d6adbbf', '2026-08-03T08:34:54.922Z', 'Fabio Test', '[Report Sopralluogo Fabio Test] ✓ SOPRALLUOGO EFFETTUATO (🏢 Azienda - 20 kWp | 🔥 Pompa di Calore: SÌ). ', 'Interessato', 'visit_report', '', ''),
  ('6263ea5a-f8d4-4fd0-a804-fe2430e61812', '0e2f8c7c-cda8-49b4-964c-61736d6adbbf', '2026-08-03T08:34:54.922Z', 'Fabio Test', '[EMAIL POST-SOPRALLUOGO INVIATA] Email di ringraziamento inviata a fabioslemer@gmail.com', 'Interessato', 'email', '', '');

-- ------------------------------------------------------------
-- Tabella `appointments`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `appointments` (
  `id` VARCHAR(36) PRIMARY KEY,
  `leadId` VARCHAR(36) NOT NULL,
  `leadName` TEXT DEFAULT '',
  `colleague` TEXT DEFAULT '',
  `assignedVendor` TEXT DEFAULT '',
  `dateTime` TEXT NOT NULL,
  `title` TEXT DEFAULT '',
  `notes` TEXT DEFAULT '',
  `appointmentType` TEXT DEFAULT 'visit',
  `googleEventId` TEXT DEFAULT '',
  `vendorGoogleEventId` TEXT DEFAULT '',
  `visitStatus` TEXT DEFAULT 'pending',
  `visitCompletedAt` TEXT DEFAULT '',
  `completed` TEXT DEFAULT 'false',
  `createdAt` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `appointments` (`id`, `leadId`, `leadName`, `colleague`, `assignedVendor`, `dateTime`, `title`, `notes`, `appointmentType`, `googleEventId`, `vendorGoogleEventId`, `visitStatus`, `visitCompletedAt`, `completed`, `createdAt`) VALUES
  ('appt_marco_rossi_1', 'lead_marco_rossi_1', 'Giovanni Rossi', 'Erika', 'Marco Rossi', '2026-07-30T17:53:46.322Z', 'Sopralluogo Tecnico Impianto Fotovoltaico 10kW + Accumulo', 'Appuntamento fissato da Erika per l\'agente Marco Rossi', 'visit', '', '', 'completed', '', 'true', '2026-08-01T17:53:46.319Z'),
  ('appt_marco_rossi_2', 'lead_marco_rossi_2', 'Maria Bianchi', 'Erika', 'Marco Rossi', '2026-08-01T17:53:46.322Z', 'Sopralluogo Tecnico Pompa di Calore High Efficiency', 'Appuntamento fissato da Erika per l\'agente Marco Rossi', 'visit', '', '', 'pending', '', 'false', '2026-08-01T17:53:46.319Z'),
  ('appt_marco_rossi_3', 'lead_marco_rossi_3', 'Luca Moretti', 'Erika', 'Marco Rossi', '2026-08-03T17:53:46.322Z', 'Sopralluogo Tecnico Impianto Fotovoltaico 10kW + Accumulo', 'Appuntamento fissato da Erika per l\'agente Marco Rossi', 'visit', '', '', 'pending', '', 'false', '2026-08-01T17:53:46.319Z'),
  ('appt_stefano_bianchi_1', 'lead_stefano_bianchi_1', 'Paolo Barbieri', 'Laura', 'Stefano Bianchi', '2026-07-30T17:53:46.323Z', 'Sopralluogo Tecnico Impianto Fotovoltaico 10kW + Accumulo', 'Appuntamento fissato da Laura per l\'agente Stefano Bianchi', 'visit', '', '', 'completed', '', 'true', '2026-08-01T17:53:46.319Z'),
  ('appt_stefano_bianchi_2', 'lead_stefano_bianchi_2', 'Silvia Fontan', 'Laura', 'Stefano Bianchi', '2026-08-01T17:53:46.323Z', 'Sopralluogo Tecnico Pompa di Calore High Efficiency', 'Appuntamento fissato da Laura per l\'agente Stefano Bianchi', 'visit', '', '', 'pending', '', 'false', '2026-08-01T17:53:46.319Z'),
  ('appt_stefano_bianchi_3', 'lead_stefano_bianchi_3', 'Stefano Colombo', 'Laura', 'Stefano Bianchi', '2026-08-03T17:53:46.323Z', 'Sopralluogo Tecnico Impianto Fotovoltaico 10kW + Accumulo', 'Appuntamento fissato da Laura per l\'agente Stefano Bianchi', 'visit', '', '', 'pending', '', 'false', '2026-08-01T17:53:46.319Z'),
  ('appt_alessandro_neri_1', 'lead_alessandro_neri_1', 'Matteo Bruno', 'Luciana', 'Alessandro Neri', '2026-07-30T17:53:46.324Z', 'Sopralluogo Tecnico Impianto Fotovoltaico 10kW + Accumulo', 'Appuntamento fissato da Luciana per l\'agente Alessandro Neri', 'visit', '', '', 'completed', '', 'true', '2026-08-01T17:53:46.319Z'),
  ('appt_alessandro_neri_2', 'lead_alessandro_neri_2', 'Valentina Manca', 'Luciana', 'Alessandro Neri', '2026-08-01T17:53:46.324Z', 'Sopralluogo Tecnico Pompa di Calore High Efficiency', 'Appuntamento fissato da Luciana per l\'agente Alessandro Neri', 'visit', '', '', 'pending', '', 'false', '2026-08-01T17:53:46.319Z'),
  ('appt_alessandro_neri_3', 'lead_alessandro_neri_3', 'Simone Ferri', 'Luciana', 'Alessandro Neri', '2026-08-03T17:53:46.324Z', 'Sopralluogo Tecnico Impianto Fotovoltaico 10kW + Accumulo', 'Appuntamento fissato da Luciana per l\'agente Alessandro Neri', 'visit', '', '', 'pending', '', 'false', '2026-08-01T17:53:46.319Z'),
  ('appt_giuseppe_verde_1', 'lead_giuseppe_verde_1', 'Massimo Gatti', 'Erika', 'Giuseppe Verde', '2026-07-30T17:53:46.324Z', 'Sopralluogo Tecnico Impianto Fotovoltaico 10kW + Accumulo', 'Appuntamento fissato da Erika per l\'agente Giuseppe Verde', 'visit', '', '', 'completed', '', 'true', '2026-08-01T17:53:46.319Z'),
  ('appt_giuseppe_verde_2', 'lead_giuseppe_verde_2', 'Alessia Serra', 'Erika', 'Giuseppe Verde', '2026-08-01T17:53:46.325Z', 'Sopralluogo Tecnico Pompa di Calore High Efficiency', 'Appuntamento fissato da Erika per l\'agente Giuseppe Verde', 'visit', '', '', 'pending', '', 'false', '2026-08-01T17:53:46.319Z'),
  ('appt_giuseppe_verde_3', 'lead_giuseppe_verde_3', 'Claudio Lazzari', 'Erika', 'Giuseppe Verde', '2026-08-03T17:53:46.325Z', 'Sopralluogo Tecnico Impianto Fotovoltaico 10kW + Accumulo', 'Appuntamento fissato da Erika per l\'agente Giuseppe Verde', 'visit', '', '', 'pending', '', 'false', '2026-08-01T17:53:46.319Z'),
  ('appt_davide_ferrari_1', 'lead_davide_ferrari_1', 'Federico Fiore', 'Laura', 'Davide Ferrari', '2026-07-30T17:53:46.325Z', 'Sopralluogo Tecnico Impianto Fotovoltaico 10kW + Accumulo', 'Appuntamento fissato da Laura per l\'agente Davide Ferrari', 'visit', '', '', 'completed', '', 'true', '2026-08-01T17:53:46.319Z'),
  ('appt_davide_ferrari_2', 'lead_davide_ferrari_2', 'Ilaria Monti', 'Laura', 'Davide Ferrari', '2026-08-01T17:53:46.325Z', 'Sopralluogo Tecnico Pompa di Calore High Efficiency', 'Appuntamento fissato da Laura per l\'agente Davide Ferrari', 'visit', '', '', 'pending', '', 'false', '2026-08-01T17:53:46.319Z'),
  ('appt_davide_ferrari_3', 'lead_davide_ferrari_3', 'Gianluca De Angelis', 'Laura', 'Davide Ferrari', '2026-08-03T17:53:46.325Z', 'Sopralluogo Tecnico Impianto Fotovoltaico 10kW + Accumulo', 'Appuntamento fissato da Laura per l\'agente Davide Ferrari', 'visit', '', '', 'pending', '', 'false', '2026-08-01T17:53:46.319Z'),
  ('appt_matteo_romano_1', 'lead_matteo_romano_1', 'Davide Silvestri', 'Luciana', 'Matteo Romano', '2026-07-30T17:53:46.325Z', 'Sopralluogo Tecnico Impianto Fotovoltaico 10kW + Accumulo', 'Appuntamento fissato da Luciana per l\'agente Matteo Romano', 'visit', '', '', 'completed', '', 'true', '2026-08-01T17:53:46.319Z'),
  ('appt_matteo_romano_2', 'lead_matteo_romano_2', 'Monica Riva', 'Luciana', 'Matteo Romano', '2026-08-01T17:53:46.326Z', 'Sopralluogo Tecnico Pompa di Calore High Efficiency', 'Appuntamento fissato da Luciana per l\'agente Matteo Romano', 'visit', '', '', 'pending', '', 'false', '2026-08-01T17:53:46.319Z'),
  ('appt_matteo_romano_3', 'lead_matteo_romano_3', 'Tommaso Donati', 'Luciana', 'Matteo Romano', '2026-08-03T17:53:46.326Z', 'Sopralluogo Tecnico Impianto Fotovoltaico 10kW + Accumulo', 'Appuntamento fissato da Luciana per l\'agente Matteo Romano', 'visit', '', '', 'pending', '', 'false', '2026-08-01T17:53:46.319Z'),
  ('appt_andrea_conti_1', 'lead_andrea_conti_1', 'Giacomo D\'Amico', 'Erika', 'Andrea Conti', '2026-07-30T17:53:46.326Z', 'Sopralluogo Tecnico Impianto Fotovoltaico 10kW + Accumulo', 'Appuntamento fissato da Erika per l\'agente Andrea Conti', 'visit', '', '', 'completed', '', 'true', '2026-08-01T17:53:46.319Z'),
  ('appt_andrea_conti_2', 'lead_andrea_conti_2', 'Veronica Fabbri', 'Erika', 'Andrea Conti', '2026-08-01T17:53:46.326Z', 'Sopralluogo Tecnico Pompa di Calore High Efficiency', 'Appuntamento fissato da Erika per l\'agente Andrea Conti', 'visit', '', '', 'pending', '', 'false', '2026-08-01T17:53:46.319Z'),
  ('appt_andrea_conti_3', 'lead_andrea_conti_3', 'Michele Testa', 'Erika', 'Andrea Conti', '2026-08-03T17:53:46.326Z', 'Sopralluogo Tecnico Impianto Fotovoltaico 10kW + Accumulo', 'Appuntamento fissato da Erika per l\'agente Andrea Conti', 'visit', '', '', 'pending', '', 'false', '2026-08-01T17:53:46.319Z'),
  ('8df1507b-a148-4531-a835-9c8dd40929ff', 'lead_marco_rossi_3', 'Luca Moretti', 'Fabio Test', 'Erika', '2026-08-03T10:00', 'Sopralluogo: Luca Moretti', '', 'visit', '', '', 'pending', '', 'false', '2026-08-03T07:58:42.329Z'),
  ('a3adc507-3847-403b-8acd-6ff5bbcf19f8', 'lead_giuseppe_verde_3', 'Claudio Lazzari', 'Erika', 'Fabio Test', '2026-08-03T10:11', 'Sopralluogo: Claudio Lazzari', '', 'visit', '', '', 'completed', '2026-08-03T08:10:58.205Z', 'false', '2026-08-03T08:09:37.207Z'),
  ('4ac3bed5-13d0-4cb6-8757-e0a83738c83f', 'lead_andrea_conti_3', 'Michele Testa', 'Erika', 'Fabio Test', '2026-08-03T10:21', 'Sopralluogo: Michele Testa', 'Suona campanello Ufficio, non Fabbrica', 'visit', '', '', 'completed', '2026-08-03T08:22:07.438Z', 'false', '2026-08-03T08:20:05.752Z'),
  ('0de551b4-8c9c-4157-90bb-1fbdf41980a6', 'lead_marco_rossi_3', 'Luca Moretti', 'Erika', 'Fabio Test', '2026-08-03T10:25', 'Sopralluogo: Luca Moretti', '', 'visit', '', '', 'completed', '2026-08-03T08:26:33.900Z', 'false', '2026-08-03T08:24:24.252Z'),
  ('ebd5f1e6-a047-4601-ade7-6953148fc847', '0e2f8c7c-cda8-49b4-964c-61736d6adbbf', 'Mario Rossi DeGrigi', 'Erika', 'Fabio Test', '2026-08-03T10:33', 'Sopralluogo: Mario Rossi DeGrigi', '', 'visit', '', '', 'completed', '2026-08-03T08:34:54.922Z', 'false', '2026-08-03T08:32:38.753Z');

-- ------------------------------------------------------------
-- Tabella `visit_reports`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `visit_reports` (
  `id` VARCHAR(36) PRIMARY KEY,
  `appointmentId` VARCHAR(36) NOT NULL,
  `leadId` VARCHAR(36) NOT NULL,
  `vendorName` TEXT DEFAULT '',
  `visitDate` TEXT NOT NULL,
  `visitStatus` TEXT DEFAULT 'effettuato',
  `clientType` TEXT DEFAULT 'residenziale',
  `kwpSystem` DOUBLE DEFAULT 0,
  `hasHeatPump` INT DEFAULT 0,
  `outcome` TEXT DEFAULT '',
  `contractValue` DOUBLE DEFAULT 0,
  `notes` TEXT DEFAULT '',
  `nextAction` TEXT DEFAULT '',
  `roofType` TEXT DEFAULT '',
  `consumption` DOUBLE DEFAULT 0,
  `photos` MEDIUMTEXT DEFAULT NULL,
  `quoteStatus` TEXT DEFAULT 'nessuno',
  `quoteDeliveryMethod` TEXT DEFAULT '',
  `quoteFileName` TEXT DEFAULT '',
  `quoteFileData` LONGTEXT DEFAULT NULL,
  `quoteDeliveredAt` TEXT DEFAULT '',
  `createdAt` TEXT NOT NULL,
  `updatedAt` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `visit_reports` (`id`, `appointmentId`, `leadId`, `vendorName`, `visitDate`, `visitStatus`, `clientType`, `kwpSystem`, `hasHeatPump`, `outcome`, `contractValue`, `notes`, `nextAction`, `roofType`, `consumption`, `photos`, `quoteStatus`, `quoteDeliveryMethod`, `quoteFileName`, `quoteFileData`, `quoteDeliveredAt`, `createdAt`, `updatedAt`) VALUES
  ('report_appt_marco_rossi_1', 'appt_marco_rossi_1', 'lead_marco_rossi_1', 'Marco Rossi', '2026-07-30T17:53:46.322Z', 'effettuato', 'residenziale', 10.0, 0, 'contratto_firmato', 14500.0, 'Sopralluogo effettuato con esito positivo. Cliente entusiasta dell\'impianto 10kW.', 'Inviare documentazione per allaccio in rete', 'A falde (Tegole)', 5500.0, '[]', 'nessuno', '', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('report_appt_stefano_bianchi_1', 'appt_stefano_bianchi_1', 'lead_stefano_bianchi_1', 'Stefano Bianchi', '2026-07-30T17:53:46.323Z', 'effettuato', 'residenziale', 10.0, 0, 'contratto_firmato', 14500.0, 'Sopralluogo effettuato con esito positivo. Cliente entusiasta dell\'impianto 10kW.', 'Inviare documentazione per allaccio in rete', 'A falde (Tegole)', 5500.0, '[]', 'nessuno', '', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('report_appt_alessandro_neri_1', 'appt_alessandro_neri_1', 'lead_alessandro_neri_1', 'Alessandro Neri', '2026-07-30T17:53:46.324Z', 'effettuato', 'residenziale', 10.0, 0, 'contratto_firmato', 14500.0, 'Sopralluogo effettuato con esito positivo. Cliente entusiasta dell\'impianto 10kW.', 'Inviare documentazione per allaccio in rete', 'A falde (Tegole)', 5500.0, '[]', 'nessuno', '', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('report_appt_giuseppe_verde_1', 'appt_giuseppe_verde_1', 'lead_giuseppe_verde_1', 'Giuseppe Verde', '2026-07-30T17:53:46.324Z', 'effettuato', 'residenziale', 10.0, 0, 'contratto_firmato', 14500.0, 'Sopralluogo effettuato con esito positivo. Cliente entusiasta dell\'impianto 10kW.', 'Inviare documentazione per allaccio in rete', 'A falde (Tegole)', 5500.0, '[]', 'nessuno', '', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('report_appt_davide_ferrari_1', 'appt_davide_ferrari_1', 'lead_davide_ferrari_1', 'Davide Ferrari', '2026-07-30T17:53:46.325Z', 'effettuato', 'residenziale', 10.0, 0, 'contratto_firmato', 14500.0, 'Sopralluogo effettuato con esito positivo. Cliente entusiasta dell\'impianto 10kW.', 'Inviare documentazione per allaccio in rete', 'A falde (Tegole)', 5500.0, '[]', 'nessuno', '', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('report_appt_matteo_romano_1', 'appt_matteo_romano_1', 'lead_matteo_romano_1', 'Matteo Romano', '2026-07-30T17:53:46.325Z', 'effettuato', 'residenziale', 10.0, 0, 'contratto_firmato', 14500.0, 'Sopralluogo effettuato con esito positivo. Cliente entusiasta dell\'impianto 10kW.', 'Inviare documentazione per allaccio in rete', 'A falde (Tegole)', 5500.0, '[]', 'nessuno', '', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('report_appt_andrea_conti_1', 'appt_andrea_conti_1', 'lead_andrea_conti_1', 'Andrea Conti', '2026-07-30T17:53:46.326Z', 'effettuato', 'residenziale', 10.0, 0, 'contratto_firmato', 14500.0, 'Sopralluogo effettuato con esito positivo. Cliente entusiasta dell\'impianto 10kW.', 'Inviare documentazione per allaccio in rete', 'A falde (Tegole)', 5500.0, '[]', 'nessuno', '', '', '', '', '2026-08-01T17:53:46.319Z', '2026-08-01T17:53:46.319Z'),
  ('64911b5e-c5a0-4564-b612-dc9796ef4421', 'a3adc507-3847-403b-8acd-6ff5bbcf19f8', 'lead_giuseppe_verde_3', 'Fabio Test', '2026-08-03T08:10:58.201Z', 'effettuato', 'azienda', 20.0, 0, 'trattativa_in_corso', 0.0, '', '', '', 0.0, '[]', 'consegnato', 'whatsapp', '', '', '2026-08-03T08:10:58.201Z', '2026-08-03T08:10:58.205Z', '2026-08-03T08:10:58.205Z'),
  ('6155a278-c1c9-478f-b6a0-61429830df80', '4ac3bed5-13d0-4cb6-8757-e0a83738c83f', 'lead_andrea_conti_3', 'Fabio Test', '2026-08-03T08:22:07.439Z', 'effettuato', 'azienda', 80.0, 1, 'trattativa_in_corso', 0.0, '', '', '', 0.0, '[]', 'nessuno', '', '', '', '', '2026-08-03T08:22:07.438Z', '2026-08-03T08:22:07.438Z'),
  ('a27a9ff2-4d0e-43a6-b0f8-6063e0ea97be', '0de551b4-8c9c-4157-90bb-1fbdf41980a6', 'lead_marco_rossi_3', 'Fabio Test', '2026-08-03T08:26:33.899Z', 'effettuato', 'azienda', 80.0, 0, 'da_ricontattare', 0.0, '', '', '', 0.0, '[]', 'nessuno', '', '', '', '', '2026-08-03T08:26:33.900Z', '2026-08-03T08:26:33.900Z'),
  ('d0dfb9b0-c5b7-4cb3-a999-ee31fa65423a', 'ebd5f1e6-a047-4601-ade7-6953148fc847', '0e2f8c7c-cda8-49b4-964c-61736d6adbbf', 'Fabio Test', '2026-08-03T08:34:54.920Z', 'effettuato', 'azienda', 20.0, 1, 'trattativa_in_corso', 0.0, '', '', '', 0.0, '[]', 'nessuno', '', '', '', '', '2026-08-03T08:34:54.922Z', '2026-08-03T08:34:54.922Z');

-- ------------------------------------------------------------
-- Tabella `tasks`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` VARCHAR(36) PRIMARY KEY,
  `leadId` VARCHAR(36) NOT NULL,
  `leadName` TEXT DEFAULT '',
  `createdBy` TEXT DEFAULT '',
  `assignedTo` TEXT DEFAULT '',
  `description` TEXT DEFAULT '',
  `dueDate` TEXT DEFAULT '',
  `completed` TEXT DEFAULT 'false',
  `createdAt` TEXT NOT NULL,
  `googleEventId` TEXT DEFAULT '',
  `appointmentId` TEXT DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (Nessun dato presente per `tasks`)

-- ------------------------------------------------------------
-- Tabella `smtp_accounts`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `smtp_accounts` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` TEXT NOT NULL,
  `host` TEXT DEFAULT '',
  `port` TEXT DEFAULT '587',
  `user_email` TEXT DEFAULT '',
  `pass` TEXT DEFAULT '',
  `createdAt` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `smtp_accounts` (`id`, `name`, `host`, `port`, `user_email`, `pass`, `createdAt`) VALUES
  ('f5137e1a-ebed-4e14-9201-658658415c89', 'fabio@kilogramsolutions.it', 'smtp.hostinger.com', '587', 'fabio@kilogramsolutions.it', '123Noscusa!1234', '2026-08-03T07:40:05.850Z');

-- ------------------------------------------------------------
-- Tabella `imap_accounts`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `imap_accounts` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` TEXT NOT NULL,
  `host` TEXT DEFAULT '',
  `port` TEXT DEFAULT '993',
  `user_email` TEXT DEFAULT '',
  `pass` TEXT DEFAULT '',
  `useSSL` INT DEFAULT 1,
  `lastChecked` TEXT DEFAULT '',
  `createdAt` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (Tabella `imap_accounts` creata vuota)

-- ------------------------------------------------------------
-- Tabella `email_templates`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `email_templates` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` TEXT NOT NULL,
  `subject` TEXT DEFAULT '',
  `body` LONGTEXT DEFAULT NULL,
  `templateType` TEXT DEFAULT 'custom',
  `createdAt` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `email_templates` (`id`, `name`, `subject`, `body`, `templateType`, `createdAt`) VALUES
  ('d8367e7d-7cf6-4b3f-9f63-59dd762772b3', 'Primo followup', 'Come da telefonata', 'Gentile {nome}\n\nCome da telefonata, Le scrivo per riepilogare i vantaggi che avrebbe la sua azienda {azienda} con il nostro {servizio}.\n\nDi seguito i vantaggi:', 'custom', '2026-08-02T15:29:56.568Z'),
  ('tpl-post-visit', 'Ringraziamento Post-Sopralluogo', 'Ringraziamento a seguito del sopralluogo effettuato - SolarBrand', '<p>Gentile <strong>{nome}</strong>,</p><p>La ringraziamo per il tempo che ci ha dedicato durante il sopralluogo svolto dal nostro consulente <strong>{agente}</strong>.</p><p>A nome della nostra azienda, Le confermiamo che rimaniamo a Sua completa disposizione per qualsiasi chiarimento o approfondimento sulle soluzioni energetiche analizzate.</p><p>Un cordiale saluto,<br><strong>SolarBrand</strong></p>', 'post_visit', '2026-08-03T07:55:06.443Z'),
  ('tpl-review-request', 'Richiesta Recensione Consulente', 'Come valuti la tua esperienza con il nostro consulente? - SolarBrand', '<p>Gentile <strong>{nome}</strong>,</p><p>Grazie per aver scelto SolarBrand! Ci piacerebbe conoscere la tua opinione sul servizio offerto dal consulente <strong>{agente}</strong> che ti ha seguito.</p><p>Ti chiediamo solo un minuto per lasciare una valutazione con un voto da 1 a 5 stelle al seguente link:</p><p style="text-align: center; margin: 25px 0;"><a href="{link_recensione}" style="background-color: #f59e0b; color: #ffffff; padding: 12px 24px; font-weight: bold; text-decoration: none; border-radius: 8px; display: inline-block;">★ Lascia la tua valutazione ★</a></p><p>Se il pulsante non funziona, puoi copiare e incollare questo link nel tuo browser:<br><a href="{link_recensione}">{link_recensione}</a></p><p>Grazie per il tuo prezioso contributo!<br><strong>SolarBrand</strong></p>', 'review_request', '2026-08-03T07:55:06.443Z');

-- ------------------------------------------------------------
-- Tabella `sms_templates`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sms_templates` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` TEXT NOT NULL,
  `body` TEXT DEFAULT '',
  `createdAt` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `sms_templates` (`id`, `name`, `body`, `createdAt`) VALUES
  ('d8768914-9f9d-4681-a3bc-9591d253b887', 'Non risposto', 'Salve {nome}\n\nHo provato a chiamarLa ma non sono riuscita a contattarla. Le scrivo per chiederLe un orario in cui avere una coversazione con Lei o il suo staff.', '2026-08-02T15:31:37.964Z');

-- ------------------------------------------------------------
-- Tabella `settings`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `key` VARCHAR(191) PRIMARY KEY,
  `value` TEXT DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (Nessun dato presente per `settings`)

-- ------------------------------------------------------------
-- Tabella `reviews`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` VARCHAR(36) PRIMARY KEY,
  `leadId` TEXT DEFAULT '',
  `vendorName` TEXT DEFAULT '',
  `rating` INT DEFAULT 5,
  `comment` TEXT DEFAULT '',
  `token` VARCHAR(36) UNIQUE,
  `usedAt` TEXT DEFAULT '',
  `createdAt` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (Nessun dato presente per `reviews`)

-- ------------------------------------------------------------
-- Tabella `lead_attachments`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `lead_attachments` (
  `id` VARCHAR(36) PRIMARY KEY,
  `leadId` VARCHAR(36) NOT NULL,
  `description` TEXT NOT NULL,
  `fileName` TEXT NOT NULL,
  `filePath` TEXT NOT NULL,
  `fileSize` INT DEFAULT 0,
  `mimeType` TEXT DEFAULT '',
  `uploadedBy` TEXT NOT NULL,
  `createdAt` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (Nessun dato presente per `lead_attachments`)

-- ------------------------------------------------------------
-- Tabella `email_campaigns`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `email_campaigns` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` TEXT NOT NULL,
  `templateId` VARCHAR(36) NOT NULL,
  `smtpId` VARCHAR(36) NOT NULL,
  `status` TEXT DEFAULT 'draft',
  `totalSent` INT DEFAULT 0,
  `totalOpened` INT DEFAULT 0,
  `totalClicked` INT DEFAULT 0,
  `totalReplied` INT DEFAULT 0,
  `sendDelay` INT DEFAULT 3,
  `createdBy` TEXT DEFAULT '',
  `createdAt` TEXT NOT NULL,
  `sentAt` TEXT DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (Tabella `email_campaigns` creata vuota)

-- ------------------------------------------------------------
-- Tabella `email_campaign_recipients`
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `email_campaign_recipients` (
  `id` VARCHAR(36) PRIMARY KEY,
  `campaignId` VARCHAR(36) NOT NULL,
  `leadId` VARCHAR(36) NOT NULL,
  `email` TEXT NOT NULL,
  `leadName` TEXT DEFAULT '',
  `status` TEXT DEFAULT 'pending',
  `openedAt` TEXT DEFAULT '',
  `clickedAt` TEXT DEFAULT '',
  `repliedAt` TEXT DEFAULT '',
  `replyText` TEXT DEFAULT '',
  `messageId` TEXT DEFAULT '',
  `sentAt` TEXT DEFAULT '',
  `errorMsg` TEXT DEFAULT ''
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (Tabella `email_campaign_recipients` creata vuota)

SET FOREIGN_KEY_CHECKS = 1;
-- Fine dump
