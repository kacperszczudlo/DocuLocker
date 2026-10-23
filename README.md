# DocuLocker

Aplikacja mobilna na system Android do przechowywania paragonów, faktur oraz śledzenia terminów gwarancji. Działa w trybie offline, przechowując dane i wykonując rozpoznawanie tekstu (OCR) bezpośrednio na urządzeniu, bez konieczności rejestracji konta i bez wysyłania plików do chmury.

## Funkcje

* Rozpoznawanie tekstu ze zdjęć (Google ML Kit): wyciąganie kwoty, daty i nazwy sprzedawcy z paragonu bez połączenia z siecią.
* Rejestr gwarancji i zwrotów: automatyczne wyliczanie końca rękojmi (domyślnie 24 miesiące) oraz okna na zwrot towaru (14 dni).
* Lokalne powiadomienia: przypomnienia w systemie Android przed upływem terminu gwarancji lub zwrotu.
* Wyszukiwanie pełnotekstowe: przeszukiwanie bazy po nazwie sklepu, notatkach oraz pełnej treści odczytanej z paragonu (SQLite FTS5).
* Eksport do PDF: generowanie pojedynczego dokumentu z podglądem paragonu i danymi zakupu na potrzeby reklamacji.
* Prywatność: brak analityki śledzącej, brak reklam, pliki i baza danych zapisane w piaskownicy aplikacji.

## Stos technologiczny

* Platforma: Android
* Środowisko: React Native (Expo) z Expo Router
* Język: TypeScript
* Baza danych: SQLite (expo-sqlite) z włączonym modułem FTS5
* Rozpoznawanie tekstu: Google ML Kit Text Recognition v2
* Aparat i pliki: expo-camera, expo-file-system
* Powiadomienia: expo-notifications
* Generowanie dokumentów: expo-print, expo-sharing
* Stan aplikacji: Zustand

## Architektura projektu

Kod podzielono na warstwy:

1. Warstwa prezentacji: ekrany oparte na Expo Router (`app/`), komponenty interfejsu (`src/components/`).
2. Warstwa logiki biznesowej: modele danych (`src/core/models/`), parser tekstu OCR (`src/core/parsers/`) oraz przypadki użycia (`src/core/useCases/`).
3. Warstwa danych: konfiguracja bazy i repozytoria SQLite (`src/database/`).
4. Warstwa serwisów: adaptery modułów natywnych do OCR, powiadomień i generowania PDF (`src/services/`).

## Struktura katalogów

```text
DocuLocker/
├── app/                  # Ekrany i routing (Expo Router)
│   ├── (tabs)/           # Główne widoki: lista, gwarancje, szukaj, ustawienia
│   ├── scan/             # Ekran aparatu i formularz weryfikacji OCR
│   └── document/[id].tsx # Szczegóły dokumentu i eksport
├── src/
│   ├── core/             # Modele domenowe, parsery kwot i dat
│   ├── database/         # Repozytoria i migracje expo-sqlite
│   ├── services/         # Obsługa ML Kit, powiadomień, plików i PDF
│   └── components/       # Komponenty interfejsu użytkownika
├── database/
│   └── schema.sql        # Schemat bazy danych SQLite
├── docs/                 # Dokumentacja techniczna projektu
│   ├── architecture.md   # Szczegóły architektury i przepływ danych
│   ├── diagrams.md       # Diagramy sekwencji i ERD
│   ├── styleguide.md     # Standardy kodu i testowania
│   ├── configuration.md  # Konfiguracja środowiskowa
│   ├── use-cases.md      # Przypadki użycia
│   ├── test-cases.md     # Scenariusze testowe
│   ├── api.md            # Kontrakty wewnętrzne serwisów
│   ├── deployment.md     # Budowanie paczki AAB i publikacja
│   └── troubleshooting.md# Rozwiązywanie problemów
├── .env.example          # Wzorzec zmiennych środowiskowych
├── .gitignore
└── README.md
```

## Uruchomienie lokalne

Wymagania: Node.js 20+, menedżer pakietów npm, Android Studio lub fizyczne urządzenie z systemem Android.

```bash
# 1. Klonowanie i instalacja zależności
git clone https://github.com/kacpe/DocuLocker.git
cd DocuLocker
npm install

# 2. Konfiguracja zmiennych środowiskowych
cp .env.example .env

# 3. Uruchomienie aplikacji w środowisku deweloperskim
npx expo run:android
```

Uwaga: obsługa natywnego silnika Google ML Kit wymaga uruchomienia przez development build (`expo run:android`), standardowy klient Expo Go nie zawiera tego modułu natywnego.

## Licencja

Projekt udostępniany na licencji MIT. Szczegóły w pliku LICENSE.
