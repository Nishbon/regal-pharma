-- Medical Reporting System Database Schema
-- This file contains the complete database structure for reference

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'medrep',
    region VARCHAR(50),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily reports table
CREATE TABLE IF NOT EXISTS daily_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    report_date DATE NOT NULL,
    region VARCHAR(50) NOT NULL,
    
    -- Doctors visited
    dentists INTEGER DEFAULT 0,
    physiotherapists INTEGER DEFAULT 0,
    gynecologists INTEGER DEFAULT 0,
    internists INTEGER DEFAULT 0,
    general_practitioners INTEGER DEFAULT 0,
    pediatricians INTEGER DEFAULT 0,
    dermatologists INTEGER DEFAULT 0,
    
    -- Other visits
    pharmacies INTEGER DEFAULT 0,
    dispensaries INTEGER DEFAULT 0,
    
    -- Orders
    orders_count INTEGER DEFAULT 0,
    orders_value DECIMAL(15,2) DEFAULT 0,
    
    -- Summary
    summary TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, report_date)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_reports_user_date 
ON daily_reports(user_id, report_date);

CREATE INDEX IF NOT EXISTS idx_daily_reports_date 
ON daily_reports(report_date);

CREATE INDEX IF NOT EXISTS idx_daily_reports_region 
ON daily_reports(region);

CREATE INDEX IF NOT EXISTS idx_users_role_region 
ON users(role, region, is_active);

CREATE INDEX IF NOT EXISTS idx_users_username 
ON users(username);

CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

-- Insert default admin user (password: admin123)
INSERT OR IGNORE INTO users (username, password, name, email, role) 
VALUES (
    'admin', 
    '$2a$10$8K1p/a0dRL1//uOO3X8a.uG.3O2uZ7B1Yp.8QZkzQKzJ5Vc5o5ZGK', -- bcrypt hash for 'admin123'
    'System Administrator', 
    'admin@medicalreports.com', 
    'supervisor'
);

-- Insert sample medical representatives
INSERT OR IGNORE INTO users (username, password, name, email, role, region) VALUES
('jean.paul', '$2a$10$8K1p/a0dRL1//uOO3X8a.uG.3O2uZ7B1Yp.8QZkzQKzJ5Vc5o5ZGK', 'Jean Paul', 'jean.paul@company.com', 'medrep', 'Kigali'),
('marie.claire', '$2a$10$8K1p/a0dRL1//uOO3X8a.uG.3O2uZ7B1Yp.8QZkzQKzJ5Vc5o5ZGK', 'Marie Claire', 'marie.claire@company.com', 'medrep', 'Eastern'),
('eric.ndayi', '$2a$10$8K1p/a0dRL1//uOO3X8a.uG.3O2uZ7B1Yp.8QZkzQKzJ5Vc5o5ZGK', 'Eric Ndayishimiye', 'eric.ndayi@company.com', 'medrep', 'Western');

-- Sample reports data for testing
INSERT OR IGNORE INTO daily_reports (
    user_id, report_date, region, dentists, physiotherapists, gynecologists,
    internists, general_practitioners, pediatricians, dermatologists,
    pharmacies, dispensaries, orders_count, orders_value, summary
) VALUES
(2, date('now', '-1 day'), 'Kigali', 2, 1, 3, 1, 4, 2, 1, 5, 2, 8, 450000, 'Visited Kigali Central Clinic, City Pharmacy, and Health Plus Center.'),
(2, date('now', '-2 day'), 'Kigali', 1, 2, 2, 0, 3, 1, 0, 4, 1, 6, 320000, 'Met with doctors at Kacyiru Hospital and visited three pharmacies.'),
(3, date('now', '-1 day'), 'Eastern', 1, 1, 2, 1, 2, 1, 1, 3, 1, 5, 280000, 'Eastern province visits completed successfully.');