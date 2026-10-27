import React from 'react';
import { View, ViewStyle } from 'react-native';
import Svg, { Path, Rect, Circle, G, Polygon } from 'react-native-svg';

export interface BrandLogoProps {
  size?: number;
  variant?: 'lock' | 'shield';
  showBackground?: boolean;
  style?: ViewStyle;
}

/**
 * BrandLogo - Oficjalny wektorowy logotyp DocuLocker.
 *
 * Zaprojektowany w oparciu o czyste ksztalty geometryczne, styl wektorowy (Figma/Illustrator),
 * solidne kolory (Electric Blue #007BFF / Deep Navy #0B1938 / Teal #00B4D8 / Crisp White #FFFFFF)
 * oraz subtelne cienie glebi wedlug wytycznych Material Design 3.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 48,
  variant = 'lock',
  showBackground = false,
  style,
}) => {
  const viewBoxSize = 100;

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} fill="none">
        {showBackground && (
          // Squircle Background (M3 / HIG 2025 standard)
          <Rect
            x="2"
            y="2"
            width="96"
            height="96"
            rx="22"
            fill="#0B1938"
            stroke="#1E3A5F"
            strokeWidth="1.5"
          />
        )}

        {variant === 'lock' ? (
          // OPTION 1: Minimalist Document + Bold Electric Blue Padlock Clasp
          <G id="doc-locker-option-1">
            {/* Cien dokumentu */}
            <Path
              d="M27 20 L61 20 L75 34 L75 78 L27 78 Z"
              fill="rgba(4, 12, 28, 0.35)"
              transform="translate(2, 2)"
            />

            {/* Cialo dokumentu (biale) */}
            <Path
              d="M27 20 H61 L75 34 V78 H27 Z"
              fill="#FFFFFF"
            />

            {/* Zagiecie rogu */}
            <Polygon
              points="61,20 75,34 61,34"
              fill="#CBD5E1"
            />
            <Path
              d="M61 20 V34 H75"
              stroke="#94A3B8"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />

            {/* Linie wektorowe tekstu na dokumencie */}
            <Rect x="33" y="30" width="22" height="3" rx="1.5" fill="#E2E8F0" />
            <Rect x="33" y="37" width="34" height="3" rx="1.5" fill="#E2E8F0" />
            <Rect x="33" y="44" width="28" height="3" rx="1.5" fill="#E2E8F0" />
            <Rect x="33" y="51" width="18" height="3" rx="1.5" fill="#E2E8F0" />

            {/* Cien klodki */}
            <Rect
              x="50"
              y="52"
              width="30"
              height="25"
              rx="4"
              fill="rgba(4, 12, 28, 0.4)"
              transform="translate(1.5, 1.5)"
            />

            {/* Palak klodki (Shackle) */}
            <Path
              d="M57 52 V44 C57 39.5 60.5 36 65 36 C69.5 36 73 39.5 73 44 V52"
              stroke="#0056B3"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Cialo klodki (Solid Electric Blue) */}
            <Rect
              x="50"
              y="52"
              width="30"
              height="25"
              rx="5"
              fill="#007BFF"
            />

            {/* Dziurka od klucza (Keyhole) */}
            <Circle cx="65" cy="62" r="2.5" fill="#0B1938" />
            <Path
              d="M63.8 62 H66.2 L67 69 H63 Z"
              fill="#0B1938"
            />
          </G>
        ) : (
          // OPTION 2: Geometric Protective Shield + Document Peek
          <G id="doc-locker-option-2">
            {/* Dokument wyziera zza tarczy */}
            <Path
              d="M32 20 H56 L68 32 V54 H32 Z"
              fill="#FFFFFF"
            />
            <Polygon
              points="56,20 68,32 56,32"
              fill="#CBD5E1"
            />
            <Rect x="38" y="28" width="14" height="2.5" rx="1.25" fill="#E2E8F0" />
            <Rect x="38" y="34" width="22" height="2.5" rx="1.25" fill="#E2E8F0" />

            {/* Zewnetrzna tarcza w odcieniu Vibrant Teal */}
            <Path
              d="M50 36 L72 44 V60 C72 72 50 82 50 82 C50 82 28 72 28 60 V44 Z"
              fill="#00B4D8"
              stroke="#0096B4"
              strokeWidth="1"
            />

            {/* Wewnetrzna warstwa tarczy w odcieniu Deep Cyan */}
            <Path
              d="M50 42 L66 48 V59 C66 68 50 76 50 76 C50 76 34 68 34 59 V48 Z"
              fill="#007791"
            />

            {/* Subtelny pionowy podzial fasetowy dla efektu 3D */}
            <Path
              d="M50 42 L66 48 V59 C66 68 50 76 50 76 V42 Z"
              fill="rgba(0, 0, 0, 0.15)"
            />

            {/* Dziurka od klucza w centrum tarczy */}
            <Circle cx="50" cy="56" r="3" fill="#0B1938" />
            <Path
              d="M48.5 56 H51.5 L52.5 65 H47.5 Z"
              fill="#0B1938"
            />
          </G>
        )}
      </Svg>
    </View>
  );
};
