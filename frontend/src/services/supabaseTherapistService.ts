import { supabase  } from "./supabaseClient";

export interface Patient {
    user_id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    date_of_birth: string; 
    user_role: string;
    patient_profile: string;
    therapy_start_date: string;
    preferred_contact_method: string;
    created_at: string; 
    updated_at: string;
}

export interface Therapist {
    user_id: string; 
    username: string; 
    email: string; 
    first_name: string; 
    last_name: string; 
    phone_number: string; 
    date_of_birth: string;
    user_role: string; 
    qualification: string; 
    years_of_experience: number; 
    clinic_name: string;
    therapist_profile: string; 
    created_at: string; 
    updated_at: string; 
}

export interface Session {
    session_id: string; 
    patient_id: string; 
    therapist_id: string; 
    session_date: string; 
    session_time: string; 
    session_type: string;
    status: string; 
    location: string; 
    created_at: string;
    updated_at: string;
    patient?: Patient;
    therapist?: Therapist;
}

export interface Goal {
    goal_id: string;
    session_id: string; 
    goal_description: string; 
    start_date: string; 
    target_date: string; 
    status: string; 
    priority: string; 
    created_at: string; 
    updated_at: string;
    session?: Session;
}

export interface Exercise {
    exercise_id: string; 
    created_by: string; 
    title: string; 
    description: string; 
    difficulty_level: string; 
    recommended_frequency: string; 
    created_at: string; 
    updated_at: string; 
}

export interface SessionExercise {
    session_id: string; 
    exercise_id: string; 
    completed: boolean; 
    notes: string; 
    created_at: string; 
    exercise?: Exercise; 
}

export interface GoalExercise {
    goal_id: string; 
    exercise_id: string; 
    created_at: string; 
    exercise?: Exercise; 
    goal?: Goal;
}

/**
 * Get all patients who have session with this therapist 
 */

export const getTherapistPatients = async (therapistId: string): Promise<Patient[]> => {
    try {
      // Get all unique patient_ids from sessions with this therapist
      const { data: sessions, error: sessionError } = await supabase
        .from('session')
        .select('patient_id')
        .eq('therapist_id', therapistId);
  
      if (sessionError) throw sessionError;
      if (!sessions || sessions.length === 0) return [];
  
      // Get unique patient IDs and filter out any nulls
      const patientIds = Array.from(
        new Set(
          sessions
            .map(s => s.patient_id)
            .filter(id => id !== null && id !== undefined)
        )
      );
  
      if (patientIds.length === 0) return [];
  
      // Fetch patient details
      const { data: patients, error: patientError } = await supabase
        .from('patient')
        .select('*')
        .in('user_id', patientIds)
        .order('created_at', { ascending: false });
  
      if (patientError) throw patientError;
      return patients || [];
    } catch (error) {
      console.error('Error fetching therapist patients:', error);
      throw error;
    }
  };

/**
 * Get recent sessions for a therapist 
 */

export const getTherapistSessions = async (therapistId: string, limit: number = 10): Promise<Session[]> => {
    try{
        const{ data, error } = await supabase 
        .from('session')
        .select(`*, patient:patient_id (user_id, first_name, last_name, email)`)
        .eq('therapist_id', therapistId)
        .order('session_date', { ascending: false })
        .limit(limit);

        if (error) throw error; 
        return data || []; 
    } catch (error) {
        console.error('Error fetching therapist sessions:', error);
        throw error;
    }
};
/**
 * Create a new patient AND create first session to link them to therapist 
 */

export const createPatientWithSession = async (patientData: {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  date_of_birth: string;
  patient_profile?: string;
  preferred_contact_method?: string;
}, therapistId: string): Promise<{ patient: Patient; session: Session }> => {
  try {
    // Generate a real UUID v4 (using crypto.randomUUID if available, or fallback)
    const generateUUID = (): string => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      // Fallback UUID generation
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    const tempUserId = generateUUID();
    
    console.log('Creating patient with temp UUID:', tempUserId);
    
    // Create patient
    const { data: patient, error: patientError } = await supabase
      .from('patient')
      .insert([{
        user_id: tempUserId,  // Real UUID format
        username: patientData.username,
        email: patientData.email,
        first_name: patientData.first_name,
        last_name: patientData.last_name,
        phone_number: patientData.phone_number,
        date_of_birth: patientData.date_of_birth,
        patient_profile: patientData.patient_profile || '',
        preferred_contact_method: patientData.preferred_contact_method || 'email',
        therapy_start_date: new Date().toISOString().split('T')[0],
        user_role: 'patient'
      }])
      .select()
      .single();

    if (patientError) {
      console.error('Error creating patient:', patientError);
      throw patientError;
    }

    console.log('Patient created successfully:', patient);

    // Create initial session to link patient to therapist
    const today = new Date();
    const { data: session, error: sessionError } = await supabase
      .from('session')
      .insert([{
        patient_id: patient.user_id,
        therapist_id: therapistId,
        session_date: today.toISOString().split('T')[0],
        session_time: '09:00:00',
        session_type: 'Initial Assessment',
        status: 'scheduled',
        location: 'To be determined'
      }])
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      throw sessionError;
    }

    console.log('Session created successfully:', session);

    return { patient, session };
  } catch (error) {
    console.error('Error creating patient with session:', error);
    throw error;
  }
};

/**
 * Get all sessions for a specific patient 
 */

export const getPatientSessions = async (patientId: string): Promise<Session[]> => {
    try{
        const{ data, error } = await supabase 
        .from('session')
        .select('*')
        .eq('patient_id', patientId)
        .order('session_data', { ascending: false });

        if (error) throw error; 
        return data || [];
    } catch (error) {
        console.error('Error fetching patient sessions:', error);
        throw error;
    }
};

/**
 * Get all goals for a patient (through their sessions)
 */

export const getPatientGoals = async (patientId: string): Promise<Goal[]> => {
    try{
        // Get all session IDs for this patient 
        const { data: sessions, error: sessionError } = await supabase 
        .from('session')
        .select('session_id')
        .eq('patient_id', patientId); 

        if (sessionError) throw sessionError; 
        if (!sessions || sessions.length === 0) return [];

        const sessionIds = sessions.map(s => s.session_id); 

        // Get all goals for these sessions 
        const { data: goals, error: goalError } = await supabase 
        .from('goal')
        .select('*')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: false });

        if (goalError) throw goalError; 
        return goals || [];
    } catch (error) {
        console.error('Error fetching patient goals:', error);
        throw error;
    }
};

/**
 * Get all exercises assigned to a patient's goals 
 */

export const getPatientExercises = async (patientId: string): Promise<GoalExercise[]> => {
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
  
      // Get goals for these sessions
      const { data: goals, error: goalError } = await supabase
        .from('goal')
        .select('goal_id')
        .in('session_id', sessionIds);
  
      if (goalError) throw goalError;
      if (!goals || goals.length === 0) return [];
  
      const goalIds = goals.map(g => g.goal_id).filter(id => id !== null);
      if (goalIds.length === 0) return [];
  
      // Get exercises for these goals
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
      console.error('Error fetching patient exercises:', error);
      throw error;
    }
  };

/**
 * Get exercises completed in patient's sessions
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
  
      const sessionIds = sessions.map(s => s.session_id);
  
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
      console.error('Error fetching patient session exercises:', error);
      throw error;
    }
  };
  
  /**
   * Create a new session
   */
  export const createSession = async (sessionData: {
    patient_id: string;
    therapist_id: string;
    session_date: string;
    session_time: string;
    session_type: string;
    status: string;
    location?: string;
  }): Promise<Session> => {
    try {
      const { data, error } = await supabase
        .from('session')
        .insert([sessionData])
        .select()
        .single();
  
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  };
  
  /**
   * Create a new goal for a session
   */
  export const createGoal = async (goalData: {
    session_id: string;
    goal_description: string;
    start_date: string;
    target_date: string;
    status: string;
    priority?: string;
  }): Promise<Goal> => {
    try {
      const { data, error } = await supabase
        .from('goal')
        .insert([goalData])
        .select()
        .single();
  
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating goal:', error);
      throw error;
    }
  };
  
  /**
   * Get all exercises created by therapist
   */
  export const getTherapistExercises = async (therapistId: string): Promise<Exercise[]> => {
    try {
      const { data, error } = await supabase
        .from('exercise')
        .select('*')
        .eq('created_by', therapistId)
        .order('title', { ascending: true });
  
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching therapist exercises:', error);
      throw error;
    }
  };
  
  /**
   * Create a new exercise
   */
  export const createExercise = async (exerciseData: {
    created_by: string;
    title: string;
    description: string;
    difficulty_level: string;
    recommended_frequency: string;
  }): Promise<Exercise> => {
    try {
      const { data, error } = await supabase
        .from('exercise')
        .insert([exerciseData])
        .select()
        .single();
  
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating exercise:', error);
      throw error;
    }
  };
  
  /**
   * Assign exercise to a goal
   */
  export const assignExerciseToGoal = async (
    goalId: string,
    exerciseId: string
  ): Promise<GoalExercise> => {
    try {
      const { data, error } = await supabase
        .from('goal_exercise_set')
        .insert([{ goal_id: goalId, exercise_id: exerciseId }])
        .select()
        .single();
  
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error assigning exercise to goal:', error);
      throw error;
    }
  };