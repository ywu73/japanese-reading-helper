const KANA = new Map(Object.entries({
  ア: "a", イ: "i", ウ: "u", エ: "e", オ: "o",
  カ: "ka", キ: "ki", ク: "ku", ケ: "ke", コ: "ko",
  ガ: "ga", ギ: "gi", グ: "gu", ゲ: "ge", ゴ: "go",
  サ: "sa", シ: "shi", ス: "su", セ: "se", ソ: "so",
  ザ: "za", ジ: "ji", ズ: "zu", ゼ: "ze", ゾ: "zo",
  タ: "ta", チ: "chi", ツ: "tsu", テ: "te", ト: "to",
  ダ: "da", ヂ: "ji", ヅ: "zu", デ: "de", ド: "do",
  ナ: "na", ニ: "ni", ヌ: "nu", ネ: "ne", ノ: "no",
  ハ: "ha", ヒ: "hi", フ: "fu", ヘ: "he", ホ: "ho",
  バ: "ba", ビ: "bi", ブ: "bu", ベ: "be", ボ: "bo",
  パ: "pa", ピ: "pi", プ: "pu", ペ: "pe", ポ: "po",
  マ: "ma", ミ: "mi", ム: "mu", メ: "me", モ: "mo",
  ヤ: "ya", ユ: "yu", ヨ: "yo",
  ラ: "ra", リ: "ri", ル: "ru", レ: "re", ロ: "ro",
  ワ: "wa", ヰ: "wi", ヱ: "we", ヲ: "o", ン: "n",
  ァ: "a", ィ: "i", ゥ: "u", ェ: "e", ォ: "o",
  ヵ: "ka", ヶ: "ke",
  キャ: "kya", キュ: "kyu", キョ: "kyo",
  ギャ: "gya", ギュ: "gyu", ギョ: "gyo",
  シャ: "sha", シュ: "shu", ショ: "sho", シェ: "she",
  ジャ: "ja", ジュ: "ju", ジョ: "jo", ジェ: "je",
  チャ: "cha", チュ: "chu", チョ: "cho", チェ: "che",
  ニャ: "nya", ニュ: "nyu", ニョ: "nyo",
  ヒャ: "hya", ヒュ: "hyu", ヒョ: "hyo",
  ビャ: "bya", ビュ: "byu", ビョ: "byo",
  ピャ: "pya", ピュ: "pyu", ピョ: "pyo",
  ミャ: "mya", ミュ: "myu", ミョ: "myo",
  リャ: "rya", リュ: "ryu", リョ: "ryo",
  イェ: "ye", ウィ: "wi", ウェ: "we", ウォ: "wo",
  クァ: "kwa", クィ: "kwi", クェ: "kwe", クォ: "kwo",
  グァ: "gwa", グィ: "gwi", グェ: "gwe", グォ: "gwo",
  スィ: "si", ズィ: "zi", ティ: "ti", トゥ: "tu",
  ディ: "di", ドゥ: "du", テュ: "tyu", デュ: "dyu",
  ツァ: "tsa", ツィ: "tsi", ツェ: "tse", ツォ: "tso",
  ファ: "fa", フィ: "fi", フェ: "fe", フォ: "fo", フュ: "fyu",
  ヴ: "vu", ヴァ: "va", ヴィ: "vi", ヴェ: "ve", ヴォ: "vo", ヴュ: "vyu",
}));

const MACRON = { a: "ā", i: "ī", u: "ū", e: "ē", o: "ō" };
const KANA_ONLY = /^[\u3041-\u3096\u309d\u309e\u30a1-\u30fa\u30fd\u30feー・\s]+$/u;

export function kanaToHepburn(reading, context = {}) {
  if (typeof reading !== "string" || reading.length === 0 || !KANA_ONLY.test(reading)) {
    return null;
  }

  const katakana = [...reading].map(toKatakana).join("");
  const pieces = [];
  let geminate = false;

  for (let index = 0; index < katakana.length; index += 1) {
    const character = katakana[index];
    if (/\s/u.test(character)) {
      pieces.push(character);
      continue;
    }
    if (character === "・") {
      pieces.push("-");
      continue;
    }
    if (character === "ッ") {
      geminate = true;
      continue;
    }
    if (character === "ー") {
      lengthenLastVowel(pieces);
      continue;
    }

    const pair = katakana.slice(index, index + 2);
    let piece = KANA.get(pair);
    if (piece != null) {
      index += 1;
    } else {
      piece = KANA.get(character);
    }
    if (piece == null) {
      return null;
    }

    if (pieces.at(-1) === "n" && /^[aeiouy]/u.test(piece)) {
      pieces.push("'");
    }
    if (geminate) {
      const prefix = piece.startsWith("ch") ? "t" : piece.match(/^[bcdfghjklmpqrstvwxyz]/u)?.[0];
      if (prefix) {
        pieces.push(prefix);
      }
      geminate = false;
    }
    pieces.push(piece);
  }

  if (geminate) {
    return null;
  }

  return applyLongVowels(pieces.join(""), context);
}

function toKatakana(character) {
  const code = character.codePointAt(0);
  if (code >= 0x3041 && code <= 0x3096) {
    return String.fromCodePoint(code + 0x60);
  }
  return character;
}

function lengthenLastVowel(pieces) {
  const value = pieces.join("");
  const match = value.match(/[aeiou](?!.*[aeiou])/u);
  if (!match) {
    return;
  }
  const vowel = match[0];
  for (let index = pieces.length - 1; index >= 0; index -= 1) {
    const position = pieces[index].lastIndexOf(vowel);
    if (position >= 0) {
      pieces[index] = `${pieces[index].slice(0, position)}${MACRON[vowel]}${pieces[index].slice(position + 1)}`;
      return;
    }
  }
}

function applyLongVowels(value, { surface = "", partOfSpeech = "" } = {}) {
  const protectVerbEnding = partOfSpeech === "動詞" && /う$/u.test(surface);
  let output = "";
  for (let index = 0; index < value.length; index += 1) {
    const current = value[index];
    const next = value[index + 1];
    const isProtectedOu = protectVerbEnding && current === "o" && next === "u" && index + 2 === value.length;

    if (!isProtectedOu && current === "o" && (next === "o" || next === "u")) {
      output += "ō";
      index += 1;
    } else if (current === next && "aue".includes(current)) {
      output += MACRON[current];
      index += 1;
    } else {
      output += current;
    }
  }
  return output;
}
