# postiz-selfhost

Deployment overlay for self-hosting [Postiz](https://github.com/gitroomhq/postiz-app)
on Windows + Docker, exposed publicly via ngrok for OAuth callbacks.

This repo tracks only the customizations layered on top of upstream Postiz — not
the upstream source itself. Clone upstream separately and apply these files over it.

## What's tracked

- `docker-compose.yaml` — compose file with env vars wired to read from `.env`
  and runtime patches mounted as read-only volumes.
- `.env.example` — template for the `.env` file (real `.env` is git-ignored).
- `patches/` — runtime overrides for known issues in the upstream image:
  - `subdomain.management.js` — fixes auth cookie rejection on Public-Suffix-List
    domains (e.g. `*.ngrok-free.app`). Returns a host-only cookie when the
    derived registrable domain itself sits on the PSL.
  - `linkedin.provider.js` — drops the organization-scope requests
    (`rw_organization_admin`, `w_organization_social`, `r_organization_social`,
    `r_basicprofile`) from the personal LinkedIn provider so the OAuth flow
    works without LinkedIn's Community Management API approval. Personal
    posting works; Company-Page posting still requires the full upstream
    provider plus API access.

## Setup from a clean machine

Prerequisites: Docker Desktop, Git, ngrok (3.20+), Python (for `secrets.token_urlsafe`).

```bash
# 1. Clone upstream Postiz
git clone https://github.com/gitroomhq/postiz-app.git
cd postiz-app

# 2. Overlay this repo's files into the same directory
#    (clone this repo elsewhere, then copy docker-compose.yaml, .env.example,
#     .gitignore, README.md, and the patches/ folder in)

# 3. Create your .env from the template
cp .env.example .env
# - Set MAIN_URL / FRONTEND_URL / NEXT_PUBLIC_BACKEND_URL to your ngrok static domain
# - Generate JWT_SECRET (e.g. python -c "import secrets; print(secrets.token_urlsafe(48))")
# - Leave social provider keys empty for now — fill in after creating OAuth apps

# 4. Authenticate ngrok and reserve a free static domain at
#    https://dashboard.ngrok.com/domains
ngrok config add-authtoken <your-token>

# 5. In one terminal, start the tunnel
ngrok http --domain=<your-static>.ngrok-free.app 4007

# 6. In another terminal, start the stack
docker compose up -d
```

Open `https://<your-static>.ngrok-free.app` and create the admin account via
email/password (the Google sign-in button is non-functional without configuring
Google OAuth — ignore it).

## Boot time

The Postiz backend takes **5–9 minutes** to bind port 3000 on a cold start.
The orchestrator and frontend come up much faster (~30 seconds), so the dashboard
URL may return 502 until the backend finishes. `docker compose up -d postiz`
recreates the container and forces another full boot cycle — batch env changes
to avoid multiple recreates.

To wait for readiness:

```bash
until docker exec postiz node -e "require('http').get('http://127.0.0.1:3000/',r=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null; do sleep 5; done
```

## Adding a social provider

For each platform, register the redirect URI exactly as
`${MAIN_URL}/integrations/social/<provider>` in the provider's developer portal.
LinkedIn additionally needs `${MAIN_URL}/integrations/social/linkedin-page` if
you intend to wire up Company Pages later.

Paste the credentials into `.env`, then `docker compose up -d postiz` and wait
for the backend to finish booting.

## Notes on the patches

The patches override compiled `.js` files inside the Postiz container via
read-only bind mounts. The upstream source is not modified. When upgrading the
upstream image:

1. Re-extract the latest compiled files (`docker cp postiz:<path> patches/<file>`).
2. Re-apply the same scope/domain changes.
3. Verify the line numbers and structure still match.

The fewer files we patch, the smoother upgrades are. Both current patches are
isolated to single arrays/functions so they should survive minor upstream
refactors.
