const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const upload = require('../middleware/upload');

// Login page
router.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Login' });
});

// Handle login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', 'Please provide valid credentials');
    return res.redirect('/auth/login');
  }

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      req.flash('error_msg', 'Invalid credentials');
      return res.redirect('/auth/login');
    }

    req.session.user = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    };

    // Redirect based on role
    switch (user.role) {
      case 'client':
        res.redirect('/client/dashboard');
        break;
      case 'agent':
        res.redirect('/agent/dashboard');
        break;
      case 'admin':
        res.redirect('/admin/dashboard');
        break;
      default:
        res.redirect('/');
    }
  } catch (error) {
    console.error('Login error:', error);
    req.flash('error_msg', 'Login failed');
    res.redirect('/auth/login');
  }
});

// Client register page
router.get('/client-register', (req, res) => {
  res.render('auth/client-register', { title: 'Client Registration' });
});

// Handle client registration
router.post('/client-register', [
  body('fullName').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('phone').notEmpty().trim(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', 'Please provide valid information');
    return res.redirect('/auth/client-register');
  }

  try {
    const { fullName, email, phone, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash('error_msg', 'Email already registered');
      return res.redirect('/auth/client-register');
    }

    const user = new User({
      fullName,
      email,
      phone,
      password,
      role: 'client'
    });

    await user.save();

    req.session.user = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    };

    req.flash('success_msg', 'Registration successful!');
    res.redirect('/client/dashboard');
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error_msg', 'Registration failed');
    res.redirect('/auth/client-register');
  }
});

// Agent register page
router.get('/agent-register', (req, res) => {
  res.render('auth/agent-register', { title: 'Agent Registration' });
});

// Handle agent registration
router.post('/agent-register', upload.single('profilePicture'), [
  body('fullName').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('phone').notEmpty().trim(),
  body('password').isLength({ min: 6 }),
  body('commission').isNumeric().isFloat({ min: 0, max: 100 }),
  body('bio').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error_msg', 'Please provide valid information');
    return res.redirect('/auth/agent-register');
  }

  try {
    const { fullName, email, phone, password, commission, bio } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash('error_msg', 'Email already registered');
      return res.redirect('/auth/agent-register');
    }

    const user = new User({
      fullName,
      email,
      phone,
      password,
      role: 'agent',
      commission: parseFloat(commission),
      bio,
      profilePicture: req.file ? req.file.filename : ''
    });

    await user.save();

    req.session.user = {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    };

    req.flash('success_msg', 'Registration successful!');
    res.redirect('/agent/dashboard');
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error_msg', 'Registration failed');
    res.redirect('/auth/agent-register');
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

module.exports = router;