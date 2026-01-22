import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './TherapistDashboard.css';

// Interface for session data structure 
interface Session {
  id: string;
  patientName: string;
  patientEmail: string;
  date: string;
  duration: string;
  notes: string;
  joinedDate: string;
}

// Interface for user data structure 
interface User {
  username: string;
  firstName: string;
  lastName: string;
}


const TherapistDashboard: React.FC = () => {
  const navigate = useNavigate();                           // navigation 
  const [user, setUser] = useState<User | null>(null);      // store current user information 
  const [sessions, setSessions] = useState<Session[]>([]);  // store list of therapy sessions 
  const [loading, setLoading] = useState(true);             // track loading status 

  useEffect(() => {
    // Get user from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      
      // Check if user is a therapist
      if (userData.role !== 'therapist') {
        navigate('/patient-dashboard');                     // redirects patients to their dashboard 
        return;
      }
    } else {
      navigate('/login');                                   // no user found - redirect to login page 
      return;
    }

    // Mock session data (will be replaced with API calls)
    const mockSessions: Session[] = [
      {
        id: '1',
        patientName: 'Alex Parker',
        patientEmail: 'alex.parker@email.com',
        date: '1/18/2026',
        duration: '45 min',
        notes: 'Great progress on breathing exercises. Continue with current program.',
        joinedDate: '11/15/2025'
      },
      {
        id: '2',
        patientName: 'Michael Chen',
        patientEmail: 'michael.chen@email.com',
        date: '1/17/2026',
        duration: '60 min',
        notes: 'Working on pacing techniques. Patient showing improvement.',
        joinedDate: '12/01/2025'
      },
      {
        id: '3',
        patientName: 'Emma Wilson',
        patientEmail: 'emma.wilson@email.com',
        date: '1/16/2026',
        duration: '45 min',
        notes: 'Introduction session. Assessed current speech patterns.',
        joinedDate: '01/10/2026'
      }
    ];

    // set sessions in state 
    setSessions(mockSessions);
    setLoading(false);
  }, [navigate]);

  // handle logout button click 
  const handleLogout = () => {
    localStorage.removeItem('token');                       // remove authentication data from localStorage 
    localStorage.removeItem('user');
    navigate('/login');                                     // redirect to login page 
  };

  // Handle 'View' button click for a patient 
  const handleViewPatient = (session: Session) => {
    navigate(`/patient-details/${session.id}`, { state: { session } });     // navigate to patient details page with the session data 
  };

  // showing loading spinner while data is being fetched 
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  // Main dashboard UI 
  return (
    <div className="therapist-dashboard">
      {/* Navigation Bar */}
      <nav className="dashboard-nav">
        <div className="nav-content">
            {/* App logo */}
          <h1 className="brand">OwnUrVoice</h1>
          <div className="nav-right">
            {/* Right side of navbar - welcome message and logout */}
            <span className="welcome-text">Welcome, {user?.firstName} {user?.lastName}</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="dashboard-container">
        {/* Left Sidebar Navigation */}
        <aside className="sidebar">
            {/* Dashboard menu item */}
          <div className="sidebar-item active">
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span>Dashboard</span>
          </div>

          {/* Patient details menu item */}
          <div className="sidebar-item">
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>Patient Details</span>
          </div>

          {/* Goals & Exercises menu item */}
          <div className="sidebar-item">
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span>Goals & Exercises</span>
          </div>

          {/* Resources menu item */}
          <div className="sidebar-item">
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <span>Resources</span>
          </div>
        </aside>

        {/* Main content panel (right side) */}
        <main className="main-panel">
            {/* Page header  */}
          <div className="panel-header">
            <h2 className="panel-title">Dashboard</h2>
            <p className="panel-subtitle">View and manage your patient sessions</p>
          </div>

          {/* Session card - contains table */}
          <div className="sessions-card">
            <h3 className="card-title">Recent Sessions</h3>
            
            {/* Table structure  */}
            <div className="sessions-table">
                {/* Table header row  */}
              <div className="table-header">
                <div className="th">PATIENT</div>
                <div className="th">DATE</div>
                <div className="th">DURATION</div>
                <div className="th">NOTES</div>
                <div className="th">ACTIONS</div>
              </div>

            {/* Table body - loop through all sessions  */}
              <div className="table-body">
                {sessions.map((session, index) => (
                  <div 
                    key={session.id} 
                    className="table-row"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {/* Patient Name column */}
                    <div className="td patient-name">{session.patientName}</div>
                    {/* Date column */}
                    <div className="td">{session.date}</div>
                    {/* Duration column  */}
                    <div className="td">{session.duration}</div>
                    {/* Notes column  */}
                    <div className="td notes">{session.notes}</div>
                    {/* Actions column with view button */}
                    <div className="td">
                      <button 
                        className="view-btn"
                        onClick={() => handleViewPatient(session)}
                      >
                        {/* Eye icon SVG  */}
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
          </div>
        </main>
      </div>

      {/* Footer section */}
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
