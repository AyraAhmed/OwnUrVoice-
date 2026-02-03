import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPatientWithSession } from '../../services/supabaseTherapistService';
import '../../components/dashboards/TherapistDashboard.css';

const AddPatient: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phoneNumber: '',
    email: '',
    patientProfile: '',
    preferredContactMethod: 'email',
  });

  // Get logged in therapist data
  const userDataString = localStorage.getItem('userData');
  const userData = userDataString ? JSON.parse(userDataString) : null;

  // Check multiple possible role field names
  const userRole = userData?.user_role || userData?.role || userData?.userRole;

  if (!userData || userRole !== 'therapist') {
    console.log('Not authorised - redirecting to login');
    console.log('User data:', userData);
    console.log('User role:', userRole);
    navigate('/login');
    return null;
  }



  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validation
    if (!formData.username || !formData.firstName || !formData.lastName || 
        !formData.dateOfBirth || !formData.phoneNumber || !formData.email) {
      setError('Please fill in all required fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Phone validation (UK format)
    const phoneRegex = /^(\+44|0)[0-9]{10}$/;
    if (!phoneRegex.test(formData.phoneNumber.replace(/\s/g, ''))) {
      setError('Please enter a valid UK phone number');
      return;
    }

    // Age validation
    const birthDate = new Date(formData.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 1 || age > 120) {
      setError('Please enter a valid date of birth');
      return;
    }

    try {
      setLoading(true);

      const patientData = {
        username: formData.username,
        first_name: formData.firstName,
        last_name: formData.lastName,
        date_of_birth: formData.dateOfBirth,
        phone_number: formData.phoneNumber,
        email: formData.email,
        patient_profile: formData.patientProfile || '',
        preferred_contact_method: formData.preferredContactMethod,
      };

      // Fix: use correct user_id field
      const userId = userData.user_id || userData.id;
      const result = await createPatientWithSession(patientData, userId);

      setSuccessMessage(`Patient ${formData.firstName} ${formData.lastName} added successfully!`);
      
      // Clear form
      setFormData({
        username: '',
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        phoneNumber: '',
        email: '',
        patientProfile: '',
        preferredContactMethod: 'email',
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/therapist/patients');
      }, 2000);

    } catch (err: any) {
      console.error('Error adding patient:', err);
      setError(err.message || 'Failed to add patient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/therapist-dashboard');
  };

  return (
    <div className="dashboard-container">
      {/* Top Navigation */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container-fluid">
          <a className="navbar-brand" href="#" onClick={() => navigate('/therapist-dashboard')}>
            OwnUrVoice
          </a>
          <div className="d-flex align-items-center">
            <span className="text-white me-3">
              {userData?.first_name} {userData?.last_name}
            </span>
            <button className="btn btn-outline-light" onClick={() => {
              localStorage.removeItem('userData');
              navigate('/login');
            }}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h1>Add New Patient</h1>
                <p className="text-muted">Enter patient information to create a new record</p>
              </div>
              <button 
                className="btn btn-outline-secondary"
                onClick={handleCancel}
              >
                <i className="bi bi-arrow-left me-2"></i>
                Cancel
              </button>
            </div>

            {error && (
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {error}
                <button type="button" className="btn-close" onClick={() => setError(null)}></button>
              </div>
            )}

            {successMessage && (
              <div className="alert alert-success alert-dismissible fade show" role="alert">
                <i className="bi bi-check-circle-fill me-2"></i>
                {successMessage}
                <button type="button" className="btn-close" onClick={() => setSuccessMessage(null)}></button>
              </div>
            )}

            <div className="card">
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  {/* Personal Information */}
                  <div className="mb-4">
                    <h5 className="card-title mb-3">
                      <i className="bi bi-person-badge me-2"></i>
                      Personal Information
                    </h5>
                    
                    <div className="mb-3">
                      <label className="form-label">
                        Username <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="Enter username"
                        required
                      />
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">
                          First Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          placeholder="Enter first name"
                          required
                        />
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label">
                          Last Name <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          placeholder="Enter last name"
                          required
                        />
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label">
                          Date of Birth <span className="text-danger">*</span>
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleChange}
                          max={new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>

                      <div className="col-md-6 mb-3">
                        <label className="form-label">
                          Phone Number <span className="text-danger">*</span>
                        </label>
                        <input
                          type="tel"
                          className="form-control"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleChange}
                          placeholder="07700 900000"
                          required
                        />
                        <small className="form-text text-muted">
                          UK format: 07700 900000 or +447700900000
                        </small>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">
                        Email Address <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="patient@example.com"
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">
                        Preferred Contact Method
                      </label>
                      <select
                        className="form-select"
                        name="preferredContactMethod"
                        value={formData.preferredContactMethod}
                        onChange={handleChange}
                      >
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="text">Text Message</option>
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">
                        Patient Profile / Notes
                      </label>
                      <textarea
                        className="form-control"
                        name="patientProfile"
                        value={formData.patientProfile}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Enter any relevant information (diagnosis, medical history, therapy goals, etc.)"
                      />
                      <small className="form-text text-muted">
                        You can include diagnosis, speech conditions, medical history, or any other relevant notes
                      </small>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="d-flex gap-2 justify-content-end">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={handleCancel}
                      disabled={loading}
                    >
                      <i className="bi bi-x-circle me-2"></i>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Adding Patient...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-person-plus me-2"></i>
                          Add Patient
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Info Box */}
            <div className="card mt-3 bg-light">
              <div className="card-body">
                <h6 className="card-title">
                  <i className="bi bi-info-circle me-2"></i>
                  What happens next?
                </h6>
                <ul className="mb-0">
                  <li>Patient record will be created in your patient list</li>
                  <li>An initial assessment session will be automatically scheduled</li>
                  <li>You can then add goals, assign exercises, and track progress</li>
                  <li>Patient can be invited to create their own account to view progress</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPatient;