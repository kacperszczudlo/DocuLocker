# Konfiguracja Środowiskowa i Uprawnienia

Opis parametrów konfiguracyjnych i uprawnień systemowych w projekcie DocuLocker. W repozytorium nie przechowujemy kluczy prywatnych ani poufnych danych. Szablon znajduje się w pliku `.env.example`.

## 1. Zmienne konfiguracyjne aplikacji

Zmienne dostępne w kodzie klienta posiadają prefiks `EXPO_PUBLIC_`.

| Zmienna | Typ | Wartość domyślna | Opis |
| :--- | :--- | :--- | :--- |
| `EXPO_PUBLIC_APP_ENV` | `string` | `development` | Środowisko uruchomieniowe: `development`, `staging`, `production`. |
| `EXPO_PUBLIC_ENABLE_DEBUG_LOGS` | `boolean` | `true` | Logowanie zapytań SQL i czasu inferencji OCR w konsoli deweloperskiej. |
| `EXPO_PUBLIC_DEFAULT_OCR_LANGUAGE` | `string` | `pl` | Domyślny słownik i zasady parsowania tekstu. |
| `EXPO_PUBLIC_OCR_CONFIDENCE_THRESHOLD` | `number` | `0.65` | Próg pewności dopasowania (0.0 do 1.0). Poniżej tego progu pole wymaga weryfikacji użytkownika. |
| `EXPO_PUBLIC_DEFAULT_WARRANTY_MONTHS` | `number` | `24` | Domyślna liczba miesięcy ochrony rękojmi dla nowo dodanego zakupu. |
| `EXPO_PUBLIC_DEFAULT_RETURN_DAYS` | `number` | `14` | Domyślna liczba dni na odstąpienie od umowy zakupu na odległość. |
| `EXPO_PUBLIC_WARRANTY_ALERT_DAYS_BEFORE`| `number` | `30` | Wyprzedzenie (w dniach) dla pierwszego alertu o końcu ochrony. |
| `EXPO_PUBLIC_NOTIFICATION_HOUR` | `string` | `"10:00"` | Godzina doręczenia lokalnego powiadomienia (format 24h). |
| `EXPO_PUBLIC_DATABASE_NAME` | `string` | `doculocker_local.db` | Nazwa pliku lokalnej bazy danych SQLite na telefonie. |
| `EXPO_PUBLIC_SCHEMA_VERSION` | `number` | `1` | Numer wersji schematu bazy danych do obsługi migracji. |
| `EXPO_PUBLIC_MAX_IMAGE_DIMENSION` | `number` | `1920` | Maksymalny wymiar dłuższego boku zdjęcia po kompresji (w pikselach). |
| `EXPO_PUBLIC_IMAGE_COMPRESSION_QUALITY` | `number` | `0.80` | Współczynnik kompresji JPEG (od 0.0 do 1.0). |

## 2. Uprawnienia w systemie Android

Aplikacja deklaruje w pliku `app.json` wyłącznie uprawnienia niezbędne do jej działania:

* `android.permission.CAMERA`: wykonywanie zdjęć paragonów do lokalnego odczytu przez Google ML Kit.
* `android.permission.POST_NOTIFICATIONS`: wyświetlanie lokalnych powiadomień o zbliżającym się końcu gwarancji (wymagane w Android 13+ / API 33+).
* `android.permission.SCHEDULE_EXACT_ALARM`: programowanie dokładnych alarmów powiadomień niezależnie od trybu oszczędzania energii.
* `android.permission.RECEIVE_BOOT_COMPLETED`: ponowne zaplanowanie powiadomień w systemie po ponownym uruchomieniu telefonu.

## 3. Zarządzanie wersjami schematu bazy danych

Aktualizacje bazy danych są realizowane za pośrednictwem tabeli `PRAGMA user_version`. Podczas startu aplikacji sprawdzana jest wersja pliku bazy w stosunku do `EXPO_PUBLIC_SCHEMA_VERSION`. Jeśli wersja bazy jest niższa, wykonywane są kolejne skrypty migracji wewnątrz pojedynczej transakcji SQLite.
