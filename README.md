# CPMS Backend

A Django REST Framework backend for a Capstone Project Management System (CPMS).
It powers user management, project allocation, milestone tracking, submissions, meeting scheduling, panel grading, notifications, and system settings — all exposed via a JWT-secured REST API.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the Server](#running-the-server)
- [API Overview](#api-overview)
  - [Authentication](#authentication)
  - [Endpoints](#endpoints)
- [User Roles](#user-roles)
- [Testing](#testing)
- [Deployment Notes](#deployment-notes)
- [Contributing](#contributing)
- [License](#license)
- [Authors](#authors)

---

## Features

- 🔐 **JWT Authentication** — login, token refresh, OTP verification, and account activation
- 👥 **Role-based access** — students, supervisors, panel members, and admins
- 📁 **Project management** — proposals, allocations, and supervisor assignment
- 🎯 **Milestones & submissions** — track progress and upload deliverables
- 📅 **Meeting scheduling** — supervisors publish slots; students book them
- 📝 **Grading** — grading criteria and panel grades
- 🔔 **Notifications** — in-app notifications for key events
- ⚙️ **System settings** — configurable global settings
- 📤 **File uploads** — media served locally in development

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Python 3.12 |
| Framework | Django <version> |
| API | Django REST Framework |
| Auth | djangorestframework-simplejwt |
| Database | PostgreSQL / SQLite (dev) |
| Media | Django static/media (dev) |

---

## Project Structure

FINAL_YEAR_PROJECT/
├── manage.py
├── cpms_backend/ # Project settings & root URLs
│ ├── settings.py
│ ├── urls.py
│ └── wsgi.py / asgi.py
├── core/ # Main app (models, views, serializers)
│ ├── models.py
│ ├── views.py
│ ├── serializers.py
│ ├── urls.py
│ └── migrations/
├── media/ # Uploaded files (dev)
├── venv/ # Virtual environment (not committed)
├── requirements.txt
└── README.md


---

## Getting Started

### Prerequisites

- Python 3.10+ (tested on 3.12)
- pip & venv
- PostgreSQL (or SQLite for local dev)
- Git

### Installation

```bash
  # 1. Clone the repository
  git clone <your-repo-url>
  cd FINAL_YEAR_PROJECT
  
  # 2. Create and activate a virtual environment
  python3 -m venv venv
  source venv/bin/activate        # Linux/macOS
  # venv\Scripts\activate         # Windows
  
  # 3. Install dependencies
  pip install -r requirements.txt
```


Database Setup
bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser

Running the Server
bash
python manage.py runserver

API Overview
Base URL: /api/

Authentication
Method	Endpoint	Description
POST	/api/auth/login/	Log in and receive JWT tokens
POST	/api/auth/verify-otp/	Verify OTP after login
POST	/api/auth/invite/	Invite a supervisor
POST	/api/auth/activate/	Activate an invited account
POST	/api/token/refresh/	Refresh an access token
POST	/api/register/	Register a new user

Include the access token in subsequent requests:
Authorization: Bearer <access_token>

Endpoints
All endpoints below are provided by DRF's DefaultRouter and support standard list, create, retrieve, update, partial_update, and destroy actions where applicable.

Resource	Endpoint	Description
Users	/api/users/	Manage users
Projects	/api/projects/	Allocated projects
Proposals	/api/proposals/	Project proposals
Milestones	/api/milestones/	Project milestones
Submissions	/api/submissions/	Student submissions
Slots	/api/slots/	Meeting slots published by supervisors
Bookings	/api/bookings/	Student meeting bookings
Criteria	/api/criteria/	Grading criteria
Grades	/api/grades/	Panel grades
Supervisors	/api/supervisors/	Supervisor profiles
Settings	/api/settings/	System settings
Notifications	/api/notifications/	User notifications

Example: Log in
bash
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "yourpassword"}'
  
Example: List projects
bash
curl http://127.0.0.1:8000/api/projects/ \
  -H "Authorization: Bearer <access_token>"

User Roles
Role	Capabilities
Student	Submit proposals, upload submissions, book meetings, view grades
Supervisor	Review proposals, publish meeting slots, grade milestones
Panel	Grade projects using defined criteria
Admin	Manage users, system settings, and overall configuration

Testing
bash
python manage.py test
For coverage:

bash
pip install coverage
coverage run manage.py test
coverage report


Deployment Notes
Set DEBUG=False and configure ALLOWED_HOSTS in production.

Use a production-grade database (PostgreSQL recommended) and a WSGI/ASGI server (Gunicorn/Uvicorn).

Serve static and media files via Nginx or a CDN — Django's static() helper only works in development.

Store secrets in environment variables or a secrets manager.

Enable HTTPS and configure CSRF_TRUSTED_ORIGINS accordingly.

Run python manage.py collectstatic before deploying.


Contributing
Fork the repository.

Create a feature branch: git checkout -b feature/my-feature

Commit your changes: git commit -m "Add my feature"

Push to the branch: git push origin feature/my-feature

Open a pull request.

Please follow PEP 8 and include tests for new features.

License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

Authors
Triza Museve https://github.com/Gittechie-111


Acknowledgements
Django & Django REST Framework communities
