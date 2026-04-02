# AI-Powered Customer Support System

## Overview

This project is a **full-stack AI-powered customer support platform** that allows authenticated users to interact with an intelligent support assistant and enables admins to manage the AI's knowledge base dynamically.

The assistant uses **retrieval-augmented generation (RAG)** with a custom knowledge base built from static text files and admin-uploaded PDFs, powered by an on-premise or cloud large language model.

The system is designed with **security-first authentication**, **clean separation of concerns**, and a **scalable architecture**, reflecting real-world backend + frontend + AI integration.

---
## Key Features

### Authentication & Security
- Custom **JWT authentication using HTTP-only cookies**
- Secure login, logout, and signup flow
- Role-based access — users go to `/support`, admins go to `/admin`
- No tokens stored in localStorage (XSS-safe)
- Custom Django authentication backend (`CookieJWTAuthentication`)
- Protected backend APIs using Django REST Framework permissions
- Frontend route protection via `/api/me` authorization check

### AI Support Assistant
- Multi-backend LLM support with automatic fallback:
  - **Groq** (fastest, tried first — LPU-accelerated inference)
  - **OpenRouter** (fallback with multiple free models)
  - **Ollama / Mistral** (local fallback, last resort)
- Retrieval-Augmented Generation (RAG) using:
  - FAISS vector store
  - HuggingFace sentence embeddings (`all-MiniLM-L6-v2`)
- **Chat history context** — AI remembers previous messages in the conversation
- Knowledge-based responses (context-aware, not hallucinated)
- Structured JSON output from the model:
  ```json
  {
    "intent": "...",
    "reply": "...",
    "confidence": 0.0
  }
  ```

## AI Escalation & Ticketing

Sentiment analysis detects user frustration or negative intent

Low-confidence AI responses trigger automatic escalation

A support ticket is created and stored in PostgreSQL

Ticket includes:

user email  
structured query context from the AI conversation  
category and priority classification  
timestamp  
ticket status (open → in_progress → resolved)  
assigned support staff member  
resolution timestamp and optional resolution notes

The system assigns tickets to support staff

Email notifications are sent to available support personnel

Escalation ensures unresolved issues reach human support operators

### Staff Support Dashboard

Support staff can access a dedicated dashboard to manage escalated support tickets.

Features include:

- View assigned tickets in a dashboard interface
- Ticket cards showing priority, category, user information, and AI-generated context
- Dedicated ticket detail page for deeper inspection of support issues
- Conversation viewer displaying the most recent chat messages (last ~15 minutes) between the user and the AI
- Ticket lifecycle management (open → in_progress → resolved)
- Resolution notes and resolution timestamps recorded for support actions
- Dashboard sorting and filtering by priority and category
- Support analytics panel showing workload and resolution statistics

### Admin Knowledge Base Management
- Admin-only context management page at `/admin`
- Upload PDFs to dynamically expand the AI's knowledge base
- Delete uploaded PDFs
- Drag-and-drop file upload with 10MB limit
- Automatic re-indexing of the FAISS vector store after every upload or delete
- Knowledge base combines `knowledge.txt` static files + all uploaded PDFs
- Re-indexing runs in a background thread — API responds immediately
- Admins can manage the AI knowledge base without restarting the server
- Uploaded documents automatically improve the RAG retrieval pipeline
- Knowledge updates are immediately available to future user queries

### Frontend
- Built with Next.js App Router
- Secure API proxy routes (`/api/support`, `/api/me`, `/api/logout`, `/api/admin/pdfs`)
- Client-side authentication and role checks (no middleware dependency)
- **Speech-to-text input** using browser SpeechRecognition API:
  - Live interim transcript display as you speak
  - Continuous recording up to 60 seconds
  - Manual stop button
  - Auto-restart on browser mic timeout
- Chat history loaded on page mount and persisted in the database
- Auto-scroll to latest message
- Clean login, signup, support, and admin page flow

### Backend
- Django REST Framework with custom authentication
- PostgreSQL database
- ViewSets and DefaultRouter for clean URL generation
- Clean separation between authentication, business logic, and AI integration
- Server-to-server calls to LLM backends (no frontend exposure)
- Background threading for non-blocking re-indexing
- Celery task queue for asynchronous background processing
- Redis used as the Celery message broker and task queue backend

## Support Ticket System

- Automatic ticket creation when AI confidence is low
- Tickets stored in PostgreSQL with user information and timestamps
- Email alerts sent to support staff when escalation occurs
- Support staff can receive and manage assigned tickets
- Ticket lifecycle includes:
 - created
 - assigned
 - resolved

---

## Architecture

```
Browser (User / Admin)
        ↓
Speech Recognition (Voice → Text)
        ↓
Next.js Frontend (UI — React, TypeScript)
        ↓
Next.js API Routes (BFF Proxy Layer)
        ↓
Django REST API (Authentication + Business Logic)
        ↓
AI Pipeline
  ├── Intent Detection
  ├── Sentiment Analysis
  ├── RAG Context Builder
  └── LLM Response Generation
        ↓
Confidence Evaluation
   ├── High Confidence → AI Reply
   └── Low Confidence → Ticket Escalation
        ↓
Support Ticket System
        ↓
Celery Task Queue
        ↓
Redis Message Broker
        ↓
Email Notification to Support Staff
        ↓
PostgreSQL Database
        ↓
FAISS Vector Store (Knowledge Base Retrieval)
```

---

## Technology Stack

### Frontend
- Next.js (App Router)
- React
- TypeScript
- Fetch API
- Browser SpeechRecognition API

### Backend
- Django
- Django REST Framework
- PostgreSQL
- SimpleJWT (customized for cookie-based auth)
- pdfplumber (PDF text extraction)
- threading (background re-indexing)
- smtplib / Django Email Backend
- Celery (asynchronous task processing)
- Redis (message broker for Celery tasks)

### AI / ML
- Groq API (`llama-3.1-8b-instant`, `mixtral-8x7b-32768`)
- OpenRouter API (multiple free model fallbacks)
- Ollama (local Mistral fallback)
- LangChain
- FAISS
- HuggingFace Embeddings (`all-MiniLM-L6-v2`)

---

## Authentication Flow

1. User submits username and password via `/api/v1/login/`
2. Django authenticates and issues two httpOnly cookies:
   - `access` JWT (short-lived, 500 minutes)
   - `refresh` JWT (long-lived, 1 day)
3. Django returns the user's `role` (`"user"` or `"admin"`) in the response body
4. Frontend redirects based on role — users to `/support`, admins to `/admin`
5. Frontend never reads tokens directly — all auth validation happens via `/api/me`
6. Every protected API request reads the `access` cookie, verifies the JWT signature, and resolves `request.user`
7. Logout deletes both cookies server-side

This approach prevents XSS token theft, client-side token tampering, and token leakage through JavaScript.

---

## How the AI Works

1. User submits a query from the support page
2. Query is sent to Django via a secure Next.js API proxy
3. The user's last 6 messages of chat history are fetched from the database
4. Relevant documents are retrieved from the FAISS vector store (knowledge.txt + PDFs)
5. A prompt is built combining: knowledge context + conversation history + current query
6. The prompt is sent to Groq first, then OpenRouter, then Ollama as fallbacks
7. The model generates a structured JSON response
8. The system evaluates the confidence score of the generated response
9. If confidence is high, the response is returned to the user
10. If confidence is low or negative sentiment is detected:
      - A support ticket is created
      - Support staff are notified via email
11. The ticket is stored in the database for tracking and resolution

The AI only answers using the knowledge base and conversation history, ensuring controlled and reliable output.

---

## How the Knowledge Base Works

The knowledge base is built from two sources:

- `custSupApp/knowledge.txt` — static knowledge file, always included
- `media/pdfs/` — PDFs uploaded by admins through the `/admin` page

When `index_knowledge.py` runs (manually or triggered automatically after upload/delete):

1. It reads all text from `knowledge.txt`
2. It extracts text from every PDF in `media/pdfs/` using `pdfplumber`
3. All text is split into chunks of 300 characters with 50 character overlap
4. Chunks are embedded using HuggingFace sentence embeddings
5. Embeddings are stored in a FAISS vector index at `custSupApp/faiss_index/`

On every user query, the top 2 most relevant chunks are retrieved from the index and injected into the prompt as context.

---

## Project Structure

```
customer-support/
│
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   │
│   ├── custSupport/               # Django project settings
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   ├── wsgi.py
│   │   └── celery.py
│   ├── api/                       # REST API layer
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py               # All views + ViewSets
│   │   └── urls.py                # Router-based URL registration
│   │
│   ├── custSupApp/                # Core app
│   │   ├── models.py              # User, ChatMessage, UploadedPDF, etc.
│   │   ├── authentication.py      # CookieJWTAuthentication
│   │   ├── ai.py                  # LLM integration (Groq → OpenRouter → Ollama)
│   │   ├── index_knowledge.py     # FAISS indexing (knowledge.txt + PDFs)
│   │   ├── knowledge.txt          # Static knowledge base
│   │   ├── knowledge_banking.txt  # Additional domain knowledge
│   │   ├── faiss_index/           # Vector index storage
│   │   ├── services/
│   │   │   ├── support_assignment.py   # Staff assignment logic
│   │   │   ├── ticket_extraction.py # fall back for structured ticket extraction
│   │   │   └── ticket_service.py # create structured ticket
│   │   ├──templates
│   │   │   └──emails
│   │   │   └──support_ticket.html
│   │   ├──tests
│   │   │   └──test_ticket_extraction.py
│   │   └──tasks.py
│   │
│   ├── media/
│   │   └── pdfs/                  # Admin-uploaded PDFs
│   │
│   └── env/                       # Python virtual environment
│
├── frontend/
│   ├── app/
│   │   ├── login/
│   │   │   └── page.tsx           # Login with role-based redirect
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   ├── support/
│   │   │   └── page.tsx           # User chat page with speech input
│   │   ├── admin/
│   │   │   └── page.tsx           # Admin knowledge base management
│   │   ├── api/                   # Next.js proxy routes
│   │   │   ├── me/route.ts
│   │   │   ├── logout/route.ts
│   │   │   ├── support/route.ts
│   │   │   ├── chat/history/route.ts
│   │   │   └── admin/pdfs/
│   │   │       ├── route.ts       # GET list
│   │   │       ├── upload/route.ts  # POST upload
│   │   │       └── [id]/route.ts  # DELETE
│   │   └── staff/
│   │           ├── ticket/
│   │           │      └──[id]/
│   │           │           └──page.tsx
│   │           └── page.tsx
│   ├── package.json
│   ├── next.config.ts
│   └── tsconfig.json
│
└── README.md
```

---

## Running the Project (Development)

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL running locally
- Ollama installed (optional, used as last fallback)
- Groq API key (free at console.groq.com)

### Backend

```bash
cd backend
python -m venv env
source env/bin/activate      # Windows: env\Scripts\activate
pip install -r requirements.txt
pip install pdfplumber
redis-server
celery -A custSupport worker -l info -P solo

# Set environment variables
# GROQ_API_KEY=your_key_here
# OPENROUTER_API_KEY=your_key_here (optional)

python manage.py migrate
python -m custSupApp.index_knowledge   # build initial FAISS index
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Ollama (optional local LLM)

```bash
ollama pull mistral
ollama run mistral
```

---

## Current Status

- Authentication — login, logout, signup, session validation
- Role-based routing — users to /support, admins to /admin
- Secure cookie-based JWT authentication
- Voice input support using browser speech recognition
- Chat history persistence and context-aware AI responses
- Retrieval-Augmented Generation using knowledge base documents
- Admin knowledge base management (upload/delete PDFs)
- Automatic FAISS re-indexing for updated knowledge
- Sentiment analysis for detecting user dissatisfaction
- Automatic support ticket creation for low-confidence responses
- Email notification system for support staff
- Secure backend architecture using Next.js BFF + Django REST
- Celery + Redis integration for asynchronous email notifications

---

## Planned Enhancements

- Support staff dashboard for ticket management
- Ticket resolution workflow
- User feedback collection after ticket resolution
- Admin monitoring dashboard for staff performance
- Streaming AI responses (token-by-token display)
- Production deployment configuration
- Staff support dashboard for managing assigned tickets
- Dedicated ticket detail page with AI context and conversation inspection
- Conversation viewer for recent chat messages prior to escalation
- Advanced dashboard analytics for staff workload and ticket performance

---

## Author

**Jayavardhan Nirujogi**

This project was built to deeply understand:
- Secure authentication internals
- Frontend–backend communication patterns
- AI system integration with RAG
- Real-world debugging and system design
- LLM fallback strategies and prompt engineering

---

## License

Currently for educational and experimental purposes.
A license can be added if the project is open-sourced or deployed publicly.

---

<<<<<<< HEAD
*Active development. Core architecture, authentication, AI integration, and admin knowledge base management are stable and working end-to-end.*
>>>>>>> personal/backup-snapshot
=======
*Active development. Core architecture, authentication, AI integration, and admin knowledge base management are stable and working end-to-end.*
>>>>>>> local-progress
