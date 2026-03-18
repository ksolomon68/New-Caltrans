-- CaltransBizConnect MySQL Dump
-- Generated on 2026-03-10T01:30:50.693Z

SET FOREIGN_KEY_CHECKS=0;

-- --------------------------------------------------------
-- Drop tables
-- --------------------------------------------------------


DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `saved_opportunities`;
DROP TABLE IF EXISTS `applications`;
DROP TABLE IF EXISTS `opportunities`;
DROP TABLE IF EXISTS `users`;
-- --------------------------------------------------------
-- Table structures
-- --------------------------------------------------------


CREATE TABLE `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(255) UNIQUE NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `business_name` VARCHAR(255),
    `contact_name` VARCHAR(255),
    `phone` VARCHAR(50),
    `ein` VARCHAR(50),
    `certification_number` VARCHAR(100),
    `business_description` TEXT,
    `organization_name` VARCHAR(255),
    `districts` TEXT,
    `categories` TEXT,
    `status` VARCHAR(50) NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `saved_opportunities` TEXT,
    `capability_statement` TEXT,
    `website` VARCHAR(255),
    `address` VARCHAR(255),
    `city` VARCHAR(100),
    `state` VARCHAR(50),
    `zip` VARCHAR(20),
    `years_in_business` VARCHAR(50),
    `certifications` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `opportunities` (
    `id` VARCHAR(100) PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `scope_summary` TEXT NOT NULL,
    `district` VARCHAR(50) NOT NULL,
    `district_name` VARCHAR(100) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `category_name` VARCHAR(100) NOT NULL,
    `subcategory` VARCHAR(100),
    `estimated_value` VARCHAR(100),
    `due_date` VARCHAR(50),
    `due_time` VARCHAR(50),
    `submission_method` VARCHAR(255),
    `status` VARCHAR(50) NOT NULL DEFAULT 'published',
    `posted_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `posted_by` INT,
    `attachments` TEXT,
    `duration` VARCHAR(100),
    `requirements` TEXT,
    `certifications` TEXT,
    `experience` TEXT,
    INDEX (`posted_by`),
    FOREIGN KEY (`posted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `applications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `opportunity_id` VARCHAR(100) NOT NULL,
    `vendor_id` INT NOT NULL,
    `agency_id` INT,
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
    `applied_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `notes` TEXT,
    UNIQUE(`opportunity_id`, `vendor_id`),
    INDEX (`opportunity_id`),
    INDEX (`vendor_id`),
    FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`vendor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `saved_opportunities` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `vendor_id` INT NOT NULL,
    `opportunity_id` VARCHAR(100) NOT NULL,
    `saved_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(`vendor_id`, `opportunity_id`),
    INDEX (`opportunity_id`),
    INDEX (`vendor_id`),
    FOREIGN KEY (`vendor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `messages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `sender_id` INT NOT NULL,
    `receiver_id` INT NOT NULL,
    `opportunity_id` VARCHAR(100),
    `subject` VARCHAR(255),
    `body` TEXT NOT NULL,
    `is_read` TINYINT DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (`sender_id`),
    INDEX (`receiver_id`),
    FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`opportunity_id`) REFERENCES `opportunities`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Dumping data
-- --------------------------------------------------------

-- Dumping data for table `users`
INSERT IGNORE INTO `users` (`id`, `email`, `password_hash`, `type`, `business_name`, `contact_name`, `phone`, `ein`, `certification_number`, `business_description`, `organization_name`, `districts`, `categories`, `status`, `created_at`, `saved_opportunities`, `capability_statement`, `website`, `address`, `city`, `state`, `zip`, `years_in_business`, `certifications`) VALUES (1, 'ks@evobrand.net', '$2b$10$twF/7bcnoS3KsGnULaaWu.4wlbKff6T8/KfYij0TLSg1c3jVPR5jS', 'admin', 'Caltrans Admin', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2026-02-11 21:18:20', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT IGNORE INTO `users` (`id`, `email`, `password_hash`, `type`, `business_name`, `contact_name`, `phone`, `ein`, `certification_number`, `business_description`, `organization_name`, `districts`, `categories`, `status`, `created_at`, `saved_opportunities`, `capability_statement`, `website`, `address`, `city`, `state`, `zip`, `years_in_business`, `certifications`) VALUES (2, 'vendor@test.com', '$2b$10$MZxyXv4LAWJeIALpPcDr8enQamy3NjwhdzlclPx4ex6MSd5u45mwq', 'vendor', 'Test Vendor Co.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'active', '2026-02-11 21:18:20', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT IGNORE INTO `users` (`id`, `email`, `password_hash`, `type`, `business_name`, `contact_name`, `phone`, `ein`, `certification_number`, `business_description`, `organization_name`, `districts`, `categories`, `status`, `created_at`, `saved_opportunities`, `capability_statement`, `website`, `address`, `city`, `state`, `zip`, `years_in_business`, `certifications`) VALUES (3, 'agency@test.com', '$2b$10$4Y9RcfO0x.HpzxagPMMCVuHl/gIry8REDPKvxS8rhmoqESGS9j3qa', 'agency', NULL, NULL, NULL, NULL, NULL, NULL, 'Test Agency', NULL, NULL, 'active', '2026-02-11 21:18:20', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT IGNORE INTO `users` (`id`, `email`, `password_hash`, `type`, `business_name`, `contact_name`, `phone`, `ein`, `certification_number`, `business_description`, `organization_name`, `districts`, `categories`, `status`, `created_at`, `saved_opportunities`, `capability_statement`, `website`, `address`, `city`, `state`, `zip`, `years_in_business`, `certifications`) VALUES (4, 'k.solomon@live.com', '$2b$10$xaHFHyer6FHMCAUjE21VY.nq4vFhoDdEp.kFD.LGdwyrqGAtiMCGu', 'vendor', 'EVOBRAND Concepts', 'Jason Solomon', '', NULL, NULL, '', NULL, NULL, NULL, 'active', '2026-02-12 00:42:43', NULL, '/uploads/cs-1771529964182-515267060.pdf', '', '', NULL, NULL, NULL, '', 'SBE');
INSERT IGNORE INTO `users` (`id`, `email`, `password_hash`, `type`, `business_name`, `contact_name`, `phone`, `ein`, `certification_number`, `business_description`, `organization_name`, `districts`, `categories`, `status`, `created_at`, `saved_opportunities`, `capability_statement`, `website`, `address`, `city`, `state`, `zip`, `years_in_business`, `certifications`) VALUES (5, 'ksolomon68@gmail.com', '$2b$10$SjTG8FTmi8L.oha4zDSiPu2QsTwdyDWy4mQbwfP8lOasI3vzhvQWy', 'agency', NULL, NULL, NULL, NULL, NULL, NULL, 'Agency Sample', NULL, NULL, 'active', '2026-02-12 00:43:38', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT IGNORE INTO `users` (`id`, `email`, `password_hash`, `type`, `business_name`, `contact_name`, `phone`, `ein`, `certification_number`, `business_description`, `organization_name`, `districts`, `categories`, `status`, `created_at`, `saved_opportunities`, `capability_statement`, `website`, `address`, `city`, `state`, `zip`, `years_in_business`, `certifications`) VALUES (6, 'operations@facekay.com', '$2b$10$rdQ.vVpyZBACXbky4Bd1r.qO86Jv5CUYMiVChBz8mOU4GrSInPucG', 'vendor', 'FACEKAY LLC', 'Verdieu St Fleur', '4242762910', '99-2106380', '9870', '', NULL, NULL, NULL, 'active', '2026-02-21 01:33:06', NULL, NULL, 'https://www.facekay.com/', '1132 N Wilmington Blvd Apt 211', 'Wilmington', NULL, '90744', '', 'SBE');
INSERT IGNORE INTO `users` (`id`, `email`, `password_hash`, `type`, `business_name`, `contact_name`, `phone`, `ein`, `certification_number`, `business_description`, `organization_name`, `districts`, `categories`, `status`, `created_at`, `saved_opportunities`, `capability_statement`, `website`, `address`, `city`, `state`, `zip`, `years_in_business`, `certifications`) VALUES (7, 'hb@burton-eng.com', '$2b$10$C6J0LRjlhL.wu32aarZtee0dJ68EZ3WoqRVgznncebQUO6rmR.mu2', 'vendor', 'BURTON ENGINEERING CONSULTING GROUP INC', 'Henry Burton', '5105128355', '843353605', 'Metro File #8797', NULL, NULL, NULL, NULL, 'active', '2026-02-23 19:33:58', NULL, NULL, 'https://www.burton-eng.com', '5950 Canterbury Drive, Apt. C215', 'Culver City', NULL, '90230', NULL, NULL);
INSERT IGNORE INTO `users` (`id`, `email`, `password_hash`, `type`, `business_name`, `contact_name`, `phone`, `ein`, `certification_number`, `business_description`, `organization_name`, `districts`, `categories`, `status`, `created_at`, `saved_opportunities`, `capability_statement`, `website`, `address`, `city`, `state`, `zip`, `years_in_business`, `certifications`) VALUES (8, 'elephinosupply@gmail.com', '$2b$10$YcbHIuWRzhCojH/bzPApoOntQSrw.YmZQt/bgcy64KmON/ZuvbuuG', 'vendor', 'Elephino DVBE Govt Supply', 'Antony Billes', '805-296-8962', '84-3752934', '2017106', NULL, NULL, NULL, NULL, 'active', '2026-02-23 20:42:30', NULL, NULL, 'https://www.elephinocompanies.com', '8965 El Camino Real, Ste 10', 'Atascadero', NULL, '93422', NULL, NULL);
INSERT IGNORE INTO `users` (`id`, `email`, `password_hash`, `type`, `business_name`, `contact_name`, `phone`, `ein`, `certification_number`, `business_description`, `organization_name`, `districts`, `categories`, `status`, `created_at`, `saved_opportunities`, `capability_statement`, `website`, `address`, `city`, `state`, `zip`, `years_in_business`, `certifications`) VALUES (9, 'edwinrafael19@gmail.com', '$2b$10$DYLNWWO7CeQySVRrHzgTdeRhZ299qeeU8Z5ZLlPKZFq1pHit0wSW6', 'vendor', 'Edwin', 'Edwin Rafael', '4087599990', '363848548', NULL, NULL, NULL, NULL, NULL, 'active', '2026-02-24 21:16:16', NULL, NULL, NULL, '520 North 21st street ', 'San José ', NULL, '95112', NULL, NULL);
INSERT IGNORE INTO `users` (`id`, `email`, `password_hash`, `type`, `business_name`, `contact_name`, `phone`, `ein`, `certification_number`, `business_description`, `organization_name`, `districts`, `categories`, `status`, `created_at`, `saved_opportunities`, `capability_statement`, `website`, `address`, `city`, `state`, `zip`, `years_in_business`, `certifications`) VALUES (10, 'infoservice@hppipelines.com', '$2b$10$8hYFc015yHemAYkFEDvU9OWSuAoHjR9MkjmAdSYOfG1jgzd3Q8PVa', 'vendor', 'HIGH PERFORMANCE PIPELINES HYDROVAC, INC.', 'ATAM CHOFOR', '5107255871', '861458858', '2048159', NULL, NULL, NULL, NULL, 'active', '2026-02-25 03:31:07', NULL, NULL, 'https://www.hppipelines.com/', '4493 SPIRE STREET', 'ANTIOCH', NULL, '94531', NULL, NULL);

-- Dumping data for table `opportunities`
INSERT IGNORE INTO `opportunities` (`id`, `title`, `scope_summary`, `district`, `district_name`, `category`, `category_name`, `subcategory`, `estimated_value`, `due_date`, `due_time`, `submission_method`, `status`, `posted_date`, `posted_by`, `attachments`, `duration`, `requirements`, `certifications`, `experience`) VALUES ('opp-001', 'District 4 Bridge Maintenance Support', 'Provide specialized technical assistance for ongoing bridge maintenance projects in the Bay Area.', '04', 'D04 - Bay Area / Oakland', 'services', 'Support Services', 'Technical Assistance', '$150,000 - $300,000', '2026-03-15', '14:00', 'Electronic Submission', 'published', '2026-02-11 21:01:55', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT IGNORE INTO `opportunities` (`id`, `title`, `scope_summary`, `district`, `district_name`, `category`, `category_name`, `subcategory`, `estimated_value`, `due_date`, `due_time`, `submission_method`, `status`, `posted_date`, `posted_by`, `attachments`, `duration`, `requirements`, `certifications`, `experience`) VALUES ('opp-002', 'Statewide SBE Supportive Services Program', 'Comprehensive supportive services including training workshops and technical assistance for certified SBEs.', '74', 'D74 - Headquarters', 'services', 'Support Services', 'Training', '$500,000+', '2026-04-01', '10:00', 'Caltrans Portal', 'published', '2026-02-11 21:01:55', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT IGNORE INTO `opportunities` (`id`, `title`, `scope_summary`, `district`, `district_name`, `category`, `category_name`, `subcategory`, `estimated_value`, `due_date`, `due_time`, `submission_method`, `status`, `posted_date`, `posted_by`, `attachments`, `duration`, `requirements`, `certifications`, `experience`) VALUES ('opp-003', 'District 7 Guardrail Repair Contract', 'Emergency and scheduled guardrail repair services across various locations in Los Angeles county.', '07', 'D07 - Los Angeles', 'construction', 'Construction', 'Specialty Contracting', '$2,000,000', '2026-02-28', '16:00', 'Hard Copy / In-Person', 'published', '2026-02-11 21:01:55', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT IGNORE INTO `opportunities` (`id`, `title`, `scope_summary`, `district`, `district_name`, `category`, `category_name`, `subcategory`, `estimated_value`, `due_date`, `due_time`, `submission_method`, `status`, `posted_date`, `posted_by`, `attachments`, `duration`, `requirements`, `certifications`, `experience`) VALUES ('OPP-1770857556568', 'Sample Opportunity', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.', '11', 'District 11 (San Diego)', 'construction', 'Construction', NULL, '$200,000', '2026-05-16', NULL, 'Online', 'published', '2026-02-12 00:52:38', 2, NULL, '6 months', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.', 'SBE', NULL);

-- Dumping data for table `saved_opportunities`
INSERT IGNORE INTO `saved_opportunities` (`id`, `vendor_id`, `opportunity_id`, `saved_at`) VALUES (1, 4, 'OPP-1770857556568', '2026-02-12 00:53:01');

-- Dumping data for table `messages`
INSERT IGNORE INTO `messages` (`id`, `sender_id`, `receiver_id`, `opportunity_id`, `subject`, `body`, `is_read`, `created_at`) VALUES (1, 4, 2, NULL, 'Inquiry: Sample Opportunity', 'test', 0, '2026-02-12 00:53:14');

SET FOREIGN_KEY_CHECKS=1;
