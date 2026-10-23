# Diagramy Systemowe

Wizualizacje architektury, przepływu danych oraz schematu bazy danych.

## 1. Architektura warstwowa

```mermaid
flowchart TD
    subgraph UI["Warstwa Prezentacji (Expo Router)"]
        A1["DashboardScreen"]
        A2["CameraScanScreen"]
        A3["ReviewOcrScreen"]
        A4["WarrantiesScreen"]
        A5["SearchScreen"]
    end

    subgraph State["Zarządzanie Stanem"]
        S1["useDocumentStore (Zustand)"]
        S2["useSettingsStore (Zustand)"]
    end

    subgraph Domain["Warstwa Domenowa"]
        D1["ScanReceiptUseCase"]
        D2["CalculateWarrantyUseCase"]
        D3["SearchDocumentsUseCase"]
        D4["HeuristicReceiptParser"]
    end

    subgraph Data["Warstwa Danych"]
        R1["DocumentRepository"]
        R2["WarrantyRepository"]
        R3["CategoryRepository"]
        DB[("Baza Danych: expo-sqlite\n+ FTS5")]
    end

    subgraph Services["Adaptery Sprzętowe"]
        M1["Google ML Kit Vision"]
        M2["CameraX Adapter"]
        M3["Expo Notifications"]
        M4["Expo Print & Share"]
        M5["Expo FileSystem"]
    end

    UI --> State
    State --> Domain
    Domain --> Data
    Domain --> Services
    Data --> DB
    Services --> M1
    Services --> M2
    Services --> M3
    Services --> M4
    Services --> M5
```

## 2. Sekwencja skanowania i przetwarzania OCR

```mermaid
sequenceDiagram
    autonumber
    actor U as Uzytkownik
    participant Cam as Kamera
    participant FS as FileSystem
    participant OCR as Google ML Kit
    participant Parser as HeuristicParser
    participant UI as Formularz Weryfikacji
    participant Repo as DocumentRepository
    participant Notif as NotificationScheduler

    U->>Cam: Wykonanie zdjecia paragonu
    Cam->>FS: Zapis tymczasowy w cache
    FS->>OCR: Przekazanie sciezki pliku
    Note over OCR: Lokalna ekstrakcja tekstu (ok. 300-400ms)
    OCR-->>Parser: Zestaw blokow i linii tekstu
    Parser->>Parser: Wykrycie kwoty, daty i nazwy sklepu
    Parser-->>UI: Wstepne uzupelnienie pol formularza
    UI-->>U: Prezentacja danych do potwierdzenia
    U->>UI: Ewentualna korekta i zapis
    UI->>FS: Przeniesienie zdjecia do katalogu docelowego
    UI->>Repo: Zapis rekordu i aktualizacja FTS5
    UI->>Notif: Zaplanowanie lokalnych alertow gwarancji
    UI-->>U: Potwierdzenie zapisu
```

## 3. Cykl życia gwarancji

```mermaid
stateDiagram-v2
    [*] --> ReturnWindowActive: Zarejestrowanie zakupu
    
    state ReturnWindowActive {
        [*] --> DaysRemaining: Odliczanie 14 dni na zwrot
        DaysRemaining --> ReturnExpired: Uplyw 14 dni
    }
    
    ReturnWindowActive --> WarrantyActive: Brak zwrotu towaru
    
    state WarrantyActive {
        [*] --> InWarranty: Ochrona ustawowa (np. 24 miesiace)
        InWarranty --> ExpiringSoon30Days: Zostalo 30 dni lub mniej
        ExpiringSoon30Days --> ExpiringSoon7Days: Zostalo 7 dni lub mniej
        ExpiringSoon7Days --> WarrantyExpired: Koniec terminu ochrony
    }
    
    InWarranty --> ClaimInProgress: Zgloszenie reklamacji
    ClaimInProgress --> InWarranty: Reklamacja uznana / Naprawa
    ClaimInProgress --> ReplacedWithNew: Wymiana towaru na nowy
    
    ReplacedWithNew --> ReturnWindowActive: Nowy bieg gwarancji
    WarrantyExpired --> [*]
```

## 4. Schemat relacji bazy danych (ERD)

```mermaid
erDiagram
    CATEGORIES ||--o{ DOCUMENTS : "zawiera"
    STORES ||--o{ DOCUMENTS : "wystawil"
    DOCUMENTS ||--|| WARRANTIES : "posiada"
    DOCUMENTS ||--o{ DOCUMENT_ATTACHMENTS : "posiada"
    DOCUMENTS ||--o{ DOCUMENT_TAGS : "posiada"
    TAGS ||--o{ DOCUMENT_TAGS : "przypisany do"

    CATEGORIES {
        INTEGER id PK
        TEXT name
        TEXT icon
        TEXT color_hex
        INTEGER is_system
    }

    STORES {
        INTEGER id PK
        TEXT name
        TEXT tax_id
        INTEGER default_return_days
    }

    DOCUMENTS {
        TEXT id PK
        TEXT title
        INTEGER store_id FK
        INTEGER category_id FK
        REAL total_amount
        TEXT currency
        TEXT purchase_date
        TEXT document_type
        TEXT notes
        TEXT raw_ocr_text
        INTEGER is_favorite
        TEXT created_at
        TEXT updated_at
    }

    WARRANTIES {
        INTEGER id PK
        TEXT document_id FK
        INTEGER duration_months
        TEXT end_date
        INTEGER return_window_days
        TEXT return_deadline
        TEXT status
        INTEGER notification_30d_scheduled
        INTEGER notification_7d_scheduled
    }

    DOCUMENT_ATTACHMENTS {
        TEXT id PK
        TEXT document_id FK
        TEXT file_path
        TEXT file_type
        INTEGER file_size_bytes
        INTEGER is_primary
        TEXT created_at
    }

    TAGS {
        INTEGER id PK
        TEXT name
    }

    DOCUMENT_TAGS {
        TEXT document_id FK
        INTEGER tag_id FK
    }
```
