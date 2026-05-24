const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://jfhpsxfnbpsvvtqsdvco.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Co4jbBX8M1I_fJCgoceoDA_PUTyhNta';
const { requireAdminByMetadata } = require('./_admin-auth');
const ADMIN_APK_BUCKET = 'admin-private';
const APK_FILE_NAME = 'xibanyalife-admin-private-1.0.0.apk';

function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).send(JSON.stringify(body));
}

async function serviceFetch(pathname, options = {}) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(`${SUPABASE_URL}${pathname}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
}

async function fetchStorageApk() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(`${SUPABASE_URL}/storage/v1/object/${ADMIN_APK_BUCKET}/${APK_FILE_NAME}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`
    }
  });
}

async function requireAdmin(req) {
  return requireAdminByMetadata(req, { section: 'payment' });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'method_not_allowed', message: '只支持 GET 请求' });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { error: 'missing_service_role', message: '后台服务缺少 SUPABASE_SERVICE_ROLE_KEY' });
  }

  const admin = await requireAdmin(req);
  if (admin.error) return json(res, admin.status, { error: admin.error, message: '没有后台 APK 下载权限' });

  const apkPath = path.join(process.cwd(), 'downloads', APK_FILE_NAME);
  await serviceFetch('/rest/v1/admin_logs', {
    method: 'POST',
    body: JSON.stringify([{
      admin_id: admin.user.id,
      action: 'download_admin_apk',
      target_type: 'admin_apk',
      target_id: APK_FILE_NAME
    }])
  }).catch(() => null);

  if (fs.existsSync(apkPath)) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${APK_FILE_NAME}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    return fs.createReadStream(apkPath).pipe(res);
  }

  const storageResponse = await fetchStorageApk();
  if (!storageResponse.ok) {
    return json(res, 404, { error: 'apk_not_found', message: '后台 APK 文件尚未上传到服务器' });
  }
  const buffer = Buffer.from(await storageResponse.arrayBuffer());
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', `attachment; filename="${APK_FILE_NAME}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Length', String(buffer.length));
  return res.status(200).send(buffer);
};
