import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getPatientProfile,
  getPatientUpcomingSessions,
  getPatientTherapists,
  PatientProfile
} from '../../services/supabasePatientService';
import { Session, Therapist } from '../../services/supabaseTherapistService';
import '../../components/dashboards/TherapistDashboard.css';

/**
 * Provides a high-level overview for patients, including their session notes, 
 * upcoming appointments, and navigation to other patient-specific tools 
 */

// State hooks 
const PatientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Retrieve session data stored during login process 
  const userDataString = localStorage.getItem('userData');
  const userData = userDataString ? JSON.parse(userDataString) : null;

  useEffect(() => {
    // If not logged in
    // Ensures only users with the 'patient; role can access this route
    if (!userData) {
      navigate('/login', { replace: true });
      return;
    }

    // Role check (you store "role", NOT "user_role")
    const role = (userData.role || '').trim().toLowerCase();
    if (role !== 'patient') {
      // redirect therapists away from patient dashboard
      if (role === 'therapist') {
        navigate('/therapist-dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
      return;
    }

    loadDashboardData();
  }, [navigate]);

  /**
   * Fetches all necessary dashboard data from Supabase services 
   */
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
  
      // Get the user_id from userData (this is the patient's user_id)
      const userId = userData.user_id || userData.id;
      
      console.log('Loading dashboard for patient user_id:', userId);
  
      // Fetch Profile first to ensure user exists in the patient table 
      const profileData = await getPatientProfile(userId);
  
      if (!profileData) {
        setError('Patient profile not found');
        return;
      }
  
      setProfile(profileData);
      console.log('Patient profile loaded:', profileData);
  
      // Fetch therapists + upcoming sessions using the patient's user_id
      const [therapistsData, sessionsData] = await Promise.all([
        getPatientTherapists(userId),
        getPatientUpcomingSessions(userId)
      ]);
  
      console.log('Therapists:', therapistsData);
      console.log('Sessions:', sessionsData);
  
      setTherapists(therapistsData);
      setUpcomingSessions(sessionsData);
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clears local session and redirects to login 
   */

  const handleLogout = () => {
    localStorage.removeItem('userData');
    navigate('/login', { replace: true });
  };

  // Formatting helpers 
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatShortDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    return timeString.substring(0, 5);
  };

  // Render logic 
  /** UI components */
  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Sidebar */}
      <div
        style={{
          width: '240px',
          backgroundColor: '#fff',
          borderRight: '1px solid #dee2e6',
          padding: '20px 0'
        }}
      >
        <div style={{ padding: '0 20px', marginBottom: '30px' }}>
          <h4 style={{ color: '#6366f1', fontWeight: 'bold', margin: 0 }}>OwnUrVoice</h4>
        </div>

        <nav>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate('/patient-dashboard');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 20px',
              textDecoration: 'none',
              color: '#6366f1',
              backgroundColor: '#e0e7ff',
              borderLeft: '3px solid #6366f1'
            }}
          >
            <i className="bi bi-grid me-2"></i>
            Dashboard
          </a>

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              // this route must match App.tsx
              navigate('/patient/goals-progress');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 20px',
              textDecoration: 'none',
              color: '#6c757d',
              backgroundColor: 'transparent',
              borderLeft: '3px solid transparent'
            }}
          >
            <i className="bi bi-bullseye me-2"></i>
            Goals & Progress
          </a>

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate('/patient/journal');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 20px',
              textDecoration: 'none',
              color: '#6c757d',
              backgroundColor: 'transparent',
              borderLeft: '3px solid transparent'
            }}
          >
            <i className="bi bi-journal-text me-2"></i>
            Journal
          </a>

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate('/patient/community');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 20px',
              textDecoration: 'none',
              color: '#6c757d',
              backgroundColor: 'transparent',
              borderLeft: '3px solid transparent'
            }}
          >
            <i className="bi bi-people me-2"></i>
            Community
          </a>

          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate('/patient/resources');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 20px',
              textDecoration: 'none',
              color: '#6c757d',
              backgroundColor: 'transparent',
              borderLeft: '3px solid transparent'
            }}
          >
            <i className="bi bi-folder me-2"></i>
            Resources
          </a>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Bar */}
        <div
          style={{
            backgroundColor: '#fff',
            borderBottom: '1px solid #dee2e6',
            padding: '16px 32px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center'
          }}
        >
          <span style={{ marginRight: '20px', color: '#6c757d' }}>
            Welcome, {profile?.first_name}
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#6c757d',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Logout
          </button>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {error}
              <button type="button" className="btn-close" onClick={() => setError(null)}></button>
            </div>
          )}

          {/* Session Notes */}
          <div>
            <h2 style={{ marginBottom: '8px' }}>Session Notes</h2>
            <p style={{ color: '#6c757d', marginBottom: '32px' }}>
              Review notes from your therapy sessions
            </p>

            {upcomingSessions.length === 0 ? (
              <p className="text-muted">No session notes available yet.</p>
            ) : (
              upcomingSessions.map((session) => (
                <div
                  key={session.session_id}
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    padding: '24px',
                    marginBottom: '20px'
                  }}
                >
                  <h5 style={{ marginBottom: '12px' }}>
                    Session on {formatDate(session.session_date)}
                  </h5>

                  <div
                    style={{
                      display: 'flex',
                      gap: '24px',
                      marginBottom: '16px',
                      color: '#6c757d',
                      fontSize: '14px'
                    }}
                  >
                    <span>
                      <i className="bi bi-person me-1"></i>
                      {therapists[0]?.first_name} {therapists[0]?.last_name}
                    </span>

                    <span>
                      <i className="bi bi-clock me-1"></i>
                      {session.session_time ? formatTime(session.session_time) : '45'} minutes
                    </span>

                    <span>
                      <i className="bi bi-calendar me-1"></i>
                      {formatShortDate(session.session_date)}
                    </span>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <strong>Session Type:</strong>
                    <div style={{ marginTop: '8px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#e0e7ff',
                          color: '#6366f1',
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontSize: '14px',
                          marginRight: '8px'
                        }}
                      >
                        {session.session_type}
                      </span>
                    </div>
                  </div>

                  {session.location && (
                    <div
                      style={{
                        marginTop: '16px',
                        backgroundColor: '#f8f9fa',
                        padding: '16px',
                        borderRadius: '4px'
                      }}
                    >
                      <strong>Location:</strong>
                      <p style={{ marginTop: '8px', marginBottom: 0 }}>{session.location}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
