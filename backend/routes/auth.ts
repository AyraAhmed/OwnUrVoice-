// backend/routes/auth.ts
import express, { Request, Response, Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router: Router = express.Router();

// User interface
interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth: string;
  role: 'therapist' | 'patient';
  createdAt: Date;
  // Therapist-specific fields
  clinicName?: string;
  yearsOfExperience?: number;
  qualification?: string;
  // Patient-specific fields
  therapyStartDate?: string;
  preferredContactMethod?: string;
}

// Mock user storage - This is temporary storage in memory
// TODO: Replace this with PostgreSQL database queries later
const users: User[] = [
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
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// REGISTER ENDPOINT
// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<any> => {
  try {
    const { 
      username,
      email, 
      password, 
      firstName, 
      lastName, 
      phoneNumber,
      dateOfBirth,
      role,
      // Therapist-specific fields
      clinicName,
      yearsOfExperience,
      qualification,
      // Patient-specific fields
      therapyStartDate,
      preferredContactMethod
    } = req.body;

    // Basic validation
    if (!username || !email || !password || !firstName || !lastName || !phoneNumber || !dateOfBirth || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'All basic fields are required' 
      });
    }

    // Validate role
    if (role !== 'therapist' && role !== 'patient') {
      return res.status(400).json({ 
        success: false, 
        message: 'Role must be either therapist or patient' 
      });
    }

    // Role-specific validation
    if (role === 'therapist') {
      if (!clinicName || !yearsOfExperience || !qualification) {
        return res.status(400).json({ 
          success: false, 
          message: 'Clinic name, years of experience, and qualification are required for therapists' 
        });
      }
    }

    if (role === 'patient') {
      if (!therapyStartDate || !preferredContactMethod) {
        return res.status(400).json({ 
          success: false, 
          message: 'Therapy start date and preferred contact method are required for patients' 
        });
      }
    }

    // Check if username already exists
    const existingUsername = users.find(u => u.username === username);
    if (existingUsername) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username already exists' 
      });
    }

    // Check if email already exists
    const existingEmail = users.find(u => u.email === email);
    if (existingEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser: User = {
      id: (users.length + 1).toString(),
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phoneNumber,
      dateOfBirth,
      role,
      createdAt: new Date()
    };

    // Add role-specific fields
    if (role === 'therapist') {
      newUser.clinicName = clinicName;
      newUser.yearsOfExperience = parseInt(yearsOfExperience);
      newUser.qualification = qualification;
    } else if (role === 'patient') {
      newUser.therapyStartDate = therapyStartDate;
      newUser.preferredContactMethod = preferredContactMethod;
    }

    users.push(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: newUser.id, 
        username: newUser.username,
        email: newUser.email, 
        role: newUser.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Prepare user data to return
    const userData: any = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      phoneNumber: newUser.phoneNumber,
      dateOfBirth: newUser.dateOfBirth,
      role: newUser.role
    };

    // Add role-specific data
    if (role === 'therapist') {
      userData.clinicName = newUser.clinicName;
      userData.yearsOfExperience = newUser.yearsOfExperience;
      userData.qualification = newUser.qualification;
    } else if (role === 'patient') {
      userData.therapyStartDate = newUser.therapyStartDate;
      userData.preferredContactMethod = newUser.preferredContactMethod;
    }

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: userData
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
});

// LOGIN ENDPOINT
// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<any> => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }

    // Find user
    const user = users.find(u => u.username === username || u.email === username);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id,
        username: user.username,
        email: user.email, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Prepare user data
    const userData: any = {
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

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: userData
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

// VERIFY TOKEN ENDPOINT
// GET /api/auth/verify
router.get('/verify', (req: Request, res: Response): any => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const user = users.find(u => u.id === decoded.id);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Prepare user data
    const userData: any = {
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

    return res.json({
      success: true,
      data: {
        user: userData
      }
    });
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid token' 
    });
  }
});

export default router;