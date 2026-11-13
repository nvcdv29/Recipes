# The Heirloom Editorial — KI-Coding-Prompts (Roadmap v2.1)

> Token-effiziente, präzise Prompts für Google AI Studio / Gemini Code.
> Jeden Prompt einzeln kopieren und direkt in Google AI Studio einfügen.
> Relevante Quell-Dateien ggf. als Kontext anhängen.

---

## Übersicht

| # | Feature | Phase | Aufwand | Quelle |
|---|---------|-------|---------|--------|
| 1 | Dark Mode (Tailwind 4.x) | A | Niedrig | v2 #20 |
| 2 | Auto-Platzhalterbild (KI-Bildauswahl) | A | Niedrig | ◈ Inspiration |
| 3 | View-Toggle + Sortierung + RecipeListItem | A | 5 Min / Niedrig | v2 |
| 4 | Viewer-Rolle | A | Niedrig | ◈ Inspiration |
| 5 | Nextcloud / WebDAV Sync | B | Mittel | ★ Neu |
| 6 | Offline-PWA (selektives Caching) | B | Mittel | ★ Neu |
| 7 | KI-Rezept-Generator | B | Mittel | ◈ Inspiration |
| 8 | Smart Search & Discovery | B | Mittel | v2 #7 |
| 9 | Batch Import: Parallelisierung + Konfidenz | B | Mittel | v2 #10 |
| 10 | URL-Filter-State + Portionen-Scaler | C | Niedrig | v2 Bundle |
| 11 | ActivityFeed N+1 Fix + Pagination | C | Mittel | v2 |
| 12 | Stock-Rezepte + Onboarding-Flow | C | Niedrig/Mittel | ◈ + v2 |

---

## Prompt 1 — Dark Mode (Tailwind 4.x)

```
CONTEXT:
React 19 + Tailwind CSS 4.1 app. uiStore.ts (Zustand with persist()) manages filter/view state.
SettingsPage.tsx is currently a 7-line stub — needs full implementation.
Tailwind 4.x uses CSS-based config (@import "tailwindcss"), NOT tailwind.config.js.

TASK:
1. Extend uiStore.ts:
   Add: theme: 'light' | 'dark' | 'system' (default: 'system'), setTheme action
   Persist alongside existing state.

2. useTheme.ts hook:
   - Read theme from uiStore
   - If 'system': use window.matchMedia('(prefers-color-scheme: dark)').matches
   - Apply/remove 'dark' class on document.documentElement
   - Listen for system changes: matchMedia.addEventListener('change', ...)
   - Export: { isDark: boolean }
   - Call ONCE in App.tsx on mount

3. index.css — add dark variant (Tailwind 4.x syntax):
   @variant dark (&:where(.dark, .dark *)) {
     --color-background-primary: #0a0a0a;
     --color-background-secondary: #141414;
     --color-text-primary: #f5f5f5;
     --color-text-secondary: #a3a3a3;
     --color-border-tertiary: #262626;
     /* Map all existing CSS vars to dark values */
   }
   (Tailwind 4.x: @variant dark, NOT darkMode:'class' in config)

4. Build out SettingsPage.tsx — full implementation with sections:
   a) Profil: displayName input (save to auth.currentUser.updateProfile + Firestore users doc),
      photoURL display
   b) Erscheinungsbild: three-way toggle Light / Dunkel / System with visual preview chips
   c) Nextcloud Sync: placeholder section (see Prompt 5 for details)
   d) Offline-Modus: placeholder section (see Prompt 6 for details)
   e) Admin-Bereich: link to /admin route, only visible if userProfile.role === 'admin'

5. Add dark: variants to top 5 components:
   Header.tsx, RecipeCard.tsx, RecipeDetail.tsx, CookingMode.tsx, RecipeFilters.tsx
   Pattern: bg-white → dark:bg-neutral-900
   Hardcoded color classes need dark: overrides; CSS-var-based classes are automatic.

CONSTRAINTS:
- Tailwind 4.x: @variant dark, NOT darkMode:'class' in JS config
- prefers-reduced-motion: no-preference guard on all Motion animations (check CookingMode)
- No server-side theme storage needed — Zustand persist() to localStorage is sufficient

OUTPUT:
- Extended uiStore.ts (theme state + action)
- useTheme.ts hook
- index.css @variant dark additions
- Full SettingsPage.tsx implementation (all 5 sections)
- Dark variant diffs for the 5 listed components
```

---

## Prompt 2 — Auto-Platzhalterbild (KI-Bildauswahl)

```
CONTEXT:
Recipe app with Gemini AI (@google/genai). geminiService.ts has existing AI functions.
Recipe type has: images: string[], isAutoImage?: boolean (to be added).
MealPlanner.tsx currently uses picsum.photos as image fallback — replace this.
BulkImportOverview.tsx shows imported recipes before saving.

TASK:
1. Add to types.ts:
   Recipe: add isAutoImage?: boolean field

2. Add to geminiService.ts: generateAutoImage(title: string, categories: string[]): Promise<string | null>
   
   Curated Unsplash image bank (copy from inspiration app, 80 entries):
   const FOOD_IMAGES = [
     { id: 'photo-1482049016688-2d3e1b311543', tags: 'eggs, breakfast, toast, avocado' },
     { id: 'photo-1504674900247-0877df9cc836', tags: 'steak, meat, dinner, gourmet, beef' },
     { id: 'photo-1512621776951-a57141f2eefd', tags: 'salad, healthy, lunch, vegetables' },
     // ... add all 80 entries from inspiration app geminiService.ts
   ];
   
   Implementation:
   - Build imageList string: index: tags for each entry
   - Prompt to Gemini: "Recipe titled '[title]' in categories [categories]. Pick the index (0-79) 
     of the best matching image from this list:\n[imageList]\nOutput ONLY the number."
   - Parse response as integer
   - Return: `https://images.unsplash.com/${FOOD_IMAGES[index].id}?auto=format&fit=crop&q=80&w=800`
   - Fallback: find entry where tags includes categories[0].toLowerCase(), or FOOD_IMAGES[0]

3. Apply generateAutoImage() in 3 places:
   a) BulkImportOverview.tsx: 
      - Add "Auto-Bilder generieren" button for recipes with empty images[]
      - Batch: process all image-less recipes in parallel (Promise.allSettled)
      - Show loading spinner per recipe card
      - On success: set recipe.images[0] = url, recipe.isAutoImage = true
   
   b) RecipeForm.tsx (manual recipe creation):
      - Add "Auto-Bild generieren" button below image upload area
      - Only show if images[] is empty
      - On click: call generateAutoImage(title, categories) → show preview
   
   c) MealPlanner.tsx:
      - Replace: src={recipe.images[0] || `https://picsum.photos/seed/${recipe.title}/100/100`}
      - With: src={recipe.images[0] || '/placeholder-food.svg'}
      - Add local SVG placeholder at /public/placeholder-food.svg (simple fork + knife icon)
      - Note: MealPlanner thumbnails are too small for AI-generated images to matter

4. RecipeCard.tsx:
   - If recipe.isAutoImage === true: show small "KI-Bild" badge overlay on image
   - Tooltip: "Automatisch generiertes Platzhalterbild"

CONSTRAINTS:
- generateAutoImage is called async — never block recipe saving on image generation
- isAutoImage:true means user can still replace with own photo later (show "Eigenes Bild hochladen" hint)
- Model: use same model as rest of geminiService (gemini-2.0-flash or current)
- Error: if Gemini fails → silent fallback to category match, NEVER show error to user

OUTPUT:
- Updated types.ts (isAutoImage field)
- Updated geminiService.ts (generateAutoImage function + FOOD_IMAGES array)
- Updated BulkImportOverview.tsx (batch auto-image button)
- Updated RecipeForm.tsx (single auto-image button)
- Updated MealPlanner.tsx (replace picsum fallback)
- RecipeCard.tsx isAutoImage badge
- /public/placeholder-food.svg
```

---

## Prompt 3 — View-Toggle + Sortierung + RecipeListItem

```
CONTEXT:
React 19, Zustand uiStore.ts already has: viewMode:'grid'|'list', setViewMode() — both implemented
and persisted. RecipeFilters.tsx has filter controls but no view toggle button.
Recipe type: { id, title, images[], categories[], dietary[], difficulty, duration, servings,
               averageRating, ratingCount, authorName }

TASK (3 small features in one session):

1. VIEW TOGGLE — just add the button (5 minutes):
   In RecipeFilters.tsx:
   import { LayoutGrid, LayoutList } from 'lucide-react'
   import { useUIStore } from '../../store/uiStore'
   
   Add toggle button group next to existing filter controls:
   <div className="flex border rounded-md overflow-hidden">
     <button onClick={() => setViewMode('grid')} aria-label="Rasteransicht"
       className={viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white'}>
       <LayoutGrid className="w-4 h-4" />
     </button>
     <button onClick={() => setViewMode('list')} aria-label="Listenansicht"
       className={viewMode === 'list' ? 'bg-primary text-white' : 'bg-white'}>
       <LayoutList className="w-4 h-4" />
     </button>
   </div>
   
   In HomePage.tsx: render RecipeCard grid OR RecipeListItem list based on viewMode

2. SORT DROPDOWN:
   Extend uiStore.ts: add sortBy:'date_desc'|'date_asc'|'rating'|'name'|'duration', setSortBy action
   
   In RecipeFilters.tsx: add sort select with ArrowUpDown icon:
   Options: "Neueste zuerst", "Älteste zuerst", "Beste Bewertung", "A–Z", "Kürzeste Dauer"
   
   Apply in RecipeContext or HomePage useMemo:
   const sorted = [...filtered].sort((a, b) => {
     switch(sortBy) {
       case 'rating': return (b.averageRating||0) - (a.averageRating||0)
       case 'name': return a.title.localeCompare(b.title, 'de')
       case 'duration': return (a.duration||999) - (b.duration||999)
       case 'date_asc': return a.createdAt - b.createdAt
       default: return b.createdAt - a.createdAt // date_desc
     }
   })

3. RecipeListItem.tsx — compact horizontal card for list view:
   Layout: [Image 80x80] | [Title + Category badges] | [Meta: duration, servings, difficulty] | [Rating] | [Kochen button]
   Props: same as RecipeCard (recipe: Recipe, onOpen, onFavorite, isFavorite)
   Height: ~80px per row
   Image: 80x80 rounded-md, object-cover
   On click: same behavior as RecipeCard (opens RecipeDetail)

CONSTRAINTS:
- viewMode and sortBy both persisted in uiStore (already done for viewMode, add for sortBy)
- RecipeListItem must accept identical props to RecipeCard
- Sort is applied AFTER filtering (not instead of)
- No backend changes needed — sort client-side on loaded recipes

OUTPUT:
- Extended uiStore.ts (sortBy state + setSortBy)
- Updated RecipeFilters.tsx (view toggle + sort dropdown)
- RecipeListItem.tsx compact component
- Updated HomePage.tsx (conditional grid/list render)
```

---

## Prompt 4 — Viewer-Rolle

```
CONTEXT:
Heirloom recipe app with Firebase Auth + Firestore. Currently UserProfile.role: 'admin' | 'user'.
Firestore rules check role for write access. AdminView.tsx manages users.
Recipe write operations: saveRecipe, deleteRecipe, addToCollection, importRecipe.

TASK:
Add 'viewer' role — read-only access for family members.

1. Update types.ts:
   UserProfile.role: 'admin' | 'user' | 'viewer'

2. Update firestore.rules:
   Currently write rules check: get(/databases/.../users/$(request.auth.uid)).data.role == 'admin'
   Extend: add check that role != 'viewer' for all write operations
   Viewers can: read all public recipes, read all collections (shared)
   Viewers cannot: create/update/delete recipes, add to collections, create shopping lists, add comments

3. Update AdminView.tsx (role assignment):
   Role dropdown: add 'viewer' option with description "Kann Rezepte lesen, nichts bearbeiten"
   Visual badge: blue="admin", green="user", gray="viewer"

4. Create useIsViewer.ts hook:
   const useIsViewer = () => {
     const { userProfile } = useAuth()
     return userProfile?.role === 'viewer'
   }

5. Apply viewer guards in UI (hide/disable, not just Firestore-protect):
   - Header.tsx: hide "Scan" button and "+ Neu" button for viewers
   - RecipeDetail.tsx: hide Edit (pencil) and Delete (trash) buttons
   - RecipeDetail.tsx: hide "In Sammlung hinzufügen" button
   - RecipeDetail.tsx: hide Comment input field (can read comments, not post)
   - CookingMode: keep fully accessible (viewing is the whole point)
   - Collections page: hide "Neue Sammlung" button
   - MealPlanner: hide drag-and-drop (view-only calendar)
   - ShoppingList: hide "Neue Liste" button
   
   Pattern: import { useIsViewer } from '../../hooks/useIsViewer'
   const isViewer = useIsViewer()
   {!isViewer && <button>Bearbeiten</button>}

6. Optional: viewer-specific empty state on HomePage:
   If viewer AND recipes.length === 0: "Noch keine Rezepte geteilt. Frag ein Familienmitglied,
   Rezepte zur Sammlung hinzuzufügen."

CONSTRAINTS:
- Viewers should have a useful experience, not a broken one — no error messages, just hidden controls
- All Firestore write rules must be enforced server-side regardless of UI guards
- Existing 'admin' and 'user' behavior must not change

OUTPUT:
- Updated types.ts (viewer role)
- Updated firestore.rules (viewer write restrictions)
- Updated AdminView.tsx (viewer role UI)
- useIsViewer.ts hook
- Diffs for Header, RecipeDetail, Collections, MealPlanner, ShoppingList components
```

---

## Prompt 5 — Nextcloud / WebDAV Sync

```
CONTEXT:
React 19 + Vite app. Express.js backend (server.ts). Firebase Firestore.
Already installed: jsPDF, react-markdown.
Types: Recipe, ShoppingList, MealPlan in types.ts.
Existing hooks: useRecipeActions.ts, useShoppingList.ts, useMealPlans.ts (or similar).

TASK:
Build Nextcloud/WebDAV auto-sync for recipes, meal plans and shopping lists.

1. useWebDAV.ts — low-level WebDAV client:
   Config interface: { serverUrl: string; username: string; appPassword: string }
   
   Methods (all use fetch() with Authorization: Basic btoa(`${user}:${pass}`)):
   
   async ensureFolder(path: string): Promise<void>
   - MKCOL request to serverUrl + path
   - If response 405 (Method Not Allowed) = folder exists → OK
   - If response 409 (Conflict) = parent missing → create parents recursively
   
   async uploadFile(path: string, content: string, contentType = 'text/plain'): Promise<void>
   - PUT request, body = content, Content-Type header
   
   async deleteFile(path: string): Promise<void>
   - DELETE request, ignore 404
   
   async testConnection(): Promise<boolean>
   - PROPFIND / with Depth: 0 header
   - Return true if 207 Multi-Status, false otherwise

2. recipeToMarkdown(recipe: Recipe): string
   Format:
   ---
   title: ${recipe.title}
   category: ${recipe.categories?.join(', ')}
   duration: ${recipe.duration}
   servings: ${recipe.servings}
   difficulty: ${recipe.difficulty}
   dietary: [${recipe.dietary?.join(', ')}]
   tags: [${recipe.tags?.join(', ')}]
   rating: ${recipe.averageRating?.toFixed(1) || 'keine'}
   source: ${recipe.sourceName || ''}
   source_url: ${recipe.sourceUrl || ''}
   added_by: ${recipe.authorName}
   created_at: ${new Date(recipe.createdAt).toLocaleDateString('de-DE')}
   ---
   
   # ${recipe.title}
   
   ## Zutaten
   ${recipe.ingredients.map(i => `- ${i}`).join('\n')}
   
   ## Zubereitung
   ${recipe.instructions.map((s, i) => `${i + 1}. ${s}`).join('\n')}
   ${recipe.notes ? `\n## Notizen\n${recipe.notes}` : ''}

   sanitizeFilename(name: string): string
   - Remove: /\:*?"<>|  Replace spaces with - (or keep, WebDAV handles it)

3. useNextcloudSync.ts — sync orchestration:
   Load/save config from Firestore: doc(db, 'settings', 'nextcloud')
   Config: { serverUrl, username, appPassword, enabled: boolean }
   Status: 'idle' | 'syncing' | 'error' | 'success'
   lastSyncedAt: Date | null
   
   syncRecipe(recipe: Recipe, event: 'created' | 'updated' | 'deleted', 
              userFavorites: string[], userCollections: Collection[]): Promise<void>
   
   Always sync to: /Heirloom/Alle Rezepte/${sanitize(recipe.title)}.md
   
   If recipe.id in userFavorites:
     sync to: /Heirloom/Favoriten/${sanitize(recipe.title)}.md
   else if previously in favorites (hard to detect → always PUT, never DELETE from Favoriten on update)
   
   For each category in recipe.categories[]:
     sync to: /Heirloom/Kategorien/${category}/${sanitize(recipe.title)}.md
   
   For each collection where recipe is member:
     sync to: /Heirloom/Kollektionen/${collection.name}/${sanitize(recipe.title)}.md
   
   On 'deleted': DELETE from all paths
   
   syncShoppingList(list: ShoppingList, event: 'created' | 'deleted'): Promise<void>
   Path: /Heirloom/Einkaufslisten/${sanitize(list.name)}.md
   Format: # ${list.name}\n\n${list.items.map(i => `- [${i.checked?'x':' '}] ${i.ingredient}`).join('\n')}
   
   syncMealPlan(plan: MealPlan): Promise<void>
   Path: /Heirloom/Wochenpläne/KW${getWeekNumber(plan.weekStart)}-${year}.md
   Format: # Wochenplan KW${n}\n\n| | Mo | Di | Mi | Do | Fr | Sa | So |\n...

4. CORS handling:
   If browser CORS blocks Nextcloud, add proxy to server.ts:
   POST /api/nextcloud/proxy
   Body: { method, url, headers, body }
   Server forwards request, returns response
   useWebDAV.ts: detect CORS error → retry via proxy

5. Integration — call sync after every mutation:
   In useRecipeActions.ts:
   After saveRecipe() success: await syncRecipe(recipe, isNew?'created':'updated', favorites, collections)
   After deleteRecipe() success: await syncRecipe(recipe, 'deleted', favorites, collections)
   Sync errors MUST NOT block recipe saves — wrap in try/catch, show toast warning only

6. Sync status badge in Header.tsx:
   { status === 'syncing' && <CloudIcon className="animate-spin text-blue-500" /> }
   { status === 'success' && <CloudCheckIcon className="text-green-500" title={`Synced ${lastSyncedAt}`} /> }
   { status === 'error' && <CloudOffIcon className="text-red-500" title="Sync-Fehler" /> }

7. NextcloudSettings component (embedded in SettingsPage):
   - Server URL input: "https://cloud.example.com" placeholder
   - Username input
   - App Password input (type="password") + link: "Nextcloud → Einstellungen → Sicherheit → App-Passwörter"
   - "Verbindung testen" button → calls testConnection() → shows success/error toast
   - Enable/Disable toggle (saves to Firestore immediately)
   - "Jetzt synchronisieren" button → triggers full sync of all recipes
   - Last sync timestamp: "Zuletzt synchronisiert: vor 3 Min"
   
   Important notice in UI:
   "CORS muss in Nextcloud aktiviert sein. Falls die Verbindung fehlschlägt, wird
   automatisch ein Server-Proxy verwendet."

CONSTRAINTS:
- Sync is fire-and-forget — never await sync before returning from recipe save
- All WebDAV requests via server proxy if direct browser requests fail (detect by CORS/network error)
- Config stored in Firestore (not localStorage) so all family members share same sync config
- Only admin can configure Nextcloud sync
- Markdown files are append/replace, never merged — always full overwrite on PUT

OUTPUT:
- useWebDAV.ts hook
- recipeToMarkdown.ts utility + sanitizeFilename helper
- useNextcloudSync.ts hook
- NextcloudSettings.tsx component (for SettingsPage)
- Updated Header.tsx (sync status badge)
- Integration diff for useRecipeActions.ts
- Optional: server.ts proxy endpoint
```

---

## Prompt 6 — Offline-PWA (Selektives Caching)

```
CONTEXT:
Vite 6 + React 19 app. Firebase Firestore.
PWA Share Target already implemented in App.tsx (handles /import?url=...).
vite-plugin-pwa NOT yet installed. Firestore offline persistence NOT yet enabled.
Recipe type has images: string[] (Firestore base64 or URLs).

TASK:
Full offline-first PWA with user-selectable cache granularity.

1. Install & configure vite-plugin-pwa in vite.config.ts:
   plugins: [VitePWA({
     registerType: 'autoUpdate',
     workbox: {
       runtimeCaching: [
         { urlPattern: /^https:\/\/images\.unsplash\.com/, handler: 'CacheFirst',
           options: { cacheName: 'unsplash-images', expiration: { maxEntries: 200 } } },
         { urlPattern: /^https:\/\/firebasestorage\.googleapis\.com/, handler: 'CacheFirst',
           options: { cacheName: 'firebase-images', expiration: { maxEntries: 500 } } },
       ],
       navigateFallback: '/index.html'
     },
     manifest: {
       name: 'Heirloom',
       short_name: 'Heirloom',
       theme_color: '#1E40AF',
       background_color: '#ffffff',
       display: 'standalone',
       start_url: '/',
       shortcuts: [
         { name: 'Rezept scannen', url: '/import', icons: [...] },
         { name: 'Wochenplan', url: '/meal-planner', icons: [...] }
       ],
       share_target: {
         action: '/import',
         method: 'GET',
         params: { url: 'url' }
       }
     }
   })]
   (Move share_target from App.tsx meta tags to manifest)

2. firebase.ts — add offline persistence:
   import { enableIndexedDbPersistence } from 'firebase/firestore'
   
   async function initFirestore(db: Firestore) {
     try {
       await enableIndexedDbPersistence(db)
       console.log('Firestore offline persistence enabled')
     } catch (e: any) {
       if (e.code === 'failed-precondition') {
         toast.warning('Mehrere Tabs geöffnet — Offline-Modus nur in einem Tab verfügbar')
       } else if (e.code === 'unimplemented') {
         console.warn('Browser unterstützt keine Offline-Persistenz')
       }
     }
   }

3. useOnlineStatus.ts hook:
   const useOnlineStatus = () => {
     const [isOnline, setIsOnline] = useState(navigator.onLine)
     useEffect(() => {
       const on = () => setIsOnline(true)
       const off = () => setIsOnline(false)
       window.addEventListener('online', on)
       window.addEventListener('offline', off)
       return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
     }, [])
     return isOnline
   }
   
   In Header.tsx: show offline banner when !isOnline:
   "Offline — Änderungen werden gespeichert sobald du wieder online bist"
   Also: hide Scan button and URL-Import controls when offline

4. useOfflineCache.ts hook — selective image caching:
   
   State (localStorage):
   - cachedRecipeIds: Set<string>
   - offlineSettings: { allRecipes: boolean; favoritesOnly: boolean; categories: string[] }
   
   const CACHE_NAME = 'heirloom-recipe-images-v1'
   
   async cacheRecipeImages(recipe: Recipe): Promise<void>
   - For each url in recipe.images[] that starts with 'http':
     const cache = await caches.open(CACHE_NAME)
     const existing = await cache.match(url)
     if (!existing) { const resp = await fetch(url); await cache.put(url, resp) }
   - Add recipe.id to cachedRecipeIds set → save to localStorage
   
   async uncacheRecipeImages(recipe: Recipe): Promise<void>
   - For each url in recipe.images[]:
     const cache = await caches.open(CACHE_NAME); await cache.delete(url)
   - Remove from cachedRecipeIds
   
   async cacheByCategory(category: string, recipes: Recipe[]): Promise<void>
   - Filter recipes by category, call cacheRecipeImages for each
   
   async cacheFavorites(favoriteIds: string[], recipes: Recipe[]): Promise<void>
   - Filter by favoriteIds, call cacheRecipeImages for each
   
   async cacheAll(recipes: Recipe[]): Promise<void>
   - Warning: show confirm dialog "Das kann viel Speicher nutzen (ca. X MB). Fortfahren?"
   - Call cacheRecipeImages for all
   
   isCached(recipeId: string): boolean
   - Return cachedRecipeIds.has(recipeId)
   
   async getStorageUsage(): Promise<{ used: number; quota: number } | null>
   - const estimate = await navigator.storage.estimate()
   - Return { used: estimate.usage || 0, quota: estimate.quota || 0 }
   
   formatBytes(bytes: number): string — e.g. "45.2 MB"

5. CookingMode.tsx — auto-cache images when entering:
   useEffect(() => {
     if (recipe.images.length > 0) {
       cacheRecipeImages(recipe) // fire and forget
     }
   }, [recipe.id])
   This ensures the current recipe always works offline during cooking.

6. RecipeCard.tsx — offline badge:
   {isCached(recipe.id) && (
     <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1" title="Offline verfügbar">
       <WifiOff className="w-3 h-3" />
     </div>
   )}

7. RecipeDetail.tsx — offline action button:
   const cached = isCached(recipe.id)
   <button onClick={() => cached ? uncacheRecipeImages(recipe) : cacheRecipeImages(recipe)}>
     {cached ? <><Trash2 /> Offline-Daten löschen</> : <><Download /> Offline speichern</>}
   </button>

8. OfflineSettings component (in SettingsPage.tsx):
   Storage usage bar: "Genutzt: 45 MB / 500 MB verfügbar"
   
   Options:
   □ Favoriten immer offline verfügbar (empfohlen)
     → calls cacheFavorites() immediately on toggle
   □ Alle Rezepte offline speichern (viel Speicher)
     → confirm dialog → calls cacheAll()
   
   Kategorien offline:
   [Dessert ✓] [Hauptspeise □] [Snack ✓] [Vorspeise □]
   → calls cacheByCategory(category) on check
   
   "Gesamten Offline-Cache löschen" button (danger, with confirm)

CONSTRAINTS:
- Firestore offline persistence handles recipe DATA automatically
- Only image caching is manually managed (Firestore handles its own data layer)
- Service Worker must NOT intercept Firestore SDK network calls (Firestore uses its own networking)
- Base64 images stored directly in Firestore docs don't need separate caching
- Test: Chrome DevTools → Application → Service Workers → check "Offline" → reload

OUTPUT:
- vite.config.ts with VitePWA plugin (including manifest with shortcuts)
- Updated firebase.ts with enableIndexedDbPersistence
- useOnlineStatus.ts hook
- useOfflineCache.ts hook (full implementation)
- Updated Header.tsx (offline banner + hide scan when offline)
- Updated CookingMode.tsx (auto-cache on enter)
- Updated RecipeCard.tsx (offline badge)
- Updated RecipeDetail.tsx (offline button)
- OfflineSettings.tsx component for SettingsPage
```

---

## Prompt 7 — KI-Rezept-Generator

```
CONTEXT:
Recipe app with Gemini AI (@google/genai). geminiService.ts has existing functions.
BulkImportOverview.tsx is the review step before saving imported recipes.
Header.tsx has existing buttons: "Scan", "+ Neu".
Recipe schema already defined in geminiService.ts.

TASK:
Add AI recipe generation ("Erstelle mir ein Rezept") feature.

1. Add to geminiService.ts: generateRecipeFromPrompt(prompt: string, category?: string): Promise<Partial<Recipe>>
   
   System prompt:
   "Du bist ein erfahrener Küchenchef. Generiere ein detailliertes, authentisches Rezept auf Deutsch.
   Antworte ausschließlich mit dem JSON-Schema. Verwende reale Mengenangaben und präzise Schritte."
   
   Use existing recipeSchema from geminiService.ts.
   
   Set these fields automatically:
   - sourceName: "KI-generiert"
   - sourceUrl: "" (empty)
   - difficulty: inferred from instructions complexity
   - servings: 4 (default if not specified in prompt)
   
   Model: use same model as rest of geminiService (gemini-2.0-flash or current flash model)
   
   After generation: immediately call generateAutoImage(title, categories) → set images[0]
   Set isAutoImage: true on the returned recipe

2. AIGenerateModal.tsx component:
   Trigger: new button in Header.tsx — "✦ Erstellen" with Sparkles icon (lucide-react)
   Position: between "Scan" and "+ Neu" buttons
   
   Modal content:
   a) Category select: uses existing recipe categories from app config
      Options: alle vorhandenen Kategorien + "Sonstiges"
   
   b) Freitext textarea:
      Label: "Was soll es sein?"
      Placeholder: "z.B. Ein veganer Kuchen ohne Zucker, der schnell geht. Für 6 Personen."
      Suggestion chips (clickable, fill textarea):
      "Vegane Pasta" | "Glutenfreier Kuchen" | "Schnelles Abendessen" | 
      "Kinderfreundlich" | "Low Carb" | "Traditionell bayerisch"
   
   c) Generate button: "✦ Rezept generieren"
      Loading state: animated sparkle icon + "Gemini kocht..." (10-30s expected)
      Show elapsed time after 5s: "(~15 Sek verbleibend)"
   
   d) On success: show preview card with:
      - Generated recipe title + auto-image
      - Ingredient count + step count summary
      - Category + dietary badges
      - Two actions:
        "In Review öffnen" → closes modal, adds to BulkImportOverview
        "Direkt speichern" → saves immediately (admins only, skip review)
   
   e) Rate limit: 30s cooldown after each generation (UI-side only)
      Show countdown: "Nächste Generierung in 28 Sek..."
   
   f) Error state: "Gemini konnte kein Rezept generieren. Versuche eine konkretere Beschreibung."

3. Update Header.tsx:
   import { Sparkles } from 'lucide-react'
   Add button before existing "+ Neu":
   <button onClick={() => setIsGenerateModalOpen(true)} className="...">
     <Sparkles className="w-4 h-4" /> Erstellen
   </button>
   
   Hide for viewer role (useIsViewer check)

4. BulkImportOverview.tsx — accept AI-generated recipes:
   AI-generated recipes arrive the same way as scanned/imported ones.
   Show badge: "KI-generiert" instead of source name
   Show isAutoImage indicator: "Automatisches Platzhalterbild — klicke zum Ersetzen"

CONSTRAINTS:
- Generation takes 10-30s — never show timeout error before 45s
- Generated recipes MUST go through BulkImportOverview by default for review
- "Direkt speichern" only for admins (check userProfile.role === 'admin')
- Rate limit is UI-only (no server rate limiting needed for family use)
- sourceName "KI-generiert" is non-editable in the review step (show as locked badge)

OUTPUT:
- Updated geminiService.ts (generateRecipeFromPrompt function)
- AIGenerateModal.tsx component (full implementation)
- Updated Header.tsx (new button + modal state)
- Updated BulkImportOverview.tsx (AI-generated recipe display adaptations)
```

---

## Prompt 8 — Smart Search & Discovery

```
CONTEXT:
React 19 + Express.js backend. Gemini AI available. FlexSearch already integrated for keyword search.
uiStore.ts has filter state: searchQuery, filterCategory, filterDietary, filterDifficulty, filterDuration.
Recipe type fields: title, categories[], dietary[], ingredients[], tags[], duration, servings, difficulty.

TASK:
Natural language search that translates user intent into structured filters.

1. Backend: POST /api/recipes/smart-search in server.ts:
   
   Request body: { query: string }
   
   Gemini prompt:
   "Parse this German recipe search query into a structured filter JSON.
   Query: '${query}'
   
   Return ONLY valid JSON with these optional fields:
   {
     keywords?: string,          // general search terms for FlexSearch
     categories?: string[],      // e.g. ['Dessert', 'Hauptspeise']
     dietary?: string[],         // e.g. ['Vegan', 'Glutenfrei', 'Laktosefrei']
     difficulty?: string,        // 'einfach' | 'mittel' | 'schwer'
     maxDuration?: number,       // in minutes
     minServings?: number,
     maxServings?: number,
     mustHaveIngredients?: string[],  // ingredients that must appear
     season?: 'Frühling'|'Sommer'|'Herbst'|'Winter'
   }
   
   Examples:
   'veganer Kuchen ohne Zucker' → { dietary:['Vegan'], categories:['Dessert'], keywords:'Kuchen' }
   'schnell, max 20 Minuten' → { maxDuration: 20 }
   'Rezept mit Zucchini und Feta' → { mustHaveIngredients: ['Zucchini', 'Feta'] }
   'leichtes Sommeressen' → { season: 'Sommer', keywords: 'leicht' }
   "
   
   Response: return parsed JSON or empty {} on failure.
   Error handling: return {} with status 200 (never fail, fall back to keyword search)

2. useSmartSearch.ts hook:
   state: { isLoading: boolean, aiFilter: ParsedFilter | null, error: string | null }
   
   async parseQuery(query: string): Promise<ParsedFilter>
   - POST /api/recipes/smart-search
   - On success: return parsed filter
   - On error/timeout (>5s): return {}
   
   clearAIFilter(): void
   - Reset aiFilter to null, clear filter badges

3. SmartSearchBar.tsx component (replaces or extends existing search bar):
   
   Two modes (toggle via chip):
   [🔍 Stichwort] [✦ KI-Suche]   ← default: Stichwort
   
   Stichwort mode: existing FlexSearch behavior, no changes
   
   KI-Suche mode:
   - Freetext placeholder: "z.B. 'etwas Veganes mit Zucchini, max 30 Min für den Sommer'"
   - On Enter or Search button: call parseQuery() → apply result to uiStore filters
   - During loading: show spinner, disable input
   
   Active AI filter display (below search bar, only when aiFilter is set):
   <div className="flex gap-2 flex-wrap mt-2">
     {aiFilter.dietary?.map(d => <Badge>🥗 {d} <X onClick={removeFilter}/></Badge>)}
     {aiFilter.maxDuration && <Badge>⏱ max {aiFilter.maxDuration} Min <X/></Badge>}
     {aiFilter.mustHaveIngredients?.map(i => <Badge>🧄 {i} <X/></Badge>)}
     <button onClick={clearAIFilter}>Alle KI-Filter löschen</button>
   </div>
   
   "Keine Ergebnisse" state: "Keine Rezepte für diese Beschreibung gefunden.
   Tipp: Versuche 'Suche Zutaten die ich habe: Tomate, Pasta, Käse'"

4. Apply AI filter to recipe list:
   In HomePage.tsx or RecipeContext:
   After standard filters → additionally filter by aiFilter:
   - mustHaveIngredients: check if ingredient string in recipe.ingredients[] (case-insensitive partial match)
   - season: map to category hints or tags (no strict field exists — best-effort keyword match)
   - Other fields: map directly to existing filter fields in uiStore

5. Integration in HomePage.tsx:
   Replace existing SearchBar with SmartSearchBar
   When KI-Suche applies filters: show "KI-Suche aktiv" indicator next to result count
   "12 Rezepte gefunden (KI-Suche)" vs "12 Rezepte gefunden"

CONSTRAINTS:
- Keyword mode must remain identical to existing behavior (no regression)
- AI parse call timeout: abort after 5s, fall back to keyword search silently
- Never show "AI failed" to user — fall back gracefully
- mustHaveIngredients matching is fuzzy (partial string match, not exact)
- AI filter does NOT replace uiStore filter state — it's additive
  (user can still use dropdowns while KI-Suche is active)

OUTPUT:
- Updated server.ts (POST /api/recipes/smart-search endpoint)
- useSmartSearch.ts hook
- SmartSearchBar.tsx component
- Updated HomePage.tsx (SmartSearchBar integration + KI-filter application)
```

---

## Prompt 9 — Batch Import: Parallelisierung + Konfidenz-Scores

```
CONTEXT:
Current AIScanner.tsx processes images sequentially (one at a time, each awaited).
server.ts has image processing endpoint. geminiService.ts handles AI calls.
BulkImportOverview.tsx shows extracted recipes before saving.
Types: ImportedRecipe (temporary type used in bulk import flow).

TASK:
Optimize batch import with parallel processing, confidence scores, and batch editing.

1. Parallel chunk processing in server.ts:
   Current endpoint: processes one image per request.
   New behavior for batch endpoint POST /api/recipes/import-batch:
   
   Request: { images: { id: string, base64: string }[], source?: { name, url } }
   
   Processing:
   const CHUNK_SIZE = 3
   const chunks = chunkArray(images, CHUNK_SIZE)
   const results: ImportResult[] = []
   
   for (const chunk of chunks) {
     const chunkResults = await Promise.allSettled(
       chunk.map(img => processImage(img.base64, img.id))
     )
     results.push(...chunkResults.map((r, i) => 
       r.status === 'fulfilled' ? r.value : { id: chunk[i].id, error: r.reason.message }
     ))
   }
   
   processImage() must return: { recipes: Partial<Recipe>[], confidence: number, id: string }

2. Add confidence score to Gemini schema and prompt in geminiService.ts:
   
   Add to response schema:
   confidence: { type: Type.NUMBER, description: "0.0-1.0: clarity of recipe extraction. 1.0=all fields clearly visible in image, 0.7=some fields uncertain or handwritten, 0.3=might not be a recipe" }
   
   Add to system prompt:
   "Also rate your confidence: 1.0 if all fields are clearly legible, lower if handwritten, 
   partially visible, or if you're unsure it's a recipe."

3. Update BulkImportOverview.tsx:
   a) Per-recipe confidence display:
      - Confidence badge: green (≥0.8), yellow (0.5–0.8), red (<0.5)
      - Text: "Sicher erkannt", "Bitte prüfen", "Unsicher — manuell prüfen"
      - If confidence < 0.7: auto-expand the edit fields for that recipe
      - Sort order: uncertain recipes first
   
   b) Batch-Tag-Editor (new UI above recipe list):
      "Für alle ausgewählten Rezepte setzen:"
      - Category multi-select
      - Dietary multi-select
      - "Anwenden auf: alle | nur ausgewählte"
      Checkbox: select/deselect individual recipes
      "Alle auswählen / Keine auswählen" toggle
   
   c) Review stats header:
      "5 Rezepte importiert — 3 sicher erkannt, 2 bitte prüfen"

4. Progress UI in AIScanner.tsx:
   For each image: show status chip
   ● Ausstehend (gray) → ⟳ Wird verarbeitet (blue spinning) → ✓ Fertig (green) / ✗ Fehler (red)
   
   Overall progress bar: "3 / 8 verarbeitet"
   Estimated time: "ca. 45 Sek verbleibend" (based on avg time per image)
   
   "Abbrechen" button: sets abort flag, stops sending new chunks (already-running requests finish)

5. Error handling per image:
   Failed images: show in separate "Nicht erkannt" section in BulkImportOverview
   Error message: "Kein Rezept erkannt — möglicherweise kein Rezept auf diesem Bild"
   Option: "Manuell hinzufügen" → opens RecipeForm with empty form
   Option: "Ignorieren" → removes from list

CONSTRAINTS:
- Keep existing single-image sequential path for Scan button (backwards compat)
- Promise.allSettled ensures chunk failures don't abort whole batch
- Confidence score is stored temporarily in import flow, NOT saved to Firestore recipe doc
- Batch endpoint is separate from existing single-image endpoint

OUTPUT:
- Updated server.ts (POST /api/recipes/import-batch endpoint)
- Updated geminiService.ts (confidence field in schema + prompt)
- Updated AIScanner.tsx (per-image progress + batch endpoint usage)
- Updated BulkImportOverview.tsx (confidence display + batch-tag-editor)
```

---

## Prompt 10 — URL-Filter-State + Portionen-Scaler (Bundle)

```
CONTEXT:
React Router v7 app. Zustand uiStore.ts with searchQuery/filterCategory/filterDietary/
filterDifficulty/filterDuration/filterServings/viewMode (all persisted).
RecipeDetail.tsx shows recipe.ingredients[] (string array) and recipe.servings (number).

TASK (two small features, one session):

PART A — URL FILTER STATE:

1. Extend uiStore.ts:
   Add: sortBy: 'date_desc'|'date_asc'|'rating'|'name'|'duration' (default: 'date_desc')
   Add: setSortBy action (persisted)

2. useFilterSync.ts hook:
   import { useSearchParams, useNavigate } from 'react-router-dom'
   
   On mount: read URL params → initialize uiStore filters
   URL: /?category=Dessert&dietary=Vegan&sort=rating&q=Kuchen
   
   Map URL params → uiStore setters:
   q → setSearchQuery
   category → setFilterCategory
   dietary → setFilterDietary (comma-separated for multiple)
   difficulty → setFilterDifficulty
   maxDuration → setFilterDuration
   sort → setSortBy
   
   On uiStore filter change → update URL:
   useEffect(() => {
     const params = new URLSearchParams()
     if (searchQuery) params.set('q', searchQuery)
     if (filterCategory !== 'all') params.set('category', filterCategory)
     // ... etc, skip default/empty values
     navigate('?' + params.toString(), { replace: true })
   }, [searchQuery, filterCategory, filterDietary, filterDifficulty, sortBy])
   
   replace: true is critical — no browser history entries per filter change
   
   URL priority on mount: URL params override localStorage if both exist

3. Extend RecipeFilters.tsx:
   Add sort dropdown with ArrowUpDown icon (lucide-react):
   Options: "Neueste zuerst" | "Älteste zuerst" | "Beste Bewertung" | "A–Z" | "Kürzeste Dauer"
   
   Reads sortBy from uiStore, calls setSortBy

4. Apply sort in RecipeContext or HomePage useMemo (after filtering):
   const sorted = useMemo(() => [...filtered].sort((a, b) => {
     switch (sortBy) {
       case 'rating': return (b.averageRating || 0) - (a.averageRating || 0)
       case 'name': return a.title.localeCompare(b.title, 'de')
       case 'duration': return (a.duration || 9999) - (b.duration || 9999)
       case 'date_asc': return (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0)
       default: return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
     }
   }), [filtered, sortBy])

5. Call useFilterSync() once in HomePage.tsx

PART B — PORTIONEN-SCALER in RecipeDetail.tsx:

1. ServingsStepper.tsx component:
   Props: { value: number; onChange: (n: number) => void; min?: number; max?: number }
   Layout: [−] [4 Portionen] [+]
   Default min=1, max=100
   Tailwind: rounded buttons, current value prominent

2. parseIngredientAmount(ingredient: string): { amount: number | null, rest: string }
   Regex: /^(\d+(?:[.,]\d+)?(?:\/\d+)?)\s*/
   Examples:
   "300g Mehl" → { amount: 300, rest: "g Mehl" }
   "1/2 TL Salz" → { amount: 0.5, rest: "TL Salz" }
   "2,5 EL Öl" → { amount: 2.5, rest: "EL Öl" }
   "Salz nach Geschmack" → { amount: null, rest: "Salz nach Geschmack" }

3. formatAmount(n: number): string
   if (n === Math.floor(n)) return String(n)   // whole number
   const fractions: Record<number, string> = { 0.5: '½', 0.25: '¼', 0.75: '¾', 0.33: '⅓', 0.67: '⅔' }
   const rounded = Math.round(n * 4) / 4       // round to nearest 0.25
   return fractions[rounded] ?? n.toFixed(1)

4. ScaledIngredients.tsx component:
   Props: { ingredients: string[]; originalServings: number; currentServings: number }
   
   For each ingredient:
   const { amount, rest } = parseIngredientAmount(ingredient)
   if (amount === null) return <li>{ingredient}</li>  // unparseable, show as-is
   const scaled = amount * (currentServings / originalServings)
   return <li>{formatAmount(scaled)}{rest}</li>

5. Integration in RecipeDetail.tsx:
   const [currentServings, setCurrentServings] = useState(recipe.servings || 4)
   
   Replace static servings display with:
   <ServingsStepper value={currentServings} onChange={setCurrentServings} />
   
   Replace static ingredient list with:
   <ScaledIngredients ingredients={recipe.ingredients} 
     originalServings={recipe.servings || 4} currentServings={currentServings} />
   
   State resets when navigating away (no persistence needed — this is intentional)
   Add small note: "Angepasste Mengen werden nicht gespeichert"

CONSTRAINTS:
- URL params: only non-default values appear in URL (don't pollute URL with ?category=all&sort=date_desc)
- replace:true throughout (never push to browser history for filter changes)
- Scaling state is purely local — never write to Firestore
- Fraction rounding: round to nearest 0.25 before looking up in fractions map

OUTPUT:
- Extended uiStore.ts (sortBy)
- useFilterSync.ts hook
- Extended RecipeFilters.tsx (sort dropdown)
- Sort logic in RecipeContext or HomePage
- ServingsStepper.tsx component
- ScaledIngredients.tsx component + parseIngredientAmount + formatAmount utilities
- RecipeDetail.tsx integration diff
```

---

## Prompt 11 — ActivityFeed N+1 Fix + Pagination

```
CONTEXT:
React 19 + Firebase Firestore. ActivityFeed.tsx reads activities and then fetches 
each referenced user and recipe individually. RecipeContext loads all recipes at once.
Firestore SDK: getDoc, getDocs, collection, query, where, limit, startAfter, orderBy.

TASK:
Fix two performance problems.

PART A — ActivityFeed Batch Reads:

Current problem (pseudocode):
  activities.forEach(async (activity) => {
    const user = await getDoc(doc(db, 'users', activity.userId))  // N reads
    const recipe = await getDoc(doc(db, 'recipes', activity.recipeId))  // N reads
  })

Fix in ActivityFeed.tsx:
  1. Collect unique IDs from all activities:
     const uniqueUserIds = [...new Set(activities.map(a => a.userId).filter(Boolean))]
     const uniqueRecipeIds = [...new Set(activities.map(a => a.recipeId).filter(Boolean))]
  
  2. Batch fetch:
     const [userDocs, recipeDocs] = await Promise.all([
       Promise.all(uniqueUserIds.map(id => getDoc(doc(db, 'users', id)))),
       Promise.all(uniqueRecipeIds.map(id => getDoc(doc(db, 'recipes', id))))
     ])
  
  3. Build lookup maps:
     const usersMap = Object.fromEntries(userDocs.map(d => [d.id, d.data()]))
     const recipesMap = Object.fromEntries(recipeDocs.map(d => [d.id, d.data()]))
  
  4. Render activities using maps:
     const user = usersMap[activity.userId]
     const recipe = recipesMap[activity.recipeId]
  
  Additional: deduplicate activities by recipeId + type before rendering
  (Screenshot shows same recipe appearing 4x — filter to latest activity per recipe+type)

PART B — RecipeContext Pagination:

Current: loads ALL recipes in one onSnapshot listener.

New approach: cursor-based pagination with Firestore.

1. In RecipeContext (or new useRecipePagination.ts hook):
   const PAGE_SIZE = 24
   
   state: { recipes: Recipe[], lastDoc: DocumentSnapshot | null, hasMore: boolean, loading: boolean }
   
   Initial load:
   const q = query(
     collection(db, 'recipes'),
     where('authorId', '==', user.uid),
     where('isPublic', '==', true),  // or OR query
     orderBy('createdAt', 'desc'),
     limit(PAGE_SIZE)
   )
   
   loadMore():
   if (!lastDoc || !hasMore) return
   const q = query(...baseQuery, startAfter(lastDoc), limit(PAGE_SIZE))
   const snap = await getDocs(q)
   setRecipes(prev => [...prev, ...snap.docs.map(d => ({id: d.id, ...d.data()}))])
   setLastDoc(snap.docs[snap.docs.length - 1] || null)
   setHasMore(snap.docs.length === PAGE_SIZE)

2. Infinite scroll trigger in HomePage.tsx:
   const observerRef = useRef<IntersectionObserver | null>(null)
   const sentinelRef = useRef<HTMLDivElement>(null)
   
   useEffect(() => {
     observerRef.current = new IntersectionObserver(([entry]) => {
       if (entry.isIntersecting && hasMore && !loading) loadMore()
     }, { threshold: 0.1 })
     if (sentinelRef.current) observerRef.current.observe(sentinelRef.current)
     return () => observerRef.current?.disconnect()
   }, [hasMore, loading, loadMore])
   
   At bottom of recipe grid: <div ref={sentinelRef} />
   Show loading spinner below grid when loading && recipes.length > 0

3. FlexSearch: only index currently loaded recipes
   Re-index on each new page load (FlexSearch.add() for new recipes)
   Note: search only searches loaded recipes — show note "Suche in geladenen Rezepten"
   Alternative: keep search in Firestore (where('title', '>=', query)) for server-side search

4. RecipeContext backwards compat:
   Keep providing recipes[] to consumers as before
   Add: loadMore(), hasMore, paginationLoading

CONSTRAINTS:
- Keep onSnapshot for real-time updates on already-loaded recipes (mutations sync in real-time)
- Pagination is for initial load only — use getDocs not onSnapshot for subsequent pages
- FlexSearch limitation is acceptable — document it with a UI note
- The Firestore composite index will be needed: authorId + isPublic + createdAt

OUTPUT:
- Updated ActivityFeed.tsx (batch reads + deduplication)
- Updated RecipeContext or new useRecipePagination.ts
- Updated HomePage.tsx (infinite scroll sentinel)
- Firestore composite index definition (firestore.indexes.json)
```

---

## Prompt 12 — Stock-Rezepte + Onboarding-Flow

```
CONTEXT:
React 19 + Firebase Firestore. UserProfile type has: uid, displayName, role.
New users: created in onAuthStateChanged when user first logs in.
Inspiration app uses isStock:true flag for demo recipes auto-added to new users.

TASK:
Add stock recipes for new users + onboarding flow.

PART A — STOCK RECIPES:

1. Add to types.ts:
   Recipe: add isStock?: boolean field

2. Create src/data/stockRecipes.ts — 4 example recipes:
   Each should be fully formed Recipe objects (without id, authorId, createdAt — those set on save)
   Requirements per recipe:
   - Complete ingredients[] (5+ items with amounts)
   - Complete instructions[] (3+ steps)
   - categories[], dietary[], difficulty, duration, servings all set
   - notes with a "Familientipp" or history
   - isStock: true
   - isAutoImage: true + images[] set to one Unsplash URL (from generateAutoImage categories)
   
   Suggested recipes (classic, varied, well-known German dishes):
   1. Klassischer Kartoffelsalat (Beilage, Vegetarisch)
   2. Schnelle Tomatensoße (Hauptspeise, Vegan)
   3. Apfelkuchen vom Blech (Dessert, Vegetarisch)
   4. Overnight Oats mit Früchten (Frühstück, Vegan, Glutenfrei möglich)
   
   For each, manually assign an Unsplash image URL from the FOOD_IMAGES bank.

3. In onAuthStateChanged (firebase.ts or AuthContext.tsx):
   When creating new UserProfile (first login):
   
   const existingRecipes = await getDocs(query(collection(db, 'recipes'), 
     where('authorId', '==', user.uid), limit(1)))
   
   if (existingRecipes.empty) {
     // Add stock recipes for new user
     const batch = writeBatch(db)
     stockRecipes.forEach(recipe => {
       const ref = doc(collection(db, 'recipes'))
       batch.set(ref, { ...recipe, authorId: user.uid, authorName: user.displayName,
                        createdAt: serverTimestamp(), isPublic: true })
     })
     await batch.commit()
   }

4. RecipeCard.tsx: add subtle "Beispiel" badge for isStock recipes:
   Small bottom-right badge: "Beispiel"
   Semi-transparent, doesn't distract from main content

PART B — ONBOARDING FLOW:

1. Add to types.ts:
   UserProfile: add onboardingCompleted?: boolean

2. OnboardingModal.tsx — 3-step wizard:
   Trigger: show when userProfile.onboardingCompleted !== true
   
   Step 1 — Welcome:
   Large emoji: 👨‍🍳
   Title: "Willkommen bei Heirloom, [displayName]!"
   Text: "Deine private Familiensammlung für Rezepte und Erinnerungen. Wir haben ein paar 
   Beispielrezepte für dich vorbereitet."
   Button: "Los geht's →"
   
   Step 2 — Import feature:
   Illustration: simple SVG showing phone camera → recipe card
   Title: "Rezepte digitalisieren"
   Text: "Fotografiere handgeschriebene Rezepte, füge Links von Chefkoch oder YouTube ein,
   oder erstelle Rezepte von Grund auf neu. Unsere KI erkennt alles automatisch."
   Button: "Weiter →"
   
   Step 3 — Family:
   Illustration: simple SVG showing multiple user avatars
   Title: "Teile es mit der Familie"
   Text: "Füge Familienmitglieder über den Admin-Bereich hinzu. Alle können Rezepte lesen,
   bewerten und Erinnerungen hinzufügen."
   Two buttons:
   "Jetzt erkunden" → closes modal, marks onboarding complete
   "Erstes Rezept scannen" → closes modal, navigates to /import, marks complete
   
   Step indicator: "● ● ●" → "● ● ●" (filled dots for completed steps)
   Skip button (top right): "Überspringen" → marks complete, closes

3. Mark onboarding complete:
   On any close/finish action:
   await updateDoc(doc(db, 'users', user.uid), { onboardingCompleted: true })
   Update local userProfile state

4. Show OnboardingModal in AppContent.tsx or App.tsx:
   {userProfile && !userProfile.onboardingCompleted && <OnboardingModal />}

CONSTRAINTS:
- Stock recipes must look high quality — use complete, realistic recipe data
- Onboarding shows ONCE per user, never again after completion
- Skip is always visible — never trap users in onboarding
- Stock recipe isStock:true field → excluded from "total recipes" count in any analytics
- Do NOT auto-delete stock recipes (unlike inspiration app's 24h cleanup — that's for demo only)

OUTPUT:
- Updated types.ts (isStock, onboardingCompleted fields)
- src/data/stockRecipes.ts (4 fully formed recipes)
- Updated AuthContext.tsx / onAuthStateChanged (stock recipe injection for new users)
- RecipeCard.tsx "Beispiel" badge for isStock
- OnboardingModal.tsx (3-step wizard, full implementation)
- Updated AppContent.tsx (OnboardingModal render condition)
```

---

## Verwendungshinweise

**Für jeden Prompt:**
1. Entsprechenden Prompt kopieren → in Google AI Studio einfügen
2. Relevante Quell-Dateien als Kontext anhängen (z.B. `types.ts`, `uiStore.ts`, die genannten Komponenten)
3. Bei komplexen Prompts (5, 6, 9): aufteilen in zwei Sessions wenn nötig
4. Code reviewen und testen vor Integration

**Empfohlene Reihenfolge:**
```
Sofort:  3 (View-Toggle, 5 Minuten)
Woche 1: 1 (Dark Mode) → 2 (Auto-Bild) → 4 (Viewer-Rolle)
Woche 2: 5 (Nextcloud) → 6 (Offline-PWA)
Woche 3: 7 (KI-Generator) → 8 (Smart Search)
Woche 4: 9 (Batch Import) → 10 (URL-Filter + Scaler)
Woche 5: 11 (Performance) → 12 (Stock-Rezepte + Onboarding)
```

---

*Erstellt: Mai 2026 · Version 2.1 · The Heirloom Editorial*
