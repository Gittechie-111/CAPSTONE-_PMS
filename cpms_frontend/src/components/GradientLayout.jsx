import React from 'react';

const GradientLayout = ({ children, className = '', center = false }) => {
    const outer = center
        ? 'min-h-screen relative bg-slate-950 flex items-center justify-center px-4'
        : 'min-h-screen relative bg-slate-950';

    const inner = center ? 'relative w-full max-w-4xl' : 'relative w-full';

    return (
        <div className={`${outer} ${className}`}>
            {/* Decorative background: fixed, clipped on its own, never affects scrolling */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/30 blur-3xl" />
                <div className="absolute -bottom-40 -right-24 w-[28rem] h-[28rem] rounded-full bg-blue-600/30 blur-3xl" />
                <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-teal-400/10 blur-2xl" />
                <div className="absolute inset-0 bg-gradient-to-br from-blue-950/40 via-transparent to-emerald-950/40" />
            </div>
            <div className={inner}>
                {children}
            </div>
        </div>
    );
};

export default GradientLayout;






// import React from 'react';

// const GradientLayout = ({ children, className = '' }) => {
//     return (
//         <div className={`min-h-screen relative overflow-hidden bg-slate-950 flex items-center justify-center px-4 ${className}`}>
//             {/* Ambient gradient blobs */}
//             <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/30 blur-3xl" />
//             <div className="pointer-events-none absolute -bottom-40 -right-24 w-[28rem] h-[28rem] rounded-full bg-blue-600/30 blur-3xl" />
//             <div className="pointer-events-none absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-teal-400/10 blur-2xl" />

//             {/* Diagonal sheen */}
//             <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-950/40 via-transparent to-emerald-950/40" />

//             <div className="relative w-full max-w-4xl">
//                 {children}
//             </div>
//         </div>
//     );
// };

// export default GradientLayout;
