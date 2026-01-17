// base API URL - points to backend server 
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// user interface - defines the structure of the user object 
export interface User {
    id: string; 
    username: string; 
    email: string;
    firstName: string;
    lastName: string; 
    phoneNumber: string;
    dateOfBirth: string; 
    role: 'therapist' | 'patient';

    // Therapist-specific fields 
    clinicName?: string; 
    yearsOfExperience?: number;
    qualification?: string; 

    // Patient-specific fields 
    therapyStartDate?: string; 
    preferredContactMethod?: string;
}

// response structure from the API 
export interface AuthResponse {
    success: boolean; 
    message: string;
    data:{
        token: string;
        user: User;
    };
}

// data needed for registration 
export interface RegisterData{
    username: string; 
    email: string; 
    password: string; 
    firstName: string; 
    lastName: string; 
    phoneNumber: string; 
    dateOfBirth: string; 
    role: 'therapist' | 'patient';

    // Therapist-specific fields 
    clinicName: string; 
    yearsOfExperience: number;
    qualification: string; 

    // Patient-specific fields 
    therapyStartDate: string; 
    preferredContactMethod: string;
}

// data for login 
export interface LoginData{
    username: string; 
    password: string;
}

// Auth service class 
class AuthService {
    // register - create a new user account 
    async register(data: RegisterData): Promise<AuthResponse>{
        try{
            // send POST request to register endpoint
            const response = await fetch('${API_URL}/auth/register',{
                method: 'POST', 
                headers:{
                    'Content-Type': 'application/json', // Tells the server we are sending Json
                },
                body: JSON.stringify(data) // converting data object to JSON string
            });
            // analyse JSON response 
            const result: AuthResponse = await response.json();

            // checking if registration was successful 
            if (!response.ok) {
                // if not successful, throw an error message 
                throw new Error(result.message || 'Registration Failed'); 
            }
            // If successful, save token and user data to browser's local storage 
            if (result.data.token){
                localStorage.setItem('token', result.data.token);
                localStorage.setItem('user', JSON.stringify(result.data));
            }
            return result;
        }catch (error){
            // Re-throw the error so that the component can handle it 
            throw error;
        }
    }
    // login - authenticates an exiting user 
    async login(data: LoginData): Promise<AuthResponse> {
        try{
            // send POST request to login endpoint
            const response = await fetch (`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            // analyse
            const result: AuthResponse = await response.json();

            // Check if login was successful 
            if (!response.ok) {
                throw new Error(result.message || 'Login Failed');
            }
            // save token and user data to local storage 
            if (result.data.token) {
                localStorage.setItem('token', result.data.token);
                localStorage.setItem('user', JSON.stringify(result.data.user));
            }
            return result;
        }catch (error){
            throw error;
        }
    }
    // logout - clears user session 
    logout(): void{
        // remove token and user data from local storage 
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }
    // get current user - returns logged in user data 
    getCurrentUser(): User | null{
        // get user data from local storage 
        const userStr = localStorage.getItem('user');
        if (userStr){
            // analyse JSON string back to an object 
            return JSON.parse(userStr);
        }
        return null; // no user logged in 
    }
    // get token - returns the JWT token 
    getToken(): string | null {
        return localStorage.getItem('token');
    }
    // is authenticated - checks if user is logged in 
    isAuthenticated(): boolean{
        // user is authenticated if they have a token 
        return !!this.getToken();
    }
    // verify token - checks if token is still valid 
    async verifyToken(): Promise<boolean> {
        try{
            const token = this.getToken();
            if(!token) return false; 

            // send GET request to verify endpoint with token in header 
            const response = await fetch ('${API_URL}/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorisation': 'Bearer ${token}' // send token is authorisation header 
                }
            });

            // if response is not ok, token is invalid 
            if (!response.ok) {
                this.logout(); // cleat invalid session 
                return false;
            }
            return true; // token is valid 
        }catch (error){
            this.logout(); // clear session on error 
            return false;
        }
    }
}
// export as single instance of the service 
// all components use the same instance
export default new AuthService();