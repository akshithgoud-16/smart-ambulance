const express = require('express');
const passport = require('passport');
const User = require('../models/User');
const router = express.Router();

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    const user = new User({ username, email, role });
    const registeredUser = await User.register(user, password);

    // Auto-login after signup
    req.login(registeredUser, (err) => {
      if (err) return res.status(500).json({ message: 'Login failed after signup' });
      res.json({ message: 'Signup successful', user: registeredUser });
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Login with username
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(400).json({ message: 'Invalid username or password' });

    req.login(user, (err) => {
      if (err) return next(err);
      res.json({
        message: 'Login successful',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    });
  })(req, res, next);
});

// Logout
router.post('/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie('sid');
      res.json({ message: 'Logged out successfully' });
    });
  });
});

module.exports = router;
