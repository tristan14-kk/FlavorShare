const User = require('../models/User');
const Recipe = require('../models/Recipe');
const { asyncHandler, notFound, conflict, badRequest } = require('../middleware/errorHandler');

// ============================================
// Get User Profile
// ============================================
exports.getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.session.userId);
  
  if (!user) {
    throw notFound('User not found');
  }

  const { tab } = req.query;
  
  // Get user's recipes based on tab
  let recipes;
  if (tab === 'drafts') {
    recipes = await Recipe.find({ 
      author: req.session.userId, 
      status: 'draft' 
    }).sort({ createdAt: -1 });
  } else {
    recipes = await Recipe.find({ 
      author: req.session.userId, 
      status: 'published' 
    }).sort({ createdAt: -1 });
  }

  // Calculate stats
  const totalRecipes = await Recipe.countDocuments({ 
    author: req.session.userId, 
    status: 'published' 
  });
  
  const allRecipes = await Recipe.find({ author: req.session.userId });
  const totalViews = allRecipes.reduce((sum, recipe) => sum + recipe.views, 0);

  res.render('pages/profile', {
    title: `${user.fullName} - FlavorShare`,
    profileUser: user,
    recipes,
    currentTab: tab || 'recipes',
    stats: {
      recipes: totalRecipes,
      views: totalViews,
      daysJoined: user.daysJoined
    }
  });
});

// ============================================
// Get Edit Profile Page
// ============================================
exports.getEditProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.session.userId);
  
  if (!user) {
    throw notFound('User not found');
  }

  const errors = req.session.validationErrors || [];
  delete req.session.validationErrors;

  res.render('pages/edit-profile', {
    title: 'Edit Profile - FlavorShare',
    profileUser: user,
    errors
  });
});

// ============================================
// Update Profile
// ============================================
exports.putUpdateProfile = asyncHandler(async (req, res) => {
  const { fullName, username, bio, location, website, profileVisibility } = req.body;

  const user = await User.findById(req.session.userId);
  
  if (!user) {
    throw notFound('User not found');
  }

  // Check if username is taken (by another user)
  if (username !== user.username) {
    const existingUser = await User.findOne({ 
      username: username.toLowerCase(),
      _id: { $ne: user._id }
    });
    
    if (existingUser) {
      req.session.validationErrors = [{ msg: 'Username is already taken' }];
      return res.redirect('/profile/edit');
    }
  }

  // Update user
  user.fullName = fullName;
  user.username = username;
  user.bio = bio || '';
  user.location = location || '';
  user.website = website || '';
  user.profileVisibility = profileVisibility || 'public';

  await user.save();

  // Update session
  req.session.user = {
    ...req.session.user,
    fullName: user.fullName,
    username: user.username
  };

  res.redirect('/profile');
});

// ============================================
// Get Change Password Page
// ============================================
exports.getChangePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.session.userId);
  
  if (!user) {
    throw notFound('User not found');
  }

  // Check if user can change password (not Google-only account)
  if (user.authProvider === 'google' && !user.password) {
    req.session.validationErrors = [{ 
      msg: 'Password change is not available for Google-only accounts. You can set a password to enable email login.' 
    }];
  }

  const errors = req.session.validationErrors || [];
  delete req.session.validationErrors;

  res.render('pages/change-password', {
    title: 'Change Password - FlavorShare',
    errors,
    canSetPassword: user.authProvider === 'google' && !user.password
  });
});

// ============================================
// Change Password
// ============================================
exports.putChangePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.session.userId);
  
  if (!user) {
    throw notFound('User not found');
  }

  // For Google users without password, allow setting password
  if (user.authProvider === 'google' && !user.password) {
    user.password = newPassword;
    user.authProvider = 'local'; // Now they can use both methods
    await user.save();
    
    req.session.validationErrors = [{ msg: 'Password set successfully! You can now login with email and password.', type: 'success' }];
    return res.redirect('/profile');
  }

  // Verify current password
  const isMatch = await user.comparePassword(currentPassword);
  
  if (!isMatch) {
    req.session.validationErrors = [{ msg: 'Current password is incorrect' }];
    return res.redirect('/profile/change-password');
  }

  // Update password
  user.password = newPassword;
  await user.save();

  req.session.validationErrors = [{ msg: 'Password changed successfully!', type: 'success' }];
  res.redirect('/profile');
});

// ============================================
// Delete Account
// ============================================
exports.deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.session.userId;

  // Delete all user's recipes
  await Recipe.deleteMany({ author: userId });

  // Delete user
  await User.findByIdAndDelete(userId);

  // Destroy session
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
    }
    res.redirect('/');
  });
});

// ============================================
// API: Get Current User Profile
// ============================================
exports.apiGetProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  
  if (!user) {
    throw notFound('User not found');
  }

  const totalRecipes = await Recipe.countDocuments({ author: user._id, status: 'published' });
  const allRecipes = await Recipe.find({ author: user._id });
  const totalViews = allRecipes.reduce((sum, recipe) => sum + recipe.views, 0);

  res.json({
    success: true,
    data: {
      user,
      stats: {
        recipes: totalRecipes,
        views: totalViews,
        daysJoined: user.daysJoined
      }
    }
  });
});

// ============================================
// API: Update Profile
// ============================================
exports.apiUpdateProfile = asyncHandler(async (req, res) => {
  const { fullName, username, bio, location, website, profileVisibility } = req.body;

  const user = await User.findById(req.user._id);
  
  if (!user) {
    throw notFound('User not found');
  }

  // Check if username is taken
  if (username && username !== user.username) {
    const existingUser = await User.findOne({ 
      username: username.toLowerCase(),
      _id: { $ne: user._id }
    });
    
    if (existingUser) {
      throw conflict('Username is already taken');
    }
  }

  // Update fields
  if (fullName) user.fullName = fullName;
  if (username) user.username = username;
  if (bio !== undefined) user.bio = bio;
  if (location !== undefined) user.location = location;
  if (website !== undefined) user.website = website;
  if (profileVisibility) user.profileVisibility = profileVisibility;

  await user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: user
  });
});
