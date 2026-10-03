//This file handles tracking whether a user is logged in and stores their profile data across all frontend components.
import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const applyToken = (access) => {
        const decoded = jwtDecode(access);
        setUser({ username: decoded.username, role: decoded.role });
        return decoded.role;
    };

    useEffect(() => {
        const token = sessionStorage.getItem('accessToken');
        if (token) {
            try {
                applyToken(token);
            } catch {
                sessionStorage.removeItem('accessToken');
            }
        }
        setLoading(false);
    }, []);

    // Returns { role } when signed in, or { otpRequired, challengeId, phoneHint } when a code is needed
    const login = async (username, password) => {
        const data = await authService.login(username, password);
        if (data.otp_required) {
            return { otpRequired: true, challengeId: data.challenge_id, phoneHint: data.phone_hint };
        }
        return { role: applyToken(data.access) };
    };

    const verifyOtp = async (challengeId, code) => {
        const data = await authService.verifyOtp(challengeId, code);
        return applyToken(data.access);
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, verifyOtp, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);









// import React, { createContext, useState, useEffect } from 'react';
// import { authService } from '../services/api.js';

// export const AuthContext = createContext(null);

// export const AuthProvider = ({ children }) => {
//     const [user, setUser] = useState(null);
//     const [loading, setLoading] = useState(true);

//     // Automatically check memory for an existing token on boot
//     useEffect(() => {
//         const token = sessionStorage.getItem('accessToken');
//         if (token) {
//             // Decodes the payload array from the JWT token string to read user roles
//             try {
//                 const base64Url = token.split('.')[1];
//                 const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//                 const payload = JSON.parse(window.atob(base64));
                
//                 setUser({
//                     id: payload.user_id,
//                     username: payload.username || 'Authenticated User',
//                     role: payload.role || 'STUDENT' // Reads custom backend role choices
//                 });
//             } catch (e) {
//                 authService.logout();
//             }
//         }
//         setLoading(false);
//     }, []);

//     const loginUser = async (username, password) => {
//         setLoading(true);
//         try {
//             const data = await authService.login(username, password);
            
//             // Decode the newly received access token string
//             const base64Url = data.access.split('.')[1];
//             const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//             const payload = JSON.parse(window.atob(base64));

//             const loggedInUser = {
//                 id: payload.user_id,
//                 username: username,
//                 role: payload.role || 'STUDENT'
//             };
            
//             setUser(loggedInUser);
//             return loggedInUser;
//         } catch (error) {
//             throw error;
//         } finally {
//             setLoading(false);
//         }
//     };

//     const logoutUser = () => {
//         authService.logout();
//         setUser(null);
//     };

//     return (
//         <AuthContext.Provider value={{ user, loginUser, logoutUser, loading }}>
//             {!loading && children}
//         </AuthContext.Provider>
//     );
// };
