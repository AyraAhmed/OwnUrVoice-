import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import supabaseAuthService from '../../services/supabaseAuthService';
import { supabase } from '../../services/supabaseClient';
import './Auth.css';

/**
 * Handles user Authentication and redirects users to specific dashboards based on their role 
 */

const Login: React.FC = () => {
  const navigate = useNavigate(); // Hook for programmatic redirection after login
  
  // State for login form - track input values for username and password 
  const [formData, setFormData] = useState({
    username: '',  
    password: ''
  });
  
  // Stores error messages for UI display 
  const [error, setError] = useState('');

  // Controls the submission/spinner state
  const [loading, setLoading] = useState(false);

  // Handle input changes - updates formData state
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,  // Prevents losing password while typing username
      [e.target.name]: e.target.value // update only the field matching the input's 'name' attribute
    });
    setError(''); // Clear error when user types
  };


  /**
   * Process the login form submission 
   */
  
// Handle form submission
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault(); // Prevents the browser from reloading the page
  setError(''); // Reset previous errors 
  setLoading(true); // Trigger UI loading state (e.g. a spinner)

  try {
    console.log(' Attempting login with username:', formData.username);
    
    // Call Supabase login API
    const response = await supabaseAuthService.login(formData.username, formData.password);
    
    console.log(' Login response:', response);

    if (response.success) {
      console.log(' Login successful! User:', response.user);
    
      // Save session data so the user stays logged in after a refresh 
      localStorage.setItem('userData', JSON.stringify(response.user));
    
      // Normalize role (prevents issues like "Therapist" or "therapist ")
      const userRole = (response.user?.role || '').trim().toLowerCase();
    
      console.log(' ROLE USED FOR REDIRECT:', userRole);
    
      // Map roles to their respective dashboard routes 
      const roleToPath: Record<string, string> = {
        therapist: '/therapist-dashboard',
        patient: '/patient-dashboard',
        parent_carer: '/parent-dashboard',
      };
    
      // Redirect user- moves user to dashboard 
      navigate(roleToPath[userRole] ?? '/', { replace: true });
    } else {
      console.log(' Login failed:', response.message);
      setError(response.message || 'Login failed');
    }    
    
  } catch (err: any) {
    console.error(' Login error:', err);
    // Catches network failures or unexpected crashes 
    setError(err.message || 'An error occurred during login');
  } finally {
    setLoading(false); // Ensure loading stops regardless of success or failure
  }
};

/** UI components */
  return (
    <div className="auth-container">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-5">
            <div className="auth-card card shadow-lg">
              <div className="card-body p-5">
                {/* Header */}
                <div className="text-center mb-4">
                 <h2 className="auth-title">Welcome Back</h2>
                <p className="text-muted">Sign in to continue</p>
                </div>


                {/* Error message */}
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* Username */}
                  <div className="mb-3">
                    <label htmlFor="username" className="form-label">
                      Username
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                      placeholder="Enter your username"
                    />
                  </div>

                  {/* Password */}
                  <div className="mb-4">
                    <label htmlFor="password" className="form-label">
                      Password
                    </label>
                    <input
                      type="password"
                      className="form-control form-control-lg"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="Enter your password"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg w-100 mb-3"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </button>

                  {/* Link to Register */}
                  <div className="text-center">
                    <p className="mb-0">
                      Don't have an account?{' '}
                      <Link to="/register" className="text-primary fw-bold">
                        Sign up
                      </Link>
                    </p>
                  </div>
                </form>

                {/* Demo Accounts Info */}
                <div className="mt-4 pt-4 border-top">
                  <p className="text-muted text-center small mb-2">Demo Accounts:</p>
                  <p className="text-muted text-center small mb-0">
                    <strong>Therapist:</strong> therapist123 / password123
                  </p>
                  <p className="text-muted text-center small">
                    <strong>Patient:</strong> patient123 / password123
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;