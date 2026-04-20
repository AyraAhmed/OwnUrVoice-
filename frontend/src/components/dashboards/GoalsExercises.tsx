import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getTherapistPatients,
  getPatientGoals,
  createGoal,
  createExercise,
  assignExerciseToGoal,
  getTherapistSessions,
} from '../../services/supabaseTherapistService';
import type { Patient, Goal } from '../../services/supabaseTherapistService';
import { supabase } from '../../services/supabaseClient';

/**
 * GoalsExercises Component
 * Allows therapists to manage goals and exercises for their patients.
 * Exercises are linked to goals via goal_exercise_set table.
 * Each exercise gets multiple rows in goal_exercise_set based on frequency:
 * - Daily: 7 rows (Mon-Sun)
 * - Twice Daily: 14 rows (Mon-Sun Morning + Afternoon)
 * - Weekly: 4 rows (Week 1-4)
 * - As Needed: 1 row
 */
const GoalsExercises: React.FC = () => {
  const navigate = useNavigate();

  // Auth & Therapist State
  const [user, setUser] = useState<any>(null);
  const [therapistId, setTherapistId] = useState<string>(''); // Used when creating goals and exercises

  // Data State 
  const [patients, setPatients] = useState<Patient[]>([]); // Full list of linked patients 
  const [sessions, setSessions] = useState<any[]>([]);     // All sessions for this therapist 
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null); // Patient currently being viewed in the right panel
  const [goals, setGoals] = useState<Goal[]>([]);                               // Goals for the selected patient

  // Stores goal_id → array of goal_exercise_set rows (with exercise info)
  const [goalExercises, setGoalExercises] = useState<Record<string, any[]>>({});

  // Search State 
  const [searchQuery, setSearchQuery] = useState(''); // Current search input value

  // Loading State
  const [loading, setLoading] = useState(true); // Initial patients load
  const [goalsLoading, setGoalsLoading] = useState(false); // Per-patient goals load

  // Alert State
  const [successMsg, setSuccessMsg] = useState<string | null>(null); // Success message
  const [errorMsg, setErrorMsg] = useState<string | null>(null);  // Error message

  // Goal Form State 
  const [showGoalForm, setShowGoalForm] = useState(false); // Controls goal form visibility
  const [goalDescription, setGoalDescription] = useState(''); // Goal description input
  const [goalStartDate, setGoalStartDate] = useState(new Date().toISOString().split('T')[0]); // Defaults to today
  const [goalTargetDate, setGoalTargetDate] = useState(''); // Goal target date input
  const [goalPriority, setGoalPriority] = useState('medium'); // Goal priority input

  // Exercise Form State 
  // Tracks which goal's exercise form is open (stores goal_id or null)
  const [showExerciseFormForGoal, setShowExerciseFormForGoal] = useState<string | null>(null); // Tracks which goal's exercise form is open
  const [exerciseTitle, setExerciseTitle] = useState('');       // Exercise title input 
  const [exerciseDescription, setExerciseDescription] = useState(''); // Exercise description input 
  const [exerciseDifficulty, setExerciseDifficulty] = useState('beginner'); // Exercise difficulty input
  const [exerciseFrequency, setExerciseFrequency] = useState('daily'); // Exercise frequency input

  /**
   * On mount: validate user role, set therapist ID, and load patients
   */
  useEffect(() => {
    const userStr = localStorage.getItem('userData');
    if (!userStr) { navigate('/login'); return; } // Redirect if not logged in
    const userData = JSON.parse(userStr);
    const role = userData.user_role || userData.role;
    if (role !== 'therapist') { navigate('/patient-dashboard'); return; } // Redirect if not a therapist
    setUser(userData);
    const id = userData.user_id || userData.id;
    setTherapistId(id);
    loadPatients(id);
  }, [navigate]);

  /**
   * Loads all patients and sessions linked to this therapist.
   */
  const loadPatients = async (id: string) => {
    try {
      setLoading(true);
      const [patientsData, sessionsData] = await Promise.all([
        getTherapistPatients(id),
        getTherapistSessions(id)
      ]);
      setPatients(patientsData);
      setSessions(sessionsData);
    } catch (err: any) {
      setErrorMsg('Failed to load patients: ' + err.message);
    } finally {
      // Always stop the loading spinner regardless of success or failure
      setLoading(false);
    }
  };

  /**
   * Called when therapist clicks a patient in the left panel.
   * Resets right panel and loads goals for the selected patient.
   */
  const handleSelectPatient = async (patient: Patient) => {
    setSelectedPatient(patient);
    // Reset all form states when switching patients
    setShowGoalForm(false);
    setShowExerciseFormForGoal(null);
    setGoals([]);
    setGoalExercises({});
    await loadGoalsForPatient(patient.user_id);
  };

  /**
   * Fetches all goals for a specific patient.
   * For each goal, fetches unique exercises from goal_exercise_set
   * Removes duplicate exercise entries by exercise_id, so each exercise only shows once in the list.
   */
  const loadGoalsForPatient = async (patientUserId: string) => {
    try {
      setGoalsLoading(true);
      const goalsData = await getPatientGoals(patientUserId);
      setGoals(goalsData);

      // For each goal fetch its linked exercises from goal_exercise_set
      // We only need unique exercise_ids for display in the therapist view
      const exercisesMap: Record<string, any[]> = {};
      for (const goal of goalsData) {
        const { data } = await supabase
          .from('goal_exercise_set')
          .select('*, exercise:exercise_id(*)')
          .eq('goal_id', goal.goal_id)
          .order('created_at', { ascending: true });

        // Removes duplicate exercise entries by exercise_id, preserving earliest-created order
        const seen = new Set();
        const unique = (data || []).filter((row: any) => {
          if (seen.has(row.exercise_id)) return false;
          seen.add(row.exercise_id);
          return true;
        });
        exercisesMap[goal.goal_id] = unique;
      }
      setGoalExercises(exercisesMap);
    } catch (err: any) {
      setErrorMsg('Failed to load goals: ' + err.message);
    } finally {
      // Always stop the loading spinner regardless of success or failure
      setGoalsLoading(false);
    }
  };

  /**
   * Finds the most recent session_id for a given patient.
   * Required because goals must be linked to a session in the database
   */
  const getSessionIdForPatient = (patientUserId: string): string | null => {
    const patientSessions = sessions.filter(s => s.patient_id === patientUserId);
    if (patientSessions.length === 0) return null; // No session found
    return patientSessions[0].session_id; // Return the most recent session
  }; 

  /**
   * Handles saving a new goal for the selected patient.
   */
  const handleSaveGoal = async (e: React.FormEvent) => {
    // Prevent the browser from refreshing the page on form submit 
    e.preventDefault();
    setErrorMsg(null);

    // Validation Gatekeepers 
    if (!goalDescription) { setErrorMsg('Please enter a goal description.'); return; }
    if (!goalTargetDate) { setErrorMsg('Please enter a target date.'); return; }
    if (!selectedPatient) return;

    // Retrieve the session ID associated with this patient 
    const sessionId = getSessionIdForPatient(selectedPatient.user_id);

    // A goal cannot exist without a session; block if session ID is missing
    if (!sessionId) {
      setErrorMsg('No session found for this patient. Please create a session first.');
      return;
    }

    try {
      // Submit the new goal object to the backend/database 
      await createGoal({
        session_id: sessionId,
        goal_description: goalDescription,
        start_date: goalStartDate,
        target_date: goalTargetDate,
        status: 'active',
        priority: goalPriority,
      });
      setSuccessMsg('Goal saved successfully!');
      setShowGoalForm(false);

      // Reset form fields to their default empty states 
      setGoalDescription('');
      setGoalTargetDate('');
      setGoalPriority('medium');

      // Refresh the list of goals so the new one appears immediately 
      await loadGoalsForPatient(selectedPatient.user_id);

      // Clear the success message after 3 seconds 
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      // Display error message if the database request fails 
      setErrorMsg('Failed to save goal: ' + err.message);
    }
  };

  /**
   * Handles saving a new exercise and linking it to a specific goal.
   * auto-generates a schedule based on the chosen frequency 
   * 
   * Note: The logic for calculating the exercise schedule rows based on
   * the goal's target date was developed with inspiration and debugging
   * assistance from Claude. The final implementation was reviewed, adapted and validated to reflect the specific data
   * structure and requirements of OwnUrVoice.
   */
  const handleSaveExercise = async (e: React.FormEvent, goalId: string) => {
    e.preventDefault(); // Prevent the browser from reloading the page
    setErrorMsg(null);
  
    // Validation - exercise title is required before proceeding 
    if (!exerciseTitle) { setErrorMsg('Please enter an exercise title.'); return; }
    if (!selectedPatient) return;
  
    try {
      // Create the exercise in the exercise table
      const newExercise = await createExercise({
        // Save the general exercise details to the exercise table first 
        created_by: therapistId,
        title: exerciseTitle,
        description: exerciseDescription,
        difficulty_level: exerciseDifficulty,
        recommended_frequency: exerciseFrequency,
      });
  
      // Find the goal's target date to calculate the schedule (how many rows to generate)
      const goal = goals.find(g => g.goal_id === goalId);
      if (!goal) { setErrorMsg('Goal not found.'); return; }
  
      // Count the days from today to the target date (e.g. today → target = 14 days)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(goal.target_date + 'T00:00:00Z');
      const diffTime = targetDate.getTime() - today.getTime();

      // Math.max(1) ensures at least one row is always creates
      // Math.ceil rounds up so no sessions are missed 
      const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));

      // Day names cycle — repeats Mon-Sun across all weeks
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

      // Create one row per day (daily), two rows per day (twice daily), or one row per week (weekly)
      // Each row = one scheduled slot the patient needs to tick off
      let rows: any[] = [];

      // Assign week numbers based on a Mon-Sun grid starting from today's day of the week
      // e.g. if today is Wednesday (index 2), week 1 covers Mon-Sun of the same week
      const startDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;

      if (exerciseFrequency === 'daily') {
        // One row per day from today to the target date
        rows = Array.from({ length: totalDays }, (_, i) => {
          const date = new Date(today);
          date.setDate(today.getDate() + i);

          const jsDay = date.getDay(); // 0 = Sun, 1 = Mon...
          const dayIndex = jsDay === 0 ? 6 : jsDay - 1; // Monday = 0 index
          const dayName = dayNames[dayIndex];

          // Make week numbers align to Mon-Sun grid
          // Calculate which week number this day falls in 
          const weekNumber = Math.floor((startDayIndex + i) / 7) + 1;

          return {
            goal_id: goalId,
            exercise_id: newExercise.exercise_id,
            day_of_week: `Week ${weekNumber} ${dayName}`,
            week_number: weekNumber,
            completed: false,       // All session start as incomplete
            difficulty_rating: null // No difficulty rating until the patient completes the session
          };
        });
      }

      else if (exerciseFrequency === 'twice daily') {
        // Two rows per day — Morning and Afternoon
        rows = Array.from({ length: totalDays }, (_, i) => {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
      
          const jsDay = date.getDay();
          const dayIndex = jsDay === 0 ? 6 : jsDay - 1;
          const dayName = dayNames[dayIndex];
      
          // Make week numbers align to Mon-Sun grid
          // Calculate which week number this day falls in 
          const weekNumber = Math.floor((startDayIndex + i) / 7) + 1;
      
          // Return an array of two rows for this day 
          return [
            {
              goal_id: goalId,
              exercise_id: newExercise.exercise_id,
              day_of_week: `Week ${weekNumber} ${dayName} Morning`,
              week_number: weekNumber,
              completed: false,
              difficulty_rating: null
            },
            {
              goal_id: goalId,
              exercise_id: newExercise.exercise_id,
              day_of_week: `Week ${weekNumber} ${dayName} Afternoon`,
              week_number: weekNumber,
              completed: false,
              difficulty_rating: null
            }
          ];
        }).flat(); // Flattens the nested arrays into a single list, each day produces 2 rows (AM/PM)
      
  
      } else if (exerciseFrequency === 'weekly') {
        // One row per week from today to target date 
        // Uses week numbers instead of day names
        // e.g. if target is 6 weeks away → 6 rows (Week 1 to Week 6)
        rows = Array.from({ length: totalWeeks }, (_, i) => ({
          goal_id: goalId,
          exercise_id: newExercise.exercise_id,
          day_of_week: null,        // No specific day for weekly exercises
          week_number: i + 1,       // Week 1, Week 2 , Week 3...
          completed: false,
          difficulty_rating: null
        }));
      }
  
      // Insert all rows into goal_exercise_set
      const { error } = await supabase.from('goal_exercise_set').insert(rows);
      if (error) throw error;
  
      // Show success message to confirm the exercise was saved 
      setSuccessMsg('Exercise saved and linked to goal!');
      // Close the exercise form 
      setShowExerciseFormForGoal(null);
      // Reset all form fields back to their default values 
      setExerciseTitle('');
      setExerciseDescription('');
      setExerciseDifficulty('beginner');
      setExerciseFrequency('daily');
      // Refresh the goals and exercises list so the new exercise appears immediately
      await loadGoalsForPatient(selectedPatient.user_id);
      // Clear success message after 3 seconds 
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      // Display a specific error message if the database request fails 
      setErrorMsg('Failed to save exercise: ' + err.message);
    }
  }

  /**
   * Clears local storage and redirects to login
   */
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    navigate('/login');
  };

  /**
   * Returns background and text colour for priority badges
   * High = red, Medium = yellow, Low = green
   */
  const priorityBadge = (priority: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      high: { bg: '#fee2e2', color: '#dc2626' },
      medium: { bg: '#fef9c3', color: '#ca8a04' },
      low: { bg: '#dcfce7', color: '#16a34a' },
    };
    return map[priority] || { bg: '#f3f4f6', color: '#6b7280' };
  };

  // Filter patients based on search query (name or email)
  const filteredPatients = patients.filter(patient =>
    `${patient.first_name} ${patient.last_name} ${patient.email}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

// Show loading spinner while initial data is being fetched
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  /* UI COMPONENTS */
  return (
    <div style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>

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

      <div className="dashboard-container">

        {/* Left Sidebar Navigation */}
        <aside className="sidebar">

          {/* Dashboard — navigates back to the main dashboard */}
          <div className="sidebar-item" onClick={() => navigate('/therapist-dashboard')} style={{ cursor: 'pointer' }}>
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span>Dashboard</span>
          </div>

          {/* Patient Details — navigates to the all patients page */}
          <div className="sidebar-item" onClick={() => navigate('/therapist/patients')} style={{ cursor: 'pointer' }}>
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>Patient Details</span>
          </div>

          {/* Goals & Exercises — active page, highlighted in purple */}
          <div className="sidebar-item active" style={{ cursor: 'pointer' }}>
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span>Goals & Exercises</span>
          </div>

          {/* Resources — navigates to the resources page */}
          <div className="sidebar-item" onClick={() => navigate('/therapist/resources')} style={{ cursor: 'pointer' }}>
            <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <span>Resources</span>
          </div>
        </aside>

        {/* Main Panel — contains the goals and exercises content */}
        <main className="main-panel">
          {/* Page Header */}
          <div className="panel-header">
            <h2 className="panel-title">Goals & Exercises</h2>
            <p className="panel-subtitle">Select a patient to manage their goals and exercises</p>
          </div>

          <div style={{ padding: '0 20px 20px' }}>

            {/* Success message — shown briefly after saving a goal or exercise */}
            {successMsg && (
              <div className="alert alert-success alert-dismissible fade show">
                {successMsg}
                <button type="button" className="btn-close" onClick={() => setSuccessMsg(null)} />
              </div>
            )}

            {/* Error message — shown if a goal or exercise save fails */}
            {errorMsg && (
              <div className="alert alert-danger alert-dismissible fade show">
                {errorMsg}
                <button type="button" className="btn-close" onClick={() => setErrorMsg(null)} />
              </div>
            )}

            <div className="row g-4">

              {/* LEFT PANEL: Patient List  */}
              <div className="col-12 col-lg-4">
                <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
                  <div className="card-body p-3">

                    <h6 className="fw-bold mb-3" style={{ color: '#1a1a2e' }}>Your Patients</h6>

                    {/* Search bar — filters patients by name or email */}
                    <div className="mb-3" style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Search patients..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: '32px', borderRadius: '8px' }}
                      />
                      {/* Search icon */}
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#6c757d"
                        style={{
                          position: 'absolute',
                          left: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '14px',
                          height: '14px'
                        }}
                      >
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                    </div>
                    
                    {/* Empty state — shown when no patients are linked yet */}
                    {patients.length === 0 ? (
                      <p className="text-muted" style={{ fontSize: '14px' }}>No patients linked yet.</p>
                    ) : (
                      <>
                      {/* Patient list — one card per patient */}
                        {filteredPatients.map(patient => (
                          <div
                            key={patient.user_id}
                            onClick={() => handleSelectPatient(patient)}
                            style={{
                              padding: '12px 16px',
                              borderRadius: '10px',
                              marginBottom: '8px',
                              // Highlight the selected patient in purple
                              cursor: 'pointer',
                              backgroundColor: selectedPatient?.user_id === patient.user_id
                                ? '#ede9fe' : '#f8f9fa',
                              border: selectedPatient?.user_id === patient.user_id
                                ? '2px solid #5B4FCF' : '2px solid transparent',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div className="d-flex align-items-center gap-2">
                              {/* Patient initials avatar */}
                              <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                backgroundColor: '#5B4FCF',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                flexShrink: 0
                              }}>
                                {patient.first_name[0]}{patient.last_name[0]}
                              </div>
                              <div>
                                {/* Patient full name */}
                                <div className="fw-semibold" style={{ fontSize: '14px', color: '#1a1a2e' }}>
                                  {patient.first_name} {patient.last_name}
                                </div>
                                {/* Patient email */}
                                <div style={{ fontSize: '12px', color: '#6c757d' }}>
                                  {patient.email}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Empty search state — shown when search returns no results */}
                        {filteredPatients.length === 0 && searchQuery !== '' && (
                          <p className="text-muted text-center" style={{ fontSize: '13px' }}>
                            No patients found for "{searchQuery}"
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL: Goals & Exercises */}
              <div className="col-12 col-lg-8">
                
                {/* Empty state — shown when no patient has been selected yet */}
                {!selectedPatient ? (
                  <div
                    className="card border-0 shadow-sm d-flex align-items-center justify-content-center"
                    style={{ borderRadius: '16px', minHeight: '300px' }}
                  >
                    <div className="text-center text-muted p-4">
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>👈</div>
                      <h6>Select a patient to view and manage their goals and exercises</h6>
                    </div>
                  </div>
                ) : (
                  <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
                    <div className="card-body p-4">

                      {/* Selected patient header — shows name, email and Add Goal button */}
                      <div className="d-flex align-items-center justify-content-between mb-4">
                        <div>
                          {/* Patient full name */}
                          <h5 className="fw-bold mb-0" style={{ color: '#1a1a2e' }}>
                            {selectedPatient.first_name} {selectedPatient.last_name}
                          </h5>
                          {/* Patient email */}
                          <small className="text-muted">{selectedPatient.email}</small>
                        </div>
                        {/* Add Goal button — toggles the goal form */}
                        <button
                          className="btn btn-sm text-white fw-semibold"
                          style={{ backgroundColor: '#5B4FCF', borderRadius: '8px', padding: '8px 16px' }}
                          onClick={() => {
                            setShowGoalForm(!showGoalForm);
                            setShowExerciseFormForGoal(null);
                          }}
                        >
                          + Add Goal
                        </button>
                      </div>

                      {/* Add Goal Form */}
                      {/* Only shown when the Add Goal button is clicked */}
                      {showGoalForm && (
                        <form
                          onSubmit={handleSaveGoal}
                          className="mb-4 p-3 rounded-3"
                          style={{ backgroundColor: '#f0eeff', border: '1px solid #d4cff5' }}
                        >
                          <h6 className="fw-bold mb-3" style={{ color: '#5B4FCF' }}>New Goal</h6>

                          {/* Goal Description input */}
                          <div className="mb-3">
                            <label className="form-label fw-semibold" style={{ fontSize: '14px' }}>
                              Goal Description <span className="text-danger">*</span>
                            </label>
                            <textarea
                              className="form-control"
                              rows={2}
                              placeholder="e.g. Improve speech fluency..."
                              value={goalDescription}
                              onChange={e => setGoalDescription(e.target.value)}
                              required
                            />
                          </div>

                          <div className="row">
                            {/* Start Date input — defaults to today */}
                            <div className="col-6 mb-3">
                              <label className="form-label fw-semibold" style={{ fontSize: '14px' }}>
                                Start Date
                              </label>
                              <input
                                type="date"
                                className="form-control"
                                value={goalStartDate}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={e => setGoalStartDate(e.target.value)}
                                required
                              />
                            </div>

                             {/* Target Date input — required, cannot be set in the past */}
                            <div className="col-6 mb-3">
                              <label className="form-label fw-semibold" style={{ fontSize: '14px' }}>
                                Target Date <span className="text-danger">*</span>
                              </label>
                              <input
                                type="date"
                                className="form-control"
                                value={goalTargetDate}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={e => setGoalTargetDate(e.target.value)}
                                required
                              />
                            </div>
                          </div>

                          {/* Priority dropdown — defaults to medium */}
                          <div className="mb-3">
                            <label className="form-label fw-semibold" style={{ fontSize: '14px' }}>
                              Priority
                            </label>
                            <select
                              className="form-select"
                              value={goalPriority}
                              onChange={e => setGoalPriority(e.target.value)}
                            >
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                          </div>

                          {/* Form action buttons */}
                          <div className="d-flex gap-2">
                            {/* Save Goal button — submits the form */}
                            <button
                              type="submit"
                              className="btn text-white fw-semibold"
                              style={{ backgroundColor: '#5B4FCF', borderRadius: '8px' }}
                            >
                              Save Goal
                            </button>
                            {/* Cancel button — hides the form without saving */}
                            <button
                              type="button"
                              className="btn btn-light fw-semibold"
                              style={{ borderRadius: '8px' }}
                              onClick={() => setShowGoalForm(false)}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Goals Loading Spinner */}
                      {goalsLoading ? (
                        <div className="text-center py-4">
                          <div className="spinner-border spinner-border-sm text-primary" role="status" />
                        </div>
                      ) : goals.length === 0 ? (
                        // Empty state — shown when no goals have been assigned yet
                        <div className="text-center py-4 text-muted">
                          <p>No goals yet for this patient. Click "+ Add Goal" to create one.</p>
                        </div>
                      ) : (
                        // Goals List — one card per goal 
                        goals.map(goal => {
                          const badge = priorityBadge(goal.priority);
                          // Get unique exercises for this goal for display
                          const linkedExercises = goalExercises[goal.goal_id] || [];
                          return (
                            <div
                              key={goal.goal_id}
                              className="mb-4 p-3 rounded-3"
                              style={{ backgroundColor: '#fafafa', border: '1px solid #e9ecef' }}
                            >
                              {/* Goal header — description, priority badge and Add Exercise button */}
                              <div className="d-flex align-items-start justify-content-between mb-2">
                                <div className="flex-grow-1">
                                  <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                                    <span style={{ fontSize: '15px' }}>🎯</span>
                                    {/* Goal description */}
                                    <span className="fw-semibold" style={{ fontSize: '15px', color: '#1a1a2e' }}>
                                      {goal.goal_description}
                                    </span>
                                    {/* Priority badge — colour coded by priority level */}
                                    <span style={{
                                      fontSize: '11px',
                                      padding: '2px 8px',
                                      borderRadius: '20px',
                                      backgroundColor: badge.bg,
                                      color: badge.color,
                                      fontWeight: '600'
                                    }}>
                                      {goal.priority} priority
                                    </span>
                                  </div>
                                  {/* Goal target date */}
                                  <div className="d-flex align-items-center gap-2">
                                    <span style={{ fontSize: '13px' }}>📅</span>
                                    <small className="text-muted">
                                      Target: {new Date(goal.target_date).toLocaleDateString('en-GB')}
                                    </small>
                                  </div>
                                </div>

                                {/* Add Exercise button — toggles the exercise form for this goal */}
                                <button
                                  className="btn btn-sm text-white fw-semibold ms-2"
                                  style={{
                                    backgroundColor: '#5B4FCF',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    whiteSpace: 'nowrap'
                                  }}
                                  onClick={() => {
                                    // Toggle the exercise form for this specific goal
                                    setShowExerciseFormForGoal(
                                      showExerciseFormForGoal === goal.goal_id ? null : goal.goal_id
                                    );
                                    setShowGoalForm(false);
                                    setExerciseTitle('');
                                    setExerciseDescription('');
                                    setExerciseDifficulty('beginner');
                                    setExerciseFrequency('daily');
                                  }}
                                >
                                  + Add Exercise
                                </button>
                              </div>

                              {/* Add Exercise Form */}
                              {/* Only shown when the Add Exercise button is clicked for this goal */}
                              {showExerciseFormForGoal === goal.goal_id && (
                                <form
                                  onSubmit={(e) => handleSaveExercise(e, goal.goal_id)}
                                  className="mt-3 p-3 rounded-3"
                                  style={{ backgroundColor: '#ede9fe', border: '1px solid #c4b5fd' }}
                                >
                                  <h6 className="fw-bold mb-3" style={{ color: '#5B4FCF', fontSize: '13px' }}>
                                    New Exercise for this goal
                                  </h6>

                                  {/* Exercise Title input */}
                                  <div className="mb-2">
                                    <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>
                                      Exercise Title <span className="text-danger">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      className="form-control form-control-sm"
                                      placeholder="e.g. Daily breathing exercises"
                                      value={exerciseTitle}
                                      onChange={e => setExerciseTitle(e.target.value)}
                                      required
                                    />
                                  </div>

                                  {/* Exercise Description input */}
                                  <div className="mb-2">
                                    <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>
                                      Description
                                    </label>
                                    <textarea
                                      className="form-control form-control-sm"
                                      rows={2}
                                      placeholder="Describe the exercise..."
                                      value={exerciseDescription}
                                      onChange={e => setExerciseDescription(e.target.value)}
                                    />
                                  </div>

                                  <div className="row">
                                    {/* Difficulty dropdown — defaults to beginner */}
                                    <div className="col-6 mb-2">
                                      <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>
                                        Difficulty
                                      </label>
                                      <select
                                        className="form-select form-select-sm"
                                        value={exerciseDifficulty}
                                        onChange={e => setExerciseDifficulty(e.target.value)}
                                      >
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                      </select>
                                    </div>

                                    {/* Frequency dropdown — determines how many rows are generated */}
                                    <div className="col-6 mb-2">
                                      <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>
                                        Frequency
                                      </label>
                                      <select
                                        className="form-select form-select-sm"
                                        value={exerciseFrequency}
                                        onChange={e => setExerciseFrequency(e.target.value)}
                                      >
                                        <option value="daily">Daily</option>
                                        <option value="twice daily">Twice Daily</option>
                                        <option value="weekly">Weekly</option>
                                      </select>
                                    </div>
                                  </div>

                                  {/* Form action buttons */}
                                  <div className="d-flex gap-2 mt-2">
                                    {/* Save Exercise button — submits the form */}
                                    <button
                                      type="submit"
                                      className="btn btn-sm text-white fw-semibold"
                                      style={{ backgroundColor: '#5B4FCF', borderRadius: '8px' }}
                                    >
                                      Save Exercise
                                    </button>
                                    {/* Cancel button — hides the form without saving */}
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-light fw-semibold"
                                      style={{ borderRadius: '8px' }}
                                      onClick={() => setShowExerciseFormForGoal(null)}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </form>
                              )}
                              
                              {/* Exercises List - Shows all exercises linked to this goal */}
                              {/* Exercises linked to this goal (therapist view) */}
                              {linkedExercises.length > 0 && (
                                <div className="mt-3">
                                  <div className="d-flex align-items-center gap-2 mb-2">
                                    <span style={{ fontSize: '13px' }}>📋</span>
                                    <small className="fw-semibold text-muted">
                                      Exercises ({linkedExercises.length})
                                    </small>
                                  </div>
                                  {/* One row per exercise */}
                                  {linkedExercises.map((ge: any, idx: number) => (
                                    <div
                                      key={ge.exercise_id}
                                      className="d-flex align-items-center gap-2 p-2 rounded-2 mb-1"
                                      style={{ backgroundColor: '#fff', border: '1px solid #e9ecef' }}
                                    >
                                      {/* Exercise number */}
                                      <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', minWidth: '18px' }}>
                                        {idx + 1}.
                                      </span>
                                      {/* Exercise title */}
                                      <span style={{ fontSize: '13px', color: '#1a1a2e', flex: 1, textAlign: 'left' }}>
                                        {ge.exercise?.title}
                                      </span>
                                      {/* Difficulty badge */}
                                      <span style={{
                                        fontSize: '11px',
                                        padding: '2px 8px',
                                        borderRadius: '20px',
                                        backgroundColor: '#e0e7ff',
                                        color: '#5B4FCF'
                                      }}>
                                        {ge.exercise?.difficulty_level}
                                      </span>
                                      {/* Frequency badge */}
                                      <span style={{ fontSize: '11px', color: '#6c757d' }}>
                                        🔁 {ge.exercise?.recommended_frequency}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                            </div>
                          );
                        })
                      )}

                    </div>
                  </div>
                )}
              </div>

            </div>
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

export default GoalsExercises;