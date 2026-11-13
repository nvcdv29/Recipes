# The Heirloom Editorial - Projekt-Analyse & Roadmap

## Executive Summary

The Heirloom Editorial ist eine technisch ausgereiftes, KI-gestütztes Rezeptverwaltungs-System für Familien. Der aktuelle Stand zeigt eine robuste Implementierung mit Schwerpunkt auf intelligentem Import und strukturierter Datenverwaltung. Die App ist bereit für den nächsten Evolutionsschritt: von der Import-fokussierten Plattform zur vollwertigen digitalen Familien-Kochbuch-Erfahrung.

---

## 1. Technische Ist-Analyse

### 1.1 Architektur-Stack

**Frontend:**
- React 19 + TypeScript
- Vite 6.2 (Build-Tool)
- Tailwind CSS 4.1 (Styling)
- Motion/Framer Motion (Animationen)
- Lucide React (Icons)

**Backend & Services:**
- Express.js (API-Server)
- Firebase Firestore (Datenbank)
- Firebase Auth (Authentifizierung)
- Google Gemini AI (Rezepterkennung)

**Externe Dienste:**
- YouTube Transcript API (Video-Import)
- Cheerio (Web-Scraping)
- Browser Image Compression (Bildoptimierung)

**Besondere Libraries:**
- FlexSearch (Volltext-Suche)
- jsPDF (PDF-Export)
- React Markdown (Formatierte Anweisungen)

### 1.2 Aktuelle Features (Status Quo)

#### ✅ Kern-Funktionalität
1. **Multi-Source Import**
   - Bildbasierter Scanner (handschriftlich & gedruckt)
   - URL-Import (Websites, YouTube, Instagram)
   - Bulk-Upload mit sequentieller Verarbeitung
   - Automatisches Stitching mehrerer Bilder zu einem Rezept
   - JSON-Reparatur bei unvollständigen KI-Antworten

2. **Datenverwaltung**
   - 3-stufiges Tagging-System (Kategorien, Ernährungsart, User-Tags)
   - Quellenangaben mit automatischer URL-Verlinkung
   - Zweigeteilte Bildkomprimierung (Scanner: 150KB/800px, Meal-Fotos: 300KB/1600px)
   - Firestore-Speicherschutz (max. 3 Bilder pro Rezept)

3. **Benutzer-Funktionen**
   - Bulk-Import-Review-Ansicht
   - Erweiterte Filter (Suche, Kategorie, Ernährung, Schwierigkeit, Dauer, Portionen)
   - Detailansicht mit Bewertungssystem
   - PDF-Export (optional mit Bild und Rating)
   - Vollständiges CRUD für Rezepte

4. **Sicherheit & Zugriff**
   - Multi-Provider-Auth (Google, Email, Magic Link)
   - Whitelist-System für Familienmitglieder
   - Öffentliche vs. private Rezepte
   - Admin-Rolle mit erweiterten Rechten
   - Granulare Firestore Security Rules

#### 🔴 Identifizierte Schwächen & Gaps

1. **Architektur**
   - Monolithische App.tsx (2631 Zeilen) - schwer wartbar
   - Keine Komponenten-Aufteilung
   - Keine Router-Navigation
   - Single-File-Architecture limitiert Skalierbarkeit

2. **User Experience**
   - Keine Kochansicht (Step-by-Step Modus)
   - Keine Einkaufslisten-Funktion
   - Keine Menüplanung
   - Keine Social-Features (Kommentare, Favoriten-Sharing)
   - Keine Mobile-App (nur Web)

3. **Datenqualität**
   - Keine automatische Duplikaterkennung
   - Keine Nährwertinformationen
   - Keine Kostenkalkulation
   - Keine Zutatenverwaltung (Inventar)

4. **Import & KI**
   - Keine Batch-Korrektur nach Import
   - Keine Lernfunktion für wiederkehrende Fehler
   - Keine manuellen Korrekturen während der KI-Verarbeitung
   - Keine Konfidenz-Scores der KI-Extraktion

5. **Kollaboration**
   - Keine Rezept-Varianten/Forks
   - Keine Änderungshistorie
   - Keine gemeinsame Bearbeitung
   - Keine Kommentar-Funktion

---

## 2. Feature-Brainstorming

### 2.1 Quick Wins (Low Effort, High Impact)

#### A. Kochansicht (Cooking Mode)
**Beschreibung:** Schritt-für-Schritt-Modus mit großen Buttons und Timer-Integration

**Features:**
- Vollbild-Modus für Tablet/Handy beim Kochen
- Große "Weiter"-Buttons (Touchscreen-optimiert)
- Integrierte Timer pro Schritt
- Zutatenliste mit Abhak-Funktion
- Sprachsteuerung (optional)
- Bildschirmsperre-Verhinderung

**Technische Umsetzung:**
```typescript
interface CookingModeState {
  currentStep: number;
  timers: { stepIndex: number; duration: number; running: boolean }[];
  checkedIngredients: Set<number>;
  fullscreen: boolean;
}
```

**Nutzen:** Massiv verbesserte UX beim aktiven Kochen, Haupt-Use-Case-Optimierung

---

#### B. Einkaufsliste
**Beschreibung:** Automatische Generierung von Einkaufslisten aus Rezepten

**Features:**
- Mehrere Rezepte zu einer Liste kombinieren
- Mengenumrechnung basierend auf Portionen
- Gruppierung nach Supermarkt-Kategorien
- Export als PDF/Text
- Teilen-Funktion (WhatsApp, Email)
- "Habe ich schon"-Checkbox

**Technische Umsetzung:**
```typescript
interface ShoppingList {
  id: string;
  name: string;
  recipes: { recipeId: string; servings: number }[];
  items: {
    ingredient: string;
    quantity: string;
    category: string; // Gemüse, Fleisch, Milchprodukte...
    checked: boolean;
  }[];
  createdAt: string;
}
```

**Nutzen:** Brücke zwischen digitaler Rezeptsammlung und praktischem Einkauf

---

#### C. Favoriten & Collections
**Beschreibung:** Persönliche Sammlungen und Favoriten-Verwaltung

**Features:**
- Stern-Favoriten pro User
- Benutzerdefinierte Collections ("Weihnachten", "Sommergerichte")
- Drag & Drop zum Organisieren
- Collections teilen innerhalb der Familie
- Smart Collections (Auto-Filter, z.B. "Alle veganen Desserts")

**Technische Umsetzung:**
```typescript
interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  recipeIds: string[];
  isShared: boolean;
  icon?: string;
  color?: string;
}
```

**Nutzen:** Persönliche Organisation ohne Datenduplikation

---

#### D. Duplikat-Erkennung
**Beschreibung:** Automatische Erkennung ähnlicher Rezepte beim Import

**Features:**
- Fuzzy-Matching auf Rezepttitel
- Ähnlichkeitsscore basierend auf Zutaten
- Merge-Vorschläge mit Diff-Ansicht
- "Ist das dasselbe Rezept?"-Dialog
- Optional: Duplikate als Varianten verknüpfen

**Technische Umsetzung:**
```typescript
// Levenshtein-Distanz + Zutatenlisten-Vergleich
function calculateSimilarity(recipe1: Recipe, recipe2: Recipe): number {
  const titleScore = levenshtein(recipe1.title, recipe2.title);
  const ingredientOverlap = jaccard(recipe1.ingredients, recipe2.ingredients);
  return (titleScore * 0.3 + ingredientOverlap * 0.7);
}
```

**Nutzen:** Verhindert Datenmüll und verbessert Datenqualität

---

### 2.2 Medium-Term Features (Medium Effort, High Impact)

#### E. Menüplanung / Wochenplaner
**Beschreibung:** Kalender-basierte Essensplanung für die ganze Familie

**Features:**
- Drag & Drop Rezepte auf Wochentage
- Mehrere Mahlzeiten pro Tag (Frühstück, Mittagessen, Abendessen)
- Automatische Einkaufsliste aus Wochenplan
- Wiederholende Pläne ("Jeden Freitag Pizza")
- Ernährungsbalance-Visualisierung
- Export als PDF/ICS-Kalender

**Technische Umsetzung:**
```typescript
interface MealPlan {
  id: string;
  userId: string;
  weekStart: string; // ISO date
  meals: {
    day: string; // "monday", "tuesday"...
    type: "breakfast" | "lunch" | "dinner" | "snack";
    recipeId?: string;
    servings: number;
    notes?: string;
  }[];
}
```

**Nutzen:** Strategie statt Spontanität, reduziert Food Waste

---

#### F. Nährwertinformationen
**Beschreibung:** Automatische Berechnung von Nährwerten

**Features:**
- KI-basierte Nährwertschätzung aus Zutaten
- Integration mit Nährwert-Datenbanken (USDA, OpenFoodFacts)
- Manuelle Überschreibung möglich
- Pro-Portion-Kalkulation
- Makro-Visualisierung (Protein/Fett/Kohlenhydrate)
- Allergene-Warnung

**Technische Umsetzung:**
```typescript
interface NutritionalInfo {
  recipeId: string;
  perServing: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
  };
  source: "estimated" | "manual" | "database";
  allergens: string[];
}
```

**Nutzen:** Gesundheitsbewusste Ernährung unterstützen

---

#### G. Rezept-Varianten & Versionierung
**Beschreibung:** Änderungshistorie und alternative Versionen

**Features:**
- "Fork this recipe" - Eigene Variante erstellen
- Änderungshistorie mit Diff-View
- "Meine Version von Omas Apfelkuchen"
- Variant-Linking (siehe verwandte Rezepte)
- Rollback zu früheren Versionen
- Change-Log automatisch generiert

**Technische Umsetzung:**
```typescript
interface RecipeVersion {
  id: string;
  recipeId: string;
  version: number;
  changes: Partial<Recipe>;
  changedBy: string;
  changeDate: string;
  changeDescription?: string;
}

interface RecipeVariant {
  id: string;
  parentRecipeId: string;
  ownerId: string;
  variantName: string; // "Noahs glutenfreie Version"
  differences: Partial<Recipe>;
}
```

**Nutzen:** Familien-Rezepte evolvieren über Generationen

---

#### H. Smart Search & Discovery
**Beschreibung:** Erweiterte Suche mit KI-Unterstützung

**Features:**
- Natürlichsprachliche Suche ("Was kann ich mit Kartoffeln und Käse machen?")
- "Zutaten, die ich habe"-Suche
- "Was koche ich heute?"-Vorschläge basierend auf:
  - Wetter
  - Jahreszeit
  - Frühere Favoriten
  - Verfügbare Zeit
- Visuelle Suche (Foto von Gericht hochladen)
- "Ähnliche Rezepte"-Vorschläge

**Technische Umsetzung:**
- Gemini AI für Natural Language Understanding
- Vector-basierte Suche für semantische Ähnlichkeit
- Embedding-basierte Rezept-Empfehlungen

**Nutzen:** Reduziert "Was koche ich heute?"-Entscheidungsmüdigkeit

---

#### I. Batch-Verarbeitungs-Verbesserungen
**Beschreibung:** Optimierter Workflow für große Import-Mengen

**Features:**
- Parallel-Verarbeitung (mehrere Bilder gleichzeitig)
- Live-Preview während Verarbeitung
- Batch-Editing nach Import (alle Rezepte auf einmal taggen)
- KI-Konfidenz-Scores anzeigen
- Manuelle Korrektur-Queue für unsichere Extrakte
- Lernfunktion: Korrekturen für zukünftige Importe speichern

**Technische Umsetzung:**
```typescript
interface ImportJob {
  id: string;
  status: "processing" | "review" | "completed";
  images: { id: string; status: string; confidence: number }[];
  extractedRecipes: (Recipe & { confidence: number; needsReview: boolean })[];
}
```

**Nutzen:** Effizienz bei großen Rezeptsammlungen (z.B. ganzes Kochbuch digitalisieren)

---

### 2.3 Long-Term Features (High Effort, High Impact)

#### J. Mobile Native App
**Beschreibung:** iOS/Android App mit Offline-Funktionalität

**Features:**
- React Native oder Flutter
- Offline-Zugriff auf Favoriten
- Push-Notifications (Timer, Menüplan-Erinnerungen)
- Kamera-Integration für schnelleren Import
- Widgets (Heutiger Menüplan)
- Handoff zwischen Web und Mobile

**Nutzen:** Immer dabei, auch ohne Internet

---

#### K. Inventory Management
**Beschreibung:** Virtueller Vorratsschrank

**Features:**
- Zutaten-Inventar verwalten
- Ablaufdaten tracken
- "Was kann ich mit meinem Vorrat kochen?"
- Einkaufslisten-Integration (automatisch hinzufügen, wenn leer)
- Barcode-Scanner für schnelles Hinzufügen
- Mengenwarnung bei niedrigem Bestand

**Technische Umsetzung:**
```typescript
interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expirationDate?: string;
  location: string; // "Kühlschrank", "Vorratsschrank"
  lowStockThreshold?: number;
}
```

**Nutzen:** Reduziert Lebensmittelverschwendung, optimiert Einkäufe

---

#### L. Familien-Social-Features
**Beschreibung:** Kollaborative Funktionen für die ganze Familie

**Features:**
- Kommentare & Diskussionen pro Rezept
- "Habe ich gekocht"-Tagebuch mit Fotos
- Bewertungen mit Rezension
- @-Mentions ("@Mama, wie viel Butter genau?")
- Gemeinsame Bearbeitung (Google Docs-Style)
- Aktivitäts-Feed ("Oma hat ein neues Rezept hinzugefügt")

**Technische Umsetzung:**
```typescript
interface Comment {
  id: string;
  recipeId: string;
  userId: string;
  text: string;
  mentions: string[]; // user IDs
  createdAt: string;
  replyTo?: string; // parent comment ID
}

interface CookingLog {
  id: string;
  recipeId: string;
  userId: string;
  cookedDate: string;
  photos: string[];
  notes?: string;
  rating?: number;
}
```

**Nutzen:** Stärkt Familienbindung durch gemeinsames Kochen

---

#### M. Advanced Analytics
**Beschreibung:** Insights über Koch- und Essgewohnheiten

**Features:**
- "Most Cooked"-Rezepte
- Saisonale Trends
- Ernährungs-Balance über Zeit
- Kosten pro Rezept/Woche
- CO2-Fußabdruck-Schätzung
- "Rezepte, die du noch nie gekocht hast"

**Dashboard-Visualisierung:**
- Charts mit Recharts oder D3.js
- Export als PDF-Report
- Personalisierte Empfehlungen

**Nutzen:** Datenbasierte Ernährungsoptimierung

---

#### N. Recipe Scaling Intelligence
**Beschreibung:** Intelligente Mengenanpassung

**Features:**
- Automatische Umrechnung für beliebige Portionen
- Berücksichtigung nicht-linearer Skalierung (z.B. Backzeiten)
- Zutat-Substitution-Vorschläge
- Einheiten-Konvertierung (Cups → Gramm, etc.)
- "Was wenn ich nur 2 Eier habe?"-Solver

**Technische Umsetzung:**
- KI-basierte Rezeptanpassung
- Regel-Engine für Koch-Logik
- Einheiten-Konvertierungstabellen

**Nutzen:** Flexibilität bei spontanen Gästen oder kleinen Portionen

---

#### O. Print-on-Demand Kochbuch
**Beschreibung:** Physisches Kochbuch aus digitaler Sammlung

**Features:**
- Auswahl von Rezepten für Druckversion
- Professionelles Layout (InDesign-Style)
- Custom Cover-Design
- QR-Codes zu digitalen Rezepten
- Integration mit Druck-Services (Blurb, Lulu)
- "Geschenk für Oma"-Funktion

**Nutzen:** Haptisches Erlebnis, Geschenkidee, Backup

---

### 2.4 Nice-to-Have Features (Low Priority)

#### P. Video-Integration
- Schritt-für-Schritt Video-Uploads
- YouTube-Embed in Rezeptansicht
- TikTok/Instagram Reels-Import

#### Q. Gamification
- Achievements ("100 Rezepte gekocht!")
- Cooking Challenges
- Leaderboards
- "Rezept der Woche" Voting

#### R. Alexa/Google Home Integration
- Voice-Guided Cooking
- "Alexa, zeig mir das nächste Schritt"
- Timer-Steuerung

#### S. AI Recipe Generator
- "Erstelle ein Rezept mit [Zutaten]"
- Style-Transfer ("Mach daraus eine asiatische Version")
- Allergen-Anpassung automatisch

---

## 3. Prioritäten-Matrix

### High Impact, Low Effort → **JETZT UMSETZEN**
1. ✅ **Kochansicht (Cooking Mode)** - Kern-Feature
2. ✅ **Einkaufsliste** - Sofort nützlich
3. ✅ **Favoriten & Collections** - Einfache UX-Verbesserung
4. ✅ **Duplikat-Erkennung** - Datenqualität

### High Impact, Medium Effort → **NÄCHSTE PHASE**
5. ⚠️ **Menüplanung** - Großer Mehrwert
6. ⚠️ **Smart Search & Discovery** - Benutzerfreundlichkeit
7. ⚠️ **Nährwertinformationen** - Gesundheitsaspekt
8. ⚠️ **Rezept-Varianten** - Familienkontext

### High Impact, High Effort → **LANGFRISTIG**
9. 🔴 **Mobile Native App** - Technischer Aufwand
10. 🔴 **Inventory Management** - Komplexität
11. 🔴 **Familien-Social-Features** - Feature-Set
12. 🔴 **Advanced Analytics** - Datenmodell

### Medium/Low Impact → **BACKLOG**
13. 📋 Recipe Scaling Intelligence
14. 📋 Print-on-Demand Kochbuch
15. 📋 Video-Integration
16. 📋 Gamification
17. 📋 Voice Assistant Integration
18. 📋 AI Recipe Generator

---

## 4. Technische Refactoring-Roadmap

### Phase 0: Architektur-Cleanup (Voraussetzung für Skalierung)

**Ziel:** Wartbarkeit und Erweiterbarkeit verbessern

**Tasks:**
1. **Komponenten-Aufteilung**
   ```
   src/
   ├── components/
   │   ├── recipes/
   │   │   ├── RecipeCard.tsx
   │   │   ├── RecipeDetail.tsx
   │   │   ├── RecipeForm.tsx
   │   │   └── RecipeFilters.tsx
   │   ├── import/
   │   │   ├── ImageScanner.tsx
   │   │   ├── URLImport.tsx
   │   │   └── ImportReview.tsx
   │   ├── layout/
   │   │   ├── Header.tsx
   │   │   ├── Sidebar.tsx
   │   │   └── Modal.tsx
   │   └── ui/
   │       ├── Button.tsx
   │       ├── Input.tsx
   │       └── Badge.tsx
   ├── hooks/
   │   ├── useRecipes.ts
   │   ├── useAuth.ts
   │   └── useFilters.ts
   ├── contexts/
   │   ├── AuthContext.tsx
   │   └── RecipeContext.tsx
   ├── utils/
   │   ├── imageCompression.ts
   │   ├── pdfExport.ts
   │   └── validation.ts
   └── pages/
       ├── HomePage.tsx
       ├── RecipeDetailPage.tsx
       └── SettingsPage.tsx
   ```

2. **Router einführen**
   - React Router Dom
   - Dedizierte Routen für Detailansichten
   - URL-basierte Filter-States

3. **State Management optimieren**
   - Zustand (lightweight) oder Context + useReducer
   - Persistente States (Filter, View-Präferenzen)

4. **Testing-Setup**
   - Vitest + React Testing Library
   - Minimum Test Coverage: 60%

**Zeitrahmen:** 2-3 Wochen

---

## 5. Feature-Roadmap (18 Monate)

### 🎯 Phase 1: Quick Wins & Basis-UX (Monate 1-3)

**Ziele:**
- Verbesserte Koch-Erfahrung
- Bessere Organisation
- Datenqualität

**Features:**
1. **Woche 1-2:** Architektur-Refactoring (Foundation)
2. **Woche 3-4:** Kochansicht (Cooking Mode)
3. **Woche 5-6:** Einkaufsliste
4. **Woche 7-8:** Favoriten & Collections
5. **Woche 9-10:** Duplikat-Erkennung
6. **Woche 11-12:** Testing, Bug-Fixes, Polish

**Deliverables:**
- ✅ Saubere Code-Architektur
- ✅ 4 neue Haupt-Features
- ✅ Verbesserte User Experience
- ✅ Test-Coverage >60%

**Metriken:**
- User-Feedback: Kochansicht-Nutzung >70%
- Duplikat-Erkennungsrate >80%
- Einkaufslisten-Nutzung >50%

---

### 🚀 Phase 2: Smart Features & Planung (Monate 4-9)

**Ziele:**
- Intelligente Funktionen
- Vorausplanung unterstützen
- Gesundheitsbewusstsein

**Features:**
1. **Monat 4-5:** Menüplanung & Wochenplaner
2. **Monat 6:** Smart Search & Discovery
3. **Monat 7:** Nährwertinformationen
4. **Monat 8:** Rezept-Varianten & Versionierung
5. **Monat 9:** Batch-Verarbeitungs-Verbesserungen

**Deliverables:**
- ✅ KI-powered Features
- ✅ Planungs-Tools
- ✅ Gesundheits-Tracking
- ✅ Optimierter Import-Workflow

**Metriken:**
- Menüplan-Adoption >40%
- Nährwert-Nutzung >30%
- Reduzierte Import-Zeit um 50%

---

### 🏗️ Phase 3: Platform & Ecosystem (Monate 10-15)

**Ziele:**
- Mobile-first
- Offline-Fähigkeit
- Erweiterte Features

**Features:**
1. **Monat 10-12:** Mobile Native App (React Native)
   - iOS & Android
   - Offline-Modus
   - Push-Notifications
2. **Monat 13:** Inventory Management
3. **Monat 14:** Familien-Social-Features
4. **Monat 15:** Advanced Analytics Dashboard

**Deliverables:**
- ✅ Native Apps im App Store & Play Store
- ✅ Vollständiges Inventar-System
- ✅ Social Collaboration
- ✅ Daten-Insights

**Metriken:**
- Mobile App Downloads >500
- Inventory-Nutzung >25%
- Social-Features-Engagement >60%

---

### 🎨 Phase 4: Polish & Premium (Monate 16-18)

**Ziele:**
- Premium-Features
- Monetarisierung (optional)
- Perfektion

**Features:**
1. **Monat 16:** Recipe Scaling Intelligence
2. **Monat 17:** Print-on-Demand Kochbuch
3. **Monat 18:** AI Recipe Generator

**Premium Tier (Optional):**
- Unbegrenzte Rezepte (Free: 100 Rezepte)
- Print-on-Demand Kochbücher
- Advanced Analytics
- Priority Support
- Family-Accounts (bis zu 10 Nutzer)

**Deliverables:**
- ✅ Premium-Tier
- ✅ Professionelles Produkt
- ✅ Skalierbare Infrastruktur

---

## 6. Design-Evolution

### Aktuelle Design-Philosophie:
- ✅ Clean, minimalistisch
- ✅ Tailwind-basiert
- ✅ Lucide Icons
- ✅ Motion-Animationen

### Vorschläge für Design-Verbesserungen:

#### 6.1 Visuelle Identität
**Farbschema:**
- Primärfarbe: Warmes Terracotta/Rost (Familien-Wärme)
- Sekundärfarbe: Salbeigrün (Frische, Natur)
- Akzent: Honig-Gold (Highlights)
- Neutral: Cremeweiß & Anthrazit

**Typografie:**
- Headings: Inter oder Poppins (modern, clean)
- Body: System UI Stack (Performance)
- Rezepttitel: Optional eine Serif-Font (z.B. Merriweather) für Eleganz

**Illustration-Style:**
- Handgezeichnete Illustrationen für leere Zustände
- Aquarell-Effekte für Kategorie-Header
- Vintage-Cookbook-Ästhetik für Print-Modus

#### 6.2 Layout-Verbesserungen
**Rezept-Cards:**
```
┌─────────────────────────────┐
│  [Großes Rezeptbild]        │
│                             │
├─────────────────────────────┤
│ 👤 Oma Lotte | ⭐ 4.5      │
│                             │
│ Apfelkuchen nach Familienrezept
│                             │
│ 🕐 45 Min | 👥 8 Portionen │
│ 🥗 Vegetarisch             │
│                             │
│ [Favorit ⭐] [Mehr ⋮]      │
└─────────────────────────────┘
```

**Detail-Ansicht:**
- Hero-Image mit Parallax-Scroll
- Sticky Ingredient-List beim Scrollen
- Progress-Bar für Kochanweisungen
- "Jump to Step"-Navigation

#### 6.3 Micro-Interactions
- **Favoriten:** Herz-Animation beim Klick
- **Timer:** Pulsing-Effekt bei laufendem Timer
- **Checkboxes:** Satisfying-Haken-Animation
- **Image-Upload:** Drag-Preview mit Zoom
- **Rating:** Star-Fill-Animation

#### 6.4 Dark Mode
- Automatische Erkennung (System-Präferenz)
- Toggle in Settings
- Optimierte Farben für dunkle UI
- Bilder: Leichter Brightness-Filter

---

## 7. Datenmodell-Erweiterungen

### Neue Collections

```typescript
// Collections
interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  recipeIds: string[];
  isShared: boolean;
  isSmartCollection: boolean;
  filterCriteria?: FilterCriteria; // für Smart Collections
  icon?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

// MealPlan
interface MealPlan {
  id: string;
  userId: string;
  name: string;
  weekStart: string;
  weekEnd: string;
  meals: Meal[];
  shoppingListId?: string;
  createdAt: string;
}

interface Meal {
  id: string;
  date: string;
  type: "breakfast" | "lunch" | "dinner" | "snack";
  recipeId?: string;
  servings: number;
  notes?: string;
}

// ShoppingList
interface ShoppingList {
  id: string;
  name: string;
  userId: string;
  mealPlanId?: string;
  items: ShoppingListItem[];
  createdAt: string;
  completedAt?: string;
}

interface ShoppingListItem {
  id: string;
  ingredient: string;
  quantity: string;
  category: string;
  checked: boolean;
  fromRecipes: string[]; // recipe IDs
}

// NutritionalInfo
interface NutritionalInfo {
  recipeId: string;
  perServing: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
  source: "estimated" | "manual" | "database";
  allergens: string[];
  lastUpdated: string;
}

// CookingLog
interface CookingLog {
  id: string;
  recipeId: string;
  userId: string;
  cookedDate: string;
  photos: string[];
  notes?: string;
  rating?: number;
  adjustments?: string;
  wouldCookAgain?: boolean;
}

// Comment
interface Comment {
  id: string;
  recipeId: string;
  userId: string;
  text: string;
  mentions: string[];
  createdAt: string;
  replyTo?: string;
  reactions: { emoji: string; userIds: string[] }[];
}

// RecipeVariant
interface RecipeVariant {
  id: string;
  parentRecipeId: string;
  ownerId: string;
  variantName: string;
  differences: Partial<Recipe>;
  createdAt: string;
}

// InventoryItem
interface InventoryItem {
  id: string;
  userId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expirationDate?: string;
  location: string;
  lowStockThreshold?: number;
  lastUpdated: string;
}
```

---

## 8. API-Erweiterungen

### Neue Backend-Endpoints

```typescript
// server.ts additions

// Nutrition API
app.post("/api/nutrition/estimate", async (req, res) => {
  const { ingredients } = req.body;
  // Call OpenFoodFacts API or USDA database
  // Use Gemini AI for estimation
});

// Recipe Similarity
app.post("/api/recipes/find-duplicates", async (req, res) => {
  const { recipe } = req.body;
  // Fuzzy matching + ingredient comparison
  // Return similarity scores
});

// Smart Search
app.post("/api/recipes/smart-search", async (req, res) => {
  const { query } = req.body;
  // Natural language to structured query
  // Use Gemini for intent understanding
});

// Shopping List Generation
app.post("/api/shopping-list/generate", async (req, res) => {
  const { recipeIds, servings } = req.body;
  // Combine ingredients, group by category
  // Intelligent quantity merging
});

// Inventory Recipes
app.post("/api/recipes/from-inventory", async (req, res) => {
  const { inventoryItemIds } = req.body;
  // Find recipes matching available ingredients
  // Return sorted by completeness
});
```

---

## 9. Technologie-Entscheidungen

### Empfohlene Additions

#### Testing:
- **Vitest** (Unit Tests)
- **React Testing Library** (Component Tests)
- **Playwright** (E2E Tests)
- **MSW** (API Mocking)

#### State Management:
- **Zustand** (leichtgewichtig, TypeScript-first)
  - Besser als Redux für kleine/mittelgroße Apps
  - Einfacher als Context API bei wachsender Komplexität

#### Router:
- **React Router v6**
  - Standard für React-Apps
  - Code-Splitting-Support

#### Database Optimizations:
- **Firestore Composite Indexes** für komplexe Queries
- **Firestore Bundles** für schnellere Initial Loads
- **Cloud Functions** für Server-Side-Logik:
  - Automatische Nährwert-Berechnung
  - Scheduled Tasks (z.B. Menüplan-Erinnerungen)
  - Image-Processing (serverseitig)

#### Mobile:
- **React Native** (reuse existing skills)
  - Expo für schnellere Entwicklung
  - React Native Firebase
  - AsyncStorage für Offline-Daten

#### Analytics:
- **Mixpanel** oder **Amplitude** für User-Behavior
- **Sentry** für Error-Tracking
- **Lighthouse CI** für Performance-Monitoring

---

## 10. Deployment & Infrastructure

### Aktuelle Setup:
- ✅ Firebase Hosting (vermutlich)
- ✅ Firebase Firestore
- ✅ Firebase Auth

### Empfohlene Erweiterungen:

#### CI/CD:
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
```

#### Environment Management:
- Dev, Staging, Production
- Separate Firebase-Projekte
- Feature-Flags für graduelle Rollouts

#### Monitoring:
- Firebase Performance Monitoring
- Real User Monitoring (RUM)
- Uptime Monitoring (UptimeRobot)

#### Backups:
- Automated Firestore Backups (täglich)
- Backup-Bucket in Google Cloud Storage
- Disaster Recovery Plan

---

## 11. Business Considerations (Optional)

### Monetarisierung-Optionen:

#### Freemium-Modell:
**Free Tier:**
- 100 Rezepte
- 3 Collections
- Basis-Features
- 2 Familienmitglieder

**Pro Tier ($4.99/Monat oder $49/Jahr):**
- Unbegrenzte Rezepte
- Unbegrenzte Collections
- Menüplanung
- Nährwertinformationen
- Print-on-Demand (1 Kochbuch/Jahr inkludiert)
- 10 Familienmitglieder
- Priority Support

**Family Tier ($9.99/Monat oder $99/Jahr):**
- Alle Pro-Features
- Unbegrenzte Familienmitglieder
- Shared Meal Plans
- Advanced Analytics
- 3 Print-on-Demand Kochbücher/Jahr

#### Einmalzahlungs-Features:
- Print-on-Demand einzelne Kochbücher ($29.99)
- Professional Recipe Import Service ($19.99 für 100 Rezepte)

### Alternative: Community/Open-Source:
- Komplett kostenlos
- Donation-basiert (Patreon, Ko-fi)
- Oder: Nur für eigene Familie (kein öffentlicher Launch)

---

## 12. Success Metrics

### KPIs für Phase 1-3:

**User-Engagement:**
- Daily Active Users (DAU)
- Rezepte pro User
- Kochansicht-Nutzung
- Einkaufslisten-Downloads
- Menüplan-Erstellung

**Data Quality:**
- Duplikat-Rate (soll: <5%)
- Fehlende Nährwert-Info (soll: <20%)
- Vollständige Rezepte (soll: >95%)

**Performance:**
- Import-Zeit pro Rezept (soll: <10 Sek)
- App Load Time (soll: <2 Sek)
- Search Response Time (soll: <500ms)

**Satisfaction:**
- Net Promoter Score (NPS): >50
- User-Retention (30 Tage): >70%
- Feature-Adoption-Rate: >60%

---

## 13. Risiken & Mitigation

### Technische Risiken:

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Gemini API Limits | Mittel | Hoch | Caching, Rate-Limiting, Fallback auf andere KI |
| Firestore Kosten-Explosion | Niedrig | Hoch | Query-Optimierung, Indexes, Monitoring |
| Mobile-App Performance | Mittel | Mittel | Profiling, Lazy Loading, Optimized Images |
| Daten-Migration | Hoch | Mittel | Versionierung, Backward-Compatibility |

### User-Risiken:

| Risiko | Wahrscheinlichkeit | Impact | Mitigation |
|--------|-------------------|--------|------------|
| Feature-Überladung | Mittel | Hoch | Progressive Disclosure, Onboarding |
| Komplexe UI | Mittel | Mittel | User-Testing, Iteratives Design |
| Langsame Adoption | Niedrig | Mittel | Change Management, Training |

---

## 14. Next Steps (Immediate Actions)

### Woche 1-2: Planning & Setup
1. ✅ Roadmap finalisieren
2. ✅ Architektur-Design dokumentieren
3. ✅ Git-Branch-Strategie definieren
4. ✅ Development Environment Setup
5. ✅ Figma-Designs für neue Features (optional)

### Woche 3-4: Refactoring
1. 🔄 Component-Splitting (höchste Priorität)
2. 🔄 Router einführen
3. 🔄 Testing-Setup
4. 🔄 State Management (Zustand)

### Woche 5-6: Feature Development
1. 🚀 Kochansicht implementieren
2. 🚀 Erste Tests schreiben
3. 🚀 User-Feedback einholen

### Monatliches Review:
- Sprint-Planning
- Feature-Priorisierung
- Metrics Review
- User-Feedback-Session

---

## 15. Conclusion

The Heirloom Editorial hat das Potenzial, von einem technisch beeindruckenden Projekt zu einer unverzichtbaren Familien-Plattform zu werden. Die größten Hebel:

1. **Cooking Mode** → sofortiger Nutzen
2. **Menüplanung** → strategischer Wert
3. **Mobile App** → Alltagsintegration
4. **Social Features** → Familienbindung

Die technische Basis ist solide. Der Fokus sollte jetzt auf:
- **Architektur-Cleanup** (wartbarer Code)
- **User Experience** (intuitives Interface)
- **Feature-Parität** (mit physischen Kochbüchern)
- **Unique Value** (was nur digital möglich ist)

**Die Vision:** Das digitale Familienkochbuch, das Generationen verbindet und Rezepte für die Ewigkeit bewahrt.

---

## Anhang

### A. Useful Libraries & Tools

**UI Components:**
- **Radix UI** (headless components)
- **shadcn/ui** (pre-built Tailwind components)
- **React DnD** (Drag & Drop)
- **React Big Calendar** (Menüplanung)

**Utilities:**
- **date-fns** (bereits vorhanden) ✅
- **Zod** (Runtime-Validierung)
- **React Hook Form** (Formulare)
- **usehooks-ts** (Custom Hooks)

**Data Viz:**
- **Recharts** (Charts)
- **D3.js** (Custom Visualizations)

**Performance:**
- **React Virtualized** (Large Lists)
- **Lazy Loading Images** (React Lazy Load Image Component)

### B. Inspiration & Competitors

**Apps zum Studieren:**
- **Paprika Recipe Manager** (iOS/Android) - Beste Import-Funktion
- **Cookpad** - Community-Features
- **Mealime** - Menüplanung
- **Yummly** - Smart Search
- **AnyList** - Einkaufslisten

**Design-Inspiration:**
- **Notion** (flexible UI)
- **Linear** (Animations)
- **Things 3** (Eleganz)
- **Airbnb** (Image-Grid)

### C. Learning Resources

**Performance:**
- web.dev/vitals
- React Performance Profiling

**Accessibility:**
- A11y Project
- WCAG 2.1 Guidelines

**Firebase:**
- Firebase Security Rules Guides
- Firestore Best Practices

---

**Erstellt:** Mai 2026  
**Letzte Aktualisierung:** Mai 2026  
**Version:** 1.0  
**Autor:** Claude (Anthropic)  
**Projekt:** The Heirloom Editorial  
