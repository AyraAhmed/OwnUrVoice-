import { supabase } from './supabaseClient';
import { Session, Goal, Exercise, SessionExercise, GoalExercise, Patient, Therapist } from './supabaseTherapistService';

/**
 *Extends the base Patient interface to include optional therapist details 
 */
export interface PatientProfile extends Patient {
  therapist?: Therapist;
}



/**
 * Patient Functions 
 * Fetches the specific patient record associated with a Supabase Auth User ID
 */
export const getPatientProfile = async (userId: string): Promise<PatientProfile | null> => {
  try {
    const { data, error } = await supabase
      .from('patient')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching patient profile:', error);
    return null;
  }
};

/**
 * Retrieves all unique therapists a patient has worked with across all their sessions
 */
export const getPatientTherapists = async (patientId: string): Promise<Therapist[]> => {
  try {
    // Find all therapist IDs linked to this patient's sessions
    const { data: sessions, error: sessionError } = await supabase
      .from('session')
      .select('therapist_id')
      .eq('patient_id', patientId);

    if (sessionError) throw sessionError;
    if (!sessions || sessions.length === 0) return [];

    // Get unique therapist IDs
    // Clean and de-duplicate the IDs to avoid redundant DB queries 
    const therapistIds = Array.from(
      new Set(
        sessions
          .map(s => s.therapist_id)
          .filter(id => id !== null && id !== undefined)
      )
    );

    if (therapistIds.length === 0) return [];

    // Fetch full details for those specific therapists 
    const { data: therapists, error: therapistError } = await supabase
      .from('therapist')
      .select('*')
      .in('user_id', therapistIds); // Efficiently fetch multiple records by ID list 

    if (therapistError) throw therapistError;
    return therapists || [];
  } catch (error) {
    console.error('Error fetching patient therapists:', error);
    throw error;
  }
};

/**
 * Get patient's upcoming sessions
 * Fetches sessions scheduled for today or in the future 
 */
export const getPatientUpcomingSessions = async (patientId: string): Promise<Session[]> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('session')
      .select(`
        *,
        therapist:therapist_id (
          first_name,
          last_name,
          qualification
        )
      `)
      .eq('patient_id', patientId)
      .gte('session_date', today)
      .order('session_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching upcoming sessions:', error);
    throw error;
  }
};

/**
 * Retrieves the patient's most recent past sessions 
 */
export const getPatientRecentSessions = async (
  patientId: string, 
  limit: number = 5
): Promise<Session[]> => {
  try {
    const { data, error } = await supabase
      .from('session')
      .select('*')
      .eq('patient_id', patientId)
      .order('session_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching recent sessions:', error);
    throw error;
  }
};

/**
 * Finds all goals currently marked as 'active' or 'in progress' 
 * Goals are linked to sessions, so check all the patient's sessions first 
 */
export const getPatientActiveGoals = async (patientId: string): Promise<Goal[]> => {
  try {
    // Get all session IDs for this patient
    const { data: sessions, error: sessionError } = await supabase
      .from('session')
      .select('session_id')
      .eq('patient_id', patientId);

    if (sessionError) throw sessionError;
    if (!sessions || sessions.length === 0) return [];

    const sessionIds = sessions.map(s => s.session_id).filter(id => id !== null);
    if (sessionIds.length === 0) return [];

    // Get active goals for these sessions
    const { data: goals, error: goalError } = await supabase
      .from('goal')
      .select('*')
      .in('session_id', sessionIds)
      .in('status', ['active', 'in progress'])
      .order('target_date', { ascending: true });

    if (goalError) throw goalError;
    return goals || [];
  } catch (error) {
    console.error('Error fetching active goals:', error);
    throw error;
  }
};

/**
 * Multi-step retrieval to find exercises assigned to a patient via specific goals
 */
export const getPatientAssignedExercises = async (patientId: string): Promise<GoalExercise[]> => {
  try {
    // Get IDs for all sessions belonging to this patient 
    const { data: sessions, error: sessionError } = await supabase
      .from('session')
      .select('session_id')
      .eq('patient_id', patientId);

    if (sessionError) throw sessionError;
    if (!sessions || sessions.length === 0) return [];

    const sessionIds = sessions.map(s => s.session_id).filter(id => id !== null);
    if (sessionIds.length === 0) return [];

    // 2. Get IDs for all goals associated with those sessions 
    const { data: goals, error: goalError } = await supabase
      .from('goal')
      .select('goal_id')
      .in('session_id', sessionIds);

    if (goalError) throw goalError;
    if (!goals || goals.length === 0) return [];

    const goalIds = goals.map(g => g.goal_id).filter(id => id !== null);
    if (goalIds.length === 0) return [];

    // 3. Get the specific exercise sets and include full Exercise/Goal details
    const { data: goalExercises, error: exerciseError } = await supabase
      .from('goal_exercise_set')
      .select(`
        *,
        exercise:exercise_id (*),
        goal:goal_id (*)
      `)
      .in('goal_id', goalIds);

    if (exerciseError) throw exerciseError;
    return goalExercises || [];
  } catch (error) {
    console.error('Error fetching assigned exercises:', error);
    throw error;
  }
};

/**
 * Get patient's session exercises with completion status
 */
export const getPatientSessionExercises = async (patientId: string): Promise<SessionExercise[]> => {
  try {
    // Get patient's sessions
    const { data: sessions, error: sessionError } = await supabase
      .from('session')
      .select('session_id')
      .eq('patient_id', patientId);

    if (sessionError) throw sessionError;
    if (!sessions || sessions.length === 0) return [];

    const sessionIds = sessions.map(s => s.session_id).filter(id => id !== null);
    if (sessionIds.length === 0) return [];

    // Get session exercises
    const { data: sessionExercises, error: exerciseError } = await supabase
      .from('session_exercise')
      .select(`
        *,
        exercise:exercise_id (*)
      `)
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false });

    if (exerciseError) throw exerciseError;
    return sessionExercises || [];
  } catch (error) {
    console.error('Error fetching session exercises:', error);
    throw error;
  }
};

/**
 * Mark exercise as complete in a session
 * Updates a specific session_exercise record to mark it as completed
 * Automatically timestamps the completion 
 */
export const markExerciseComplete = async (
  sessionId: string,
  exerciseId: string
): Promise<SessionExercise> => {
  try {
    const { data, error } = await supabase
      .from('session_exercise')
      .update({ 
        completed: true,
        completion_date: new Date().toISOString()
      })
      .eq('session_id', sessionId)
      .eq('exercise_id', exerciseId)
      .select() // Returns the updated row 
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error marking exercise complete:', error);
    throw error;
  }
};

/**
 * Add notes to a session exercise
 */
export const addExerciseNotes = async (
  sessionId: string,
  exerciseId: string,
  notes: string
): Promise<SessionExercise> => {
  try {
    const { data, error } = await supabase
      .from('session_exercise')
      .update({ notes })
      .eq('session_id', sessionId)
      .eq('exercise_id', exerciseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding exercise notes:', error);
    throw error;
  }
};

/**
 * Get patient statistics
 * Calculate progress percentages for the patient dashboard 
 * calculates completion rates for both high-level goals and individual exercises
 */
export const getPatientStats = async (patientId: string) => {
  try {
    // Get session IDs for filtering sub-queries 
    const { data: sessions, error: sessError } = await supabase
      .from('session')
      .select('session_id')
      .eq('patient_id', patientId);

    if (sessError) throw sessError;
    const sessionIds = sessions?.map(s => s.session_id).filter(id => id !== null) || [];

    // Total sessions
    const totalSessions = sessions?.length || 0;

    // Get goal statistics 
    const { data: goals } = await supabase
      .from('goal')
      .select('goal_id, status')
      .in('session_id', sessionIds);

    const totalGoals = goals?.length || 0;
    const completedGoals = goals?.filter(g => g.status === 'completed').length || 0;

    // Get exercises statistics
    const { data: exercises } = await supabase
      .from('session_exercise')
      .select('completed')
      .in('session_id', sessionIds);

    const totalExercises = exercises?.length || 0;
    const completedExercises = exercises?.filter(e => e.completed).length || 0;

    return {
      totalSessions,
      totalGoals,
      completedGoals,
      // Safety check to avoid division by zero 
      goalCompletionRate: totalGoals ? Math.round((completedGoals / totalGoals) * 100) : 0,
      totalExercises,
      completedExercises,
      exerciseCompletionRate: totalExercises ? Math.round((completedExercises / totalExercises) * 100) : 0,
    };
  } catch (error) {
    console.error('Error calculating patient stats:', error);
    // Return zeroed statistics on error to prevent UI crashes 
    return {
      totalSessions: 0,
      totalGoals: 0,
      completedGoals: 0,
      goalCompletionRate: 0,
      totalExercises: 0,
      completedExercises: 0,
      exerciseCompletionRate: 0,
    };
  }
};