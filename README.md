# CPMS — Capstone Project Management System

A full-stack web application for managing final-year computer projects — from proposal submission and supervisor allocation through milestones, meetings, submissions, panel grading, and notifications.

The system is a **monorepo** containing:

- **`cpms_backend/`** — Django REST Framework API
- **`cpms_frontend/`** — React (Vite) single-page application

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Running the Full Stack](#running-the-full-stack)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [User Roles](#user-roles)
- [Authentication Flow](#authentication-flow)
- [Testing](#testing)
- [Deployment Notes](#deployment-notes)
- [Security Notes](#security-notes)
- [Contributing](#contributing)
- [License](#license)
- [Authors](#authors)
- [Acknowledgements](#acknowledgements)

---

## Features

- 🔐 **JWT authentication** with access/refresh tokens
- 📱 **SMS-based OTP** for privileged roles (lecturers, panelists)
- 👥 **Role-based access control** — students, lecturers, panelists, admins
- 📁 **Project proposals** — submission, feedback, and review
- 🎯 **Automatic project allocation** to supervisors
- 📅 **Meeting slots & bookings** — publish slots, reschedule, cancel, complete
- 📝 **Milestones & submissions** — track progress with file uploads
- 🏅 **Panel grading** — define criteria and record panel grades
- 🔔 **In-app notifications** for key events
- ⚙️ **System settings** — configurable proposal deadlines, etc.
- 🖼️ **Media file handling** for uploads (dev)

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Language | Python 3.12 |
| Framework | Django 5.x |
| API | Django REST Framework |
| Authentication | djangorestframework-simplejwt (JWT) |
| Database | MySQL 8 |
| CORS | django-cors-headers |
| Config | python-decouple (`.env`) |
| File uploads | Django media storage (dev) |
| SMS / OTP | AfricasTalking (console mock in dev) |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React (Vite) |
| Routing | React Router |
| HTTP Client | Axios |
| Auth storage | `sessionStorage` (access) + `localStorage` (refresh) |
| Dev URL | http://localhost:5173/ |

---

## Project Structure
FINAL_YEAR_PROJECT/
├── manage.py
├── requirements.txt
├── .env.example # Template — safe to commit
├── .env # Real secrets — NEVER commit
├── .gitignore
├── README.md
│
├── cpms_backend/ # Django project config
│ ├── settings.py
│ ├── urls.py
│ ├── wsgi.py
│ └── asgi.py
│
├── core/ # Main Django app
│ ├── models.py
│ ├── views.py
│ ├── auth_views.py
│ ├── serializers.py
│ ├── urls.py
│ ├── migrations/
│ └── admin.py
│
├── media/ # Uploaded files (dev only, gitignored)
│
├── cpms_frontend/ # React SPA
│ ├── package.json
│ ├── vite.config.js
│ ├── index.html
│ ├── public/
│ └── src/
│ ├── main.jsx
│ ├── App.jsx
│ ├── AppRoutes.jsx
│ ├── services/
│ │ └── api.js # Axios instance + service layer
│ ├── context/
│ │ └── AuthContext.jsx
│ ├── components/
│ │ ├── ProtectedRoute.jsx
│ │ ├── NotificationItem.jsx
│ │ ├── GradientLayout.jsx
│ │ └── FileViewer.jsx
│ └── views/
│ ├── Login.jsx
│ ├── Register.jsx
│ ├── ActivateAccount.jsx
│ ├── Admin/AdminDashboard.jsx
│ ├── Lecturer/LectureDashboard.jsx
│ └── Student/StudentDashboard.jsx
│
└── venv/ # Python virtual environment (gitignored)


---

## Getting Started

### Prerequisites

- **Python** 3.10+ (tested on 3.12)
- **Node.js** 18+ and npm
- **MySQL** 8+
- **Git**

On Ubuntu/Debian, install the MySQL dev headers for `mysqlclient`:

```bash
sudo apt update
sudo apt install -y python3-dev default-libmysqlclient-dev build-essential pkg-config
```
**On macOS:

bash
```brew install mysql-client pkg-config```
**

Backend Setup
# 1. Clone the repo
git clone https://github.com/Gitcheche111/CAPSTONE-_PMS.git
cd CAPSTONE-_PMS

# 2. Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate            # Linux / macOS
# venv\Scripts\activate             # Windows

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Create your .env file from the template
cp .env.example .env
# Then edit .env with your real values (see Environment Variables below)

# 5. Create the MySQL database and user
sudo mysql -u root -p

CREATE DATABASE cpms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'cpms_user'@'localhost' IDENTIFIED BY 'YourSecurePassword123!';
GRANT ALL PRIVILEGES ON cpms_db.* TO 'cpms_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;


# 6. Apply migrations
python manage.py makemigrations
python manage.py migrate

# 7. Create an admin user
python manage.py createsuperuser

Backend runs at: http://127.0.0.1:8000/
Django admin: http://127.0.0.1:8000/admin/

Frontend Setup
In a new terminal:
cd cpms_frontend

# 1. Install Node dependencies
npm install

# 2. Start the dev server
npm run dev

# 8. Start the backend
python manage.py runserver

Frontend runs at: http://localhost:5173/
Running the Full Stack
Two terminals, both running simultaneously:

Terminal	Command	URL
1 — Backend	cd ~/FINAL_YEAR_PROJECT && source venv/bin/activate && python manage.py runserver	http://127.0.0.1:8000/

2 — Frontend	cd ~/FINAL_YEAR_PROJECT/cpms_frontend && npm run dev	http://localhost:5173/
Open http://localhost:5173/ in your browser.

Environment Variables
Configuration is loaded from .env using python-decouple. Never commit .env to Git.

.env.example (committed as a template)
# ─── Django ─────────────────────────────────
SECRET_KEY=replace-me-with-a-long-random-string
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost

# ─── Database ────────────────────────────────
DB_NAME=cpms_db
DB_USER=cpms_user
DB_PASSWORD=replace-with-a-strong-password
DB_HOST=127.0.0.1
DB_PORT=3306

# ─── CORS / Frontend ─────────────────────────
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
FRONTEND_URL=http://localhost:5173

# ─── SMS / OTP (AfricasTalking) ──────────────
SMS_BACKEND=console
AT_USERNAME=sandbox
AT_API_KEY=

Generating a secure SECRET_KEY

python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
Copy the output into .env as SECRET_KEY=...


Variable reference
Variable	Purpose	Default
SECRET_KEY	Django cryptographic signing key	(required)
DEBUG	Enable debug mode	False
ALLOWED_HOSTS	Comma-separated allowed hosts	127.0.0.1,localhost
DB_NAME	MySQL database name	cpms_db
DB_USER	MySQL username	cpms_user
DB_PASSWORD	MySQL password	(required)
DB_HOST	MySQL host	127.0.0.1
DB_PORT	MySQL port	3306
CORS_ALLOWED_ORIGINS	Comma-separated frontend origins	http://localhost:5173
FRONTEND_URL	Frontend base URL (email links)	http://localhost:5173
SMS_BACKEND	console (dev) or africastalking	console
AT_USERNAME	AfricasTalking username	sandbox
AT_API_KEY	AfricasTalking API key	(empty)
API Overview
Base URL: /api/

Authentication Endpoints
Method	Endpoint	Description
POST	/api/auth/login/	Log in; returns JWT pair or OTP challenge
POST	/api/auth/verify-otp/	Verify OTP code after login
POST	/api/auth/invite/	Invite a supervisor
POST	/api/auth/activate/	Activate an invited account
POST	/api/token/refresh/	Refresh the access token
POST	/api/register/	Register a new user
Include the access token on protected requests:

Authorization: Bearer <access_token>


Resource Endpoints
All resources are provided by DRF's DefaultRouter and support list, create, retrieve, update, partial_update, and destroy where applicable.

Resource	Endpoint

Users	/api/users/
Projects	/api/projects/
Project Proposals	/api/proposals/
Milestones	/api/milestones/
Submissions	/api/submissions/
Meeting Slots	/api/slots/
Meeting Bookings	/api/bookings/
Grading Criteria	/api/criteria/
Panel Grades	/api/grades/
Supervisors	/api/supervisors/
System Settings	/api/settings/
Notifications	/api/notifications/


Example: Log in

bash
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "user@example.com", "password": "yourpassword"}'

  
Example: List projects

bash
curl http://127.0.0.1:8000/api/projects/ \
  -H "Authorization: Bearer <access_token>"

  
User Roles

Role	Capabilities
Student	Submit proposals, upload submissions, book meetings, view grades
Lecturer / Supervisor	Review proposals, publish meeting slots, grade milestones
Panelist	Grade projects using defined grading criteria
Admin	Manage users, invite supervisors, configure system settings, run auto-allocation
Authentication Flow
User submits credentials to /api/auth/login/.


If the user's role is in OTP_REQUIRED_ROLES (LECTURER, PANELIST):

Backend sends an SMS code to the user's phone (mocked to console in dev).

Response contains { otp_required: true, challenge_id, phone_hint }.

User submits the code to /api/auth/verify-otp/ → backend returns JWT pair.

Otherwise (student, admin):

Backend returns JWT pair directly.


Frontend stores:


Access token in sessionStorage (cleared when tab closes)

Refresh token in localStorage (survives page reloads)

The Axios request interceptor attaches Authorization: Bearer <access> to every request.

On 401 Unauthorized, the response interceptor logs the user out and redirects to /login.

Testing

bash
python manage.py test

With coverage:

bash
pip install coverage
coverage run manage.py test
coverage report -m
coverage html      # generates htmlcov/index.html


Deployment Notes
Before deploying to production:

□ Set DEBUG=False in .env
□ Configure ALLOWED_HOSTS with your real domain
□ Generate a new SECRET_KEY (never reuse dev keys)
□ Use a production MySQL server (not localhost)
□ Run python manage.py collectstatic and serve static files via Nginx / CDN
□ Serve media files via Nginx / S3 (not Django)
□ Run Django behind Gunicorn or Uvicorn
□ Put the app behind HTTPS (Let's Encrypt / similar)
□ Set CORS_ALLOWED_ORIGINS to your production frontend URL only
□ Enable SECURE_HSTS_SECONDS, SECURE_SSL_REDIRECT, and secure cookies
□ Set up DB backups
□ Use SMS_BACKEND=africastalking with a real API key for OTP delivery


Security Notes

🔒 Never commit .env — it contains SECRET_KEY and DB credentials.

🔒 Never commit venv/ or node_modules/ — recreate via pip install / npm install.

🔒 Rotate secrets if they were ever committed. Generate new SECRET_KEY and change MySQL passwords.

🔒 Use HTTPS in production.

🔒 Review CORS_ALLOWED_ORIGINS before deploying — never use CORS_ALLOW_ALL_ORIGINS = True in production.

.gitignore enforces the first two. If you ever accidentally commit a secret, treat it as compromised and rotate it immediately.



Contributing

Fork the repository.

Create a feature branch: git checkout -b feature/my-feature

Commit your changes: git commit -m "Add my feature"

Push to the branch: git push origin feature/my-feature

Open a pull request.

Follow PEP 8 for Python code, and the existing ESLint config for JavaScript. Include tests where practical.



License

This project is licensed under the MIT License — see the LICENSE file for details.


Authors

Triza Museve — Developer — Gitcheche111~`Bridging the gap between ideas and execution`


Acknowledgements

Django & Django REST Framework communities for the web framework and API toolkit

djangorestframework-simplejwt for JWT authentication

django-cors-headers for enabling cross-origin requests from the React frontend

python-decouple for environment-based configuration

React & Vite for the frontend framework and build tooling

Axios for HTTP communication with the API

React Router for client-side routing and route protection

AfricasTalking for SMS-based OTP delivery


Contact

For questions or issues:

Open an issue on GitHub

Email: trizahmuseve69@gmail.com



