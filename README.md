# DocuLocker — Bezpieczny Sejf Paragonów i Strażnik Gwarancji (Offline-First Edge AI)

[![Platform](https://img.shields.io/badge/Platform-Android-3DDC84.svg?style=flat&logo=android&logoColor=white)](https://android.com)
[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://reactnative.dev)
[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-54.0-000020.svg?style=flat&logo=expo&logoColor=white)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/SQLite-FTS5-003B57.svg?style=flat&logo=sqlite&logoColor=white)](https://sqlite.org)
[![Edge AI](https://img.shields.io/badge/Google%20ML%20Kit-Text%20Recognition%20v2-4285F4.svg?style=flat&logo=google&logoColor=white)](https://developers.google.com/ml-kit)
[![Tests](https://img.shields.io/badge/Tests-57%20passed%20(100%25)-10B981.svg?style=flat)](https://vitest.dev)
[![Zero-Data Privacy](https://img.shields.io/badge/Privacy-100%25%20Zero--Data-10B981.svg?style=flat)](#manifest-zero-data)

**DocuLocker** to bezkompromisowa, prywatna aplikacja mobilna na system Android do trwałego przechowywania paragonów, faktur oraz automatycznego monitorowania terminów rękojmi i zwrotów. Aplikacja działa w modelu **100% Offline-First**: całe przetwarzanie obrazu, optyczne rozpoznawanie tekstu (Edge OCR) oraz indeksowanie danych odbywa się na procesorze urządzenia użytkownika, bez wysyłania jakichkolwiek informacji do chmury i bez wymogu rejestracji konta.

---

## 🌟 Kluczowe Funkcjonalności

- 📷 **Edge AI OCR (Google ML Kit Vision v2)**: Skanowanie aparatem lub wybór zdjęcia z galerii; heurystyczne wyciąganie kwoty łącznej, daty zakupu (formaty 2- i 4-cyfrowe), nazwy sklepu (Action, Biedronka, Lidl, MediaMarkt, Dealz, Hebe, Netto, itp.) oraz numeru NIP bezpośrednio na telefonie w czasie <500 ms.
- 🛡️ **Strażnik Gwarancji & Oś Czasu (UC-03 & UC-04)**: Automatyczne kalkulowanie daty końca ochrony konsumenckiej (domyślnie 24 miesiące) oraz okna zwrotu (14 dni). Wizualne paski postępu, statusy (*Aktywna*, *Wygasająca wkrótce*, *Wygasła*, *Reklamowana*) i zarządzanie notatkami serwisowymi.
- 🔔 **Lokalny System Powiadomień (`expo-notifications`)**: Automatyczne planowanie przypomnień na urządzeniu o godz. 10:00 (na 30 i 7 dni przed upływem gwarancji oraz na 2 dni przed końcem prawa do zwrotu) z obsługą trybu uśpienia baterii (Doze Mode).
- 🔍 **Wyszukiwarka Pełnotekstowa SQLite FTS5 (UC-04)**: Błyskawiczne przeszukiwanie bazy po słowach kluczowych z paragonu, sklepach, NIP-ie czy notatkach z podświetlaniem kontekstu trafienia OCR (`"...KABEL USB-C 2M..."`).
- 📄 **Generator Pism Reklamacyjnych PDF (`expo-print` & `expo-sharing`) (UC-05 & UC-06)**: Generowanie gotowego, zgodnego z prawem konsumenckim wniosku reklamacyjnego (rękojmia) z osadzonym zdjęciem paragonu oraz natywnym udostępnianiem przez Gmail, Dysk, WhatsApp itp.
- 📐 **Spójny Design System**: Oparty na architekturze siatki 8pt, minimalnym polu dotyku 48×48 dp (eliminacja *rage taps* na fizycznym ekranie) oraz wytycznych WCAG 2.2 AA.

---

## 🛡️ Manifest Zero-Data & Anti-Subscription

Większość aplikacji do skanowania paragonów wymaga rejestracji, wysyła prywatne dane finansowe na serwery analityczne i monetyzuje historię zakupów użytkowników. **DocuLocker odrzuca ten model:**

| Cecha | DocuLocker | Typowa aplikacja komercyjna |
|---|---|---|
| **Wymóg konta / logowania** | ❌ **Brak** (otwierasz i używasz) | Wymagane (e-mail, Google, Apple ID) |
| **Przesyłanie zdjęć do chmury** | ❌ **Nigdy** (pełna izolacja sandboxa) | Tak (zewnętrzne API chmurowe) |
| **Inferencja OCR** | 📱 **Lokalna (NPU telefonu)** | Serwery AWS / Google Cloud |
| **Model płatności** | 🆓 **Darmowy, bez subskrypcji** | Subskrypcja miesięczna / roczna |
| **Telemetria i reklamy** | ❌ **Zero trackerów** | Facebook Pixel, Firebase Analytics, AdMob |

---

## 🏛️ Architektura Systemu (Clean Architecture Offline-First)

```
app/                        # Warstwa Prezentacji (Expo Router)
├── (tabs)/                 # Główne zakładki aplikacji
│   ├── index.tsx           # Pulpit sejfu, statystyki i ostatnie dokumenty
│   ├── warranties.tsx      # Oś czasu gwarancji, filtry i statusy reklamacji
│   ├── search.tsx          # Wyszukiwarka FTS5, podgląd i generator PDF
│   └── settings.tsx        # Ustawienia sejfu i manifest bezpieczeństwa
└── scan.tsx                # Modal aparatu, podglądu OCR i formularza weryfikacji

src/
├── core/                   # Warstwa Domenowa
│   ├── parsers/            # Heurystyczny parser paragonów i kwot (TDD)
│   ├── warranties/         # Kalkulator terminów i statusów gwarancji
│   └── useCases/           # Przypadki użycia: SaveDocumentUseCase, ScanReceiptUseCase
├── database/               # Warstwa Danych SQLite
│   ├── connection.ts       # Zarządzanie połączeniem i transakcjami
│   ├── schema.ts           # DDL, indeksy wydajnościowe, FTS5 i migracje
│   └── repositories/       # DocumentRepository, StoreRepository, WarrantyRepository
├── services/               # Adaptery Narzędzi Zewnętrznych
│   ├── ocr/                # Adapter Google ML Kit Text Recognition
│   ├── notifications/      # Lokalne powiadomienia expo-notifications
│   ├── storage/            # Izolowany magazyn zdjęć expo-file-system/legacy
│   └── pdf/                # Generator dokumentacji reklamacyjnej expo-print
└── theme/                  # Design System Tokens
    └── tokens.ts           # Siatka 8pt, paleta barw, touch targets 48dp
```

---

## 🧪 Testy i Jakość Kodu

Projekt rozwija się w rygorystycznym reżimie **TDD (Test-Driven Development)**:
- **57 testów automatycznych** w 12 plikach testowych (`vitest run` $\to$ 100% green).
- **0 błędów typowania** (`npx tsc --noEmit`).

```bash
# Uruchomienie pełnego zestawu testów:
npm test

# Kontrola statyczna TypeScript:
npm run lint
```

---

## 🚀 Uruchomienie na Urządzeniu Fizycznym Android

Aplikacja wykorzystuje natywne moduły Androida (Google ML Kit, CameraX, SQLite FTS5), dlatego uruchamiana jest przez **Expo Development Client**:

```bash
# 1. Klonowanie repozytorium
git clone https://github.com/kacperszczudlo/DocuLocker.git
cd DocuLocker

# 2. Instalacja zależności
npm install

# 3. Podłączenie telefonu przez USB (z włączonym debugowaniem ADB)
# i uruchomienie aplikacji:
npx expo run:android
```

---

## 📜 Licencja

Projekt udostępniany na licencji **MIT**. Szczegóły w pliku [LICENSE](LICENSE).
