const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(JSON.stringify(body));
}

function normalizePhone(value) {
  return String(value || '').trim().replace(/[^\d+]/g, '');
}

function phoneDigits(value) {
  return normalizePhone(value).replace(/\D/g, '');
}

function authEmailFromPhone(phone) {
  return `taobaoespana.${phoneDigits(phone)}@gmail.com`;
}

function authPasswordFromPin(pin) {
  return String(pin || '') + '#EspanaLife2026';
}

async function supabaseFetch(path, options = {}) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'method_not_allowed', message: '只支持 POST 请求' });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return json(res, 500, {
      error: 'missing_service_role',
      message: '后台注册服务还没有配置 SUPABASE_SERVICE_ROLE_KEY'
    });
  }

  let body = req.body || {};
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const { nickname, city = '巴塞罗那' } = body;
  const phone = normalizePhone(body.phone);
  const digits = phoneDigits(phone);
  const pin = String(body.password || '').trim();

  if (!String(nickname || '').trim() || !phone || !pin) {
    return json(res, 400, { error: 'missing_fields', message: '请填写昵称、手机号和密码' });
  }
  if (digits.length < 6) {
    return json(res, 400, { error: 'invalid_phone', message: '请填写正确的手机号' });
  }
  if (!/^\d{4}$/.test(pin)) {
    return json(res, 400, { error: 'invalid_pin', message: '密码请设置为4位数字' });
  }

  const email = authEmailFromPhone(phone);
  const password = authPasswordFromPin(pin);
  const metadata = {
    nickname: String(nickname).trim(),
    city,
    phone,
    account_type: 'phone'
  };

  const createResponse = await supabaseFetch('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata
    })
  });

  const createText = await createResponse.text();
  let created;
  try {
    created = createText ? JSON.parse(createText) : null;
  } catch {
    created = { message: createText };
  }

  if (!createResponse.ok) {
    const message = created?.msg || created?.message || '注册失败';
    if (/already|registered|exists/i.test(message)) {
      return json(res, 409, { error: 'phone_exists', message: '这个手机号已经注册，请直接登录或联系客服重置密码。' });
    }
    return json(res, createResponse.status, { error: 'create_user_failed', message });
  }

  const userId = created?.id;
  if (userId) {
    await supabaseFetch('/rest/v1/profiles?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        id: userId,
        nickname: metadata.nickname,
        city: metadata.city,
        phone: metadata.phone,
        updated_at: new Date().toISOString()
      })
    }).catch(() => null);
  }

  return json(res, 200, { email, phone, userId });
};
