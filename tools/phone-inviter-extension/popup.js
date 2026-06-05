const DEFAULT_MESSAGE = [
  '您好，我是西班牙生活通。',
  '邀请您看看西班牙华人本地信息平台：招工、房源、商家、二手和生活服务都可以免费发布。',
  '打开：https://espanalife.app/'
].join('\n');

const enabled = document.getElementById('enabled');
const message = document.getElementById('message');

chrome.storage.sync.get({ enabled: true, message: DEFAULT_MESSAGE }, (value) => {
  enabled.checked = Boolean(value.enabled);
  message.value = value.message || DEFAULT_MESSAGE;
});

document.getElementById('save').addEventListener('click', () => {
  chrome.storage.sync.set({ enabled: enabled.checked, message: message.value || DEFAULT_MESSAGE }, () => {
    window.close();
  });
});

document.getElementById('reset').addEventListener('click', () => {
  message.value = DEFAULT_MESSAGE;
  enabled.checked = true;
});

document.getElementById('test').addEventListener('click', () => {
  const text = encodeURIComponent(message.value || DEFAULT_MESSAGE);
  chrome.tabs.create({ url: `https://wa.me/34600000000?text=${text}` });
});
