const MULTI_CHAR_MAP: Array<[string, string]> = [
  ['O‘', 'Ў'],
  ['o‘', 'ў'],
  ['G‘', 'Ғ'],
  ['g‘', 'ғ'],
  ["O'", 'Ў'],
  ["o'", 'ў'],
  ["G'", 'Ғ'],
  ["g'", 'ғ'],
  ['Sh', 'Ш'],
  ['sh', 'ш'],
  ['Ch', 'Ч'],
  ['ch', 'ч'],
  ['Yo', 'Ё'],
  ['yo', 'ё'],
  ['Yu', 'Ю'],
  ['yu', 'ю'],
  ['Ya', 'Я'],
  ['ya', 'я'],
  ['Ts', 'Ц'],
  ['ts', 'ц'],
];

const SINGLE_CHAR_MAP: Record<string, string> = {
  A: 'А',
  a: 'а',
  B: 'Б',
  b: 'б',
  D: 'Д',
  d: 'д',
  E: 'Е',
  e: 'е',
  F: 'Ф',
  f: 'ф',
  G: 'Г',
  g: 'г',
  H: 'Ҳ',
  h: 'ҳ',
  I: 'И',
  i: 'и',
  J: 'Ж',
  j: 'ж',
  K: 'К',
  k: 'к',
  L: 'Л',
  l: 'л',
  M: 'М',
  m: 'м',
  N: 'Н',
  n: 'н',
  O: 'О',
  o: 'о',
  P: 'П',
  p: 'п',
  Q: 'Қ',
  q: 'қ',
  R: 'Р',
  r: 'р',
  S: 'С',
  s: 'с',
  T: 'Т',
  t: 'т',
  U: 'У',
  u: 'у',
  V: 'В',
  v: 'в',
  X: 'Х',
  x: 'х',
  Y: 'Й',
  y: 'й',
  Z: 'З',
  z: 'з',
};

export function latinToCyrillic(text: string): string {
  let result = text;

  for (const [latin, cyrillic] of MULTI_CHAR_MAP) {
    result = result.split(latin).join(cyrillic);
  }

  return Array.from(result)
    .map((char) => SINGLE_CHAR_MAP[char] ?? char)
    .join('');
}

// Kirill → lotin: avval ko'p belgili birikmalar (Ш→Sh, Ё→Yo, ...), keyin yakka harflar
const CYRL_MULTI_MAP: Array<[string, string]> = [
  ['Ў', 'O‘'],
  ['ў', 'o‘'],
  ['Ғ', 'G‘'],
  ['ғ', 'g‘'],
  ['Ш', 'Sh'],
  ['ш', 'sh'],
  ['Ч', 'Ch'],
  ['ч', 'ch'],
  ['Ё', 'Yo'],
  ['ё', 'yo'],
  ['Ю', 'Yu'],
  ['ю', 'yu'],
  ['Я', 'Ya'],
  ['я', 'ya'],
  ['Ц', 'Ts'],
  ['ц', 'ts'],
];

const CYRL_SINGLE_MAP: Record<string, string> = {
  А: 'A', а: 'a',
  Б: 'B', б: 'b',
  Д: 'D', д: 'd',
  Е: 'E', е: 'e',
  Э: 'E', э: 'e',
  Ф: 'F', ф: 'f',
  Г: 'G', г: 'g',
  Ҳ: 'H', ҳ: 'h',
  И: 'I', и: 'i',
  Ж: 'J', ж: 'j',
  К: 'K', к: 'k',
  Л: 'L', л: 'l',
  М: 'M', м: 'm',
  Н: 'N', н: 'n',
  О: 'O', о: 'o',
  П: 'P', п: 'p',
  Қ: 'Q', қ: 'q',
  Р: 'R', р: 'r',
  С: 'S', с: 's',
  Т: 'T', т: 't',
  У: 'U', у: 'u',
  В: 'V', в: 'v',
  Х: 'X', х: 'x',
  Й: 'Y', й: 'y',
  З: 'Z', з: 'z',
  Ъ: 'ʼ', ъ: 'ʼ',
  Ь: '', ь: '',
};

export function cyrillicToLatin(text: string): string {
  let result = text;

  for (const [cyrillic, latin] of CYRL_MULTI_MAP) {
    result = result.split(cyrillic).join(latin);
  }

  return Array.from(result)
    .map((char) => (char in CYRL_SINGLE_MAP ? CYRL_SINGLE_MAP[char] : char))
    .join('');
}
