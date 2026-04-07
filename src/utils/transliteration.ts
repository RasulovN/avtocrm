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
