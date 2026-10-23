# Budowanie i Publikacja w Google Play Store

Procedura tworzenia paczki produkcyjnej oraz wymagania dotyczące wdrożenia aplikacji DocuLocker w Google Play Store.

## 1. Wymagania wstępne w Google Play Console

* Wymóg testów zamkniętych (Closed Testing): konta osobiste zarejestrowane po listopadzie 2023 roku wymagają przeprowadzenia testów z udziałem minimum 20 testerów przez okres 14 dni przed dopuszczeniem do publikacji produkcyjnej.
* Formularz bezpieczeństwa danych (Data Safety):
  * Pytanie o zbieranie danych: zaznaczamy "Nie", aplikacja nie zbiera ani nie przesyła danych użytkowników poza urządzenie.
  * Przetwarzanie OCR odbywa się lokalnie na procesorze telefonu.
* Polityka prywatności: publiczny link do dokumentu potwierdzającego brak gromadzenia danych osobowych i brak połączeń z serwerami analitycznymi.

## 2. Konfiguracja budowania: EAS Build

Budowanie paczki produkcyjnej Android App Bundle (.aab) odbywa się za pomocą narzędzia EAS Build.

### Przykładowy plik `eas.json`

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "gradleCommand": ":app:assembleDebug"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

## 3. Podpisywanie aplikacji

Do podpisywania paczek produkcyjnych zaleca się usługę Google Play App Signing:
1. EAS Build generuje klucz przesyłania (upload key) i przechowuje go w bezpiecznym magazynie Expo.
2. Alternatywnie klucz można wygenerować lokalnie za pomocą narzędzia `keytool`:

```bash
keytool -genkeypair -v -keystore doculocker-upload-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias doculocker-key
```

Pliki kluczy `.jks` oraz `.keystore` są wykluczone z repozytorium przez plik `.gitignore`.

## 4. Polecenia wdrożeniowe

```bash
# Weryfikacja testów i typów
npm run test
npm run lint

# Logowanie do usług Expo
npx eas-cli login

# Zbudowanie paczki produkcyjnej .aab
npx eas-cli build --platform android --profile production
```

Pobrany plik `.aab` wgrywamy do Google Play Console w sekcji Testy zamknięte lub Produkcja.
