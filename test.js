// Run: node test.js
const assert = require('assert');
const fs = require('fs');
const H = require('./shaper.js');

let passed = 0;
function t(name, actual, expected) {
  assert.strictEqual(actual, expected, `${name}\n  got:      ${JSON.stringify(actual)}\n  expected: ${JSON.stringify(expected)}`);
  passed++;
  console.log('ok  -', name);
}

// «سلام دنیا» : س + لا(final ligature) + م(isolated) ، د(isolated) ن(initial) ی(medial) ا(final) — then reversed
t('سلام دنیا (shape)', H.shape('سلام دنیا'), 'ﺳﻼﻡ ﺩﻧﻴﺎ');
t('سلام دنیا (full)', H.process('سلام دنیا'), 'ﺎﻴﻧﺩ ﻡﻼﺳ');

// «لا»
t('لا', H.process('لا'), 'ﻻ');
t('لا after joining letter', H.shape('بلا'), 'ﺑﻼ');

// numbers and English keep their order; word order flips
t('پیام 123 ABC', H.process('پیام 123 ABC'), 'ABC 123 ﻡﺎﻴﭘ');
t('Latin before number stays', H.process('ABC 123'), 'ABC 123');
t('decimal number', H.process('عدد 3.14'), '3.14 ﺩﺪﻋ');

// parentheses are mirrored
t('(تست)', H.process('(تست)'), '(ﺖﺴﺗ)');
t('parens inside Latin run untouched', H.process('a (b) c'), 'a (b) c');

// half-space (ZWNJ) breaks joining and disappears
t('نیم‌فاصله shape', H.shape('می‌خ'), 'ﻣﯽﺥ');
t('no ZWNJ in output', H.process('می‌خواهم').includes('‌'), false);

// Persian letters
t('پ چ گ ک ژ ی', H.shape('پپ چچ گگ کک ژ ی'), 'ﭘﭗ ﭼﭻ ﮔﮓ ﻛﮏ ﮊ ﯼ');
t('ژ non-joining to next', H.shape('کژک'), 'ﻛﮋﮎ');
t('ZWJ forces join', H.shape('ب‍'), 'ﺑ');

// diacritics
t('keep diacritics', H.shape('سَلام'), 'ﺳَﻼﻡ');
t('strip diacritics', H.shape('سَلام', { stripDiacritics: true }), 'ﺳﻼﻡ');
t('diacritic stays after its base when reordered', H.reorder('ﺳَﻡ'), 'ﻡﺳَ');

// line wrapping keeps top-to-bottom order
t('wrap logical', JSON.stringify(H.wrap('aaa bbb ccc', 7)), JSON.stringify(['aaa bbb', 'ccc']));
t('wrap hard split', JSON.stringify(H.wrap('abcdefghij', 4)), JSON.stringify(['abcd', 'efgh', 'ij']));
t('wrap keeps newlines', JSON.stringify(H.wrap('a\nb', 10)), JSON.stringify(['a', 'b']));
{
  const lines = H.processLines('سلام دنیا من', { maxLength: 9 });
  t('wrapped line 1', lines[0], H.process('سلام دنیا'));
  t('wrapped line 2', lines[1], H.process('من'));
}

// index.html embeds the current shaper.js
{
  const norm = (f) => fs.readFileSync(__dirname + '/' + f, 'utf8').split('\r\n').join('\n');
  t('index.html is in sync (run node build.js)', norm('index.html').includes(norm('shaper.js').trim()), true);
}

console.log(`\n${passed} tests passed`);
