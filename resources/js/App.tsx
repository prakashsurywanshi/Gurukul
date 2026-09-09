import React, { useState, useEffect } from 'react';
import LoginPage from './Pages/LoginPage';
import Dashboard from './Pages/Dashboard';
import { Toaster } from './Pages/ui/sonner';
import { authService } from './utils/mockDataService';

export default function App() {
    const [user, setUser] = useState<any>(null);
    const [accessToken, setAccessToken] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            // Check if there's a token in localStorage
            const savedToken = localStorage.getItem('auth_token');
            if (savedToken) {
                const userData = authService.getCurrentUser(savedToken);
                if (userData) {
                    setAccessToken(savedToken);
                    setUser(userData.user);
                }
            }
        } catch (error) {
            console.error('Session check error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (email: string, password: string) => {
        try {
            const result = authService.login(email, password);

            if (result.success) {
                setAccessToken(result.access_token!);
                setUser(result.user);
                // Save token to localStorage
                localStorage.setItem('auth_token', result.access_token!);
                return { success: true };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Connection error' };
        }
    };

    const handleLogout = async () => {
        setUser(null);
        setAccessToken('');
        localStorage.removeItem('auth_token');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <>
                <LoginPage onLogin={handleLogin} />
                <Toaster />
            </>
        );
    }

    return (
        <>
            <Dashboard user={user} accessToken={accessToken} onLogout={handleLogout} />
            <Toaster />
        </>
    );
}
