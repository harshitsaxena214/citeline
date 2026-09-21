# Citeline Frontend Architecture

This document explains the architecture and design decisions of the Citeline frontend.

### 1. Page layout
The application uses a responsive split-pane layout on desktop and a single column on mobile. 
- **Desktop**: A sidebar (`<aside>`) on the left holds the documents list and upload button. The main content area (`<main>`) on the right holds the chat window and input box.
- **Mobile**: The sidebar collapses into a hidden `Sheet` component (from shadcn/ui) accessible via a hamburger menu in the header. The chat interface takes up the full width, ensuring usability at 375px.

### 2. State in page.tsx
All application state (`documents`, `selectedDocs`, `messages`, `isPending`, `isWaking`) is intentionally lifted up to `page.tsx` instead of being scattered across small contextual providers or state management libraries (Redux, Zustand, React Query). 
- **Why**: The application's state tree is small and flat. Passing props directly down to presentation components (like `ChatWindow`, `DocumentPanel`) keeps the data flow explicit, highly predictable, and simple to debug. It adheres to the constraint of avoiding unnecessary abstractions.

### 3. API contract
The frontend interfaces with the Citeline backend via five primary endpoints defined in `lib/api.ts`:
- `GET /health`: Called on initial load to wake up the server (e.g., cold starts on Neon/Render).
- `GET /documents`: Fetches the list of all documents belonging to the current session.
- `POST /documents`: Uploads a single PDF (multipart form data) to the server.
- `DELETE /documents/{id}`: Removes a document and its chunks from the backend.
- `POST /chat`: Submits a question and selected document IDs to receive an AI response.

### 4. Session ID handling
A session ID is essential for isolating user data on the stateless backend. It is managed in `lib/session.ts`.
- On startup, the system retrieves `citeline_session_id` from `localStorage`.
- If missing or invalid, it generates a new UUID using `crypto.randomUUID()` and saves it.
- To prevent crashes in strict privacy environments, `localStorage` access is wrapped in `try/catch`. If `localStorage` is completely blocked, it falls back to a global in-memory variable `__citelineInMemorySession`.

### 5. Error handling
Errors are intentionally handled where they provide the most context to the user, without exposing internal details:
- **HTTP/Network Errors**: If an API call fails or times out, a generic "Could not reach the server, try again." message is thrown.
- **Rate Limits & Sizing (429 & 413)**: Specifically caught to show clear, actionable feedback ("Too many requests" or "File too large").
- **Upload/Delete**: Failures trigger a non-blocking toast notification (`sonner`) because they happen asynchronously in the background or side-panels.
- **Chat**: Chat errors are rendered directly inside the chat thread as an assistant error message bubble. A "Retry" button allows the user to re-submit the failed question manually. There are no automatic retries, respecting backend rate limits.

### 6. Plain-text answers
Model answers and document filenames are explicitly rendered as plain text (e.g., using `whitespace-pre-wrap` via CSS instead of HTML/Markdown renderers or `dangerouslySetInnerHTML`).
- **Why**: Rendering unescaped AI output or user-provided filenames as HTML introduces severe XSS (Cross-Site Scripting) vulnerabilities. By strictly treating responses as text, we guarantee malicious payloads cannot execute in the browser. It also keeps the bundle size minimal by excluding Markdown parsing libraries.

### 7. Local development
To run the frontend locally:
1. Ensure the backend is running locally on port 8000.
2. In the `frontend` folder, create a `.env` file containing `NEXT_PUBLIC_API_URL=http://localhost:8000`.
3. Run `npm install` followed by `npm run dev`.
4. Access the application at `http://localhost:3000`.

### 8. Vercel deployment
To deploy to Vercel:
1. Import the project repository into the Vercel dashboard. Set the Root Directory to `frontend`.
2. In the Environment Variables configuration, add `NEXT_PUBLIC_API_URL` and set it to your production backend URL (e.g., `https://api.example.com`).
3. Deploy the application. Vercel will automatically build using `next build`.

### 9. Interview questions

1. **Why is the core state kept in `page.tsx` instead of using Context or Redux?**
   The application state is small and highly coupled. `page.tsx` acts as the single source of truth, minimizing boilerplate and making data flow easy to trace without relying on heavy external libraries.

2. **Why use plain `fetch` instead of Axios or React Query?**
   Plain `fetch` is built into modern browsers and Node, meaning zero extra dependencies. The application's data requirements are straightforward (no complex polling, background refetching, or advanced caching needed), making heavy fetching libraries overkill.

3. **How does the application handle users in Incognito mode where `localStorage` might throw exceptions?**
   Session initialization wraps `localStorage` calls in a `try/catch` block. If accessing storage throws a DOMException, the application gracefully falls back to an in-memory UUID variable, allowing the session to work temporarily.

4. **How are HTTP 429 (Rate Limit) errors presented to the user?**
   The API wrapper intercepts the 429 status code and translates it to a user-friendly error message ("Too many requests, please wait a minute"), which is then displayed via a toast or in-thread chat error.

5. **Why validate file size and type on the frontend if the backend already does it?**
   Frontend validation provides immediate feedback, preventing the user from wasting time and bandwidth uploading a 50MB file or an image, only for the server to reject it seconds later.

6. **Why are AI responses rendered as plain text rather than Markdown?**
   Security and simplicity. Avoiding Markdown parsers eliminates XSS vectors via malicious or hallucinated HTML/script tags in the LLM's response, and strictly enforces the security requirement of no `dangerouslySetInnerHTML`.

7. **How does the UI prevent a user from selecting more than two documents?**
   The `DocumentPanel` checks the length of the `selectedDocs` array. If it equals or exceeds 2, it conditionally disables the checkboxes of all currently unselected documents.

8. **How does Vercel know where to send API requests in production?**
   The `NEXT_PUBLIC_API_URL` environment variable is configured in the Vercel project settings. Next.js bakes this URL into the client-side bundle at build time, allowing the `fetch` calls to point to the production backend.
