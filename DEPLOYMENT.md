# ID Vault — Deployment & Beta Readiness Guide (v0.1)

This document details the configuration, security protocols, environment requirements, and step-by-step procedures for deploying **ID Vault** to private beta via Vercel.

---

## 1. Project Overview

- **Name**: ID Vault
- **Type**: Single Page Application (SPA)
- **Framework**: React 19 + TypeScript + Vite 6
- **Styling**: Vanilla CSS with Apple-inspired Liquid Glass design system & GSAP animations
- **Storage**: Client-directed Google Drive integration (`drive.file` scope) + local IndexedDB cache
- **Security**: WebAuthn biometric device unlock, 30s sensitive identifier reveal masking, zero-backend architecture

---

## 2. Local Development & Build Commands

### Prerequisites
- Node.js: `v18+` (v20+ recommended)
- Package Manager: `npm`

### Local Development
```bash
npm install
npm run dev
```
Development server runs locally at: `http://localhost:5173`

### Production Build
```bash
npm run build
```
This executes:
1. `tsc -b` (TypeScript strict type-check)
2. `vite build` (Production bundling into `dist/`)

### Local Production Preview
```bash
npm run preview
```

---

## 3. Environment Variables Classification

| Variable | Type | Visibility | Description |
| :--- | :--- | :--- | :--- |
| `VITE_GOOGLE_CLIENT_ID` | OAuth Client ID | **Client-Visible** (Public) | Google Cloud OAuth 2.0 Web Application Client ID |

> [!IMPORTANT]
> **No Server Secrets Allowed in Frontend**:
> ID Vault is a static zero-backend client-side application. Do **NOT** set `client_secret`, API master keys, or private signing keys in client environment variables.

---

## 4. Google Cloud Platform Configuration

To enable Google Authentication and Google Drive sync, configure the Google Cloud Console:

### Step A: Enable Required APIs
1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Select or create your project (Google recommends separating **ID Vault Beta** from **ID Vault Prod**).
3. Navigate to **APIs & Services** > **Library**.
4. Search for and enable:
   - **Google Drive API**

### Step B: Configure OAuth Consent Screen
1. Set User Type to **External** (or Internal if using Google Workspace).
2. Set Publishing Status to **Testing** for private beta (add test user emails under Test Users).
3. Add Scopes:
   - `openid`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/drive.file` *(Restricted to files created by ID Vault only)*

### Step C: Configure Credentials (OAuth 2.0 Client ID)
1. Navigate to **APIs & Services** > **Credentials** > **Create Credentials** > **OAuth client ID**.
2. Application type: **Web application**.
3. Name: `ID Vault Web Client`.
4. Configure **Authorized JavaScript origins**:
   - **Development**: `http://localhost:5173`
   - **Preview (Beta)**: `https://<your-preview-deployment>.vercel.app` (e.g. `https://id-vault-beta.vercel.app`)
   - **Production**: `https://<your-stable-production-domain>.vercel.app`
5. Click **Save** and copy the Client ID to your environment configuration (`.env` or Vercel Environment Variables).

---

## 5. WebAuthn & Biometric Device Authentication

- **Requirement**: WebAuthn requires a **Secure Context (HTTPS)** or `localhost`.
- **Supported Authenticators**:
  - Windows Hello (PIN, Fingerprint, Facial Recognition)
  - macOS / iOS Touch ID & Face ID
  - Android Device Screen Lock / Fingerprint
- **Behavior**: On deployment, WebAuthn creates a local cryptographic credential bound to the specific origin. If the domain changes (e.g., from Preview to Production), a new biometric setup prompt will gracefully occur.

---

## 6. Vercel Deployment Workflow

ID Vault is configured with a minimal `vercel.json` for SPA routing and security headers.

### Workflow: Preview Deployment First
Deploy to a preview environment before promoting to production:

```text
GitHub (beta branch) ──> Vercel Preview ──> Comprehensive Manual Testing ──> Production Promotion
```

### Manual Vercel Deployment (via CLI)

```bash
# 1. Login to Vercel (if not already authenticated)
vercel login

# 2. Deploy Preview build from the beta branch
vercel

# 3. Set Vercel Environment Variables:
vercel env add VITE_GOOGLE_CLIENT_ID
# (Select Preview and Production environments)
```

---

## 7. Pre-Deployment Security Audit Summary

- [x] **Zero Hardcoded Secrets**: Scanned for `GOCSPX`, `AIza`, `sk-`, and private keys. 0 findings.
- [x] **Zero Tracked Documents**: Scanned for accidental `.pdf`, `.jpg`, `.png` personal uploads. 0 findings.
- [x] **Safe Logging**: Console logs in `googleAuth.ts`, `googleDrive.ts`, and `intelligenceService.ts` are guarded by `import.meta.env.DEV` and never print access tokens or sensitive document numbers.
- [x] **Privacy-Preserving Drive Scope**: Uses `https://www.googleapis.com/auth/drive.file`. Never accesses full Drive.
- [x] **Clean Startup**: No mock documents are loaded; initial vault state starts empty and hydrates directly from the user's own Drive and local IndexedDB.
