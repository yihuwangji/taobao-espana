(function () {
  const STORAGE_KEY = 'espana_cookie_consent_v1';
  const VERSION = 1;
  const DEFAULTS = {
    necessary: true,
    preferences: false,
    analytics: false,
    marketing: false
  };

  const copy = {
    zh: {
      title: 'Cookie 与隐私选择',
      text: '我们使用必要的 Cookie、本地存储和缓存来支持登录、发布、语言、草稿、安全和 App 功能。统计分析、营销推广等非必要用途只会在您同意后启用。',
      settingsTitle: '管理 Cookie 选择',
      settingsText: '您可以随时修改选择。必要技术始终开启，用于提供您请求的网站服务。',
      acceptAll: '全部接受',
      reject: '仅必要',
      customize: '自定义',
      save: '保存选择',
      close: '关闭',
      manage: 'Cookie 设置',
      policy: 'Cookie 政策',
      privacy: '隐私政策',
      categories: {
        necessary: ['必要技术', '登录、发布、账号安全、防刷、网页缓存和服务正常运行所必需。'],
        preferences: ['功能偏好', '保存语言、草稿、收藏、城市提示、显示偏好等更方便使用的设置。'],
        analytics: ['统计分析', '帮助我们了解页面访问和功能使用情况，用于改进网站。目前未启用第三方分析。'],
        marketing: ['营销推广', '用于广告、推广效果或跨站追踪。目前未启用。']
      }
    },
    es: {
      title: 'Preferencias de cookies',
      text: 'Usamos cookies técnicas, almacenamiento local y caché necesarios para iniciar sesión, publicar, idioma, borradores, seguridad y funcionamiento de la app. Analítica o marketing solo se activarán con tu consentimiento.',
      settingsTitle: 'Gestionar cookies',
      settingsText: 'Puedes cambiar tu elección en cualquier momento. Las cookies técnicas necesarias permanecen activas para prestar el servicio solicitado.',
      acceptAll: 'Aceptar todo',
      reject: 'Solo necesarias',
      customize: 'Personalizar',
      save: 'Guardar',
      close: 'Cerrar',
      manage: 'Cookies',
      policy: 'Política de cookies',
      privacy: 'Privacidad',
      categories: {
        necessary: ['Técnicas necesarias', 'Inicio de sesión, publicación, seguridad, prevención de abuso, caché y funcionamiento básico del servicio.'],
        preferences: ['Preferencias', 'Guardar idioma, borradores, favoritos, ciudad sugerida y ajustes de visualización.'],
        analytics: ['Analítica', 'Medir visitas y uso de funciones para mejorar el sitio. Actualmente no usamos analítica de terceros.'],
        marketing: ['Marketing', 'Publicidad, medición de campañas o seguimiento entre sitios. Actualmente no está activado.']
      }
    }
  };

  function lang() {
    const q = new URLSearchParams(location.search).get('lang') || '';
    const stored = localStorage.getItem('site_lang') || '';
    const html = document.documentElement.lang || '';
    return `${q} ${stored} ${html} ${navigator.language || ''}`.toLowerCase().includes('es') ? 'es' : 'zh';
  }

  function readConsent() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || saved.version !== VERSION || !saved.choices) return null;
      return saved;
    } catch (error) {
      return null;
    }
  }

  function writeConsent(choices) {
    const normalized = Object.assign({}, DEFAULTS, choices, { necessary: true });
    const record = {
      version: VERSION,
      choices: normalized,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    window.ESPANA_COOKIE_CONSENT = record;
    window.dispatchEvent(new CustomEvent('espana-cookie-consent', { detail: record }));
    return record;
  }

  function t() {
    return copy[lang()];
  }

  function removeExisting() {
    document.getElementById('cookieConsentRoot')?.remove();
  }

  function button(label, className, action) {
    return `<button class="cookie-btn ${className || ''}" type="button" data-cookie-action="${action}">${label}</button>`;
  }

  function renderBanner() {
    const c = t();
    removeExisting();
    const root = document.createElement('div');
    root.id = 'cookieConsentRoot';
    root.className = 'cookie-consent open';
    root.innerHTML = `
      <section class="cookie-panel compact" role="dialog" aria-live="polite" aria-label="${c.title}">
        <div>
          <h2 class="cookie-title">${c.title}</h2>
          <p class="cookie-text">${c.text}</p>
          <div class="cookie-links">
            <a href="/cookies">${c.policy}</a>
            <a href="/privacy">${c.privacy}</a>
          </div>
        </div>
        <div class="cookie-actions">
          ${button(c.reject, 'ghost', 'reject')}
          ${button(c.customize, '', 'settings')}
          ${button(c.acceptAll, 'primary', 'accept')}
        </div>
      </section>`;
    document.body.appendChild(root);
  }

  function renderSettings() {
    const c = t();
    const saved = readConsent();
    const choices = Object.assign({}, DEFAULTS, saved?.choices || {});
    removeExisting();
    const root = document.createElement('div');
    root.id = 'cookieConsentRoot';
    root.className = 'cookie-consent open';
    root.innerHTML = `
      <section class="cookie-panel cookie-settings" role="dialog" aria-modal="true" aria-label="${c.settingsTitle}">
        <div class="cookie-settings-head">
          <div>
            <h2 class="cookie-title">${c.settingsTitle}</h2>
            <p class="cookie-text">${c.settingsText}</p>
          </div>
          <button class="cookie-close" type="button" data-cookie-action="close" aria-label="${c.close}">×</button>
        </div>
        ${categoryHtml('necessary', c, true, true)}
        ${categoryHtml('preferences', c, choices.preferences)}
        ${categoryHtml('analytics', c, choices.analytics)}
        ${categoryHtml('marketing', c, choices.marketing)}
        <div class="cookie-actions" style="margin-top:16px">
          ${button(c.reject, 'ghost', 'reject')}
          ${button(c.save, 'primary', 'save')}
        </div>
      </section>`;
    document.body.appendChild(root);
  }

  function categoryHtml(key, c, checked, disabled) {
    const item = c.categories[key];
    return `
      <label class="cookie-category">
        <span><strong>${item[0]}</strong><span>${item[1]}</span></span>
        <span class="cookie-switch">
          <input type="checkbox" data-cookie-choice="${key}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
          <span class="cookie-slider"></span>
        </span>
      </label>`;
  }

  function closePanel() {
    removeExisting();
    renderManageButton();
  }

  function saveFromSettings() {
    const choices = {};
    document.querySelectorAll('[data-cookie-choice]').forEach(input => {
      choices[input.dataset.cookieChoice] = input.checked;
    });
    writeConsent(choices);
    closePanel();
  }

  function renderManageButton() {
    let manage = document.getElementById('cookieManageButton');
    if (!manage) {
      manage = document.createElement('button');
      manage.id = 'cookieManageButton';
      manage.className = 'cookie-manage';
      manage.type = 'button';
      manage.addEventListener('click', renderSettings);
      document.body.appendChild(manage);
    }
    manage.textContent = t().manage;
    manage.classList.toggle('show', Boolean(readConsent()));
  }

  function handleAction(action) {
    if (action === 'accept') {
      writeConsent({ preferences: true, analytics: true, marketing: true });
      closePanel();
    } else if (action === 'reject') {
      writeConsent({ preferences: false, analytics: false, marketing: false });
      closePanel();
    } else if (action === 'settings') {
      renderSettings();
    } else if (action === 'save') {
      saveFromSettings();
    } else if (action === 'close') {
      closePanel();
    }
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-cookie-action]');
    if (!trigger) return;
    event.preventDefault();
    handleAction(trigger.dataset.cookieAction);
  });

  window.EspanaCookieConsent = {
    openPreferences: renderSettings,
    getConsent: readConsent,
    hasConsent(type) {
      const saved = readConsent();
      if (type === 'necessary') return true;
      return Boolean(saved?.choices?.[type]);
    }
  };

  window.ESPANA_COOKIE_CONSENT = readConsent();

  document.addEventListener('DOMContentLoaded', () => {
    if (!readConsent()) renderBanner();
    renderManageButton();
  });
})();
