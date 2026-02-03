import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getPatientProfile,
  getPatientActiveGoals,
  getPatientSessionExercises,
  markExerciseComplete,
  PatientProfile
} from '../../services/supabasePatientService';
import { Goal, SessionExercise } from '../../services/supabaseTherapistService';
import '../../components/dashboards/TherapistDashboard.css';

const PatientGoalsProgress: React.FC = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const userDataString = localStorage.getItem('userData');
  const userData = userDataString ? JSON.parse(userDataString) : null;

  useEffect(() => {
    if (!userData || userData.user_role !== 'patient') {
      navigate('/login');
      return;
    }

    loadGoalsData();
  }, []);

  const loadGoalsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const profileData = await getPatientProfile(userData.user_id);
      
      if (!profileData) {
        setError('Patient profile not found');
        return;
      }

      setProfile(profileData);

      const [goalsData, exercisesData] = await Promise.all([
        getPatientActiveGoals(profileData.user_id),
        getPatientSessionExercises(profileData.user_id)
      ]);

      setActiveGoals(goalsData);
      setExercises(exercisesData);
    } catch (err: any) {
      console.error('Error loading goals:', err);
      setError(err.message || 'Failed to load goals data');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkComplete = async (sessionId: string, exerciseId: string) => {
    try {
      await markExerciseComplete(sessionId, exerciseId);
      setSuccessMessage('Exercise marked as complete!');
      
      if (profile) {
        const exercisesData = await getPatientSessionExercises(profile.user_id);
        setExercises(exercisesData);
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to mark exercise as complete');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userData');
    navigate('/login');
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

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Sidebar */}
      <div style={{ 
        width: '240px', 
        backgroundColor: '#fff', 
        borderRight: '1px solid #dee2e6',
        padding: '20px 0'
      }}>
        <div style={{ padding: '0 20px', marginBottom: '30px' }}>
          <h4 style={{ color: '#6366f1', fontWeight: 'bold', margin: 0 }}>OwnUrVoice</h4>
        </div>

        <nav>
          <a 
            href="#"
            onClick={(e) => { e.preventDefault(); navigate('/patient-dashboard'); }}
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
            <i className="bi bi-grid me-2"></i>
            Dashboard
          </a>
          
          <a 
            href="#"
            onClick={(e) => { e.preventDefault(); navigate('/patient/goals-progress'); }}
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
            <i className="bi bi-bullseye me-2"></i>
            Goals & Progress
          </a>

          <a 
            href="#"
            onClick={(e) => { e.preventDefault(); navigate('/patient/journal'); }}
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
            onClick={(e) => { e.preventDefault(); navigate('/patient/community'); }}
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
            onClick={(e) => { e.preventDefault(); navigate('/patient/resources'); }}
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
          {successMessage && (
            <div className="alert alert-success alert-dismissible fade show" role="alert">
              {successMessage}
              <button type="button" className="btn-close" onClick={() => setSuccessMessage(null)}></button>
            </div>
          )}

          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              {error}
              <button type="button" className="btn-close" onClick={() => setError(null)}></button>
            </div>
          )}

          <h2 style={{ marginBottom: '8px' }}>Goals & Progress</h2>
          <p style={{ color: '#6c757d', marginBottom: '32px' }}>Track your therapy goals and complete exercises</p>

          {/* Your Goals Section */}
          <div style={{ marginBottom: '40px' }}>
            <h5 style={{ 
              display: 'flex', 
              alignItems: 'center',
              color: '#6366f1',
              marginBottom: '24px'
            }}>
              <i className="bi bi-bullseye me-2"></i>
              Your Goals
            </h5>

            {activeGoals.length === 0 ? (
              <p className="text-muted">No active goals yet.</p>
            ) : (
              activeGoals.map((goal, index) => (
                <div key={goal.goal_id} style={{
                  backgroundColor: '#fff',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                    <div>
                      <h6 style={{ margin: 0, marginBottom: '4px' }}>{goal.goal_description}</h6>
                      <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>
                        {goal.priority || 'Practice regularly'}
                      </p>
                    </div>
                    <span style={{ 
                      color: '#6366f1', 
                      fontWeight: 'bold',
                      fontSize: '18px'
                    }}>
                      {(index + 1) * 15 + 30}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ 
                    width: '100%', 
                    height: '8px', 
                    backgroundColor: '#e9ecef',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      width: `${(index + 1) * 15 + 30}%`,
                      height: '100%',
                      backgroundColor: '#6366f1',
                      transition: 'width 0.3s ease'
                    }}></div>
                  </div>

                  <p style={{ margin: 0, fontSize: '12px', color: '#6c757d' }}>
                    Started {formatShortDate(goal.start_date || goal.created_at)}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Exercises to Complete Section */}
          <div>
            <h5 style={{ marginBottom: '8px' }}>Exercises to Complete</h5>
            <p style={{ color: '#6c757d', fontSize: '14px', marginBottom: '24px' }}>
              {exercises.filter(e => e.completed).length} of {exercises.length} exercises completed
            </p>

            {exercises.length === 0 ? (
              <p className="text-muted">No exercises assigned yet.</p>
            ) : (
              exercises.map((se) => (
                <div key={`${se.session_id}-${se.exercise_id}`} style={{
                  backgroundColor: '#fff',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'start',
                  gap: '16px'
                }}>
                  {/* Checkbox */}
                  <div>
                    {se.completed ? (
                      <i className="bi bi-check-circle-fill" style={{ 
                        fontSize: '24px', 
                        color: '#22c55e'
                      }}></i>
                    ) : (
                      <i 
                        className="bi bi-circle" 
                        style={{ 
                          fontSize: '24px', 
                          color: '#d1d5db',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleMarkComplete(se.session_id, se.exercise_id)}
                      ></i>
                    )}
                  </div>

                  {/* Exercise Details */}
                  <div style={{ flex: 1 }}>
                    <h6 style={{ 
                      margin: 0, 
                      marginBottom: '4px',
                      textDecoration: se.completed ? 'line-through' : 'none',
                      color: se.completed ? '#6c757d' : '#000'
                    }}>
                      {se.exercise?.title}
                    </h6>
                    <p style={{ margin: 0, fontSize: '14px', color: '#6c757d', marginBottom: '8px' }}>
                      {se.exercise?.description}
                    </p>
                    <p style={{ margin: 0, fontSize: '12px', color: '#6c757d' }}>
                      Due: {formatShortDate(se.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientGoalsProgress;