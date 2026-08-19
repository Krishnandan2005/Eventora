import { createContext, useState, useEffect } from 'react';
import api from '../utils/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            setUser(JSON.parse(userInfo));
        }
        setLoading(false);
    }, []);

    const login = async (email, password, loginAsAdmin, adminCode) => {
        try {
            const { data } = await api.post('/auth/login', { email, password, loginAsAdmin, adminCode });
            setUser(data);
            localStorage.setItem('userInfo', JSON.stringify(data));
            localStorage.setItem('token', data.token);
            return data;
        } catch (error) {
            const errMsg = error.response?.data?.error || 'Login failed';
            if (errMsg.includes('not verified')) {
                throw { needsVerification: true, message: errMsg };
            }
            throw { message: errMsg };
        }
    };

    const register = async (name, email, password, role, adminCode) => {
        try {
            const { data } = await api.post('/auth/register', { name, email, password, role, adminCode });
            return data; // Returns { message, email }
        } catch (error) {
            throw { message: error.response?.data?.error || 'Registration failed' };
        }
    };

    const verifyOTP = async (email, otp) => {
        try {
            const { data } = await api.post('/auth/verify-otp', { email, otp });
            setUser(data);
            localStorage.setItem('userInfo', JSON.stringify(data));
            localStorage.setItem('token', data.token);
            return data;
        } catch (error) {
            throw { message: error.response?.data?.error || 'OTP verification failed' };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('userInfo');
        localStorage.removeItem('token');
    };

    return (
        <AuthContext.Provider value={{ user, login, register, verifyOTP, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
