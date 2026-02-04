import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTherapistSessions, searchPatientByEmail, createSessionForPatient } from '../../services/supabaseTherapistService';
import type { Session } from '../../services/supabaseTherapistService';
import './TherapistDashboard.css';

// Interface for user data structure 
interface User {
  username: string;
  firstName: string;
  lastName: string;
  role: 'therapist' | 'patient' | 'parent_carer';
  user_id?: string;
  id?: string;
}

const TherapistDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Form data for linking patient
  const [searchEmail, setSearchEmail] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionTime, setSessionTime] = useState('09:00');
  const [sessionType, setSessionType] = useState('Initial Assessment');
  const [location, setLocation] = useState('');

  useEffect(() => {
    // Get user from localStorage
    const userStr = localStorage.getItem('userData');
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      
      // Check if user is a therapist
      const userRole = userData.user_role || userData.role;
      if (userRole !== 'therapist') {
        navigate('/patient-dashboard');
        return;
      }

      // Load real sessions from database
      loadSessions(userData);
    } else {
      navigate('/login');
      return;
    }
  }, [navigate]);

  // Load sessions from database
  const loadSessions = async (userData: any) => {
    try {
      setLoading(true);
      setError(null);
      
      const userId = userData.user_id || userData.id;
      const sessionsData = await getTherapistSessions(userId);
      
      setSessions(sessionsData);
    } catch (err: any) {
      console.error('Error loading sessions:', err);
      setError(err.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    navigate('/login');
  };

  // Handle 'View' button click
  const handleViewPatient = (session: Session) => {
    navigate(`/therapist/patient/${session.patient_id}`, { state: { session } });
  };

  // Handle linking existing patient
  const handleLinkPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    // Validation
    if (!searchEmail) {
      setFormError('Please enter patient email');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(searchEmail)) {
      setFormError('Please enter a valid email address');
      return;
    }

    try {
      setFormLoading(true);

      // Search for patient by email
      const patient = await searchPatientByEmail(searchEmail);

      if (!patient) {
        setFormError('Patient not found. Please ask the patient to register first with this email address.');
        return;
      }

      // Create session for this patient
      const userId = user?.user_id || user?.id;
      await createSessionForPatient(
        patient.user_id,
        userId!,
        {
          session_date: sessionDate,
          session_time: sessionTime + ':00', // Add seconds
          session_type: sessionType,
          location: location || 'To be determined'
        }
      );

      setSuccessMessage(`Successfully linked ${patient.first_name} ${patient.last_name}!`);
      
      // Clear form
      setSearchEmail('');
      setSessionDate(new Date().toISOString().split('T')[0]);
      setSessionTime('09:00');
      setSessionType('Initial Assessment');
      setLocation('');

      // Reload sessions to show new patient
      if (user) {
        await loadSessions(user);
      }

      // Close modal after 2 seconds
      setTimeout(() => {
        setShowModal(false);
        setSuccessMessage(null);
      }, 2000);

    } catch (err: any) {
      console.error('Error linking patient:', err);
      setFormError(err.message || 'Failed to link patient. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    return timeString.substring(0, 5); // Get HH:MM from HH:MM:SS
  };

  // Loading spinner
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="therapist-dashboard">
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

      {/* Main Content */}
      <div className="dashboard-container">
        {/* Left Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-item active">
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span>Dashboard</span>
          </div>

          <div className="sidebar-item">
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>Patient Details</span>
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

        {/* Main Panel */}
        <main className="main-panel">
          <div className="panel-header">
            <h2 className="panel-title">Dashboard</h2>
            <p className="panel-subtitle">View and manage your patient sessions</p>
          </div>

          {/* Quick Actions */}
          <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', padding: '0 20px' }}>
            <button 
              onClick={() => setShowModal(true)}
              style={{
                padding: '12px 24px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
            >
              + Link Existing Patient
            </button>
            
            <button 
              onClick={() => navigate('/therapist/patients')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'all 0.3s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
            >
              View All Patients
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-danger mx-3" role="alert">
              {error}
            </div>
          )}

          {/* Sessions Card */}
          <div className="sessions-card">
            <h3 className="card-title">Recent Sessions</h3>
            
            {sessions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
                <p>No sessions yet. Click "Link Existing Patient" to get started!</p>
              </div>
            ) : (
              <div className="sessions-table">
                <div className="table-header">
                  <div className="th">PATIENT</div>
                  <div className="th">DATE</div>
                  <div className="th">TIME</div>
                  <div className="th">TYPE</div>
                  <div className="th">ACTIONS</div>
                </div>

                <div className="table-body">
                  {sessions.map((session, index) => (
                    <div 
                      key={session.session_id} 
                      className="table-row"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="td patient-name">
                        {session.patient?.first_name} {session.patient?.last_name}
                      </div>
                      <div className="td">{formatDate(session.session_date)}</div>
                      <div className="td">{formatTime(session.session_time)}</div>
                      <div className="td">{session.session_type || 'Assessment'}</div>
                      <div className="td">
                        <button 
                          className="view-btn"
                          onClick={() => handleViewPatient(session)}
                        >
                          <svg className="view-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Link Patient Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowModal(false)}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Link Existing Patient</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger alert-dismissible fade show">
                    {formError}
                    <button type="button" className="btn-close" onClick={() => setFormError(null)}></button>
                  </div>
                )}
                {successMessage && (
                  <div className="alert alert-success alert-dismissible fade show">
                    {successMessage}
                    <button type="button" className="btn-close" onClick={() => setSuccessMessage(null)}></button>
                  </div>
                )}
                
                <div className="alert alert-info">
                  <strong>Note:</strong> The patient must register first before you can link them. Ask your patient to create an account, then enter their email here.
                </div>

                <form onSubmit={handleLinkPatient}>
                  <div className="mb-3">
                    <label className="form-label">Patient Email <span className="text-danger">*</span></label>
                    <input
                      type="email"
                      className="form-control"
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      placeholder="patient@example.com"
                      required
                    />
                    <small className="text-muted">Enter the email the patient used to register</small>
                  </div>

                  <hr />

                  <h6 className="mb-3">Session Details</h6>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Session Date <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className="form-control"
                        value={sessionDate}
                        onChange={(e) => setSessionDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Session Time <span className="text-danger">*</span></label>
                      <input
                        type="time"
                        className="form-control"
                        value={sessionTime}
                        onChange={(e) => setSessionTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Session Type <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={sessionType}
                      onChange={(e) => setSessionType(e.target.value)}
                      required
                    >
                      <option value="Initial Assessment">Initial Assessment</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="Therapy Session">Therapy Session</option>
                      <option value="Review">Review</option>
                      <option value="Consultation">Consultation</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Location</label>
                    <input
                      type="text"
                      className="form-control"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Clinic Room 1, Online, etc."
                    />
                    <small className="text-muted">Leave blank for "To be determined"</small>
                  </div>

                  <div className="modal-footer">
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => setShowModal(false)}
                      disabled={formLoading}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={formLoading}
                    >
                      {formLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Linking...
                        </>
                      ) : (
                        'Link Patient & Create Session'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

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

export default TherapistDashboard;