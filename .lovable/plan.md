Ndërtoj **Lidhjet**, platformë sociale në shqip me verifikim AI, 2FA, dhe postime të moderuara. Punojmë me faza; pas çdo faze raportoj se ç'është bërë dhe ç'mbetet.

## Stack
- TanStack Start + React 19 + Tailwind v4 (dizajn i errët blu/navy si referenca)
- Lovable Cloud (Postgres + Auth + Storage) për të dhëna, sesion, ngarkesa
- Lovable AI Gateway (`google/gemini-3.6-flash`) për verifikim emri/email/skanim përmbajtjeje

## Fazat

### Faza 1 — Bazat (kjo bisedë)
1. Enable Lovable Cloud + provision `LOVABLE_API_KEY`.
2. Design system: paletë navy `#0f172a`/`#1e293b`, accent blu `#3b82f6`, radius 16px, shadow-elegant, në `src/styles.css` me oklch tokens.
3. Skema DB + RLS:
   - `profiles` (id, full_name, offer_type: punë/shërbim/tregti/tjetër, offer_details, status: pending/approved/rejected, ai_risk_score, ai_notes, phone, created_at)
   - `posts` (id, author_id, body, category, status, created_at) + constraint 1 post / 24h për autor
   - `comments` (id, post_id, author_id, body, created_at)
   - `post_attachments` (id, post_id, storage_path, mime, size, scan_status, scan_notes)
   - `user_roles` + `has_role()` për admin
   - Roles table, RLS: read publik për postime `approved`, own për draft; comments authenticated; profile own read/write; admin gjithçka.
   - Storage bucket privat `post-files`.
4. Rrugët publike:
   - `/` — landing me karakteristikat kryesore + rrugën e sigurisë (24h) sipas screenshot-it.
   - `/auth` — regjistrim me email **ose** telefon + login, me 2FA (Supabase MFA TOTP në regjistrim).
5. Header/footer në shqip me kopjen nga referenca ("Lidhjet © 2026 — Platformë e sigurt me mbrojtje AI & verifikim dy-faktorësh").

### Faza 2 — Verifikimi AI dhe rrjedha 24h
- Server function `verifyRegistration`: thërret Gemini me emrin+email+telefon; kërkon JSON `{risk_score, disposable_email, suspicious_name, reasons[], required_clarification}`.
- Nëse emër i shkurtër/dyshimtë → dialog që kërkon sqarim + zgjedhje kategorie (punë/shërbim/tregti/tjetër) para se `status` të kalojë `pending`.
- Cron/server route `/api/public/process-pending` që pas 24h kërkon 2FA final dhe kalon `approved`.
- Timeline UI në dashboard: Regjistrim → Kontroll AI → Pritje 24h → 2FA Final → Aktiv.

### Faza 3 — Postime, komente, skanim
- Composer: tekst + kategori + ngarkesa (foto, kamera, .txt/.pdf/.doc/.zip/link). Klient-side limit 1/24h + server enforce.
- Server function `scanAttachment`: kontroll mime/extension/size + Gemini analizë përmbajtjeje për tekst/PDF (ekstrakt) me flag maluer/kibernetik heuristik + AI. Ruaj `scan_status`.
- Feed: postimet e miratuara, komente për të gjithë të autentikuar.

### Faza 4 — Admin & polish
- `/admin` (role admin) për të parë llogaritë `pending`, të miratojë/refuzojë manualisht, të shohë AI notes.
- Skanim final, SEO për `/`, sitemap, robots.

## Në këtë raund do të dërgoj Fazën 1 komplet dhe konfigurimet e Fazës 2 (auth flow + server function skelet). Fazat 3–4 vijnë në raundet pasuese sipas prioritetit tuaj.

A vazhdoj?