# Standardy Kodu i Jakości Architektury

Zasady programowania obowiązujące w projekcie **DocuLocker**.

## 1. Zasady ogólne

* **TypeScript Strict Mode**: opcja `"strict": true` w pliku `tsconfig.json` jest obowiązkowa. Unikamy typu `any`, zastępując go typami generycznymi lub `unknown` z późniejszym zawężeniem (type narrowing).
* **Niezmienność danych**: obiekty domenowe i stan aplikacji traktujemy jako niemutowalne. W modelach stosujemy modyfikator `readonly`.
* **Separacja logiki od widoków**: komponenty interfejsu (React Native) nie zawierają bezpośrednich zapytań SQL ani złożonych wyrażeń regularnych. Operacje te są delegowane do warstwy domenowej (`src/core/`), serwisów (`src/services/`) i repozytoriów (`src/database/`).

## 2. Konwencje nazewnictwa

* **Komponenty i ekrany**: PascalCase, np. `ReceiptCard.tsx`, `ScannerModal.tsx`.
* **Moduły logiki, serwisy, repozytoria**: camelCase, np. `receiptParser.ts`, `documentRepository.ts`, `notificationService.ts`.
* **Interfejsy i typy**: PascalCase, np. `ReceiptData`, `WarrantyFilter`. W interfejsach portów dopuszczalny jest prefiks `I`, np. `IOcrEngine`, `IDocumentRepository`.
* **Stałe konfiguracyjne**: UPPER_SNAKE_CASE, np. `DEFAULT_WARRANTY_MONTHS`, `MAX_IMAGE_DIMENSION`.

## 3. Architektura Skali UI i Ergonomia Dotyku (8pt Grid & Touch Targets)

Zgodnie z wytycznymi **Google Material Design 3**, **Apple Human Interface Guidelines 2025** oraz audytem **`ui-scale-architecture`**:

* **Przestrzeń (8pt Spatial Grid)**: Wszystkie paddingi, marginesy, wysokości wierszy i odstępy komponentów są wielokrotnościami 8 (`spacing.sm = 8`, `spacing.md = 16`, `spacing.lg = 24`, `spacing.xl = 32`). Dozwolony krok 4dp (`spacing.xs = 4`) stosowany jest wyłącznie do mikroodstępów ikona-tekst.
* **Minimalne pole dotyku (48×48 dp)**: Każdy klikalny element interfejsu (przyciski akcji, filtry, ikony zamykania, czyszczenia pola) musi mieć minimalny obszar trafienia **48×48 dp**. W przypadku mniejszych ikon stosujemy rozszerzenie pola dotyku:
  ```typescript
  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
  ```
* **Dostępność i Dobre Praktyki Frontendowe (`impeccable` & WCAG 2.2 AA)**:
  * **Zakaz jednostronnych pasków bocznych (`border-left` / `border-right`)**: Zamiast wąskich pasków bocznych stosujemy pełne, dyskretne tła (`colors.primarySubtle`), subtelne ramki oraz wiodące ikony semantyczne.
  * **Kontrast tekstu**: Minimalny kontrast tekstu głównego wynosi $\ge 7:1$, a tekstu pomocniczego $\ge 4.5:1$ względem ciemnych powierzchni (`#1E293B`).
  * **Atrybuty dostępności**: Wszystkie kontrolki posiadają `accessibilityRole` (np. `"button"`, `"search"`) oraz opisowe `accessibilityLabel`.

## 4. Komponenty React Native i Tokeny Stylów

* Wszystkie stałe wizualne (kolory, typografia, promienie zaokrągleń, paddingi) importujemy z centralnego modułu [`src/theme/tokens.ts`](../src/theme/tokens.ts).
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
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={touchTargets.activeOpacity}
      accessibilityRole="button"
      accessibilityLabel={`Dokument ${title}, kwota ${amount} ${currency}`}
    >
      {/* Ciało komponentu */}
    </TouchableOpacity>
  );
};
```

## 5. Standardy testowania (TDD & AAA)

* Logika biznesowa (parsery wyrażeń regularnych, kalkulatory terminów gwarancji, generator PDF, lokalny harmonogram alertów) oraz repozytoria bazy danych SQLite podlegają zautomatyzowanym testom jednostkowym i integracyjnym w środowisku **Vitest**.
* Każdy test jest podzielony na czytelne bloki **AAA (Arrange - Act - Assert)**:

```typescript
describe('HeuristicReceiptParser', () => {
  it('extracts total amount from SUMA PLN line', () => {
    // Arrange
    const lines = [
      'ACTION POLSKA SP. Z O.O.',
      'BATERIE AA 8SZT 14.99',
      'SUMA PLN 14,99',
    ];

    // Act
    const result = HeuristicReceiptParser.extractTotalAmount(lines);

    // Assert
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(14.99);
    expect(result?.currency).toBe('PLN');
  });
});
```

* Poprawki błędów w regułach parsowania zaczynamy od napisania testu odtwarzającego problem (faza **RED**), a następnie modyfikujemy wyrażenie regularne (faza **GREEN**).
