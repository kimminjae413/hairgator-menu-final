const fs = require('fs');
const path = require('path');
const https = require('https');

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const SUPABASE_URL = envVars.SUPABASE_URL;
const SUPABASE_KEY = envVars.SUPABASE_SERVICE_KEY;

const url = new URL(`${SUPABASE_URL}/rest/v1/recipe_samples`);
url.searchParams.set('select', 'count');
url.searchParams.set('summary_embedding', 'not.is.null');

const options = {
  method: 'GET',
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Prefer': 'count=exact'
  }
};

const req = https.request(url, options, (res) => {
  let count = res.headers['content-range'];
  console.log(`✅ summary_embedding이 있는 레시피: ${count ? count.split('/')[1] : 0}개 / 2178개`);
});

req.on('error', console.error);
req.end();
