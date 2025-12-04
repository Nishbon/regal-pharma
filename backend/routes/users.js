const express = require('express');
const User = require('../models/User');
const router = express.Router();

// ====================== HELPER: Check Supervisor Role ======================
const requireSupervisor = (req, res, next) => {
  if (req.user.role !== 'supervisor' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Supervisor or admin role required.'
    });
  }
  next();
};

// ====================== GET ALL USERS (SUPERVISORS ONLY) ======================
router.get('/', requireSupervisor, async (req, res) => {
  try {
    console.log(`👥 Supervisor ${req.user.username} fetching all users`);
    
    const users = await User.find({})
      .select('-password -__v')
      .sort({ role: 1, name: 1 })
      .lean();
    
    console.log(`✅ Found ${users.length} users in database`);
    
    res.json({
      success: true,
      data: users,
      count: users.length,
      requested_by: {
        id: req.user._id, // Changed to _id
        username: req.user.username,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching users'
    });
  }
});

// ====================== GET CURRENT USER PROFILE ======================
router.get('/profile/me', async (req, res) => {
  try {
    console.log(`👤 User ${req.user.username} fetching profile`);
    
    const dbUser = await User.findById(req.user._id) // Changed to _id
      .select('-password -__v')
      .lean();
    
    if (!dbUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found in database'
      });
    }
    
    res.json({
      success: true,
      data: dbUser,
      source: 'MongoDB'
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
});

// ====================== GET USER BY ID ======================
router.get('/:id', requireSupervisor, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -__v')
      .lean();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
});

// ====================== GET ACTIVE MEDREPS (SUPERVISORS ONLY) ======================
router.get('/active-medreps', requireSupervisor, async (req, res) => {
  try {
    console.log(`👥 Supervisor ${req.user.username} fetching active medreps`);
    
    const medreps = await User.find({ 
      role: 'medrep',
      is_active: true 
    })
    .select('name username email region role createdAt')
    .sort({ name: 1 })
    .lean();
    
    console.log(`✅ Found ${medreps.length} active medreps`);
    
    res.json({
      success: true,
      data: medreps,
      count: medreps.length,
      requested_by: req.user.username
    });
  } catch (error) {
    console.error('Error fetching medreps:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching medreps'
    });
  }
});

// ====================== GET SUPERVISORS (SUPERVISORS ONLY) ======================
router.get('/supervisors', requireSupervisor, async (req, res) => {
  try {
    const supervisors = await User.find({ 
      role: { $in: ['supervisor', 'admin'] },
      is_active: true 
    })
    .select('name username email region role')
    .sort({ name: 1 })
    .lean();
    
    res.json({
      success: true,
      data: supervisors,
      count: supervisors.length
    });
  } catch (error) {
    console.error('Error fetching supervisors:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching supervisors'
    });
  }
});

// ====================== UPDATE USER PROFILE ======================
router.put('/profile/me', async (req, res) => {
  try {
    const { name, email, region } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (region) updateData.region = region;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id, // Changed to _id
      updateData,
      { new: true, runValidators: true }
    ).select('-password -__v');
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
});

// ====================== CREATE NEW USER (SUPERVISORS ONLY) ======================
router.post('/', requireSupervisor, async (req, res) => {
  try {
    const { username, password, name, email, role, region } = req.body;
    
    const existingUser = await User.findOne({ 
      $or: [
        { username: { $regex: new RegExp(`^${username}$`, 'i') } },
        { email: { $regex: new RegExp(`^${email}$`, 'i') } }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }
    
    const newUser = new User({
      username,
      password,
      name,
      email,
      role: role || 'medrep',
      region: region || 'General',
      is_active: true,
      createdBy: req.user._id // Changed to _id
    });
    
    await newUser.save();
    
    const userResponse = newUser.toObject();
    delete userResponse.password;
    delete userResponse.__v;
    
    console.log(`✅ New user created: ${username} (${role}) by ${req.user.username}`);
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user'
    });
  }
});

// ====================== UPDATE USER (SUPERVISORS ONLY) ======================
router.put('/:id', requireSupervisor, async (req, res) => {
  try {
    const { name, email, role, region, is_active } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (region !== undefined) updateData.region = region;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -__v');
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user'
    });
  }
});

// ====================== DEACTIVATE USER (SUPERVISORS ONLY) ======================
router.put('/:id/deactivate', requireSupervisor, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (user._id.toString() === req.user._id.toString()) { // Changed to _id
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }
    
    user.is_active = false;
    await user.save();
    
    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deactivating user'
    });
  }
});

// ====================== ACTIVATE USER (SUPERVISORS ONLY) ======================
router.put('/:id/activate', requireSupervisor, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { is_active: true },
      { new: true }
    ).select('-password -__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'User activated successfully',
      data: user
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error activating user'
    });
  }
});

module.exports = router;
