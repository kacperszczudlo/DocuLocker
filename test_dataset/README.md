# DocuLocker Test Dataset (Zbiór Testowy Dokumentów i Paragonów)

Katalog przeznaczony na próbki testowe dokumentów zakupowych: paragonów fiskalnych, faktur VAT A4, wydruków niefiskalnych (potwierdzeń terminali płatniczych EFT POS) oraz przypadków brzegowych.

Zbiór służy do ewaluacji dokładności silnika ekstrakcji danych OCR DocuLocker (`HeuristicReceiptParser`).

## 1. Konwencja nazewnictwa plików graficznych

Wszystkie pliki w katalogu `images/` podlegają ustandaryzowanemu, opisowemu formatowi nazewnictwa:

```text
{kategoria}_{sieć-lub-wystawca}_{opis-pozycji}_{kwota}PLN_{data-iso}.{rozszerzenie}
```

Przykłady:
- `grocery_kaufland_duze-zakupy-rabaty_175.46PLN_2025-12-04.jpg`
- `invoices_faktura-vat_xkom-laptop-dell_4999.00PLN_2026-02-10.jpg`
- `edge_paragon-termiczny_wyblakly-slaby-kontrast_38.20PLN_2026-01-10.jpg`
- `edge_terminal-pos_potwierdzenie-niefiskalne-pep_125.00PLN_2026-02-15.jpg`

---

## 2. Struktura kategorii i inwentarz plików (`test_dataset/images/`)

Zbiór zawiera **42 unikalne, niepowtarzające się próbki dokumentów** podzielone na 9 wyspecjalizowanych katalogów:

### 1. `images/grocery/` (9 próbek)
Paragony z sieci dyskontowych, supermarketów, gastronomii i piekarni rzemieślniczych:
- `grocery_gastronomia_bar-szalas-zory_ryba-frytki_45.00PLN_2025-08-28.jpg`
- `grocery_intermarche_wedliny-napoj_73.56PLN_2025-02-05.jpg`
- `grocery_kaufland_baner-promocyjny-ksiazka_107.08PLN_2024-03-08.jpg`
- `grocery_kaufland_duze-zakupy-rabaty_175.46PLN_2025-12-04.jpg`
- `grocery_kaufland_warzywa-kauflandcard_88.20PLN_2024-08-02.jpg`
- `grocery_piekarnia-ruchala_chleb-i-bulki_8.30PLN_2026-01-05.jpg`
- `grocery_piekarnia-ruchala_chleb-krojony-x3_20.40PLN_2026-04-03.jpg`
- `grocery_piekarnia-ruchala_chleb-krojony_6.30PLN_2024-07-05.jpg`
- `grocery_zabka_wroclaw_lody_13.77PLN_2019-03-24.jpg`

### 2. `images/invoices_a4/` (3 próbki)
Pełnoformatowe faktury VAT A4 (towarowe, usługowe, B2B) z wyodrębnionym NIP sprzedawcy i NIP nabywcy:
- `invoices_faktura-vat_leroy-merlin-materialy-budowlane_1845.20PLN_2026-03-02.jpg`
- `invoices_faktura-vat_uslugi-programistyczne-b2b_12300.00PLN_2026-01-31.jpg`
- `invoices_faktura-vat_xkom-laptop-dell_4999.00PLN_2026-02-10.jpg`

### 3. `images/gas_stations/` (4 próbki)
Wydruki fiskalne ze stacji paliw ze stawkami PTU, dystrybutorami i produktami sklepowymi:
- `gas_bp_paliwo-ultimate-kawa_210.40PLN_2026-01-22.jpg`
- `gas_circle-k_miles-plus-hotdog_168.90PLN_2026-03-05.jpg`
- `gas_orlen_paliwo-efecta-verva_284.50PLN_2026-03-10.jpg`
- `gas_shell_vpower-diesel-myjnia_315.20PLN_2026-02-18.jpg`

### 4. `images/electronics/` (4 próbki)
Paragony i dokumenty ze sklepów z elektroniką użytkową i AGD/RTV:
- `electronics_ajs_waz-odkurzacz-amica_63.99PLN_2026-03-03.jpg`
- `electronics_media-expert_sluchawki-etui_299.99PLN_2026-02-05.jpg`
- `electronics_rtv-euro-agd_ekspres-philips_1899.00PLN_2026-01-14.jpg`
- `electronics_xkom_dysk-ssd-kingston_449.00PLN_2026-03-01.jpg`

### 5. `images/fashion_sports/` (4 próbki)
Paragony z salonów modowych i sportowych z dłuższym okresem zwrotu:
- `fashion_ccc_polbuty-lasocki_249.99PLN_2026-02-20.jpg`
- `fashion_decathlon_buty-kalenji-skarpetki_189.99PLN_2026-03-08.jpg`
- `fashion_hm_sweter-spodnie_199.98PLN_2026-02-12.jpg`
- `fashion_reserved_kurtka-zimowa_359.99PLN_2026-01-28.jpg`

### 6. `images/home_diy/` (3 próbki)
Paragony marketów budowlanych i wykończeniowych:
- `home_diy_castorama_wroclaw_farby-tasmy_469.90PLN_2026-03-02.jpg`
- `home_diy_castorama_wroclaw_imbusy-led_61.96PLN_2021-09-23.jpg`
- `home_diy_sezal2_zarowka-halogenowa_15.00PLN_2025-09-05.jpg`

### 7. `images/drugstores/` (2 próbki)
Paragony drogerii i aptek:
- `drugstores_apteka-zielarska_balsam-ratownik_25.82PLN_2025-04-12.jpg`
- `drugstores_rossmann_krem-nivea-men_14.99PLN_2025-06-03.jpg`

### 8. `images/discount_variety/` (6 próbek)
Prasa, bilety, kioski, dyskonty niespożywcze:
- `discount_kiosk_wroclaw_prasa_7.99PLN_2026-01-19.jpg`
- `discount_krzyszkowska_koperty-biurowe_16.00PLN_2024-08-03.jpg`
- `discount_mars_prasa-magazyn_34.99PLN_2025-11-03.jpg`
- `discount_mars_prasa-tygodnik_39.99PLN_2025-02-05.jpg`
- `discount_pepco_zabawki-i-potwierdzenie-karty_59.00PLN_2024-08-16.jpg`
- `discount_tpn_bilet-wstepu-koscieliska_14.00PLN_2021-08-09.jpg`

### 9. `images/edge_cases/` (7 próbek)
Przypadki brzegowe i trudne warunki akwizycji:
- `edge_paragon-termiczny_wyblakly-slaby-kontrast_38.20PLN_2026-01-10.jpg` – wyblakły papier termiczny, zredukowany kontrast
- `edge_paragon-pognieciony_zalamania-cienie_54.30PLN_2026-03-12.jpg` – pogięty papier, cienie w załamaniach
- `edge_terminal-pos_potwierdzenie-niefiskalne-pep_125.00PLN_2026-02-15.jpg` – niefiskalny kwit z terminala płatniczego EFT POS (brak NIP fiskalnego)
- `edge_niefiskalny_wydruk-z-nip-nabywcy_401.36PLN.jpg` – wydruk niefiskalny zawierający wyłącznie NIP nabywcy
- `edge_perspektywa_umowa-dokument-a4-kat-skosu.jpg` – zniekształcenia perspektywiczne pod kątem
- `edge_diagram_ekran-pos-opisany.jpg` – schemat pól systemów kasowych
- `edge_diagram_paragon-wzorcowy-opisany_44.90PLN_2008-12-09.png` – paragon wzorcowy z opisem sekcji Ministerstwa Finansów

---

## 3. Zbiór referencyjny (`ground_truth.json`)

Plik `ground_truth.json` definiuje **70 kompletnych scenariuszy testowych** odwzorowujących odczyt OCR z dokumentów wszystkich kategorii.

Każdy przypadek testowy weryfikuje poprawność:
- `storeName`: rozpoznanie marki/sklepu (lub nagłówka niefiskalnego/faktury)
- `totalAmount`: precyzyjne odczytanie kwoty transakcji z uwzględnieniem rabatów i podatków PTU
- `purchaseDate`: data transakcji w formacie ISO (YYYY-MM-DD)
- `taxId`: 10-cyfrowy NIP sprzedawcy (z poprawną izolacją przed omyłkowym pobraniem NIP nabywcy oraz poprawną obsługą `null` dla kwitów niefiskalnych)

### Uruchomienie benchmarku

Aby uruchomić pełny test referencyjny na wszystkich 70 przypadkach:

```bash
npm test
# lub bezpośrednio benchmark:
npx vitest run tests/parsers/datasetBenchmark.test.ts
```

Wynik benchmarku:
```text
--- DOCULOCKER BENCHMARK RESULTS ---
Liczba przypadków: 70
Store Identification: 100.0% (70/70)
Total Amount Match:   100.0% (70/70)
Purchase Date Match:  100.0% (70/70)
Tax ID (NIP) Match:   100.0% (70/70)
------------------------------------
```
