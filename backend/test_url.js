const axios = require('axios');

async function testAllSearches() {
  try {
    const base = 'https://insurance-crm-backend-omega.vercel.app/api';
    const login = await axios.post(base + '/auth/login', { username: 'fong', password: '123456' });
    const token = login.data.token;
    const headers = { Authorization: 'Bearer ' + token };

    const motorQueries = ['Toyota', 'Honda', 'วิริยะ', 'กรุงเทพ', 'สมชาย', '123', 'กข'];
    console.log('Testing Live Motor Policies Searches:');
    for (const q of motorQueries) {
      const res = await axios.get(base + '/policies?search=' + encodeURIComponent(q), { headers });
      console.log(`  🔍 "${q}" -> พบ ${res.data.total} รายการ (ส่งมา ${res.data.data?.length} รายการในหน้าแรก)`);
    }

    const nmQueries = ['PA', 'อัคคีภัย', 'วิริยะ', 'สมชาย', ''];
    console.log('\nTesting Live Non-Motor Policies Searches:');
    for (const q of nmQueries) {
      const res = await axios.get(base + '/non-motor-policies?search=' + encodeURIComponent(q), { headers });
      console.log(`  🔍 "${q || '(ทั้งหมด)'}" -> พบ ${res.data.total} รายการ`);
    }

    const custQueries = ['สมชาย', '08', 'CUST'];
    console.log('\nTesting Live Customers Searches:');
    for (const q of custQueries) {
      const res = await axios.get(base + '/customers?search=' + encodeURIComponent(q), { headers });
      console.log(`  🔍 "${q}" -> พบ ${res.data.total} รายการ`);
    }
  } catch (err) {
    console.error('Test error:', err.response?.data || err.message);
  }
}

testAllSearches();
