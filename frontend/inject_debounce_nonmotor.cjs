const fs = require('fs');

const path = 'src/pages/IssuePolicyNonMotorForm.jsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('import DebouncedInput')) {
  // Find a good place to inject the import
  content = content.replace(
    /import {.*?Form.*?react-bootstrap';/,
    match => match + '\nimport DebouncedInput from \'../components/DebouncedInput\';'
  );
}

content = content.replace(/<Form\.Control\s+type="text"/g, '<DebouncedInput type="text"');
content = content.replace(/<Form\.Control\s+type="number"/g, '<DebouncedInput type="number"');
content = content.replace(/<Form\.Control\s+as="textarea"/g, '<DebouncedInput as="textarea"');
content = content.replace(/<\/Form\.Control>/g, '</DebouncedInput>');

fs.writeFileSync(path, content);
console.log('Done for Non-Motor Form');
