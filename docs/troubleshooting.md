# Rozwiązywanie Problemów i Diagnostyka

Częste problemy techniczne na platformie Android oraz sposoby ich rozwiązania.

## 1. Kamera i przetwarzanie obrazu

### Błąd braku pamięci (Out of Memory - OOM) przy zdjęciach wysokiej rozdzielczości
* Przyczyna: Próba dekodowania do pamięci RAM nieskompresowanej bitmapy z aparatu o rozdzielczości 48 MP lub 108 MP.
* Rozwiązanie:
  * Ograniczenie docelowej rozdzielczości przechwytywania klatki do Full HD (1920x1080).
  * Zapis zdjęcia bezpośrednio do pliku tymczasowego na dysku bez trzymania pełnej bitmapy w pamięci.
  * Przekazanie ścieżki pliku bezpośrednio do silnika Google ML Kit.

### Podgląd aparatu zniekształcony lub czarny ekran na wybranych modelach
* Przyczyna: Niezgodność wybranego trybu renderowania z przetwornikiem obrazu w nakładkach systemowych (np. MIUI, ColorOS).
* Rozwiązanie: Wymuszenie trybu `SurfaceView` z obsługą proporcji 4:3 lub 16:9 w konfiguracji aparatu.

## 2. Rozpoznawanie tekstu (Google ML Kit OCR)

### Niski wskaźnik wykrywania na wyblakłym druku termicznym
* Przyczyna: Słaby kontrast pomiędzy tłem papieru a wyblakłym nadrukiem.
* Rozwiązanie:
  * Zastosowanie filtru progowania kontrastu (contrast thresholding) w module przygotowania obrazu.
  * W przypadku braku pewności co do kwoty, formularz weryfikacji oznacza pole do ręcznego sprawdzenia przez użytkownika.

### Rozbieżności w separatorach dziesiętnych (kropka vs przecinek)
* Przyczyna: Na polskich paragonach kwoty zapisywane są z przecinkiem (`49,99`), a w systemach międzynarodowych z kropką (`49.99`).
* Rozwiązanie: Parser `receiptParser.ts` zamienia przecinki na kropki przed konwersją do typu zmiennoprzecinkowego (`parseFloat`).

## 3. Baza danych SQLite

### Błąd blokady bazy: `database is locked` (kod błędu 5)
* Przyczyna: Równoległa próba zapisu i odczytu bazy w domyślnym trybie journal.
* Rozwiązanie:
  * Włączenie trybu WAL (`PRAGMA journal_mode = WAL;`).
  * Ustawienie limitu oczekiwania na zwolnienie blokady (`PRAGMA busy_timeout = 5000;`).

### Wyszukiwanie polskich znaków w FTS5
* Przyczyna: Domyślny tokenizator FTS5 nie łączy liter z ogonkami z ich podstawowymi odpowiednikami (np. "ą" i "a").
* Rozwiązanie: Użycie tokenizatora `unicode61 remove_diacritics 2` przy tworzeniu tabeli wirtualnej `documents_fts`.

## 4. Powiadomienia w systemie Android

### Powiadomienie nie pojawia się w wyznaczonym dniu
* Przyczyna: Agresywna optymalizacja zużycia baterii przez system (Doze Mode).
* Rozwiązanie:
  * Rejestracja powiadomień przez API dokładnych alarmów (`SCHEDULE_EXACT_ALARM`).
  * Wdrożenie mechanizmu sprawdzającego: podczas każdego uruchomienia aplikacji weryfikowana jest lista gwarancji i wyświetlane są ewentualne zaległe przypomnienia.
