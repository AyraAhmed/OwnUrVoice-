import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { getPatientGoals } from '../../services/supabaseTherapistService';
import { supabase } from '../../services/supabaseClient';
import './PatientDetails.css';

/**
 * Minimal patient info needed for the header card on this page
 */
interface PatientInfo {
  first_name: string;
  last_name: string;
  email: string;
  therapy_start_date: string;
  user_id: string;
}

/**
 * Represents the logged-in therapist's session data
 */
interface User {
  firstName: string;
  lastName: string;
}

/**
 * Shows a specific patient's goals, progress bars, and assigned exercises
 * Therapists navigate here from the session table or the patients list
 */
const PatientDetails: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { patientId } = useParams();

  const [user, setUser] = useState<User | null>(null);
  const [patientInfo, setPatientInfo] = useState<PatientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<any[]>([]);
  // Tracks which filter tab the therapist has selected — defaults to showing all goals
  const [goalFilter, setGoalFilter] = useState<'all' | 'in-progress' | 'completed'>('all');

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
   * Builds a map of exercises, counting total and completed rows for each one
   */
  const getAllExercisesWithStatus = () => {
    // Map to store each unique exercise with its progress data 
    const exerciseMap: Record<string, {
      exercise: any;
      totalRows: number;
      completedRows: number;
      goalDescription: string;
    }> = {};

    // Loop through every goal
    goals.forEach(goal => {
      // Get all exercise rows linked to this goal 
      const rows = goalExerciseRows[goal.goal_id] || [];
      // Loop through each row and group them by exercise_id
      rows.forEach((row: any) => {
        const id = row.exercise_id;
        // If this exercises hasn't been seen before, initialise its entry in the map
        if (!exerciseMap[id]) {
          exerciseMap[id] = {
            exercise: row.exercise,   // Full exercise details
            totalRows: 0,            // Total scheduled sessions
            completedRows: 0,       // Completed sessions 
            goalDescription: goal.goal_description // Which goal this exercise belongs to
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
    const rows = goalExerciseRows[goalId] || [];
    const totalRows = rows.length;
    if (totalRows === 0) return 0;
    const completedRows = rows.filter((r: any) => r.completed).length;
    return Math.round((completedRows / totalRows) * 100);
  };

  /**
   * Clears session tokens and redirects to login
   */
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    navigate('/login');
  };

  /**
   * Takes the therapist back to the main dashboard
   */
  const handleBackToDashboard = () => {
    navigate('/therapist-dashboard');
  };

  /**
   * Formats an ISO date string to short GB format e.g. 01/04/2026
   */
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

      {/* Navigation Bar — displays the platform logo, welcome message and logout button */}
      <nav className="dashboard-nav">
        <div className="nav-content">
        {/* Platform logo */}
        <img src="/logo.jpg" alt="OwnUrVoice Logo" style={{ height: '70px', width: 'auto' }} />
          <div className="nav-right">
            {/* Display the logged-in therapist's full name */}
            <span className="welcome-text">Welcome, {user?.firstName} {user?.lastName}</span>
            {/* Logout button — clears session data and redirects to login */}
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </nav>

      {/* Main Content Container */}
      <div className="details-container">

        {/* Left Sidebar Navigation */}
        <aside className="sidebar">

          {/* Dashboard — navigates back to the main dashboard */}
          <div className="sidebar-item" onClick={handleBackToDashboard}>
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span>Dashboard</span>
          </div>

          {/* Patient Details — active page, highlighted in purple */}
          <div className="sidebar-item active">
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>Patient Details</span>
          </div>

          {/* Goals & Exercises — navigates to the goals and exercises page */}
          <div className="sidebar-item" onClick={() => navigate('/therapist/goals')} style={{ cursor: 'pointer' }}>
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span>Goals & Exercises</span>
          </div>

          {/* Resources — navigates to the resources page */}
          <div className="sidebar-item">
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <span>Resources</span>
          </div>
        </aside>

        {/* Main Panel — contains the patient details content */}
        <main className="details-panel">
          {/* Page Header */}
          <div className="panel-header">
            <h2 className="panel-title">Patient Details</h2>
          </div>

          {/* Patient Info Card — displays the patient's name, email and join date */}
          <div className="patient-info-card">
            {/* Patient avatar — placeholder icon */}
            <div className="patient-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className="patient-info-text">
              {/* Patient full name */}
              <h3 className="patient-name">
                {patientInfo?.first_name} {patientInfo?.last_name}
              </h3>
              {/* Patient email */}
              <p className="patient-email">{patientInfo?.email}</p>
              {/* Therapy start date — formatted to GB format */}
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
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg className="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                <h3 className="section-title">Progress & Goals</h3>
              </div>

              {/* Filter buttons — highlight the currently active tab */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['all', 'in-progress', 'completed'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setGoalFilter(f)}
                    style={{
                      padding: '5px 14px', borderRadius: '20px', fontSize: '12px',
                      fontWeight: '500', cursor: 'pointer', border: '1px solid',
                      // Active filter gets purple background, inactive stays white
                      borderColor: goalFilter === f ? '#6366f1' : '#dee2e6',
                      backgroundColor: goalFilter === f ? '#6366f1' : '#fff',
                      color: goalFilter === f ? '#fff' : '#6c757d',
                      transition: 'all 0.15s'
                    }}
                  >
                    {f === 'all' ? 'All' : f === 'in-progress' ? 'In Progress' : 'Completed'}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Empty state — shown when no goals have been assigned yet */}
            {goals.length === 0 ? (
              <p style={{ color: '#6c757d', padding: '16px 0' }}>No goals set yet.</p>
            ) : (() => {
              // Filter goals based on the selected tab
              const filteredGoals = goals.filter(goal => {
                const p = getGoalProgress(goal.goal_id);
                if (goalFilter === 'completed') return p === 100;   // Case 1: only fully done goals
                if (goalFilter === 'in-progress') return p < 100;   // Case 2: only goals still in progress
                return true;                                         // Case 3: show everything
              });

              // Show a helpful empty state if no goals match the selected filter
              if (filteredGoals.length === 0) return (
                <p style={{ color: '#6c757d', padding: '16px 0' }}>
                  No {goalFilter === 'completed' ? 'completed' : 'in-progress'} goals yet.
                </p>
              );
              return (
              <div className="goals-list">
                {filteredGoals.map((goal, index) => {
                  const progress = getGoalProgress(goal.goal_id);
                  // Flag used to switch the card to green styling and show the completed badge when goal is fully completed
                  const goalComplete = progress === 100;
                  return (
                    <div
                      key={goal.goal_id}
                      className="goal-item"
                      style={{
                        animationDelay: `${index * 0.1}s`,
                        // Turn the card green when the goal is fully completed
                        ...(goalComplete ? { backgroundColor: '#f0fdf4', borderColor: '#86efac' } : {})
                      }}
                    >
                      <div className="goal-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {/* Goal description */}
                          <h4 className="goal-title" style={{ margin: 0 }}>{goal.goal_description}</h4>
                          {/* Completed badge — only shown when progress reaches 100% */}
                          {goalComplete && (
                            <span style={{
                              fontSize: '11px', padding: '2px 10px', borderRadius: '20px',
                              backgroundColor: '#22c55e', color: '#fff', fontWeight: '600', flexShrink: 0
                            }}>
                              ✓ Completed
                            </span>
                          )}
                        </div>
                        {/* Progress percentage — green when completed, purple when in progress */}
                        <span className="goal-percentage" style={{ color: goalComplete ? '#22c55e' : undefined }}>
                          {progress}%
                        </span>
                      </div>
                      {/* Goal target date and priority */}
                      <p className="goal-description">
                        Target: {formatDate(goal.target_date)}
                        &nbsp;·&nbsp;
                        Priority: {goal.priority}
                      </p>
                       {/* Goal progress bar — fills based on completed rows divide by total rows */}
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
              );
            })()}
          </div>

          {/* Assigned Exercises Section */}
          <div className="section-card">
            <div className="section-header">
              <h3 className="section-title">Assigned Exercises</h3>
            </div>

            {/* Empty state — shown when no exercises have been assigned yet */}
            {allExercises.length === 0 ? (
              <p style={{ color: '#6c757d', padding: '16px 0' }}>No exercises assigned yet.</p>
            ) : (() => {
              // Keep exercises in sync with the goal filter so both sections
              // always reflect the same selected tab
              const filteredExercises = allExercises.filter(item => {
                if (goalFilter === 'completed') return item.status === 'completed';         // Case 1: only fully done exercises
                if (goalFilter === 'in-progress') return item.status !== 'completed';       // Case 2: pending or in-progress exercises
                return true;                                                                // Case 3: show everything
              });

              // Show a helpful empty state if no exercises match the selected filter
              if (filteredExercises.length === 0) return (
                <p style={{ color: '#6c757d', padding: '16px 0' }}>
                  No {goalFilter === 'completed' ? 'completed' : 'in-progress'} exercises yet.
                </p>
              );
              return (
              <div className="exercises-list">
                {/* Loop through each exercise and render a card */}
                {filteredExercises.map((item, index) => (
                  <div
                    key={item.exercise_id}
                    className={`exercise-item ${item.status === 'completed' ? 'completed' : item.status === 'in-progress' ? 'pending' : 'pending'}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="exercise-content">
                      {/* Exercise Header — title and status badge */}
                      <div className="exercise-header">
                        {/* Exercise title */}
                        <h4 className="exercise-title">{item.exercise?.title}</h4>
                        {/* Status badge — Pending, In Progress or Completed */}
                        <span className={`status-badge ${item.status === 'completed' ? 'completed' : 'pending'}`}
                          style={{
                            // Blue background for in-progress, default for others
                            backgroundColor: item.status === 'completed'
                              ? undefined
                              : item.status === 'in-progress'
                              ? '#dbeafe'
                              : undefined,
                            color: item.status === 'in-progress' ? '#2563eb' : undefined
                          }}
                        >
                          {/* Display the correct label based on the exercise status */}
                          {item.status === 'completed'
                            ? 'Completed'
                            : item.status === 'in-progress'
                            ? 'In Progress'
                            : 'Pending'}
                        </span>
                      </div>
                      
                      {/* Exercise description */}
                      <p className="exercise-description">{item.exercise?.description}</p>

                      {/* Exercise Footer- Progress count, session completion count and frequency  */}
                      <div className="exercise-footer">
                        <div className="exercise-due">
                          <svg className="due-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          {/* Session completion count and frequency */}
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
              );
            })()}
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