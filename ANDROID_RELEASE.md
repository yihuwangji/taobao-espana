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

## 本仓库已完成

- `manifest.webmanifest`
- `sw.js`
- `offline.html`
- Android/PWA 图标资源
- 移动端竖屏体验优化
- 独立隐私政策页面：`privacy.html`

## 本机还缺

当前 Windows 环境没有检测到 Java/JDK，也没有 Android SDK，所以暂时不能直接构建 `.aab`。

安装后执行：

```powershell
winget install EclipseAdoptium.Temurin.17.JDK
winget install Google.AndroidStudio
npm install -g @bubblewrap/cli
```

用 Bubblewrap 初始化 TWA：

```powershell
bubblewrap init --manifest https://taobao-espana.vercel.app/manifest.webmanifest
```

初始化时建议填写：

- Package ID: `com.xibanyalife.app`
- App name: `西班牙生活通`
- Launcher name: `生活通`
- Host: `taobao-espana.vercel.app`
- Start URL: `/`
- Orientation: `portrait`

构建上架包：

```powershell
bubblewrap build
```

生成 `.aab` 后上传到 Play Console。

## Digital Asset Links

TWA 必须在网站放置：

```text
/.well-known/assetlinks.json
```

这个文件需要 Android 签名证书的 SHA-256 指纹。生成签名密钥后，再把 `android/assetlinks.template.json` 里的占位符替换成真实指纹，并部署到 Vercel。

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
