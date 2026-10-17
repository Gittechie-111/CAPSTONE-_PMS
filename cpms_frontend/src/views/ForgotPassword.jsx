import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { apiError } from '../services/apiError';

const input = "w-full px-3.5 py-2.5 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/60";
const button = "w-full py-2.5 rounded-lg text-sm font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-blue-500 disabled:opacity-50";

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [username, setUsername] = useState('');
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    const getQuestion = async (e) => {
        e.preventDefault();
        setError('');
        setBusy(true);
        try {
            const data = await authService.getSecurityQuestion(username.trim());
            setQuestion(data.question);
            setStep(2);
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    };

    const reset = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }
        setBusy(true);
        try {
            await authService.resetPassword(username.trim(), answer, password);
            setDone(true);
            setTimeout(() => navigate('/login'), 1800);
        } catch (err) {
            setError(apiError(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
                <h1 className="text-2xl font-semibold text-white mb-1">Reset your password</h1>
                <p className="text-slate-400 text-sm mb-6">Answer your security question to choose a new password.</p>

                {error && <div className="bg-red-500/10 text-red-300 text-sm p-3 rounded-lg border border-red-500/20 mb-4">{error}</div>}

                {done ? (
                    <p className="text-emerald-300 text-sm">Password updated. Redirecting to sign in…</p>
                ) : step === 1 ? (
                    <form onSubmit={getQuestion} className="space-y-4">
                        <div>
                            <label htmlFor="fp-user" className="block text-sm text-slate-300 mb-1.5">Username</label>
                            <input id="fp-user" value={username} onChange={(e) => setUsername(e.target.value)} required className={input} />
                        </div>
                        <button type="submit" disabled={busy} className={button}>{busy ? 'Checking…' : 'Continue'}</button>
                    </form>
                ) : (
                    <form onSubmit={reset} className="space-y-4">
                        <p className="text-sm text-slate-200">{question}</p>
                        <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer" required autoComplete="off" className={input} />
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" required className={input} />
                        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" required className={input} />
                        <button type="submit" disabled={busy} className={button}>{busy ? 'Saving…' : 'Reset password'}</button>
                    </form>
                )}

                <p className="text-center text-sm text-slate-400 mt-6">
                    <Link to="/login" className="text-emerald-400 hover:text-emerald-300">Back to sign in</Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPassword;