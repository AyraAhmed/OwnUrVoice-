import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import supabaseAuthService, { RegisterData } from '../../services/supabaseAuthService';
import { supabase } from '../../services/supabaseClient';
import './Auth.css';

/**
 * Handles user sign-up for Therapists, Patients, and Parents/Carers
 * Integrates with Supabase Auth and performs profile linking  
 */
const Register: React.FC = () => {
  const navigate = useNavigate();

  // Initial state for the registration form 
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    dateOfBirth: '',
    role: '' as 'therapist' | 'patient' | 'parent_carer' | '',
    
    // Therapist-specific fields
    clinicName: '',
    yearsOfExperience: '',
    qualification: '',
    
    // Patient-specific fields
    therapyStartDate: '',
    preferredContactMethod: '',

    // Parent/Carer specific fields
    relationshipToPatient: ''
  });

  // React State Hooks for tracking UI status 
  const [error, setError] = useState(''); // stores error messages to display to the user 
  const [loading, setLoading] = useState(false); // tracks if the registration is currently in progress 

  /**
   * Updates state on input change 
   */

  // Handle input changes for all fields
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  /**
   * Performs client-side validation
   */

  // Validate form before submission
  const validateForm = (): boolean => {
    // Check all basic required fields
    if (!formData.username || !formData.email || !formData.password || 
        !formData.confirmPassword || !formData.firstName || !formData.lastName || 
        !formData.phoneNumber || !formData.dateOfBirth || !formData.role) {
      setError('All fields are required');
      return false;
    }

    // Check password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    // Validate therapist-specific fields
    if (formData.role === 'therapist') {
      if (!formData.clinicName || !formData.yearsOfExperience || !formData.qualification) {
        setError('Please fill in all therapist information');
        return false;
      }
    }

    // Validate patient-specific fields
    if (formData.role === 'patient') {
      if (!formData.therapyStartDate || !formData.preferredContactMethod) {
        setError('Please fill in all patient information');
        return false;
      }
    }

    return true;
  };

  /**
   * Main submission handler 
   * Manages API calls and post-registration data linking 
  */

// Handle form submission
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  // Validate form
  if (!validateForm()) {
    return;
  }

  setLoading(true);

  try {
    // Prepare data for API (remove confirmPassword)
    const { confirmPassword, ...registerData } = formData;
  
    // Build the data object to be sent to the API/Backend 
    const dataToSend = {
      // Base field - these are required regardless of the user's role 
      username: registerData.username,
      email: registerData.email,
      password: registerData.password,
      firstName: registerData.firstName,
      lastName: registerData.lastName,
      phoneNumber: registerData.phoneNumber,
      dateOfBirth: registerData.dateOfBirth,

      // Type Casting - which strings are allowed for 'role'
      role: registerData.role as 'therapist' | 'patient' | 'parent_carer',
      
      // Add role-specific fields
      // If role is therapist, include professional details and convert experience to a Number
      ...(registerData.role === 'therapist' && {
        clinicName: registerData.clinicName,
        yearsOfExperience: parseInt(registerData.yearsOfExperience),
        qualification: registerData.qualification
      }),

      // If role is patient, include start date and contact preferences 
      ...(registerData.role === 'patient' && {
        therapyStartDate: registerData.therapyStartDate,
        preferredContactMethod: registerData.preferredContactMethod
      }),

      // If role is parent/carer, include the relationship field 
      ...(registerData.role === 'parent_carer' && {
        relationshipToPatient: registerData.relationshipToPatient
      })
    } as RegisterData;

    console.log('Sending registration data:', dataToSend); 
    
    // Call register API
    const response = await supabaseAuthService.register(dataToSend);
    
    console.log('Registration response:', response); 
    
    // Check if the server responded with a success flag 
    if (response.success) {
      console.log('Success! User created:', response.user);
      console.log('Registration complete! Redirecting to login...');
      // Navigates the user to the login page 
      navigate('/login');
    } else {
      // If the server says 'no', log the reason 
      console.log('Registration failed:', response.message);  
      // UI updated to show the specific error message from the server 
      setError(response.message || 'Registration failed');  
    }
  } catch (err: any) {
    // Handles 'crashes' (e.g. no internet, server is down)
    console.error('Error caught:', err);  
    setError(err.message || 'Registration failed. Please try again.');
  } finally {
    // Runs whether the code succeeded OR crashed 
    // It turns off the spinner so the button becomes clickable again 
    setLoading(false);
  }
};

/** UI components */
  return (
    <div className="auth-container">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-7">
            <div className="auth-card card shadow-lg">
              <div className="card-body p-5">
                {/* Header */}
                <div className="text-center mb-4">
                <h2 className="auth-title">Create Account</h2>
                <p className="text-muted">Join our speech therapy community</p>
                </div>


                {/* Error message */}
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* Basic Information Section */}
                  <h5 className="mb-3 text-primary">Basic Information</h5>

                  {/* Username */}
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label">
                      Username <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      placeholder="Choose a username"
                    />
                  </div>

                  {/* First Name & Last Name */}
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label htmlFor="firstName" className="form-label">
                        First Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        placeholder="Enter first name"
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="lastName" className="form-label">
                        Last Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        placeholder="Enter last name"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                      Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="Enter your email"
                    />
                  </div>

                  {/* Phone Number & Date of Birth */}
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label htmlFor="phoneNumber" className="form-label">
                        Phone Number <span className="text-danger">*</span>
                      </label>
                      <input
                        type="tel"
                        className="form-control"
                        id="phoneNumber"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        required
                        placeholder="+44 1234 567890"
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="dateOfBirth" className="form-label">
                        Date of Birth <span className="text-danger">*</span>
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        id="dateOfBirth"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  {/* Password & Confirm Password */}
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label htmlFor="password" className="form-label">
                        Password <span className="text-danger">*</span>
                      </label>
                      <input
                        type="password"
                        className="form-control"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        placeholder="Create password (min 6 characters)"
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="confirmPassword" className="form-label">
                        Confirm Password <span className="text-danger">*</span>
                      </label>
                      <input
                        type="password"
                        className="form-control"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        placeholder="Confirm password"
                      />
                    </div>
                  </div>

                  {/* Role Selection */}
                  <div className="mb-4">
                    <label htmlFor="role" className="form-label">
                      I am a... <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select your role</option>
                      <option value="patient">Patient</option>
                      <option value="therapist">Therapist</option>
                      <option value="parent_carer">Parent/Carer</option>
                    </select>
                  </div>

                  {/* Conditional Fields - THERAPIST
                    Displays fields specifically for healthcare providers */}
                  {formData.role === 'therapist' && (
                    <div className="role-specific-section">
                      <h5 className="mb-3 text-success">Therapist Information</h5>

                      {/* Clinic Name - required input */}
                      <div className="mb-3">
                        <label htmlFor="clinicName" className="form-label">
                          Clinic Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="clinicName"
                          name="clinicName"
                          value={formData.clinicName}
                          onChange={handleChange}
                          required
                          placeholder="Enter your clinic name"
                        />
                      </div>

                      {/* Professional Details */}
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <label htmlFor="yearsOfExperience" className="form-label">
                            Years of Experience <span className="text-danger">*</span>
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            id="yearsOfExperience"
                            name="yearsOfExperience"
                            value={formData.yearsOfExperience}
                            onChange={handleChange}
                            required
                            min="0"
                            placeholder="e.g., 5"
                          />
                        </div>
                        <div className="col-md-6">
                          <label htmlFor="qualification" className="form-label">
                            Qualification <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            id="qualification"
                            name="qualification"
                            value={formData.qualification}
                            onChange={handleChange}
                            required
                            placeholder="e.g., MSc in Speech Therapy"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Conditional Fields - PATIENT 
                    Displays date and preference selection for service users */}
                  {formData.role === 'patient' && (
                    <div className="role-specific-section">
                      <h5 className="mb-3 text-info">Patient Information</h5>

                      <div className="row mb-3">
                        <div className="col-md-6">
                          <label htmlFor="therapyStartDate" className="form-label">
                            Therapy Start Date <span className="text-danger">*</span>
                          </label>
                          <input
                            type="date"
                            className="form-control"
                            id="therapyStartDate"
                            name="therapyStartDate"
                            value={formData.therapyStartDate}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label htmlFor="preferredContactMethod" className="form-label">
                            Preferred Contact Method <span className="text-danger">*</span>
                          </label>
                          <select
                            className="form-select"
                            id="preferredContactMethod"
                            name="preferredContactMethod"
                            value={formData.preferredContactMethod}
                            onChange={handleChange}
                            required
                          >
                            <option value="">Select method</option>
                            <option value="email">Email</option>
                            <option value="phone">Phone</option>
                            <option value="sms">SMS</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                    {/* Conditional Fields - PARENT/CARER
                      Captures the relationship to the patient for third party registrants */}
                    {formData.role === 'parent_carer' && (
                      <div className="role-specific-section">
                        <h5 className="mb-3 text-warning">Parent/Carer Information</h5>
                        
                        <div className="mb-3">
                          <label htmlFor="relationshipToPatient" className="form-label">
                            Relationship to Patient <span className="text-danger">*</span>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            id="relationshipToPatient"
                            name="relationshipToPatient"
                            value={formData.relationshipToPatient}
                            onChange={handleChange}
                            required
                            placeholder="e.g., Mother, Father, Guardian"
                          />
                        </div>
                      </div>
                    )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg w-100 mb-3 mt-4"
                    // Disable the button while loading to prevent double-submissions
                    disabled={loading}
                  >
                    {/* Conditional label: Swap text/icons based on loading state */}
                    {loading ? (
                      <>
                      {/* Spinner- shows a visual 'processing' animation */}
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>

                  {/* Link to Login */}
                  <div className="text-center">
                    <p className="mb-0">
                      Already have an account?{' '}
                      <Link to="/login" className="text-primary fw-bold">
                        Sign in
                      </Link>
                    </p>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;