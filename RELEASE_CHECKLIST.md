# ID Vault — Private Beta Release Checklist (v0.1)

Use this checklist to verify that all systems are operational, secure, and ready before distributing beta testing invitations.

---

## 1. Repository & Code Hygiene
- [x] Clean `.gitignore` ignoring `.env`, `.env.*`, `dist/`, `node_modules/`, `credentials.json`, `*.pem`, `*.key`
- [x] `.env.example` created with variable templates only (no real credentials)
- [x] Secret audit passed (0 hardcoded `GOCSPX`, `AIza`, `sk-`, private keys)
- [x] Document audit passed (0 accidental real `.pdf`, `.jpg`, `.png` test identity files tracked)
- [x] Production build passes with 0 TypeScript/build errors (`npm run build`)
- [x] `vercel.json` configured for SPA routing rewrites and security headers

---

## 2. Google Cloud Platform Configuration
- [ ] Google Drive API enabled in Google Cloud Console
- [ ] OAuth Consent Screen configured with User Type: **External (Testing)**
- [ ] Test user email addresses added under OAuth Test Users
- [ ] Authorized JavaScript Origins added:
  - [ ] `http://localhost:5173` (Development)
  - [ ] `https://<preview-domain>.vercel.app` (Vercel Preview)
  - [ ] `https://<production-domain>.vercel.app` (Production)
- [ ] Requested scopes verified:
  - [x] `openid`
  - [x] `https://www.googleapis.com/auth/userinfo.profile`
  - [x] `https://www.googleapis.com/auth/userinfo.email`
  - [x] `https://www.googleapis.com/auth/drive.file` (Restricted to ID Vault files only)

---

## 3. Vercel Preview Deployment Verification
- [ ] Beta branch pushed to GitHub
- [ ] Vercel Preview deployment triggered and built successfully
- [ ] Environment variable `VITE_GOOGLE_CLIENT_ID` set in Vercel project settings
- [ ] Preview URL accessible over HTTPS (required for WebAuthn)

---

## 4. End-to-End Functional & Persistence Verification
- [ ] **Google Authentication**:
  - [ ] Google Sign-In succeeds with test account
  - [ ] Profile photo, name, and email render cleanly in Profile & Settings
  - [ ] Sign-Out clears active session cleanly
- [ ] **Google Drive Connectivity**:
  - [ ] "Connect Google Drive" initializes root `ID Vault` folder and category subfolders
  - [ ] Session restoration on page refresh does not prompt popup loops
- [ ] **Document Lifecycle**:
  - [ ] Upload single-page document (e.g. PAN Card) -> OCR extracts holder name & ID
  - [ ] Upload front/back document (e.g. Aadhaar Card) -> OCR merges both sides
  - [ ] Upload multi-page document (e.g. Degree Certificate)
  - [ ] Document appears on Home page with correct visual SVG card
- [ ] **Persistence across Reload**:
  - [ ] Hard-refresh page (`Ctrl + Shift + R`) -> Documents remain visible and fully accessible
  - [ ] Close browser and reopen -> Documents reload cleanly from Drive/IndexedDB
  - [ ] Open in private browsing window / different browser -> Log in -> Documents hydrate
- [ ] **Document Viewer & Export**:
  - [ ] Tap document card -> Document Detail opens
  - [ ] Tap preview card -> Secure PDF viewer modal renders document pages without error
  - [ ] "Download PDF" generates compiled canonical PDF file
- [ ] **AI Document Intelligence**:
  - [ ] Suggestion banner appears when uploaded image differs from selected type
  - [ ] "Use suggestion" updates type and re-parses fields seamlessly
  - [ ] Duplicate/version detection flags semantic changes (`UPDATED`, `UNCHANGED`, `CONFLICT`)
- [ ] **Security & Vault Lock**:
  - [ ] Vault Lock locks the interface
  - [ ] Device Biometric unlock (Windows Hello / Touch ID / Face ID) unlocks vault
  - [ ] Sensitive number reveal: "Show full number" unmasks digits for 30 seconds
  - [ ] Switching browser tabs or clicking "Done" immediately re-masks identifier

---

## 5. Beta Distribution Safeguards
- [ ] Testers instructed to test with sample / non-critical documents first
- [ ] Automatic public promotion disabled (Preview deployments used for testing)
- [ ] Production domain configuration scheduled after beta sign-off
