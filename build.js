// Inlines shaper.js into index.html so the page works as a single file. Run: node build.js
const fs = require('fs');
const js = fs.readFileSync(__dirname + '/shaper.js', 'utf8').replace(/\r\n/g, '\n').trim()
  .replace(/<\/script/gi, '<\\/script');
const file = __dirname + '/index.html';
const html = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const re = /(\/\* SHAPER:BEGIN \*\/\n)[\s\S]*?(\/\* SHAPER:END \*\/)/;
if (!re.test(html)) throw new Error('markers not found in index.html');
fs.writeFileSync(file, html.replace(re, (_, a, b) => a + js + '\n' + b));
console.log('index.html updated');
