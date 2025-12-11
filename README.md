# xmas-card-backend

This is the backend service powering the Christmas Card platform — an app that lets users create and share personalized Christmas greetings. Users can upload or record a short video, attach a short text message, and receive a unique link they can send to loved ones.

The backend handles the core functionality of the platform, including:

### • Video storage

Uses **Cloudinary** to upload and store user-submitted videos.

### • Card creation

Stores card metadata such as the video URL, message, and slug in **Firestore** via Firebase Admin SDK.

### • Card retrieval

Provides a simple slug-based retrieval system so each card can be accessed through a shareable link.

### • Environment safety

All secrets (Cloudinary + Firebase Service Account) are validated at runtime to prevent misconfigured deployments.

### • Express server

A lightweight Express app exposes the HTTP endpoints required to create and fetch Christmas cards.

---

## API Endpoints

### Authentication

#### POST `/login`

Sends a magic link to the user's email for authentication.

**Request Body:**

```json
{
  "email": "user@example.com",
  "name": "John Doe"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Magic link sent to your email"
}
```

#### POST `/verify-user`

Sends a magic link to the user's email for authentication.

**Request Body:**

```json
{
  "token": "token"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Magic link sent to your email"
}
```

### Card Management

### POST `/cards`

Create new card. send either video or message.
**Request Body:**

```json
{
  "video": File, (optional)
  "message": "Merry Christmas!",(optional)
  "password": "together-one-day",
  "hint": "what we want to do"
}
```

**Response:**

```json
{
  "success": true,
  "card": {
    "slug": "unique-card-slug"
  }
}
```

### GET `/card/exist/:slug`

check if card Exists
**Response:**

```json
{
  "success": true,
  "exists": true
}
```

### GET `/cards/:slug?pass={password}`

Retrieve card by slug.
**Response:**

```json
{
  "success": true,
  "card": {
    "videoUrl": "https://res.cloudinary.com/your-cloud/video/upload/v1234567890/your-video.mp4",
    "message": "Merry Christmas!"
  }
}
```

### POST `/cards/:slug/reply/`

Reply to a card by slug.
**Request Body:**

```json
{
  "replyMessage": "Thank you! Merry Christmas to you too!"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Reply added successfully"
}
```
