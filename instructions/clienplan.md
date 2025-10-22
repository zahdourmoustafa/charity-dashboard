1 — Overview / MVP Goal
Goal: A web-based Quality Management System (QMS) for dental practices that includes:
• Categorized document storage (PDFs, forms, checklists) based on the LZK BadenWürttemberg Practice Handbook.
• Search and browse by category or keyword.
• AI chatbot that can access uploaded documents (RAG — Retrieval Augmented Generation)
to:
a) answer user questions, and
b) link directly to relevant PDF files.
• Personnel area (e.g., vacation requests, sick leave forms).
• Integration with Dampsoft (practice software) to sync staff data or link files.
• Hosted as an MVP (Replit prototype) with both frontend and backend and an AI API
placeholder.
2 — MVP Scope (what must be included)
Minimum viable features:
1. User login (practice admin and staff roles).
2. Categories & subcategories (based on LZK structure: Laws, Quality Assurance, Forms,
Contracts, Practice Inspection, BuS Service).
3. Document lists per category (PDF viewer + download). Include 10–20 dummy PDFs (e.g.,
hygieneplan.pdf, urlaubsantrag.pdf).
4. Full-text search (on metadata + PDF content).
5. Chatbot UI — user can ask “How do I prepare the treatment room?” → bot gives concise
answer + relevant PDF link.
• For MVP: simple keyword matching or RAG with embeddings.
6. Admin interface for uploading and tagging documents.
7. Basic Dampsoft connection (mock integration or CSV import/export).
8. Privacy compliance (GDPR basics), audit logs (who uploaded/viewed what).
3 — Recommended Tech Stack (for Replit
MVP)
• Frontend: React + Tailwind CSS (fast, clean UI).
• Backend: Node.js + Express (REST API).
• Auth: JWT (for MVP).
• Database: SQLite (MVP) → PostgreSQL later.
• File Storage: Local folder or S3-compatible storage for production.
• Search/Embeddings:
• MVP: SQLite full-text search (FTS) or simple keyword matching.
• Later: OpenAI embeddings + vector DB (Pinecone, Weaviate, etc.).
• PDF parsing: pdf-parse (Node) or PyMuPDF (Python microservice).
4 — Architecture Overview
1. Frontend (React)
• Login, dashboard, category view, document viewer, upload, chatbot UI.
2. Backend (Express)
• Authentication, CRUD for documents, search API, chatbot API.
3. Ingestion pipeline (for uploads)
• Extract text from PDF → split into chunks → create embeddings → save metadata &
vectors.
4. VectorDB / Retrieval layer
• For question answering (find nearest chunks).
5. RAG / LLM Logic
• Combine retrieved chunks → prompt LLM → return structured response with
citations.
6. Dampsoft Connector
• MVP: mock endpoint or CSV export/import.
7. Security & Privacy
• HTTPS, role-based access, encrypted data storage.
5 — Detailed Step-by-Step Implementation
Plan
Phase A — Preparation (1–3 days)
1. Confirm requirements with client: categories, document sources, Dampsoft version.
2. Set up project in Replit (Node + React).
3. Add dummy PDFs (hygiene plan, vacation form, work safety checklist).
Phase B — Data Model + API (2–4 days)
Database schema:
• users, categories, documents, document_chunks, audit_logs
API endpoints:
• Auth: /api/login, /api/register
• Documents: /api/documents, /api/documents/upload,
/api/documents/:id
• Categories: /api/categories
• Chat: /api/chat/query
• Dampsoft: /api/dampsoft/* (stub for MVP)
Phase C — Frontend Structure (2–4 days)
1. Sidebar navigation + top search bar.
2. Pages: Dashboard, Category view, Document view, Upload page, Chat page.
3. Chat UI: message list + text input; show linked document buttons in responses.
4. Upload page: file picker, category selector, tags.
Phase D — Document Ingestion (2–5 days)
1. Extract text from PDFs upon upload.
2. Split text into ~500-token chunks.
3. Generate embeddings (OpenAI embeddings API).
4. Store chunks + metadata in SQLite or FAISS.
Phase E — Retrieval + Chatbot Logic (2–4 days)
1. Search nearest chunks for query.
2. Build prompt:
• System: “You are a dental practice QM assistant. Answer only using provided
documents.”
• User: actual user question.
• Context: top N document chunks with titles & page numbers.
3. Call LLM (OpenAI GPT).
4. Format reply: concise summary + document citations (with links).
Phase F — Dampsoft Integration (1–3 days)
1. Determine which integration is needed (user sync, document linking, etc.).
2. MVP: simple CSV export/import of users or document metadata.
3. Add endpoints /api/dampsoft/export/users and
/api/dampsoft/export/documents.
Phase G — Testing & Demo (2–4 days)
1. Unit tests for key APIs.
2. User test with 2–3 staff members.
3. Fix usability issues.
4. Demo examples:
• “How do I prepare the treatment room?” → Chatbot links Hygieneplan PDF.
• “How do I report sick leave?” → Chatbot links HR form.
6 — Chatbot Prompt Template (for RAG
system)
SYSTEM:
You are an assistant for dental practice quality management (LZK BadenWürttemberg). Use only the following document snippets. If the question is not
covered, reply: "I couldn't find this information in the available documents."
Always include the source (document title and page range).
USER:
{user_question}
CONTEXT:
{retrieved_chunks}
INSTRUCTIONS:
1) Keep answers concise (3–7 sentences).
2) At the end, list relevant documents as: Title (page range).
3) If a PDF directly answers, include: [Open document]().
Example chunk:
---DOC: hygieneplan.pdf, pages 2–4---
Text: "Preparation of treatment room: ... Steps A, B, C ..."
---DOC: sick_leave_form.pdf, page 1---
Text: "Employees must submit the following form..."
7 — Hallucination Prevention & Reliability
• Always include sources (document + page).
• If unsure, respond: “This is not specified in the available documents.”
• Implement a confidence score — if low, suggest “Please verify in the original file.”
• Log all chatbot queries (question, retrieved docs, user).
8 — Data Protection / Legal Compliance
• GDPR: handle personal data minimally and securely.
• Hosting: EU or German servers (AWS EU, Hetzner, etc.).
• Access control: role-based (Admin, Staff, Auditor).
• Encryption: TLS + encryption at rest.
• Data processing contracts: needed with LLM/hosting providers.
• Patient data: never feed into the chatbot/QMS unless explicitly authorized.
9 — Dampsoft Integration (Technical +
Organizational)
1. Clarify with client what’s needed (user sync, file linking, patient data view).
2. Check Dampsoft API documentation — find out if REST, SOAP, or CSV import/export.
3. MVP options:
• CSV export/import — easiest for testing.
• REST API — if Dampsoft provides one.
• Local connector — if Dampsoft runs on local network.
4. Implement /api/dampsoft/export endpoints; test manual data exchange first.
10 — Acceptance Criteria / Tests
• Admin uploads PDF, assigns category.
• Staff searches for “Hygiene plan” → document appears and opens.
• Chat: “How do I prepare the treatment room?” → Answer + Hygieneplan link.
• Dampsoft export works correctly.
• Audit log records uploads & chat queries.
11 — MVP Timeline
• Week 1: Setup, DB, base frontend, dummy docs.
• Week 2: Document upload, viewer, search.
• Week 3: Chatbot MVP (retrieval + LLM).
• Week 4: Dampsoft connector, testing, demo.
(For one developer: 3–4 weeks.)
12 — Production Recommendations
• Use PostgreSQL + S3 for storage.
• Use real vector DB (Pinecone, Weaviate).
• Add roles, SSO (Keycloak).
• Perform GDPR risk assessment (DSFA).
• Add monitoring and auto-testing.
• Version and review LZK document updates regularly.
13 — UX & Demo Tips
• Show short quoted snippets from documents in chatbot answers.
• Include “Open PDF at page X” buttons.
• Quick filters in sidebar: “Personnel / Hygiene / Forms.”
• Dashboard FAQ with common questions.
14 — Example File Structure
/client (React + Tailwind)
/src
 /components
 /pages
 /chat
/server (Node + Express)
/routes
/controllers
/services
 pdfParser.js
 embeddings.js
 retrieval.js
/db
/uploads
/config
.env
15 — Example Chat Flow
1. User enters question.
2. Frontend sends POST /api/chat/query.
3. Backend creates embedding for question.
4. VectorDB retrieves top 5 chunks.
5. Backend builds full prompt (system + context + user).
6. Calls LLM API.
7. Returns response + document metadata.
8. Frontend displays response + links.
16 — Example Replit Prompt (for Replit AI
agent)
If using Replit’s AI/Agent, you can describe the project with dummy docs + sample queries like:
“Build a dental-practice QMS MVP with categories (Personnel, Hygiene, Forms, BuS),
document upload/viewer, and chatbot that answers questions like ‘How do I prepare the
treatment room?’ using those documents.”
17 — Next Steps (for you)
1. Confirm your required categories (Personnel, Forms, Hygiene, BuS, Legal).
2. Gather or create sample PDFs.
3. Decide if you want me to now generate the starter code (React + Express) that you can
copy into Replit — including upload, simple retrieval, chat stub, and dummy docs.