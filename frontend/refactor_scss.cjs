const fs = require('fs');
const path = require('path');

const srcPath = 'src/index.scss';
const stylesDir = 'src/styles';

if (!fs.existsSync(stylesDir)) {
  fs.mkdirSync(stylesDir);
}

const content = fs.readFileSync(srcPath, 'utf8');
const lines = content.split('\n');

const parts = [
  { name: '_base.scss', start: 0, end: 193 },
  { name: '_sidebar.scss', start: 193, end: 357 },
  { name: '_components.scss', start: 357, end: 823 },
  { name: '_login.scss', start: 823, end: 1552 },
  { name: '_mobile.scss', start: 1552, end: lines.length }
];

let imports = '';

parts.forEach(part => {
  const partLines = lines.slice(part.start, part.end);
  fs.writeFileSync(path.join(stylesDir, part.name), partLines.join('\n'));
  imports += `@import './styles/${part.name.replace('.scss', '').replace('_', '')}';\n`;
});

fs.writeFileSync(srcPath, imports);
console.log('Successfully refactored SCSS!');
