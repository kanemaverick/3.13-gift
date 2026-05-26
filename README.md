# StarLight public frontend mirror

This folder contains the public client-side files downloaded from:

https://star.imhjm.com/

## Included

- `index.html` - public HTML entry
- `assets/index-D0gABIbm.js` - production JavaScript bundle with original third-party credentials removed
- `assets/index-DaSapoV3.css` - production CSS bundle
- `assets/hand_landmarker.task` - MediaPipe hand landmark model
- `assets/vision_wasm_internal.js` and `assets/vision_wasm_internal.wasm` - MediaPipe runtime files used by the page
- `assets/potsdamer_platz_1k.hdr` - HDR environment asset
- `assets/rednote.png` and `assets/wechat_pay.png` - public image assets referenced by the bundle
- `starlight-share-config.js` - optional Supabase configuration for invite-code sharing
- `starlight-cleanup.js` - local helper script that removes sponsor UI, adds invite-code sharing, and adds a cake-shape button

## Not included

- Original source files such as React components, TypeScript files, Vite config, etc. The site does not publish sourcemaps.
- Backend source code, database contents, deployment config, or private credentials.
- Runtime data created through APIs unless it is publicly linked by the frontend.

## Notes

This is a public frontend mirror only. The JavaScript bundle is minified production code, so it is useful for auditing and learning what the browser runs, but it is not the author's original project source tree.

The added share button can create invite links such as `?invite=ABCDEFGH` when `starlight-share-config.js` is configured with your own Supabase project. If Supabase is not configured, it falls back to a static `?c=` configuration link.

GitHub Pages project URLs such as `https://user.github.io/repo/` are supported by the local wrapper in `index.html`; it rewrites asset paths and prevents the app from mistaking `/repo/` for a remote short-link path.

## Invite sharing setup

Create a Supabase table with Row Level Security enabled:

```sql
create table if not exists public.starlight_shares (
  code text primary key,
  config jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.starlight_shares enable row level security;

create policy "Anyone can read shared configs"
on public.starlight_shares
for select
to anon
using (true);

create policy "Anyone can create shared configs"
on public.starlight_shares
for insert
to anon
with check (true);
```

Then edit `starlight-share-config.js`:

```js
window.STARLIGHT_SHARE_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT_ID.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_PUBLIC_KEY",
  table: "starlight_shares",
  useStaticFallback: true,
};
```

Only use the public `anon` key in this file. Do not put a `service_role` key or any other private secret in browser code.
