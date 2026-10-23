# Privacy Policy / Polityka Prywatnosci: DocuLocker

Last updated / Data aktualizacji: 2026-10-22

DocuLocker is an offline-first mobile application designed to store receipts, invoices, and track warranties directly on your device. This Privacy Policy explains our commitment to data protection and outlines how the application operates with respect to user information.

Niniejszy dokument okresla zasady ochrony prywatnosci w aplikacji mobilnej DocuLocker.

---

## English Version

### 1. Zero Data Collection
DocuLocker does not collect, transmit, sell, or share any personal, financial, or behavioral data.
* No Account Required: You do not need to register, provide an email address, phone number, or create an account to use the application.
* No Remote Backend: The application operates entirely offline. There are no remote application servers, databases, or cloud endpoints receiving your documents.
* No Analytics or Trackers: The application does not contain third-party advertising SDKs, tracking libraries, or telemetry frameworks.

### 2. On-Device Text Recognition (OCR)
When you scan a receipt or select an image from your device storage:
* Optical Character Recognition (OCR) is executed locally on your device's processor using Google ML Kit.
* Image bytes and extracted text never leave your device and are not uploaded to Google or any other third party.

### 3. Local Storage and File Permissions
* Database: Your document metadata, tags, notes, and warranty dates are stored in a local SQLite database located within the application's private sandboxed directory.
* Media Storage: Photos of receipts and attached documents are stored in the application's internal files directory and are not accessible by other installed applications without explicit user export.
* System Permissions:
  * Camera (`android.permission.CAMERA`): Used solely for capturing receipt photos directly within the app.
  * Notifications (`android.permission.POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`): Used exclusively to trigger local alarms on your device for upcoming warranty expirations.

### 4. User-Initiated Data Export and Backup
Any export of data (such as generating a PDF warranty report or creating a backup archive) is explicitly triggered by the user. The resulting files are handed over to the system sharing mechanism (Android Intent) or saved to a directory chosen by the user.

### 5. Contact
If you have questions regarding this Privacy Policy, you can open an issue in the project's GitHub repository: https://github.com/kacpe/DocuLocker

---

## Wersja Polska

### 1. Zasada braku gromadzenia danych (Zero-Data)
Aplikacja DocuLocker nie zbiera, nie przesyla, nie sprzedaje ani nie udostepnia zadnych danych osobowych, finansowych ani behawioralnych.
* Brak wymogu rejestracji: Korzystanie z aplikacji nie wymaga zakladania konta, podawania adresu e-mail ani numeru telefonu.
* Brak serwerow zewnetrznych: Aplikacja dziala w trybie offline. Nie komunikuje sie z zadnym serwerem chmurowym ani zewnetrzna baza danych.
* Brak narzedzi analitycznych: Aplikacja nie zawiera SDK reklamowych, modulow profilujacych ani bibliotek sledzacych uzytkownika.

### 2. Lokalne przetwarzanie obrazu (OCR)
Podczas skanowania paragonu lub wyboru pliku z pamieci telefonu:
* Rozpoznawanie tekstu odbywa sie w 100% lokalnie na procesorze urzadzenia za pomoca biblioteki Google ML Kit.
* Zdjecia ani odczytany tekst nie sa przesylane do serwerow Google ani zadnych innych podmiotow.

### 3. Magazyn danych i uprawnienia
* Baza danych: Metadane dokumentow, kwoty i terminy gwarancji sa przechowywane w lokalnej bazie SQLite w prywatnym katalogu aplikacji.
* Pliki zdjec: Skanowane obrazy sa zapisywane w piaskownicy aplikacji, niedostepnej dla innych programow.
* Uprawnienia systemowe:
  * Aparat: Wylacznie do wykonywania zdjec paragonow w aplikacji.
  * Powiadomienia: Wylacznie do wyswietlania lokalnych alertow o konczacej sie gwarancji.

### 4. Kontakt
W przypadku pytan dotyczacych niniejszej polityki mozna utworzyc zgloszenie (issue) w repozytorium GitHub: https://github.com/kacpe/DocuLocker
