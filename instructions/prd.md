# Product Requirements Document (PRD)
## Dental Practice Quality Management System (QMS)

**Version:** 1.0  
**Last Updated:** October 22, 2025  
**Project Status:** Development Phase  
**Target Market:** German Dental Practices (LZK Baden-Württemberg)

---

## 1. Executive Summary

### 1.1 Product Vision
Build an intelligent Quality Management System for German dental practices that transforms compliance from a burden into a seamless experience. The platform enables practice owners and staff to instantly access critical operational knowledge through an AI-powered assistant that understands their documents and provides accurate, cited answers in German.

### 1.2 Problem Statement
German dental practices face significant challenges:
- **Compliance Burden**: Must follow strict LZK Baden-Württemberg regulations with severe consequences for non-compliance
- **Information Scattered**: Critical knowledge locked in PDFs, forms, and the official practice handbook (https://phb.lzk-bw.de/)
- **Time Waste**: Staff repeatedly ask the same questions or dig through documents
- **Training Difficulty**: New employees struggle to learn procedures quickly
- **Inspection Stress**: Preparing for practice inspections is time-consuming and error-prone

### 1.3 Solution Overview
A web-based platform that combines:
- Centralized document management organized by LZK categories
- AI chatbot that answers questions using only uploaded documents (RAG)
- Real-time document access with source citations
- GDPR-compliant audit logging
- Team management with role-based access control

### 1.4 Success Metrics
- Staff find answers in <10 seconds (vs. 5+ minutes manually)
- 80% reduction in "where is this document?" questions
- 100% document traceability for inspections
- Zero hallucinations (AI only uses uploaded documents)
- 95% user satisfaction score

---

## 2. Target Users

### 2.1 Primary Users

**Practice Owner (Dentist) - Admin Role**
- Age: 35-65
- Tech Savvy: Medium
- Needs: Compliance assurance, team efficiency, inspection readiness
- Pain Points: Time spent answering staff questions, keeping documents updated
- Goals: Streamline operations, reduce compliance risk, empower team

**Dental Staff (Assistants, Hygienists) - Employee Role**
- Age: 20-55
- Tech Savvy: Low to Medium
- Needs: Quick answers to procedural questions, easy document access
- Pain Points: Can't find forms, unsure about protocols, interrupting colleagues
- Goals: Do their job correctly, avoid mistakes, work independently

### 2.2 User Personas

**Persona 1: Dr. Schmidt (Practice Owner)**
- 45 years old, owns practice for 15 years
- 8 employees, busy schedule
- Frustrated by repeated questions from staff
- Worried about upcoming LZK inspection
- Wants: Peace of mind, efficient team, more time for patients

**Persona 2: Anna (Dental Assistant)**
- 28 years old, 3 years experience
- Confident with procedures but forgets details
- Often needs to find forms or check protocols
- Doesn't want to bother Dr. Schmidt with "simple" questions
- Wants: Quick answers, confidence in her work, independence

---

## 3. Technical Architecture

### 3.1 Tech Stack

**Frontend**
- Framework: Next.js 14+ (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- UI Components: Shadcn UI (pre-installed)
- State Management: React Server Components (minimal client state)

**Backend**
- Platform: Convex (BaaS)
- Database: Convex DB (reactive, real-time)
- File Storage: Convex File Storage
- Vector Database: Convex RAG Component
- Authentication: Better Auth (Phase 3)

**AI/ML**
- RAG Framework: @convex-dev/rag
- Embeddings: OpenAI text-embedding-3-small (1536 dimensions)
- LLM: OpenAI GPT-4o-mini
- Streaming: Vercel AI SDK
- Document Processing: pdf-parse, mammoth, xlsx

**Infrastructure**
- Hosting: Vercel (frontend)
- Backend: Convex Cloud (EU region for GDPR)
- Email: Resend (for team invitations)
- Monitoring: Convex Dashboard + Vercel Analytics

### 3.2 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Next.js Frontend                     │
│  (German UI, Document Management, Chat Interface)        │
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ Convex Client SDK
                      │
┌─────────────────────▼───────────────────────────────────┐
│                    Convex Backend                        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │   Database  │  │ File Storage │  │  RAG Component │ │
│  │  (Reactive) │  │   (PDFs)     │  │   (Vectors)    │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐│
│  │         Actions (Serverless Functions)              ││
│  │  - Document Ingestion  - AI Chat  - Search          ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────┬───────────────────────────────────┘
                      │
                      │ External APIs
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
   │ OpenAI  │  │ Resend  │  │ Vercel  │
   │   API   │  │  Email  │  │   AI    │
   └─────────┘  └─────────┘  └─────────┘
```

### 3.3 Data Models

**Documents Table**
```typescript
{
  _id: Id<"documents">,
  title: string,
  category: string,
  subcategory?: string,
  storageId: Id<"_storage">,
  fileType: "pdf" | "docx" | "xlsx" | "image",
  fileSize: number,
  uploadedBy: Id<"users">,
  uploadedAt: number,
  ragEntryId?: string,
  status: "processing" | "ready" | "error",
  metadata: {
    pageCount?: number,
    version?: string,
    tags?: string[]
  }
}
```

**Categories Table**
```typescript
{
  _id: Id<"categories">,
  name: string,
  nameGerman: string,
  description: string,
  icon?: string,
  order: number,
  parentId?: Id<"categories">,
  createdAt: number
}
```

**Users Table** (Phase 3)
```typescript
{
  _id: Id<"users">,
  email: string,
  name: string,
  role: "admin" | "employee",
  status: "pending" | "active" | "inactive",
  invitedBy?: Id<"users">,
  invitedAt?: number,
  lastLoginAt?: number
}
```

**Audit Logs Table**
```typescript
{
  _id: Id<"audit_logs">,
  userId: Id<"users">,
  action: "document_uploaded" | "document_viewed" | "document_deleted" | "chat_query",
  resourceId?: string,
  resourceType?: "document" | "category" | "chat",
  metadata: object,
  timestamp: number,
  ipAddress?: string
}
```

---

## 4. Feature Specifications

### 4.1 Phase 1: Core RAG System & Document Management (CURRENT PRIORITY)

#### 4.1.1 Document Management

**Categories System**
- Pre-defined categories based on LZK structure:
  - Gesetze und Rechtliche Grundlagen (Laws & Legal Foundations)
  - Qualitätssicherung (Quality Assurance)
  - Hygiene und Medizinprodukte (Hygiene & Medical Devices)
  - Personal (Personnel)
  - Formulare (Forms)
  - Verträge (Contracts)
  - Praxisbegehung (Practice Inspection)
  - BuS-Dienst (Occupational Health Service)
- Support for subcategories (2 levels deep)
- Admin can create/edit/delete categories
- Display document count per category

**Document Upload**
- Drag-and-drop interface
- Multi-file upload support
- Supported formats: PDF, DOCX, XLSX, images (JPG, PNG)
- File size limit: 50MB per file
- Automatic file type detection
- Category assignment during upload
- Optional metadata: tags, version, description
- Progress indicator during upload
- Error handling with clear messages

**Document Processing Pipeline**
```
Upload → Store in Convex → Extract Text → Chunk Content → 
Generate Embeddings → Store in RAG → Mark as Ready
```

**Text Extraction by File Type:**
- PDF: pdf-parse (extract text + page numbers)
- DOCX: mammoth.js (convert to plain text)
- XLSX: xlsx library (extract cell content as structured text)
- Images: OCR with Tesseract.js (optional, Phase 2)

**Chunking Strategy:**
- Chunk size: ~500 tokens (~2000 characters)
- Overlap: 50 tokens (to preserve context)
- Preserve: Section headers, page numbers, document title
- Smart splitting: Avoid breaking mid-sentence or mid-paragraph

**Document List View**
- Grid or list layout (user preference)
- Display: Title, category, file type, upload date, file size
- Actions: View, Download, Delete (admin only)
- Search/filter by category, file type, date range
- Sort by: name, date, size, relevance

**Document Viewer**
- In-browser PDF viewer (react-pdf or similar)
- Page navigation
- Zoom controls
- Download button
- Print option
- Mobile-responsive

#### 4.1.2 RAG System Implementation

**Convex RAG Configuration**
```typescript
const rag = new RAG({
  filterNames: ["category", "subcategory", "fileType"],
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
});
```

**Namespace Strategy**
- Single practice: Use practice ID as namespace
- Future multi-practice: Separate namespace per practice
- Global namespace: Shared LZK handbook content (future)

**Metadata Stored with Chunks**
```typescript
{
  storageId: string,
  documentId: string,
  documentTitle: string,
  category: string,
  subcategory?: string,
  pageNumbers: number[],
  uploadedAt: number,
  fileType: string
}
```

**Search Configuration**
- Top K results: 5-10 chunks
- Vector score threshold: 0.5 (adjustable)
- Chunk context: 2 chunks before, 1 chunk after
- Filters: By category, file type, date range

**Document Replacement**
- Use document title as key
- Graceful replacement (old version stays until new is ready)
- Automatic cleanup of replaced entries after 7 days

#### 4.1.3 AI Chatbot Interface

**Chat UI Components**
- Clean, ChatGPT-style interface
- Message list (scrollable, auto-scroll to bottom)
- Input field with send button
- Loading indicator (typing animation)
- Streaming responses (word-by-word)
- Message history (session-based, not persisted initially)

**Message Types**
- User message: Plain text question
- AI message: Answer + source citations
- System message: Errors, warnings, info

**Source Citations Display**
```
[AI Response Text]

📄 Quellen:
• Hygieneplan 2024 (Seiten 5-7) [PDF öffnen]
• Sterilisationsprotokoll (Seite 3) [PDF öffnen]
```

**Citation Click Behavior**
- Opens PDF in new tab at specific page (if supported)
- OR downloads PDF with page number in filename
- OR opens in-app PDF viewer scrolled to page

**AI System Prompt (German)**
```
Du bist ein Assistent für Qualitätsmanagement in einer Zahnarztpraxis 
(LZK Baden-Württemberg). 

WICHTIGE REGELN:
1. Beantworte Fragen NUR anhand der bereitgestellten Dokumente
2. Wenn die Information nicht in den Dokumenten steht, sage: 
   "Diese Information finde ich nicht in den verfügbaren Dokumenten."
3. Gib IMMER die Quelle an (Dokumentname und Seitenzahl)
4. Halte Antworten präzise und praxisnah (3-7 Sätze)
5. Verwende einfache, klare Sprache
6. Bei Unsicherheit: Empfehle, das Originaldokument zu prüfen

KONTEXT:
{retrieved_chunks}

FRAGE:
{user_question}
```

**Hallucination Prevention**
- Strict prompt: "Only use provided documents"
- Confidence scoring (if vector score < 0.5, warn user)
- Always cite sources
- Log all queries for review
- User feedback: "War diese Antwort hilfreich?" (thumbs up/down)

**Streaming Implementation**
- Use Vercel AI SDK `useChat` hook
- Stream tokens from OpenAI
- Display partial responses in real-time
- Handle errors gracefully (retry, fallback)

#### 4.1.4 Search Functionality

**Full-Text Search**
- Search document titles and metadata
- Convex built-in search index
- Instant results (< 100ms)

**Semantic Search**
- RAG vector search
- Natural language queries
- Returns relevant chunks + documents
- Ranked by relevance score

**Combined Search**
- Hybrid: Full-text + semantic
- Deduplicate results
- Prioritize exact matches, then semantic

**Search UI**
- Global search bar in header
- Search results page with filters
- Highlight matching terms
- Quick preview of content

---

### 4.2 Phase 2: Enhanced Features (FUTURE)

#### 4.2.1 Advanced Document Features
- Document versioning (track changes over time)
- Bulk upload (zip file with multiple PDFs)
- OCR for scanned documents
- Link scraping (fetch content from LZK handbook URLs)
- Scheduled document review reminders
- Document expiration dates (e.g., annual hygiene plan update)

#### 4.2.2 Enhanced AI Features
- Multi-turn conversations (context awareness)
- Follow-up questions
- Suggested questions based on popular queries
- Document summarization
- Compliance checklist generation
- Practice inspection preparation assistant

#### 4.2.3 Analytics & Insights
- Most searched documents
- Most asked questions
- Staff engagement metrics
- Document usage statistics
- Compliance gaps identification

#### 4.2.4 Integrations
- Dampsoft integration (staff data sync)
- Calendar integration (document review reminders)
- Email notifications (new documents, updates)
- Export to PDF (compliance reports)

---

### 4.3 Phase 3: Authentication & Team Management (LAST PRIORITY)

#### 4.3.1 Better Auth Integration

**Initial Signup (One-Time)**
- Practice owner signs up with email + password
- Email verification required
- After first signup, public registration is disabled
- Owner becomes admin automatically

**Team Management Page**
- Admin-only access
- List all team members (name, email, role, status)
- Add team member:
  - Input: Name, Email, Role (Admin/Employee)
  - Send invitation email via Resend
  - Invitation link expires in 7 days
- Edit team member (change role, deactivate)
- Delete team member (soft delete, preserve audit logs)

**Invitation Flow**
1. Admin enters name + email + role
2. System generates secure token
3. Resend sends email with invitation link
4. Employee clicks link → redirected to set password page
5. Employee sets password → account activated
6. Employee can now login

**Email Template (German)**
```
Betreff: Einladung zur Praxis-QMS-Plattform

Hallo [Name],

Dr. [Admin Name] hat Sie zur Qualitätsmanagement-Plattform der Praxis eingeladen.

Klicken Sie hier, um Ihr Passwort zu setzen und loszulegen:
[Einladungslink]

Dieser Link ist 7 Tage gültig.

Bei Fragen wenden Sie sich bitte an [Admin Email].
```

**Role-Based Access Control**

**Admin Role:**
- Upload/delete documents
- Manage categories
- Invite/manage team members
- View audit logs
- Access all features

**Employee Role:**
- View documents (read-only)
- Download documents
- Use AI chatbot
- Search documents
- Cannot upload, delete, or manage team

**Authentication Flow**
- Login page (email + password)
- Session management (secure cookies)
- Auto-logout after 7 days inactivity
- Password reset via email
- Remember me option (30 days)

**Security Requirements**
- Passwords: Min 8 characters, must include letter + number
- Rate limiting: Max 5 login attempts per 15 minutes
- HTTPS only
- Secure session tokens
- CSRF protection

---

## 5. User Interface Specifications

### 5.1 Language Requirements

**All User-Facing Content in German:**
- Navigation labels
- Button text
- Form labels and placeholders
- Error messages
- Success notifications
- AI chatbot responses
- Email templates
- Help text and tooltips

**All Code/Documentation in English:**
- Variable names
- Function names
- Comments
- Git commits
- Technical documentation
- API endpoints

### 5.2 Layout Structure

**Main Navigation (Sidebar)**
```
┌─────────────────────┐
│  [Practice Logo]    │
├─────────────────────┤
│ 📊 Dashboard        │
│ 📁 Dokumente        │
│ 💬 AI-Assistent     │
│ 👥 Team (Admin)     │
│ 📋 Audit-Logs       │
│ ⚙️  Einstellungen   │
├─────────────────────┤
│ [User Profile]      │
│ Abmelden            │
└─────────────────────┘
```

**Header**
- Global search bar
- Notifications icon (future)
- User avatar + name
- Quick actions (upload document)

**Responsive Design**
- Desktop: Sidebar + main content
- Tablet: Collapsible sidebar
- Mobile: Bottom navigation + hamburger menu

### 5.3 Page Layouts

**Dashboard Page**
- Welcome message: "Willkommen, [Name]"
- Quick stats cards:
  - Total documents
  - Documents by category (pie chart)
  - Recent uploads (last 5)
  - Popular searches (top 5)
- Quick actions:
  - Upload document
  - Ask AI assistant
  - View all documents

**Documents Page**
- Category sidebar (collapsible)
- Document grid/list view toggle
- Filters: Category, file type, date range
- Sort: Name, date, size
- Search bar
- Upload button (admin only)
- Bulk actions (future)

**Document Detail Page**
- Document viewer (PDF, preview for others)
- Metadata panel:
  - Title
  - Category
  - Upload date
  - File size
  - Uploaded by
  - Tags
- Actions: Download, Delete (admin), Share (future)

**AI Chatbot Page**
- Full-screen chat interface
- Sidebar with:
  - New conversation button
  - Conversation history (future)
  - Suggested questions
- Main chat area:
  - Message list
  - Input field
  - Send button
  - Clear conversation button

**Team Management Page** (Admin Only)
- Team member list (table)
- Add member button
- Columns: Name, Email, Role, Status, Actions
- Actions: Edit role, Deactivate, Delete
- Invitation status tracking

### 5.4 UI Components (Shadcn)

**Use Pre-Installed Components:**
- Button, Input, Textarea
- Card, Badge, Avatar
- Dialog, Sheet, Popover
- Table, Tabs, Select
- Toast (notifications)
- Progress, Skeleton (loading states)
- DropdownMenu, Command (search)

**Custom Components to Build:**
- DocumentCard (grid item)
- DocumentList (list item)
- CategoryTree (sidebar navigation)
- ChatMessage (AI/user message)
- SourceCitation (clickable PDF link)
- FileUploader (drag-drop)
- PDFViewer (document viewer)

### 5.5 Design System

**Colors (Tailwind)**
- Primary: Blue (trust, professionalism)
- Success: Green (confirmation)
- Warning: Yellow (caution)
- Error: Red (errors)
- Neutral: Gray (backgrounds, text)

**Typography**
- Headings: Font weight 600-700
- Body: Font weight 400
- Small text: Font size 0.875rem
- Use system fonts for performance

**Spacing**
- Consistent padding: 4, 8, 16, 24, 32px
- Card spacing: 16px padding
- Section spacing: 32px margin

**Accessibility**
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Focus indicators
- Color contrast ratios

---

## 6. Non-Functional Requirements

### 6.1 Performance

**Page Load Times**
- Initial load: < 2 seconds
- Subsequent navigation: < 500ms (SPA)
- Document upload: Progress indicator, no blocking
- AI response: First token < 1 second, full response < 5 seconds

**Optimization Strategies**
- Server-side rendering (Next.js RSC)
- Image optimization (WebP, lazy loading)
- Code splitting (dynamic imports)
- Caching (Convex reactive queries)
- CDN for static assets (Vercel)

### 6.2 Scalability

**Current Scope (Single Practice)**
- Users: 1-20
- Documents: 100-500
- Storage: 1-5 GB
- Queries: 100-500 per day

**Future Scope (Multi-Practice)**
- Practices: 10-100
- Users: 100-2000
- Documents: 10,000-50,000
- Storage: 100-500 GB
- Queries: 10,000-50,000 per day

**Convex Limits**
- Database: Unlimited documents
- File storage: 1GB per file, unlimited total
- Functions: 1M executions/month (free tier)
- Bandwidth: 10GB/month (free tier)

### 6.3 Security

**Data Protection**
- Encryption at rest (Convex default)
- Encryption in transit (TLS 1.3)
- Secure file storage (signed URLs, expiring)
- No patient data in AI prompts (GDPR)

**Access Control**
- Role-based permissions
- Session management (secure cookies)
- Rate limiting (prevent abuse)
- Audit logging (all actions tracked)

**Compliance**
- GDPR (EU data residency)
- Data processing agreement with OpenAI
- Right to deletion (user data export/delete)
- Audit trail (who accessed what, when)

### 6.4 Reliability

**Uptime Target**
- 99.9% availability (Convex SLA)
- Graceful degradation (if AI fails, documents still accessible)

**Error Handling**
- User-friendly error messages (German)
- Automatic retry for transient failures
- Fallback mechanisms (if embedding fails, queue for retry)
- Monitoring and alerts (Convex dashboard)

**Backup & Recovery**
- Convex automatic backups (daily)
- Point-in-time recovery (Convex feature)
- Export functionality (download all documents)

### 6.5 Monitoring

**Metrics to Track**
- API response times
- Error rates
- Document upload success rate
- AI query success rate
- User engagement (active users, queries per user)
- Storage usage

**Tools**
- Convex Dashboard (backend metrics)
- Vercel Analytics (frontend performance)
- OpenAI usage dashboard (API costs)
- Custom logging (audit logs table)

---

## 7. Development Workflow

### 7.1 Phase Execution Order

**Phase 1: Core RAG System (Weeks 1-4) - IN PROGRESS**

**Backend (COMPLETED ✅):**
1. ✅ Convex setup + schema definition
2. ✅ Document upload + storage functions
3. ✅ Text extraction pipeline (placeholder for Phase 2)
4. ✅ RAG integration + embeddings configuration
5. ✅ Categories seeded (8 categories)
6. ✅ Document CRUD operations
7. ✅ File storage integration
8. ✅ Audit logging system

**Frontend (IN PROGRESS 🚧):**
1. 🚧 Document management UI
2. ⏳ Document upload interface
3. ⏳ Document list/viewer
4. ⏳ AI chatbot UI + streaming
5. ⏳ Source citations + PDF links
6. ⏳ Search functionality

**Phase 2: Enhanced Features (Weeks 5-6)**
- Document versioning
- Advanced search
- Analytics dashboard
- Dampsoft integration (mock)

**Phase 3: Authentication (Weeks 7-8)**
- Better Auth setup
- Team management
- Role-based access
- Email invitations

### 7.2 Testing Strategy

**Unit Tests**
- Convex functions (queries, mutations, actions)
- Utility functions (text extraction, chunking)
- React components (Vitest + Testing Library)

**Integration Tests**
- Document upload → RAG ingestion flow
- AI chat → RAG search → response flow
- Authentication flow

**E2E Tests**
- Critical user journeys (Playwright)
- Upload document → search → ask AI → get answer

**Manual Testing**
- German language accuracy
- PDF viewer functionality
- Mobile responsiveness
- Cross-browser compatibility

### 7.3 Deployment

**Environments**
- Development: Local (Convex dev)
- Staging: Vercel preview + Convex dev
- Production: Vercel + Convex prod (EU region)

**CI/CD Pipeline**
- GitHub Actions
- Automated tests on PR
- Preview deployments (Vercel)
- Production deployment on merge to main

**Rollout Strategy**
- Phase 1: Internal testing (dentist only)
- Phase 2: Beta testing (dentist + 2-3 staff)
- Phase 3: Full rollout (all staff)

---

## 8. Success Criteria

### 8.1 MVP Acceptance Criteria

**Must Have (Phase 1)**
- ✅ Admin can upload PDF documents
- ✅ Documents are categorized correctly
- ✅ AI chatbot answers questions using uploaded documents
- ✅ AI responses include source citations with clickable PDF links
- ✅ Staff can search and find documents
- ✅ PDF viewer works in browser
- ✅ All UI text is in German
- ✅ No hallucinations (AI only uses uploaded docs)

**Should Have (Phase 2)**
- Document versioning
- Analytics dashboard
- Advanced search filters

**Could Have (Phase 3)**
- Team management
- Email notifications
- Dampsoft integration

### 8.2 Quality Metrics

**Performance**
- Page load < 2s
- AI response < 5s
- Search results < 500ms

**Accuracy**
- AI answer accuracy: > 90% (based on user feedback)
- Source citation accuracy: 100% (always cite correct document)
- Zero hallucinations

**Usability**
- User satisfaction: > 4/5 stars
- Task completion rate: > 95%
- Support tickets: < 5 per month

**Reliability**
- Uptime: > 99.9%
- Error rate: < 1%
- Document upload success: > 99%

---

## 9. Risks & Mitigations

### 9.1 Technical Risks

**Risk: AI Hallucinations**
- Mitigation: Strict prompts, confidence scoring, always cite sources, user feedback

**Risk: Poor Document Extraction Quality**
- Mitigation: Test with real documents, manual review, fallback to manual text input

**Risk: Slow AI Responses**
- Mitigation: Streaming, optimize chunk retrieval, cache common queries

**Risk: Convex Scaling Limits**
- Mitigation: Monitor usage, optimize queries, plan migration path if needed

### 9.2 Business Risks

**Risk: Low User Adoption**
- Mitigation: User testing, training, clear value demonstration, gather feedback

**Risk: Compliance Issues (GDPR)**
- Mitigation: Legal review, data processing agreements, EU hosting, audit logs

**Risk: Cost Overruns (OpenAI API)**
- Mitigation: Monitor usage, set spending limits, optimize prompts, consider alternatives

### 9.3 User Experience Risks

**Risk: German Language Quality**
- Mitigation: Native speaker review, user testing, iterative improvements

**Risk: Complex UI (Too Many Features)**
- Mitigation: Progressive disclosure, focus on core features first, user feedback

**Risk: Mobile Experience**
- Mitigation: Mobile-first design, responsive testing, touch-friendly UI

---

## 10. Future Roadmap

### 10.1 Post-MVP Features

**Q1 2026**
- Multi-practice support (SaaS model)
- Advanced analytics and reporting
- Mobile app (React Native)
- Offline mode

**Q2 2026**
- Integration marketplace (Dampsoft, other practice software)
- Custom AI training (fine-tuned models)
- Voice interface (ask questions via voice)
- Automated compliance reports

**Q3 2026**
- AI-powered document generation
- Predictive compliance alerts
- Team collaboration features (comments, annotations)
- Video training integration

### 10.2 Monetization Strategy (Future)

**Pricing Tiers**
- Free: Single practice, 100 documents, 500 queries/month
- Pro: €49/month - 500 documents, unlimited queries, priority support
- Enterprise: €199/month - Unlimited, multi-practice, custom integrations

**Revenue Streams**
- Subscription fees
- Premium features (advanced analytics, integrations)
- Professional services (setup, training, custom development)

---

## 11. Appendix

### 11.1 Glossary

- **LZK**: Landeszahnärztekammer (Regional Dental Association)
- **QMS**: Quality Management System
- **RAG**: Retrieval Augmented Generation
- **BuS**: Betriebsärztlicher und Sicherheitstechnischer Dienst (Occupational Health Service)
- **GDPR**: General Data Protection Regulation (DSGVO in German)

### 11.2 References

- LZK Baden-Württemberg Practice Handbook: https://phb.lzk-bw.de/
- Convex Documentation: https://docs.convex.dev/
- Convex RAG Component: https://github.com/get-convex/rag
- Vercel AI SDK: https://sdk.vercel.ai/
- Better Auth: https://www.better-auth.com/
- Shadcn UI: https://ui.shadcn.com/

### 11.3 Contact & Support

**Project Owner**: Dental Practice Owner (Dr. Schmidt)  
**Development Team**: Senior Software Engineer  
**Timeline**: 8 weeks (MVP in 4 weeks)  
**Budget**: TBD (OpenAI API costs primary variable)

---

**Document Status**: ✅ Approved  
**Next Review Date**: After Phase 1 Completion  
**Version History**:
- v1.0 (Oct 22, 2025): Initial PRD created
