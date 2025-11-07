require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';

async function testLogin() {
  const testAccounts = [
    { email: 'alice@demo.com', password: 'demo123' },
    { email: 'bob@demo.com', password: 'demo123' },
    { email: 'admin@demo.com', password: 'admin123' },
  ];

  for (const account of testAccounts) {
    try {
      console.log(`\nTesting login for ${account.email}...`);
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: account.email,
        password: account.password,
      });
      console.log(`✅ Success! Token: ${response.data.token.substring(0, 20)}...`);
      console.log(`   User: ${response.data.user.username} (${response.data.user.email})`);
    } catch (error) {
      console.log(`❌ Failed!`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Error: ${error.response.data.error || error.response.data.message}`);
      } else if (error.request) {
        console.log(`   No response received. Is the server running?`);
        console.log(`   URL: ${API_URL}/auth/login`);
      } else {
        console.log(`   Error: ${error.message}`);
      }
    }
  }
}

testLogin().catch(console.error);



