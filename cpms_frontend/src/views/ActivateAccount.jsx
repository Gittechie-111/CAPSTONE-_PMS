import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authService } from '../services/api';

const ActivateAccount = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }
        setSubmitting(true);
        try {
            await authService.activateAccount(token, password);
            setDone(true);
            setTimeout(() => navigate('/login'), 1800);
        } catch (err) {
            setError(err.response?.data?.detail || 'Could not activate this account.');
        } finally {
            setSubmitting(false);
        }
    };

    const input = "w-full px-3.5 py-2.5 rounded-lg bg-slate-800/70 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/60";

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
                <h1 className="text-2xl font-semibold text-white mb-1">Activate your supervisor account</h1>
                <p className="text-slate-400 text-sm mb-6">Choose a password. This link works once.</p>

                {done ? (
                    <p className="text-emerald-300 text-sm">Account activated. Redirecting to sign in…</p>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-500/10 text-red-300 text-sm p-3 rounded-lg border border-red-500/20">{error}</div>
                        )}
                        <div>
                            <label htmlFor="act-password" className="block text-sm text-slate-300 mb-1.5">New password</label>
                            <input id="act-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={input} />
                        </div>
                        <div>
                            <label htmlFor="act-confirm" className="block text-sm text-slate-300 mb-1.5">Confirm password</label>
                            <input id="act-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className={input} />
                        </div>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-2.5 rounded-lg text-sm font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-blue-500 disabled:opacity-50"
                        >
                            {submitting ? 'Activating…' : 'Activate account'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ActivateAccount;