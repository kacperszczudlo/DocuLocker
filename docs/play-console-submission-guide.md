# Przewodnik Wdrożenia i Deklaracji w Google Play Console dla DocuLocker

Niniejszy dokument zawiera gotowe, zweryfikowane odpowiedzi do wszystkich formularzy i kwestionariuszy prawnych w **Google Play Console**, niezbędne do przejścia weryfikacji i publikacji aplikacji **DocuLocker**.

---

## 1. Treść Aplikacji (App Content) &ndash; Formularze Zgodności

W panelu Google Play Console przejdź do sekcji **Zgodność z zasadami &rarr; Treść aplikacji (App Content)** i uzupełnij poszczególne sekcje według poniższych instrukcji:

### A. Dostęp do aplikacji (App Access)
* **Pytanie:** Czy w aplikacji są części z ograniczonym dostępem (np. wymagające logowania, subskrypcji lub 2FA)?
* **Odpowiedź:** Wybierz **"Wszystkie funkcje są dostępne bez specjalnych uprawnień dostępu"** (*All functionality is available without special access restrictions*).
* *Uzasadnienie:* Aplikacja DocuLocker działa w 100% offline i nie posiada systemu kont, dzięki czemu automatyczni ani ludzcy testerzy Google nie potrzebują danych demo.

### B. Reklamy (Ads)
* **Pytanie:** Czy Twoja aplikacja zawiera reklamy?
* **Odpowiedź:** Wybierz **"Nie, moja aplikacja nie zawiera reklam"** (*No, my app does not contain ads*).

### C. Grupa docelowa i zawartość (Target Audience & Content)
* **Docelowe grupy wiekowe:** Zaznacz wyłącznie **18 lat i więcej** (*18 and older*).
* **Czy aplikacja może nieintencjonalnie przemawiać do dzieci?** Wybierz **"Nie"**.
* *Uzasadnienie:* Wybór grupy 18+ zwalnia aplikację z rygorystycznych ograniczeń polityki *Designed for Families* oraz przepisów COPPA.

### D. Klasyfikacja treści (Content Rating &ndash; IARC)
Wypełnij krótki kwestionariusz oceny treści:
* **Kategoria aplikacji:** Narzędzia, produktywność, finanse osobiste (*Utility / Productivity*).
* **Przemoc, krew, wulgaryzmy:** Zaznacz wszędzie **Nie**.
* **Hazard, symulacje kasyna:** Zaznacz **Nie**.
* **Udostępnianie lokalizacji użytkownika innym osobom:** Zaznacz **Nie**.
* **Zakup towarów cyfrowych (Digital goods):** Zaznacz **Nie**.
* *Wynik:* Aplikacja otrzyma ocenę **PEGI 3** (Europa) oraz **ESRB Everyone** (USA).

### E. Bezpieczeństwo danych (Data Safety Form)
To kluczowy formularz weryfikowany przez skanery Google:
1. **Czy aplikacja zbiera lub udostępnia dane użytkowników?** &rarr; Zaznacz **NIE (No)**.
2. **Czy wszystkie dane użytkowników są szyfrowane podczas przesyłania?** &rarr; N/A (brak transferu sieciowego).
3. **Czy aplikacja umożliwia użytkownikowi założenie konta?** &rarr; Zaznacz **NIE (No)**.
   *(Dzięki temu Google Play nie wymaga publicznego formularza webowego do usuwania konta).*
4. **Lokalne przetwarzanie OCR:** Rozpoznawanie tekstu przez Google ML Kit odbywa się w trybie Edge AI na procesorze telefonu. Ponieważ żadne dane nie opuszczają urządzenia, nie stanowi to zbierania danych (*Data Collection*).

### F. Aplikacje finansowe (Financial Features)
* Jeśli Google Play wyświetli monit o funkcje finansowe (ze względu na słowa kluczowe *paragony/wydatki*):
* Zadeklaruj, że aplikacja jest **narzędziem do osobistego zarządzania dokumentami zakupu (Personal Document/Receipt Organizer)** i **nie świadczy usług bankowych, pożyczkowych, inwestycyjnych ani płatniczych**.

### G. Polityka prywatności (Privacy Policy URL)
W polu adresu polityki prywatności wklej publiczny link HTTPS (HTML), np.:
```
https://kacpe.github.io/DocuLocker/privacy-policy.html
```
*(Upewnij się, że strona została opublikowana w GitHub Pages w gałęzi `main`).*

---

## 2. Protokół Testów Zamkniętych (Closed Testing &ndash; 12/20 Testerów)

Dla kont osobistych Google Play zarejestrowanych po 13 listopada 2023 r. obowiązuje wymóg testów zamkniętych przed dopuszczeniem do produkcji:

1. **Przygotowanie paczki produkcyjnej:**
   * Zbuduj paczkę `.aab` (np. za pomocą `eas build -p android --profile production`).
2. **Utworzenie ścieżki w konsoli:**
   * W menu wybierz: **Testowanie &rarr; Testy zamknięte (Closed testing)**.
   * Utwórz nową ścieżkę (np. *Alfa / Closed Beta*).
3. **Dodanie listy testerów:**
   * Zbierz adresy e-mail (konta Google) minimum **20 zaufanych testerów** (minimalny limit to 12, lecz zapas zapobiega przerwaniu testu w razie braku aktywności któregoś z użytkowników).
   * Utwórz listę e-mail lub połącz z grupą dyskusyjną Google Groups.
4. **Rozesłanie linku do aplikacji:**
   * Skopiuj link opt-in z konsoli:
     `https://play.google.com/apps/testing/app.doculocker.mobile`
   * Każdy tester musi kliknąć **"Zostań testerem"** (*Become a Tester*), a następnie zainstalować aplikację ze sklepu Google Play.
5. **Aktywność przez 14 kolejnych dni:**
   * Testerzy muszą mieć zainstalowaną aplikację i sporadycznie ją uruchamiać przez okres **14 nieprzerwanych dni**.
   * Nie odinstalowuj ani nie wycofuj wersji w trakcie tego okresu.
6. **Wniosek o dostęp do produkcji:**
   * Po upływie 14 dni w konsoli odblokuje się przycisk **"Złóż wniosek o dostęp do produkcji"** (*Apply for production access*).
   * Wypełnij 20 pytań ankietowych, opisując feedback testerów (np. stabilność OCR, przejrzystość powiadomień) oraz wdrożone poprawki.

---

## 3. Standardy Metadanych Sklepu (Store Listing & ASO)

Aby uniknąć odrzucenia za wprowadzające w błąd metadane:

| Element | Wymóg Google Play | Zalecana Wartość dla DocuLocker |
|---|---|---|
| **Nazwa aplikacji (Title)** | Max 30 znaków, zero emoji, zero słów "Darmowy", "#1" | `DocuLocker: Paragony i Sejf` (28 znaków) |
| **Krótki opis (Short Description)** | Max 80 znaków | `Bezpieczny, lokalny portfel na paragony, faktury i gwarancje. Zero chmury.` (76 znaków) |
| **Ikona aplikacji (App Icon)** | 512 x 512 px, 32-bit PNG | Dostępna w `assets/icon.png` |
| **Grafika wyróżniająca (Feature Graphic)** | 1024 x 500 px, JPG lub PNG | Do wygenerowania z wektorowego BrandLogo |
| **Zrzuty ekranu (Screenshots)** | Min. 2 zrzuty, 16:9 lub 9:16, rzeczywiste UI | Wykonane bezpośrednio z aplikacji na telefonie/emulatorze |

---

## 4. Polecenia Budowania i Publikacji

```bash
# 1. Sprawdzenie integralności kodu i testów
npm run test
npm run lint

# 2. Zalogowanie do Expo / EAS CLI
npx eas login

# 3. Zbudowanie oficjalnej paczki Android App Bundle (.aab)
npx eas build --platform android --profile production

# 4. (Opcjonalnie) Automatyczne wysłanie do ścieżki testów zamkniętych
npx eas submit --platform android --track closed
```
