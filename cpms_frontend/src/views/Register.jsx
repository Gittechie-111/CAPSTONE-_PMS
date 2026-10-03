import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
// Global GradientLayout applied in App.jsx

const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [registrationNumber, setRegistrationNumber] = useState('');
    const navigate = useNavigate();
    const formKey = useRef(`register-form-${Date.now()}-${Math.random()}`);

    useEffect(() => {
        const clearFields = () => {
            setUsername('');
            setEmail('');
            setPhoneNumber('');
            setPassword('');

            const usernameInput = document.getElementById('reg-username');
            const emailInput = document.getElementById('reg-email');
            const phoneInput = document.getElementById('reg-phone');
            const passwordInput = document.getElementById('reg-password');

            if (usernameInput) {
                usernameInput.value = '';
                usernameInput.setAttribute('autocomplete', 'off');
                usernameInput.setAttribute('data-lpignore', 'true');
                usernameInput.setAttribute('data-1p-ignore', 'true');
            }
            if (emailInput) {
                emailInput.value = '';
                emailInput.setAttribute('autocomplete', 'off');
                emailInput.setAttribute('data-lpignore', 'true');
                emailInput.setAttribute('data-1p-ignore', 'true');
            }
            if (phoneInput) {
                phoneInput.value = '';
                phoneInput.setAttribute('autocomplete', 'off');
                phoneInput.setAttribute('data-lpignore', 'true');
                phoneInput.setAttribute('data-1p-ignore', 'true');
            }
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.setAttribute('autocomplete', 'off');
                passwordInput.setAttribute('data-lpignore', 'true');
                passwordInput.setAttribute('data-1p-ignore', 'true');
            }
        };

        clearFields();
        const timer = setTimeout(clearFields, 100);
        return () => clearTimeout(timer);
    }, []);

    const resetFieldOnFocus = (field, setter, elementId) => {
        const input = document.getElementById(elementId);
        if (input && input.value) {
            input.value = '';
        }
        setter('');
        field?.target?.setAttribute?.('autocomplete', 'off');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        setSubmitting(true);
        try {
            await authService.register(username, email, password, phoneNumber, registrationNumber);
            setSuccess(true);
            setTimeout(() => navigate('/login'), 1500);
        } catch (err) {
            const data = err.response?.data;
            if (data?.username) {
                setError(`Username: ${data.username[0]}`);
            } else {
                setError('Registration failed. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40 mb-4">
                        <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-white">
                            <path d="M4 19V5a2 2 0 012-2h8l6 6v10a2 2 0 01-2 2H6a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                            <path d="M14 3v5a1 1 0 001 1h5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                            <path d="M8 13l2.5 2.5L16 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-semibold text-white tracking-tight">CPMS</h1>
                    <p className="text-slate-400 text-sm mt-1">Capstone Project Management System</p>
                </div>

                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-6">
                        <h2 className="text-3xl font-bold text-slate-100">Create Account</h2>
                        <p className="text-slate-200 text-sm mt-1">Student registration — CPMS Portal</p>
                    </div>

                    {success ? (
                        <p className="text-green-700 text-sm text-center">
                            Account created! Redirecting to login...
                        </p>
                    ) : (
                        <form key={formKey.current} onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-red-500/10 text-red-300 text-sm p-3 rounded-lg mb-5 border border-red-500/20">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label htmlFor="reg-username" className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Username
                                </label>
                                <input
                                    id="reg-username"
                                    name="username"
                                    type="text"
                                    value={username}
                                    autoComplete="off"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    data-lpignore="true"
                                    data-1p-ignore="true"
                                    onFocus={(event) => resetFieldOnFocus(event, setUsername, 'reg-username')}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 transition-colors"
                                />
                            </div>
                            <div>
                                <label htmlFor="reg-regnumber" className="block text-sm font-medium text-gray-700 mb-1">
                                    Registration Number
                                </label>
                                <input
                                    id="reg-regnumber"
                                    name="registration_number"
                                    type="text"
                                    value={registrationNumber}
                                    onChange={(e) => setRegistrationNumber(e.target.value)}
                                    required
                                    placeholder="e.g. SCT211-0001/2021"
                                    className="w-full px-3 py-2 border border-white/15 bg-slate-900/30 rounded text-white placeholder:text-slate-400"                                />
                            </div>
                            <div>
                                <label htmlFor="reg-email" className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Email
                                </label>
                                <input
                                    id="reg-email"
                                    name="email"
                                    type="email"
                                    value={email}
                                    autoComplete="off"
                                    data-lpignore="true"
                                    data-1p-ignore="true"
                                    onFocus={(event) => resetFieldOnFocus(event, setEmail, 'reg-email')}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 transition-colors"
                                />
                            </div>
                            <div>
                                <label htmlFor="reg-phone" className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Phone Number
                                </label>
                                <input
                                    id="reg-phone"
                                    name="phone_number"
                                    type="text"
                                    value={phoneNumber}
                                    autoComplete="off"
                                    data-lpignore="true"
                                    data-1p-ignore="true"
                                    onFocus={(event) => resetFieldOnFocus(event, setPhoneNumber, 'reg-phone')}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 transition-colors"
                                />
                            </div>
                            <div>
                                <label htmlFor="reg-password" className="block text-sm font-medium text-slate-300 mb-1.5">
                                    Password
                                </label>
                                <input
                                    id="reg-password"
                                    name="password"
                                    type="password"
                                    value={password}
                                    autoComplete="off"
                                    data-lpignore="true"
                                    data-1p-ignore="true"
                                    onFocus={(event) => resetFieldOnFocus(event, setPassword, 'reg-password')}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 transition-colors"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-blue-500 hover:from-emerald-300 hover:to-blue-400 shadow-lg shadow-blue-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? 'Creating account...' : 'Create Account'}
                            </button>
                            <p className="text-center text-sm text-slate-400 mt-6">
                                Already have an account?{' '}
                                <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
                                    Sign in
                                </Link>
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Register;