# Scenariusze Testowe

Zestawienie testów automatycznych i manualnych dla aplikacji DocuLocker.

## 1. Testy jednostkowe (Vitest)

### TC-UNIT-01: Ekstrakcja łącznej kwoty paragonu

* Moduł testowany: `src/core/parsers/receiptParser.ts`
* Cel: Poprawne rozpoznanie kwoty i waluty z linii paragonu.

| ID | Tekst wejściowy | Oczekiwana kwota | Oczekiwana waluta |
| :--- | :--- | :--- | :--- |
| 01.1 | `SUMA PLN 49,99` | `49.99` | `PLN` |
| 01.2 | `RAZEM: 125.00 PLN` | `125.00` | `PLN` |
| 01.3 | `SUMA DO ZAPŁATY 1 299,00 zł` | `1299.00` | `PLN` |
| 01.4 | `TOTAL: € 14.50` | `14.50` | `EUR` |
| 01.5 | `PŁATNOŚĆ KARTĄ 35,20` | `35.20` | `PLN` |
| 01.6 | Tekst bez kwoty lub nieczytelny | `null` | `null` |

### TC-UNIT-02: Wykrywanie daty transakcji

* Moduł testowany: `src/core/parsers/receiptParser.ts`
* Cel: Normalizacja daty do formatu ISO (YYYY-MM-DD).

| ID | Tekst wejściowy | Oczekiwana data (ISO) |
| :--- | :--- | :--- |
| 02.1 | `Data: 2026-10-22 14:32` | `2026-10-22` |
| 02.2 | `22.10.2026 r.` | `2026-10-22` |
| 02.3 | `SPRZEDAŻ: 15-05-2025` | `2025-05-15` |
| 02.4 | `2026/01/05` | `2026-01-05` |
| 02.5 | Niepoprawny ciąg `99-99-9999` | `null` |

### TC-UNIT-03: Wyliczanie daty końca gwarancji i statusu

* Moduł testowany: `src/core/useCases/calculateWarranty.ts`
* Przypadki:
  * 03.1: Zakup 2026-01-15, okres 24 miesiące -> koniec gwarancji 2028-01-15.
  * 03.2: Rok przestępny: zakup 2024-02-29, okres 12 miesięcy -> koniec gwarancji 2025-02-28.
  * 03.3: Okno zwrotu: zakup 2026-10-01, 14 dni -> ostateczny termin zwrotu 2026-10-15.
  * 03.4: Weryfikacja statusu w zależności od bieżącej daty (ACTIVE, EXPIRING_SOON, EXPIRED).

## 2. Testy integracyjne bazy danych (SQLite)

### TC-INT-01: Integralność relacyjna i kaskadowe usuwanie

1. Utworzenie dokumentu z powiązaną gwarancją i wpisem w tabeli załączników.
2. Usunięcie dokumentu z tabeli `documents`.
3. Weryfikacja, czy wpisy w tabelach `warranties` i `document_attachments` zostały usunięte automatycznie przez regułę `ON DELETE CASCADE`.

### TC-INT-02: Wyszukiwanie pełnotekstowe w tabeli FTS5

1. Zapisanie dokumentu z unikalną nazwą towaru w polu `raw_ocr_text` (np. "ekspres ciśnieniowy").
2. Wykonanie zapytania wyszukiwania FTS5 ze słowem kluczowym.
3. Weryfikacja, czy rekord został zwrócony, w tym wariant bez znaków diakrytycznych ("cisnieniowy").

## 3. Testy manualne na platformie Android

### TC-MAN-01: Brak uprawnienia do aparatu

* Krok: Odrzucenie uprawnienia `CAMERA` podczas próby wykonania zdjęcia.
* Oczekiwane zachowanie: Aplikacja wyświetla komunikat informujący o braku dostępu i przycisk przejścia do ustawień systemowych. Brak awarii procesu.

### TC-MAN-02: Działanie w trybie samolotowym

* Krok: Włączenie trybu samolotowego na telefonie i wykonanie pełnego cyklu skanowania oraz zapisu.
* Oczekiwane zachowanie: Wszystkie funkcje działają bez zakłóceń i bez komunikatów o braku sieci.

### TC-MAN-03: Trwałość lokalnych powiadomień po restarcie urządzenia

* Krok: Zaplanowanie powiadomienia testowego i ponowne uruchomienie telefonu.
* Oczekiwane zachowanie: System Android dostarcza powiadomienie o ustalonej godzinie.
