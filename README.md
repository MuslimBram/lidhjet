# Lidhjet

Rrjet i sigurt për profesionistë me verifikim identiteti, kontroll AI për kontakt/çmim/malware dhe moderim komuniteti.

## Faza e zhvillimit

| Faza | Përmbajtja | Statusi |
| --- | --- | --- |
| 1 | UI reale në klient: kërkim (search), deduplikim automatik i postimeve të njëjta nga i njëjti autor, `/auth` i unifikuar (Regjistrohu / Hyr) | ✅ Përfunduar |
| 2 | Njoftime auto për postime të reja (BroadcastChannel + Web Notifications), limit 1 post/24h, gate për chat pas taksës | ✅ Përfunduar |
| 3 | Ngarkime reale me skanim në klient (foto/.txt/.pdf/.doc/.zip), kategorizim automatik i postimit, justifikim i çmimit jashtë normave | ✅ Përfunduar |
| 4 | Backend (Lovable Cloud): Auth OTP telefon/email, tabelat `profiles/posts/comments/attachments/violations` me RLS, storage | 🔒 Pret kreditet |
| 5 | AI real (Gemini) + panel admin operativ, email pezullimi, integrime TrueCaller / CallApp | 🔒 Pret kreditet |


Çdo fazë kryhet plotësisht: ekzekutohen testet e typecheck, korrigjohen gabimet, përditësohet README dhe raportohet përpara se të kalohet në fazën tjetër.

## Faza 1 — çka u shtua

- **Kërkim** në `/feed` me lupë (kërkon te teksti i postimit, autori, çmimi).
- **Deduplikim automatik**: kur i njëjti autor poston përmbajtje mjaftueshëm të ngjashme (Jaccard ≥ 0.55 mbi tokenë), postimi i vjetër fshihet automatikisht dhe përdoruesi njoftohet.
- **/auth i unifikuar**: switcher Regjistrohu / Hyr. Në modin *Hyr* stepper-i kalon direkt `Identifikim → 2FA → Feed`, pa hapin e profilit.

## Zhvillimi

```sh
npm i
npm run dev
```

## Teknologjitë

- TanStack Start · TypeScript · React · Tailwind CSS

## Faza 2 — çka u shtua

- **Njoftime automatike për çdo postim të re**: `src/hooks/usePostNotifications.ts` (BroadcastChannel ndër-skeda + Web Notifications) me respekt të modalitetit dridhje / beep / normal / heshtje (`src/lib/notify.ts`).
- **Limit real 1 postim / 24 orë**: `src/hooks/usePostLimit.ts` — composer-i bllokohet dhe shfaqet numërimi i kohës së mbetur.
- **Gate i chat-it**: kanali i komunikimit hapet vetëm pas interesit të blerësit + pagesës së taksës sipas intervalit të çmimit.

## Faza 3 — çka u shtua

- **Bashkëngjitje reale** (`src/components/AttachmentPicker.tsx`): zgjedhje skedarësh me parapamje foto, lista e verdiktit dhe arsyet.
- **Skanim në klient** (`src/lib/fileScan.ts`): lloje të lejuara (foto, `.txt`, `.pdf`, `.doc/.docx`, `.zip`), bllokim i `.exe/.bat/.docm/...`, zbulim i dy-zgjatimeve (`fatura.pdf.exe`), limit 10 MB, makro VBA, `/JavaScript` & `/OpenAction` në PDF, dhe kontakt brenda tekstit të dokumentit. Postimi bllokohet derisa hiqen skedarët e bllokuar.
- **Kategorizim automatik** (`src/lib/autoCategory.ts`): AI sugjeron Punë / Shërbim / Tregti nga teksti; sugjerimi zbatohet me një klik.
- **Justifikim çmimi** (`src/components/PriceJustifyDialog.tsx`): çmimi jashtë normave nuk regjistrohet më direkt si shkelje — kërkohet arsyetim (min. 5 fjalë); anulimi shënon shkeljen (3 → pezullim 7 ditë).

