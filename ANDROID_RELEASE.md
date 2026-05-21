# Android 上架准备

## 推荐路线

使用 PWA + Trusted Web Activity (TWA) 打包。应用安装后以全屏 App 方式打开 `https://taobao-espana.vercel.app/`，网站继续由 Vercel 更新，Android 包只负责启动与系统集成。

## 上架基本信息

- 应用名称：西班牙生活通
- 推荐包名：`com.xibanyalife.app`
- 应用类型：生活 / 本地服务 / 分类信息
- 默认语言：中文（简体）
- 网站地址：`https://taobao-espana.vercel.app/`
- 隐私政策地址：`https://taobao-espana.vercel.app/privacy.html`

不要用 `淘宝西班牙` 作为 Google Play 展示名称。`淘宝` 是第三方商标，可能触发商标或冒充审核风险；上架名称建议统一为 `西班牙生活通`。

## Google Play 当前硬性要求

- 新应用和更新需提交 Android App Bundle (`.aab`)。
- 新应用和更新需 target Android 15 / API 35 或更高。
- 新应用需加入 Play App Signing。
- 如果 Google Play 开发者账号是 2023-11-13 之后创建的个人账号，正式发布前通常需要至少 12 名测试者连续参与封闭测试 14 天。

## 本仓库已完成

- `manifest.webmanifest`
- `sw.js`
- `offline.html`
- Android/PWA 图标资源
- 移动端竖屏体验优化
- 独立隐私政策页面：`privacy.html`

## 本机已生成

当前 Windows 环境已经安装并配置：

- JDK 17：`C:\Program Files\Eclipse Adoptium\jdk-17.0.19.10-hotspot`
- Android SDK：`%LOCALAPPDATA%\Android\Sdk`
- Bubblewrap TWA 工程：`android-twa/`

已生成的 Google Play 上传包：

```text
android-release/xibanyalife-1.0.3-4-release.aab
```

已生成的通用 Android 安装包：

```text
android-release/xibanyalife-1.0.3-4-release.apk
```

已生成的市场上传压缩包：

```text
android-release/xibanyalife-android-1.0.3-4-upload-package.zip
```

签名密钥保存在本机且已被 `.gitignore` 排除：

```text
android-release/xibanyalife-upload.keystore
android-release/keystore-credentials.txt
```

不要删除 `android-release/keystore-credentials.txt`。以后发布更新必须使用同一个 upload key，否则 Google Play 会拒绝同包名更新。

## Digital Asset Links

TWA 必须在网站放置：

```text
/.well-known/assetlinks.json
```

这个文件需要 Android 签名证书的 SHA-256 指纹。本仓库已经添加：

```text
.well-known/assetlinks.json
```

当前 upload key SHA-256：

```text
0D:0C:5F:75:86:76:02:4F:C4:8F:30:D1:3E:6E:18:41:8E:E1:CB:CB:B7:BE:E4:69:ED:D3:45:74:DF:C1:09:BE
```

如果 Google Play Console 启用 Play App Signing 后显示的“应用签名证书”SHA-256 与上面不同，应把 `.well-known/assetlinks.json` 中的指纹替换为 Play Console 的应用签名证书指纹，再重新部署 Vercel。

## 上架文案草稿

短描述：

```text
面向西班牙华人社区的本地分类信息平台，找工作、找房源、发转让、买二手。
```

完整描述：

```text
西班牙生活通是面向西班牙华人社区的本地生活分类信息平台，覆盖巴塞罗那、马德里、瓦伦西亚等主要城市。

你可以在这里浏览和发布招工求职、租房买房、生意转让、二手物品、二手车、交友相亲、生活服务和教育培训等信息。

平台采用先审核后展示机制，帮助减少虚假信息和重复广告。用户可免费提交基础信息，适合在西班牙生活、工作、创业和寻找本地服务的华人用户。
```

关键词：

```text
西班牙 华人 招工 租房 二手 生意转让 本地生活 分类信息
```
