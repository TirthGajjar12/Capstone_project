## Prerequisites — Learn Before Starting the Capstone

**Important:** This capstone should be started **only after completing and understanding the prerequisite topics below**. The purpose of the capstone is to apply these concepts together in one real-world project, not to learn them for the first time while building the project.

The intern should be comfortable implementing small practical programs independently before starting the capstone.

## 1. Core Python

You must understand:

- Variables and data types
- Strings and string methods
- Lists, tuples, sets and dictionaries
- Operators
- `if / elif / else`
- `for` and `while` loops
- Nested loops
- Functions
- Function arguments and return values
- `*args` and `**kwargs`
- List/dictionary/set comprehensions
- `lambda`
- `map()`
- `filter()`
- `sorted()`
- Basic problem solving and algorithmic logic

## 2. File & OS Handling

You must understand:

- Reading files
- Writing files
- Appending files
- Parsing text files
- JSON/CSV basics
- `with open(...)`
- File and directory operations
- `os` module
- Creating/checking/moving files and folders

## 3. Exception Handling

You must understand:

- `try`
- `except`
- `else`
- `finally`
- Multiple exception handling
- Raising exceptions
- Creating custom exceptions
- Handling errors without crashing the complete application

## 4. Object-Oriented Programming

You must understand the four major OOP principles:

```text
Encapsulation
Inheritance
Polymorphism
Abstraction
```

You should also understand:

- Classes and objects
- `__init__`
- `self`
- Class methods
- Static methods
- Inheritance
- Composition
- Method overriding
- Private/protected attributes
- `super()`

## 5. Advanced Python

Before starting, you should understand:

- Generators
- `yield`
- Iterators
- Decorators
- `*args` / `**kwargs`
- Functional programming concepts
- Memory-efficient processing

You should be able to explain **when and why a generator is preferable to returning a complete list**.

## 6. Regular Expressions

You must understand Python's:

```python
re
```

module and be able to perform:

- Pattern matching
- Searching
- Validation
- Extraction
- Splitting
- Basic log/text parsing

## 7. Date & Time

You must understand:

```python
datetime
timedelta
```

and be able to:

- Parse dates
- Compare dates
- Calculate time differences
- Work with timestamps
- Calculate deadlines/SLA periods

## 8. Python APIs & HTTP

You must understand:

- HTTP basics
- GET
- POST
- PUT
- DELETE
- HTTP status codes
- JSON
- API request/response structure
- Python `requests`
- Timeout and connection error handling

## 9. Networking Basics

You should understand basic:

- Client/server architecture
- IP address
- Port
- TCP basics
- Socket programming
- Sending/receiving data

## 10. FastAPI

Before starting the capstone, you should already understand:

- FastAPI application creation
- Routes
- GET/POST/PUT/DELETE
- Path parameters
- Query parameters
- Request bodies
- Pydantic models
- Response models
- Validation
- HTTP status codes
- Dependency injection
- Exception handling
- Swagger/OpenAPI
- REST API design

## 11. Authentication & Security

You must understand the basics of:

- Authentication vs Authorization
- Password hashing
- Tokens/JWT or the selected authentication mechanism
- Role-Based Access Control (RBAC)
- Protected APIs
- Permission checking
- Secure handling of credentials
- Why passwords/API keys must never be hardcoded

## 12. Database & SQL

Before starting, you should understand:

- Relational databases
- Tables
- Rows and columns
- Primary keys
- Foreign keys
- Relationships
- One-to-one / one-to-many / many-to-many
- CRUD operations
- SELECT
- INSERT
- UPDATE
- DELETE
- JOIN
- WHERE
- ORDER BY
- GROUP BY
- Indexes
- Constraints
- Transactions

You should have basic knowledge of PostgreSQL.

## 13. Database Design

You should understand:

- Normalization basics
- Database relationships
- ER diagrams
- Constraints
- Indexing
- Data integrity
- Transaction management
- Migration concepts

## 14. ACID Properties

Before starting, you must understand:

```text
A — Atomicity
C — Consistency
I — Isolation
D — Durability
```

You should be able to explain how transactions protect data integrity.

## 15. SQLAlchemy / Database ORM

If SQLAlchemy is used in the project, you should understand:

- Models
- Sessions
- Queries
- Relationships
- Transactions
- Commit
- Rollback
- Connection management

## 16. Database Migrations

You should understand why schema changes should be managed through migrations.

If Alembic is used:

- Creating migrations
- Applying migrations
- Rolling back migrations
- Checking migration history

## 17. Software Design Patterns

Before starting, you must understand the purpose of design patterns.

At minimum:

### MVC / Layered Architecture

Understand separation between:

```text
Controller/API
Service/Business Logic
Repository/Data Access
Model/Database
```

### Singleton

Understand:

- What Singleton means
- When it is useful
- Why it should not be overused

## 18. SOLID Principles

You must understand all five:

```text
S — Single Responsibility Principle
O — Open/Closed Principle
L — Liskov Substitution Principle
I — Interface Segregation Principle
D — Dependency Inversion Principle
```

You should be able to identify violations of these principles in simple Python code.

## 19. Logging

Understand Python's:

```python
logging
```

module.

You should know:

- Log levels
- Log formatting
- File logging
- Console logging
- Exception logging
- Why `print()` should not be used as the application's primary logging mechanism

## 20. WebSocket

Before starting, understand:

- HTTP vs WebSocket
- Persistent connections
- Client/server communication
- Connection lifecycle
- Connect/disconnect
- Sending/receiving messages
- Real-time updates

## 21. Git & GitHub

You must know:

- `git init`
- `git clone`
- `git add`
- `git commit`
- `git push`
- `git pull`
- Branches
- Merging
- `.gitignore`
- Meaningful commit messages

You should be comfortable maintaining your project in GitHub.

## 22. Environment Management

Understand:

- Python virtual environments
- `venv`
- `pip`
- `requirements.txt`
- Environment variables
- `.env`
- `.env.example`

You must understand why secrets and environment-specific configuration should not be hardcoded.

## 23. DEV / QA / PROD Configuration

Before starting, understand the concept of separate environments:

```text
Development
QA / Testing
Production
```

You should understand how the same application can use different:

- Databases
- API URLs
- Secrets
- Logging levels
- Configuration values

without changing the application source code.

## 24. Docker

You must have basic Docker knowledge before starting.

Understand:

- Docker image
- Docker container
- Dockerfile
- Docker build
- Docker run
- Docker volumes
- Docker networks
- Environment variables
- Docker Compose

You should be able to build and run a simple Python application using Docker before starting the capstone.

## 25. Docker Compose

You should understand how multiple services can work together:

```text
FastAPI
PostgreSQL
React
```

and how they communicate using Docker Compose networking.

## 26. `.gitignore` and `.dockerignore`

Understand the difference between:

```text
.gitignore
```

and:

```text
.dockerignore
```

You should know why files such as:

```text
.env
.venv/
node_modules/
__pycache__/
*.log
```

should generally not be committed or copied into Docker build contexts.

## 27. Frontend Basics

The recommended frontend technology for this capstone is:

```text
React
```

Before starting, you should understand basic:

- HTML
- CSS
- JavaScript
- React components
- Props
- State
- Events
- Forms
- API calls
- JSON
- Routing
- Basic error/loading handling

You do not need to be an advanced React developer, but you must be able to create a basic frontend and connect it to a REST API.

## 28. REST API Integration

You should know how a frontend communicates with FastAPI:

```text
React
   ↓
HTTP Request
   ↓
FastAPI
   ↓
Database
   ↓
JSON Response
   ↓
React
```

You should understand:

- Request headers
- Authentication headers
- JSON request bodies
- JSON responses
- HTTP status codes
- Error responses

## 29. Testing

You should understand:

- Unit testing
- Test cases
- Assertions
- Positive tests
- Negative tests
- Exception tests
- API tests

Recommended:

```text
pytest
```

## 30. Pylint

Before starting, understand the purpose of static code quality checking.

You should be able to:

```bash
pylint app/
```

and understand common issues such as:

- Unused imports
- Bad naming
- Too many arguments
- Duplicate logic
- Missing documentation
- Poor code structure

## 31. SonarLint

Understand the purpose of SonarLint and basic concepts of:

- Bugs
- Code smells
- Vulnerabilities
- Maintainability
- Code quality

You should be able to inspect your project using SonarLint and fix meaningful findings.

---

# Prerequisite Completion Checklist

**Do not start the capstone until you can check these items:**

- [ ] Core Python completed
- [ ] Functions completed
- [ ] Data structures completed
- [ ] File I/O completed
- [ ] OS module completed
- [ ] Exception handling completed
- [ ] OOP completed
- [ ] Inheritance completed
- [ ] Composition completed
- [ ] Polymorphism completed
- [ ] Generators completed
- [ ] Decorators completed
- [ ] Lambda/map/filter completed
- [ ] Regex completed
- [ ] Datetime completed
- [ ] Requests/API integration completed
- [ ] Networking/socket basics completed
- [ ] SQL completed
- [ ] PostgreSQL basics completed
- [ ] Database design completed
- [ ] ACID properties understood
- [ ] SQLAlchemy/ORM basics completed
- [ ] Database migrations understood
- [ ] MVC/layered architecture understood
- [ ] Singleton understood
- [ ] SOLID principles understood
- [ ] Logging understood
- [ ] FastAPI completed
- [ ] Authentication understood
- [ ] RBAC understood
- [ ] WebSocket basics understood
- [ ] Git/GitHub completed
- [ ] `.env` understood
- [ ] DEV/QA/PROD configuration understood
- [ ] Docker basics completed
- [ ] Docker Compose completed
- [ ] `.gitignore` understood
- [ ] `.dockerignore` understood
- [ ] React/frontend basics completed
- [ ] REST API integration understood
- [ ] Unit testing completed
- [ ] Pylint understood
- [ ] SonarLint understood

### Final prerequisite rule

**The capstone is an application project, not a learning course for the above technologies.**

If you do not understand a prerequisite topic, first complete a small practice exercise for that topic and then continue with the capstone.

Once all prerequisites are understood, start the project by reading the **Project Setup** section below.
