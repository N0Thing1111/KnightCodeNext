# KnightCodeNext deployment

Deployed October 1, 2026.

## Site addresses

- Student login: https://knightcodenext.vercel.app/login
- Teacher login: https://knightcodenext.vercel.app/teacher-login
- Admin login: https://knightcodenext.vercel.app/admin-login
- Vercel project: https://vercel.com/capstone-0a5f/knightcodenext
- GitHub repository: https://github.com/N0Thing1111/KnightCodeNext

The separate PHP project `knightcode` and https://knightcode-phi.vercel.app were not changed.

## Updating the deployed website

In a terminal inside C:\Users\Ryzen 3\KnightCodeNext:

```powershell
git status
git add .
git commit -m "Describe your changes"
git push
```

Review the files being staged before committing. Do not force-add .env.local.
Vercel is connected to this repository with automatic deployment creation enabled.
A push to main starts a production build. The existing live site stays available while the build runs; a successful deployment updates the same public URL.
Saving a local file alone does not publish it. A failed build does not replace the working production deployment.
Database migration SQL still needs to be applied to Supabase separately. A Git push does not automatically execute migrations.

## Configuration

- Plan: Hobby; no paid upgrade was made.
- Framework: Next.js; Node.js 24.x.
- Server region: Sydney (syd1), matching the existing Supabase database location.
- Initial deployed commit: 3a16e59acde3a78fb843bd1941b3934fcf8af818.
- Supabase and SMTP credentials are encrypted production environment variables in the new Vercel project. No secret values are in this document.
- NEXT_PUBLIC_APP_URL is https://knightcodenext.vercel.app in production.
- Supabase Site URL is https://knightcodenext.vercel.app.
- Allowed Auth callbacks include the production /auth/callback and the existing http://localhost:3000/auth/callback.
- Local .env.local retains its localhost application URL. Vercel CLI created an ignored .vercel project link and refreshed a local ignored CLI token.
- Environment variables were configured for Production only. Other-branch Preview deployments need their own environment configuration before they can be used for full application testing.
- The local and deployed Next.js app use the same Supabase database. Data edits in either affect that shared database.

## Verified

- Local production build and TypeScript checks passed.
- Vercel GitHub production build completed with READY status.
- Student, teacher, and admin login pages return HTTP 200.
- Signed-out protected dashboards redirect to the appropriate login pages.
- Unity loader, WASM, data file, and performance bridge return HTTP 200; WASM has application/wasm content type.
- Vercel project confirms GitHub N0Thing1111/KnightCodeNext, production branch main, and automatic deployments enabled.
- Existing Supabase tables were reachable before deployment.

These checks do not prove full signed-in gameplay, performance saving, account management, or email delivery. Test those with your existing accounts on the live site.

## Known hosting limit

Vercel Functions limit request and response bodies to 4.5 MB:
https://vercel.com/docs/functions/limitations

The existing profile upload accepts files up to 5 MB in application code, so sufficiently large uploads can fail on Vercel before the application's validation runs. Keep uploads below 4 MB for this first deployment. Large imports still need checking against that server-function limit. The October 13 backup update uses private signed Storage transfers, supports 32 MB encrypted saves, and keeps large backup bytes out of the function request/response. See [PRIORITY-FIXES.md](PRIORITY-FIXES.md) for rollout status. Unity game assets are static files, so this function-body limit does not prevent their delivery.

No application, PHP, or Unity source changes were required for this initial deployment.