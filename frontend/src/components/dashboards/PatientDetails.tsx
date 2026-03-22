import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { getPatientGoals } from '../../services/supabaseTherapistService';
import { supabase } from '../../services/supabaseClient';
import './PatientDetails.css';

interface PatientInfo {
  first_name: string;
  last_name: string;
  email: string;
  therapy_start_date: string;
  user_id: string;
}

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
  const [goals, setGoals] = useState<any[]>([]);

  // Stores goal_id → array of goal_exercise_set rows
  const [goalExerciseRows, setGoalExerciseRows] = useState<Record<string, any[]>>({});

  const sessionData = location.state?.session;

  useEffect(() => {
    const userStr = localStorage.getItem('userData');
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      const userRole = userData?.user_role || userData?.role || userData?.userRole;
      if (userRole !== 'therapist') {
        navigate('/patient-dashboard');
        return;
      }
    } else {
      navigate('/login');
      return;
    }

    // check if session context already includes the nested patient object 
    if (sessionData && sessionData.patient) {

      // Update the UI state with the patient details already present in the session object 
      setPatientInfo(sessionData.patient);

      // Loads the patient's data from the database using patient's ID 
      loadPatientData(sessionData.patient.user_id);

      // If no session data is found, load the patient info using their ID instead 
    } else if (patientId) {
      loadPatientData(patientId);
    }

    setLoading(false);
  }, [navigate, sessionData, patientId]);

  /**
   * Fetches all goals and their associated exercises for a specific patient
   */
  const loadPatientData = async (patientUserId: string) => {
    try {
      // Retrieve the main list of goals for the patient 
      const goalsData = await getPatientGoals(patientUserId);
      setGoals(goalsData);

      // Prepare a map to store exercises, using goal IDs as keys
      const rowsMap: Record<string, any[]> = {};

      // Loop through each goal to fetch its specific exercises 
      for (const goal of goalsData) {
        const { data } = await supabase
          .from('goal_exercise_set')
          .select('*, exercise:exercise_id(*)') // Join with the exercise table to get full details
          .eq('goal_id', goal.goal_id);
        rowsMap[goal.goal_id] = data || [];
      }
      // Save the exercises grouped by their Goal IDs
      setGoalExerciseRows(rowsMap);
    } catch (err) {
      // Log any database or network errors 
      console.error('Error loading patient data:', err);
    }
  };

  /**
   * Gets unique exercises across all goals with their completion status.
   */
  const getAllExercisesWithStatus = () => {
    const exerciseMap: Record<string, {
      exercise: any;
      totalRows: number;
      completedRows: number;
      goalDescription: string;
    }> = {};

    goals.forEach(goal => {
      const rows = goalExerciseRows[goal.goal_id] || [];
      rows.forEach((row: any) => {
        const id = row.exercise_id;
        if (!exerciseMap[id]) {
          exerciseMap[id] = {
            exercise: row.exercise,
            totalRows: 0,
            completedRows: 0,
            goalDescription: goal.goal_description
          };
        }
        // Increment the total count for this specific exercise 
        exerciseMap[id].totalRows++;

        // If the current row is marked as done, increment the completed count
        if (row.completed) exerciseMap[id].completedRows++;
      });
    });

    /**
     * Convert the map into an array of objects for the UI 
     * And calculate the final 'status' label 
     */
    return Object.entries(exerciseMap).map(([id, data]) => ({
      exercise_id: id,
      ...data,

     // Determine status based on the ratio of completed rows to total rows  
      status: data.completedRows === 0
        ? 'pending' // Case 1: Nothing started 
        : data.completedRows === data.totalRows
        ? 'completed' // Case 2: Everything finished 
        : 'in-progress' // Case 3: Some rows finished, some remaining 
    }));
  };

  /**
   * Calculates a goal's completion percentage 
   * Each completed task adds 1% to the total, up to a maximum of 100%
   */
  const getGoalProgress = (goalId: string): number => {
    // Retrieve the list of exercises for this goal, default to an empty list if non found 
    const rows = goalExerciseRows[goalId] || [];

    // Count how many exercise rows have been marked as 'completed'
    const completedRows = rows.filter((r: any) => r.completed).length;

    // Return the count as a percentage, ensuring it never exceeds 100
    return Math.min(completedRows, 100);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    navigate('/login');
  };

  const handleBackToDashboard = () => {
    navigate('/therapist-dashboard');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString + 'T00:00:00Z');
    return date.toLocaleDateString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const allExercises = getAllExercisesWithStatus();

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
        <img src="/logo.jpg" alt="OwnUrVoice Logo" style={{ height: '70px', width: 'auto' }} />
          <div className="nav-right">
            <span className="welcome-text">Welcome, {user?.firstName} {user?.lastName}</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </nav>

      <div className="details-container">

        {/* Sidebar */}
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

          <div className="sidebar-item" onClick={() => navigate('/therapist/goals')} style={{ cursor: 'pointer' }}>
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
        <main className="details-panel">
          <div className="panel-header">
            <h2 className="panel-title">Patient Details</h2>
          </div>

          {/* Patient Info Card */}
          <div className="patient-info-card">
            <div className="patient-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className="patient-info-text">
              <h3 className="patient-name">
                {patientInfo?.first_name} {patientInfo?.last_name}
              </h3>
              <p className="patient-email">{patientInfo?.email}</p>
              <div className="patient-joined">
                <svg className="calendar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>Joined {formatDate(patientInfo?.therapy_start_date || '')}</span>
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

            {goals.length === 0 ? (
              <p style={{ color: '#6c757d', padding: '16px 0' }}>No goals set yet.</p>
            ) : (
              <div className="goals-list">
                {goals.map((goal, index) => {
                  const progress = getGoalProgress(goal.goal_id);
                  return (
                    <div
                      key={goal.goal_id}
                      className="goal-item"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="goal-header">
                        <h4 className="goal-title">{goal.goal_description}</h4>
                        <span className="goal-percentage">{progress}%</span>
                      </div>
                      <p className="goal-description">
                        Target: {formatDate(goal.target_date)}
                        &nbsp;·&nbsp;
                        Priority: {goal.priority}
                      </p>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${progress}%`,
                            animationDelay: `${index * 0.1 + 0.2}s`
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Assigned Exercises Section */}
          <div className="section-card">
            <div className="section-header">
              <h3 className="section-title">Assigned Exercises</h3>
            </div>

            {allExercises.length === 0 ? (
              <p style={{ color: '#6c757d', padding: '16px 0' }}>No exercises assigned yet.</p>
            ) : (
              <div className="exercises-list">
                {allExercises.map((item, index) => (
                  <div
                    key={item.exercise_id}
                    className={`exercise-item ${item.status === 'completed' ? 'completed' : item.status === 'in-progress' ? 'pending' : 'pending'}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="exercise-content">
                      <div className="exercise-header">
                        <h4 className="exercise-title">{item.exercise?.title}</h4>
                        {/* Status badge — Pending, In Progress or Completed */}
                        <span className={`status-badge ${item.status === 'completed' ? 'completed' : 'pending'}`}
                          style={{
                            backgroundColor: item.status === 'completed'
                              ? undefined
                              : item.status === 'in-progress'
                              ? '#dbeafe'
                              : undefined,
                            color: item.status === 'in-progress' ? '#2563eb' : undefined
                          }}
                        >
                          {item.status === 'completed'
                            ? 'Completed'
                            : item.status === 'in-progress'
                            ? 'In Progress'
                            : 'Pending'}
                        </span>
                      </div>

                      <p className="exercise-description">{item.exercise?.description}</p>

                      {/* Progress count */}
                      <div className="exercise-footer">
                        <div className="exercise-due">
                          <svg className="due-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          <span>
                            {item.completedRows} of {item.totalRows} sessions completed
                            &nbsp;·&nbsp;
                            {item.exercise?.recommended_frequency}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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

export default PatientDetails;