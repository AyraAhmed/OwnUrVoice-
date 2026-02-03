import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTherapistPatients, Patient } from '../../services/supabaseTherapistService';
import './TherapistDashboard.css';
import './PatientDetails.css';

interface User {
  username: string;
  firstName: string;
  lastName: string;
  role: 'therapist' | 'patient' | 'parent_carer';
  user_id?: string;
  id?: string;
}

const TherapistPatients: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userDataString = localStorage.getItem('userData');
    const userData = userDataString ? JSON.parse(userDataString) : null;

    if (!userData) {
      navigate('/login');
      return;
    }

    const userRole = userData?.user_role || userData?.role || userData?.userRole;

    if (userRole !== 'therapist') {
      console.log(' Not authorised - redirecting to login');
      navigate('/login');
      return;
    }

    setUser(userData);
    loadPatients(userData);
  }, [navigate]);

  useEffect(() => {
    // Filter patients based on search term
    if (searchTerm.trim() === '') {
      setFilteredPatients(patients);
    } else {
      const filtered = patients.filter(patient =>
        `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.patient_profile && patient.patient_profile.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredPatients(filtered);
    }
  }, [searchTerm, patients]);

  const loadPatients = async (userData: any) => {
    try {
      setLoading(true);
      const userId = userData.user_id || userData.id;
      const data = await getTherapistPatients(userId);
      setPatients(data);
      setFilteredPatients(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userData');
    navigate('/login');
  };

  const handleBackToDashboard = () => {
    navigate('/therapist-dashboard');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const calculateAge = (dob: string) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="patient-details-page">
      {/* Navigation Bar */}
      <nav className="dashboard-nav">
        <div className="nav-content">
          <h1 className="brand">OwnUrVoice</h1>
          <div className="nav-right">
            <span className="welcome-text">Welcome, {user?.firstName} {user?.lastName}</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </nav>

      {/* Main Content Container */}
      <div className="details-container">
        {/* Left Sidebar Navigation */}
        <aside className="sidebar">
          <div className="sidebar-item" onClick={handleBackToDashboard}>
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span>Dashboard</span>
          </div>
          
          <div className="sidebar-item active">
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>All Patients</span>
          </div>
          
          <div className="sidebar-item">
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span>Goals & Exercises</span>
          </div>
          
          <div className="sidebar-item">
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <span>Resources</span>
          </div>
        </aside>

        {/* Main Content Panel */}
        <main className="details-panel">
          {/* Page Header */}
          <div className="panel-header">
            <h2 className="panel-title">All Patients</h2>
            <p className="panel-subtitle">Manage and view all your patients</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-danger mx-3" role="alert">
              {error}
            </div>
          )}

          {/* Search Bar */}
          <div className="section-card" style={{ marginBottom: '20px' }}>
            <div className="input-group">
              <span className="input-group-text" style={{ backgroundColor: '#f8f9fa', border: '1px solid #dee2e6' }}>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name, email, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: '1px solid #dee2e6' }}
              />
            </div>
          </div>

          {/* Add New Patient Button */}
          <div style={{ marginBottom: '20px' }}>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/therapist-dashboard')}
              style={{ marginRight: '10px' }}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Add New Patient
            </button>
            <span className="text-muted">
              {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} found
            </span>
          </div>

          {/* Patients Grid */}
          {filteredPatients.length === 0 ? (
            <div className="section-card">
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <svg width="64" height="64" fill="#ccc" viewBox="0 0 16 16" style={{ marginBottom: '20px' }}>
                  <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1h8zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002a.274.274 0 0 1-.014.002H7.022zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM6.936 9.28a5.88 5.88 0 0 0-1.23-.247A7.35 7.35 0 0 0 5 9c-4 0-5 3-5 4 0 .667.333 1 1 1h4.216A2.238 2.238 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816zM4.92 10A5.493 5.493 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275zM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
                </svg>
                <h5 className="text-muted">
                  {searchTerm ? 'No patients found matching your search' : 'No patients yet'}
                </h5>
                {!searchTerm && (
                  <p className="text-muted">Click "Add New Patient" to get started</p>
                )}
              </div>
            </div>
          ) : (
            <div className="row">
              {filteredPatients.map((patient) => (
                <div key={patient.user_id} className="col-md-6 col-lg-4 mb-4">
                  <div className="section-card" style={{ height: '100%', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                    onClick={() => navigate(`/therapist/patient/${patient.user_id}`)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    }}
                  >
                    {/* Patient Avatar */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        backgroundColor: '#e7f3ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '16px'
                      }}>
                        <svg width="32" height="32" fill="#0d6efd" viewBox="0 0 16 16">
                          <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
                          <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <h5 style={{ margin: 0, marginBottom: '4px', fontSize: '18px' }}>
                          {patient.first_name} {patient.last_name}
                        </h5>
                        <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>
                          @{patient.username}
                        </p>
                      </div>
                    </div>

                    {/* Patient Info */}
                    <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '8px' }}>
                          <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 11.105l4.708-2.897L1 5.383v5.722Z"/>
                        </svg>
                        <span>{patient.email}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '8px' }}>
                          <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z"/>
                        </svg>
                        <span>{patient.phone_number}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '8px' }}>
                          <path d="M4 .5a.5.5 0 0 0-1 0V1H2a2 2 0 0 0-2 2v1h16V3a2 2 0 0 0-2-2h-1V.5a.5.5 0 0 0-1 0V1H4V.5zM16 14V5H0v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2z"/>
                        </svg>
                        <span>Age: {calculateAge(patient.date_of_birth)} years</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '8px' }}>
                          <path d="M4 .5a.5.5 0 0 0-1 0V1H2a2 2 0 0 0-2 2v1h16V3a2 2 0 0 0-2-2h-1V.5a.5.5 0 0 0-1 0V1H4V.5zM16 14V5H0v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2z"/>
                        </svg>
                        <span>Joined: {formatDate(patient.therapy_start_date)}</span>
                      </div>
                    </div>

                    {/* Patient Profile Notes */}
                    {patient.patient_profile && (
                      <div style={{ 
                        marginTop: '12px', 
                        padding: '10px', 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: '#495057'
                      }}>
                        <strong>Notes:</strong> {patient.patient_profile.substring(0, 60)}
                        {patient.patient_profile.length > 60 && '...'}
                      </div>
                    )}

                    {/* View Button */}
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #dee2e6' }}>
                      <button 
                        className="btn btn-sm btn-primary w-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/therapist/patient/${patient.user_id}`);
                        }}
                      >
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '6px' }}>
                          <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                          <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                        </svg>
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary Stats */}
          {filteredPatients.length > 0 && (
            <div className="section-card" style={{ marginTop: '30px' }}>
              <div className="row text-center">
                <div className="col-md-4">
                  <h3 className="text-primary" style={{ fontSize: '32px', fontWeight: 'bold' }}>
                    {patients.length}
                  </h3>
                  <p className="text-muted">Total Patients</p>
                </div>
                <div className="col-md-4">
                  <h3 className="text-success" style={{ fontSize: '32px', fontWeight: 'bold' }}>
                    {filteredPatients.length}
                  </h3>
                  <p className="text-muted">Showing</p>
                </div>
                <div className="col-md-4">
                  <h3 className="text-info" style={{ fontSize: '32px', fontWeight: 'bold' }}>
                    {patients.filter(p => p.therapy_start_date && 
                      new Date(p.therapy_start_date) > new Date(Date.now() - 30*24*60*60*1000)
                    ).length}
                  </h3>
                  <p className="text-muted">New This Month</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>OwnUrVoice</h3>
            <p>Empowering individuals with speech challenges through innovative therapy and support.</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 OwnUrVoice. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default TherapistPatients;