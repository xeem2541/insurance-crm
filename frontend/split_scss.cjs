const fs = require('fs');

const content = fs.readFileSync('src/index.scss', 'utf8');
const lines = content.split('\n');

lines.forEach((line, i) => {
  if (line.match(/^\s*\/\/\s*(.*)/)) {
    console.log(`${i+1}: ${line.trim()}`);
  }
});
