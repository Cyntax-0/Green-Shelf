import 'dotenv/config';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5001';

async function postJson(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = { parseError: true, text: await res.text() };
  }
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  const ts = Date.now();
  const email = `apitest${ts}@example.com`;
  const username = `apitest${ts}`;
  const password = 'Password123!';

  console.log('--- Register ---');
  const reg = await postJson('/api/auth/register', {
    username,
    email,
    password,
    role: 'customer'
  });
  console.log({ status: reg.status, ok: reg.ok, body: reg.data });

  console.log('\n--- Login ---');
  const login = await postJson('/api/auth/login', { email, password });
  console.log({ status: login.status, ok: login.ok, body: login.data });

  if (login.ok && login.data?.data?.token) {
    console.log('\n✅ Auth flow OK');
    process.exit(0);
  } else {
    console.log('\n⚠️ Auth flow incomplete');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
