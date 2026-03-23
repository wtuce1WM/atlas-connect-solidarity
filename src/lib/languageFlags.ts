/** Language flag emoji and alt-text mappings — shared across panels */

const LANG_FLAGS: Record<string, string> = {
  français: "🇫🇷", french: "🇫🇷", fr: "🇫🇷",
  anglais: "🇬🇧", english: "🇬🇧", en: "🇬🇧",
  arabe: "🇲🇦", arabic: "🇲🇦", ar: "🇲🇦", "ar-std": "🇲🇦",
  espagnol: "🇪🇸", spanish: "🇪🇸", es: "🇪🇸",
  allemand: "🇩🇪", german: "🇩🇪", de: "🇩🇪",
  italien: "🇮🇹", italian: "🇮🇹", it: "🇮🇹",
  portugais: "🇵🇹", portuguese: "🇵🇹", pt: "🇵🇹",
  néerlandais: "🇳🇱", dutch: "🇳🇱", nl: "🇳🇱",
  russe: "🇷🇺", russian: "🇷🇺", ru: "🇷🇺",
  chinois: "🇨🇳", chinese: "🇨🇳", zh: "🇨🇳",
  japonais: "🇯🇵", japanese: "🇯🇵", ja: "🇯🇵",
  amazigh: "ⵣ", berbère: "ⵣ", tamazight: "ⵣ",
};

const LANG_ALT: Record<string, string> = {
  français: "Nous parlons français", french: "Nous parlons français", fr: "Nous parlons français",
  anglais: "We speak English", english: "We speak English", en: "We speak English",
  arabe: "نتحدث العربية", arabic: "نتحدث العربية", ar: "نتحدث العربية", "ar-std": "نتحدث العربية",
  espagnol: "Hablamos español", spanish: "Hablamos español", es: "Hablamos español",
  allemand: "Wir sprechen Deutsch", german: "Wir sprechen Deutsch", de: "Wir sprechen Deutsch",
  italien: "Parliamo italiano", italian: "Parliamo italiano", it: "Parliamo italiano",
  portugais: "Falamos português", portuguese: "Falamos português", pt: "Falamos português",
  néerlandais: "Wij spreken Nederlands", dutch: "Wij spreken Nederlands", nl: "Wij spreken Nederlands",
  russe: "Мы говорим по-русски", russian: "Мы говорим по-русски", ru: "Мы говорим по-русски",
  chinois: "我们说中文", chinese: "我们说中文", zh: "我们说中文",
  japonais: "日本語を話します", japanese: "日本語を話します", ja: "日本語を話します",
  amazigh: "ⵏⵙⴰⵡⴰⵍ ⵜⴰⵎⴰⵣⵉⵖⵜ", berbère: "ⵏⵙⴰⵡⴰⵍ ⵜⴰⵎⴰⵣⵉⵖⵜ", tamazight: "ⵏⵙⴰⵡⴰⵍ ⵜⴰⵎⴰⵣⵉⵖⵜ",
};

export const getLangFlag = (lang: string): string => {
  const key = lang.toLowerCase().trim();
  return LANG_FLAGS[key] || "🌐";
};

export const getLangAlt = (lang: string): string => {
  const key = lang.toLowerCase().trim();
  return LANG_ALT[key] || lang;
};
