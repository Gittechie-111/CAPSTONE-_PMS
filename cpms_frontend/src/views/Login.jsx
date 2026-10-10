import { useState, useLayoutEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();
    const formKey = useRef(`login-form-${Date.now()}-${Math.random()}`);
    const { login, verifyOtp } = useAuth();
    const [otpChallenge, setOtpChallenge] = useState(null);
    const [otpCode, setOtpCode] = useState('');

    useLayoutEffect(() => {
        const clearFields = () => {
            setUsername('');
            setPassword('');

            const usernameInput = document.getElementById('login-username');
            const passwordInput = document.getElementById('login-password');
            if (usernameInput) {
                usernameInput.value = '';
                usernameInput.setAttribute('autocomplete', 'off');
                usernameInput.setAttribute('data-lpignore', 'true');
                usernameInput.setAttribute('data-1p-ignore', 'true');
            }
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.setAttribute('autocomplete', 'off');
                passwordInput.setAttribute('data-lpignore', 'true');
                passwordInput.setAttribute('data-1p-ignore', 'true');
            }
        };

        clearFields();
        const timer = setTimeout(clearFields, 50);
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
        setSubmitting(true);
        try {
            const result = await login(username, password);
            if (result.otpRequired) {
                setOtpChallenge(result);
                return;
            }
            navigate(`/dashboard/${result.role.toLowerCase()}`);
        } catch (err) {
            setError(
                err.response
                    ? (err.response.data?.detail || 'Invalid username or password.')
                    : 'Cannot reach the server. Is the backend running?'
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const role = await verifyOtp(otpChallenge.challengeId, otpCode);
            navigate(`/dashboard/${role.toLowerCase()}`);
        } catch (err) {
            setError(err.response?.data?.detail || 'Could not verify the code.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="w-full max-w-md">
                {/* Brand mark */}
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

                {/* Card */}
                <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
                    {error && (
                        <div className="bg-red-500/10 text-red-300 text-sm p-3 rounded-lg mb-5 border border-red-500/20">
                            {error}
                        </div>
                    )}
                        {otpChallenge ? (
                        <form onSubmit={handleVerify} className="space-y-5">
                            <p className="text-sm text-slate-300">
                                We sent a 6-digit code to the phone ending {otpChallenge.phoneHint}.
                            </p>
                            <input
                                id="login-otp"
                                name="otp"
                                inputMode="numeric"
                                maxLength={6}
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                required
                                autoFocus
                                placeholder="123456"
                                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-100 text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                            />
                            <button
                                type="submit"
                                disabled={submitting || otpCode.length !== 6}
                                className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-blue-500 disabled:opacity-50"
                            >
                                {submitting ? 'Verifying…' : 'Verify & Sign In'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setOtpChallenge(null); setOtpCode(''); setError(''); }}
                                className="w-full text-xs text-slate-400 hover:text-slate-200"
                            >
                                Back
                            </button>
                        </form>
                    ) : (
                        
                        <form key={formKey.current} onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="login-username" className="block text-sm font-medium text-slate-300 mb-1.5">
                                Username
                            </label>
                            <input
                                id="login-username"
                                name="username"
                                type="text"
                                value={username}
                                autoComplete="off"
                                autoCorrect="off"
                                spellCheck={false}
                                data-lpignore="true"
                                data-1p-ignore="true"
                                onFocus={(event) => resetFieldOnFocus(event, setUsername, 'login-username')}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 transition-colors"
                                placeholder="e.g. student_1 or dr_john"
                            />
                        </div>

                        <div>
                            <label htmlFor="login-password" className="block text-sm font-medium text-slate-300 mb-1.5">
                                Password
                            </label>
                            <input
                                id="login-password"
                                name="password"
                                type="password"
                                value={password}
                                autoComplete="off"
                                data-lpignore="true"
                                data-1p-ignore="true"
                                onFocus={(event) => resetFieldOnFocus(event, setPassword, 'login-password')}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 transition-colors"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-blue-500 hover:from-emerald-300 hover:to-blue-400 shadow-lg shadow-blue-900/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'Signing in…' : 'Sign In'}
                        </button>
                    </form>
                    )}
                    

                    <p className="text-center text-sm text-slate-400 mt-6">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-medium">
                            Register
                        </Link>
                    </p>
                </div>

                <p className="text-center text-xs text-slate-600 mt-6">
                    Secure access for students, lecturers & coordinators
                </p>
                </div>
                </div>
            );
};

export default Login;








