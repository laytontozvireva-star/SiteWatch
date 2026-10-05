\# SiteWatch



> A developer-focused website functionality and error monitoring platform.



\## 📌 Overview



SiteWatch is a web monitoring platform designed to help developers detect, understand, and track problems occurring on their websites.



Instead of waiting for users to report that something is broken, SiteWatch automatically detects errors and sends useful information to the developer.



The platform will monitor:



\* JavaScript errors

\* Unhandled promise errors

\* Failed API requests

\* Repeated errors

\* Affected pages

\* Error frequency



Developers will be able to view these problems from a central dashboard.



\---



\## 🎯 Problem



When a website breaks, developers may not know that the problem happened.



For example, a user may click a button and nothing happens because of a JavaScript error.



The developer might only discover the problem after a user reports it.



SiteWatch aims to solve this by automatically detecting website errors and reporting them to the developer.



\---



\## 💡 Solution



SiteWatch uses a lightweight JavaScript monitoring SDK that developers can add to their websites.



The SDK detects errors and sends them to the SiteWatch backend.



The backend stores the error information in a database.



The developer can then view the errors through the SiteWatch dashboard.



\### Basic flow



```text

Developer Website

&#x20;      ↓

SiteWatch SDK

&#x20;      ↓

Detect Error

&#x20;      ↓

SiteWatch API

&#x20;      ↓

Supabase Database

&#x20;      ↓

Developer Dashboard

```



\---



\## 🚀 MVP



The first version of SiteWatch will focus on the core monitoring workflow.



\### MVP Features



\* Detect JavaScript errors

\* Detect unhandled promise errors

\* Send errors to the SiteWatch API

\* Store errors in Supabase

\* Display errors in a developer dashboard

\* Show error details

\* Show error occurrence counts

\* Show affected pages

\* Show when an error was first and last detected



\---



\## 🧩 Project Structure



```text

sitewatch/

│

├── frontend/

│   └── Developer dashboard

│

├── backend/

│   └── SiteWatch API

│

├── sdk/

│   └── JavaScript monitoring SDK

│

├── docs/

│   └── Project documentation

│

└── README.md

```



\---



\## 🛠️ Technology Stack



\### Frontend



\* React

\* Tailwind CSS



\### Backend



\* Node.js

\* Express.js



\### Database



\* Supabase

\* PostgreSQL



\### Monitoring SDK



\* JavaScript



\### Authentication



\* Supabase Auth



\### Deployment



\* Vercel



\### Version Control



\* Git

\* GitHub



\---



\## 🏗️ Architecture



```text

&#x20;                ┌─────────────────────┐

&#x20;                │   Developer Website │

&#x20;                └──────────┬──────────┘

&#x20;                           │

&#x20;                           ▼

&#x20;                ┌─────────────────────┐

&#x20;                │    SiteWatch SDK    │

&#x20;                │                     │

&#x20;                │ JavaScript Errors   │

&#x20;                │ Promise Errors      │

&#x20;                │ API Failures        │

&#x20;                └──────────┬──────────┘

&#x20;                           │

&#x20;                           │ HTTPS

&#x20;                           ▼

&#x20;                ┌─────────────────────┐

&#x20;                │    SiteWatch API    │

&#x20;                │    Node + Express   │

&#x20;                └──────────┬──────────┘

&#x20;                           │

&#x20;                           ▼

&#x20;                ┌─────────────────────┐

&#x20;                │ Supabase / Postgres │

&#x20;                └──────────┬──────────┘

&#x20;                           │

&#x20;                           ▼

&#x20;                ┌─────────────────────┐

&#x20;                │ SiteWatch Dashboard │

&#x20;                │        React        │

&#x20;                └─────────────────────┘

```



\---



\## 🗄️ Database Design



The initial database will contain three main tables.



\### Projects



Stores websites being monitored.



```text

projects

\---------

id

name

website\_url

api\_key

created\_at

```



\### Errors



Stores grouped errors.



```text

errors

\------

id

project\_id

type

message

url

page

stack

browser

created\_at

```



\### Error Events



Stores individual occurrences of an error.



```text

error\_events

\------------

id

error\_id

occurred\_at

user\_agent

ip\_address

```



This structure will allow SiteWatch to show information such as:



```text

Error:

Cannot read properties of undefined



Occurrences:

347



First detected:

October 5, 2026



Last detected:

October 5, 2026

```



\---



\## 🔌 API Plan



The initial API will include:



\### Create Error



```text

POST /api/errors

```



Used by the monitoring SDK to send detected errors.



\### Get Projects



```text

GET /api/projects

```



Returns projects belonging to the authenticated developer.



\### Get Errors



```text

GET /api/errors

```



Returns monitored errors.



\### Get Error Details



```text

GET /api/errors/:id

```



Returns detailed information about a specific error.



Additional endpoints will be added as the platform grows.



\---



\## 📦 Monitoring SDK



Developers will eventually be able to add SiteWatch to their website using a simple installation.



Example:



```html

<script src="https://sitewatch.com/sdk.js"></script>

```



Or through npm:



```bash

npm install @sitewatch/sdk

```



Then initialize it with a project API key:



```javascript

import SiteWatch from "@sitewatch/sdk";



SiteWatch.init({

&#x20; apiKey: "sw\_live\_xxxxx"

});

```



The SDK will initially monitor:



\* `window.onerror`

\* `unhandledrejection`



Future versions will also monitor:



\* `fetch()`

\* `XMLHttpRequest`

\* API failures

\* Custom application events



\---



\## 📊 Developer Dashboard



The dashboard will provide developers with a clear view of their website's health.



Example:



```text

\-----------------------------------------

&#x20;             SiteWatch

\-----------------------------------------



Errors Today              127

Critical Errors             8

Affected Pages             14

API Failures               23



\-----------------------------------------



Recent Errors



❌ Cannot read properties of undefined

&#x20;  /dashboard

&#x20;  347 occurrences



❌ Payment request failed

&#x20;  /checkout

&#x20;  37 occurrences



⚠️ Failed to load products

&#x20;  /products

&#x20;  18 occurrences

```



\---



\## 🔮 Future Features



After the MVP is working, SiteWatch may include:



\* API monitoring

\* Error grouping

\* Error severity

\* Charts and analytics

\* Email notifications

\* Slack notifications

\* Discord notifications

\* Webhooks

\* AI-powered error explanations

\* AI troubleshooting suggestions

\* Team collaboration

\* Project management

\* Performance monitoring

\* Uptime monitoring



These features are \*\*not part of the initial MVP\*\*.



\---



\## 🏃 Development Sprints



\### Sprint 0 — Planning \& Architecture



\* Define the project

\* Define MVP

\* Design architecture

\* Design database

\* Plan API

\* Plan SDK

\* Create repository



\### Sprint 1 — Project Foundation



\* Create React dashboard

\* Create Node/Express backend

\* Connect Supabase

\* Configure environment variables

\* Establish frontend/backend communication



\### Sprint 2 — Monitoring SDK



\* Create JavaScript SDK

\* Detect JavaScript errors

\* Detect promise errors

\* Send errors to backend



\### Sprint 3 — API Monitoring



\* Monitor failed API requests

\* Capture request information

\* Store API failures



\### Sprint 4 — Developer Dashboard



\* Display errors

\* Error details

\* Search

\* Filtering

\* Occurrence counts



\### Sprint 5 — Analytics



\* Error grouping

\* Error frequency

\* Error trends

\* Severity



\### Sprint 6 — Notifications



\* Email alerts

\* Webhooks

\* Future Slack/Discord support



\### Sprint 7 — AI Assistance



\* Explain errors

\* Suggest possible causes

\* Suggest debugging steps



\### Sprint 8 — Authentication \& Projects



\* Developer accounts

\* Projects

\* API keys

\* Project management



\### Sprint 9 — Production



\* Deployment

\* Security

\* Documentation

\* Demo website



\### Sprint 10 — Portfolio Launch



\* GitHub cleanup

\* Live demo

\* Portfolio update

\* DEV article

\* LinkedIn announcement



\---



\## 🎯 Project Goal



The main goal of SiteWatch is to give developers an easy way to know when their website functionality is failing without depending entirely on users to report problems.



The project will start as a simple error monitoring platform and gradually grow into a developer-focused website health and debugging platform.



\---



\## 👨‍💻 Developer



\*\*Layton Tozvireva\*\*



Full Stack Developer in training.



Built with the goal of improving practical software development skills through real-world projects.



