import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getPatientProfile,
  getPatientActiveGoals,
  getPatientUpcomingSessions,
  PatientProfile
} from '../../services/supabasePatientService';
import { Goal, Session } from '../../services/supabaseTherapistService';
import { supabase } from '../../services/supabaseClient';
import '../../components/dashboards/TherapistDashboard.css';

// Days of the week used for building the exercise table columns
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Colour scale for difficulty ratings 0–10
const difficultyColors: Record<number, string> = {
  0: '#d1d5db', 1: '#22c55e', 2: '#4ade80', 3: '#86efac',
  4: '#facc15', 5: '#fb923c', 6: '#f97316', 7: '#ef4444',
  8: '#dc2626', 9: '#b91c1c', 10: '#7f1d1d'
};

// Readable labels for each difficulty rating level
const difficultyLabels: Record<number, string> = {
  0: 'Nothing', 1: 'Very Easy', 2: 'Easy', 3: 'Fairly Easy', 4: 'Somewhat Easy',
  5: 'Moderate', 6: 'Somewhat Hard', 7: 'Hard', 8: 'Somewhat Difficult',
  9: 'Difficult', 10: 'Challenging'
};

/**
 * A small circular button that opens a 0–10 difficulty picker
 * Patients tap the circle to log how hard an exercise felt
 * Clicking the same value again will clear the rating
 */
const DifficultyDropdown: React.FC<{
  currentRating: number | null | undefined;
  onSelect: (val: number) => void;
  onClear: () => void;
}> = ({ currentRating, onSelect, onClear }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect = (val: number) => {
    if (currentRating === val) { onClear(); } else { onSelect(val); }
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '36px', height: '36px', borderRadius: '50%',
          backgroundColor: currentRating !== null && currentRating !== undefined
            ? difficultyColors[currentRating] : '#e9ecef',
          color: currentRating !== null && currentRating !== undefined ? '#fff' : '#6c757d',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 'bold', fontSize: '13px', cursor: 'pointer',
          border: '2px solid',
          borderColor: currentRating !== null && currentRating !== undefined
            ? difficultyColors[currentRating] : '#dee2e6',
          transition: 'all 0.15s', userSelect: 'none'
        }}
      >
        {currentRating !== null && currentRating !== undefined ? currentRating : '—'}
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '42px', left: '50%',
          transform: 'translateX(-50%)', backgroundColor: '#fff',
          border: '1px solid #dee2e6', borderRadius: '12px', padding: '10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 1000,
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '6px', width: '200px'
        }}>
          <div
            onClick={() => { onClear(); setIsOpen(false); }}
            style={{
              gridColumn: '1 / -1', padding: '6px', textAlign: 'center',
              fontSize: '12px', color: '#6c757d', cursor: 'pointer',
              borderRadius: '6px', backgroundColor: '#f8f9fa', marginBottom: '4px'
            }}
          >
            Clear rating
          </div>
          {Object.entries(difficultyColors).map(([val, color]) => {
            const numVal = parseInt(val);
            const isSelected = currentRating === numVal;
            const label = difficultyLabels[numVal];
            return (
              <div
                key={val}
                onClick={() => handleSelect(numVal)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
              >
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  backgroundColor: isSelected ? color : '#f0f0f0',
                  color: isSelected ? '#fff' : '#6c757d',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 'bold', fontSize: '13px',
                  border: `2px solid ${isSelected ? color : '#dee2e6'}`,
                  transition: 'all 0.15s'
                }}>
                  {val}
                </div>
                {label && (
                  <span style={{
                    fontSize: '9px', color: isSelected ? color : '#adb5bd',
                    fontWeight: isSelected ? '600' : '400', textAlign: 'center',
                    lineHeight: '1.1', maxWidth: '40px'
                  }}>
                    {label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Patient-facing goals and exercises tracker
 * Shows active goals with progress bars, and a weekly exercise schedule
 * Patients can tick off exercises and rate their difficulty from here
 */
const PatientGoalsProgress: React.FC = () => {
  const navigate = useNavigate();

  // Patient data
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  // UI state 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter state
  // Tracks which filter tab the patient has selected — defaults to showing all goals
  const [goalFilter, setGoalFilter] = useState<'all' | 'in-progress' | 'completed'>('all');

  // Stores goal_id → all exercise rows with their completion and difficulty data
  const [goalExerciseRows, setGoalExerciseRows] = useState<Record<string, any[]>>({});

  // Pull user data from local storage to get the patient ID
  const userDataString = localStorage.getItem('userData');
  const userData = userDataString ? JSON.parse(userDataString) : null;

  // Used to highlight today's column in the exercise table
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  useEffect(() => {
    if (!userData) { navigate('/login'); return; }
    const role = userData.user_role || userData.role;
    if (role !== 'patient') { navigate('/login'); return; }
    loadGoalsData();
  }, []);

  /**
   * Fetches the patient's profile, active goals, sessions, and all exercise rows on load
   */
  const loadGoalsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const profileData = await getPatientProfile(userData.user_id);
      if (!profileData) { setError('Patient profile not found'); return; }
      setProfile(profileData);

      const [goalsData, sessionsData] = await Promise.all([
        getPatientActiveGoals(profileData.user_id),
        getPatientUpcomingSessions(profileData.user_id)
      ]);

      setActiveGoals(goalsData);
      setSessions(sessionsData);

      // Fetch every exercise row for every goal and store them grouped by goal_id
      // This powers both the progress bars and the weekly schedule tables
      const rowsMap: Record<string, any[]> = {};
      for (const goal of goalsData) {
        const { data } = await supabase
          .from('goal_exercise_set')
          .select('*, exercise:exercise_id(*)')
          .eq('goal_id', goal.goal_id)
          // Order by created_at first so exercises always appear in the order
          // they were assigned — week and day ordering is applied after that
          .order('created_at', { ascending: true })
          .order('week_number', { ascending: true })
          .order('day_of_week', { ascending: true });
        rowsMap[goal.goal_id] = data || [];
      }
      setGoalExerciseRows(rowsMap);

    } catch (err: any) {
      console.error('Error loading goals:', err);
      setError(err.message || 'Failed to load goals data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Re-fetches all exercise rows for every active goal after a checkbox
   * toggle or difficulty save, so the UI reflects the latest DB state
   */
  const refreshRows = async () => {
    const rowsMap: Record<string, any[]> = {};
    for (const goal of activeGoals) {
      const { data } = await supabase
        .from('goal_exercise_set')
        .select('*, exercise:exercise_id(*)')
        .eq('goal_id', goal.goal_id)
        // Same stable ordering as the initial load so exercises never swap places
        .order('created_at', { ascending: true })
        .order('week_number', { ascending: true })
        .order('day_of_week', { ascending: true });
      rowsMap[goal.goal_id] = data || [];
    }
    setGoalExerciseRows(rowsMap);
  };

  /**
   * Flips the completed status of a single exercise row and timestamps the change
   */
  const handleToggleDay = async (rowId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('goal_exercise_set')
        .update({
          // Toggle the completed status - if true set to false, if false set to true
          completed: !currentStatus,
          // Timestamp the completion if ticking, clear the data if unticking
          completion_date: !currentStatus ? new Date().toISOString() : null
        })
        .eq('row_id', rowId); // Only update the specific row the patient clicked
      if (error) throw error;
      // Refresh all rows so the progress bar updates immediately 
      await refreshRows();
    } catch (err: any) {
      setError(err.message || 'Failed to update exercise');
    }
  };

  /**
   * Saves the patient's difficulty rating for a specific exercise row
   */
  const handleSaveDifficulty = async (rowId: string, rating: number) => {
    try {
      const { error } = await supabase
        .from('goal_exercise_set')
        .update({ difficulty_rating: rating }) // Save the selected 0-10 rating
        .eq('row_id', rowId); // Only update the specific row 
      if (error) throw error;
      setSuccessMessage('Difficulty saved!');
      // Refresh rows so the updated rating circle appears immediately 
      await refreshRows();
      // Clear the success message after 2 seconds 
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save difficulty');
    }
  };

  /**
   * Removes the difficulty rating from a row — resets the circle back to the default dash
   */
  const handleClearDifficulty = async (rowId: string) => {
    try {
      const { error } = await supabase
        .from('goal_exercise_set')
        .update({ difficulty_rating: null }) // Set rating back to null to show the default dash
        .eq('row_id', rowId); // Only update the specific row 
      if (error) throw error;
      // Refresh rows so the cleared rating circle appears immediately 
      await refreshRows();
    } catch (err: any) {
      setError(err.message || 'Failed to clear difficulty');
    }
  };

  /**
   * Clears session data and sends the patient back to login
   */
  const handleLogout = () => {
    localStorage.removeItem('userData');
    navigate('/login');
  };

  /**
   * Formats a date string to short GB format e.g. 1/4/2026
   */
  const formatShortDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'numeric', year: 'numeric'
    });
  };

  /**
   * Returns the exercises linked to a goal, grouped by exercise_id.
   * Exercises are sorted by their earliest created_at so the display order
   * stays consistent even after a row is updated in the database
   */
  const getExercisesForGoal = (goalId: string) => {
    // Retrieve all rows for this goal, default to empty array if none found
    const allRows = goalExerciseRows[goalId] || [];

    // Group every row under its exercise_id
    const exerciseMap: Record<string, any[]> = {};
    allRows.forEach((r: any) => {
      if (!exerciseMap[r.exercise_id]) exerciseMap[r.exercise_id] = [];
      exerciseMap[r.exercise_id].push(r);
    });

    // Sort exercise IDs by the earliest row created_at so the order is based
    // on data values, not on whichever row PostgreSQL happens to return first
    const exerciseIds = Object.keys(exerciseMap).sort((a, b) => {
      const aMin = Math.min(...exerciseMap[a].map((r: any) => new Date(r.created_at).getTime()));
      const bMin = Math.min(...exerciseMap[b].map((r: any) => new Date(r.created_at).getTime()));
      return aMin - bMin; // Sort ascending - earliest created exercise appears first
    });

    // Return each exercise with its ID, full details and all its scheduled rows
    return exerciseIds.map((id: string) => ({
      exerciseId: id,
      exerciseInfo: exerciseMap[id][0]?.exercise, // Full exercise details from the first row 
      rows: exerciseMap[id],                     //  All scheduled rows for this exercise 
    }));
  };

  /**
   * Calculates the exercise progress bar percentage
   * Formula: completed checkboxes ÷ total checkboxes × 100, capped at 100%
   */
  const getExerciseProgress = (rows: any[]): number => {
    const completedRows = rows.filter((r: any) => r.completed).length;
    const totalRows = rows.length;
    if (totalRows === 0) return 0;
    return Math.min(Math.round((completedRows / totalRows) * 100), 100); // e.g. 7 ÷ 14 × 100 = 50%
  };

  /**
   * Calculates an overall completion percentage for a goal
   * Formula: completed checkboxes ÷ total checkboxes × 100
   * Loops through every exercise linked to the goal and adds up all the rows
   */
  const getGoalProgress = (goalId: string): number => {
    const exercises = getExercisesForGoal(goalId);
    let completedRows = 0;
    let totalRows = 0;
    exercises.forEach(({ rows }) => {
      completedRows += rows.filter((r: any) => r.completed).length;
      totalRows += rows.length;
    });
    if (totalRows === 0) return 0;
    return Math.round((completedRows / totalRows) * 100); // e.g. 7 ÷ 14 × 100 = 50%
  };

  /**
   * Detects the schedule type of an exercise based on its row data
   * Used to decide which column layout to render in the exercise table
   */
  const getFrequencyType = (rows: any[]): 'daily' | 'twice_daily' | 'weekly' | 'other' => {
    // Extract all valid 'day of week labels from the rows 
    const dayValues = rows.map(r => r.day_of_week).filter(Boolean);
    // Check for specific 'Morning' or 'Afternoon' keywords 
    if (dayValues.some((d: string) => d.includes('Morning') || d.includes('Afternoon'))) return 'twice_daily'; // Found AM/PM indicators 
    // If we have days listed but no AM/PM, it's a standard daily schedule
    if (dayValues.length > 0) return 'daily';
    // Looks for week numbers if days labels are missing 
    if (rows.some(r => r.week_number)) return 'weekly'; // Found 'Week 1', 'Week 2' etc
    return 'other'; // Default if no recognisable pattern is found
  };

  /**
   * Calculates whether a cell (day column in a week row) is before
   * the date the exercise was created — used to grey out past days
   */
  const isCellBeforeCreation = (
    rows: any[],
    weekNum: number,
    weekNumbers: number[],
    dayIndex: number
  ): boolean => {
    if (!rows[0]?.created_at) return false;

    // Get the date the exercise was created (time zeroed out)
    const createdAt = new Date(rows[0].created_at);
    createdAt.setHours(0, 0, 0, 0);

    // Day index of the creation date (0=Mon, 6=Sun)
    const createdDayIndex = createdAt.getDay() === 0 ? 6 : createdAt.getDay() - 1;

    // Only grey out days in week 1 that are before the creation day
    if (weekNum === weekNumbers[0] && dayIndex < createdDayIndex) return true;

    return false;
  };

  /**
   * Returns the inline style object for a sidebar nav item
   * Active item gets the purple highlight, inactive stays grey
   */
  const navItem = (active: boolean) => ({
    display: 'flex', alignItems: 'center', padding: '12px 20px', cursor: 'pointer',
    color: active ? '#6366f1' : '#6c757d',
    backgroundColor: active ? '#e0e7ff' : 'transparent',
    borderLeft: active ? '3px solid #6366f1' : '3px solid transparent',
    fontSize: '14px'
  });

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
        width: '240px', backgroundColor: '#fff',
        borderRight: '1px solid #dee2e6', padding: '20px 0'
      }}>
        {/* Platform logo */}
        <div style={{ padding: '0 20px', marginBottom: '30px' }}>
          <img src="/logo.jpg" alt="OwnUrVoice Logo" style={{ height: '100px', width: 'auto' }} />
        </div>
        {/* Sidebar Navigation */}
        <nav>
          {/* Dashboard — navigates back to the patient dashboard */}
          <div style={navItem(false)} onClick={() => navigate('/patient-dashboard')}>
            <i className="bi bi-grid me-2"></i>Dashboard
          </div>
          {/* Goals & Progress — active page, highlighted in purple */}
          <div style={navItem(true)} onClick={() => navigate('/patient/goals-progress')}>
            <i className="bi bi-bullseye me-2"></i>Goals & Progress
          </div>
          {/* Journal — navigates to the journal page */}
          <div style={navItem(false)} onClick={() => navigate('/patient/journal')}>
            <i className="bi bi-journal-text me-2"></i>Journal
          </div>
          {/* Community — navigates to the community page */}
          <div style={navItem(false)} onClick={() => navigate('/patient/community')}>
            <i className="bi bi-people me-2"></i>Community
          </div>
          {/* Resources — navigates to the resources page */}
          <div style={navItem(false)} onClick={() => navigate('/patient/resources')}>
            <i className="bi bi-folder me-2"></i>Resources
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Top Bar - displays welcome message and logout button */}
        <div style={{
          backgroundColor: '#fff', borderBottom: '1px solid #dee2e6',
          padding: '16px 32px', display: 'flex',
          justifyContent: 'flex-end', alignItems: 'center'
        }}>
          {/* Display the logged-in patient's first name */}
          <span style={{ marginRight: '20px', color: '#6c757d' }}>
            Welcome, {profile?.first_name}
          </span>
          {/* Logout button — clears session data and redirects to login */}
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
        <div style={{ flex: 1, padding: '32px', maxWidth: '1050px', margin: '0 auto', overflowY: 'auto' }}>

          {/* Success message — shown briefly after saving a difficulty rating */}
          {successMessage && (
            <div className="alert alert-success alert-dismissible fade show">
              {successMessage}
              <button type="button" className="btn-close" onClick={() => setSuccessMessage(null)}></button>
            </div>
          )}

          {/* Error message — shown if a checkbox toggle or difficulty save fails */}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show">
              {error}
              <button type="button" className="btn-close" onClick={() => setError(null)}></button>
            </div>
          )}

          {/* Page heading and filter buttons sit side by side */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ marginBottom: '4px' }}>Goals & Progress</h2>
              <p style={{ color: '#6c757d', margin: 0 }}>Track your therapy goals and complete your exercises</p>
            </div>

            {/* Filter buttons — highlight the currently active tab */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['all', 'in-progress', 'completed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setGoalFilter(f)}
                  style={{
                    padding: '6px 16px', borderRadius: '20px', fontSize: '13px',
                    fontWeight: '500', cursor: 'pointer', border: '1px solid',
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
          <div style={{ marginBottom: '32px' }} />

          {(() => {
            // Show a message if the patient has no goals at all
            if (activeGoals.length === 0) return <p className="text-muted">No active goals yet. Your therapist will assign goals for you.</p>;

            // Filter goals based on the selected tab
            const filteredGoals = activeGoals.filter(goal => {
              const p = getGoalProgress(goal.goal_id);
              if (goalFilter === 'completed') return p === 100;   // Case 1: only fully done goals
              if (goalFilter === 'in-progress') return p < 100;   // Case 2: only goals still in progress
              return true;                                         // Case 3: show everything
            });

            // Show a helpful empty state if no goals match the selected filter
            if (filteredGoals.length === 0) return (
              <p className="text-muted">
                No {goalFilter === 'completed' ? 'completed' : 'in-progress'} goals yet.
              </p>
            );
             {/* Goal Cards  */}
             {/* One card per goal — each card contains a progress bar and the full exercise schedule table */}
            return filteredGoals.map(goal => {
              const linkedExercises = getExercisesForGoal(goal.goal_id);
              const progress = getGoalProgress(goal.goal_id);

              // Count total and completed rows across all exercises for this goal
              const totalRows = linkedExercises.reduce((sum, e) => sum + e.rows.length, 0);
              const completedRows = linkedExercises.reduce(
                (sum, e) => sum + e.rows.filter((r: any) => r.completed).length, 0
              );

              // Flag used to switch the card to green styling and show the completed badge when goal is fully completed
              const goalComplete = progress === 100;
              return (
                <div
                  key={goal.goal_id}
                  style={{
                    // Turn the card green when the goal is fully completed
                    backgroundColor: goalComplete ? '#f0fdf4' : '#fff',
                    border: `1px solid ${goalComplete ? '#86efac' : '#dee2e6'}`,
                    borderRadius: '12px', padding: '16px', marginBottom: '16px'
                  }}
                >
                  {/* Goal Header */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'start', marginBottom: '8px'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <h5 style={{ margin: 0, color: '#1a1a2e' }}>
                            🎯 {goal.goal_description}
                          </h5>
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
                        {/* Goal priority and target date */}
                        <small style={{ color: '#6c757d', display: 'block', textAlign: 'left', paddingLeft: '34px' }}>
                          {goal.priority} priority &nbsp;·&nbsp; Target: {formatShortDate(goal.target_date)}
                        </small>
                      </div>
                      {/* Progress percentage — green when completed, purple when in progress */}
                      <span style={{ color: goalComplete ? '#22c55e' : '#6366f1', fontWeight: 'bold', fontSize: '20px', flexShrink: 0 }}>
                        {progress}%
                      </span>
                    </div>
                    {/* Goal progress bar — fills based on completed rows divide by total rows */}
                    <div style={{
                      width: '100%', height: '10px', backgroundColor: '#e9ecef',
                      borderRadius: '5px', overflow: 'hidden', marginBottom: '6px'
                    }}>
                      <div style={{
                        width: `${progress}%`, height: '100%',
                        // Green when completed, purple when in progress
                        backgroundColor: progress === 100 ? '#22c55e' : '#6366f1',
                        transition: 'width 0.4s ease'
                      }}></div>
                    </div>
                    {/* Session completion count */}
                    <small style={{ color: '#6c757d' }}>
                      {completedRows} of {totalRows} sessions completed
                    </small>
                  </div>

                  {/* Exercises */}
                  {linkedExercises.length === 0 ? (
                    // Empty state — shown when no exercises have been assigned to this goal yet
                    <p style={{ color: '#6c757d', fontSize: '14px', fontStyle: 'italic' }}>
                      No exercises assigned for this goal yet.
                    </p>
                  ) : (
                    <div>
                      <h6 style={{ color: '#6366f1', marginBottom: '16px', fontSize: '14px' }}>
                        📋 Exercises
                      </h6>

                      {/* Loop through each exercise linked to this goal */}
                      {linkedExercises.map(({ exerciseId, rows, exerciseInfo }) => {
                        // Detect the schedule type to determine which layout table to render
                        const frequencyType = getFrequencyType(rows);

                        // Sort rows into the correct column order depending on the schedule type
                        // Twice daily: sort by day then Morning before Afternoon
                        // Daily: sort by day of week Mon→Sun
                        // Weekly: sort by week number ascending
                        const sortedRows = frequencyType === 'twice_daily'
                          ? [...rows].sort((a: any, b: any) => {
                            // Sort twice daily rows by day first, then Morning before Afternoon
                              const dayA = a.day_of_week?.replace(' Morning', '').replace(' Afternoon', '') || '';
                              const dayB = b.day_of_week?.replace(' Morning', '').replace(' Afternoon', '') || '';
                              const dayDiff = DAYS.indexOf(dayA) - DAYS.indexOf(dayB);
                              if (dayDiff !== 0) return dayDiff;
                              return a.day_of_week?.includes('Morning') ? -1 : 1;
                            })
                          : frequencyType === 'daily'
                          // Sort daily rows by day of week Mon to Sun
                          ? [...rows].sort((a: any, b: any) =>
                              DAYS.indexOf(a.day_of_week) - DAYS.indexOf(b.day_of_week)
                            )
                          : frequencyType === 'weekly'
                          // Sort weekly rows by week number ascending
                          ? [...rows].sort((a: any, b: any) => (a.week_number || 0) - (b.week_number || 0))
                          : rows;

                        // Flag used to switch the exercise card to green when all sessions are done
                        const exComplete = getExerciseProgress(rows) === 100;
                        return (
                          <div
                            key={exerciseId}
                            style={{
                              // Turn the exercise card green when every session is completed
                              backgroundColor: exComplete ? '#f0fdf4' : '#fafafa',
                              border: `1px solid ${exComplete ? '#86efac' : '#e9ecef'}`,
                              borderRadius: '10px', padding: '16px', marginBottom: '16px'
                            }}
                          >
                            {/* Exercise Header */}
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '10px',
                              marginBottom: '12px', flexWrap: 'wrap'
                            }}>
                              {/* Exercise title */}
                              <span style={{ fontWeight: '600', fontSize: '15px', color: '#1a1a2e', flex: 1 }}>
                                {exerciseInfo?.title}
                              </span>
                              {/* Completed badge — only shown when all sessions are ticked */}
                              {exComplete && (
                                <span style={{
                                  fontSize: '11px', padding: '2px 10px', borderRadius: '20px',
                                  backgroundColor: '#22c55e', color: '#fff', fontWeight: '600'
                                }}>
                                  ✓ Completed
                                </span>
                              )}

                              {/* Exercise description */}
                              {exerciseInfo?.description && (
                                <span style={{ fontSize: '13px', color: '#6c757d' }}>
                                  {exerciseInfo.description}
                                </span>
                              )}

                              {/* Difficulty level badge */}
                              <span style={{
                                padding: '3px 10px', borderRadius: '20px',
                                fontSize: '11px', backgroundColor: '#e0e7ff', color: '#6366f1'
                              }}>
                                {exerciseInfo?.difficulty_level}
                              </span>

                              {/* Frequency badge */}
                              <span style={{ fontSize: '12px', color: '#6c757d' }}>
                                🔁 {exerciseInfo?.recommended_frequency}
                              </span>
                            </div>

                            {/* Exercise progress bar — completed divide by total × 100 */}
                            {(() => {
                              const exProgress = getExerciseProgress(rows); // percentage (0–100)
                              const exCompleted = rows.filter((r: any) => r.completed).length; // ticked checkboxes
                              const exTotal = rows.length; // total scheduled slots
                              return (
                                <div style={{ marginBottom: '16px' }}>
                                  <div style={{
                                    display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'center', marginBottom: '4px'
                                  }}>
                                    {/* Session completion count */}
                                    <small style={{ color: '#6c757d', fontSize: '12px' }}>
                                      {exCompleted} of {exTotal} sessions completed
                                    </small>
                                    {/* Progress percentage — green when completed, purple when in progress */}
                                    <small style={{
                                      color: exProgress === 100 ? '#22c55e' : '#6366f1',
                                      fontWeight: 'bold', fontSize: '12px'
                                    }}>
                                      {exProgress}%
                                    </small>
                                  </div>
                                  {/* Progress bar — fills based on completed divide total */}
                                  <div style={{
                                    width: '100%', height: '6px', backgroundColor: '#e9ecef',
                                    borderRadius: '3px', overflow: 'hidden'
                                  }}>
                                    <div style={{
                                      width: `${exProgress}%`, height: '100%',
                                      // Green when completed, purple when in progress
                                      backgroundColor: exProgress === 100 ? '#22c55e' : '#6366f1',
                                      transition: 'width 0.4s ease'
                                    }}></div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* DAILY layout */}
                            {/* Renders a Mon-Sun grid with one checkbox and one difficulty rating per day */}
                            {frequencyType === 'daily' && (() => {
                              // Get unique week numbers from the rows in ascending order
                              const weekNumbers = sortedRows
                                .map((r: any) => r.week_number)
                                .filter((w: number, i: number, arr: number[]) => arr.indexOf(w) === i)
                                .sort((a: number, b: number) => a - b);

                              return (
                                <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                                  <table style={{ borderCollapse: 'collapse', fontSize: '13px', width: '100%' }}>
                                    <thead>
                                      <tr>
                                        {/* Empty header cell for the row label column */}
                                        <th style={{ padding: '6px 12px', width: '80px', textAlign: 'left', color: '#6c757d', fontSize: '12px' }}></th>
                                        {/* Day column headers — today's column is highlighted in purple */}
                                        {DAY_LABELS.map((label, i) => {
                                          const isToday = DAYS[i] === todayName;
                                          return (
                                            <th key={label} style={{
                                              padding: '6px 12px', textAlign: 'center',
                                              fontWeight: '600', fontSize: '13px', minWidth: '55px',
                                              // Highlight today's column in purple
                                              color: isToday ? '#6366f1' : '#6c757d',
                                              borderBottom: isToday ? '2px solid #6366f1' : '2px solid transparent'
                                            }}>
                                              {label}
                                            </th>
                                          );
                                        })}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {/* One pair of rows (Done + Diff) per week */}
                                      {weekNumbers.map((weekNum: number) => {
                                        const weekRows = sortedRows.filter((r: any) => r.week_number === weekNum);
                                        return (
                                          <React.Fragment key={`week-${weekNum}`}>
                                            {/* Done row - checkboxes for each day of this week */}
                                            <tr style={{ borderTop: weekNum > weekNumbers[0] ? '2px solid #e9ecef' : '1px solid #e9ecef' }}>
                                              <td style={{
                                                padding: '10px 12px', fontWeight: '600',
                                                color: '#5B4FCF', fontSize: '12px', whiteSpace: 'nowrap'
                                              }}>
                                                W{weekNum} Done
                                              </td>
                                              {DAY_LABELS.map((_, i) => {
                                                // Find the row matching this day of the week
                                                const row = weekRows.find((r: any) => {
                                                  const dayPart = r.day_of_week?.split(' ').pop();
                                                  return dayPart === DAYS[i];
                                                });
                                                // Grey out days before the exercise was created
                                                const isPastDay = isCellBeforeCreation(rows, weekNum, weekNumbers, i);
                                                return (
                                                  <td key={`done-w${weekNum}-${i}`}
                                                    style={{ padding: '10px 12px', textAlign: 'center', opacity: isPastDay ? 0.4 : 1 }}>
                                                    {row ? (
                                                      // Checkbox — ticking updates the completed status in the database
                                                      <input
                                                        type="checkbox"
                                                        checked={row.completed}
                                                        disabled={isPastDay}
                                                        onChange={() => !isPastDay && handleToggleDay(row.row_id, row.completed)}
                                                        style={{
                                                          width: '18px', height: '18px',
                                                          accentColor: '#6366f1',
                                                          cursor: isPastDay ? 'not-allowed' : 'pointer'
                                                        }}
                                                      />
                                                    ) : <span style={{ color: '#dee2e6' }}>—</span>}
                                                  </td>
                                                );
                                              })}
                                            </tr>
                                            {/* Diff row — difficulty rating circles for each day of this week */}
                                            <tr style={{ borderTop: '1px solid #f0f0f0' }}>
                                              <td style={{
                                                padding: '10px 12px', fontWeight: '600',
                                                color: '#5B4FCF', fontSize: '12px', whiteSpace: 'nowrap'
                                              }}>
                                                W{weekNum} Diff
                                              </td>
                                              {DAY_LABELS.map((_, i) => {
                                                const row = weekRows.find((r: any) => {
                                                  const dayPart = r.day_of_week?.split(' ').pop();
                                                  return dayPart === DAYS[i];
                                                });
                                                const isPastDay = isCellBeforeCreation(rows, weekNum, weekNumbers, i);
                                                return (
                                                  <td key={`diff-w${weekNum}-${i}`}
                                                    style={{ padding: '10px 8px', textAlign: 'center', opacity: isPastDay ? 0.4 : 1, pointerEvents: isPastDay ? 'none' : 'auto' }}>
                                                    {row ? (
                                                      // Difficulty dropdown — clicking opens the 0-10 rating picker
                                                      <DifficultyDropdown
                                                        currentRating={row.difficulty_rating}
                                                        onSelect={(val) => handleSaveDifficulty(row.row_id, val)}
                                                        onClear={() => handleClearDifficulty(row.row_id)}
                                                      />
                                                    ) : <span style={{ color: '#dee2e6' }}>—</span>}
                                                  </td>
                                                );
                                              })}
                                            </tr>
                                          </React.Fragment>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })()}

                            {/* TWICE DAILY layout */}
                            {/* Renders a Mon-Sun grid with AM and PM sub-columns per day */}
                            {frequencyType === 'twice_daily' && (() => {
                              const weekNumbers = sortedRows
                                .map((r: any) => r.week_number)
                                .filter((w: number, i: number, arr: number[]) => arr.indexOf(w) === i)
                                .sort((a: number, b: number) => a - b);

                              return (
                                <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                                  <table style={{ borderCollapse: 'collapse', fontSize: '13px', width: '100%' }}>
                                    <thead>
                                      <tr>
                                        <th style={{ padding: '6px 12px', width: '80px' }}></th>
                                        {/* Each day has two columns — AM and PM */}
                                        {DAY_LABELS.map((label, i) => {
                                          const isToday = DAYS[i] === todayName;
                                          return (
                                            <th key={label} colSpan={2} style={{
                                              padding: '6px 8px', textAlign: 'center',
                                              fontWeight: '600', fontSize: '13px', minWidth: '100px',
                                              // Highlight today's column in purple
                                              color: isToday ? '#6366f1' : '#6c757d',
                                              borderBottom: isToday ? '2px solid #6366f1' : '2px solid transparent'
                                            }}>
                                              {label}
                                            </th>
                                          );
                                        })}
                                      </tr>
                                      {/* Sub-header row showing AM and PM labels */}
                                      <tr>
                                        <th></th>
                                        {DAY_LABELS.map(label => (
                                          <React.Fragment key={label}>
                                            <th style={{ padding: '4px 8px', textAlign: 'center', fontSize: '11px', color: '#6c757d', fontWeight: '500', minWidth: '45px' }}>AM</th>
                                            <th style={{ padding: '4px 8px', textAlign: 'center', fontSize: '11px', color: '#6c757d', fontWeight: '500', minWidth: '45px' }}>PM</th>
                                          </React.Fragment>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {weekNumbers.map((weekNum: number) => {
                                        const weekRows = sortedRows.filter((r: any) => r.week_number === weekNum);
                                        return (
                                          <React.Fragment key={`week-${weekNum}`}>
                                            {/* Done row — AM and PM checkboxes for each day */}
                                            <tr style={{ borderTop: weekNum > weekNumbers[0] ? '2px solid #e9ecef' : '1px solid #e9ecef' }}>
                                              <td style={{
                                                padding: '10px 12px', fontWeight: '600',
                                                color: '#5B4FCF', fontSize: '12px', whiteSpace: 'nowrap'
                                              }}>
                                                W{weekNum} Done
                                              </td>
                                              {DAY_LABELS.map((_, i) => {
                                                // Find the Morning and Afternoon rows for this day
                                                const morningRow = weekRows.find((r: any) =>
                                                  r.day_of_week?.includes(DAYS[i]) && r.day_of_week?.includes('Morning')
                                                );
                                                const afternoonRow = weekRows.find((r: any) =>
                                                  r.day_of_week?.includes(DAYS[i]) && r.day_of_week?.includes('Afternoon')
                                                );
                                                const isPastDay = isCellBeforeCreation(rows, weekNum, weekNumbers, i);
                                                return (
                                                  <React.Fragment key={`done-w${weekNum}-${i}`}>
                                                    {/* Morning checkbox */}
                                                    <td style={{ padding: '10px 8px', textAlign: 'center', opacity: isPastDay ? 0.4 : 1 }}>
                                                      {morningRow ? (
                                                        <input type="checkbox" checked={morningRow.completed} disabled={isPastDay}
                                                          onChange={() => !isPastDay && handleToggleDay(morningRow.row_id, morningRow.completed)}
                                                          style={{ width: '18px', height: '18px', accentColor: '#6366f1', cursor: isPastDay ? 'not-allowed' : 'pointer' }}
                                                        />
                                                      ) : <span style={{ color: '#dee2e6' }}>—</span>}
                                                    </td>
                                                    {/* Afternoon checkbox */}
                                                    <td style={{ padding: '10px 8px', textAlign: 'center', opacity: isPastDay ? 0.4 : 1 }}>
                                                      {afternoonRow ? (
                                                        <input type="checkbox" checked={afternoonRow.completed} disabled={isPastDay}
                                                          onChange={() => !isPastDay && handleToggleDay(afternoonRow.row_id, afternoonRow.completed)}
                                                          style={{ width: '18px', height: '18px', accentColor: '#6366f1', cursor: isPastDay ? 'not-allowed' : 'pointer' }}
                                                        />
                                                      ) : <span style={{ color: '#dee2e6' }}>—</span>}
                                                    </td>
                                                  </React.Fragment>
                                                );
                                              })}
                                            </tr>
                                            {/* Diff row — AM and PM difficulty ratings for each day */}
                                            <tr style={{ borderTop: '1px solid #f0f0f0' }}>
                                              <td style={{
                                                padding: '10px 12px', fontWeight: '600',
                                                color: '#5B4FCF', fontSize: '12px', whiteSpace: 'nowrap'
                                              }}>
                                                W{weekNum} Diff
                                              </td>
                                              {DAY_LABELS.map((_, i) => {
                                                const morningRow = weekRows.find((r: any) =>
                                                  r.day_of_week?.includes(DAYS[i]) && r.day_of_week?.includes('Morning')
                                                );
                                                const afternoonRow = weekRows.find((r: any) =>
                                                  r.day_of_week?.includes(DAYS[i]) && r.day_of_week?.includes('Afternoon')
                                                );
                                                const isPastDay = isCellBeforeCreation(rows, weekNum, weekNumbers, i);
                                                return (
                                                  <React.Fragment key={`diff-w${weekNum}-${i}`}>
                                                    {/* Morning difficulty rating */}
                                                    <td style={{ padding: '10px 8px', textAlign: 'center', opacity: isPastDay ? 0.4 : 1, pointerEvents: isPastDay ? 'none' : 'auto' }}>
                                                      {morningRow ? (
                                                        <DifficultyDropdown currentRating={morningRow.difficulty_rating}
                                                          onSelect={(val) => handleSaveDifficulty(morningRow.row_id, val)}
                                                          onClear={() => handleClearDifficulty(morningRow.row_id)}
                                                        />
                                                      ) : <span style={{ color: '#dee2e6' }}>—</span>}
                                                    </td>
                                                    {/* Afternoon difficulty rating */}
                                                    <td style={{ padding: '10px 8px', textAlign: 'center', opacity: isPastDay ? 0.4 : 1, pointerEvents: isPastDay ? 'none' : 'auto' }}>
                                                      {afternoonRow ? (
                                                        <DifficultyDropdown currentRating={afternoonRow.difficulty_rating}
                                                          onSelect={(val) => handleSaveDifficulty(afternoonRow.row_id, val)}
                                                          onClear={() => handleClearDifficulty(afternoonRow.row_id)}
                                                        />
                                                      ) : <span style={{ color: '#dee2e6' }}>—</span>}
                                                    </td>
                                                  </React.Fragment>
                                                );
                                              })}
                                            </tr>
                                          </React.Fragment>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })()}

                            {/* WEEKLY layout */}
                            {/* Renders a simple Week 1 / Week 2 / Week 3 grid with one checkbox per week */}
                            {frequencyType === 'weekly' && (
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ borderCollapse: 'collapse', fontSize: '13px', width: '100%' }}>
                                  <thead>
                                    <tr>
                                      <th style={{ padding: '6px 12px', width: '80px' }}></th>
                                      {/* One column per week */}
                                      {sortedRows.map((row: any) => (
                                        <th key={`week-header-${row.row_id}`} style={{
                                          padding: '6px 12px', textAlign: 'center',
                                          fontWeight: '600', fontSize: '13px',
                                          color: '#6c757d', minWidth: '80px'
                                        }}>
                                          Week {row.week_number}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {/* Done row — one checkbox per week */}
                                    <tr style={{ borderTop: '1px solid #e9ecef' }}>
                                      <td style={{ padding: '10px 12px', fontWeight: '600', color: '#6c757d', fontSize: '12px', textTransform: 'uppercase' }}>Done</td>
                                      {sortedRows.map((row: any) => (
                                        <td key={`done-${row.row_id}`} style={{ padding: '10px 12px', textAlign: 'center' }}>
                                          {/* Checkbox — ticking updates the completed status in the database */}
                                          <input type="checkbox" checked={row.completed}
                                            onChange={() => handleToggleDay(row.row_id, row.completed)}
                                            style={{ width: '18px', height: '18px', accentColor: '#6366f1', cursor: 'pointer' }}
                                          />
                                        </td>
                                      ))}
                                    </tr>
                                    {/* Diff row — one difficulty rating per week */}
                                    <tr style={{ borderTop: '1px solid #e9ecef' }}>
                                      <td style={{ padding: '10px 12px', fontWeight: '600', color: '#6c757d', fontSize: '12px', textTransform: 'uppercase' }}>Diff</td>
                                      {sortedRows.map((row: any) => (
                                        <td key={`diff-${row.row_id}`} style={{ padding: '10px 12px', textAlign: 'center' }}>
                                          <DifficultyDropdown currentRating={row.difficulty_rating}
                                            onSelect={(val) => handleSaveDifficulty(row.row_id, val)}
                                            onClear={() => handleClearDifficulty(row.row_id)}
                                          />
                                        </td>
                                      ))}
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* OTHER layout */}
                            {/* Fallback layout for any exercise rows that don't match daily, twice daily or weekly */}
                            {frequencyType === 'other' && sortedRows.map((row: any) => (
                              <div key={`other-${row.row_id}`} style={{
                                display: 'flex', alignItems: 'center', gap: '16px', padding: '12px',
                                // Green background when completed
                                backgroundColor: row.completed ? '#f0fdf4' : '#fff',
                                borderRadius: '8px',
                                border: `1px solid ${row.completed ? '#bbf7d0' : '#e9ecef'}`
                              }}>
                                {/* Checkbox */}
                                <input type="checkbox" checked={row.completed}
                                  onChange={() => handleToggleDay(row.row_id, row.completed)}
                                  style={{ width: '20px', height: '20px', accentColor: '#6366f1', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '14px', color: '#6c757d' }}>
                                  {row.completed ? '✅ Completed' : 'Mark as done'}
                                </span>
                                {/* Difficulty rating */}
                                <DifficultyDropdown currentRating={row.difficulty_rating}
                                  onSelect={(val) => handleSaveDifficulty(row.row_id, val)}
                                  onClear={() => handleClearDifficulty(row.row_id)}
                                />
                              </div>
                            ))}

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
};

export default PatientGoalsProgress;