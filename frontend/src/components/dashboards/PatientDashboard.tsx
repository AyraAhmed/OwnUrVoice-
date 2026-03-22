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
const PatientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Session filter dropdown state
  const [sessionFilter, setSessionFilter] = useState('all');

  const userDataString = localStorage.getItem('userData');
  const userData = userDataString ? JSON.parse(userDataString) : null;

  useEffect(() => {
    if (!userData) {
      navigate('/login', { replace: true });
      return;
    }
    const role = (userData.role || '').trim().toLowerCase();
    if (role !== 'patient') {
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
      // Initialises UI state for data fetching
      setLoading(true);
      setError(null);

      // Normalise userId from different possible userData structures  
      const userId = userData.user_id || userData.id;

      // Fetching the profile 
      const profileData = await getPatientProfile(userId);
      if (!profileData) {
        setError('Patient profile not found');
        return; // Stop execution if primary identity record is missing 
      }
      setProfile(profileData);

      // Fetches therapists and sessions at the same time to save the user a few seconds 
      const [therapistsData, sessionsData] = await Promise.all([
        getPatientTherapists(userId),
        getPatientUpcomingSessions(userId)
      ]);
      setTherapists(therapistsData);
      setUpcomingSessions(sessionsData);

      // Show error message if it breaks 
    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      
      // Turn loading spinner off 
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

  /**
   * Format date in long UK style e.g. Sunday, 18 January 2026
   */
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString + 'T00:00:00Z');
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  /**
   * Format date in short UK style e.g. 18/01/2026
   */
  const formatShortDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString + 'T00:00:00Z');
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  /**
   * Format time — trims seconds from HH:MM:SS to HH:MM
   */
  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    return timeString.substring(0, 5);
  };

  /**
   * Filters sessions based on the selected dropdown option.
   * - all: shows all sessions
   * - this_week: shows sessions within the current Mon-Sun week
   * - past: shows sessions before today
   * - upcoming: shows sessions from today onwards
   */
  const getFilteredSessions = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create a date object for the start of the week (Monday)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);

    // Create a date object for the end of the week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return upcomingSessions.filter(session => {
      // Normalise the session date string into a standard Date object 
      const sessionDate = new Date(session.session_date + 'T00:00:00Z');

      // Check if the session falls within the current Monday-to-Sunday window
      if (sessionFilter === 'this_week') {
        return sessionDate >= startOfWeek && sessionDate <= endOfWeek;
      } 
      // Check if the session occurred before today
      else if (sessionFilter === 'past') {
        return sessionDate < today;
      } 
      // Check if the session is scheduled for today or later 
      else if (sessionFilter === 'upcoming') {
        return sessionDate >= today;
      }
      // Show all sessions if no specific filter is active 
      return true;
    });
  };

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

      {/* ── Sidebar ── */}
      <div style={{
        width: '240px',
        backgroundColor: '#fff',
        borderRight: '1px solid #dee2e6',
        padding: '20px 0'
      }}>
        <div style={{ padding: '0 20px', marginBottom: '30px' }}>
          <img src="/logo.jpg" alt="OwnUrVoice Logo" style={{ height: '100px', width: 'auto' }} />
        </div>

        <nav>
          {/* Dashboard link — active */}
          <div
            onClick={() => navigate('/patient-dashboard')}
            style={{
              display: 'flex', alignItems: 'center', padding: '12px 20px',
              color: '#6366f1', cursor: 'pointer',
              backgroundColor: '#e0e7ff', borderLeft: '3px solid #6366f1'
            }}
          >
            <i className="bi bi-grid me-2"></i>Dashboard
          </div>

          <div
            onClick={() => navigate('/patient/goals-progress')}
            style={{
              display: 'flex', alignItems: 'center', padding: '12px 20px',
              color: '#6c757d', cursor: 'pointer',
              backgroundColor: 'transparent', borderLeft: '3px solid transparent'
            }}
          >
            <i className="bi bi-bullseye me-2"></i>Goals & Progress
          </div>

          <div
            onClick={() => navigate('/patient/journal')}
            style={{
              display: 'flex', alignItems: 'center', padding: '12px 20px',
              color: '#6c757d', cursor: 'pointer',
              backgroundColor: 'transparent', borderLeft: '3px solid transparent'
            }}
          >
            <i className="bi bi-journal-text me-2"></i>Journal
          </div>

          <div
            onClick={() => navigate('/patient/community')}
            style={{
              display: 'flex', alignItems: 'center', padding: '12px 20px',
              color: '#6c757d', cursor: 'pointer',
              backgroundColor: 'transparent', borderLeft: '3px solid transparent'
            }}
          >
            <i className="bi bi-people me-2"></i>Community
          </div>

          <div
            onClick={() => navigate('/patient/resources')}
            style={{
              display: 'flex', alignItems: 'center', padding: '12px 20px',
              color: '#6c757d', cursor: 'pointer',
              backgroundColor: 'transparent', borderLeft: '3px solid transparent'
            }}
          >
            <i className="bi bi-folder me-2"></i>Resources
          </div>
        </nav>
      </div>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Top Bar */}
        <div style={{
          backgroundColor: '#fff',
          borderBottom: '1px solid #dee2e6',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center'
        }}>
          <span style={{ marginRight: '20px', color: '#6c757d' }}>
            Welcome, {profile?.first_name}
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px', border: 'none',
              backgroundColor: 'transparent', color: '#6c757d',
              cursor: 'pointer', textDecoration: 'underline'
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

          {/* Session Notes header with filter dropdown */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <h2 style={{ margin: 0 }}> Your Sessions </h2>

            {/* Filter dropdown */}
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

          <p style={{ color: '#6c757d', marginBottom: '32px', textAlign: 'left' }}>
            Review your therapy sessions
          </p>

          {/* Session cards */}
          {upcomingSessions.length === 0 ? (
            <p className="text-muted">No session notes available yet.</p>
          ) : getFilteredSessions().length === 0 ? (
            <p className="text-muted">No sessions found for this filter.</p>
          ) : (
            getFilteredSessions().map((session) => (
              <div
                key={session.session_id}
                style={{
                  backgroundColor: '#fff',
                  border: '1px solid #dee2e6',
                  borderRadius: '12px',
                  padding: '24px',
                  marginBottom: '20px'
                }}
              >
              <h5 style={{ marginBottom: '16px', color: '#1a1a2e', fontWeight: '600', textAlign: 'left' }}>
                Session on {formatDate(session.session_date)}
              </h5>
              {/* Meta info row — all items aligned to the left */}
              <div style={{
                display: 'flex',
                gap: '24px',
                marginBottom: '16px',
                color: '#6c757d',
                fontSize: '14px',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'flex-start'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="bi bi-person"></i>
                  {therapists[0]?.first_name} {therapists[0]?.last_name}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="bi bi-clock"></i>
                  {formatTime(session.session_time)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="bi bi-calendar"></i>
                  {formatShortDate(session.session_date)}
                </span>
              </div>

                {/* Session type badge */}
                <div style={{ marginBottom: '12px', textAlign: 'left' }}>
                  <strong style={{ fontSize: '14px' }}>Session Type:</strong>
                  <div style={{ marginTop: '8px' }}>
                    <span style={{
                      display: 'inline-block',
                      backgroundColor: '#e0e7ff',
                      color: '#6366f1',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}>
                      {session.session_type}
                    </span>
                  </div>
                </div>

                {/* Location */}
                {session.location && (
                  <div style={{
                    marginTop: '12px',
                    backgroundColor: '#f8f9fa',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    textAlign: 'left'
                  }}>
                    <strong>Location:</strong>
                    <span style={{ marginLeft: '8px', color: '#6c757d' }}>
                      {session.location}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;