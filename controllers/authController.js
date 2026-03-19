const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { asyncHandler, unauthorized, conflict } = require('../middleware/errorHandler');

// ============================================
// Login Page
// ============================================
exports.getLogin = (req, res) => {
  const errors = req.session.validationErrors || [];
  const oldInput = req.session.oldInput || {};
  
  // Clear session data
  delete req.session.validationErrors;
  delete req.session.oldInput;
  
  res.render('pages/login', {
    title: 'Login - FlavorShare',
    errors,
    oldInput
  });
};

// ============================================
// Login Handler (Email/Password)
// ============================================
exports.postLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await User.findOne({ email: email.toLowerCase() });
  
  if (!user) {
    req.session.validationErrors = [{ msg: 'Invalid email or password' }];
    req.session.oldInput = { email };
    return res.redirect('/login');
  }

  // Check if user registered with Google (no password)
  if (user.authProvider === 'google' && !user.password) {
    req.session.validationErrors = [{ 
      msg: 'This account uses Google login. Please use "Continue with Google" button.' 
    }];
    req.session.oldInput = { email };
    return res.redirect('/login');
  }

  // Verify password
  const isMatch = await user.comparePassword(password);
  
  if (!isMatch) {
    req.session.validationErrors = [{ msg: 'Invalid email or password' }];
    req.session.oldInput = { email };
    return res.redirect('/login');
  }

  // Create session
  req.session.userId = user._id;
  req.session.userRole = user.role;
  req.session.user = {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    username: user.username,
    role: user.role
  };

  res.redirect('/home');
});

// ============================================
// Signup Page
// ============================================
exports.getSignup = (req, res) => {
  const errors = req.session.validationErrors || [];
  const oldInput = req.session.oldInput || {};
  
  delete req.session.validationErrors;
  delete req.session.oldInput;
  
  res.render('pages/signup', {
    title: 'Sign Up - FlavorShare',
    errors,
    oldInput
  });
};

// ============================================
// Signup Handler
// ============================================
exports.postSignup = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;

  // Check if email already exists
  const existingEmail = await User.findOne({ email: email.toLowerCase() });
  if (existingEmail) {
    req.session.validationErrors = [{ msg: 'Email is already registered' }];
    req.session.oldInput = { fullName, email, username };
    return res.redirect('/signup');
  }

  // Check if username already exists
  const existingUsername = await User.findOne({ username: username.toLowerCase() });
  if (existingUsername) {
    req.session.validationErrors = [{ msg: 'Username is already taken' }];
    req.session.oldInput = { fullName, email, username };
    return res.redirect('/signup');
  }

  // Create new user
  const user = await User.create({
    fullName,
    email: email.toLowerCase(),
    username,
    password,
    authProvider: 'local',
    role: 'user'
  });

  // Create session
  req.session.userId = user._id;
  req.session.userRole = user.role;
  req.session.user = {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    username: user.username,
    role: user.role
  };

  res.redirect('/home');
});

// ============================================
// Logout Handler
// ============================================
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
};

// ============================================
// API: Login (Returns JWT Token)
// ============================================
exports.apiLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });
  
  if (!user || user.authProvider === 'google') {
    throw unauthorized('Invalid credentials');
  }

  const isMatch = await user.comparePassword(password);
  
  if (!isMatch) {
    throw unauthorized('Invalid credentials');
  }

  // Generate JWT token
  const token = generateToken(user);

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      role: user.role
    }
  });
});

// ============================================
// API: Signup (Returns JWT Token)
// ============================================
exports.apiSignup = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;

  // Check if email or username exists
  const existingUser = await User.findOne({
    $or: [
      { email: email.toLowerCase() },
      { username: username.toLowerCase() }
    ]
  });

  if (existingUser) {
    throw conflict('Email or username already exists');
  }

  const user = await User.create({
    fullName,
    email: email.toLowerCase(),
    username,
    password,
    authProvider: 'local',
    role: 'user'
  });

  const token = generateToken(user);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      username: user.username,
      role: user.role
    }
  });
});

// ============================================
// Google OAuth Callback
// ============================================
exports.googleCallback = asyncHandler(async (req, res) => {
  // Passport attaches the user to req.user after successful authentication
  if (!req.user) {
    req.session.validationErrors = [{ msg: 'Google authentication failed' }];
    return res.redirect('/login');
  }

  // Create session
  req.session.userId = req.user._id;
  req.session.userRole = req.user.role;
  req.session.user = {
    id: req.user._id,
    fullName: req.user.fullName,
    email: req.user.email,
    username: req.user.username,
    role: req.user.role
  };

  res.redirect('/home');
});
