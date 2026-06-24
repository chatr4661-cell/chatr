# Google Play Console Compliance Guide

> This guide helps Chatr successfully pass Google Play Store review by ensuring the public Privacy Policy is accurate and the Play Console permission declarations are properly filled out.

---

## 1. Privacy Policy Update

**Where to put this:** Add the section below directly to your public-facing Privacy Policy on your website. Google reviewers will read this page to ensure you disclose data collection.

### [COPY BELOW THIS LINE]

#### Call Logs and Caller ID Data

Our application acts as a spam blocker and AI caller identification service. To provide these core features, the app requests access to your device's Call Logs (`READ_CALL_LOG`).

**What we collect:** When you receive a phone call, we may securely transmit the incoming phone number, the duration of the call, and whether the call was answered or missed, to our secure backend servers. We also collect the contact name associated with the number if they are in your address book.

**Why we collect it:** We use this data to perform real-time spam analysis, assign trust scores to incoming numbers, screen potential scam calls, and build a crowdsourced caller identity database to protect our users from fraud.

**How we share it:** Your call event data is securely stored on our servers and is never sold to third-party data brokers or marketing agencies. Anonymized scam reports may be aggregated to improve our global spam detection engine.

### [COPY ABOVE THIS LINE]

---

## 2. Play Console Permission Declaration

**Where to put this:** In the Google Play Console → **App Content** → **Sensitive permissions and APIs** → **Call Log permission declaration** form.

### Question 1: What is the core purpose of your app?

**[COPY]:**

```
Our app's core purpose is Caller ID and Spam Detection.
```

### Question 2: Why does your app need the READ_CALL_LOG permission?

**[COPY]:**

```
This permission is strictly required for our "AI Call Screening and Scam Engine" feature to function. We need READ_CALL_LOG to intercept incoming phone calls, read the incoming phone number in real-time, and run it against our spam databases to calculate a risk score. Without this permission, the app cannot identify unknown callers or block high-risk scam calls, which is the primary functionality of our application.
```

### Question 3: Provide a video link demonstrating the core feature

**Note:** You must record a short screen recording of a phone call coming in, and your app identifying/blocking it, and upload it to YouTube as **unlisted**. Paste the resulting video URL into the form.

---

## Additional Tips for Review Success

1. **Privacy Policy URL must be live** before submission. Google checks it during review.
2. **Keep the video concise** (under 2 minutes is ideal). Show:
   - An incoming call from an unknown number.
   - The app displaying the Caller ID / risk score.
   - The spam/block action if applicable.
3. **Use the exact permission strings** declared in the app manifest so the Play Console matches the uploaded APK/AAB.
4. **Do not request permissions before the user understands why.** Runtime permission requests should be shown after an in-app explanation of the feature.
5. **No marketing language** in the permission declaration form. Be direct and factual.

---

*Prepared for Chatr — A product of Talentxcel Services Pvt Ltd.*
