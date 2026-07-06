# GroupScout

**GroupScout** is a lightweight, modern SaaS platform designed to help businesses automatically monitor Facebook Groups for high-intent leads. It uses a custom Chrome Extension to locally filter posts in your browser, saving API costs, and a Next.js backend that utilizes Groq AI for intelligent binary classification (Relevant / Not Relevant).

---

## Table of Contents
1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Setup & Installation](#setup--installation)
4. [How to Use](#how-to-use)
5. [System Architecture](#system-architecture)
6. [Data Models (ERD)](#data-models-erd)
7. [Monitoring Flow](#monitoring-flow)

---

## Overview

Finding leads in Facebook Groups is time-consuming. GroupScout automates this by continuously monitoring groups you belong to. 

**Key Features:**
- **Local Keyword Filtering:** The Chrome Extension filters posts directly in your browser using keywords, ensuring only potentially relevant posts are sent to the AI.
- **AI Classification:** Groq AI instantly reviews the post context and flags it as a lead if it matches your business needs.
- **Power Mode:** The extension can automatically open and manage background tabs during your configured active hours to ensure groups are monitored even while you work on other things.
- **Clean Dashboard:** A beautiful, dark-themed dashboard to view leads, manage keywords, and configure your settings.

---

## How It Works

1. The Chrome Extension attaches to open Facebook Group tabs.
2. It uses a `MutationObserver` to instantly detect new posts as you scroll or as they load.
3. The extension extracts the post text and checks it against your saved **Keywords**.
4. If a keyword matches, the post is sent to the GroupScout backend.
5. The backend uses the **Groq API** to read the post context and confirm if it is a genuine lead.
6. If it's a lead, it is saved to your dashboard instantly.

---

## Setup & Installation

### Prerequisites
- Node.js 18+
- A PostgreSQL Database (e.g., Neon)
- A Groq API Key (for AI classification)

### 1. Backend Setup
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Set up your `.env` file with your database connection string and Better Auth secrets:
   ```env
   DATABASE_URL="postgresql://user:password@host/db"
   BETTER_AUTH_SECRET="your_random_secret_string"
   BETTER_AUTH_URL="http://localhost:3000"
   ENCRYPTION_KEY="your_32_character_encryption_key"
   ```
3. Push the database schema:
   ```bash
   npx prisma db push
   ```
4. Start the Next.js development server:
   ```bash
   npm run dev
   ```

### 2. Extension Setup
1. Navigate into the `extension` folder and build it:
   ```bash
   cd extension
   npm install
   npm run build
   ```
2. Open Google Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the `extension` folder.

---

## How to Use

1. **Create an Account:** Go to `http://localhost:3000/signup` and create your account.
2. **Configure Settings:** Go to the **Settings** page in your dashboard. Add your **Groq API Key** and copy your **User ID**.
3. **Connect the Extension:** Click the GroupScout extension icon in Chrome, paste your User ID, and click "Save & Connect".
4. **Add Keywords:** Go to the **Keywords** page and add words related to your leads (e.g., "roofer", "recommendation").
5. **Start Monitoring:** 
   - **Default Mode:** Simply open a Facebook Group in a new tab. The extension will monitor it automatically.
   - **Power Mode:** Enable Power Mode in settings. The extension will automatically open background tabs for your groups during your specified Active Hours.

---

## System Architecture

The following diagram illustrates how the different parts of GroupScout communicate.

```mermaid
graph TD
    subgraph Browser["User Browser (Chrome)"]
        FB["Facebook Group Pages"]
        ExtContent["Content Script (Observer)"]
        ExtBackground["Background Worker (Tab Manager)"]
        Popup["Extension Popup"]
        
        FB <-->|Reads DOM| ExtContent
        ExtContent <-->|Messages| ExtBackground
        Popup <-->|Settings| ExtBackground
    end

    subgraph Backend["Next.js Application"]
        UI["Web Dashboard UI"]
        API["REST API Routes"]
        Auth["Better Auth"]
        DB[(PostgreSQL Database)]
        
        UI <--> API
        API <--> Auth
        API <--> DB
    end

    subgraph External["External Services"]
        Groq["Groq AI API"]
    end

    ExtBackground <-->|Fetch Config / Ingest Leads| API
    API <-->|Classify Text| Groq
```

---

## Data Models (ERD)

This Entity-Relationship Diagram outlines the core database structure managed by Prisma ORM.

```mermaid
erDiagram
    User ||--o{ MonitoredGroup : manages
    User ||--o{ Keyword : defines
    User ||--o{ Post : owns
    User ||--|| Settings : configures
    MonitoredGroup ||--o{ Post : contains

    User {
        String id PK
        String name
        String email
        DateTime createdAt
    }

    Settings {
        String id PK
        String userId FK
        Int scanInterval
        String activeFrom
        String activeTo
        String monitoringMode
        String groqApiKey
    }

    MonitoredGroup {
        String id PK
        String userId FK
        String facebookGroupId
        String name
        Boolean enabled
        DateTime lastScan
    }

    Keyword {
        String id PK
        String userId FK
        String keyword
        Boolean enabled
    }

    Post {
        String id PK
        String userId FK
        String facebookPostId
        String groupId FK
        String keyword
        String content
        String url
        Boolean relevant
        Boolean viewed
        DateTime createdAt
    }
```

---

## Monitoring Flow

This sequence diagram shows the step-by-step process of how a Facebook post is captured, filtered, and classified.

```mermaid
sequenceDiagram
    participant FB as Facebook DOM
    participant Content as Ext: Content Script
    participant Back as Ext: Background
    participant API as Next.js API
    participant DB as Database
    participant Groq as Groq AI

    FB->>Content: MutationObserver detects new post
    Content->>Content: Extract Text & Link
    Content->>Content: Local Keyword Check
    
    alt Keyword Matches
        Content->>Back: Send Post Data
        Back->>API: POST /api/extension/ingest
        API->>DB: Check if duplicate
        alt Is Duplicate
            DB-->>API: Post exists
            API-->>Back: "Already processed"
        else Is New Post
            API->>Groq: Prompt: "Is this a relevant lead?"
            Groq-->>API: Binary Classification (Yes/No)
            
            alt Is Relevant
                API->>DB: Save new Lead (Post)
                API-->>Back: "Relevant lead saved"
            else Not Relevant
                API-->>Back: "Not relevant"
            end
        end
    else No Keyword Match
        Content->>Content: Ignore Post (Save API costs)
    end
```

---

## User Session & Authentication Flow

This diagram illustrates how user accounts and sessions are securely managed across the Next.js frontend and Better Auth backend.

```mermaid
sequenceDiagram
    participant User as User / Browser
    participant UI as Next.js Frontend
    participant Auth as Better Auth API
    participant DB as PostgreSQL DB

    User->>UI: Navigates to /signup
    UI->>Auth: POST /api/auth/sign-up (Email & Password)
    Auth->>DB: Hash password & Create User record
    Auth->>DB: Create Session record
    Auth-->>UI: Return Session Token (Cookie)
    UI-->>User: Redirect to /dashboard

    User->>UI: Views Dashboard
    UI->>Auth: Request layout.tsx (Server Action)
    Auth->>DB: Validate Session Token
    DB-->>Auth: Session is valid
    Auth-->>UI: Return User Data
    UI-->>User: Render Dashboard
    
    User->>UI: Clicks Logout
    UI->>Auth: POST /api/auth/sign-out
    Auth->>DB: Delete/Invalidate Session
    Auth-->>UI: Clear Cookie
    UI-->>User: Redirect to /login
```
