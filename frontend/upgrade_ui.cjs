const fs = require('fs');
const path = require('path');

const filesToProcess = [
  'src/pages/Payments.jsx',
  'src/pages/LineAdmin.jsx',
  'src/pages/Documents.jsx',
  'src/pages/Reports.jsx',
  'src/pages/ActivityLogs.jsx',
  'src/pages/MasterData.jsx'
];

filesToProcess.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');

  // 1. Cards
  content = content.replace(/className="card shadow-sm border-0([^"]*)"/g, 'className="card premium-card border-0 shadow-sm$1"');
  content = content.replace(/className="card border-0 shadow-sm([^"]*)"/g, 'className="card premium-card border-0 shadow-sm$1"');
  content = content.replace(/className="card shadow-sm([^"]*)"/g, 'className="card premium-card border-0 shadow-sm$1"');
  
  // 2. Table Containers
  content = content.replace(/table-container-enterprise/g, 'table-container-premium');
  
  // 3. Tables
  content = content.replace(/table-enterprise/g, 'custom-table table-hover');
  content = content.replace(/<table className="table align-middle/g, '<table className="table custom-table table-hover align-middle');
  content = content.replace(/<table className="table table-hover align-middle/g, '<table className="table custom-table table-hover align-middle');

  // 4. Inputs
  content = content.replace(/<Form\.Control([\s\S]*?)>/g, (match) => {
    if (match.includes('className=')) {
      return match.replace(/className="([^"]*)"/, 'className="$1 premium-input"');
    }
    return match.replace('<Form.Control', '<Form.Control className="premium-input"');
  });
  
  content = content.replace(/<Form\.Select([\s\S]*?)>/g, (match) => {
    if (match.includes('className=')) {
      return match.replace(/className="([^"]*)"/, 'className="$1 premium-input"');
    }
    return match.replace('<Form.Select', '<Form.Select className="premium-input"');
  });

  // 5. Headings (H2/H4)
  content = content.replace(/<h2 className="fw-bold">/g, '<h2 className="fw-bold text-navy">');
  content = content.replace(/<h4 className="fw-bold mb-4">/g, '<h4 className="fw-bold mb-4 text-navy">');
  content = content.replace(/<h5 className="fw-bold/g, '<h5 className="fw-bold text-navy');
  content = content.replace(/text-primary/g, 'text-navy'); // General text-primary replace for text-navy if needed (will do cautiously)
  
  // Let's refine text-primary replace: only on fw-bold class names where it makes sense
  content = content.replace(/className="fw-bold text-primary"/g, 'className="fw-bold text-navy"');

  // 6. Pagination alignment (already done in some via css, just checking wrapper)
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Updated: ${file}`);
});
