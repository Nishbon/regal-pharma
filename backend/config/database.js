const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname, '../../database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Use environment variable or default path
const dbPath = process.env.DATABASE_PATH || path.join(dbDir, 'medical_reports.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log(`✅ Connected to SQLite database: ${dbPath}`);
    initializeDatabase();
  }
});

function initializeDatabase() {
  // Create users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
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
  )`, function(err) {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('✅ Users table ready');
      createReportsTable();
    }
  });
}

function createReportsTable() {
  // Create daily_reports table
  db.run(`CREATE TABLE IF NOT EXISTS daily_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    report_date DATE NOT NULL,
    region VARCHAR(50) NOT NULL,
    
    dentists INTEGER DEFAULT 0,
    physiotherapists INTEGER DEFAULT 0,
    gynecologists INTEGER DEFAULT 0,
    internists INTEGER DEFAULT 0,
    general_practitioners INTEGER DEFAULT 0,
    pediatricians INTEGER DEFAULT 0,
    dermatologists INTEGER DEFAULT 0,
    
    pharmacies INTEGER DEFAULT 0,
    dispensaries INTEGER DEFAULT 0,
    
    orders_count INTEGER DEFAULT 0,
    orders_value DECIMAL(15,2) DEFAULT 0,
    
    summary TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, report_date)
  )`, function(err) {
    if (err) {
      console.error('Error creating daily_reports table:', err);
    } else {
      console.log('✅ Daily reports table ready');
      createIndexes();
    }
  });
}

function createIndexes() {
  // Create indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_daily_reports_user_date 
          ON daily_reports(user_id, report_date)`, function(err) {
    if (err) console.error('Error creating index 1:', err);
  });
  
  db.run(`CREATE INDEX IF NOT EXISTS idx_daily_reports_date 
          ON daily_reports(report_date)`, function(err) {
    if (err) console.error('Error creating index 2:', err);
  });

  // Now create all users
  createAllUsers();
}

function createAllUsers() {
  const bcrypt = require('bcryptjs');
  
  // First create admin user
  const adminHashedPassword = bcrypt.hashSync('admin123', 10);
  
  db.get("SELECT id, username FROM users WHERE username = 'admin'", (err, row) => {
    if (err) {
      console.error('Error checking for admin user:', err);
      return;
    }
    
    if (!row) {
      console.log('👤 Creating admin user...');
      db.run(`INSERT INTO users (username, password, name, email, role) 
              VALUES (?, ?, ?, ?, ?)`, 
        ['admin', adminHashedPassword, 'System Administrator', 'admin@medicalreports.com', 'supervisor'],
        function(err) {
          if (err) {
            console.error('❌ Error creating admin user:', err);
          } else {
            console.log('✅ Admin user created successfully: admin / admin123');
            createMedReps();
          }
        }
      );
    } else {
      console.log('✅ Admin user already exists: admin / admin123');
      createMedReps();
    }
  });
}

// ADD THIS FUNCTION TO CREATE ALL MEDREPS
function createMedReps() {
  const bcrypt = require('bcryptjs');
  const medReps = [
    { username: 'bonte', password: 'bonte123', name: 'Bonte', email: 'bonte@company.com', region: 'Kigali' },
    { username: 'liliane', password: 'liliane123', name: 'Liliane', email: 'liliane@company.com', region: 'Eastern' },
    { username: 'deborah', password: 'deborah123', name: 'Deborah', email: 'deborah@company.com', region: 'Western' },
    { username: 'valens', password: 'valens123', name: 'Valens', email: 'valens@company.com', region: 'Northern' }
  ];

  let createdCount = 0;
  const totalMedReps = medReps.length;

  medReps.forEach(medrep => {
    const hashedPassword = bcrypt.hashSync(medrep.password, 10);
    
    db.get("SELECT id FROM users WHERE username = ?", [medrep.username], (err, row) => {
      if (err) {
        console.error(`❌ Error checking for ${medrep.username}:`, err);
        return;
      }
      
      if (!row) {
        db.run(`INSERT INTO users (username, password, name, email, role, region) 
                VALUES (?, ?, ?, ?, ?, ?)`, 
          [medrep.username, hashedPassword, medrep.name, medrep.email, 'medrep', medrep.region],
          function(err) {
            if (err) {
              console.error(`❌ Error creating ${medrep.name}:`, err);
            } else {
              console.log(`✅ MedRep created: ${medrep.name} / ${medrep.password}`);
            }
            createdCount++;
            checkCompletion();
          }
        );
      } else {
        console.log(`✅ MedRep already exists: ${medrep.name}`);
        createdCount++;
        checkCompletion();
      }
    });
  });

  function checkCompletion() {
    if (createdCount === totalMedReps) {
      console.log('🎉 All users created successfully!');
      console.log('\n=== LOGIN CREDENTIALS ===');
      console.log('Supervisor: admin / admin123');
      console.log('MedReps:');
      console.log('  Bonte: bonte / bonte123');
      console.log('  Liliane: liliane / liliane123');
      console.log('  Deborah: deborah / deborah123');
      console.log('  Valens: valens / valens123');
      console.log('=========================\n');
    }
  }
}

module.exports = db;