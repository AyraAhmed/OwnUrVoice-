// backend/routes/auth.js

// Import required packages
const express = require('express');  // Web framework for Node.js
const jwt = require('jsonwebtoken');  // For creating and verifying JWT tokens
const bcrypt = require('bcryptjs');   // For hashing and comparing passwords

// Create a new router instance
const router = express.Router();

// Mock user storage - This is temporary storage in memory
// TODO: Replace this with PostgreSQL database queries later
const users = [
  // Demo therapist account
  {
    id: '1',
    username: 'therapist123',
    email: 'therapist@example.com',
    password: '$2a$10$8K1p/a0dL3LXK5YU5gL5qOZVk.X5n5K5Q5K5K5K5K5K5K5K5K5K5K', // Hashed "password123"
    firstName: 'John',
    lastName: 'Therapist',
    phoneNumber: '+1234567890',
    dateOfBirth: '1985-05-15',
    role: 'therapist',
    // Therapist-specific fields
    clinicName: 'Speech Therapy Clinic',
    yearsOfExperience: 10,
    qualification: 'Master of Speech-Language Pathology',
    createdAt: new Date()
  },
  // Demo patient account
  {
    id: '2',
    username: 'patient123',
    email: 'patient@example.com',
    password: '$2a$10$8K1p/a0dL3LXK5YU5gL5qOZVk.X5n5K5Q5K5K5K5K5K5K5K5K5K5K', // Hashed "password123"
    firstName: 'Jane',
    lastName: 'Patient',
    phoneNumber: '+0987654321',
    dateOfBirth: '1990-08-20',
    role: 'patient',
    // Patient-specific fields
    therapyStartDate: '2024-01-15',
    preferredContactMethod: 'email',
    createdAt: new Date()
  }
];

// Secret key for signing JWT tokens
// In production, this should be a long, random string stored in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// REGISTER ENDPOINT
// POST /api/auth/register
// Creates a new user account with role-specific information
router.post('/register', async (req, res) => {
  try {
    // Extract all fields from request body
    const { 
      username,           // User's chosen username for login
      email,              // User's email address
      password,           // User's chosen password (will be hashed)
      firstName,          // User's first name
      lastName,           // User's last name
      phoneNumber,        // User's phone number
      dateOfBirth,        // User's date of birth
      role,               // Either 'therapist' or 'patient'
      // Therapist-specific fields (only required if role is 'therapist')
      clinicName,         // Name of the therapist's clinic
      yearsOfExperience,  // How many years they've been practicing
      qualification,      // Their professional qualification
      // Patient-specific fields (only required if role is 'patient')
      therapyStartDate,   // When the patient started therapy
      preferredContactMethod  // How they prefer to be contacted (email, phone, etc.)
    } = req.body;

    // -------- VALIDATION SECTION --------
    
    // Check if all basic required fields are provided
    if (!username || !email || !password || !firstName || !lastName || !phoneNumber || !dateOfBirth || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'All basic fields are required' 
      });
    }

    // Validate that role is either 'therapist' or 'patient'
    if (role !== 'therapist' && role !== 'patient') {
      return res.status(400).json({ 
        success: false, 
        message: 'Role must be either therapist or patient' 
      });
    }

    // If user is registering as a therapist, check therapist-specific fields
    if (role === 'therapist') {
      if (!clinicName || !yearsOfExperience || !qualification) {
        return res.status(400).json({ 
          success: false, 
          message: 'Clinic name, years of experience, and qualification are required for therapists' 
        });
      }
    }

    // If user is registering as a patient, check patient-specific fields
    if (role === 'patient') {
      if (!therapyStartDate || !preferredContactMethod) {
        return res.status(400).json({ 
          success: false, 
          message: 'Therapy start date and preferred contact method are required for patients' 
        });
      }
    }

    // Check if username is already taken
    const existingUsername = users.find(u => u.username === username);
    if (existingUsername) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username already exists' 
      });
    }

    // Check if email is already registered
    const existingEmail = users.find(u => u.email === email);
    if (existingEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }

    // -------- PASSWORD HASHING --------
    // Hash the password before storing (never store plain text passwords!)
    // The '10' is the salt rounds - higher = more secure but slower
    const hashedPassword = await bcrypt.hash(password, 10);

    // -------- CREATE NEW USER OBJECT --------
    // Create the base user object with common fields
    const newUser = {
      id: (users.length + 1).toString(),  // Generate a new ID (in real DB, this is automatic)
      username,
      email,
      password: hashedPassword,  // Store the hashed password, not the plain text
      firstName,
      lastName,
      phoneNumber,
      dateOfBirth,
      role,
      createdAt: new Date()  // Timestamp of when account was created
    };

    // Add role-specific fields based on user type
    if (role === 'therapist') {
      // Add therapist-specific information
      newUser.clinicName = clinicName;
      newUser.yearsOfExperience = parseInt(yearsOfExperience);  // Convert to number
      newUser.qualification = qualification;
    } else if (role === 'patient') {
      // Add patient-specific information
      newUser.therapyStartDate = therapyStartDate;
      newUser.preferredContactMethod = preferredContactMethod;
    }

    // Add the new user to our users array (in real app, this would be a database insert)
    users.push(newUser);

    // -------- GENERATE JWT TOKEN --------
    // Create a JWT token that will be used for authentication
    // This token contains the user's ID, username, email, and role
    const token = jwt.sign(
      { 
        id: newUser.id, 
        username: newUser.username,
        email: newUser.email, 
        role: newUser.role 
      },
      JWT_SECRET,           // Sign with our secret key
      { expiresIn: '7d' }   // Token expires in 7 days
    );

    // -------- PREPARE RESPONSE DATA --------
    // Create user data object to send back (excluding password for security)
    const userData = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      phoneNumber: newUser.phoneNumber,
      dateOfBirth: newUser.dateOfBirth,
      role: newUser.role
    };

    // Add role-specific data to response
    if (role === 'therapist') {
      userData.clinicName = newUser.clinicName;
      userData.yearsOfExperience = newUser.yearsOfExperience;
      userData.qualification = newUser.qualification;
    } else if (role === 'patient') {
      userData.therapyStartDate = newUser.therapyStartDate;
      userData.preferredContactMethod = newUser.preferredContactMethod;
    }

    // Send success response with token and user data
    res.status(201).json({  // 201 = Created
      success: true,
      message: 'User registered successfully',
      data: {
        token,      // JWT token for authentication
        user: userData  // User information (without password)
      }
    });
  } catch (error) {
    // If anything goes wrong, log the error and send error response
    console.error('Registration error:', error);
    res.status(500).json({  // 500 = Internal Server Error
      success: false, 
      message: 'Server error during registration' 
    });
  }
});


// LOGIN ENDPOINT
// POST /api/auth/login
// Authenticates a user and returns a JWT token
router.post('/login', async (req, res) => {
  try {
    // Extract username (can be username or email) and password from request
    const { username, password } = req.body;

    // -------- VALIDATION --------
    // Check if both fields are provided
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    // -------- FIND USER --------
    // Look for user by username OR email (allows login with either)
    const user = users.find(u => u.username === username || u.email === username);
    if (!user) {
      // User not found - send generic error message for security
      // (Don't tell attacker whether username exists or not)
      return res.status(401).json({  // 401 = Unauthorized
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // -------- VERIFY PASSWORD --------
    // Compare provided password with hashed password in database
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      // Password doesn't match - send generic error message
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // -------- GENERATE JWT TOKEN --------
    // User is authenticated - create a new JWT token
    const token = jwt.sign(
      { 
        id: user.id,
        username: user.username,
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }  // Token valid for 7 days
    );

    // -------- PREPARE USER DATA --------
    // Create user data object (excluding password)
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      dateOfBirth: user.dateOfBirth,
      role: user.role
    };

    // Add role-specific information
    if (user.role === 'therapist') {
      userData.clinicName = user.clinicName;
      userData.yearsOfExperience = user.yearsOfExperience;
      userData.qualification = user.qualification;
    } else if (user.role === 'patient') {
      userData.therapyStartDate = user.therapyStartDate;
      userData.preferredContactMethod = user.preferredContactMethod;
    }

    // Send success response with token and user data
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,      // JWT token for future requests
        user: userData  // User information
      }
    });
  } catch (error) {
    // Handle any errors that occur during login
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});


// VERIFY TOKEN ENDPOINT
// GET /api/auth/verify
// Verifies if a JWT token is valid and returns user data
// Used to check if user is still logged in when they refresh the page
router.get('/verify', (req, res) => {
  try {
    // -------- EXTRACT TOKEN --------
    // Get the Authorization header from the request
    const authHeader = req.headers.authorization;
    
    // Check if header exists and has correct format: "Bearer <token>"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    // Extract the actual token (remove "Bearer " prefix)
    const token = authHeader.substring(7);
    
    // -------- VERIFY TOKEN --------
    // Verify the token is valid and hasn't expired
    // jwt.verify will throw an error if token is invalid or expired
    const decoded = jwt.verify(token, JWT_SECRET);

    // -------- FIND USER --------
    // Look up the user from the decoded token data
    const user = users.find(u => u.id === decoded.id);
    if (!user) {
      // Token was valid but user no longer exists
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // -------- PREPARE USER DATA --------
    // Create user data object to return
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      dateOfBirth: user.dateOfBirth,
      role: user.role
    };

    // Add role-specific data
    if (user.role === 'therapist') {
      userData.clinicName = user.clinicName;
      userData.yearsOfExperience = user.yearsOfExperience;
      userData.qualification = user.qualification;
    } else if (user.role === 'patient') {
      userData.therapyStartDate = user.therapyStartDate;
      userData.preferredContactMethod = user.preferredContactMethod;
    }

    // Send success response with user data
    res.json({
      success: true,
      data: {
        user: userData
      }
    });
  } catch (error) {
    // Token verification failed (invalid or expired token)
    res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
});

// Export the router so it can be used in server.js
module.exports = router;