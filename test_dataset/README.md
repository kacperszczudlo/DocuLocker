# DocuLocker Test Dataset (Zbiór Testowy Dokumentów i Paragonów)

Katalog przeznaczony na próbki testowe paragonów, faktur, wydruków niefiskalnych oraz kart gwarancyjnych.
Podkatalog `images/` jest ignorowany w systemie kontroli wersji (`.gitignore`), aby nie obciążać repozytorium plikami binarnymi i chronić dane prywatne, natomiast zbiór `ground_truth.json` (60 przypadków testowych) oraz skrypty pobierające w `scripts/` są wersjonowane.

## Struktura katalogu

- `images/grocery/` – Biedronka, Lidl, Dino, Żabka, Carrefour, Auchan, Kaufland, Stokrotka, Polomarket, Lewiatan, E.Leclerc, Netto, Aldi
- `images/electronics/` – Media Expert, RTV Euro AGD, MediaMarkt, x-kom, Komputronik, Neonet
- `images/home_diy/` – Castorama, Leroy Merlin, IKEA, OBI, JYSK, Agata Meble, BRW, Bricomarché
- `images/fashion_sports/` – Zara, H&M, Reserved, Sinsay, Cropp, House, Mohito, CCC, HalfPrice, Deichmann, eobuwie, TK Maxx, Decathlon, 4F, Martes Sport
- `images/drugstores/` – Rossmann, Hebe, Super-Pharm, Douglas, Sephora, DOZ Apteka
- `images/discount_variety/` – Action, Pepco, Dealz, Tedi
- `images/gas_stations/` – Orlen, BP, Shell, Circle K, Moya
- `images/invoices_a4/` – Faktury VAT (papierowe A4 / PDF rastrowany)
- `images/edge_cases/` – Paragony zamazane, wyblakłe, pogniecione, ucięte, terminale EFT POS (niefiskalne)
- `ground_truth.json` – Oczekiwane wartości referencyjne dla 60 przypadków testowych (100% zgodności w `tests/parsers/datasetBenchmark.test.ts`)

## Schemat danych referencyjnych (`ground_truth.json`)

Każdy przypadek testowy w `ground_truth.json` definiuje:
```json
{
  "id": "biedronka_01",
  "file": "images/grocery/biedronka_01.jpg",
  "expected": {
    "storeName": "Biedronka",
    "totalAmount": 47.89,
    "currency": "PLN",
    "purchaseDate": "2024-03-15",
    "taxIdSeller": "7791011327",
    "taxIdBuyer": null,
    "isFiscalReceipt": true,
    "suggestedReturnDays": 14,
    "category": "Inne"
  },
  "difficulty": "medium",
  "tags": ["discounts", "thermal_paper", "curved"]
}
```
