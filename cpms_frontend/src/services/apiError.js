//Turns any server error into a readable sentence
export const apiError = (err, fallback = 'Something went wrong. Please try again.') => {
    if (!err.response) return 'Cannot reach the server. Is the backend running?';
    const d = err.response.data;
    if (typeof d === 'string') return d.length < 200 && !d.startsWith('<') ? d : fallback;
    if (Array.isArray(d)) return d[0] || fallback;
    if (d?.error) return d.error;
    if (d?.detail) return d.detail;
    if (d && typeof d === 'object') {
        const first = Object.values(d)[0];
        return Array.isArray(first) ? first[0] : String(first);
    }
    return fallback;
};