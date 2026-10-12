# Capstone Project 1 — Smart IT Asset & Support Ticket Management System


# 1. Project Overview

Build a production-style **IT Asset Management and Support Ticket Management System** using **Python + FastAPI**.

The system should allow employees to manage their assigned IT assets and raise support tickets. IT support users should be able to manage tickets, assign assets, monitor SLA deadlines, and generate reports. Admin users should have complete control over users, assets, tickets, and reports.

This project is intended to demonstrate practical application of the Python concepts completed during the internship, including:

- Core Python
- Data structures
- Control flow and loops
- Functions
- File I/O
- OS module
- List/dictionary comprehensions
- `lambda`, `map`, `filter`, `sorted`
- Exception handling
- OOP
- Inheritance
- Composition
- Encapsulation
- Polymorphism
- Generators
- Decorators
- Regular expressions
- `datetime`
- REST APIs
- External API integration using `requests`
- Unit testing
- FastAPI
- Database connectivity
- Authentication/session concepts
- Git/GitHub
- Docker

The intern's completed learning includes OOP, inheritance/composition, exception handling, file I/O, generators, decorators, APIs, unit testing, Flask concepts, regex, sessions and database connectivity. The web layer for this capstone must be implemented using **FastAPI instead of Flask**.

---

# 2. Objective

Develop a backend system that can manage:

1. Employees
2. IT assets
3. Asset assignment
4. Support tickets
5. Ticket priorities
6. Ticket status
7. SLA tracking
8. Ticket history
9. Reports
10. User authentication
11. Activity logging

The final application must run locally and inside Docker.

---

# 3. User Roles

Implement at least three roles.

### Admin

Can:

- Create users
- View users
- Manage assets
- Assign/reassign assets
- View all tickets
- Assign tickets to IT support
- Change ticket priority
- View reports
- View activity logs

### IT Support

Can:

- View assigned tickets
- Update ticket status
- Add resolution comments
- View employee assets
- Resolve tickets
- View SLA information

### Employee

Can:

- Login
- View profile
- View assigned assets
- Create support ticket
- View own tickets
- View ticket status
- Add additional ticket information

---

# 4. Asset Management

Create an OOP-based asset system.

Base class:

```python
Asset
```

Child classes:

```text
Laptop
Monitor
Keyboard
Mouse
Printer
```

Demonstrate:

- Inheritance
- Encapsulation
- Polymorphism
- Composition

Example asset:

```text
Asset ID: LAP-1023
Type: Laptop
Brand: Dell
Model: Latitude 5440
Serial Number: ABC12345
Purchase Date: 2025-04-12
Status: Assigned
Assigned To: EMP-102
```

Asset statuses:

```text
AVAILABLE
ASSIGNED
UNDER_REPAIR
RETIRED
LOST
```

---

# 5. Ticket Management

Employees should be able to create tickets.

Required fields:

```text
Ticket ID
Title
Description
Category
Priority
Created Date
Created By
Assigned To
Status
Resolution
Closed Date
```

Categories:

```text
Hardware
Software
Network
Access
Other
```

Priorities:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

Statuses:

```text
OPEN
ASSIGNED
IN_PROGRESS
RESOLVED
CLOSED
```

---

# 6. Automatic Ticket Classification

Implement a rule-based ticket classification module.

For example:

```text
"My laptop is not starting"
```

should identify:

```text
Category = Hardware
Priority = High
```

Use:

- String operations
- `re`
- Dictionaries
- Functions
- `lambda`
- `filter`
- List comprehensions

Do not use an external AI/LLM for this classification. The purpose is to demonstrate Python logic.

---

# 7. SLA Management

Use `datetime`.

Example SLA rules:

```text
CRITICAL → 2 hours
HIGH     → 4 hours
MEDIUM   → 8 hours
LOW      → 24 hours
```

The system should calculate:

- SLA deadline
- Time remaining
- SLA breached/not breached
- Resolution time
- Average resolution time

Example:

```text
Ticket: INC-1024
Priority: HIGH
Created: 10:00
SLA Deadline: 14:00
Current Time: 13:30
Remaining: 30 minutes
Status: SLA ACTIVE
```

---

# 8. File I/O Module

The application must support processing files such as:

```text
employees.txt
assets.txt
tickets.txt
```

Implement:

- Read files
- Write files
- Append data
- Count lines
- Count words
- Count characters
- Parse records
- Remove duplicate records
- Archive processed files

Use the `os` module for:

- Directory creation
- File existence checks
- Directory listing
- Moving/archiving files

---

# 9. Generator-Based Processing

Implement generators for large ticket/report datasets.

Example:

```python
def ticket_generator():
    ...
    yield ticket
```

Do not load a very large dataset completely into memory when generating reports.

The README/demo should explain why `yield` is useful here.

---

# 10. Decorators

Create and use custom decorators.

Minimum examples:

```python
@login_required
@admin_required
@log_activity
@measure_execution_time
```

The decorators should demonstrate how common behavior can be added without duplicating code.

---

# 11. Exception Handling

Create custom exceptions such as:

```python
InvalidAssetError
InvalidTicketError
InvalidStatusTransitionError
SLAConfigurationError
FileProcessingError
DatabaseConnectionError
```

Handle exceptions cleanly using:

```python
try
except
else
finally
```

FastAPI should return appropriate HTTP responses rather than exposing raw Python errors.

---

# 12. FastAPI Requirements

The API must be built using **FastAPI**.

Minimum endpoint groups:

### Authentication

```text
POST /auth/register
POST /auth/login
GET  /auth/me
POST /auth/logout
```

### Users

```text
GET    /users
GET    /users/{user_id}
POST   /users
PUT    /users/{user_id}
DELETE /users/{user_id}
```

### Assets

```text
GET    /assets
GET    /assets/{asset_id}
POST   /assets
PUT    /assets/{asset_id}
DELETE /assets/{asset_id}
POST   /assets/{asset_id}/assign
POST   /assets/{asset_id}/return
```

### Tickets

```text
GET    /tickets
GET    /tickets/{ticket_id}
POST   /tickets
PUT    /tickets/{ticket_id}
POST   /tickets/{ticket_id}/assign
POST   /tickets/{ticket_id}/resolve
POST   /tickets/{ticket_id}/close
```

### Reports

```text
GET /reports/tickets
GET /reports/assets
GET /reports/sla
```

Use FastAPI features such as:

- Pydantic request/response models
- Validation
- Dependency injection
- HTTP status codes
- Exception handlers
- Automatic OpenAPI documentation

---

# 13. Database

Use a relational database.

Recommended:

```text
PostgreSQL
```

Minimum tables:

```text
users
assets
asset_assignments
tickets
ticket_history
activity_logs
```

Use proper relationships.

Do not keep the complete application state only in Python dictionaries.

---

# 14. External API Integration

Use Python `requests` to consume at least one external API.

Possible examples:

- Holiday API
- IP information API
- Weather API
- Email validation API

The integration must demonstrate:

```text
Successful response
Invalid response
Timeout
Connection error
HTTP error
```

---

# 15. Unit Testing

Use Python `unittest` or `pytest`.

Minimum target:

```text
20+ tests
```

Test:

- User validation
- Ticket creation
- Ticket classification
- Asset assignment
- Asset return
- SLA calculation
- Invalid ticket
- Invalid asset
- File processing
- Custom exceptions
- API responses
- Authentication/authorization

---

# 16. Docker Requirement

Docker is mandatory.

Create:

```text
Dockerfile
docker-compose.yml
.dockerignore
```

Recommended architecture:

```text
             ┌──────────────┐
             │   Client     │
             └──────┬───────┘
                    │
                    ▼
             ┌──────────────┐
             │   FastAPI    │
             │  Container   │
             └──────┬───────┘
                    │
                    ▼
             ┌──────────────┐
             │ PostgreSQL   │
             │  Container   │
             └──────────────┘
```

The application should start using:

```bash
docker compose up --build
```

Do not require manual Python installation after Docker is configured.

---

# 17. Environment Variables

Do not hardcode credentials.

Use `.env`.

Example:

```env
APP_ENV=development

DB_HOST=db
DB_PORT=5432
DB_NAME=it_asset_db
DB_USER=postgres
DB_PASSWORD=postgres

SECRET_KEY=change_me
```

Commit only:

```text
.env.example
```

Never commit real secrets.

---

# 18. Suggested Project Structure

```text
it_asset_manager/
│
├── app/
│   ├── main.py
│   ├── config.py
│   │
│   ├── api/
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── assets.py
│   │   ├── tickets.py
│   │   └── reports.py
│   │
│   ├── models/
│   │   ├── user.py
│   │   ├── asset.py
│   │   └── ticket.py
│   │
│   ├── schemas/
│   │   ├── user.py
│   │   ├── asset.py
│   │   └── ticket.py
│   │
│   ├── services/
│   │   ├── ticket_service.py
│   │   ├── asset_service.py
│   │   ├── sla_service.py
│   │   └── report_service.py
│   │
│   ├── utils/
│   │   ├── decorators.py
│   │   ├── validators.py
│   │   ├── generators.py
│   │   └── exceptions.py
│   │
│   └── database/
│       ├── connection.py
│       └── repositories.py
│
├── tests/
├── data/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
├── requirements.txt
└── README.md
```

---

# 19. Git Requirements

Create a GitHub repository.

Use meaningful commits.

Example:

```text
feat: add asset management
feat: add ticket management
feat: add SLA calculation
feat: add authentication
feat: add external API integration
test: add ticket service tests
docker: add docker compose setup
docs: update README
```

Do not make one commit containing the entire project.

---

# 20. Final Deliverables

The intern must submit:

- GitHub repository
- Working FastAPI application
- PostgreSQL database integration
- Dockerfile
- docker-compose.yml
- `.env.example`
- Unit tests
- API documentation
- README
- Architecture diagram
- Database ER diagram
- Sample input data
- Sample API requests/responses
- Technical presentation
- 5–10 minute demo

---

# 21. Minimum Quality Requirements

The project should:

- Follow PEP 8
- Use meaningful variable/function/class names
- Avoid unnecessary duplicate code
- Use functions instead of putting all logic in routes
- Separate API, business logic and database logic
- Handle exceptions properly
- Validate API inputs
- Use logging
- Never hardcode passwords/secrets
- Include type hints wherever practical
- Include docstrings for important classes/functions
- Have clean Git history

---

# 22. Evaluation

| Category | Marks |
|---|---:|
| Core Python implementation | 15 |
| OOP & architecture | 15 |
| FastAPI/backend | 15 |
| File handling & processing | 10 |
| Exception handling & validation | 10 |
| Advanced Python | 10 |
| API / networking | 10 |
| Database | 5 |
| Unit testing | 5 |
| Docker | 5 |
| Code quality / Git / README | 5 |
| **Total** | **100** |

---

# 23. Important Rule

Do not try to complete the project by copying an existing GitHub project.

You should be able to explain:

- Why each class exists
- Why inheritance/composition was used
- Why generators are useful
- How decorators work
- How FastAPI handles requests
- How validation works
- How the database is connected
- How exceptions are handled
- How Docker runs the application
- How the API communicates with the database


---

# 29. Mandatory Software Engineering Practices

This capstone is not only a Python/FastAPI coding exercise. The application must demonstrate production-oriented software engineering practices.

## 29.1 Design Patterns

Use appropriate design patterns in the implementation.

### MVC / Layered Architecture

Organize the application so that responsibilities are separated:

```text
Frontend
   ↓
API / Controller Layer
   ↓
Service / Business Logic Layer
   ↓
Repository / Data Access Layer
   ↓
Database
```

The intern must be able to explain how this architecture is related to MVC and why separation of concerns is important.

Do not put database queries, business logic and API handling into one FastAPI route.

### Singleton Pattern

Implement at least one appropriate Singleton use case.

Possible examples:

```text
Database configuration/connection manager
Application configuration manager
Logger manager
```

The Singleton should be used only where a single shared instance genuinely makes sense. Do not use Singleton unnecessarily.

---

# 30. SOLID Principles

The project must demonstrate all five SOLID principles.

### S — Single Responsibility Principle

Each class/module should have one clear responsibility.

### O — Open/Closed Principle

Components should be extendable without unnecessary modification.

### L — Liskov Substitution Principle

Child classes should be usable wherever their parent abstraction is expected.

### I — Interface Segregation Principle

Avoid forcing classes to depend on methods they do not use.

### D — Dependency Inversion Principle

Business logic should depend on abstractions/interfaces rather than tightly coupled implementations.

The intern must provide a short section in the README explaining where each SOLID principle is demonstrated in the project.

---

# 31. Database Design & ACID Properties

Use PostgreSQL as the primary relational database.

The intern must understand and demonstrate:

## Atomicity

A transaction should either complete fully or roll back completely.

Example:

```text
Create Ticket
+
Create Ticket History
+
Create Activity Log
```

If one required operation fails, the transaction should roll back where appropriate.

## Consistency

Database constraints should prevent invalid states.

Examples:

```text
Foreign Keys
NOT NULL
UNIQUE
CHECK
```

## Isolation

Concurrent transactions should not incorrectly interfere with each other.

The intern should understand the selected PostgreSQL transaction/isolation behavior.

## Durability

Committed data must persist after application/container restart.

---

# 32. Database Design Rules

The database should follow proper relational design.

Mandatory expectations:

- Appropriate primary keys
- Foreign keys
- Unique constraints
- NOT NULL constraints where required
- CHECK constraints where useful
- Proper relationships
- Appropriate indexes
- Avoid unnecessary duplicate data
- Avoid storing derived values when they can be safely calculated
- Use transactions for multi-step operations
- Use migrations/versioned schema changes
- Use parameterized queries/ORM mechanisms
- Never hardcode database credentials

The intern must provide an ER diagram.

---

# 33. Database Profiles — Development / QA / Production

The application must support separate database/application profiles.

Required profiles:

```text
DEV
QA
PROD
```

Example:

```text
.env.dev
.env.qa
.env.prod
```

Do not commit real secrets.

Commit only examples/templates such as:

```text
.env.example
```

Example variables:

```env
APP_ENV=dev

DB_HOST=localhost
DB_PORT=5432
DB_NAME=capstone_dev
DB_USER=postgres
DB_PASSWORD=change_me

SECRET_KEY=change_me
LOG_LEVEL=DEBUG
```

For Docker Compose, service-specific configuration should be handled through environment variables.

The intern must explain how the same application code can run against different environments without changing source code.

---

# 34. Environment Variables

All configurable values must come from environment variables or configuration files.

Examples:

```text
Database credentials
Secret keys
API keys
Application environment
Database host/port
Logging level
Allowed frontend origins
```

Never commit:

```text
.env
real passwords
real API keys
production secrets
```

---

# 35. .gitignore

Create a proper:

```text
.gitignore
```

It must exclude at minimum:

```text
.env
.venv/
venv/
__pycache__/
*.pyc
.pytest_cache/
.mypy_cache/
.coverage
htmlcov/
.idea/
.vscode/
node_modules/
dist/
build/
*.log
```

Add project-specific temporary/generated files where appropriate.

---

# 36. .dockerignore

Create a proper:

```text
.dockerignore
```

It should exclude unnecessary files from the Docker build context, including:

```text
.git/
.github/
.venv/
venv/
__pycache__/
*.pyc
.pytest_cache/
.env
node_modules/
dist/
build/
*.log
```

Do not copy development secrets into Docker images.

---

# 37. Application Logging

Implement a proper Python logging mechanism.

Do not rely only on `print()`.

Logging should support at least:

```text
DEBUG
INFO
WARNING
ERROR
CRITICAL
```

Log important events such as:

```text
Application startup
Application shutdown
Authentication attempts
Authorization failures
Database errors
External API failures
Important business operations
Unexpected exceptions
```

Example:

```text
2026-10-05 14:30:20 | INFO | User EMP-101 created ticket INC-1024
2026-10-05 14:31:05 | WARNING | SLA approaching for INC-1024
2026-10-05 14:32:10 | ERROR | External API request failed
```

Do not log passwords, API keys, tokens or other sensitive secrets.

---

# 38. WebSocket

WebSocket implementation is mandatory.

The frontend should receive real-time application updates without repeatedly polling the REST API.

Use FastAPI WebSocket support.

The WebSocket use case should be meaningful to the project.

The intern must demonstrate:

```text
Client connects
      ↓
WebSocket connection
      ↓
Backend event occurs
      ↓
Real-time message
      ↓
Frontend updates
```

The intern must also handle:

- Connection/disconnection
- Multiple clients
- Invalid messages
- Connection errors
- Cleanup

---

# 39. Security — Authentication & RBAC

Implement proper authentication and authorization.

Minimum:

```text
Authentication
Authorization
Role-Based Access Control
```

Recommended roles:

```text
ADMIN
SUPPORT
EMPLOYEE
```

or project-specific equivalents.

Requirements:

- Passwords must never be stored in plain text
- Use password hashing
- Validate credentials
- Protect private APIs
- Protect WebSocket connections where appropriate
- Enforce role permissions at the backend
- Do not trust frontend role information
- Return appropriate HTTP status codes
- Do not expose sensitive information in errors
- Store secrets in environment variables

The frontend must not be treated as the security boundary. Authorization must be enforced by FastAPI.

---

# 40. Frontend

A frontend is mandatory.

### Recommended technology

```text
React
```

The intern may use another modern frontend framework only with prior approval.

Recommended stack:

```text
React
JavaScript / TypeScript
HTML
CSS
```

The frontend should consume the FastAPI REST APIs.

It must include meaningful screens for the project.

The frontend should demonstrate:

- Login
- Role-based navigation
- Dashboard
- Data listing
- Search/filter
- Forms
- Validation
- Error handling
- Loading states
- Real-time WebSocket updates
- Logout

Do not build a frontend that contains only static mock data.

---

# 41. Frontend + Backend Architecture

Recommended architecture:

```text
┌─────────────────────────────┐
│       React Frontend        │
│                             │
│ Dashboard / Forms / Tables  │
└──────────────┬──────────────┘
               │
        REST / WebSocket
               │
               ▼
┌─────────────────────────────┐
│        FastAPI Backend      │
│                             │
│ API → Service → Repository  │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│         PostgreSQL          │
└─────────────────────────────┘
```

---

# 42. Code Quality — Pylint

Configure and run **Pylint**.

At minimum:

```bash
pylint app/
```

The project should not contain a large number of unexplained warnings.

The intern should fix meaningful issues rather than simply disabling all Pylint rules.

Include the configuration in the repository where required.

---

# 43. Static Code Analysis — SonarLint

Use **SonarLint** during development.

The intern should use it to identify:

- Bugs
- Code smells
- Security issues
- Duplicated/poor-quality code
- Maintainability problems

Document important issues found and fixed during development.

If SonarLint is used through VS Code/PyCharm/another IDE, the README should mention the setup.

---

# 44. README Documentation Requirements

The final README must be complete enough that another developer can clone the repository and understand/run the project.

The README must contain:

## Project Overview

Explain:

- What the application does
- Why it was built
- Main use cases

## Features

List major features.

## Architecture

Include the architecture diagram and explain:

```text
Frontend
FastAPI
Services
Repositories
Database
WebSocket
External APIs
```

## Technology Stack

Example:

```text
Python
FastAPI
Pydantic
PostgreSQL
SQLAlchemy
Alembic
React
Docker
Docker Compose
Pytest
Pylint
SonarLint
Git
```

Only list libraries actually used by the project.

## Prerequisites

Explain required software:

```text
Git
Docker
Docker Compose
Python (if running locally)
Node.js/npm (if running frontend locally)
```

## Project Structure

Explain important directories/files.

## Environment Setup

Explain:

```text
.env.example
.env.dev
.env.qa
.env.prod
```

and which variables are required.

## Local Development Setup

Example:

```bash
git clone <repository>
cd <project>

python -m venv .venv
# activate environment

pip install -r requirements.txt
```

Then explain database setup and migrations.

## Frontend Setup

Example:

```bash
cd frontend
npm install
npm run dev
```

Use the actual commands for the chosen frontend setup.

## Docker Setup

The README must clearly explain:

```bash
docker compose up --build
```

and how to stop the application:

```bash
docker compose down
```

Also document:

- API URL
- Frontend URL
- Swagger URL
- Database connection details for development
- WebSocket endpoint

## Database Migration

Document the actual migration commands used by the project.

## Testing

Example:

```bash
pytest
```

Document the actual test command.

## Linting

Example:

```bash
pylint app/
```

## SonarLint

Explain how to open/use the project with SonarLint and what was checked.

## API Documentation

Document:

```text
Swagger/OpenAPI
Authentication
Important endpoints
Request examples
Response examples
Error responses
```

## WebSocket Documentation

Document:

```text
WebSocket endpoint
Connection flow
Message format
Example events
```

## Security

Document:

- Authentication
- RBAC
- Password hashing
- Environment variables
- Secret management
- Input validation

## Database Design

Include:

- ER diagram
- Tables
- Relationships
- Important constraints

## Troubleshooting

Include common problems such as:

```text
Database not starting
Port already in use
Docker build failure
Migration failure
Frontend cannot reach backend
WebSocket connection failure
Environment variable missing
```

## Demo Credentials

If demo credentials are provided, clearly mark them as development/demo credentials only.

Never provide real production credentials.

## Future Improvements

List reasonable future enhancements.

---

# 45. Dockerized Final Architecture

The final Docker setup should preferably contain separate services where appropriate:

```text
docker-compose
│
├── backend
│   └── FastAPI
│
├── frontend
│   └── React
│
└── db
    └── PostgreSQL
```

The exact structure can vary if there is a valid architectural reason.

The complete project should be reproducible from a clean machine using the documented setup.

---

# 46. Final Engineering Checklist

Before submission, verify:

- [ ] FastAPI implemented
- [ ] React frontend implemented
- [ ] PostgreSQL integrated
- [ ] Database migrations implemented
- [ ] ACID/transaction handling demonstrated
- [ ] Proper database constraints/indexes
- [ ] MVC/layered architecture
- [ ] Singleton pattern used appropriately
- [ ] SOLID principles demonstrated
- [ ] OOP implemented
- [ ] Custom exceptions implemented
- [ ] Generators implemented
- [ ] Decorators implemented
- [ ] Regex implemented where applicable
- [ ] External API implemented
- [ ] REST APIs implemented
- [ ] WebSocket implemented
- [ ] Authentication implemented
- [ ] RBAC implemented
- [ ] Logging implemented
- [ ] `.env.example` included
- [ ] `.gitignore` included
- [ ] `.dockerignore` included
- [ ] DEV/QA/PROD profiles supported
- [ ] Dockerfile included
- [ ] docker-compose.yml included
- [ ] Unit tests included
- [ ] Pylint configured/run
- [ ] SonarLint used
- [ ] Complete README included
- [ ] GitHub repository maintained
- [ ] Architecture diagram included
- [ ] ER diagram included
- [ ] Demo completed
