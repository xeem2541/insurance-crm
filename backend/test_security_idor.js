const http = require('http');

const testIDOR = async () => {
  console.log('Testing IDOR on /api/documents/file/1 ...');
  
  // Test 1: No Token
  const reqNoToken = http.get('http://localhost:5000/api/documents/file/1', (res) => {
    console.log(`[Test 1] Request WITHOUT token. Expected Status: 401, Actual: ${res.statusCode}`);
    if (res.statusCode === 401) {
      console.log('✅ Test 1 Passed: Unauthorized access is blocked.');
    } else {
      console.error('❌ Test 1 Failed: Endpoint is not protected.');
    }
  });
  
  reqNoToken.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });
  
  // Test 2: Invalid Token
  const reqInvalidToken = http.get('http://localhost:5000/api/documents/file/1?token=invalid.jwt.token', (res) => {
    console.log(`[Test 2] Request WITH invalid token. Expected Status: 403 (or 401), Actual: ${res.statusCode}`);
    if (res.statusCode === 403 || res.statusCode === 401) {
      console.log('✅ Test 2 Passed: Invalid token is rejected.');
    } else {
      console.error('❌ Test 2 Failed: Accepted invalid token.');
    }
  });

  reqInvalidToken.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });
};

testIDOR();
