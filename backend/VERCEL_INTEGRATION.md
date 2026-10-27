# Vercel integration setup

1. Run `VERCEL_INTEGRATION_MIGRATION.sql` in Supabase before deploying. If you
   already ran that migration, also run `VERCEL_OAUTH_PKCE_MIGRATION.sql`.
2. Create a Vercel OAuth/Integration application. Configure its callback as
   `https://<api-host>/api/integrations/vercel/callback` and only grant the
   read permissions needed for Projects and Deployments. Configure deployment
   webhooks in Vercel for `deployment.created`, `deployment.succeeded`,
   `deployment.error`, and `deployment.canceled` pointing to
   `https://<api-host>/api/webhooks/vercel`.
3. Add the Vercel variables shown in `.env.example`. Generate a unique
   `VERCEL_TOKEN_ENCRYPTION_KEY` and keep it stable; rotating it requires
   reconnecting existing Vercel accounts.

## Marketplace installation flow (Stage 1)

Run `VERCEL_MARKETPLACE_INSTALLATIONS_MIGRATION.sql` before enabling the Vercel
Marketplace Redirect URL. Marketplace callbacks include `source=marketplace`, a
configuration ID, and no SiteWatch user or OAuth state. SiteWatch stores the
installation token encrypted against that configuration ID and redirects only to
the validated Vercel `next` URL. It does not expose the token or call `/v2/user`.

Marketplace installations are intentionally unclaimed in Stage 1. A later,
authenticated SiteWatch configuration flow must associate an installation with a
SiteWatch user/project; do not infer ownership from a callback query string.

## Frontend flow

All `/api/integrations/vercel/*` endpoints except the provider callback require
the normal `Authorization: Bearer <Supabase access token>` header. `connect`
returns `{ authorizationUrl }`; redirect the browser to it. The callback is
secured by a single-use, 10-minute state bound to that authenticated user and
an encrypted PKCE verifier.

- `GET /status` returns `connected`, account display data, and expiry metadata.
- `GET /teams`, `GET /projects?teamId=`, and `GET /projects/:id/deployments?teamId=` return Vercel data only after server-side ownership checks.
- `POST /projects/:id/link` accepts optional `{ teamId, sitewatchProjectId }`.
  Without `sitewatchProjectId`, it creates a SiteWatch project. It returns
  `{ link, project }` including `latest_deployment_status` and URL.
- `DELETE /projects/:id/link?teamId=` removes only the current user's link.

Tokens never appear in any API response. Authorization failures return
`VERCEL_AUTHORIZATION_INVALID`; prompt the user to reconnect.

Vercel signs webhook request bytes with HMAC-SHA1 in `x-vercel-signature`.
The backend verifies this before parsing JSON and stores each delivery ID once,
so retries cannot apply a deployment update more than once.
