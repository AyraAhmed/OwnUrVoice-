import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import './PatientDetails.css';

// Interface for goal data structure
interface Goal {
  id: string;
  title: string;
  description: string;
  progress: number;
}

// Interface for exercise data structure
interface Exercise {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'completed' | 'pending';
}

// Interface for patient information
interface PatientInfo {
  first_name: string;
  last_name: string;
  email: string;
  therapy_start_date: string;
  user_id: string;
}

// Interface for user data
interface User {
  firstName: string;
  lastName: string;
}

const PatientDetails: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { patientId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Get session from navigation state
  const sessionData = location.state?.session;

  // State for patient goals
  const [goals] = useState<Goal[]>([
    {
      id: '1',
      title: 'Improve breathing control',
      description: 'Practice diaphragmatic breathing for 10 minutes daily',
      progress: 75
    },
    {
      id: '2',
      title: 'Reduce speech blocks',
      description: 'Use easy onset technique in conversation',
      progress: 60
    }
  ]);

  // State for patient exercises
  const [exercises] = useState<Exercise[]>([
    {
      id: '1',
      title: 'Daily breathing exercises',
      description: 'Practice deep breathing for 10 minutes',
      dueDate: '1/18/2026',
      status: 'completed'
    },
    {
      id: '2',
      title: 'Pacing practice',
      description: 'Read aloud with controlled pacing for 15 minutes',
      dueDate: '1/20/2026',
      status: 'pending'
    },
    {
      id: '3',
      title: 'Conversation exercise',
      description: 'Practice easy onset in daily conversations',
      dueDate: '1/22/2026',
      status: 'pending'
    }
  ]);

  useEffect(() => {
    // Get user data from localStorage
    const userStr = localStorage.getItem('userData');
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      
      // Security check: Only therapists can view patient details
      const userRole = userData?.user_role || userData?.role || userData?.userRole;
      if (userRole !== 'therapist') {
        navigate('/patient-dashboard');
        return;
      }
    } else {
      navigate('/login');
      return;
    }

    // Load patient data from session
    if (sessionData && sessionData.patient) {
      console.log('Patient data from session:', sessionData.patient);
      setPatientInfo(sessionData.patient);
    } else {
      console.log('No session data, patient ID from URL:', patientId);
    }
    
    setLoading(false);
  }, [navigate, sessionData, patientId]);

  // Handle logout button click
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    navigate('/login');
  };

  // Handle back to dashboard button click
  const handleBackToDashboard = () => {
    navigate('/therapist-dashboard');
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

        {/* Main Content Panel */}
        <main className="details-panel">
          {/* Page Header */}
          <div className="panel-header">
            <h2 className="panel-title">Patient Details</h2>
          </div>

          {/* Patient Info Card */}
          <div className="patient-info-card">
            {/* Patient Avatar Circle */}
            <div className="patient-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            
            {/* Patient Information Text */}
            <div className="patient-info-text">
              <h3 className="patient-name">
                {patientInfo?.first_name} {patientInfo?.last_name}
              </h3>
              <p className="patient-email">{patientInfo?.email}</p>
              
              {/* Joined Date with Calendar Icon */}
              <div className="patient-joined">
                <svg className="calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>
                  Joined {patientInfo?.therapy_start_date 
                    ? new Date(patientInfo.therapy_start_date).toLocaleDateString('en-US', {
                        month: 'numeric',
                        day: 'numeric', 
                        year: 'numeric'
                      })
                    : 'N/A'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Progress & Goals Section */}
          <div className="section-card">
            <div className="section-header">
              <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              <h3 className="section-title">Progress & Goals</h3>
            </div>

            {/* List of Goals */}
            <div className="goals-list">
              {goals.map((goal, index) => (
                <div 
                  key={goal.id} 
                  className="goal-item"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Goal Header - Title and Progress Percentage */}
                  <div className="goal-header">
                    <h4 className="goal-title">{goal.title}</h4>
                    <span className="goal-percentage">{goal.progress}%</span>
                  </div>
                  
                  {/* Goal Description */}
                  <p className="goal-description">{goal.description}</p>
                  
                  {/* Progress Bar */}
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${goal.progress}%`,
                        animationDelay: `${index * 0.1 + 0.2}s`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Exercises Section */}
          <div className="section-card">
            <div className="section-header">
              <h3 className="section-title">Assigned Exercises</h3>
            </div>

            {/* List of Exercises */}
            <div className="exercises-list">
              {exercises.map((exercise, index) => (
                <div 
                  key={exercise.id} 
                  className={`exercise-item ${exercise.status}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="exercise-content">
                    {/* Exercise Header - Title and Status Badge */}
                    <div className="exercise-header">
                      <h4 className="exercise-title">{exercise.title}</h4>
                      <span className={`status-badge ${exercise.status}`}>
                        {exercise.status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    
                    {/* Exercise Description */}
                    <p className="exercise-description">{exercise.description}</p>
                    
                    {/* Exercise Footer - Due Date */}
                    <div className="exercise-footer">
                      <div className="exercise-due">
                        <svg className="due-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                          <line x1="16" y1="2" x2="16" y2="6"/>
                          <line x1="8" y1="2" x2="8" y2="6"/>
                          <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        <span>Due: {exercise.dueDate}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Footer Section */}
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

export default PatientDetails;