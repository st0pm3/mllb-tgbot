# Staging and deployment

## Before authentication

The project has no Telegram credentials. First create a **staging bot** in BotFather and enable its Serverless feature. Keep production and staging credentials separate. Install the pinned packages with `npm ci`; run `npm run check`.

## First deployment

1. Run `npx tgcloud login`. Enter the `app<id>:<secret>` CLI token through its interactive prompt. Do not place it in tracked files.
2. Run `npm run deploy` to build the Mini App and push all backend modules plus `dist/`.
3. Run `npx tgcloud migrate`; inspect the three new tables (`content_revisions`, `app_state`, `preferences`) before applying them.
4. Until migrations finish, handlers that read SQLite may fail. Do this with a new staging bot, before inviting users.
5. Copy the exact `https://app<id>.tgcloud.ai/` address reported by the CLI into BotFather's Mini App configuration and menu button.
6. Set that address as `MINI_APP_URL` in `tgcloud/lib/config.js`. Send `/whoami` to get your user ID; put it in `ADMIN_IDS`. These IDs and the URL are public configuration, not secrets.
7. Run `npm run deploy` again. Enable the commands listed in README through BotFather.

## Staging checks

- `/start` answers with buttons; hero search resolves Miya and names with spaces.
- `/build Miya` distinguishes a three-item core from six-item community builds.
- `/tier` and every lane honestly show pending review when no ratings exist.
- Favorites persist across sessions. Two concurrent setting edits cannot silently overwrite each other.
- The Mini App opens from the bot; authenticated endpoints identify the actual Telegram user.
- An ordinary user cannot stage or publish content, even with crafted endpoint input.
- A publisher can stage a unique validated snapshot without publishing it. Publishing needs verified patch metadata; restoring a prior valid revision works.
- Draft picks never include an enemy, ally or banned hero. Empty restricted pools produce an explanation.
- `/delete_me` removes the requester's preferences only. Group callbacks do not modify personal menus.
- The app handles expired init data or unavailable Serverless support with a visible error.

`tgcloud run` executes on Telegram infrastructure and can send messages/write data. It is not an offline simulator. Use your own staging chat/user IDs for smoke tests.

## Production updates

Create a distinct production bot after content review. Re-authenticate in a separate local checkout. Export the active editorial snapshot before changing schemas. Code push and data migrations remain separate; a code rollback does not reverse a migration. Use additive schema changes and code compatible with both schema versions during rollout.

Keep data imports/admin writes separate from user-facing read requests. Read paths use saved snapshots, so provider outages do not block them. Follow provider rate limits. No automatic refresh service is configured; manual import/publish is the initial operating model.

Do not assume platform-native cron, unlimited storage, automatic backups or permanent free hosting. Confirm current platform/account terms and validate export/restore before scaling.

## GitHub handoff

Create a new private `mlbb-meta-bot` repository under the intended account. Push this project only, without `.tgcloud/`, `.env*`, raw imports, `node_modules/`, or personal data. An initialized README commit is useful if using the GitHub connector's tree/commit workflow.

The included CI only validates code; it does not deploy or access Telegram. Add deployment automation later through a protected environment and a supported credential flow, after manual staging works.

## Deployment recorded 2026-10-19

Deployed to `https://app8208143805.tgcloud.ai/` for `@mlbbmetabot`. All three tables were migrated; the public page and snapshot returned HTTP 200. The cloud preferences endpoint returned defaults successfully. Fourteen commands and the Mini App menu button were configured and read back. Credentials are managed only by the ignored CLI state; no Bot API token is needed in this project.

Telegram rejected the custom `X-Content-Type-Options` hosting header, so custom header rules were removed. The build now explicitly requests an empty output directory. The SDK restricts `getWebhookInfo`; use `npx tgcloud webhook` for platform webhook diagnostics.

Owner admin access was enabled on 2026-10-20 and verified through the cloud revisions endpoint. The deployed beta still has incomplete build coverage and unverified current-patch tiers. A real user `/start` and Mini App session remain the final interactive smoke test.

`lib/setup.js` is an operational helper, not a public endpoint. The CLI only runs recognized handlers/endpoints, so it was invoked through a temporary local handler implementation without deploying that handler change; the normal message handler was restored immediately afterward.
