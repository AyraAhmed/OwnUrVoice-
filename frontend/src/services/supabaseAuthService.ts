import { supabase } from './supabaseClient';

/**
 * Interface representing the complete set of registration data 
 * Including role-specific optional fields 
 */
export interface RegisterData {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    dateOfBirth: string;
    role: 'therapist' | 'patient' | 'parent_carer';

/**
 *  Role-specific fields 
*/ 
    // Therapist-specific 
    clinicName?: string;
    yearsOfExperience?: number;
    qualification?: string;

    // patient-specific 
    therapyStartDate?: string;
    preferredContactMethod?: string;

    // parent/carer-specific 
    relationshipToPatient?: string;
}

/**
 * Standardised response format for all Auth actions 
 */
interface AuthResponse {
    success: boolean;
    message?: string;
    user?: any;
}

class SupabaseAuthService {
   
    /**
     * register new user
     * Handles the two-step registration process - Creates a Supabase Auth entry, and persists profile details in a role-specific table
     * */ 

    async register(data: RegisterData): Promise<AuthResponse> {
        try {
            // Create the system-level authentication user 
            const{ data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
            });
            
            if (authError) {
                throw new Error(authError.message);
            }
            if (!authData.user){
                throw new Error('User creation failed');
            }
             
            let insertError;
           
            // Route the user profile to the correct database table 
            if (data.role === 'therapist') {
                const { error } = await supabase.from('therapist').insert({
                    user_id: authData.user.id,
                    username: data.username,
                    email: data.email,
                    first_name: data.firstName,
                    last_name: data.lastName,
                    phone_number: data.phoneNumber,
                    date_of_birth: data.dateOfBirth,
                    user_role: 'therapist',
                    clinic_name: data.clinicName,
                    years_of_experience: data.yearsOfExperience,
                    qualification: data.qualification,
                });
                insertError = error;

                // Patient registration
            } else if (data.role === 'patient') {
                
                  
                console.log('Creating new patient account...');
                
                const { error } = await supabase.from('patient').insert({
                    user_id: authData.user.id,  
                    username: data.username,
                    email: data.email,
                    first_name: data.firstName,
                    last_name: data.lastName,
                    phone_number: data.phoneNumber,
                    date_of_birth: data.dateOfBirth,
                    user_role: 'patient',
                    therapy_start_date: data.therapyStartDate || new Date().toISOString().split('T')[0],
                    preferred_contact_method: data.preferredContactMethod || 'email',
                });
                insertError = error;
                
                if (!error) {
                    console.log(' Patient account created successfully');
                }

                // Parent/carer registration 
            } else if (data.role === 'parent_carer') {
                const { error } = await supabase.from('parent_carer').insert({
                    user_id: authData.user.id,
                    username: data.username,
                    email: data.email, 
                    first_name: data.firstName, 
                    last_name: data.lastName, 
                    phone_number: data.phoneNumber, 
                    date_of_birth: data.dateOfBirth, 
                    user_role: 'parent_carer', 
                    relationship_to_patient: data.relationshipToPatient,
                });
                insertError = error;
            }
            
            if (insertError) {
                throw new Error(insertError.message);
            }
            
            return {
                success: true, 
                message: 'Registration Successful!', 
                user: authData.user,
            };
        } catch (error: any) {
            return {
                success: false, 
                message: error.message || 'Registration failed', 
            };
        }
    }

    /** 
     * Login flow: 
     * Searches through profile tables to map a username to an email 
     * Authenticates with supabase using the found email 
    */

    // Login user 
    async login(username: string, password: string): Promise<AuthResponse> {
        try {
            // find email from username by checking all tables 
            let email = '';
            let userRole = '';
            let fullUserData: any = null;

            // check therapist table
            const { data: therapistData } = await supabase
                .from('therapist')
                .select('*')
                .eq('username', username)
                .maybeSingle();

            if (therapistData) {
                email = therapistData.email;
                userRole = 'therapist';
                fullUserData = therapistData;
            } else {
                // check patient table 
                const { data: patientData } = await supabase 
                    .from('patient')
                    .select('*')
                    .eq('username', username)
                    .maybeSingle();
                
                if (patientData) {
                    email = patientData.email;
                    userRole = 'patient';
                    fullUserData = patientData;
                } else {
                    // check parent_carer table 
                    const { data: parentData } = await supabase 
                        .from('parent_carer')
                        .select('*')
                        .eq('username', username)
                        .maybeSingle();

                    if (parentData) {
                        email = parentData.email;
                        userRole = 'parent_carer';
                        fullUserData = parentData;
                    }
                }
            }

            if (!email) {
                throw new Error('Invalid username or password');
            }

            console.log('Found email for username, role:', userRole);

            // Login with email and password 
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                throw new Error(error.message);
            }

            return {
                success: true, 
                message: 'Login successful',
                user: {
                    user_id: fullUserData.user_id,  
                    id: fullUserData.user_id,      
                    email: data.user.email,
                    username: fullUserData.username,
                    firstName: fullUserData.first_name,
                    lastName: fullUserData.last_name,
                    role: userRole,
                    user_role: userRole            
                },    
            };
        } catch (error: any) {
            return {
                success: false, 
                message: error.message || 'Login failed',
            };
        }
    }

    /** Terminate the current supabase session */ 
    async logout(): Promise<void> {
        await supabase.auth.signOut();
    }

    /** Retrieve the raw Supabase Auth user object */ 
    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    }

    /**  check if a valid session exits */
    async isAuthenticated(): Promise<boolean> {
        const user = await this.getCurrentUser();
        return !!user;
    }
}

export default new SupabaseAuthService();