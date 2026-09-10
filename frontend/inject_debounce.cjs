const fs = require('fs');

const path = 'src/pages/IssuePolicyMotorForm.jsx';
let content = fs.readFileSync(path, 'utf8');

// Add import
if (!content.includes('import DebouncedInput')) {
  content = content.replace(
    "import { Row, Col, Form, Button, Badge, Accordion, OverlayTrigger, Tooltip, Modal, Spinner } from 'react-bootstrap';",
    "import { Row, Col, Form, Button, Badge, Accordion, OverlayTrigger, Tooltip, Modal, Spinner } from 'react-bootstrap';\nimport DebouncedInput from '../components/DebouncedInput';"
  );
}

// Replace Form.Control type="text"
content = content.replace(/<Form\.Control\s+type="text"/g, '<DebouncedInput type="text"');
content = content.replace(/<Form\.Control\s+type="number"/g, '<DebouncedInput type="number"');
content = content.replace(/<Form\.Control\s+as="textarea"/g, '<DebouncedInput as="textarea"');

// Special cases where the ending tags might be </Form.Control> but DebouncedInput wraps it.
// Actually DebouncedInput self closes usually, but textarea might be <Form.Control as="textarea" />
content = content.replace(/<\/Form\.Control>/g, '</DebouncedInput>');

fs.writeFileSync(path, content);
console.log('Replaced Form.Control with DebouncedInput in Motor Form');
