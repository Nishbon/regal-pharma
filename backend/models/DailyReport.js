const mongoose = require('mongoose');

const dailyReportSchema = new mongoose.Schema({
  user_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: [true, 'User ID is required']
  },
  report_date: { 
    type: Date, 
    required: [true, 'Report date is required'],
    validate: {
      validator: function(date) {
        return date <= new Date();
      },
      message: 'Report date cannot be in the future'
    }
  },
  region: { 
    type: String, 
    required: [true, 'Region is required'],
    trim: true,
    maxlength: [50, 'Region cannot exceed 50 characters']
  },
  
  // Healthcare professionals - with validation
  dentists: { 
    type: Number, 
    default: 0,
    min: [0, 'Dentists count cannot be negative']
  },
  physiotherapists: { 
    type: Number, 
    default: 0,
    min: [0, 'Physiotherapists count cannot be negative']
  },
  gynecologists: { 
    type: Number, 
    default: 0,
    min: [0, 'Gynecologists count cannot be negative']
  },
  internists: { 
    type: Number, 
    default: 0,
    min: [0, 'Internists count cannot be negative']
  },
  general_practitioners: { 
    type: Number, 
    default: 0,
    min: [0, 'General practitioners count cannot be negative']
  },
  pediatricians: { 
    type: Number, 
    default: 0,
    min: [0, 'Pediatricians count cannot be negative']
  },
  dermatologists: { 
    type: Number, 
    default: 0,
    min: [0, 'Dermatologists count cannot be negative']
  },
  
  // Pharmacy visits
  pharmacies: { 
    type: Number, 
    default: 0,
    min: [0, 'Pharmacies count cannot be negative']
  },
  dispensaries: { 
    type: Number, 
    default: 0,
    min: [0, 'Dispensaries count cannot be negative']
  },
  
  // Orders
  orders_count: { 
    type: Number, 
    default: 0,
    min: [0, 'Orders count cannot be negative']
  },
  orders_value: { 
    type: Number, 
    default: 0,
    min: [0, 'Orders value cannot be negative']
  },
  
  summary: { 
    type: String,
    trim: true,
    maxlength: [1000, 'Summary cannot exceed 1000 characters']
  }
}, {
  timestamps: true  // Automatically adds createdAt and updatedAt
});

// Compound index for unique reports per user per day
dailyReportSchema.index({ user_id: 1, report_date: 1 }, { 
  unique: true,
  name: 'unique_report_per_user_per_day'
});

// Indexes for better query performance
dailyReportSchema.index({ report_date: -1 });
dailyReportSchema.index({ user_id: 1, report_date: -1 });
dailyReportSchema.index({ region: 1 });
dailyReportSchema.index({ 'user_id': 1, 'region': 1 });

// Virtual for total doctors visited (calculated field)
dailyReportSchema.virtual('total_doctors').get(function() {
  return this.dentists + this.physiotherapists + this.gynecologists + 
         this.internists + this.general_practitioners + 
         this.pediatricians + this.dermatologists;
});

// Virtual for total pharmacy visits (calculated field)
dailyReportSchema.virtual('total_pharmacy_visits').get(function() {
  return this.pharmacies + this.dispensaries;
});

// Ensure virtual fields are included in JSON output
dailyReportSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    delete ret.id;
    return ret;
  }
});

// Instance method to get report summary
dailyReportSchema.methods.getReportSummary = function() {
  return {
    totalDoctors: this.total_doctors,
    totalPharmacyVisits: this.total_pharmacy_visits,
    totalOrders: this.orders_count,
    totalValue: this.orders_value,
    date: this.report_date.toDateString()
  };
};

// Static method to get user's reports for a date range
dailyReportSchema.statics.getUserReportsByDateRange = async function(userId, startDate, endDate) {
  return await this.find({
    user_id: userId,
    report_date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  }).sort({ report_date: -1 });
};

// Static method to get team reports for supervisor
dailyReportSchema.statics.getTeamReports = async function(startDate, endDate) {
  return await this.aggregate([
    {
      $match: {
        report_date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $unwind: '$user'
    },
    {
      $match: {
        'user.role': 'medrep',
        'user.is_active': true
      }
    },
    {
      $group: {
        _id: '$user_id',
        user_name: { $first: '$user.name' },
        region: { $first: '$user.region' },
        reports_count: { $sum: 1 },
        total_doctors: {
          $sum: {
            $add: [
              '$dentists', '$physiotherapists', '$gynecologists', '$internists',
              '$general_practitioners', '$pediatricians', '$dermatologists'
            ]
          }
        },
        total_pharmacies: { $sum: '$pharmacies' },
        total_dispensaries: { $sum: '$dispensaries' },
        total_orders: { $sum: '$orders_count' },
        total_value: { $sum: '$orders_value' }
      }
    },
    {
      $sort: { total_value: -1 }
    }
  ]);
};

const DailyReport = mongoose.model('DailyReport', dailyReportSchema);

module.exports = DailyReport;