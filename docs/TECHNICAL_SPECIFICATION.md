# SiteWatch — Technical Specification

## 1. Project Overview

SiteWatch is a website functionality and error monitoring platform for developers.

It allows developers to install a lightweight JavaScript monitoring SDK on their websites.

The SDK detects website errors and sends the information to the SiteWatch backend.

The developer can then view those errors from the SiteWatch dashboard.

### Main Flow

```text
Developer Website
       ↓
SiteWatch SDK
       ↓
SiteWatch API
       ↓
Supabase / PostgreSQL
       ↓
SiteWatch Dashboard
```

---

# 2. MVP Goal

The first version of SiteWatch will focus on JavaScript error monitoring.

The MVP must be able to:

1. Create a project.
2. Generate a project API key.
3. Install the SiteWatch SDK on a website.
4. Detect JavaScript errors.
5. Detect unhandled Promise rejections.
6. Send errors to the SiteWatch backend.
7. Store errors in Supabase.
8. Display errors in the developer dashboard.
9. View details about an individual error.

The MVP should be simple, reliable, and easy to demonstrate.

---

# 3. Technology Stack

## Frontend

* React
* Tailwind CSS
* React Router

## Backend

* Node.js
* Express.js

## Database

* Supabase
* PostgreSQL

## Monitoring SDK

* JavaScript

## Authentication

* Supabase Auth

## Deployment

* Vercel

## Version Control

* Git
* GitHub

---

# 4. Project Structure

```text
sitewatchs/
│
├── backend/
│
├── docs/
│   └── TECHNICAL_SPECIFICATION.md
│
├── frontend/
│
├── sdk/
│
└── README.md
```

---

# 5. System Architecture

```text
                         ┌─────────────────────┐
                         │   Developer Website │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    SiteWatch SDK    │
                         └──────────┬──────────┘
                                    │ HTTPS
                                    ▼
                         ┌─────────────────────┐
                         │   SiteWatch API     │
                         │   Node + Express    │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ Supabase / Postgres  │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │ SiteWatch Dashboard │
                         │    React + Tailwind │
                         └─────────────────────┘
```

---

# 6. Frontend Responsibilities

The frontend is the developer dashboard.

It will allow developers to:

* View projects
* View detected errors
* View error details
* Search errors
* Filter errors
* View error statistics
* Manage project information

### Initial Dashboard

The dashboard will eventually display:

```text
Errors Today
Critical Errors
Affected Pages
API Failures
Recent Errors
```

---

# 7. Backend Responsibilities

The backend is responsible for communication between the SDK, database, and dashboard.

The backend will:

* Receive errors from the SDK.
* Validate incoming requests.
* Validate project API keys.
* Store errors in Supabase.
* Retrieve errors for authenticated developers.
* Return error details.
* Protect database credentials.
* Handle future authentication and project management.

### Backend Flow

```text
SDK
 ↓
POST /api/errors
 ↓
Validate API key
 ↓
Validate error data
 ↓
Store in Supabase
 ↓
Return response
```

---

# 8. Monitoring SDK

The SiteWatch SDK will run on the developer's website.

The SDK must be lightweight and should have minimal impact on website performance.

## Initial Monitoring

The first version will monitor:

### JavaScript Errors

Using:

```javascript
window.onerror
```

### Unhandled Promise Rejections

Using:

```javascript
window.addEventListener("unhandledrejection", ...)
```

---

# 9. Error Information

When an error is detected, the SDK should collect useful information.

Initial information includes:

```text
Error message
Error type
Page URL
Page path
Stack trace
Browser information
User agent
Timestamp
Project API key
```

Example:

```json
{
  "type": "javascript",
  "message": "Cannot read properties of undefined",
  "url": "https://example.com/shop",
  "page": "/shop",
  "stack": "Error stack trace...",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2026-10-02T10:00:00Z"
}
```

---

# 10. Database Design

The initial database will contain three main tables.

```text
projects
    │
    │ 1
    │
    │ many
    ▼
errors
    │
    │ 1
    │
    │ many
    ▼
error_events
```

## Projects

Stores websites being monitored.

Initial fields:

```text
id
name
website_url
api_key
created_at
```

## Errors

Stores unique/grouped errors.

Initial fields:

```text
id
project_id
type
message
url
page
stack
browser
created_at
```

## Error Events

Stores individual occurrences of an error.

Initial fields:

```text
id
error_id
occurred_at
user_agent
ip_address
```

### Relationship

```text
One Project
    ↓
Many Errors

One Error
    ↓
Many Error Events
```

This allows SiteWatch to distinguish between:

```text
One error type
        ↓
Many occurrences
```

For example:

```text
Cannot read properties of undefined

Occurrences: 347
```

---

# 11. API Design

The initial API will contain the following endpoints.

## Send Error

```http
POST /api/errors
```

Used by the SiteWatch SDK to send detected errors.

---

## Get Projects

```http
GET /api/projects
```

Used by the dashboard to retrieve projects.

---

## Get Errors

```http
GET /api/errors
```

Used by the dashboard to retrieve errors.

---

## Get Error Details

```http
GET /api/errors/:id
```

Used to retrieve information about a specific error.

---

# 12. SDK Authentication

Each monitored website/project will have a SiteWatch project API key.

Example:

```javascript
SiteWatch.init({
  apiKey: "sw_project_key"
});
```

The SDK uses this key when sending errors to the SiteWatch API.

The API key identifies the project that generated the error.

---

# 13. Security

The SiteWatch SDK must NOT connect directly to Supabase.

The correct architecture is:

```text
Website
   ↓
SDK
   ↓
SiteWatch API
   ↓
Supabase
```

The following secrets must remain on the backend:

```text
SUPABASE_SERVICE_ROLE_KEY
Database credentials
Private API keys
AI API keys
Other server secrets
```

These secrets must never be included in:

* Frontend code
* SDK code
* GitHub
* Public repositories

Environment variables will be used for server-side secrets.

---

# 14. Error Reporting Example

A developer installs SiteWatch on their website.

A visitor opens:

```text
/shop
```

The website contains a JavaScript problem.

The browser produces:

```text
Cannot read properties of undefined
```

The SiteWatch SDK detects the error.

The SDK sends the error to:

```text
POST /api/errors
```

The backend validates the request.

The backend stores the information in Supabase.

The developer opens the SiteWatch dashboard.

They see:

```text
JavaScript Error

Cannot read properties of undefined

Page:
/shop

Browser:
Chrome

Occurrences:
1
```

The visitor does not need to interact with SiteWatch.

---

# 15. MVP User Flow

```text
Developer creates SiteWatch project
              ↓
SiteWatch generates project API key
              ↓
Developer installs SDK
              ↓
Website visitor encounters an error
              ↓
SDK detects error
              ↓
SDK sends error to SiteWatch API
              ↓
Backend validates request
              ↓
Error stored in Supabase
              ↓
Developer opens dashboard
              ↓
Developer views error
```

---

# 16. Future API Monitoring

After JavaScript error monitoring works, SiteWatch will support API monitoring.

The SDK will eventually detect failed:

```text
fetch()
XMLHttpRequest
```

Example:

```text
GET /api/users
Status: 500
```

The information can include:

```text
HTTP method
Request URL
Status code
Response time
Timestamp
Page
```

This functionality belongs to a later sprint.

---

# 17. Future Error Analytics

Future versions will provide:

* Error grouping
* Error frequency
* Error trends
* Error severity
* Most affected pages
* Most affected browsers
* Error occurrence charts

Example:

```text
Error
Cannot read properties of undefined

Occurrences
347

Affected Pages
/shop
/checkout
/profile
```

---

# 18. Future Notifications

SiteWatch will eventually notify developers when important errors occur.

Possible notification channels:

* Email
* Webhooks
* Slack
* Discord

Example:

```text
🚨 New Critical Error

Project: My Website

Error:
Cannot read properties of undefined

Page:
/checkout
```

---

# 19. Future AI Assistance

A future SiteWatch AI assistant will analyze errors and provide:

* Error explanation
* Possible cause
* Suggested debugging steps
* Possible solution
* Related errors

Example:

```text
Problem:
Cannot read properties of undefined

Possible Cause:
The application is trying to access a property
before the object has been initialized.

Suggested Action:
Check whether the object exists before accessing
the property.
```

AI assistance is not part of the first MVP.

---

# 20. Future Authentication and Projects

Future versions will support developer accounts.

A developer will be able to:

```text
Create account
      ↓
Login
      ↓
Create projects
      ↓
Generate API keys
      ↓
Monitor multiple websites
```

Example:

```text
Developer Account

Projects:
├── My Portfolio
├── Gospel Tube
└── E-commerce Website
```

---

# 21. Development Sprints

## Sprint 0 — Planning & Architecture

Tasks:

* Define MVP
* Define architecture
* Define database
* Define API
* Define SDK
* Create GitHub repository
* Create project structure
* Create documentation

Status:

```text
In Progress
```

---

## Sprint 1 — Project Foundation

Tasks:

* Create React dashboard
* Create Node/Express backend
* Configure Supabase
* Configure environment variables
* Connect frontend and backend
* Test basic API communication

---

## Sprint 2 — Monitoring SDK

Tasks:

* Create JavaScript SDK
* Detect JavaScript errors
* Detect unhandled Promise rejections
* Send errors to backend
* Test SDK with demo website

---

## Sprint 3 — API Monitoring

Tasks:

* Detect failed API requests
* Capture request information
* Store API failures
* Display API failures

---

## Sprint 4 — Developer Dashboard

Tasks:

* Error list
* Error details
* Search
* Filtering
* Error counts
* Recent errors

---

## Sprint 5 — Analytics

Tasks:

* Error grouping
* Error frequency
* Error trends
* Severity
* Charts

---

## Sprint 6 — Notifications

Tasks:

* Email notifications
* Webhooks
* Slack integration
* Discord integration

---

## Sprint 7 — AI Assistance

Tasks:

* Error explanation
* Possible causes
* Debugging suggestions
* AI-powered troubleshooting

---

## Sprint 8 — Authentication & Projects

Tasks:

* Developer authentication
* Project management
* API key management
* Multiple projects

---

## Sprint 9 — Production

Tasks:

* Deploy backend
* Deploy frontend
* Deploy SDK
* Security review
* Documentation
* Demo website

---

## Sprint 10 — Portfolio Launch

Tasks:

* Clean GitHub repository
* Live demo
* Portfolio integration
* DEV article
* LinkedIn post
* Project presentation

---

# 22. Definition of MVP Complete

The SiteWatch MVP is considered complete when a developer can:

```text
1. Create a project
2. Get an API key
3. Install the SDK
4. Trigger a JavaScript error
5. SDK detects the error
6. Backend receives the error
7. Supabase stores the error
8. Dashboard displays the error
9. Developer can view error details
```

The monitoring process must happen without requiring the website visitor to interact with SiteWatch.

---

# 23. Main Product Principle

SiteWatch exists to help developers know when their websites are failing.

The visitor should simply use the website normally.

SiteWatch works silently in the background.

```text
Visitor
   ↓
Uses Website
   ↓
Something breaks
   ↓
SiteWatch detects it
   ↓
Developer gets the information
```

---

# 24. Project Goal

The long-term goal of SiteWatch is to become a developer-focused website monitoring platform that combines:


Error Monitoring
+
API Monitoring
+
Analytics
+
Notifications
+
AI Assistance


The project will start small with JavaScript error monitoring and gradually expand into a complete website functionality monitoring platform.
