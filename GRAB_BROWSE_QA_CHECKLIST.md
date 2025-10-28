# QA Checklist - Grab & Browse Feature

## Functional Testing

### Gesture Screenshot

- [ ] **GS-1**: Camera permission prompt appears on first use
- [ ] **GS-2**: Camera feed displays in preview window (mirrored)
- [ ] **GS-3**: Hand bounding box appears when hand detected
- [ ] **GS-4**: Open palm gesture detected (green box)
- [ ] **GS-5**: Closed fist gesture detected (red box)
- [ ] **GS-6**: Screenshot captured after open palm → fist sequence
- [ ] **GS-7**: Haptic feedback on capture (mobile)
- [ ] **GS-8**: Toast notification on successful capture
- [ ] **GS-9**: 2-second cooldown prevents accidental re-capture
- [ ] **GS-10**: Close button exits gesture mode and stops camera
- [ ] **GS-11**: Works with front and rear cameras (mobile)
- [ ] **GS-12**: Fallback manual capture button available
- [ ] **GS-13**: Camera stops when switching to other app tabs
- [ ] **GS-14**: Works in portrait and landscape (mobile)
- [ ] **GS-15**: False positive rate <5% (requires 6 stable frames)

**Acceptance Criteria:**
- Gesture detection latency <200ms (average)
- Screenshot capture latency <500ms
- False positive rate <5%
- Camera permission UX clear and user-friendly

---

### File Transfer

- [ ] **FT-1**: Transfer UI appears after screenshot capture
- [ ] **FT-2**: File name and size displayed correctly
- [ ] **FT-3**: WebRTC connection establishes <3s
- [ ] **FT-4**: Progress bar updates during transfer
- [ ] **FT-5**: Transfer completes successfully (local network)
- [ ] **FT-6**: Transfer completes successfully (internet via TURN)
- [ ] **FT-7**: File integrity verified (checksum match)
- [ ] **FT-8**: Received file opens correctly
- [ ] **FT-9**: Cancel transfer works mid-transfer
- [ ] **FT-10**: Encryption indicators visible (lock icon)
- [ ] **FT-11**: Connection status updates (connecting, connected, transferring)
- [ ] **FT-12**: Error handling for network drop
- [ ] **FT-13**: Retry mechanism works for failed chunks
- [ ] **FT-14**: Works with files up to 100MB
- [ ] **FT-15**: Multiple transfers don't interfere

**Acceptance Criteria:**
- Transfer speed >10MB/s (local WiFi)
- Connection establishment <3s
- 100% data integrity (checksum verification)
- Graceful error recovery

---

### AI Browser

- [ ] **AB-1**: Search input accepts text
- [ ] **AB-2**: Search triggered by Enter key
- [ ] **AB-3**: Search triggered by button click
- [ ] **AB-4**: Loading state displays during search
- [ ] **AB-5**: Results appear within 2s (cached) or 5s (fresh)
- [ ] **AB-6**: At least 5 results displayed
- [ ] **AB-7**: Results include title, snippet, URL, favicon
- [ ] **AB-8**: AI summary appears above results
- [ ] **AB-9**: Summary includes TL;DR, bullets, follow-ups
- [ ] **AB-10**: Citations linked to original sources
- [ ] **AB-11**: Follow-up questions clickable
- [ ] **AB-12**: Recommendations appear in separate section
- [ ] **AB-13**: Recommendations show relevance score
- [ ] **AB-14**: External links open in new tab
- [ ] **AB-15**: Error handling for API rate limits (429)
- [ ] **AB-16**: Error handling for API quota (402)
- [ ] **AB-17**: Fallback search when APIs unavailable
- [ ] **AB-18**: Search history persists in session
- [ ] **AB-19**: Cache prevents duplicate API calls
- [ ] **AB-20**: Mobile-responsive layout

**Acceptance Criteria:**
- Search latency <2s (with cache)
- AI summary latency <3s
- Minimum 5 results displayed
- Rate limit errors surfaced to user
- Lighthouse Performance ≥90

---

## Performance Testing

### Browser Benchmarks

- [ ] **PF-1**: Lighthouse Performance score ≥90
- [ ] **PF-2**: Lighthouse Accessibility score ≥90
- [ ] **PF-3**: Lighthouse Best Practices score ≥90
- [ ] **PF-4**: Lighthouse SEO score ≥90
- [ ] **PF-5**: First Contentful Paint <1.5s
- [ ] **PF-6**: Largest Contentful Paint <2.5s
- [ ] **PF-7**: Cumulative Layout Shift <0.1
- [ ] **PF-8**: Time to Interactive <3.5s

### Resource Usage

- [ ] **PF-9**: CPU usage <30% during gesture detection (idle)
- [ ] **PF-10**: CPU usage <50% during gesture detection (active)
- [ ] **PF-11**: Memory usage <200MB incremental
- [ ] **PF-12**: Network usage reasonable (no data leaks)
- [ ] **PF-13**: Battery usage acceptable on mobile (<10%/hour)

### Latency Targets

- [ ] **PF-14**: Gesture detection: <200ms (p50), <300ms (p95)
- [ ] **PF-15**: Screenshot capture: <500ms (p50), <1000ms (p95)
- [ ] **PF-16**: WebRTC connection: <3s (p50), <5s (p95)
- [ ] **PF-17**: File transfer 10MB local: <1s (p50), <2s (p95)
- [ ] **PF-18**: Search aggregation: <1s (p50), <2s (p95)
- [ ] **PF-19**: AI summarization: <2s (p50), <3s (p95)

---

## Security Testing

- [ ] **SEC-1**: Camera frames not uploaded (verify network tab)
- [ ] **SEC-2**: Screenshot not auto-uploaded (verify network tab)
- [ ] **SEC-3**: WebRTC DataChannel encrypted (check dtls)
- [ ] **SEC-4**: ECDH key exchange successful
- [ ] **SEC-5**: AES-GCM encryption/decryption works
- [ ] **SEC-6**: Checksum verification detects tampering
- [ ] **SEC-7**: Signaling messages deleted after 5 min
- [ ] **SEC-8**: No secrets in client-side code
- [ ] **SEC-9**: API keys properly secured in Supabase Secrets
- [ ] **SEC-10**: CORS headers properly configured
- [ ] **SEC-11**: CSP headers prevent XSS
- [ ] **SEC-12**: No PII in analytics events
- [ ] **SEC-13**: TLS 1.3 used for all network calls
- [ ] **SEC-14**: Rate limiting prevents abuse

**Penetration Testing:**
- [ ] **SEC-15**: Cannot bypass camera permission
- [ ] **SEC-16**: Cannot intercept unencrypted file data
- [ ] **SEC-17**: Cannot replay old signaling messages
- [ ] **SEC-18**: Cannot inject malicious AI responses

---

## Accessibility Testing

- [ ] **A11Y-1**: All interactive elements keyboard navigable
- [ ] **A11Y-2**: Tab order logical
- [ ] **A11Y-3**: Focus indicators visible
- [ ] **A11Y-4**: Screen reader announces state changes
- [ ] **A11Y-5**: ARIA labels on all icon buttons
- [ ] **A11Y-6**: Color contrast ≥4.5:1 for text
- [ ] **A11Y-7**: Alternative to gestures available (manual capture)
- [ ] **A11Y-8**: Forms have proper labels
- [ ] **A11Y-9**: Error messages descriptive
- [ ] **A11Y-10**: Success messages announced to screen readers

---

## Compatibility Testing

### Desktop Browsers

- [ ] **COMP-1**: Chrome 90+ (Windows, Mac, Linux)
- [ ] **COMP-2**: Firefox 88+ (Windows, Mac, Linux)
- [ ] **COMP-3**: Safari 14+ (Mac)
- [ ] **COMP-4**: Edge 90+ (Windows)

### Mobile Browsers

- [ ] **COMP-5**: Chrome Mobile (Android 8+)
- [ ] **COMP-6**: Safari Mobile (iOS 14+)
- [ ] **COMP-7**: Firefox Mobile (Android 8+)
- [ ] **COMP-8**: Samsung Internet (Android 8+)

### Devices

- [ ] **COMP-9**: iPhone 12+
- [ ] **COMP-10**: Samsung Galaxy S21+
- [ ] **COMP-11**: Google Pixel 5+
- [ ] **COMP-12**: iPad Pro
- [ ] **COMP-13**: Mid-range Android tablet

---

## User Experience Testing

- [ ] **UX-1**: Onboarding clear for first-time users
- [ ] **UX-2**: Privacy notice displays before camera access
- [ ] **UX-3**: Gesture instructions visible
- [ ] **UX-4**: Haptic feedback feels natural
- [ ] **UX-5**: Loading states prevent confusion
- [ ] **UX-6**: Error messages actionable
- [ ] **UX-7**: Success feedback satisfying
- [ ] **UX-8**: UI responsive and smooth (60fps)
- [ ] **UX-9**: Mobile touch targets ≥44x44px
- [ ] **UX-10**: Design consistent with Chatr brand

---

## Regression Testing

After each code change, verify:

- [ ] **REG-1**: Existing features still work
- [ ] **REG-2**: No new console errors
- [ ] **REG-3**: No new accessibility violations
- [ ] **REG-4**: Performance budgets still met
- [ ] **REG-5**: Build process completes without errors

---

## Acceptance Criteria Summary

### Must Have (P0)
✅ Gesture screenshot works reliably (>95% success rate)  
✅ File transfer E2E encrypted and functional  
✅ AI search returns relevant results with summaries  
✅ All security measures implemented  
✅ Works on Chrome/Safari/Firefox (desktop + mobile)  
✅ Lighthouse Performance ≥80  
✅ Lighthouse Accessibility ≥80  

### Should Have (P1)
✅ Gesture latency <200ms (p50)  
✅ Transfer speed >10MB/s (local)  
✅ AI summary latency <2s  
✅ Haptic feedback on mobile  
✅ Recommendations personalized  

### Nice to Have (P2)
✅ Offline fallback for search  
✅ Voice input for search  
✅ AR overlays on gestures  
✅ Multi-language support  

---

## Sign-Off

- [ ] **Product Owner**: Feature meets requirements
- [ ] **QA Lead**: All P0 and P1 tests pass
- [ ] **Security Lead**: Security review complete
- [ ] **Accessibility Lead**: WCAG 2.1 AA compliant
- [ ] **Performance Lead**: Budgets met
- [ ] **Legal**: Privacy policy approved

**Date:** ___________  
**Release Version:** ___________
