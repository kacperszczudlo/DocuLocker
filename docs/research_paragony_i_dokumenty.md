# Badanie i Taksonomia Dokumentów Zakupowych dla DocuLocker (Edge AI)

## 1. Wprowadzenie i Cel Badania

Aplikacja **DocuLocker** działa w architekturze **Offline-First Zero-Data** (przetwarzanie lokalne na urządzeniu przez Google ML Kit Text Recognition v2 oraz heurystyczny silnik analizy tekstu w TypeScript).

Aby zapewnić niezawodną detekcję kluczowych danych:
1. **Nazwa sklepu / sprzedawcy**
2. **Łączna kwota transakcji (brutto)**
3. **Data zakupu**
4. **Numer NIP sprzedawcy** (oraz opcjonalnie NIP nabywcy)
5. **Kategoria wydatku** oraz **okno zwrotu towaru** (rekomendacja gwarancji i praw konsumenta)

konieczne jest precyzyjne skatalogowanie formatów dokumentów fiskalnych stosowanych w Polsce, unikalnych cech nagłówków, reguł prawnych oraz typowych błędów odczytu OCR.

---

## 2. Typy Dokumentów Występujących w Obiegu Konsumenckim

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DOKUMENTY ZAKUPOWE I GWARANCYJNE                      │
├──────────────────────┬───────────────────────┬──────────────────────────────┤
│  Fiskalne (B2C)      │   Faktury (B2B/B2C)   │  Niefiskalne / Pomocnicze    │
├──────────────────────┼───────────────────────┼──────────────────────────────┤
│ • Paragon standard   │ • Faktura VAT A4      │ • Potwierdzenie z terminala  │
│ • Faktura uproszczona│ • Faktura ze sklepu   │   (EFT POS / niefiskalny)    │
│   (paragon z NIP)    │ • e-Faktura (PDF)     │ • Karta gwarancyjna          │
│ • e-Paragon (QR/app) │                       │ • Protokół reklamacyjny / WZ │
└──────────────────────┴───────────────────────┴──────────────────────────────┘
```

### 2.1. Paragon Fiskalny (Standardowy papier termiczny)
Regulowany przez *Rozporządzenie Ministra Finansów w sprawie kas rejestrujących*.
- **Układ obowiązkowy od góry do dołu:**
  1. Dane sprzedawcy (nazwa firmy, forma prawna, adres placówki).
  2. NIP sprzedawcy (zawsze 10 cyfr, najczęściej poprzedzony przedrostkiem `NIP` lub `NIP:`).
  3. Pozycje paragonowe (nazwa towaru, ilość, stawka PTU/VAT A/B/C/D, cena jednostkowa, wartość brutto).
  4. Rabaty, opusty, kaucje butelkowe (jeśli występują).
  5. **Podsumowanie fiskalne:**
     - Rozbicie na stawki PTU (A=23%, B=8%, C=0%, D=5% itp.).
     - **SP. OPODATKOWANA** / **KWOTA PTU**.
     - **SUMA PLN** / **RAZEM PLN** / **DO ZAPŁATY**.
  6. Forma płatności: Karta / Gotówka / BLIK / Bon / Płatność mieszana.
  7. Dane techniczne: Data i godzina, nr paragonu, nr kasy, oznaczenie kasjera.
  8. **Stopka fiskalna:** Logo fiskalne (charakterystyczny symbol stylizowanych liter `PL` w koronie/prostokącie) oraz numer unikatowy kasy rejestrującej (np. `ABC 12345678`, `EAS 01234567`).

### 2.2. Faktura Uproszczona (Paragon z NIP nabywcy do 450 zł / 100 EUR)
Zgodnie z art. 106e ust. 5 pkt 3 ustawy o VAT, paragon fiskalny zawierający **NIP nabywcy** na kwotę do 450 zł brutto jest traktowany w świetle polskiego prawa jak pełnoprawna faktura VAT.
- **Wyzwanie OCR:** Na dokumencie znajdują się **dwa numery NIP**:
  1. `NIP sprzedawcy` – w nagłówku na samej górze.
  2. `NIP nabywcy` – tuż pod listą pozycji, a przed podsumowaniem fiskalnym lub przy formie płatności (często oznaczony `NIP NABYWCY:`, `NIP KLIENTA:`, `NIP:`).
- **Zasada dla DocuLocker:** Silnik musi wyekstrahować NIP sprzedawcy do weryfikacji sieci/sklepu, a NIP nabywcy przypisać do profilu użytkownika (potwierdzenie zakupu na firmę lub osobę prywatną).

### 2.3. Faktury VAT Pełnowymiarowe (A4 / Termiczne wydruki kasowe)
- Popularne w marketach budowlanych (Castorama, Leroy Merlin, OBI) oraz hurtowniach i elektromarketach (Media Expert, x-kom).
- Układ tabelaryczny wielokolumnowy: Sprzedawca po lewej, Nabywca po prawej, tabela z pozycjami, podsumowanie "Razem do zapłaty".

### 2.4. Wydruki Niefiskalne z Terminali Płatniczych (EFT POS)
- **Bardzo częsty błąd użytkowników:** Użytkownik fotografuje mały kwit z terminala ("POTWIERDZENIE TRANSAKCJI / KOD AUTH / KARTĄ ZBLIŻENIOWO") zamiast właściwego paragonu fiskalnego.
- Na wydruku z terminala:
  - Brak szczegółowych pozycji towarowych.
  - Brak logo fiskalnego `PL`.
  - Brak stawek PTU/VAT.
  - Znajduje się kwota, data, zamaskowany nr karty (`**** **** **** 1234`) oraz nr transakcji MID/TID.
- **Wymóg dla DocuLocker:** Parser powinien rozpoznać wydruk niefiskalny, wyciągnąć z niego kwotę i datę jako rezerwowe dane, ale wyświetlić użytkownikowi żółte ostrzeżenie: *"Wykryto potwierdzenie płatności kartą zamiast paragonu fiskalnego. Do celów reklamacji zalecane jest dołączenie właściwego paragonu."*

### 2.5. e-Paragony (Aplikacje mobilne i kody QR)
- Aplikacje lojalnościowe: Moja Biedronka (e-paragon), Lidl Plus (karta cyfrowa), Rossmann GO, Żappka.
- Posiadają idealny kontrast, brak zagnieceń, jednak formaty tekstowe mogą zawierać kody kreskowe i QR, zrzuty ekranu ze smartfona z widocznym paskiem statusu Android/iOS.

---

## 3. Szczegółowa Taksonomia Sieci Handlowych w Polsce

Wielkim problemem algorytmów OCR jest fakt, że na wydruku fiskalnym **nie zawsze występuje handlowa nazwa marki**, lecz **oficjalna nazwa podmiotu prawnego**.
Poniższa tabela zawiera zestawienie kluczowych sieci w Polsce, ich dane prawne, NIP-y, kategorie wydatków oraz domyślne polityki zwrotów.

| Sieć Handlowa | Nazwa prawna na nagłówku fiskalnym | NIP Sprzedawcy | Domyślna kategoria DocuLocker | Standardowe okno zwrotu |
|---|---|---|---|---|
| **Biedronka** | `Jeronimo Martins Polska S.A.` | `7791011327` | Artykuły spożywcze | 14 dni (wybrany non-food) |
| **Lidl** | `Lidl sp. z o.o. sp. k.` | `7811897323` | Artykuły spożywcze | 30 dni (art. przemysłowe) |
| **Dino** | `DINO Polska S.A.` | `6932155983` | Artykuły spożywcze | 14 dni |
| **Żabka** | `Żabka Polska Sp. z o.o.` / Franczyzobiorca | `5222728103` (centrala) | Artykuły spożywcze | Brak (spożywcze) / 14 dni |
| **Carrefour** | `Carrefour Polska Sp. z o.o.` | `9370008168` | Artykuły spożywcze | 14 dni |
| **Auchan** | `Auchan Polska Sp. z o.o.` | `5260309174` | Artykuły spożywcze | 30 dni |
| **Kaufland** | `Kaufland Polska Markety Sp. z o.o. Sp. k.` | `6252258832` | Artykuły spożywcze | 14 dni |
| **Netto** | `Netto Sp. z o.o.` | `8520401824` | Artykuły spożywcze | 14 dni |
| **Aldi** | `ALDI Sp. z o.o.` | `8522436894` | Artykuły spożywcze | 30 dni (non-food) |
| **Media Expert** | `TERG S.A.` | `6182148886` | Elektronika i RTV | 14 dni (sklep) / 30 dni |
| **RTV Euro AGD**| `Euro-net Sp. z o.o.` | `5270005984` | Elektronika i RTV | 14 dni (lub 30 dni Euro Klub) |
| **MediaMarkt** | `Media Saturn Online Sp. z o.o.` / MS Market | `7010327611` | Elektronika i RTV | 30 dni (Klub MM) |
| **x-kom** | `x-kom sp. z o.o.` | `9492107026` | Elektronika i RTV | 15 dni |
| **Neonet** | `NEONET S.A.` | `8951786278` | Elektronika i RTV | 14 dni |
| **Komputronik** | `Komputronik S.A.` | `9720903043` | Elektronika i RTV | 14 dni |
| **Castorama** | `Castorama Polska Sp. z o.o.` | `5261009959` | Dom i Ogród | Bezterminowo (z paragonem) |
| **Leroy Merlin** | `Leroy Merlin Polska Sp. z o.o.` | `1130005047` | Dom i Ogród | Bezterminowo (klubowicze) |
| **IKEA** | `IKEA Retail Sp. z o.o.` | `5270107448` | Dom i Ogród | 365 dni (IKEA Family) |
| **OBI** | `Superhobby Market Budowlany Sp. z o.o.` | `9511008094` | Dom i Ogród | Bezterminowo |
| **Jysk** | `JYSK Sp. z o.o.` | `5862016372` | Dom i Ogród | Bezterminowo |
| **Decathlon** | `Decathlon Sp. z o.o.` | `9511855233` | Sport i Turystyka | 365 dni (z kontem klienta) |
| **Rossmann** | `Rossmann SDP Sp. z o.o.` | `7270019198` | Zdrowie i Apteka | 14 dni |
| **Hebe** | `Jeronimo Martins Drogerie i Farmacja Sp. z o.o.` | `5213605417` | Zdrowie i Apteka | 14 dni |
| **Action** | `Action Polska Sp. z o.o.` | `7792434601` | Inne | 14 dni |
| **Pepco** | `Pepco Poland Sp. z o.o.` | `7822131141` | Odzież i Obuwie | 30 dni |
| **Dealz** | `Dealz Poland Sp. z o.o.` | `9721283626` | Inne | 14 dni |
| **CCC** | `CCC Shoes & Bags Sp. z o.o.` | `6922201324` | Odzież i Obuwie | 14 dni (lub 30-120 dni Klub) |
| **Reserved (LPP)**| `LPP S.A.` | `5831014898` | Odzież i Obuwie | 30 dni |
| **Orlen** | `ORLEN S.A.` | `7740001454` | Transport i Paliwo | 14 dni (non-fuel) |
| **Shell** | `Shell Polska Sp. z o.o.` | `5261009190` | Transport i Paliwo | 14 dni (non-fuel) |
| **Empik** | `Empik S.A.` | `5260207427` | Książki i Rozrywka | 30 dni (Empik Premium) |

---

## 4. Analiza Trudnych Przypadków (Edge Cases & Failure Modes)

Podczas testowania automatycznego silnik OCR oraz reguły heurystyczne napotykają na następujące specyficzne zakłócenia:

### 4.1. Rabaty i Kupony Promocyjne
- **Zjawisko:** Na paragonie Biedronki lub Lidla pod pozycją widnieje linia `RABAT: -12.00` lub `OSZCZĘDZASZ: 34.50`, a w podsumowaniu pojawia się:
  ```text
  SUMA PRZED RABATEM: 120.50
  WARTOŚĆ RABATÓW: -34.50
  SUMA PLN: 86.00
  DO ZAPŁATY: 86.00
  ```
- **Zagrożenie:** Prosty regex szukający pierwszej liczby po słowie `SUMA` może wybrać `120.50` (kwotę przed rabatem) lub `-34.50`.
- **Wymóg:** Priorytet słów kluczowych: `DO ZAPŁATY` > `SUMA PLN` > `ZAPŁACONO` > `RAZEM`.

### 4.2. Kaucje za Butelki / Opakowania Zwrotne
- Często doliczane lub odliczane na końcu paragonu:
  ```text
  KAUCJA OPAKOWANIA: 4.00
  ZWROT KAUCJI: -10.00
  DO ZAPŁATY: 74.20
  ```
- Kwota końcowa to bezwzględnie wiersz `DO ZAPŁATY`.

### 4.3. Zniekształcenia Optyczne Papieru Termicznego
- **Blaknięcie:** Paragony starsze niż 3-6 miesięcy tracą pigment pod wpływem światła i ciepła.
- **Zagniecenia i fałdy:** Przełamują ciągłość tekstu linii (np. `DO ZA PŁATY 4 9 . 9 9`).
- **Ukośne zdjęcia (Skew / Keystoning):** Tekst nie biegnie idealnie horyzontalnie.
- **Cienie dłoni i odblaski światła lampy błyskowej.**

### 4.4. Mylenie Znaków przez OCR (Char Confusion Matrix)
- `0` (zero) z `O` (literą O) oraz `D`
- `1` (jeden) z `I` (dużym i), `l` (małym L) lub `|` (pipe)
- `,` (przecinek) z `.` (kropką) – w Polsce separatorem dziesiętnym jest przecinek, ale kasy drukują też kropki
- `8` z `B` (istotne przy NIP i kwotach)
- `5` z `S`
- `ZŁ` z `21`

---

## 5. Przegląd Rozwiązań Open Source i Stanu Wiedzy (GitHub / SotA)

Zbadano wiodące repozytoria i podejścia akademickie do przetwarzania paragonów fiskalnych:

1. **CORD (Consolidated Receipt Dataset for Post-OCR Parsing) & SROIE (ICDAR):**
   - Standardy benchmarków światowych. Większość nowoczesnych rozwiązań na GitHubie używa modeli sekwencyjnych lub grafowych do łączenia tokenów w pary Klucz-Wartość.
2. **Lokalne podejścia w projektach polskich (np. SmartBudget-OCR, receipt_scanner):**
   - Bazują na silniku Tesseract z pakietem `pol.traineddata` + rozbudowane wyrażenia regularne i algorytm Luhna dla walidacji numeru NIP.
   - Słabość Tesseracta na urządzeniach mobilnych: duża waga biblioteki (40-60 MB), podatność na zagniecenia papieru.
3. **Google ML Kit Text Recognition v2 (DocuLocker Stack):**
   - **Zalety:** Działa natywnie na Androidzie (wykorzystuje NPU/GPU urządzenia), inferencja trwa zaledwie 80-250 ms, brak zapotrzebowania na pamięć sieci neuronowej w paczce APK.
   - **Strategia optymalizacji:** Uzupełnienie wyników ML Kit o **algorytm odległości Levenshteina / Fuzzy Matching** dla bazy marek i NIP-ów. Jeśli OCR odczyta `"Jeronimo Mart1ns"`, dopasowanie rozmyte z wagą progową 85% poprawnie identyfikuje Biedronkę.

---

## 6. Architektura Zbioru Testowego i Zautomatyzowanego Benchmarku

W repozytorium przygotowano izolowaną strukturę katalogów:
- `test_dataset/` (zignorowaną w `.gitignore`) z podziałem na kategorie sklepów, faktury oraz trudne przypadki.
- Plik referencyjny `ground_truth.json` definiujący metryki oczekiwane dla każdego obrazu.
- Skrypt / test automatyczny `tests/parsers/datasetBenchmark.test.ts`, który ocenia:
  - **Store Identification Accuracy (% poprawnie wykrytych sklepów)**
  - **Amount Match Rate (% kwot zgodnych co do grosza)**
  - **Date Match Rate (% poprawnie wyznaczonych dat ISO)**
  - **Tax ID Recall & Precision (% wykrytych NIP-ów)**
  - **Overall Pipeline Accuracy**
