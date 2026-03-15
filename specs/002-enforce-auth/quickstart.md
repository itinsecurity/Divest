# Quickstart: GitHub OAuth Setup (002-enforce-auth)

## 1. Create a GitHub OAuth App

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
2. Fill in:
   - **Application name**: `Divest` (or any name)
   - **Homepage URL**: `http://localhost:3000` (dev) / your production URL
   - **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
3. Click **Register application**
4. Note the **Client ID**
5. Click **Generate a new client secret** — note the secret immediately (shown once)

## 2. Find Your GitHub User ID

```bash
curl https://api.github.com/users/<your-github-username> | grep '"id"'
```

Note the numeric `id` value — this is your `AUTH_GITHUB_OWNER_ID`.

## 3. Configure Environment Variables

In `.env.local` (development) or your deployment environment:

```env
# Auth.js v5
AUTH_SECRET="<generate with: openssl rand -base64 32>"
AUTH_GITHUB_ID="<your-oauth-app-client-id>"
AUTH_GITHUB_SECRET="<your-oauth-app-client-secret>"
AUTH_GITHUB_OWNER_ID="<your-numeric-github-user-id>"
NEXTAUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"
```

## 4. Run the App

```bash
npm run dev
```

Navigate to `http://localhost:3000` — you will be redirected to `/login`, where you can click "Sign in with GitHub".

## 5. Production Deployment

- Register a **separate GitHub OAuth App** with the production callback URL
- Update `NEXTAUTH_URL` to the production domain
- Ensure `AUTH_SECRET` is at least 32 random characters (use a secrets manager)
- `AUTH_GITHUB_OWNER_ID` is the same value across environments (it's your GitHub user ID)

## 6. E2E Tests

E2E tests bypass GitHub OAuth using a pre-generated session token. No GitHub OAuth app is needed for running tests. Required env vars for E2E:

```env
AUTH_SECRET="e2e-test-secret-32-chars-minimum!!"
AUTH_GITHUB_OWNER_ID="99999999"   # any numeric string; must match what global-setup encodes
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/divest_e2e"
```
