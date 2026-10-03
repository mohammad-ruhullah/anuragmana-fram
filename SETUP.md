# অনুরাগনামা Frame — Setup Guide (B2 + Neon + Vercel)

Detailed, click-by-click setup for the backend. Do the parts in order.
By the end you will have: a Vercel site, a Backblaze B2 bucket for photos/frames,
and a Neon Postgres database for the counter, active-frame config and admin login.

> SECURITY: never paste real keys into chat, screenshots or git.
> Keep them in `.env.local` (local dev) or Vercel → Settings → Environment Variables.

---

## 0. What you will need (checklist)

Collect these values as you go; you'll paste them into env vars later.

| Value | Example | Where it comes from |
|---|---|---|
| `B2_BUCKET` | `anuragnama-frames` | B2 bucket name (Part A) |
| `B2_REGION` | `us-west-004` | B2 bucket detail (Part A) |
| `B2_ENDPOINT` | `https://s3.us-west-004.backblazeb2.com` | B2 bucket detail (Part A) |
| `B2_KEY_ID` | `005a1b...` | B2 application key (Part A) |
| `B2_APP_KEY` | `K005...` | B2 application key (Part A) |
| `DATABASE_URL` | `postgresql://...neon.tech/neondb?...` | Neon (Part B) |
| `SESSION_SECRET` | 64 hex chars | generate yourself (Part C) |
| Admin password | your choice | stored hashed in Neon (Phase 8) |

---

## Part A — Backblaze B2 (image / frame storage)

1. **Create account**
   - Go to https://www.backblaze.com/ and sign up (free 10 GB).
   - In the account dashboard, open **B2 Cloud Storage**. (Free; no card needed.)

2. **Create a bucket**
   - Left menu → **Buckets** → **Create a Bucket**.
   - Bucket Name: `anuragnama-frames` (must be globally unique — add random letters if taken).
   - **Files in Bucket are:** choose **Private** (recommended; the app serves
     files via short-lived signed URLs, so the bucket itself stays private).
   - Click **Create a Bucket**. Leave everything else default.

3. **Write down the region + endpoint**
   - Click the bucket → the detail screen shows **Endpoint** like:
     `s3.us-west-004.backblazeb2.com`
   - From that, record:
     - `B2_REGION` = `us-west-004` (everything between `s3.` and `.backblazeb2.com`)
     - `B2_ENDPOINT` = `https://s3.us-west-004.backblazeb2.com`
   - Common regions: `us-west-000/001/002/004`, `eu-central-003`.
     Use whatever your bucket actually shows.

4. **Create an Application Key**
   - Left menu → **Application Keys** → **Add a New Application Key**.
   - Name: `anuragnama-web`.
   - **Allow access to Bucket(s):** select only `anuragnama-frames`.
   - **Type of Access:** Read and Write.
   - Leave file-name prefix and duration blank.
   - Click **Create New Application Key**. Copy BOTH:
     - `keyID` → `B2_KEY_ID`
     - `applicationKey` → `B2_APP_KEY`
   - ⚠ The secret (`applicationKey`) is shown **only once**. If you lose it,
     delete the key and create a new one.

5. **Add a CORS rule** (so the browser can upload straight to B2)
   - Left menu → **Buckets** → click your bucket → **Bucket Settings** →
     **CORS Rules** → **Add CORS Rule** (or edit the JSON).
   - Use this rule (replace the two origins with your real domains):
     ```json
     [
       {
         "corsRuleName": "web",
         "allowedOrigins": [
           "https://YOUR-APP.vercel.app",
           "http://localhost:3000",
           "http://127.0.0.1:3000"
         ],
         "allowedOperations": [
           "s3_put",
           "s3_get",
           "s3_head"
         ],
         "allowedHeaders": ["*"],
         "exposeHeaders": ["etag"],
         "maxAgeSeconds": 3600
       }
     ]
     ```
   - Save. (You can add the production domain later; `localhost` is for local testing.)

6. **(Optional) Lifecycle rule** to auto-delete old uploads
   - Bucket → **Lifecycle Settings** → keep files for N days under the
     `uploads/` prefix. Skip if you want to keep everything.

---

## Part B — Neon (database)

1. **Create account / project**
   - Go to https://neon.tech/ → sign up (free tier).
   - **Create Project**. Pick the region closest to your Vercel region.
   - A database named `neondb` is created automatically.

2. **Get the connection string**
   - In the project → **Dashboard** → **Connect** (top right).
   - Copy the **Connection string**. It looks like:
     `postgresql://user:password@ep-xxxx-pooler.region.aws.neon.tech/neondb?sslmode=require`
   - Prefer the **Pooled** connection string for Vercel serverless functions.
   - This is `DATABASE_URL`.

3. **Alternative (recommended for Vercel): use the integration**
   - In Vercel → your project → **Integrations** (or Storage) → **Neon** →
     install. Vercel then injects `DATABASE_URL` automatically for you.
   - You can still install it later; the manual env var works too.

---

## Part C — Vercel (hosting + env vars)

1. **Push the project to a Git repo** (GitHub/GitLab/Bitbucket).

2. **Import into Vercel**
   - https://vercel.com/ → **Add New… → Project** → select the repo.
   - Framework Preset: **Other**. Build Command: leave empty.
     Output Directory: leave empty (root). Click **Deploy**.

3. **Generate `SESSION_SECRET`**
   - Run locally:
     ```
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - Copy the output.

4. **Add Environment Variables**
   - Vercel → Project → **Settings → Environment Variables**. Add for
     **Production, Preview and Development**:

   | Key | Value |
   |---|---|
   | `B2_BUCKET` | your bucket name |
   | `B2_REGION` | e.g. `us-west-004` |
   | `B2_ENDPOINT` | `https://s3.us-west-004.backblazeb2.com` |
   | `B2_KEY_ID` | B2 keyID |
   | `B2_APP_KEY` | B2 applicationKey |
   | `DATABASE_URL` | Neon connection string (skip if using the Neon integration) |
   | `SESSION_SECRET` | the 64-hex string you generated |

5. **Redeploy** so the new env vars are picked up (Deployments → ⋯ → Redeploy).

---

## Part D — Local development

1. In the project root, create a file named **`.env.local`** (never commit it):

   ```
   B2_BUCKET=anuragnama-frames
   B2_REGION=us-west-004
   B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
   B2_KEY_ID=your_key_id
   B2_APP_KEY=your_application_key
   DATABASE_URL=postgresql://user:password@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
   SESSION_SECRET=your_64_hex_string
   ```

2. Make sure `.env.local` is in `.gitignore`.

3. Install deps and run the dev server (added in Phase 7):
   ```
   npm install
   npm run dev
   ```
   The user site is at http://localhost:3000 and the API at `/api/...`.

---

## Part E — Database schema + admin seed (Phase 8)

Run once (locally, after `.env.local` is set):

```
npm run db:migrate
npm run db:seed-admin
```

- `db:migrate` creates tables `admins`, `config`, `creations`.
- `db:seed-admin` reads the password from env `ADMIN_PASSWORD` (or prompts you),
  hashes it with bcrypt, and inserts one row into `admins`.
  Example:
  ```
  ADMIN_PASSWORD="your-strong-password" npm run db:seed-admin
  ```

Schema created:

```sql
CREATE TABLE admins (
  id serial PRIMARY KEY,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE config (key text PRIMARY KEY, value text);
CREATE TABLE creations (
  id bigserial PRIMARY KEY,
  object_key text,
  created_at timestamptz DEFAULT now()
);
```

---

## Part F — Verify everything works

1. Open the deployed site, upload a photo, download it.
2. B2 → your bucket → there should be a new object under `uploads/`.
3. Run in Neon SQL editor: `SELECT count(*) FROM creations;` → count increases.
4. Visit `/admin` → log in → change the active frame → reload the user site and
   confirm the new frame appears.

---

## Troubleshooting

- **Upload fails with a CORS error (browser console)**
  → Part A step 5: the bucket CORS rule must include your exact origin
  (scheme + host + port). Add both `https://your-app.vercel.app` and
  `http://localhost:3000`.

- **`Access Denied` / `401` from B2 on upload**
  → Application key scope (Part A step 4) must include the bucket and Read+Write.

- **`DATABASE_URL` missing / connection refused**
  → Confirm the env var is set for the right environment and redeploy.
  Use the **pooled** Neon string for serverless.

- **Presigned URL works but file never appears**
  → Endpoint/region typo. `B2_REGION` must match the bucket exactly.

- **Frame uploads but users still see the old one**
  → The active-frame version didn't bump; Phase 13 handles cache-busting.

---

## Where each value is used

| Env var | Used by |
|---|---|
| `B2_*` | presigned upload, frame storage, admin image listing |
| `DATABASE_URL` | counter, active-frame config, admin auth |
| `SESSION_SECRET` | signing the admin login cookie |

That's everything. Once Parts A–D are done, tell me and I'll build Phase 7
(backend scaffolding) and Phase 8 (schema + seed).
