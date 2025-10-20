# Integration Guide - Using the Optimized Chat System

## Quick Start

Replace your existing chat component with the optimized version:

### Before (Old Way):
```typescript
// ❌ Old inefficient approach
const [messages, setMessages] = useState([]);

useEffect(() => {
  // Load ALL messages at once
  supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .then(({ data }) => setMessages(data));
    
  // Re-render on every single message
  const channel = supabase
    .channel('messages')
    .on('postgres_changes', {}, (payload) => {
      setMessages(prev => [...prev, payload.new]);  // Expensive!
    })
    .subscribe();
}, []);

// Upload without compression
const handleUpload = async (file) => {
  await supabase.storage
    .from('chat-media')
    .upload(path, file);  // No compression, no deduplication
};
```

### After (Optimized):
```typescript
// ✅ New optimized approach
import { useEfficientChat } from '@/hooks/useEfficientChat';

const {
  messages,
  loading,
  hasMore,
  sendMessage,
  sendMediaMessage,
  forwardMessage,
  loadOlder,
} = useEfficientChat({
  conversationId,
  userId,
  messagesPerPage: 30,
  enableCache: true,  // Instant loads from cache
});

// That's it! All optimizations are automatic:
// - Batched realtime updates (100ms windows)
// - Compressed media uploads
// - Deduplication
// - Smart caching
// - Lazy pagination
```

---

## Feature Examples

### 1. Send Text Message
```typescript
await sendMessage('Hello!');
// Instant UI update, batched realtime
```

### 2. Send Media with Compression
```typescript
const file = event.target.files[0];
await sendMediaMessage(file, 'Check this out!');
// Automatically:
// - Compresses image
// - Generates thumbnail
// - Checks for duplicates
// - Uploads to CDN
```

### 3. Forward Message (Zero Re-upload)
```typescript
await forwardMessage(messageId, targetConversationId);
// Reuses existing media URL
// No download, no re-upload
// Saves 100% bandwidth
```

### 4. Load Older Messages
```typescript
{hasMore && (
  <button onClick={loadOlder}>
    Load More
  </button>
)}
```

---

## Update Existing Chat Component

### Step 1: Replace the hook

```typescript
// OLD:
const [messages, setMessages] = useState([]);
const [loading, setLoading] = useState(true);

// NEW:
const {
  messages,
  loading,
  sendMessage,
  sendMediaMessage,
  forwardMessage,
  loadOlder,
  hasMore,
} = useEfficientChat({ conversationId, userId });
```

### Step 2: Update send handlers

```typescript
// OLD:
const handleSend = async () => {
  await supabase.from('messages').insert({ ... });
};

// NEW:
const handleSend = async () => {
  await sendMessage(inputText);
};
```

### Step 3: Update media upload

```typescript
// OLD:
const handleMediaUpload = async (file) => {
  const { data } = await supabase.storage.from('chat-media').upload(...);
  await supabase.from('messages').insert({ media_url: data.path });
};

// NEW:
const handleMediaUpload = async (file) => {
  await sendMediaMessage(file, caption);
  // Handles compression, deduplication, thumbnail automatically
};
```

### Step 4: Add forward button

```typescript
const handleForward = async (messageId) => {
  const targetConversation = await showConversationPicker();
  await forwardMessage(messageId, targetConversation);
  toast.success('Message forwarded!');
};
```

---

## Advanced: Direct Service Usage

### Compress Images Manually
```typescript
import { compressImage, generateThumbnail } from '@/services/mediaCompression';

const compressed = await compressImage(file, {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
});

const thumbnail = await generateThumbnail(file, 200);
```

### Upload with Deduplication
```typescript
import { uploadMedia } from '@/services/storageService';

const result = await uploadMedia(file, userId, conversationId);

console.log(result);
// {
//   url: 'https://...',
//   thumbnailUrl: 'https://...',
//   hash: 'sha256...',
//   size: 123456,
//   isDuplicate: false  // or true if file already exists
// }
```

### Manual Cache Management
```typescript
import { 
  cacheMessages, 
  getCachedMessages,
  getCacheStats,
  clearCache 
} from '@/services/cacheService';

// Cache messages
await cacheMessages(conversationId, messages);

// Get from cache
const cached = await getCachedMessages(conversationId);

// Check cache size
const stats = await getCacheStats();
console.log(`Using ${stats.mediaSizeMB}MB for media cache`);

// Clear cache
await clearCache();
```

### Optional Encryption
```typescript
import { 
  generateKey, 
  encryptData, 
  decryptData,
  encryptFile 
} from '@/services/encryptionService';

// Generate encryption key
const key = await generateKey();

// Encrypt message
const { encrypted, iv } = await encryptData('Secret message', key);

// Store encrypted
await supabase.from('messages').insert({
  content: encrypted,
  encryption_iv: iv,
  // Store key securely (e.g., encrypted with user's password)
});

// Decrypt later
const decrypted = await decryptData(encrypted, iv, key);
```

---

## Migration Checklist

- [ ] Replace message loading logic with `useEfficientChat`
- [ ] Update send message handler to use `sendMessage`
- [ ] Update media upload to use `sendMediaMessage`
- [ ] Add forward functionality with `forwardMessage`
- [ ] Add "Load More" button with `loadOlder`
- [ ] Remove old realtime subscriptions (hook handles it)
- [ ] Remove manual caching code (hook handles it)
- [ ] Test offline functionality
- [ ] Monitor cache size with `getCacheStats`

---

## Performance Checklist

After integration, verify these improvements:

### Expected Improvements:
- ✅ Initial load: <300ms (with cache)
- ✅ New messages appear instantly
- ✅ No lag when receiving multiple messages
- ✅ Forwarding takes <100ms
- ✅ Media uploads are compressed
- ✅ Duplicate media is detected
- ✅ Works offline (shows cached messages)

### How to Verify:
1. Open DevTools → Network tab
2. Send same image twice → second upload should be instant (deduplicated)
3. Forward a message → check Network tab, no file download/upload
4. Go offline → chat still loads (from cache)
5. Monitor memory usage → should stay under 100MB

---

## Troubleshooting

### Messages not loading from cache
```typescript
// Check cache stats
import { getCacheStats } from '@/services/cacheService';
const stats = await getCacheStats();
console.log(stats);  // Should show cached messages

// Clear and rebuild cache
import { clearCache } from '@/services/cacheService';
await clearCache();
await loadMessages();  // Will rebuild cache
```

### Media uploads failing
```typescript
// Check if chat-media bucket exists
const { data } = await supabase.storage.listBuckets();
console.log(data);  // Should include 'chat-media'

// Check storage policies
// Go to Lovable Backend → Storage → chat-media → Policies
```

### Deduplication not working
```typescript
// Check media_files table
const { data } = await supabase.from('media_files').select('*');
console.log(data);  // Should show uploaded files with hashes
```

---

## Next Steps

1. **Monitor Performance**: Use browser DevTools to verify optimizations
2. **Add Encryption**: Implement optional E2E encryption for sensitive chats
3. **Implement Service Worker**: For true offline-first experience
4. **Add Media Viewer**: With zoom, swipe gestures
5. **Voice Messages**: Use same compression/deduplication for audio

---

## Support

- 📖 Read `ARCHITECTURE.md` for deep dive
- 🔍 Check browser console for logs
- 💬 Test with different network conditions (DevTools → Network tab → Slow 3G)
