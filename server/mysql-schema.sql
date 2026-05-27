-- ============================================================
-- CaltransBizConnect - MySQL Schema
-- Compatible with Hostinger MySQL 8.0+
-- Run this FIRST in Hostinger phpMyAdmin or MySQL client
-- BEFORE importing the data export file.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;

-- ============================================================
-- USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
    `id`                   INT           NOT NULL AUTO_INCREMENT,
    `email`                VARCHAR(255)  NOT NULL,
    `password_hash`        VARCHAR(255)  NOT NULL,
    `type`                 VARCHAR(50)   NOT NULL,
    `business_name`        VARCHAR(255)  DEFAULT NULL,
    `contact_name`         VARCHAR(255)  DEFAULT NULL,
    `phone`                VARCHAR(50)   DEFAULT NULL,
    `ein`                  VARCHAR(50)   DEFAULT NULL,
    `certification_number` VARCHAR(100)  DEFAULT NULL,
    `business_description` TEXT          DEFAULT NULL,
    `organization_name`    VARCHAR(255)  DEFAULT NULL,
    `districts`            TEXT          DEFAULT NULL,
    `categories`           TEXT          DEFAULT NULL,
    `status`               VARCHAR(50)   NOT NULL DEFAULT 'active',
    `created_at`           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `saved_opportunities`  TEXT          DEFAULT NULL,
    `capability_statement` TEXT          DEFAULT NULL,
    `website`              VARCHAR(500)  DEFAULT NULL,
    `address`              VARCHAR(500)  DEFAULT NULL,
    `city`                 VARCHAR(100)  DEFAULT NULL,
    `state`                VARCHAR(50)   DEFAULT NULL,
    `zip`                  VARCHAR(20)   DEFAULT NULL,
    `years_in_business`    VARCHAR(50)   DEFAULT NULL,
    `certifications`       TEXT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- OPPORTUNITIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS `opportunities` (
    `id`                VARCHAR(100)  NOT NULL,
    `title`             VARCHAR(500)  NOT NULL,
    `scope_summary`     TEXT          NOT NULL,
    `district`          VARCHAR(20)   NOT NULL,
    `district_name`     VARCHAR(255)  NOT NULL,
    `category`          VARCHAR(100)  NOT NULL,
    `category_name`     VARCHAR(255)  NOT NULL,
    `subcategory`       VARCHAR(255)  DEFAULT NULL,
    `estimated_value`   VARCHAR(100)  DEFAULT NULL,
    `due_date`          VARCHAR(50)   DEFAULT NULL,
    `due_time`          VARCHAR(50)   DEFAULT NULL,
    `submission_method` VARCHAR(255)  DEFAULT NULL,
    `status`            VARCHAR(50)   NOT NULL DEFAULT 'published',
    `posted_date`       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `posted_by`         INT           DEFAULT NULL,
    `attachments`       TEXT          DEFAULT NULL,
    `duration`          VARCHAR(255)  DEFAULT NULL,
    `requirements`      TEXT          DEFAULT NULL,
    `certifications`    TEXT          DEFAULT NULL,
    `experience`        TEXT          DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_opportunities_status`     (`status`),
    KEY `idx_opportunities_posted_by`  (`posted_by`),
    CONSTRAINT `fk_opps_posted_by` FOREIGN KEY (`posted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- APPLICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS `applications` (
    `id`              INT          NOT NULL AUTO_INCREMENT,
    `opportunity_id`  VARCHAR(100) NOT NULL,
    `small_business_id`       INT          NOT NULL,
    `prime_contractor_id`       INT          DEFAULT NULL,
    `status`          VARCHAR(50)  NOT NULL DEFAULT 'pending',
    `applied_date`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `notes`           TEXT         DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_apps_opportunity` (`opportunity_id`),
    KEY `idx_apps_vendor`      (`small_business_id`),
    KEY `idx_apps_agency`      (`prime_contractor_id`),
    CONSTRAINT `fk_apps_opportunity` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_apps_vendor`      FOREIGN KEY (`small_business_id`)      REFERENCES `users`         (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SAVED OPPORTUNITIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS `saved_opportunities` (
    `id`              INT          NOT NULL AUTO_INCREMENT,
    `small_business_id`       INT          NOT NULL,
    `opportunity_id`  VARCHAR(100) NOT NULL,
    `saved_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_saved` (`small_business_id`, `opportunity_id`),
    KEY `idx_saved_opportunity` (`opportunity_id`),
    CONSTRAINT `fk_saved_vendor`      FOREIGN KEY (`small_business_id`)      REFERENCES `users`         (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_saved_opportunity` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS `messages` (
    `id`               INT          NOT NULL AUTO_INCREMENT,
    `sender_id`        INT          NOT NULL,
    `receiver_id`      INT          NOT NULL,
    `opportunity_id`   VARCHAR(100) DEFAULT NULL,
    `subject`          VARCHAR(500) DEFAULT NULL,
    `body`             TEXT         NOT NULL,
    `is_read`          TINYINT(1)   NOT NULL DEFAULT 0,
    `created_at`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_msg_sender`      (`sender_id`),
    KEY `idx_msg_receiver`    (`receiver_id`),
    KEY `idx_msg_opportunity` (`opportunity_id`),
    CONSTRAINT `fk_msg_sender`      FOREIGN KEY (`sender_id`)      REFERENCES `users`         (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_msg_receiver`    FOREIGN KEY (`receiver_id`)    REFERENCES `users`         (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_msg_opportunity` FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
