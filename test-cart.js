import 'dotenv/config';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5001';

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = { raw: await res.text() };
  }

  return { status: res.status, ok: res.ok, data };
}

async function run() {
  try {
    const ts = Date.now();
    const email = `carttest${ts}@example.com`;
    const username = `carttest${ts}`;
    const password = 'Password123!';

    console.log('--- Register customer ---');
    const reg = await request('/api/auth/register', {
      method: 'POST',
      body: { username, email, password, role: 'customer' },
    });
    console.log(JSON.stringify(reg, null, 2));

    console.log('\n--- Login customer ---');
    const login = await request('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    console.log(JSON.stringify(login, null, 2));

    const token = login.data?.data?.token;
    if (!token) {
      console.log('No token from login, aborting');
      process.exit(1);
    }

    console.log('\n--- Fetch products ---');
    const prods = await request('/api/products', {
      method: 'GET',
      token,
    });
    console.log(
      JSON.stringify(
        {
          status: prods.status,
          ok: prods.ok,
          count: prods.data?.data?.products?.length ?? 0,
        },
        null,
        2,
      ),
    );

    const first = prods.data?.data?.products?.[0];
    if (!first) {
      console.log('No products returned; nothing to add to cart.');
      process.exit(0);
    }

    console.log('\nUsing product:', {
      id: first._id,
      name: first.name,
      seller: first.seller,
      status: first.status,
      quantity: first.quantity,
    });

    console.log('\n--- Add to cart ---');
    const add = await request('/api/cart/add', {
      method: 'POST',
      token,
      body: { productId: first._id, quantity: 1 },
    });
    console.log(JSON.stringify(add, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Test-cart error:', err);
    process.exit(1);
  }
}

run();

