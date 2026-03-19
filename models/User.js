const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters']
  },
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    // Not required for Google OAuth users
    required: function() {
      return this.authProvider === 'local';
    }
  },
  // Role-Based Access Control (RBAC)
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  // Google OAuth fields
  googleId: {
    type: String,
    default: null
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  profileImage: {
    type: String,
    default: null
  },
  // Profile fields
  bio: {
    type: String,
    maxlength: [200, 'Bio cannot exceed 200 characters'],
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  profileVisibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for days since joining
userSchema.virtual('daysJoined').get(function() {
  const now = new Date();
  const joined = new Date(this.createdAt);
  const diffTime = Math.abs(now - joined);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for user initials
userSchema.virtual('initials').get(function() {
  if (!this.fullName) return '?';
  return this.fullName
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
});

// Check if user is admin
userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
