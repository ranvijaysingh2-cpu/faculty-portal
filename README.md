# PW Faculty Portal

Physics Wallah result PDF portal — role-based access to Drive PDFs via Google Sheets index.

---

## Stack

- Next.js 14 (App Router) · TypeScript
- NextAuth v5 (Google OAuth, @pw.live domain only)
- Vercel (free tier)
- Google Sheets published as CSV (no API key needed)
- ISR: 1-hour cache + manual `/api/revalidate`

---

## Setup

### 1. Google Cloud Console — OAuth Client

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → APIs & Services → OAuth consent screen
   - User type: **Internal** (G Workspace) or External with test users
   - Add scope: `email`, `profile`
3. Credentials → Create Credentials → OAuth 2.0 Client ID
   - Application type: **Web application**
   - Authorised JavaScript origins: `http://localhost:3000` + your Vercel URL
   - Authorised redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://YOUR_VERCEL_DOMAIN/api/auth/callback/google`
4. Copy **Client ID** and **Client Secret** → set as env vars

---

### 2. Google Sheets — Data Sources

#### pdf_index sheet
Columns (row 1 must be these exact headers):
```
region | center | batch | test_date | pdf_name | gdrive_link
```
This is populated automatically by the Apps Script (see step 4).

#### user_access sheet
Columns:
```
email | role | scope_value
```
Roles: `faculty` | `center_head` | `region_head`

Example rows:
```
teacher@pw.live,faculty,JEE Mains Batch A
head@pw.live,center_head,Lucknow Center
rhead@pw.live,region_head,UP Region
```

#### Publish both sheets as CSV
1. Open each Google Sheet
2. File → Share → **Publish to web**
3. Select the specific sheet tab → **Comma-separated values (.csv)**
4. Click Publish → copy the URL
5. Set as `PDF_INDEX_CSV_URL` and `USER_ACCESS_CSV_URL` in env vars

---

### 3. Vercel Deployment

```bash
npm install
npm run build   # verify no errors locally first
```

Push to GitHub → import in [vercel.com](https://vercel.com) → set all env vars:

| Variable | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | From Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Cloud Console |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `PDF_INDEX_CSV_URL` | Published CSV URL |
| `USER_ACCESS_CSV_URL` | Published CSV URL |
| `REVALIDATE_SECRET` | Any long random string |

---

### 4. Apps Script Indexer

1. Open the **pdf_index Google Sheet**
2. Extensions → Apps Script → paste contents of `scripts/appscript-indexer.gs`
3. Set `ROOT_FOLDER_NAME` at the top to match your Drive folder name exactly
4. Run `indexPdfs()` once manually (approve Drive + Sheets permissions)
5. Set a **weekly trigger**: Triggers (clock icon) → Add Trigger → `indexPdfs` → Time-driven → Week timer

After the script runs, the sheet is populated. Publish it as CSV and copy the URL.

---

### 5. Manual Cache Revalidation

After updating the Sheets data, hit the revalidate endpoint to bust the 1-hour ISR cache immediately:

```bash
curl -X POST https://YOUR_VERCEL_DOMAIN/api/revalidate \
  -H "x-revalidate-secret: YOUR_REVALIDATE_SECRET"
```

---

## Local Development

```bash
cp .env.example .env.local
# fill in all env vars
npm install
npm run dev
```

---

## Architecture Notes

- `/api/my-pdfs` fetches both CSVs (cached 1 hour), looks up the caller's email, filters by role, returns all matching PDFs in one response.
- All dropdown cascades are pure client-side — zero extra network calls after initial load.
- The middleware redirects unauthenticated users to `/` (sign-in). Non-`@pw.live` sign-ins are rejected in the NextAuth `signIn` callback.
- `revalidateTag("csv")` busts the shared cache for both CSV fetches simultaneously.
