import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTherapistSessions, searchPatientByEmail, createSessionForPatient, updateSession, deleteSession } from '../../services/supabaseTherapistService';
import type { Session } from '../../services/supabaseTherapistService';
import './TherapistDashboard.css';

// Interface for representing the authenticated user's structure
interface User {
  username: string;
  firstName: string;
  lastName: string;
  role: 'therapist' | 'patient' | 'parent_carer';
  user_id?: string;
  id?: string;
}

// UI & Data state
const TherapistDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Session filter state
  const [sessionFilter, setSessionFilter] = useState('all');

  // Modal & Form state
  const [showModal, setShowModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editType, setEditType] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Create session form state (used inside the "Create a Session" modal)
  const [searchEmail, setSearchEmail] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionTime, setSessionTime] = useState(() => {
    // Default the time input to the current time so the therapist doesn't have to type it
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  });
  const [sessionType, setSessionType] = useState('Initial Assessment');
  const [location, setLocation] = useState('');

  /**
   * Initial effect to authorise user and trigger data loading
   */
  useEffect(() => {
    const userStr = localStorage.getItem('userData');
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);

      const userRole = userData.user_role || userData.role;
      if (userRole !== 'therapist') {
        navigate('/patient-dashboard');
        return;
      }

      loadSessions(userData);
    } else {
      navigate('/login');
      return;
    }
  }, [navigate]);

  /**
   * Fetches the list of sessions associated with the current therapist
   */
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

  /**
   * Clears session storage and redirects to login page
   */
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    navigate('/login');
  };

  /**
   * Handle 'View' button click
   * Navigates to a specific patient's detail page
   */
  const handleViewPatient = (session: Session) => {
    navigate(`/therapist/patient/${session.patient_id}`, { state: { session } });
  };

  /**
   * Opens the edit modal pre-filled with the session's existing data
   */
  const handleEditClick = (session: Session) => {
    setEditSession(session);
    setEditDate(session.session_date);
    setEditTime(session.session_time ? session.session_time.substring(0, 5) : '');
    setEditType(session.session_type || 'Initial Assessment');
    setEditLocation(session.location || '');
    setEditError(null);
    setEditSuccess(null);
    setShowEditModal(true);
  };

  /**
   * Submits the edited session data to Supabase
   */
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSession) return;

    setEditError(null);
    setEditSuccess(null);

    const today = new Date().toISOString().split('T')[0];
    if (editDate === today) {
      const now = new Date();
      const [selectedHours, selectedMinutes] = editTime.split(':').map(Number);
      if (
        selectedHours < now.getHours() ||
        (selectedHours === now.getHours() && selectedMinutes < now.getMinutes())
      ) {
        setEditError('You cannot set a session time in the past. Please choose a later time.');
        return;
      }
    }

    try {
      setEditLoading(true);
      await updateSession(editSession.session_id, {
        session_date: editDate,
        session_time: editTime,
        session_type: editType,
        location: editLocation || 'To be determined'
      });

      setEditSuccess('Session updated successfully!');
      if (user) await loadSessions(user);

      setTimeout(() => {
        setShowEditModal(false);
        setEditSession(null);
        setEditSuccess(null);
      }, 1500);

    } catch (err: any) {
      setEditError(err.message || 'Failed to update session. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  /**
   * Opens the delete confirmation modal
   */
  const handleDeleteClick = (session: Session) => {
    setSessionToDelete(session);
    setShowDeleteConfirm(true);
  };

  /**
   * Permanently deletes the selected session
   */
  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return;

    try {
      setDeleteLoading(true);
      await deleteSession(sessionToDelete.session_id);
      if (user) await loadSessions(user);
      setShowDeleteConfirm(false);
      setSessionToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete session.');
    } finally {
      setDeleteLoading(false);
    }
  };

  /**
   * Handle linking existing patient
   * Validates email, checks for patient existence, and creates the first session
   */
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
      return; // Stop execution if email is invalid 
    }

    // Time validation — prevent booking a past time on today's date
    const today = new Date().toISOString().split('T')[0];
    if (sessionDate === today) {
      // Capture the current system time 
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      // Convert the 'HH:mm' string into numbers 
      const [selectedHours, selectedMinutes] = sessionTime.split(':').map(Number);

      // Check if the selected time is earlier than the current hour OR if it's the current hour but the minutes have already passed
      if (
        selectedHours < currentHours ||
        (selectedHours === currentHours && selectedMinutes < currentMinutes)
      ) {

        // Format current hours/minutes with zeros for clean error message
        const formattedCurrentTime = `${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;
        setFormError(
          `You cannot book a session in the past. Current time is ${formattedCurrentTime}. Please select a later time.`
        );
        return; // Exit the function to prevent the booking from proceeding 
      }
    }

    try {
      setFormLoading(true);

      // Verify if patient exists in the system
      const patient = await searchPatientByEmail(searchEmail);

      // If no patient exists with that email, show error and exit 
      if (!patient) {
        setFormError('Patient not found. Please ask the patient to register first with this email address.');
        return;
      }

      // Link therapist and patient by creating an initial session
      const userId = user?.user_id || user?.id;
      // Create the record in the 'sessions' table to link the two users 
      await createSessionForPatient(
        patient.user_id, // Patient ID 
        userId!, // The current Therapist's ID 
        {
          session_date: sessionDate,
          session_time: sessionTime + ':00', // Append seconds to meet database 'HH:mm:ss' format
          session_type: sessionType,
          location: location || 'To be determined' // Default text if location is empty
        }
      );

      // Success message 
      setSuccessMessage(`Successfully linked ${patient.first_name} ${patient.last_name}!`);

      // Reset form on success
      setSearchEmail('');
      setSessionDate(new Date().toISOString().split('T')[0]);
      const nowReset = new Date();
      setSessionTime(`${String(nowReset.getHours()).padStart(2, '0')}:${String(nowReset.getMinutes()).padStart(2, '0')}`);
      setSessionType('Initial Assessment');
      setLocation('');

      // Refresh the dashboard data so the new session appears immediately
      if (user) {
        await loadSessions(user);
      }

      // Auto-close modal after 2 seconds, user can see the success message and close the popup
      setTimeout(() => {
        setShowModal(false);
        setSuccessMessage(null);
      }, 2000);

    } catch (err: any) {
      console.error('Error linking patient:', err);
      setFormError(err.message || 'Failed to link patient. Please try again.');
    } finally {
      // Always stop the 'loading' spinner regardless of success or failure
      setFormLoading(false);
    }
  };

  /**
   * Format date for display in GB format
   */
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString + 'T00:00:00Z');
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  /**
   * Format time for display
   */
  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    return timeString.substring(0, 5);
  };

  /**
   * Returns minimum allowed time for session booking.
   * If booking today, minimum is the current time.
   * If booking a future date, any time is allowed.
   */
  const getMinTime = () => {
    const today = new Date().toISOString().split('T')[0];
    if (sessionDate === today) {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return '00:00';
  };

  /**
   * Filters sessions based on the selected dropdown option.
   * - all: shows all sessions
   * - this_week: shows sessions from Monday to Sunday of the current week
   * - past: shows sessions before today
   * - upcoming: shows sessions from today onwards
   */
  const getFilteredSessions = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get start (Monday) and end (Sunday) of current week
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return sessions.filter(session => {
      const sessionDate = new Date(session.session_date + 'T00:00:00Z');

      if (sessionFilter === 'this_week') {
        return sessionDate >= startOfWeek && sessionDate <= endOfWeek;
      } else if (sessionFilter === 'past') {
        return sessionDate < today;
      } else if (sessionFilter === 'upcoming') {
        return sessionDate >= today;
      }
      return true; // 'all' — show everything
    });
  };

  // Loading spinner
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  /** UI Components */
  return (
    <div className="therapist-dashboard">

      {/* Navigation Bar */}
      <nav className="dashboard-nav">
        <div className="nav-content">
          <img src="/logo.jpg" alt="OwnUrVoice Logo" className="nav-logo" />
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

          <div className="sidebar-item" onClick={() => navigate('/therapist/patients')} style={{ cursor: 'pointer' }}>
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>Patient Details</span>
          </div>

          <div className="sidebar-item" onClick={() => navigate('/therapist/goals')} style={{ cursor: 'pointer' }}>
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span>Goals & Exercises</span>
          </div>

          <div className="sidebar-item" onClick={() => navigate('/therapist/resources')} style={{ cursor: 'pointer' }}>
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
              + Create a Session
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

            {/* Card header with filter dropdown */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 className="card-title" style={{ margin: 0 }}>Recent Sessions</h3>

              {/* Session filter dropdown */}
              <select
                value={sessionFilter}
                onChange={e => setSessionFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6',
                  fontSize: '14px',
                  color: '#1a1a2e',
                  cursor: 'pointer',
                  backgroundColor: '#fff'
                }}
              >
                <option value="all">All Sessions</option>
                <option value="this_week">This Week</option>
                <option value="past">Past Appointments</option>
                <option value="upcoming">Upcoming</option>
              </select>
            </div>

            {sessions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
                <p>No sessions yet. Click "Create a Session" to get started!</p>
              </div>
            ) : getFilteredSessions().length === 0 ? (
              // Show when filter returns no results
              <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
                <p>No sessions found for this filter.</p>
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
                  {getFilteredSessions().map((session, index) => (
                    <div
                    key={session.session_id}
                    className="table-row"
                    style={{ animationDelay: `${index * 0.1}s`, position: 'relative' }}
                    onMouseEnter={(e) => {
                      const btns = e.currentTarget.querySelector('.hover-actions') as HTMLElement;
                      if (btns) btns.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      const btns = e.currentTarget.querySelector('.hover-actions') as HTMLElement;
                      if (btns) btns.style.opacity = '0';
                    }}
                  >
                      <div className="td patient-name">
                        {session.patient?.first_name} {session.patient?.last_name}
                      </div>
                      <div className="td">{formatDate(session.session_date)}</div>
                      <div className="td">{formatTime(session.session_time)}</div>
                      <div className="td">{session.session_type || 'Assessment'}</div>

                      <div className="td">
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>

                      {/* Edit & Delete — only visible on row hover */}
                      <div
                        className="hover-actions"
                        style={{
                          display: 'flex',
                          gap: '6px',
                          opacity: 0,
                          transition: 'opacity 0.2s ease'
                        }}
                      >
                        {/* Edit button — amber outline, white background */}
                        <button
                          onClick={() => handleEditClick(session)}
                          title="Edit session"
                          style={{
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'white',
                            border: '1.5px solid #f0ad4e',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            padding: 0,
                            transition: 'background-color 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fff8ee'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f0ad4e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>

                        {/* Delete button — red outline, white background */}
                        <button
                          onClick={() => handleDeleteClick(session)}
                          title="Delete session"
                          style={{
                            width: '30px',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'white',
                            border: '1.5px solid #dc3545',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            padding: 0,
                            transition: 'background-color 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fff5f5'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6"/>
                            <path d="M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </div>

                      {/* View button — always visible */}
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
                <h5 className="modal-title">Create a Session</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
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
                        min={getMinTime()}
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
                        'Create Session'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Session Modal */}
      {showEditModal && editSession && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowEditModal(false)}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Edit Session — {editSession.patient?.first_name} {editSession.patient?.last_name}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
              </div>

              <div className="modal-body">
                {editError && (
                  <div className="alert alert-danger alert-dismissible fade show">
                    {editError}
                    <button type="button" className="btn-close" onClick={() => setEditError(null)}></button>
                  </div>
                )}
                {editSuccess && (
                  <div className="alert alert-success">
                    {editSuccess}
                  </div>
                )}

                <form onSubmit={handleEditSubmit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Session Date <span className="text-danger">*</span></label>
                      <input
                        type="date"
                        className="form-control"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label">Session Time <span className="text-danger">*</span></label>
                      <input
                        type="time"
                        className="form-control"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Session Type <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      required
                    >
                      <option value="Initial Assessment">Initial Assessment</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="Therapy Session">Therapy Session</option>
                      <option value="Consultation">Consultation</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Location</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder="Clinic Room 1, Online, etc."
                    />
                    <small className="text-muted">Leave blank for "To be determined"</small>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowEditModal(false)}
                      disabled={editLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-warning text-white"
                      disabled={editLoading}
                    >
                      {editLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && sessionToDelete && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-danger">Delete Session</h5>
                <button type="button" className="btn-close" onClick={() => setShowDeleteConfirm(false)}></button>
              </div>

              <div className="modal-body">
                <p>Are you sure you want to permanently delete this session?</p>
                <div style={{
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  padding: '16px',
                  marginTop: '12px',
                  border: '1px solid #dee2e6'
                }}>
                  <p style={{ margin: 0, fontWeight: '600', color: '#1a1a2e' }}>
                    {sessionToDelete.patient?.first_name} {sessionToDelete.patient?.last_name}
                  </p>
                  <p style={{ margin: '4px 0 0', color: '#6c757d', fontSize: '14px' }}>
                    {formatDate(sessionToDelete.session_date)} at {formatTime(sessionToDelete.session_time)} · {sessionToDelete.session_type}
                  </p>
                </div>
                <p style={{ marginTop: '16px', color: '#dc3545', fontSize: '14px' }}>
                  ⚠️ This action cannot be undone.
                </p>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteConfirm}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Deleting...
                    </>
                  ) : (
                    'Yes, Delete Session'
                  )}
                </button>
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