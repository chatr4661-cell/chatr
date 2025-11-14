# CHATR Backend Mock Server

Mock backend server for CHATR native mobile apps with WebSocket support for real-time messaging.

## Features

- RESTful API endpoints for messages
- WebSocket server for real-time messaging
- Message delivery and read receipts
- Typing indicators
- User presence tracking
- Message reactions

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Running the Server

```bash
npm start
```

Server will start on `http://localhost:3000`

### Docker

```bash
docker build -t chatr-backend-mock .
docker run -p 3000:3000 chatr-backend-mock
```

## API Endpoints

### Messages

#### Get Messages
```
GET /api/messages/:conversationId
Query params: limit (default 50), offset (default 0)
```

#### Send Message
```
POST /api/messages
Body: {
  conversationId: string,
  senderId: string,
  senderName: string,
  content: string,
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'VOICE_NOTE'
}
```

## WebSocket Events

### Client → Server

- `send_message` - Send a new message
- `typing_start` - User started typing
- `typing_stop` - User stopped typing
- `mark_delivered` - Mark message as delivered
- `mark_read` - Mark messages as read
- `add_reaction` - Add reaction to message

### Server → Client

- `message` - New message received
- `message_delivered` - Message delivery confirmation
- `message_read` - Message read confirmation
- `typing_start` - User started typing
- `typing_stop` - User stopped typing
- `user_presence` - User online/offline status

## Environment Variables

```
PORT=3000
NODE_ENV=development
```
