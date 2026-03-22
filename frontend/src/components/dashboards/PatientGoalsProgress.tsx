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

/**
 * PatientGoalsProgress Component
 * Shows the patient their therapy goals and the exercises linked to each goal.
 * All tracking (completed, difficulty_rating, day_of_week, week_number)
 * is stored in goal_exercise_set, not session_exercise.
 * Daily: Mon-Sun columns with Done + Diff rows
 * Twice Daily: Mon-Sun with AM/PM sub-columns
 * Weekly: Week 1-4 columns
 * Progress bar: 1% per tick, capped at 100%
 */
const PatientGoalsProgress: React.FC = () => {
  const navigate = useNavigate();

  // ─── State ────────────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Stores goal_id → all goal_exercise_set rows for that goal
  const [goalExerciseRows, setGoalExerciseRows] = useState<Record<string, any[]>>({});

  // ─── Auth ─────────────────────────────────────────────────────────────────
  const userDataString = localStorage.getItem('userData');
  const userData = userDataString ? JSON.parse(userDataString) : null;

  // ─── Constants ────────────────────────────────────────────────────────────
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const WEEKS = [1, 2, 3, 4];
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // Difficulty colours for 0-10 scale
  const difficultyColors: Record<number, string> = {
    0: '#d1d5db', 1: '#22c55e', 2: '#4ade80', 3: '#86efac',
    4: '#facc15', 5: '#fb923c', 6: '#f97316', 7: '#ef4444',
    8: '#dc2626', 9: '#b91c1c', 10: '#7f1d1d'
  };

  const difficultyLabels: Record<number, string> = {
    0: 'Nothing', 1: 'Very Easy', 2: 'Easy', 3: '', 4: '',
    5: 'Moderate', 6: '', 7: 'Difficult', 8: 'Very Difficult',
    9: '', 10: 'Max'
  };

  /**
   * On mount: validate role and load all data
   */
  useEffect(() => {
    if (!userData) { navigate('/login'); return; }
    const role = userData.user_role || userData.role;
    if (role !== 'patient') { navigate('/login'); return; }
    loadGoalsData();
  }, []);

  /**
   * Loads profile, goals and sessions.
   * For each goal fetches all rows from goal_exercise_set including
   * exercise info, day_of_week, week_number, completed and difficulty_rating.
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

      // For each goal fetch ALL rows from goal_exercise_set
      // (multiple rows per exercise for daily/twice daily/weekly)
      const rowsMap: Record<string, any[]> = {};
      for (const goal of goalsData) {
        const { data } = await supabase
          .from('goal_exercise_set')
          .select('*, exercise:exercise_id(*)')
          .eq('goal_id', goal.goal_id);
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
   * Refreshes goal_exercise_set rows for all goals.
   * Called after any update to reflect changes in the UI.
   */
  const refreshRows = async () => {
    const rowsMap: Record<string, any[]> = {};
    for (const goal of activeGoals) {
      const { data } = await supabase
        .from('goal_exercise_set')
        .select('*, exercise:exercise_id(*)')
        .eq('goal_id', goal.goal_id);
      rowsMap[goal.goal_id] = data || [];
    }
    setGoalExerciseRows(rowsMap);
  };

  /**
   * Toggles the completed status for a specific row in goal_exercise_set.
   * Uses row_id to target the exact row.
   */
  const handleToggleDay = async (rowId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('goal_exercise_set')
        .update({
          completed: !currentStatus,
          completion_date: !currentStatus ? new Date().toISOString() : null
        })
        .eq('row_id', rowId);

      if (error) throw error;
      await refreshRows();
    } catch (err: any) {
      setError(err.message || 'Failed to update exercise');
    }
  };

  /**
   * Saves difficulty rating for a specific row in goal_exercise_set.
   * Uses row_id to target the exact row.
   */
  const handleSaveDifficulty = async (rowId: string, rating: number) => {
    try {
      const { error } = await supabase
        .from('goal_exercise_set')
        .update({ difficulty_rating: rating })
        .eq('row_id', rowId);

      if (error) throw error;

      setSuccessMessage('Difficulty saved!');
      await refreshRows();
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save difficulty');
    }
  };

  /**
   * Clears the difficulty rating for a specific row.
   * Sets difficulty_rating back to null.
   */
  const handleClearDifficulty = async (rowId: string) => {
    try {
      const { error } = await supabase
        .from('goal_exercise_set')
        .update({ difficulty_rating: null })
        .eq('row_id', rowId);

      if (error) throw error;
      await refreshRows();
    } catch (err: any) {
      setError(err.message || 'Failed to clear difficulty');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userData');
    navigate('/login');
  };

  const formatShortDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'numeric', year: 'numeric'
    });
  };

  /**
   * Gets unique exercise IDs for a goal and bundles their rows together.
   * Returns array of { exerciseId, exerciseInfo, rows } objects.
   */
  const getExercisesForGoal = (goalId: string) => {
    const allRows = goalExerciseRows[goalId] || [];
    const exerciseIds = allRows
      .map((r: any) => r.exercise_id)
      .filter((id: string, index: number, arr: string[]) => arr.indexOf(id) === index);

    return exerciseIds.map((id: string) => {
      const rows = allRows.filter((r: any) => r.exercise_id === id);
      return {
        exerciseId: id,
        exerciseInfo: rows[0]?.exercise,
        rows
      };
    });
  };

  /**
   * Progress = 1% per completed tick, capped at 100%.
   */
  const getGoalProgress = (goalId: string): number => {
    const exercises = getExercisesForGoal(goalId);
    let completedRows = 0;
    exercises.forEach(({ rows }) => {
      completedRows += rows.filter((r: any) => r.completed).length;
    });
    return Math.min(completedRows, 100);
  };

  /**
   * Detects frequency type from the exercise rows.
   */
  const getFrequencyType = (rows: any[]): 'daily' | 'twice_daily' | 'weekly' | 'other' => {
    const dayValues = rows.map(r => r.day_of_week).filter(Boolean);
    if (dayValues.some((d: string) => d.includes('Morning') || d.includes('Afternoon'))) {
      return 'twice_daily';
    }
    if (dayValues.length > 0) return 'daily';
    if (rows.some(r => r.week_number)) return 'weekly';
    return 'other';
  };

  /**
   * Reusable difficulty dropdown.
   * Selecting "—" clears the rating back to null.
   */
  const DifficultyDropdown = ({
    currentRating,
    onSelect,
    onClear
  }: {
    currentRating: number | null | undefined;
    onSelect: (val: number) => void;
    onClear: () => void;
  }) => (
    <select
      value={currentRating ?? ''}
      onChange={(e) => {
        const val = e.target.value;
        if (val === '') { onClear(); return; }
        onSelect(parseInt(val));
      }}
      style={{
        width: '52px',
        padding: '4px 2px',
        borderRadius: '20px',
        border: '2px solid',
        borderColor: currentRating !== null && currentRating !== undefined
          ? difficultyColors[currentRating] : '#dee2e6',
        backgroundColor: currentRating !== null && currentRating !== undefined
          ? difficultyColors[currentRating] : '#fff',
        color: currentRating !== null && currentRating !== undefined
          ? '#fff' : '#6c757d',
        fontWeight: 'bold',
        fontSize: '13px',
        textAlign: 'center',
        cursor: 'pointer',
        appearance: 'none',
        WebkitAppearance: 'none'
      }}
    >
      <option value="">—</option>
      {Object.entries(difficultyColors).map(([val]) => (
        <option key={val} value={val}>
          {val}{difficultyLabels[parseInt(val)]
            ? ` — ${difficultyLabels[parseInt(val)]}` : ''}
        </option>
      ))}
    </select>
  );

  const navItem = (active: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    padding: '12px 20px',
    cursor: 'pointer',
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
          <div style={navItem(false)} onClick={() => navigate('/patient-dashboard')}>
            <i className="bi bi-grid me-2"></i>Dashboard
          </div>
          <div style={navItem(true)} onClick={() => navigate('/patient/goals-progress')}>
            <i className="bi bi-bullseye me-2"></i>Goals & Progress
          </div>
          <div style={navItem(false)} onClick={() => navigate('/patient/journal')}>
            <i className="bi bi-journal-text me-2"></i>Journal
          </div>
          <div style={navItem(false)} onClick={() => navigate('/patient/community')}>
            <i className="bi bi-people me-2"></i>Community
          </div>
          <div style={navItem(false)} onClick={() => navigate('/patient/resources')}>
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
        <div style={{ flex: 1, padding: '32px', maxWidth: '900px', overflowY: 'auto' }}>

          {successMessage && (
            <div className="alert alert-success alert-dismissible fade show">
              {successMessage}
              <button type="button" className="btn-close" onClick={() => setSuccessMessage(null)}></button>
            </div>
          )}
          {error && (
            <div className="alert alert-danger alert-dismissible fade show">
              {error}
              <button type="button" className="btn-close" onClick={() => setError(null)}></button>
            </div>
          )}

          <h2 style={{ marginBottom: '8px' }}>Goals & Progress</h2>
          <p style={{ color: '#6c757d', marginBottom: '32px' }}>
            Track your therapy goals and complete your exercises
          </p>

          {activeGoals.length === 0 ? (
            <p className="text-muted">
              No active goals yet. Your therapist will assign goals for you.
            </p>
          ) : (
            activeGoals.map(goal => {
              const linkedExercises = getExercisesForGoal(goal.goal_id);
              const progress = getGoalProgress(goal.goal_id);
              const totalRows = linkedExercises.reduce((sum, e) => sum + e.rows.length, 0);
              const completedRows = linkedExercises.reduce(
                (sum, e) => sum + e.rows.filter((r: any) => r.completed).length, 0
              );

              return (
                <div
                  key={goal.goal_id}
                  style={{
                    backgroundColor: '#fff',
                    border: '1px solid #dee2e6',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '16px'
                  }}
                >
                  {/* ── Goal Header ── */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      marginBottom: '8px'
                    }}>
                      <div>
                        <h5 style={{ margin: 0, marginBottom: '4px', color: '#1a1a2e' }}>
                          🎯 {goal.goal_description}
                        </h5>
                        <small style={{ color: '#6c757d' }}>
                          {goal.priority} priority &nbsp;·&nbsp;
                          Target: {formatShortDate(goal.target_date)}
                        </small>
                      </div>
                      <span style={{
                        color: '#6366f1',
                        fontWeight: 'bold',
                        fontSize: '20px',
                        flexShrink: 0
                      }}>
                        {progress}%
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div style={{
                      width: '100%',
                      height: '10px',
                      backgroundColor: '#e9ecef',
                      borderRadius: '5px',
                      overflow: 'hidden',
                      marginBottom: '6px'
                    }}>
                      <div style={{
                        width: `${progress}%`,
                        height: '100%',
                        backgroundColor: progress === 100 ? '#22c55e' : '#6366f1',
                        transition: 'width 0.4s ease'
                      }}></div>
                    </div>

                    <small style={{ color: '#6c757d' }}>
                      {completedRows} of {totalRows} sessions completed
                    </small>
                  </div>

                  {/* ── Exercises ── */}
                  {linkedExercises.length === 0 ? (
                    <p style={{ color: '#6c757d', fontSize: '14px', fontStyle: 'italic' }}>
                      No exercises assigned for this goal yet.
                    </p>
                  ) : (
                    <div>
                      <h6 style={{ color: '#6366f1', marginBottom: '16px', fontSize: '14px' }}>
                        📋 Exercises
                      </h6>

                      {linkedExercises.map(({ exerciseId, rows, exerciseInfo }) => {
                        const frequencyType = getFrequencyType(rows);

                        // Sort rows correctly based on frequency type
                        const sortedRows = frequencyType === 'twice_daily'
                          ? [...rows].sort((a: any, b: any) => {
                              const dayA = a.day_of_week?.replace(' Morning', '').replace(' Afternoon', '') || '';
                              const dayB = b.day_of_week?.replace(' Morning', '').replace(' Afternoon', '') || '';
                              const dayDiff = DAYS.indexOf(dayA) - DAYS.indexOf(dayB);
                              if (dayDiff !== 0) return dayDiff;
                              return a.day_of_week?.includes('Morning') ? -1 : 1;
                            })
                          : frequencyType === 'daily'
                          ? [...rows].sort((a: any, b: any) =>
                              DAYS.indexOf(a.day_of_week) - DAYS.indexOf(b.day_of_week)
                            )
                          : frequencyType === 'weekly'
                          ? [...rows].sort((a: any, b: any) =>
                              (a.week_number || 0) - (b.week_number || 0)
                            )
                          : rows;

                        return (
                          <div
                            key={exerciseId}
                            style={{
                              backgroundColor: '#fafafa',
                              border: '1px solid #e9ecef',
                              borderRadius: '10px',
                              padding: '16px',
                              marginBottom: '16px'
                            }}
                          >
                            {/* Exercise title and meta */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              marginBottom: '16px',
                              flexWrap: 'wrap'
                            }}>
                              <span style={{ fontWeight: '600', fontSize: '15px', color: '#1a1a2e', flex: 1 }}>
                                {exerciseInfo?.title}
                              </span>
                              {exerciseInfo?.description && (
                                <span style={{ fontSize: '13px', color: '#6c757d' }}>
                                  {exerciseInfo.description}
                                </span>
                              )}
                              <span style={{
                                padding: '3px 10px', borderRadius: '20px',
                                fontSize: '11px', backgroundColor: '#e0e7ff', color: '#6366f1'
                              }}>
                                {exerciseInfo?.difficulty_level}
                              </span>
                              <span style={{ fontSize: '12px', color: '#6c757d' }}>
                                🔁 {exerciseInfo?.recommended_frequency}
                              </span>
                            </div>

                            {/* ── DAILY layout ── */}
                            {frequencyType === 'daily' && (
                              <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                                <table style={{ borderCollapse: 'collapse', fontSize: '13px' }}>
                                  <thead>
                                    <tr>
                                      <th style={{ padding: '6px 12px', width: '80px' }}></th>
                                      {DAY_LABELS.map((label, i) => (
                                        <th key={label} style={{
                                          padding: '6px 12px', textAlign: 'center',
                                          fontWeight: '600', fontSize: '13px', minWidth: '60px',
                                          color: DAYS[i] === todayName ? '#6366f1' : '#6c757d',
                                          borderBottom: DAYS[i] === todayName
                                            ? '2px solid #6366f1' : '2px solid transparent'
                                        }}>
                                          {label}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {/* Done row */}
                                    <tr style={{ borderTop: '1px solid #e9ecef' }}>
                                      <td style={{
                                        padding: '10px 12px', fontWeight: '600',
                                        color: '#6c757d', fontSize: '12px', textTransform: 'uppercase'
                                      }}>Done</td>
                                      {sortedRows.map((row: any) => (
                                        <td key={`done-${row.row_id}`}
                                          style={{ padding: '10px 12px', textAlign: 'center' }}>
                                          <input
                                            type="checkbox"
                                            checked={row.completed}
                                            onChange={() => handleToggleDay(row.row_id, row.completed)}
                                            style={{
                                              width: '18px', height: '18px',
                                              accentColor: '#6366f1', cursor: 'pointer'
                                            }}
                                          />
                                        </td>
                                      ))}
                                    </tr>
                                    {/* Difficulty row */}
                                    <tr style={{ borderTop: '1px solid #e9ecef' }}>
                                      <td style={{
                                        padding: '10px 12px', fontWeight: '600',
                                        color: '#6c757d', fontSize: '12px', textTransform: 'uppercase'
                                      }}>Diff</td>
                                      {sortedRows.map((row: any) => (
                                        <td key={`diff-${row.row_id}`}
                                          style={{ padding: '10px 12px', textAlign: 'center' }}>
                                          <DifficultyDropdown
                                            currentRating={row.difficulty_rating}
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

                            {/* ── TWICE DAILY layout ── */}
                            {frequencyType === 'twice_daily' && (
                              <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
                                <table style={{ borderCollapse: 'collapse', fontSize: '13px' }}>
                                  <thead>
                                    <tr>
                                      <th style={{ padding: '6px 12px', width: '80px' }}></th>
                                      {DAY_LABELS.map((label, i) => (
                                        <th key={label} colSpan={2} style={{
                                          padding: '6px 12px', textAlign: 'center',
                                          fontWeight: '600', fontSize: '13px', minWidth: '120px',
                                          color: DAYS[i] === todayName ? '#6366f1' : '#6c757d',
                                          borderBottom: DAYS[i] === todayName
                                            ? '2px solid #6366f1' : '2px solid transparent'
                                        }}>
                                          {label}
                                        </th>
                                      ))}
                                    </tr>
                                    <tr>
                                      <th></th>
                                      {DAY_LABELS.map(label => (
                                        <React.Fragment key={label}>
                                          <th style={{
                                            padding: '4px 8px', textAlign: 'center',
                                            fontSize: '11px', color: '#6c757d',
                                            fontWeight: '500', minWidth: '55px'
                                          }}>AM</th>
                                          <th style={{
                                            padding: '4px 8px', textAlign: 'center',
                                            fontSize: '11px', color: '#6c757d',
                                            fontWeight: '500', minWidth: '55px'
                                          }}>PM</th>
                                        </React.Fragment>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr style={{ borderTop: '1px solid #e9ecef' }}>
                                      <td style={{
                                        padding: '10px 12px', fontWeight: '600',
                                        color: '#6c757d', fontSize: '12px', textTransform: 'uppercase'
                                      }}>Done</td>
                                      {sortedRows.map((row: any) => (
                                        <td key={`done-${row.row_id}`}
                                          style={{ padding: '10px 8px', textAlign: 'center' }}>
                                          <input
                                            type="checkbox"
                                            checked={row.completed}
                                            onChange={() => handleToggleDay(row.row_id, row.completed)}
                                            style={{
                                              width: '18px', height: '18px',
                                              accentColor: '#6366f1', cursor: 'pointer'
                                            }}
                                          />
                                        </td>
                                      ))}
                                    </tr>
                                    <tr style={{ borderTop: '1px solid #e9ecef' }}>
                                      <td style={{
                                        padding: '10px 12px', fontWeight: '600',
                                        color: '#6c757d', fontSize: '12px', textTransform: 'uppercase'
                                      }}>Diff</td>
                                      {sortedRows.map((row: any) => (
                                        <td key={`diff-${row.row_id}`}
                                          style={{ padding: '10px 8px', textAlign: 'center' }}>
                                          <DifficultyDropdown
                                            currentRating={row.difficulty_rating}
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

                            {/* ── WEEKLY layout ── */}
                            {frequencyType === 'weekly' && (
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ borderCollapse: 'collapse', fontSize: '13px' }}>
                                  <thead>
                                    <tr>
                                      <th style={{ padding: '6px 12px', width: '80px' }}></th>
                                      {WEEKS.map(week => (
                                        <th key={week} style={{
                                          padding: '6px 12px', textAlign: 'center',
                                          fontWeight: '600', fontSize: '13px',
                                          color: '#6c757d', minWidth: '80px'
                                        }}>
                                          Week {week}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr style={{ borderTop: '1px solid #e9ecef' }}>
                                      <td style={{
                                        padding: '10px 12px', fontWeight: '600',
                                        color: '#6c757d', fontSize: '12px', textTransform: 'uppercase'
                                      }}>Done</td>
                                      {sortedRows.map((row: any) => (
                                        <td key={`done-${row.row_id}`}
                                          style={{ padding: '10px 12px', textAlign: 'center' }}>
                                          <input
                                            type="checkbox"
                                            checked={row.completed}
                                            onChange={() => handleToggleDay(row.row_id, row.completed)}
                                            style={{
                                              width: '18px', height: '18px',
                                              accentColor: '#6366f1', cursor: 'pointer'
                                            }}
                                          />
                                        </td>
                                      ))}
                                    </tr>
                                    <tr style={{ borderTop: '1px solid #e9ecef' }}>
                                      <td style={{
                                        padding: '10px 12px', fontWeight: '600',
                                        color: '#6c757d', fontSize: '12px', textTransform: 'uppercase'
                                      }}>Diff</td>
                                      {sortedRows.map((row: any) => (
                                        <td key={`diff-${row.row_id}`}
                                          style={{ padding: '10px 12px', textAlign: 'center' }}>
                                          <DifficultyDropdown
                                            currentRating={row.difficulty_rating}
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

                            {/* ── OTHER / AS NEEDED layout ── */}
                            {frequencyType === 'other' && sortedRows.map((row: any) => (
                              <div
                                key={`other-${row.row_id}`}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '16px',
                                  padding: '12px',
                                  backgroundColor: row.completed ? '#f0fdf4' : '#fff',
                                  borderRadius: '8px',
                                  border: `1px solid ${row.completed ? '#bbf7d0' : '#e9ecef'}`
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={row.completed}
                                  onChange={() => handleToggleDay(row.row_id, row.completed)}
                                  style={{
                                    width: '20px', height: '20px',
                                    accentColor: '#6366f1', cursor: 'pointer'
                                  }}
                                />
                                <span style={{ fontSize: '14px', color: '#6c757d' }}>
                                  {row.completed ? '✅ Completed' : 'Mark as done'}
                                </span>
                                <DifficultyDropdown
                                  currentRating={row.difficulty_rating}
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
            })
          )}

        </div>
      </div>
    </div>
  );
};

export default PatientGoalsProgress;