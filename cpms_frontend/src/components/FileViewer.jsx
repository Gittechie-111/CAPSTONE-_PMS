import { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';

const IMAGE_TYPES = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
const TEXT_TYPES = ['txt', 'md', 'csv'];
const extOf = (url = '') => url.split('?')[0].split('.').pop().toLowerCase();

const FileViewer = ({ url, title, onClose }) => {
    const [view, setView] = useState({ kind: 'loading' });
    const docxRef = useRef(null);
    const ext = extOf(url);

    useEffect(() => {
        let objectUrl = null;
        let cancelled = false;

        (async () => {
            try {
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Server returned ${res.status}`);
                const blob = await res.blob();
                if (cancelled) return;

                if (ext === 'docx') {
                    setView({ kind: 'docx', blob });
                } else if (ext === 'pdf') {
                    objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
                    setView({ kind: 'frame', src: objectUrl });
                } else if (IMAGE_TYPES.includes(ext)) {
                    objectUrl = URL.createObjectURL(blob);
                    setView({ kind: 'image', src: objectUrl });
                } else if (TEXT_TYPES.includes(ext)) {
                    objectUrl = URL.createObjectURL(new Blob([blob], { type: 'text/plain' }));
                    setView({ kind: 'frame', src: objectUrl });
                } else {
                    setView({ kind: 'unsupported' });
                }
            } catch (e) {
                if (!cancelled) setView({ kind: 'error', message: e.message });
            }
        })();

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [url, ext]);

    useEffect(() => {
        if (view.kind === 'docx' && docxRef.current) {
            renderAsync(view.blob, docxRef.current).catch(() => setView({ kind: 'unsupported' }));
        }
    }, [view]);

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-slate-900 border border-white/15 rounded-xl w-full max-w-5xl h-[88vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                    <p className="text-sm font-medium text-white truncate">{title}</p>
                    <div className="flex items-center gap-3 shrink-0">
                        <a href={url} download className="text-xs text-blue-300 hover:text-blue-200 underline">Download</a>
                        <button onClick={onClose} className="text-xs border border-white/10 text-slate-300 hover:text-white px-3 py-1.5 rounded">
                            Close
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {view.kind === 'loading' && <p className="p-6 text-sm text-slate-300">Loading document…</p>}
                    {view.kind === 'error' && <p className="p-6 text-sm text-red-300">Could not load the file ({view.message}).</p>}
                    {view.kind === 'unsupported' && (
                        <p className="p-6 text-sm text-slate-300">
                            This file type can't be previewed in the browser (older .doc, .pptx and others).
                            Use Download above, or ask for a PDF or .docx.
                        </p>
                    )}
                    {view.kind === 'frame' && <iframe src={view.src} title={title} className="w-full h-full bg-white" />}
                    {view.kind === 'image' && <img src={view.src} alt={title} className="max-w-full mx-auto" />}
                    {view.kind === 'docx' && <div ref={docxRef} className="bg-white text-black min-h-full p-4" />}
                </div>
            </div>
        </div>
    );
};

export default FileViewer;