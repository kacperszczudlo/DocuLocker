# DocuLocker: Sejf Paragonow i Rejestr Gwarancji (Offline-First Edge AI)

[![Platform](https://img.shields.io/badge/Platform-Android-3DDC84.svg?style=flat&logo=android&logoColor=white)](https://android.com)
[![React Native](https://img.shields.io/badge/React%20Native-0.81.5-61DAFB.svg?style=flat&logo=react&logoColor=black)](https://reactnative.dev)
[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-54.0-000020.svg?style=flat&logo=expo&logoColor=white)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/SQLite-FTS5-003B57.svg?style=flat&logo=sqlite&logoColor=white)](https://sqlite.org)
[![Edge AI](https://img.shields.io/badge/Google%20ML%20Kit-Text%20Recognition%20v2-4285F4.svg?style=flat&logo=google&logoColor=white)](https://developers.google.com/ml-kit)
[![Zero-Data Privacy](https://img.shields.io/badge/Privacy-100%25%20Zero--Data-10B981.svg?style=flat)](#manifest-zero-data)

DocuLocker to aplikacja mobilna na system Android przeznaczona do trwalego przechowywania paragonow, faktur oraz monitorowania terminow rekojmi i zwrotow. Aplikacja dziala w pelnym modelu Offline-First: caly potok przetwarzania obrazu, rozpoznawanie tekstu (Edge OCR) oraz indeksowanie relacyjne odbywa sie wylacznie na procesorze urzadzenia, bez komunikacji z zewnetrznymi serwerami i bez wymogu zakladania konta.

## Funkcjonalnosci

- Edge AI OCR (Google ML Kit Text Recognition v2): Skanowanie aparatem lub wybor zdjecia z galerii. Heurystyczna ekstrakcja kwoty lacznej, daty zakupu (formaty dwu- i czterocyfrowe), nazwy sklepu (Action, Biedronka, Lidl, MediaMarkt, Dealz, Hebe, Netto i inne) oraz numeru NIP w czasie ponizej 500 ms.
- Rejestr gwarancji i os czasu (UC-03, UC-04): Automatyczne wyliczanie daty konca ochrony konsumenckiej (standardowo 24 miesiace) oraz okna zwrotu towaru (14 dni). Wizualne paski postepu, statusy (Aktywna, Wygasajaca, Wygasla, Reklamowana) oraz obsluga notatek serwisowych.
- Lokalne powiadomienia (expo-notifications): Harmonogram przypomnien na urzadzeniu o godz. 10:00 (na 30 i 7 dni przed uplywem rekojmi oraz 2 dni przed koncem prawa do zwrotu) z pelna obsluga trybu uspienia baterii (Doze Mode).
- Wyszukiwanie pelnotekstowe SQLite FTS5 (UC-04): Przeszukiwanie bazy po slowach kluczowych z paragonu, nazwach sklepow, NIP oraz notatkach z podswietlaniem kontekstu trafienia.
- Generator pism reklamacyjnych PDF (expo-print, expo-sharing) (UC-05, UC-06): Generowanie gotowego do wydruku wniosku reklamacyjnego z tytulu rekojmi konsumenckiej z osadzonym zdjeciem paragonu oraz natywnym udostepnianiem w systemie Android.
- Architektura skali UI: Interfejs oparty o siatke 8pt, minimalny obszar dotykowy 48x48 dp oraz wytyczne WCAG 2.2 AA.

## Manifest Zero-Data

DocuLocker nie gromadzi danych telemetrycznych ani finansowych uzytkownikow.

| Parametr | DocuLocker | Standardowa aplikacja chmurowa |
|---|---|---|
| Wymog rejestracji konta | Brak | Wymagany (email, SSO) |
| Przesylanie zdjec do chmury | Brak (lokalny sandbox) | Wymagane |
| Inferencja OCR | Lokalna (NPU urzadzenia) | Zewnetrzne serwery chmurowe |
| Model subskrypcyjny | Brak (darmowy) | Oplata miesieczna lub roczna |
| Analityka i reklamy | Brak | Sledzenie zdarzen i profilowanie |

## Architektura Systemu

```text
app/                        # Warstwa Prezentacji (Expo Router)
├── (tabs)/                 # Glowne zakladki aplikacji
│   ├── index.tsx           # Pulpit sejfu, statystyki i lista dokumentow
│   ├── warranties.tsx      # Os czasu gwarancji, filtry i obsluga reklamacji
│   ├── search.tsx          # Wyszukiwarka FTS5, podglad i generator PDF
│   └── settings.tsx        # Ustawienia sejfu i parametry techniczne
└── scan.tsx                # Modal aparatu, podgladu OCR i formularza weryfikacji

src/
├── core/                   # Warstwa Domenowa
│   ├── parsers/            # Heurystyczny parser paragonow i kwot
│   ├── warranties/         # Kalkulator terminow i statusow gwarancji
│   └── useCases/           # Przypadki uzycia: SaveDocumentUseCase, ScanReceiptUseCase
├── database/               # Warstwa Danych SQLite
│   ├── connection.ts       # Zarzadzanie polaczeniem i transakcjami
│   ├── schema.ts           # DDL, indeksy wydajnosciowe, FTS5 i migracje
│   └── repositories/       # DocumentRepository, StoreRepository, WarrantyRepository
├── services/               # Adaptery Narzedzi Zewnetrznych
│   ├── ocr/                # Adapter Google ML Kit Text Recognition
│   ├── notifications/      # Lokalne powiadomienia expo-notifications
│   ├── storage/            # Izolowany magazyn zdjec expo-file-system/legacy
│   └── pdf/                # Generator dokumentacji reklamacyjnej expo-print
└── theme/                  # Tokeny Systemu UI
    └── tokens.ts           # Siatka 8pt, paleta barw, touch targets 48dp
```

## Uruchomienie deweloperskie

Wymagania: Node.js 20+, menedzer pakietow npm, fizyczne urzadzenie z systemem Android lub emulator z obsluga Google Play Services.

```bash
# 1. Klonowanie repozytorium
git clone https://github.com/kacperszczudlo/DocuLocker.git
cd DocuLocker

# 2. Instalacja zaleznosci
npm install

# 3. Uruchomienie testow jednostkowych i integracyjnych
npm test

# 4. Uruchomienie aplikacji na telefonie przez USB (wymagane wlaczone debugowanie ADB)
npx expo run:android
```

## Licencja

Projekt udostepniany na licencji MIT. Szczegoly w pliku [LICENSE](LICENSE).
