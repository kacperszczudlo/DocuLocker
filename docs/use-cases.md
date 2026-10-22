# Przypadki Użycia

Wymagania funkcjonalne aplikacji DocuLocker.

## Zestawienie przypadków użycia

| Identyfikator | Nazwa | Aktor | Priorytet |
| :--- | :--- | :--- | :--- |
| UC-01 | Skanowanie paragonu i automatyczne odczytanie danych (OCR) | Użytkownik | MVP |
| UC-02 | Ręczne dodanie dokumentu zakupu | Użytkownik | MVP |
| UC-03 | Przegląd listy gwarancji i terminów ważności | Użytkownik | MVP |
| UC-04 | Wyszukiwanie pełnotekstowe w treści paragonów | Użytkownik | Wysoki |
| UC-05 | Generowanie karty gwarancyjnej do formatu PDF | Użytkownik | Wysoki |
| UC-06 | Konfiguracja terminów przypomnień o gwarancji | Użytkownik | Średni |
| UC-07 | Oznaczenie zgłoszenia reklamacyjnego | Użytkownik | Średni |
| UC-08 | Eksport bazy danych i załączników do pliku kopii | Użytkownik | Średni |

---

### UC-01: Skanowanie paragonu i automatyczne odczytanie danych (OCR)

* Aktor: Użytkownik
* Warunek wstępny: Aplikacja posiada uprawnienie do aparatu (`CAMERA`).
* Główny scenariusz:
  1. Użytkownik wybiera przycisk aparatu na ekranie głównym.
  2. Aplikacja otwiera widok aparatu z wyznaczoną ramką kadrowania.
  3. Użytkownik wykonuje zdjęcie.
  4. Obraz jest kompresowany i przekazywany do silnika Google ML Kit.
  5. Parser analizuje tekst i wstępnie uzupełnia pola: kwotę łączną, walutę, datę zakupu oraz nazwę sklepu.
  6. Wyświetlany jest formularz weryfikacji ze zdjęciem i rozpoznanymi wartościami.
  7. Użytkownik sprawdza dane, ewentualnie poprawia błędy i klika przycisk zapisu.
  8. Aplikacja zapisuje rekord w bazie SQLite, przenosi plik do katalogu trwałego i rejestruje lokalne alerty przypomnień.
* Scenariusze alternatywne:
  * 4a. Zdjęcie nieostre lub nieczytelne: silnik OCR nie odnajduje kwoty ani daty. Formularz otwiera się z pustymi polami do ręcznego uzupełnienia.
  * 7a. Użytkownik rezygnuje: tymczasowe zdjęcie jest usuwane z pamięci podręcznej.

---

### UC-02: Ręczne dodanie dokumentu zakupu

* Aktor: Użytkownik
* Warunek wstępny: Brak.
* Główny scenariusz:
  1. Użytkownik wybiera opcję dodania dokumentu bez użycia aparatu.
  2. Wypełnia formularz: tytuł, kwotę, datę zakupu, wybiera kategorię i czas trwania gwarancji (domyślnie 24 miesiące).
  3. Opcjonalnie dołącza plik PDF lub zdjęcie z galerii urządzenia.
  4. Zapisuje dokument w bazie.

---

### UC-03: Przegląd listy gwarancji i terminów ważności

* Aktor: Użytkownik
* Główny scenariusz:
  1. Użytkownik przechodzi do zakładki gwarancji.
  2. System wyświetla listę pozycji posortowaną według daty upływu ochrony:
     * aktywne (więcej niż 30 dni do końca),
     * wygasające wkrótce (30 dni lub mniej),
     * wygasłe.
  3. Użytkownik może przefiltrować listę według statusu lub kategorii sprzętu.

---

### UC-04: Wyszukiwanie pełnotekstowe w treści paragonów

* Aktor: Użytkownik
* Główny scenariusz:
  1. Użytkownik wpisuje frazę w polu wyszukiwania (np. nazwę towaru, numer seryjny lub model).
  2. System wykonuje zapytanie FTS5 na tabeli `documents_fts`.
  3. Wyniki prezentowane są w postaci listy odpowiadających paragonów wraz z podświetleniem trafień.
  4. Wybór pozycji otwiera ekran szczegółów dokumentu.

---

### UC-05: Generowanie karty gwarancyjnej do formatu PDF

* Aktor: Użytkownik
* Warunek wstępny: Dokument posiada przypisane zdjęcie paragonu i datę zakupu.
* Główny scenariusz:
  1. Użytkownik otwiera szczegóły dokumentu i wybiera opcję eksportu do PDF.
  2. System generuje jednostronicowy dokument zawierający dane transakcji, termin rękojmi oraz czytelną miniaturę paragonu.
  3. Otwiera się systemowe okno Androida z opcją udostępnienia pliku lub zapisu w pamięci urządzenia.
