(() => {
  const DEFAULT_MESSAGE = [
    '您好，我是西班牙生活通。',
    '邀请您看看西班牙华人本地信息平台：招工、房源、商家、二手和生活服务都可以免费发布。',
    '打开：https://espanalife.app/'
  ].join('\n');

  const PHONE_PATTERN = /(^|[^\d])((?:(?:\+|00)34[\s().-]*)?[6789](?:[\s().-]*\d){8})(?!\d)/g;
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'A', 'BUTTON']);
  let settings = { enabled: true, message: DEFAULT_MESSAGE };
  let scanTimer = null;

  function isEditable(node) {
    const element = node.parentElement;
    return !!element?.closest('[contenteditable="true"], textarea, input, select, a, button, .espana-life-phone-link');
  }

  function normalizePhone(value) {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.startsWith('0034')) digits = digits.slice(2);
    if (digits.length === 9) digits = `34${digits}`;
    if (!/^34[6789]\d{8}$/.test(digits)) return '';
    return digits;
  }

  function inviteUrl(phone) {
    const message = settings.message || DEFAULT_MESSAGE;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  function makePhoneLink(rawPhone) {
    const phone = normalizePhone(rawPhone);
    if (!phone) return document.createTextNode(rawPhone);

    const link = document.createElement('a');
    link.className = 'espana-life-phone-link';
    link.href = inviteUrl(phone);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.dataset.espanaLifePhone = phone;
    link.title = '用 WhatsApp 邀请到西班牙生活通';
    link.textContent = rawPhone;

    const badge = document.createElement('span');
    badge.className = 'espana-life-phone-badge';
    badge.textContent = '分享';
    link.appendChild(badge);
    return link;
  }

  function replaceTextNode(node) {
    if (!settings.enabled || !node.nodeValue || !PHONE_PATTERN.test(node.nodeValue)) return;
    PHONE_PATTERN.lastIndex = 0;

    const text = node.nodeValue;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let match;
    let changed = false;

    while ((match = PHONE_PATTERN.exec(text))) {
      const prefix = match[1] || '';
      const rawPhone = match[2] || '';
      const phoneStart = match.index + prefix.length;
      const phoneEnd = phoneStart + rawPhone.length;
      const normalized = normalizePhone(rawPhone);
      if (!normalized) continue;

      fragment.appendChild(document.createTextNode(text.slice(lastIndex, phoneStart)));
      fragment.appendChild(makePhoneLink(rawPhone));
      lastIndex = phoneEnd;
      changed = true;
    }

    if (!changed) return;
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    node.parentNode.replaceChild(fragment, node);
  }

  function scan(root = document.body) {
    if (!settings.enabled || !root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || SKIP_TAGS.has(parent.tagName) || isEditable(node)) return NodeFilter.FILTER_REJECT;
        if (!PHONE_PATTERN.test(node.nodeValue || '')) return NodeFilter.FILTER_REJECT;
        PHONE_PATTERN.lastIndex = 0;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (nodes.length < 300) {
      const node = walker.nextNode();
      if (!node) break;
      nodes.push(node);
    }
    nodes.forEach(replaceTextNode);
  }

  function refreshLinks() {
    document.querySelectorAll('.espana-life-phone-link[data-espana-life-phone]').forEach((link) => {
      link.href = inviteUrl(link.dataset.espanaLifePhone);
    });
  }

  function scheduleScan(root) {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => scan(root), 250);
  }

  chrome.storage.sync.get({ enabled: true, message: DEFAULT_MESSAGE }, (value) => {
    settings = value;
    scan();
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) settings.enabled = changes.enabled.newValue;
    if (changes.message) settings.message = changes.message.newValue || DEFAULT_MESSAGE;
    refreshLinks();
    if (settings.enabled) scan();
  });

  const observer = new MutationObserver((mutations) => {
    if (!settings.enabled) return;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          scheduleScan(node);
          return;
        }
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
