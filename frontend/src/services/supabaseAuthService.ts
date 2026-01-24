import { supabase } from './supabaseClient';

export interface RegisterData {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    dateOfBirth: string;
    role: 'therapist' | 'patient' | 'parent_carer';

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

interface AuthResponse {
    success: boolean;
    message?: string;
    user?: any;
}

class SupabaseAuthService {
    // register new user 
    async register(data: RegisterData): Promise<AuthResponse> {
        try {
            // create auth user in supabase Auth
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
            // insert user data into appropriate table based on role 
            let insertError;

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
            }else if (data.role === 'patient') {
                const { error } = await supabase.from('patient').insert({
                    user_id: authData.user.id,
                    username: data.username,
                    email: data.email,
                    first_name: data.firstName,
                    last_name: data.lastName,
                    phone_number: data.phoneNumber,
                    date_of_birth: data.dateOfBirth,
                    user_role: 'patient',
                    therapy_start_date: data.therapyStartDate,
                    preferred_contact_method: data.preferredContactMethod,
                });
                insertError = error;
            }else if (data.role === 'parent_carer') {
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

    // Login user 
    async login(username: string, password: string): Promise<AuthResponse> {
        try {
            // find email from username by checking all tables 
            let email = '';

            // check therapist table

            const { data: therapistData } = await supabase
            .from('therapist')
            .select('email')
            .eq('username', username)
            .maybeSingle();

            if (therapistData) {
                email = therapistData.email;
            } else {
                // check patient table 
                const { data: patientData } = await supabase 
                .from('patient')
                .select('email')
                .eq('username', username)
                .maybeSingle();
                
                if (patientData) {
                    email = patientData.email;
                } else {
                    // check parent_carer table 
                    const { data: parentData } = await supabase 
                    .from('parent_carer')
                    .select('email')
                    .eq('username', username)
                    .maybeSingle();

                    if (parentData) {
                        email = parentData.email;
                    }
                }

            }

            if (!email) {
                throw new Error('Invalid username or password');
            }

            // Login with email password 
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
                user: data.user,
              };
        } catch (error: any) {
            return {
                success: false, 
                message: error.message || 'Login failed',
            };
        }
    }

    // Logout user 
    async logout(): Promise<void> {
        await supabase.auth.signOut();
    }

    // Get current user 
    async getCurrentUser() {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    }

    // check if user is authenticated 
    async isAuthenticated(): Promise<boolean> {
        const user = await this.getCurrentUser();
        return !!user;
    }
}

export default new SupabaseAuthService();
