import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../../services/authService';
import './Auth.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  
  // State for login form
  const [formData, setFormData] = useState({
    username: '',  // Can be username or email
    password: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Call login API
      const response = await authService.login(formData);
      
      if (response.success) {
        const user = response.data.user;
        // Redirect based on role
        if (user.role === 'therapist') {
          navigate('/therapist-dashboard');  // Changed from /therapist/dashboard
        } else {
          navigate('/patient-dashboard');     // Changed from /patient/dashboard
        }
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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