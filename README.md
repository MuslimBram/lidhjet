# Lidhjet

Rrjet i sigurt për profesionistë me verifikim identiteti, kontroll AI për kontakt/çmim/malware dhe moderim komuniteti.

## Faza e zhvillimit

| Faza | Përmbajtja | Statusi |
| --- | --- | --- |
| 1 | UI reale në klient: kërkim (search), deduplikim automatik i postimeve të njëjta nga i njëjti autor, `/auth` i unifikuar (Regjistrohu / Hyr) | ✅ Përfunduar |
| 2 | Njoftime auto për postime të reja (BroadcastChannel + Web Notifications), limit 1 post/24h, gate për chat pas taksës | ✅ Përfunduar |
| 3 | Backend (Lovable Cloud): Auth OTP telefon/email, tabelat `profiles/posts/comments/attachments/violations` me RLS, storage | 🔒 Pret kreditet |
| 4 | AI real (Lovable AI Gateway / Gemini): kontakt në foto & dokumente, çmim vs mediana, risk-score identiteti, punë 24h e miratimit | 🔒 Pret kreditet |
| 5 | Panel admin operativ, email pezullimi, integrime TrueCaller / CallApp | 🔒 Pret kreditet |

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
