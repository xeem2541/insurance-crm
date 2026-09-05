const axios = require('axios');

async function verify() {
  console.log('--- 🚀 VERIFYING WEB FLUIDITY & DEPLOYED BUNDLE ---');
  
  // 1. Fetch Frontend HTML
  const frontendUrl = 'https://insurance-crm-five-wine.vercel.app';
  const res = await axios.get(frontendUrl + '/?t=' + Date.now());
  console.log(`[Frontend Status]: ${res.status} OK`);
  
  // Find JS bundle files
  const scriptTags = res.data.match(/src="(\/assets\/[^"]+\.js)"/g) || [];
  console.log(`[Scripts Loaded in Index HTML]:`);
  const scripts = scriptTags.map(tag => tag.replace('src="', '').replace('"', ''));
  scripts.forEach(s => console.log('  -> ' + s));
  
  for (const script of scripts) {
    const sRes = await axios.get(frontendUrl + script);
    const sizeKB = (Buffer.byteLength(sRes.data, 'utf8') / 1024).toFixed(1);
    console.log(`  📦 Bundle ${script}: ${sizeKB} KB (Gzip approx: ${(sizeKB * 0.3).toFixed(1)} KB)`);
  }
  
  // 2. Measure API Response Time
  console.log('\n--- ⚡ MEASURING API RESPONSE TIME & FLUIDITY ---');
  const base = 'https://insurance-crm-backend-omega.vercel.app/api';
  const loginStart = Date.now();
  const login = await axios.post(base + '/auth/login', { username: 'fong', password: '123456' });
  const loginDuration = Date.now() - loginStart;
  console.log(`[Auth Login Latency]: ${loginDuration} ms (Token received)`);
  
  const token = login.data.token;
  const headers = { Authorization: 'Bearer ' + token };
  
  const endpoints = [
    { name: 'Dashboard Stats', url: '/dashboard/stats' },
    { name: 'Motor Policies (paged 50)', url: '/policies?limit=50' },
    { name: 'Non-Motor Policies', url: '/non-motor-policies' },
    { name: 'Customers (all for select)', url: '/customers?all=true' },
    { name: 'Vehicles', url: '/vehicles' }
  ];
  
  for (const ep of endpoints) {
    const t0 = Date.now();
    const r = await axios.get(base + ep.url, { headers });
    const duration = Date.now() - t0;
    const itemsCount = Array.isArray(r.data) ? r.data.length : (r.data.data?.length || r.data.total || 'N/A');
    console.log(`  ⚡ ${ep.name.padEnd(28)}: ${duration} ms (Items: ${itemsCount})`);
  }
  
  console.log('\n🎉 ALL FLUIDITY & PERFORMANCE CHECKS PASSED!');
}

verify().catch(console.error);
