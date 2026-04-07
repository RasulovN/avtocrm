declare module "uzbek-transliterator" {
  export function latinToCyrillic(input: string): string;
  export function latinToCyrillic(input: string[]): string[];
  export function latinToCyrillic<T extends Record<string, unknown>>(input: T): T;

  export function cyrillicToLatin(input: string): string;
  export function cyrillicToLatin(input: string[]): string[];
  export function cyrillicToLatin<T extends Record<string, unknown>>(input: T): T;

  export function transliterate(input: string): string;
  export function transliterate(input: string[]): string[];
  export function transliterate<T extends Record<string, unknown>>(input: T): T;
}
