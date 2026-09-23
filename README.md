# Citeline

Citeline is a high-performance PDF Document Assistant that allows users to upload PDF documents and ask questions about them. It securely extracts text, chunks it, and leverages Retrieval-Augmented Generation (RAG) using Google Gemini, ChromaDB, and PostgreSQL to deliver highly accurate answers, document summaries, and multi-document comparisons.

## ✨ Features

- **📄 PDF Extraction & Smart Chunking**: Extracts text from PDFs at the page level, applying intelligent chunking with character overlap to preserve context.
- **🧠 Multi-Mode RAG**: Seamlessly handles Question-Answering, Summarization, and Document Comparison (comparing exactly 2 documents).
- **⚡ Optimized Latency**: Implements concurrent LLM routing and vector retrieval, along with regex-based fast routing to bypass unnecessary LLM calls.
- **🔒 Security & Injection Defense**: Prevents prompt injection via nonce-wrapped `<source>` tags and heuristic-based chunk flagging.
- **✅ Factual Grounding Checker**: A dedicated LLM verification step ensures that every factual claim in an answer is supported by the retrieved document chunks.
- **🛡️ Rate Limiting & Protections**: Enforces IP-based rate limiting via `slowapi` and strict file size and page count constraints.
- **👻 Stateless Chat**: Uses `X-Session-Id` for isolated sessions without maintaining massive conversational histories in the LLM context, reducing cost and latency.

## 🛠️ Tech Stack

**Frontend**
- Next.js 16 (App Router)
- React 19
- Tailwind CSS v4
- shadcn/ui & base-ui

**Backend**
- FastAPI
- Uvicorn
- pypdf (PDF parsing)

**Database**
- PostgreSQL (via `psycopg3` and Neon direct connection) for metadata and session isolation.

**Vector Store**
- ChromaDB (Local or Cloud)

**Authentication**
- Session-based UUID isolation (via `X-Session-Id` headers and local storage on the client).

**APIs / AI Services**
- Google Gemini API (`gemini-2.0-flash` for generation, `text-embedding-004` for embeddings).

**Deployment / Infrastructure**
- Docker (Backend)
- Vercel (Frontend)
- Neon / Render / Railway

## 🏗️ Architecture

Citeline consists of a Next.js frontend communicating with a stateless FastAPI backend. The frontend handles state at the page level and communicates securely via REST APIs.

```mermaid
graph TD
    Client[Client / Browser] -->|HTTP POST /documents| API[FastAPI Backend]
    Client -->|HTTP POST /chat| API
    
    API -->|Extract & Chunk| Ingest[Ingestion Pipeline]
    Ingest -->|Store Chunks| Chroma[(ChromaDB)]
    Ingest -->|Store Metadata| Postgres[(PostgreSQL)]
    
    API -->|Route QA/Summarize/Compare| RAG[RAG Engine]
    RAG -->|Retrieve Context| Chroma
    RAG -->|Generate Answer & Check Grounding| Gemini[Google Gemini API]
    
    Gemini --> RAG
    RAG --> API
    API --> Client
```

## 📂 Project Structure

```text
citeline/
├── frontend/
│   ├── app/                # Next.js App Router (page.tsx holds core state)
│   ├── components/         # UI components (shadcn/ui, chat interfaces)
│   └── lib/                # API wrappers and session management
├── backend/
│   ├── app/                # FastAPI application
│   │   ├── routes/         # Endpoint definitions (/chat, /documents)
│   │   ├── llm.py          # Gemini integration logic
│   │   ├── rag.py          # QA, Summarize, and Compare implementations
│   │   ├── vectorstore.py  # ChromaDB interaction
│   │   ├── ingest.py       # PDF parsing and chunking logic
│   │   └── security.py     # Input sanitization and prompt injection defenses
│   ├── evals/              # Local evaluation scripts for latency and hit rates
│   └── tests/              # Security and unit tests
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+)
- Python (v3.10+)
- PostgreSQL Database (e.g., Neon)
- Google AI Studio API Key

### Clone the Repository
```bash
git clone https://github.com/harshitsaxena214/citeline.git
cd citeline
```

### Backend Setup

1. **Navigate to the backend directory and set up a virtual environment:**
```bash
cd backend
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Activate (macOS/Linux)
source .venv/bin/activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Set up Environment Variables:**
Copy `.env.example` to `.env` and fill in your keys:
```bash
cp .env.example .env
```

4. **Start the FastAPI server:**
```bash
uvicorn app.main:app --reload
```
The backend will run at `http://localhost:8000`.

### Frontend Setup

1. **Navigate to the frontend directory:**
```bash
cd ../frontend
```

2. **Set up Environment Variables:**
Create a `.env` file and set the API URL:
```bash
cp .env.example .env
```

3. **Install dependencies and run the server:**
```bash
npm install
npm run dev
```
The frontend will run at `http://localhost:3000`.

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google AI Studio API key | `AIzaSy...` |
| `GEMINI_MODEL` | Primary LLM for generation | `gemini-2.0-flash` |
| `GEMINI_FAST_MODEL` | Optional smaller model for routing | `gemini-2.0-flash` |
| `GEMINI_EMBED_MODEL` | Embedding model | `text-embedding-004` |
| `DATABASE_URL` | Postgres direct connection string | `postgres://user:pass@host/db?sslmode=require` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000` |
| `CHROMA_PATH` | Local Chroma folder | `chroma_data` |
| `MAX_UPLOAD_MB` | Max PDF size in MB | `10` |
| `MAX_PDF_PAGES` | Max pages per PDF | `50` |
| `ENABLE_DOCS` | Enable `/docs` Swagger UI | `true` |

*(Refer to `backend/.env.example` for the full list of tuning parameters like chunk size, rate limits, and overlap).*

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Base URL of the FastAPI backend | `http://localhost:8000` |

## 📡 API Documentation

If `ENABLE_DOCS=true` is set, you can access the interactive Swagger UI at `http://localhost:8000/docs`.

### Key Endpoints

- **`GET /health`**
  - **Purpose**: Wakes up the server and verifies the database connection.
- **`GET /documents`**
  - **Purpose**: Lists all active documents for the current session.
  - **Headers**: `X-Session-Id`
- **`POST /documents`**
  - **Purpose**: Uploads, extracts, and embeds a PDF document.
  - **Headers**: `X-Session-Id`
  - **Body**: `multipart/form-data` (file)
- **`DELETE /documents/{id}`**
  - **Purpose**: Deletes a document and its chunks from Chroma and Postgres.
  - **Headers**: `X-Session-Id`
- **`POST /chat`**
  - **Purpose**: Submits a question along with selected document IDs.
  - **Headers**: `X-Session-Id`
  - **Body**: `{"question": "What is...", "document_ids": ["uuid1", "uuid2"]}`

## 🧠 How It Works

1. **Ingestion**: When a user uploads a PDF, the backend extracts the text page-by-page. It sanitizes the text, breaks it into overlapping chunks, checks for injection patterns, and generates embeddings using Gemini.
2. **Storage**: The embeddings and metadata (page numbers) are stored in ChromaDB, while the document session record is stored in PostgreSQL.
3. **Routing**: When a user asks a question, the API uses regex heuristics or a fast LLM call to determine if the query is a standard Question, a Summary request, or a Comparison between two documents.
4. **Retrieval & Generation**: 
   - Based on the route, it queries ChromaDB for the most relevant chunks.
   - The chunks are wrapped in secure `<source>` tags to prevent prompt injection.
   - The context is passed to Gemini to generate a response.
5. **Grounding**: A second, smaller LLM prompt strictly checks if the generated answer is factually supported by the retrieved context. If not, it falls back safely. Citations are built dynamically from backend metadata, never hallucinated by the model.

## 🌍 Live Demo

Check out the live application here:
**[https://cite-line.vercel.app/](https://cite-line.vercel.app/)**

## 🚢 Deployment

**Frontend (Vercel)**
1. Connect your repository to Vercel and point the Root Directory to `frontend`.
2. Add `NEXT_PUBLIC_API_URL` to point to your production backend URL.
3. Deploy!

**Backend (Render / Railway)**
1. Use the provided `Dockerfile` located in the `backend` directory.
2. Set up a Neon PostgreSQL database and optionally a Chroma Cloud instance.
3. Populate the necessary environment variables (`DATABASE_URL`, `GEMINI_API_KEY`, `ALLOWED_ORIGINS`, etc.).
4. Deploy as a Web Service.

## 💻 Development Commands

**Frontend**
- `npm run dev`: Starts the Next.js dev server.
- `npm run build`: Builds the app for production.
- `npm run lint`: Runs ESLint checks.

**Backend**
- `uvicorn app.main:app --reload`: Starts the FastAPI server.
- `python -m pytest`: Runs backend security and unit tests.
- `python -m evals.run_eval`: Runs RAG evaluation scripts to tune retrieval distance.

## 👨‍💻 Author

**Harshit Saxena**
- GitHub: [https://github.com/harshitsaxena214](https://github.com/harshitsaxena214)
