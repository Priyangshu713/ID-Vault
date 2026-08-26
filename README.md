# ID Vault

A private, mobile-first personal document vault designed for organizing and securing important identity, education, transport, and financial records.

---

## Core Features

- **Google Authentication & Drive Storage**: Store all document files directly in your own personal Google Drive under a dedicated, sandboxed folder (`drive.file` scope).
- **Client-Side PDF Normalization**: Convert front/back images and multi-page uploads into standardized, archival PDF documents locally in the browser.
- **Local OCR & Parsing**: Client-side optical character recognition (OCR) extracting structured details (holder name, masked identifier, dates, issuing authority) with zero external server upload.
- **Privacy-First AI Document Intelligence**: Local rule-and-heuristic engine providing document type suggestions, semantic version change comparisons, and expiry insights.
- **Biometric Vault Locking**: Secure device authentication using WebAuthn / Passkeys (Windows Hello, Touch ID, Face ID, Android Biometrics) with configurable auto-lock.
- **Sensitive Number Reveal**: Automatic 30-second time-limited unmasking with automatic re-masking and tab-switch concealment.
- **Liquid Glass Interface**: Native mobile-first design system with tactile feedback and GSAP physics-based animations.

---

## Getting Started

### 1. Clone & Install
```bash
git clone <repository-url>
cd id-vault
npm install
```

### 2. Environment Setup
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```
Fill in your `VITE_GOOGLE_CLIENT_ID` from the Google Cloud Console.

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## Privacy & Security Notice

- **Private Beta**: ID Vault is currently in private beta for personal and testing use.
- **Data Ownership**: ID Vault operates entirely on the client side. Your files and metadata are stored in your own Google Drive and local browser storage. No third-party servers receive your identity documents.
- **Scope Restriction**: ID Vault requests access only to files it creates (`https://www.googleapis.com/auth/drive.file`). It cannot access your other Google Drive files.
- **Important Disclaimer**: ID Vault is a personal document management utility. It is not an official government service, does not issue government-verified credentials, and is not an authorized DigiLocker provider. Document authenticity is not guaranteed by the software. Users should evaluate the system with non-sensitive data before storing personal records.

---

## Documentation

- [Deployment & Configuration Guide](file:///c:/Users/PRIYANGSHU/OneDrive/Desktop/Personal%20Vault%20ID/DEPLOYMENT.md)
- [Beta Release Checklist](file:///c:/Users/PRIYANGSHU/OneDrive/Desktop/Personal%20Vault%20ID/RELEASE_CHECKLIST.md)
