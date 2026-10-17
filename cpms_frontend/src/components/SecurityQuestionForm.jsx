import { useState } from 'react';
import { authService } from '../services/api';
import { apiError } from '../services/apiError';
import { SECURITY_QUESTIONS } from '../constants/securityQuestions';

const field = "w-full px-3 py-2 text-sm border border-white/15 bg-slate-900/30 rounded text-white";

const SecurityQuestionForm = () => {
    const [open, setOpen] = useState(false);
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage('');
        try {
            const data = await authService.setSecurityQuestion(question, answer, currentPassword);
            setIsError(false);
            setMessage(data.message);
            setAnswer('');
            setCurrentPassword('');
        } catch (err) {
            setIsError(true);
            setMessage(apiError(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mt-5 border-t border-white/10 pt-4">
            <button onClick={() => setOpen(!open)} className="text-xs text-blue-300 hover:text-blue-200 underline">
                {open ? 'Hide security question' : 'Set or change security question'}
            </button>
            {open && (
                <form onSubmit={submit} className="mt-3 space-y-2">
                    <select value={question} onChange={(e) => setQuestion(e.target.value)} required className={field}>
                        <option value="">Choose a question...</option>
                        {SECURITY_QUESTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
                    </select>
                    <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Answer" required minLength={3} autoComplete="off" className={field} />
                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" required className={field} />
                    {message && <p className={`text-xs ${isError ? 'text-red-300' : 'text-emerald-300'}`}>{message}</p>}
                    <button type="submit" disabled={busy} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded disabled:opacity-50">
                        {busy ? 'Saving...' : 'Save'}
                    </button>
                </form>
            )}
        </div>
    );
};

export default SecurityQuestionForm;