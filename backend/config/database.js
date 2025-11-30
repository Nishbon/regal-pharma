const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/medical_reports', 
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Create default users and sample reports
    await createDefaultUsers();
    await createSampleReports();
    
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

// Create default users
async function createDefaultUsers() {
  const User = require('../models/User');
  const bcrypt = require('bcryptjs');
  
  const defaultUsers = [
    {
      username: 'admin',
      password: 'admin123',
      name: 'System Administrator',
      email: 'admin@medicalreports.com',
      role: 'supervisor'
    },
    {
      username: 'bonte',
      password: 'bonte123', 
      name: 'Bonte',
      email: 'bonte@company.com',
      role: 'medrep',
      region: 'Kigali'
    },
    {
      username: 'liliane',
      password: 'liliane123',
      name: 'Liliane', 
      email: 'liliane@company.com',
      role: 'medrep',
      region: 'Eastern'
    },
    {
      username: 'deborah',
      password: 'deborah123',
      name: 'Deborah',
      email: 'deborah@company.com', 
      role: 'medrep',
      region: 'Western'
    },
    {
      username: 'valens',
      password: 'valens123',
      name: 'Valens',
      email: 'valens@company.com',
      role: 'medrep', 
      region: 'Northern'
    }
  ];

  let createdCount = 0;
  
  for (const userData of defaultUsers) {
    try {
      const existingUser = await User.findOne({ username: userData.username });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`✅ Created user: ${userData.name}`);
        createdCount++;
      } else {
        console.log(`✅ User already exists: ${userData.name}`);
      }
    } catch (error) {
      console.error(`❌ Error creating user ${userData.name}:`, error.message);
    }
  }
  
  console.log(`🎉 User setup complete. ${createdCount} users checked/created.`);
}

// Create sample reports
async function createSampleReports() {
  const DailyReport = require('../models/DailyReport');
  const User = require('../models/User');
  
  try {
    // Check if reports already exist
    const existingReports = await DailyReport.countDocuments();
    if (existingReports > 0) {
      console.log(`📊 ${existingReports} reports already exist in database`);
      return;
    }
    
    console.log('📊 Creating sample reports...');
    
    // Get all medrep users
    const medreps = await User.find({ role: 'medrep' });
    
    const sampleReports = [];
    const today = new Date();
    
    // Create reports for last 30 days for each medrep
    for (let i = 0; i < 30; i++) {
      const reportDate = new Date(today);
      reportDate.setDate(reportDate.getDate() - i);
      
      // Only create reports for weekdays (Mon-Fri)
      const dayOfWeek = reportDate.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // 1=Monday, 5=Friday
        for (const medrep of medreps) {
          sampleReports.push({
            user_id: medrep._id,
            report_date: new Date(reportDate),
            region: medrep.region,
            dentists: Math.floor(Math.random() * 5),
            physiotherapists: Math.floor(Math.random() * 3),
            gynecologists: Math.floor(Math.random() * 4),
            internists: Math.floor(Math.random() * 2),
            general_practitioners: Math.floor(Math.random() * 6),
            pediatricians: Math.floor(Math.random() * 3),
            dermatologists: Math.floor(Math.random() * 2),
            pharmacies: Math.floor(Math.random() * 8),
            dispensaries: Math.floor(Math.random() * 5),
            orders_count: Math.floor(Math.random() * 15),
            orders_value: Math.floor(Math.random() * 5000) + 1000,
            summary: `Daily activities for ${reportDate.toDateString()} in ${medrep.region} region`
          });
        }
      }
    }
    
    if (sampleReports.length > 0) {
      await DailyReport.insertMany(sampleReports);
      console.log(`✅ Created ${sampleReports.length} sample reports`);
    } else {
      console.log('✅ No sample reports needed - using existing data');
    }
    
  } catch (error) {
    console.error('❌ Error creating sample reports:', error);
  }
}

module.exports = connectDB;