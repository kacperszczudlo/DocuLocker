# Architektura Systemu

## 1. Zarys systemu

DocuLocker to aplikacja mobilna na platformę Android realizująca model offline-first. Aplikacja nie korzysta z zewnętrznego serwera backendowego. Baza danych, indeksowanie pełnotekstowe oraz rozpoznawanie tekstu (OCR) działają lokalnie na telefonie.

Zasady techniczne:
* Brak opóźnień sieciowych: wszystkie operacje odczytu i zapisu trafiają bezpośrednio do bazy SQLite na urządzeniu.
* Przetwarzanie obrazu na urządzeniu: ekstrakcja tekstu odbywa się przez Google ML Kit Text Recognition v2, co eliminuje koszty chmury i transfer danych.
* Izolacja plików: zdjęcia skanów są kompresowane i zapisywane w prywatnym katalogu aplikacji (`Context.getFilesDir()`), niedostępnym dla innych programów.
* Separacja odpowiedzialności: rozdzielenie widoków, logiki biznesowej, repozytoriów danych i natywnych modułów sprzętowych.

## 2. Podział na warstwy

Aplikacja składa się z czterech warstw:

```text
+-------------------------------------------------------------------------+
| Warstwa Prezentacji (Expo Router)                                       |
| - Ekrany: Dashboard, Skaner, Formularz weryfikacji, Lista gwarancji     |
| - Komponenty interfejsu (Material Design)                               |
| - Zarządzanie stanem UI (Zustand)                                       |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------v------------------------------------+
| Warstwa Domenowa (Logika Biznesowa)                                     |
| - Modele: Receipt, Warranty, Store, Attachment                          |
| - Parsery heurystyczne: ekstrakcja kwot, dat, NIP ze zrzuconego tekstu  |
| - Logika wyliczania okresów rękojmi i okien zwrotu                     |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------v------------------------------------+
| Warstwa Danych (Repozytoria)                                            |
| - Sterownik: expo-sqlite (SQLite 3 z FTS5)                              |
| - Repozytoria: DocumentRepository, WarrantyRepository, StoreRepository  |
| - Migracje schematu bazy danych                                         |
+------------------------------------+------------------------------------+
                                     |
+------------------------------------v------------------------------------+
| Warstwa Adapterów i Sprzętu                                             |
| - Silnik OCR: Google ML Kit Text Recognition v2                         |
| - Kamera i system plików: expo-camera, expo-file-system                 |
| - Powiadomienia: expo-notifications (AlarmManager)                      |
| - Eksport dokumentów: expo-print, expo-sharing                          |
+-------------------------------------------------------------------------+
```

## 3. Przetwarzanie obrazu i odczyt danych (Pipeline OCR)

Kroki od zrobienia zdjęcia do zapisu rekordu:

1. Przechwycenie klatki: moduł aparatu wykonuje zdjęcie w rozdzielczości Full HD (1920x1080), co zapewnia ostrość druku bez przeciążania pamięci RAM.
2. Przygotowanie pliku: normalizacja orientacji EXIF i kompresja do JPEG (jakość 0.8) za pomocą expo-image-manipulator.
3. Inferencja OCR: biblioteka Google ML Kit przetwarza obraz lokalnie, zwracając strukturę bloków, linii i słów.
4. Parsowanie tekstu: moduł regułowy (regex) przeszukuje linie w celu identyfikacji:
   * kwoty łącznej (linie ze słowami "SUMA", "RAZEM", "PLN", formaty z przecinkiem i kropką),
   * daty zakupu (formaty DD-MM-YYYY, YYYY-MM-DD, DD.MM.RR),
   * nazwy sklepu (nagłówek paragonu).
5. Weryfikacja przez użytkownika: ekran podglądu wyświetla wykryte wartości. Użytkownik może je zatwierdzić lub poprawić ręcznie.
6. Zapis w bazie: zapisanie rekordu w tabeli `documents`, przeniesienie pliku do katalogu stałego oraz aktualizacja indeksu `documents_fts`.
7. Harmonogram alertów: rejestracja lokalnych powiadomień w systemie Android na 30 i 7 dni przed końcem ochrony gwarancyjnej.

## 4. Przechowywanie danych

### Baza danych (expo-sqlite)
* Baza działa w trybie Write-Ahead Logging (`PRAGMA journal_mode = WAL;`), co pozwala na równoległy odczyt podczas trwania zapisu.
* Włączone jest egzekwowanie kluczy obcych (`PRAGMA foreign_keys = ON;`).
* Moduł FTS5 indeksuje pola `title`, `notes` i `raw_ocr_text`, co umożliwia przeszukiwanie pełnej treści paragonów w czasie poniżej 20 milisekund.

### Magazyn plików
* Zdjęcia otrzymują identyfikatory UUID i trafiają do `FileSystem.documentDirectory + 'receipts/'`.
* Usunięcie dokumentu z bazy usuwa powiązany plik z dysku, zapobiegając pozostawaniu nieużywanych danych.

## 5. Powiadomienia w systemie Android

Aby powiadomienia o gwarancji dotarły do użytkownika po kilku miesiącach od zakupu:
* Używane jest API `expo-notifications` z flagą dokładnych alarmów (`SCHEDULE_EXACT_ALARM`).
* Identyfikatory zaplanowanych powiadomień są powiązane z kluczem głównym dokumentu, co pozwala na ich anulowanie przy usunięciu pozycji lub edycji daty.
* Podczas startu aplikacji uruchamiana jest procedura sprawdzająca statusy gwarancji i uzupełniająca brakujące alarmy.
