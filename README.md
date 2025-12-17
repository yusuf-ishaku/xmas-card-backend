# Christmas Card Backend Documentation

This document outlines the backend architecture for the Christmas Card platform, a service for creating and sharing personalized Christmas greetings. Users (senders) authenticate to create messages, which can be either text-based (rendered on a themed card) or video-based. Messages are protected by a sender-defined password and accessible via a unique slug (UUID). Recipients provide their name and the password to open messages, enabling analytics tracking (e.g., opens, downloads, by whom). Replies and downloads do not require authentication but use the recipient's provided name for logging.

The backend uses:
- **Express** for the server.
- **TypeScript** for type safety.
- **Zod** and **Zod-form-data** for schema validation.
- **Multer** for handling file uploads (videos or images).
- **Supabase** as the PostgreSQL database for storing metadata and analytics.
- **Cloudinary** for storing all assets (videos and card images).

Key logic:
- **Authentication**: Senders use magic link via email for creation. Recipients are unauthenticated but must provide name and password for access.
- **Message Creation**: Sender provides recipient name, message type (text or video, exclusive), theme, password (optional hint), optional email for open notifications. Generate UUID slug. Upload assets to Cloudinary (video directly; for text, assume frontend generates card image and uploads via backend).
- **Access Control**: Password verifies access. Log opens/downloads with recipient name.
- **Notifications**: Email sender on message open (if email provided).
- **Analytics**: Track opens (count, by name, timestamps) and downloads (count, by name).
- **Exclusivity**: Text and video cannot coexist in one message.
- **Asset Handling**: Use Cloudinary for videos and card images (text messages rendered as images).

## Database Schema

Use Supabase (PostgreSQL) tables. Define with SQL for clarity; implement via Supabase dashboard or migrations.

### Table: users
Stores sender info (from magic link auth).
- id: UUID PRIMARY KEY DEFAULT uuid_generate_v4()
- email: TEXT UNIQUE NOT NULL
- name: TEXT NOT NULL  // Sender's full name
- created_at: TIMESTAMP DEFAULT NOW()

### Table: messages
Stores message metadata.
- id: UUID PRIMARY KEY DEFAULT uuid_generate_v4()  // Internal ID
- slug: UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4()  // Shareable link part
- recipient_first_name: TEXT NOT NULL
- recipient_last_name: TEXT NOT NULL
- type: TEXT NOT NULL CHECK (type IN ('text', 'video'))  // Exclusive: text or video
- theme: TEXT NOT NULL  // Card theme (e.g., 'festive', 'snowy')
- password: TEXT NOT NULL  // Hashed for security
- password_hint: TEXT  // Optional
- sender_email: TEXT  // Optional, for notifications
- asset_url: TEXT NOT NULL  // Cloudinary URL (video or card image)
- sender_id: UUID REFERENCES users(id) ON DELETE CASCADE
- created_at: TIMESTAMP DEFAULT NOW()

### Table: opens
Tracks message opens.
- id: SERIAL PRIMARY KEY
- message_id: UUID REFERENCES messages(id) ON DELETE CASCADE
- opener_first_name: TEXT NOT NULL
- opener_last_name: TEXT NOT NULL
- timestamp: TIMESTAMP DEFAULT NOW()

### Table: downloads
Tracks downloads (video file or card image).
- id: SERIAL PRIMARY KEY
- message_id: UUID REFERENCES messages(id) ON DELETE CASCADE
- downloader_first_name: TEXT NOT NULL
- downloader_last_name: TEXT NOT NULL
- timestamp: TIMESTAMP DEFAULT NOW()

### Table: replies
Stores replies to messages.
- id: SERIAL PRIMARY KEY
- message_id: UUID REFERENCES messages(id) ON DELETE CASCADE
- reply_text: TEXT NOT NULL
- replier_first_name: TEXT NOT NULL
- replier_last_name: TEXT NOT NULL
- timestamp: TIMESTAMP DEFAULT NOW()

Indexes:
- On messages(slug) for fast lookup.
- On opens(message_id), downloads(message_id), replies(message_id) for analytics queries.

## Endpoints

All endpoints use JSON unless specified. Validate with Zod/Zod-form-data. Handle errors (e.g., 401 for invalid password, 404 for missing slug).

### Authentication (for Senders)
- **POST /auth/send-magic-link**
  - Purpose: Send magic link to sender's email.
  - Body: { email: string, name: string }  // Zod: z.object({ email: z.string().email(), name: z.string().min(1) })
  - Logic: Generate token, store temporarily (e.g., in Supabase or Redis), email link with token.
  - Response: { success: true, message: "Magic link sent" } | 400 error.

- **POST /auth/verify-magic-link**
  - Purpose: Verify token and issue session (e.g., JWT).
  - Body: { token: string }  // Zod: z.object({ token: z.string() })
  - Logic: Validate token, create/find user, return JWT.
  - Response: { success: true, token: string } | 401 error.

### Message Management
- **POST /messages** (Auth required: JWT from magic link)
  - Purpose: Create message.
  - Body (multipart/form-data via Multer): 
    - recipientFirstName: string
    - recipientLastName: string
    - type: 'text' | 'video'
    - theme: string
    - password: string
    - hint?: string
    - senderEmail?: string
    - file?: File (video for 'video'; card image for 'text' – assume frontend generates image)
    - text?: string (for 'text' type only)
  - Zod: Use zod-form-data for parsing.
  - Logic: 
    1. Validate exclusivity (text or file, not both).
    2. Upload file to Cloudinary, get URL.
    3. For text: Assume text is provided, but image generation unknown – store text temporarily if needed, upload generated image.
    4. Hash password (e.g., bcrypt).
    5. Insert into messages table with sender_id from JWT.
    6. Generate slug (UUID).
  - Response: { success: true, slug: string } | 400 error.

- **GET /messages/:slug/exists**
  - Purpose: Check if slug exists (unauth).
  - Logic: Query messages by slug.
  - Response: { success: true, exists: boolean } | 404 if invalid.

- **POST /messages/:slug/open**
  - Purpose: Validate access and log open (unauth).
  - Body: { firstName: string, lastName: string, password: string }  // Zod: z.object({ firstName: z.string().min(1), lastName: z.string().min(1), password: z.string().min(1) })
  - Logic: 
    1. Find message by slug.
    2. Verify password (compare hash).
    3. Insert into opens table.
    4. If senderEmail, send notification email (e.g., via Nodemailer or Supabase edge function).
    5. Return message content (asset_url, type, theme).
  - Response: { success: true, type: string, assetUrl: string, theme: string } | 401 invalid password.

- **GET /messages/:slug/download**
  - Purpose: Download asset (unauth, but requires prior open – enforce?).
  - Query: ?firstName=string&lastName=string
  - Logic: 
    1. Assume called after open; use provided name.
    2. Insert into downloads table.
    3. Redirect to Cloudinary asset_url or stream file.
  - Response: File stream | 400 missing name.

- **POST /messages/:slug/reply**
  - Purpose: Add reply (unauth).
  - Body: { firstName: string, lastName: string, replyText: string }  // Zod validation.
  - Logic: Insert into replies table.
  - Response: { success: true } | 400 error.

### Analytics (Auth required: for senders?)
- **GET /messages/:slug/analytics** (Optional: Auth if sender-only)
  - Purpose: Get opens, downloads, replies for a message.
  - Logic: Query opens, downloads, replies by message_id; aggregate counts, lists.
  - Response: { opens: { count: number, details: array }, downloads: { count: number, details: array }, replies: array }

## Data Access Functions

Implement as TypeScript functions (e.g., in a repository layer). Use Supabase client for queries.

- **createUser(email: string, name: string): Promise<User>**
  - Insert or upsert into users.

- **getMessageBySlug(slug: string): Promise<Message | null>**
  - SELECT * FROM messages WHERE slug = ? LIMIT 1

- **createMessage(data: MessageData): Promise<{ id: string, slug: string }>**
  - INSERT INTO messages (...) VALUES (...) RETURNING id, slug

- **logOpen(messageId: string, firstName: string, lastName: string): Promise<void>**
  - INSERT INTO opens (message_id, opener_first_name, opener_last_name)

- **logDownload(messageId: string, firstName: string, lastName: string): Promise<void>**
  - Similar to logOpen.

- **addReply(messageId: string, firstName: string, lastName: string, text: string): Promise<void>**
  - INSERT INTO replies

- **getAnalytics(slug: string): Promise<Analytics>**
  - Multiple SELECT COUNT(*) and SELECT * queries on opens/downloads/replies, joined on messages.slug.

- **uploadToCloudinary(file: MulterFile): Promise<string>**
  - Use Cloudinary SDK to upload, return secure URL.

Hash passwords in createMessage. Send emails via a queue or Supabase functions for notifications.

## Conflicts and Overrides

- **Database Override**: Old README used Firestore; now use Supabase (PostgreSQL). Migrate if needed.
- **Auth Endpoints Override**: Old /login and /verify-user replaced with /auth/send-magic-link and /auth/verify-magic-link for clarity.
- **Card Creation Body Override**: Added recipient names, type, theme, file/text handling; old lacked these.
- **Retrieval Endpoint Override**: Old GET /cards/:slug?pass={password}; now POST /messages/:slug/open with body for name/password to enable logging before access.
- **Reply Endpoint Override**: Old POST /cards/:slug/reply/; now requires name in body.
- **Potential Conflict**: Text card image generation unclear – backend assumes frontend provides image file; discuss if backend should generate (e.g., via library like Sharp).
- **Potential Conflict**: No endpoint for sender to view own messages/analytics – add if needed?
- **Potential Conflict**: Password hashing not mentioned; implement for security.
- **Potential Conflict**: Email notifications implementation (library?); ensure senderEmail is used only for opens.
- **Potential Conflict**: Download endpoint lacks password check; assume opens handle access, but downloads could bypass – add check?
- **Potential Conflict**: No deletion/expiry for messages; consider for Christmas-limited project.