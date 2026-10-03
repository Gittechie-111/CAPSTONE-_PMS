import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import GradientLayout from './components/GradientLayout';

import Login from './views/Login';
import StudentDashboard from './views/Student/StudentDashboard';
import LecturerDashboard from './views/Lecturer/LecturerDashboard';
import AdminDashboard from './views/Admin/AdminDashboard';
import Register from './views/Register';
import ActivateAccount from './views/ActivateAccount'

function AppRoutes() {
    const location = useLocation();

    return (
        <div key={location.pathname} className="route-page">
            <Routes location={location}>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/activate/:token" element={<ActivateAccount />} />

                <Route
                    path="/dashboard/student"
                    element={
                        <ProtectedRoute allowedRoles={['STUDENT']}>
                            <StudentDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dashboard/lecturer"
                    element={
                        <ProtectedRoute allowedRoles={['LECTURER']}>
                            <LecturerDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/dashboard/admin"
                    element={
                        <ProtectedRoute allowedRoles={['ADMIN']}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route path="/register" element={<Register />} />
            </Routes>
        </div>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <GradientLayout>
                    <AppRoutes />
                </GradientLayout>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;













// import React from 'react';
// import { AuthProvider } from './context/AuthContext';
// import Login from './views/Login';
// import './index.css';

// function App() {
//   return (
//     <AuthProvider>
//       {/* For right now, we mount the login screen block layout directly to test it */}
//       <Login />
//     </AuthProvider>
//   );
// }

// export default App;




// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1>Vite + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.jsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>
//     </>
//   )
// }

// export default App
