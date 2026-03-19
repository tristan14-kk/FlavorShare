const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const initializePassport = () => {
  // Check if Google OAuth is configured
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'your-google-client-id') {
    console.log('⚠️  Google OAuth not configured - Google login disabled');
    return;
  }

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user already exists with this Google ID
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        return done(null, user);
      }

      // Check if user exists with same email
      user = await User.findOne({ email: profile.emails[0].value });

      if (user) {
        // Link Google account to existing user
        user.googleId = profile.id;
        if (!user.profileImage && profile.photos[0]) {
          user.profileImage = profile.photos[0].value;
        }
        await user.save();
        return done(null, user);
      }

      // Create new user
      const username = profile.emails[0].value.split('@')[0] + Math.floor(Math.random() * 1000);
      
      user = await User.create({
        googleId: profile.id,
        email: profile.emails[0].value,
        fullName: profile.displayName,
        username: username,
        profileImage: profile.photos[0]?.value || null,
        authProvider: 'google'
      });

      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));

  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  console.log('✅ Google OAuth configured');
};

// Check if Google OAuth is available
const isGoogleAuthAvailable = () => {
  return process.env.GOOGLE_CLIENT_ID && 
         process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id';
};

module.exports = { initializePassport, isGoogleAuthAvailable };
