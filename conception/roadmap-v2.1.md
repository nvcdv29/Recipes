# The Heirloom Editorial — Roadmap v2.1

> Stand: Mai 2026 · Basierend auf Code-Analyse v2, Screenshots und Inspiration-App-Analyse

---

## Legende

| Symbol | Bedeutung |
|--------|-----------|
| ✓ | Bereits implementiert |
| → | Aus Roadmap v2, in Arbeit |
| ★ | Deine neuen Feature-Ideen |
| ◈ | Von Inspiration-App inspiriert |
| ~ | Niedrige Priorität |
| ✕ | Wird nicht implementiert |

---

## 1. Projektstatus

### Implementiert (11 Features)

| Feature | Details |
|---------|---------|
| ✓ Architektur-Refactoring | App.tsx auf 216 Zeilen, Hooks/Contexts/Pages/Components |
| ✓ Kochansicht | Vollbild, Timer-Detection, Zutaten-Check, Step-Nav, Jump-to-Step |
| ✓ Einkaufsliste | Generator, ShoppingListDetail, Kategorisierung, Mengenumrechnung |
| ✓ Favoriten & Collections | CollectionCard, CollectionDetail, Selector, FavoritesManager |
| ✓ Duplikat-Erkennung | Levenshtein + Jaccard-Similarity, Merge-Dialog |
| ✓ Menüplaner | DnD-Kalender (@hello-pangea/dnd), ICS-Export, Shopping-Integration |
| ✓ Varianten & Versionierung | VersionHistory, VariantManager, recipeVersioning.ts, deep-object-diff |
| ✓ Social Features | Kommentare, CookingLogs, Reaktionen (Emojis), ActivityFeed |
| ✓ React Router v7 | Lazy Loading, PrivateRoute, Backwards-Compat, PWA Share-Target |
| ✓ Testing (Vitest + RTL + MSW) | Setup, Handler-Mocks, Component-Tests, Firestore-Tests |
| ✓ Zustand (uiStore) | Persistente Filter, ViewMode, persist() Middleware — war #19 |

### In Arbeit (aus Roadmap v2)

| Feature | Quelle |
|---------|--------|
| → Dark Mode | Roadmap v2 #20 |
| → Smart Search & Discovery | Roadmap v2 #7 |
| → Batch Import Optimierung | Roadmap v2 #10 |

### Neu hinzugekommen

| Feature | Quelle |
|---------|--------|
| ★ Nextcloud / WebDAV Sync | Deine Idee |
| ★ Offline-PWA (selektives Caching) | Deine Idee |
| ◈ KI-Rezept-Generator | Inspiration-App (generateRecipe + generateRecipeImage) |
| ◈ Auto-Platzhalterbild | Inspiration-App (KI wählt aus Unsplash-Bank) |
| ◈ Viewer-Rolle | Inspiration-App (admin/member/viewer statt nur admin/user) |
| ◈ Stock-Rezepte für neue Nutzer | Inspiration-App (isStock:true Demo-Rezepte) |

### Niedrige Priorität / Nicht geplant

| Feature | Status |
|---------|--------|
| ~ Nährwertinformationen | Niedrige Prio |
| ~ Inventory Management | Niedrige Prio |
| ~ Advanced Analytics | Niedrige Prio |
| ~ Recipe Scaling Intelligence | Niedrige Prio |
| ✕ Mobile Native App | Wird nicht implementiert |
| ✕ Print-on-Demand Kochbuch | Wird nicht implementiert |

---

## 2. Roadmap nach Phasen

---

### Phase A — Fertigstellung (Monate 1–2)

**Ziel:** Geplante Features abschließen + schnelle Quick-Wins

---

#### A1 · Dark Mode
**Aufwand:** Niedrig · **Quelle:** Roadmap v2 #20

Tailwind CSS 4.x nutzt `@variant dark` statt `darkMode: 'class'` in der Config. ThemeProvider-Context in uiStore.ts ergänzen. SettingsPage.tsx (aktuell nur 7-Zeilen-Stub!) ausbauen mit Dark Mode Toggle und System-Erkennung via `prefers-color-scheme`. Alle 5 Haupt-Komponenten (Header, RecipeCard, RecipeDetail, CookingMode, RecipeFilters) mit `dark:`-Varianten nachrüsten.

**Wichtig:** Tailwind 4.x nutzt CSS `@variant dark (&:where(.dark, .dark *))` — kein JS-Config-Eintrag.

---

#### A2 · Auto-Platzhalterbild (KI-Bildauswahl)
**Aufwand:** Niedrig · **Quelle:** ◈ Inspiration-App

Die Inspiration-App implementiert `generateRecipeImage(title, category)` mit einer kuratierten Liste von ~80 Unsplash-Food-Fotos inkl. Tag-Metadaten. Gemini wählt per Prompt den besten Index aus und gibt eine Unsplash-URL zurück. Kein echtes Bildgenerieren nötig — nur intelligente Auswahl.

```
isAutoImage: boolean  ← neues Feld in Recipe-Typ
```

Anwendung:
- Beim Import ohne eigenes Bild: Auto-Bild generieren
- In `BulkImportOverview.tsx`: Option "Auto-Bilder für alle ohne Foto"
- `MealPlanner.tsx`: picsum.photos-Fallback ersetzen

---

#### A3 · View-Toggle (Grid / Liste)
**Aufwand:** 5 Minuten · **Quelle:** Roadmap v2

`uiStore.ts` hat `viewMode: 'grid' | 'list'` und `setViewMode()` bereits vollständig implementiert und persistiert — es fehlt nur der Button in `RecipeFilters.tsx`. Dazu `RecipeListItem.tsx` als kompakten Horizontal-Card erstellen.

**Das ist der Feature mit dem besten ROI der gesamten Roadmap.**

---

#### A4 · Sortierung der Rezeptliste
**Aufwand:** Niedrig · **Quelle:** Roadmap v2

`sortBy`-State in uiStore hinzufügen:
```typescript
type SortBy = 'date_desc' | 'date_asc' | 'rating' | 'name' | 'duration'
```
Dropdown mit `ArrowUpDown`-Icon (Lucide) in `RecipeFilters.tsx`. Sort-Logik in `RecipeContext` oder `HomePage.tsx`.

---

#### A5 · Viewer-Rolle
**Aufwand:** Niedrig · **Quelle:** ◈ Inspiration-App

Inspiration-App hat `admin / member / viewer`. Heirloom kennt nur `admin / user`. 

**Viewer:** Kann alle öffentlichen Rezepte lesen, aber nicht bearbeiten, importieren oder löschen. Ideal für ältere Familienmitglieder ("Oma kann Rezepte lesen, aber nichts kaputtmachen").

Änderungen:
- `types.ts`: `UserProfile.role` um `'viewer'` erweitern
- `firestore.rules`: Viewer-Guards für Write-Operationen
- UI: Buttons für Import/Edit/Delete mit Viewer-Check ausblenden

---

### Phase B — Neue Kern-Features (Monate 2–4)

**Ziel:** Deine eigenen Feature-Ideen + Inspiration-App-Highlights

---

#### B1 · Nextcloud / WebDAV Sync ★
**Aufwand:** Mittel · **Quelle:** Deine Idee

Auto-Export aller Rezepte, Wochenpläne und Einkaufslisten als Markdown- und/oder PDF-Dateien in eine Nextcloud-Instanz, organisiert in semantischen Ordnern. Automatisch aktualisiert bei jeder Änderung.

**Ordnerstruktur:**
```
/Heirloom/
├── Alle Rezepte/
│   └── Apfelkuchen.md
├── Favoriten/
│   └── Veganes-Thai-Curry.md
├── Kollektionen/
│   └── Weihnachten/
│       └── Lebkuchen.md
├── Kategorien/
│   ├── Dessert/
│   │   └── Apfelkuchen.md
│   └── Hauptspeise/
│       └── Veganes-Thai-Curry.md
├── Wochenpläne/
│   └── KW19-2026.md
└── Einkaufslisten/
    └── Wocheneinkauf-Mo.md
```

**Markdown-Format (YAML-Frontmatter):**
```markdown
---
title: Apfelkuchen
category: Dessert
duration: 45 Min
servings: 8
dietary: [Vegetarisch]
rating: 4.5
source: Omas Kochbuch
---

# Apfelkuchen

## Zutaten
- 300g Mehl
- 200g Zucker

## Zubereitung
1. Schritt eins
2. Schritt zwei

## Notizen
Tipps hier
```

**Technische Umsetzung:**
- WebDAV via `fetch()` mit `Authorization: Basic btoa(user:pass)`
- `MKCOL` für Ordner anlegen (405 = bereits vorhanden)
- `PUT` für Dateien hochladen
- `DELETE` bei Rezept-Löschung
- Konfiguration in Firestore: `doc(db, 'settings/nextcloud')`
- Sync-Trigger: nach jedem `saveRecipe()`, `deleteRecipe()`, `saveMealPlan()`, `saveShoppingList()`
- Sync-Status-Badge in `Header.tsx`: `☁ Syncing...` / `✓ Synced` / `⚠ Fehler`

**CORS-Hinweis:** Nextcloud muss Browser-Requests erlauben. Falls CORS blockiert → Server-Proxy `POST /api/nextcloud/proxy` in `server.ts`.

**Dateinamen-Sanitierung:** `/\:*?"<>|` aus Rezepttiteln entfernen.

---

#### B2 · Offline-PWA (Selektives Caching) ★
**Aufwand:** Mittel · **Quelle:** Deine Idee

Zweistufige Offline-Strategie:

**Stufe 1 — Automatisch (Firestore):**
`enableIndexedDbPersistence(db)` → alle geladenen Rezepte automatisch in IndexedDB zwischengespeichert. Kostet nichts, passiert im Hintergrund.

**Stufe 2 — Selektiv (Bilder, user-definiert):**
User wählt in Settings was offline verfügbar sein soll:

```
Offline verfügbar machen:
  ○ Alle Rezepte (Bilder + Daten) — viel Speicher
  ● Nur Favoriten — empfohlen
  ☐ Kategorien: [Dessert ✓] [Hauptspeise ☐] [Snack ✓]
  → Einzelne Rezepte: Button "Offline speichern" in Detailansicht
```

**Technische Umsetzung:**
- `vite-plugin-pwa` mit Workbox: CacheFirst für Bilder, NetworkFirst für HTML
- `caches.open('heirloom-recipes-v1')` → `cache.put(imageUrl, response)` für Bild-Caching
- `navigator.storage.estimate()` → Speicheranzeige in Settings
- `useOnlineStatus.ts` Hook: `window.addEventListener('online'/'offline')`
- Offline-Badge auf RecipeCard wenn Rezept gecacht
- `CookingMode`: Bilder beim Öffnen automatisch cachen → offline kochen möglich
- Header-Banner bei Offline: "Offline — Änderungen werden synchronisiert wenn du wieder online bist"
- Import/Scan-Buttons im Offline-Modus ausblenden

**PWA Manifest Shortcuts:**
```json
{
  "shortcuts": [
    { "name": "Rezept scannen", "url": "/import" },
    { "name": "Wochenplan", "url": "/meal-planner" }
  ]
}
```

---

#### B3 · KI-Rezept-Generator ◈
**Aufwand:** Mittel · **Quelle:** Inspiration-App

Inspiration-App hat `generateRecipe(category, details)` mit Gemini — vollständig übertragbar. Unterschied zum URL-Import: keine externe Quelle nötig, Rezept wird komplett generiert.

**UI:**
- Neuer Button "✦ Erstellen" in Header zwischen "Scan" und "Neu"
- Modal: Kategorie-Select + Freitext "Was soll es sein?"
- Beispiel-Chips: "Vegane Pasta", "Kuchen ohne Nüsse", "Schnelles Abendessen für 6"
- Generiertes Rezept landet in `BulkImportOverview` zum Review
- `sourceName: "KI-generiert"` automatisch gesetzt

**Rate-Limit:** 1 Generierung / 30 Sek (UI-seitiger Cooldown-Timer)

**Auto-Bild:** direkt nach Generierung `generateAutoImage()` aufrufen → Unsplash-Platzhalterbild wird automatisch vorgeschlagen.

---

#### B4 · Smart Search & Discovery →
**Aufwand:** Mittel · **Quelle:** Roadmap v2 #7

Gemini parst natürlichsprachige Queries in strukturierte Filter:

```
Input: "Suche etwas Veganes für Sommer mit Zucchini, max 30 Min"
Output: { dietary: ["Vegan"], maxDuration: 30, ingredients: ["Zucchini"], season: "Sommer" }
```

- FlexSearch ist bereits eingebaut (keyword-basiert) → als Fallback behalten
- Neuer Toggle "KI-Suche" neben der Suchleiste
- Aktiver KI-Filter als dismissible Badge: `KI-Filter: Vegan, max 30 Min, Zucchini ✕`
- Backend: `POST /api/recipes/smart-search`
- Graceful Fallback: bei Gemini-Fehler → Keyword-Suche

---

#### B5 · Batch Import: Parallelisierung + Konfidenz →
**Aufwand:** Mittel · **Quelle:** Roadmap v2 #10

- Chunk-based parallel (3–5 Bilder gleichzeitig via `Promise.allSettled`)
- Konfidenz-Score aus Gemini-Response extrahieren (0.0–1.0)
- Low-Confidence Items (<0.7) → `"Bitte prüfen"` Flag in `BulkImportOverview`
- Batch-Tag-Editor: gleiche Kategorien/Ernährungsart auf alle importierten Rezepte anwenden
- Live-Progress-Anzeige pro Bild: `Wird verarbeitet… → Extrahiert → ✓ Fertig`

---

### Phase C — UX & Performance (Monate 3–5)

**Ziel:** Polishing, URL-State, Skalierbarkeit

---

#### C1 · URL-State für Filter
**Aufwand:** Niedrig · **Quelle:** Roadmap v2

`useSearchParams()` aus React Router v7. URL ↔ uiStore bidirektional synchronisieren:

```
/?category=Dessert&dietary=Vegan&sort=rating
```

- URL-Params haben Priorität über localStorage beim ersten Laden
- `replace: true` → kein Browser-History-Spam beim Filtern
- Ermöglicht teilbare Links zu gefilterten Ansichten
- `useFilterSync.ts` Hook als Abstraktion

---

#### C2 · Portionen-Scaler in Detailansicht
**Aufwand:** Niedrig · **Quelle:** Roadmap v2

Interaktiver +/- Stepper neben "Portionen: 4". Zutaten proportional skalieren:

```typescript
scaleFactor = currentServings / originalServings
scaledAmount = originalAmount * scaleFactor
```

String-Parsing: `"300g Mehl"` → `{300, 'g', 'Mehl'}` · `"1/2 TL Salz"` → `{0.5, 'TL', 'Salz'}`

Bruch-Ausgabe: `0.5 → "½"` · `0.25 → "¼"` · `0.75 → "¾"` · `0.33 → "⅓"`

Nicht parsierbare Strings (z.B. "Salz nach Geschmack") unverändert anzeigen. Skalierung wird **nicht** in Firestore gespeichert.

---

#### C3 · Pagination / Infinite Scroll
**Aufwand:** Mittel · **Quelle:** Roadmap v2

`RecipeContext` lädt derzeit alle Rezepte auf einmal. Bei 200+ Rezepten (vollständig digitalisiertes Familienarchiv) wird das initial sehr langsam.

Lösung: Firestore Cursor-Pagination mit `limit(24)` + `startAfter(lastVisible)`. Intersection Observer für automatisches Nachladen beim Scrollen. FlexSearch-Index inkrementell befüllen.

---

#### C4 · ActivityFeed N+1 Queries fixen
**Aufwand:** Mittel · **Quelle:** Roadmap v2

`ActivityFeed.tsx` fetcht jeden User und jedes Rezept einzeln in einem `forEach`-Loop. Bei 20 Aktivitäten = potenziell 40 separate Firestore-Reads pro Render.

Screenshot 1 zeigt das Problem: dieselbe Aktivität erscheint 4x, weil sie jedes Mal separat geladen wird.

Lösung:
```typescript
// Alle unique IDs sammeln
const uniqueUserIds = [...new Set(activities.map(a => a.userId))];
const uniqueRecipeIds = [...new Set(activities.map(a => a.recipeId))];

// Batch-Read mit Promise.all
const [users, recipes] = await Promise.all([
  Promise.all(uniqueUserIds.map(id => getDoc(doc(db, 'users', id)))),
  Promise.all(uniqueRecipeIds.map(id => getDoc(doc(db, 'recipes', id))))
]);
```

---

#### C5 · Onboarding-Flow für neue Nutzer
**Aufwand:** Mittel · **Quelle:** Roadmap v2

Kein Erstkontakt-Erlebnis für neue Familienmitglieder vorhanden. Nach erstem Login:

1. "Willkommen in unserer Familiensammlung"
2. "So scannst du ein Rezept" (mit Beispiel)
3. "Entdecke die Rezepte der Familie"

`onboardingCompleted: boolean` in `UserProfile` speichern. Inspiration-App nutzt ähnliches Konzept mit `isFirstFamilyModal`.

---

#### C6 · Stock-Rezepte für neue Nutzer
**Aufwand:** Niedrig · **Quelle:** ◈ Inspiration-App

Inspiration-App befüllt neue Haushalte automatisch mit 6 Demo-Rezepten (`isStock: true`). Für Heirloom: 3–5 gut formatierte Beispielrezepte mit Auto-Platzhalterbildern. Gibt neuen Nutzern sofort etwas zum Erkunden.

`isStock: true` → nicht in Statistiken zählbar, anders dargestellt (kleines "Beispiel"-Label).

---

### Phase D — Niedrige Priorität (Monate 5–8)

---

#### D1 · Rezept-Empfehlungen
**Aufwand:** Niedrig · Keine KI nötig

Am Ende der Detailansicht: Top 3 ähnliche Rezepte via Jaccard-Similarity über `categories[] + dietary[] + tags[]`. Vorhandenes `duplicateDetection.ts` als Basis nutzen — invertiert (Ähnlichkeit statt Duplikat). Als Mini-Cards darstellen.

---

#### D2 · Leichte Nährwert-Schätzung
**Aufwand:** Hoch

Gemini schätzt beim Import grob Kalorien + Makros. `estimated: true` Flag setzen. In Detailansicht als Badge: `~450 kcal / Portion`. Kein eigener Screen, kein Datenbank-Lookup.

---

#### D3 · Test-Coverage erhöhen
**Aufwand:** Mittel

Aktuell getestet: `RatingStars`, `RecipeCard`, `RecipeFilters`, `Button`, `uiStore`, `firestore.ts`.

Fehlend: `CookingMode`, `MealPlanner`, `ShoppingList`, `DuplicateDetection`, Social Features.

Ziel: >60% Coverage via `vitest --coverage`.

---

#### D4 · @Mention E-Mail Notifications
**Aufwand:** Hoch

`CommentSection.tsx` hat @mentions implementiert, aber keine Benachrichtigungen. Firebase Cloud Function `onCommentCreate` → Firebase Email Extension oder FCM Push. Aufwand: Firebase Functions Setup + E-Mail-Template.

---

## 3. Identifizierte Lücken & Bugs

### UX-Lücken

| Problem | Befund | Fix |
|---------|--------|-----|
| **View-Toggle fehlt** | `uiStore` hat `viewMode` + `setViewMode()` fertig, aber kein Button in der UI | `LayoutGrid`/`LayoutList` Icons in `RecipeFilters.tsx` + `RecipeListItem.tsx` |
| **SettingsPage ist Stub** | `SettingsPage.tsx` = 7 Zeilen | Vollständige Implementierung mit Profil, Theme, Nextcloud, Offline, Admin |
| **Keine Sortierung** | Nur Filtern, kein Sortieren | `sortBy` in uiStore + Dropdown in RecipeFilters |
| **Filter nicht in URL** | Filter gehen bei Reload verloren, nicht teilbar | `useSearchParams()` ↔ uiStore sync |
| **Kein Auto-Bild** | `picsum.photos` Fallback ohne Semantik | `generateRecipeImage()` aus Inspiration-App |

### Performance-Probleme

| Problem | Befund | Fix |
|---------|--------|-----|
| **ActivityFeed N+1** | Jeder User + jedes Rezept einzeln geladen | `Promise.all` mit Batch-Reads |
| **Alle Rezepte auf einmal** | RecipeContext ohne Pagination | `limit(24)` + `startAfter()` Cursor |

### Technische Schulden

| Problem | Befund | Fix |
|---------|--------|-----|
| **picsum.photos Fallback** | Externe Abhängigkeit, keine Semantik | `generateRecipeImage()` ersetzen |
| **useNotifications ist leer** | Hook macht nichts, wird aber aufgerufen | Implementieren (FCM) oder entfernen |
| **RecipeDetail useEffect** | `setRecipe(initialRecipe)` ohne ID-Vergleich → Stale-Closure-Risk | `useEffect([initialRecipe.id])` oder Firestore `onSnapshot` direkt |

---

## 4. Was die Inspiration-App besser macht

Die analysierte Inspiration-App (`heirloom-recipes.zip`) hat drei Dinge besonders gut gelöst:

**1. `generateRecipeImage()`** — Statt externem Fallback-Service wählt Gemini intelligent aus einer kuratierten Unsplash-Bibliothek. ~80 Food-Fotos mit Tag-Metadaten. Sehr günstiger API-Call, sofortiger visueller Mehrwert für importierte Rezepte ohne eigene Fotos.

**2. `generateRecipe()`** — Rezepte komplett aus einem Prompt heraus erstellen, nicht nur importieren. Für Heirloom besonders wertvoll: "Erstelle ein Rezept wie Omas Apfelkuchen, aber glutenfrei" als kreativer Ausgangspunkt.

**3. Viewer-Rolle** — Drei-stufige Rollen (admin/member/viewer) sind für Familien-Apps sinnvoller als zwei. Ältere Familienmitglieder können mitlesen ohne Versehens etwas zu verändern.

---

## 5. Technologie-Entscheidungen

### Nextcloud Sync
- **WebDAV via `fetch()`** — kein NPM-Paket nötig, WebDAV ist einfaches HTTP
- **CORS-Problem:** Nextcloud erlaubt standardmäßig keine Browser-Origins → Server-Proxy als Fallback
- **App-Passwort** statt echtem Passwort (Nextcloud Security Best Practice)

### Offline PWA
- **`vite-plugin-pwa`** mit Workbox — Standard für Vite-Apps
- **Firestore `enableIndexedDbPersistence()`** — kostenlos, automatisch
- **Manuelles Bild-Caching** via `Cache Storage API` — für selektive Offline-Verfügbarkeit
- **`navigator.storage.estimate()`** — Speichernutzung anzeigen

### KI-Rezept-Generator
- **Gemini 2.0 Flash** — schnell und günstig für Rezeptgenerierung
- **Vorhandenes Schema** aus `geminiService.ts` wiederverwenden
- **BulkImportOverview** als Review-Schritt — kein separater Flow nötig

---

## 6. Priorisierungsmatrix

| Feature | Impact | Aufwand | Priorität |
|---------|--------|---------|-----------|
| View-Toggle Button | Hoch | 5 Min | **Sofort** |
| Auto-Platzhalterbild | Hoch | Niedrig | **Sofort** |
| Dark Mode | Mittel | Niedrig | Phase A |
| Viewer-Rolle | Mittel | Niedrig | Phase A |
| Nextcloud Sync | Hoch | Mittel | Phase B |
| Offline-PWA | Hoch | Mittel | Phase B |
| KI-Rezept-Generator | Hoch | Mittel | Phase B |
| Smart Search | Hoch | Mittel | Phase B |
| Batch Import | Mittel | Mittel | Phase B |
| URL Filter-State | Mittel | Niedrig | Phase C |
| Portionen-Scaler | Mittel | Niedrig | Phase C |
| Pagination | Hoch | Mittel | Phase C |
| ActivityFeed Fix | Mittel | Mittel | Phase C |
| Onboarding | Niedrig | Mittel | Phase C |
| Stock-Rezepte | Niedrig | Niedrig | Phase C |
| Rezept-Empfehlungen | Niedrig | Niedrig | Phase D |
| Nährwert-Schätzung | Mittel | Hoch | Phase D |
| Test-Coverage | Qualität | Mittel | Phase D |

---

## 7. Immediate Next Steps

```
Woche 1
├── View-Toggle Button in RecipeFilters.tsx (5 Min)
├── RecipeListItem.tsx erstellen
├── sortBy in uiStore + Dropdown in RecipeFilters
└── generateRecipeImage() aus Inspiration-App übernehmen

Woche 2
├── Dark Mode (uiStore + useTheme + index.css @variant dark)
├── SettingsPage.tsx vollständig implementieren
└── Viewer-Rolle in types.ts + Firestore Rules

Woche 3–4
├── Nextcloud / WebDAV Sync (useWebDAV + useNextcloudSync)
└── vite-plugin-pwa Setup + Firestore Offline Persistence

Woche 5–6
├── Offline-PWA: selektives Bild-Caching (useOfflineCache)
├── KI-Rezept-Generator Modal + geminiService Erweiterung
└── Smart Search (Backend-Endpoint + SmartSearchBar)

Woche 7–8
├── Batch Import: Chunk-Parallel + Konfidenz-Scores
├── URL-Filter-State (useFilterSync)
└── Portionen-Scaler (ServingsStepper + ScaledIngredients)
```

---

*Erstellt: Mai 2026 · Version 2.1 · The Heirloom Editorial*
