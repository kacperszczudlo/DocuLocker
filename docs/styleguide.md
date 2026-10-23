# Standardy Kodu

Zasady programowania obowiązujące w projekcie DocuLocker.

## 1. Zasady ogólne

* TypeScript Strict Mode: opcja `"strict": true` w pliku `tsconfig.json` jest obowiązkowa. Unikamy typu `any`, zastępując go typami generycznymi lub `unknown` z późniejszym zawężeniem (type narrowing).
* Niezmienność danych: obiekty domenowe i stan aplikacji traktujemy jako niemutowalne. W modelach stosujemy modyfikator `readonly`.
* Separacja logiki od widoków: komponenty interfejsu (React Native) nie zawierają bezpośrednich zapytań SQL ani złożonych wyrażeń regularnych. Operacje te są delegowane do warstwy domenowej i repozytoriów.

## 2. Konwencje nazewnictwa

* Komponenty i ekrany: PascalCase, np. `ReceiptCard.tsx`, `ScannerModal.tsx`.
* Moduły logiki, serwisy, repozytoria: camelCase, np. `receiptParser.ts`, `documentRepository.ts`.
* Interfejsy i typy: PascalCase, np. `ReceiptData`, `WarrantyFilter`. W interfejsach portów dopuszczalny jest prefiks `I`, np. `IOcrEngine`, `IDocumentRepository`.
* Stałe konfiguracyjne: UPPER_SNAKE_CASE, np. `DEFAULT_WARRANTY_MONTHS`, `MAX_IMAGE_DIMENSION`.

## 3. Komponenty React Native

* Długość pliku komponentu powinna mieścić się w granicach 100-200 linii. Większe widoki należy dzielić na mniejsze podkomponenty.
* Każdy komponent funkcyjny posiada jawnie zdefiniowany interfejs właściwości (Props):

```typescript
interface ReceiptItemProps {
  readonly title: string;
  readonly amount: number;
  readonly currency: string;
  readonly purchaseDate: string;
  readonly onPress: () => void;
}

export const ReceiptItem: React.FC<ReceiptItemProps> = ({
  title,
  amount,
  currency,
  purchaseDate,
  onPress,
}) => {
  return (
    // Renderowanie elementów widoku
  );
};
```

* Listy elementów o zmiennej długości renderujemy za pomocą zoptymalizowanych komponentów listowych, unikając umieszczania funkcji inline w parametrach `renderItem`.

## 4. Zarządzanie stanem (Zustand)

* Stan globalny dzielimy na wyspecjalizowane moduły (np. `documentStore`, `settingsStore`).
* Akcje w store są funkcjami asynchronicznymi, które obsługują stany ładowania i ewentualne błędy.
* Selekcja danych ze store powinna być precyzyjna, aby uniknąć zbędnych ponownych renderowań komponentów.

## 5. Standardy testowania

* Logika biznesowa (parsery, kalkulatory terminów) oraz repozytoria danych podlegają testom jednostkowym i integracyjnym.
* Struktura testów opiera się na schemacie AAA (Arrange - Act - Assert):

```typescript
describe('HeuristicReceiptParser', () => {
  it('extracts total amount from SUMA PLN line', () => {
    // Arrange
    const lines = [
      'SKLEP SPOZYWCZY',
      'CHLEB 4.20',
      'MLEKO 3.80',
      'SUMA PLN 8,00',
    ];

    // Act
    const result = HeuristicReceiptParser.extractTotalAmount(lines);

    // Assert
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(8.0);
    expect(result?.currency).toBe('PLN');
  });
});
```

* Poprawki błędów w regułach parsowania zaczynamy od napisania testu odtwarzającego problem, a następnie modyfikujemy wyrażenie regularne.
