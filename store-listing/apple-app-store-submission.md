# Apple App Store 上架材料与风险

## 结论

当前仓库已经有 PWA 和 Android TWA，但还没有 iOS 原生工程，因此现在不能直接生成可上传 App Store Connect 的 `.ipa`。

Apple 不建议提交“只是网页套壳”的 App。西班牙生活通要上架 iPhone，建议做 Capacitor 或 Swift WKWebView 原生壳，并加入真实 App 功能，例如：

- 原生相机/相册上传
- iOS 分享面板
- 推送通知或消息提醒
- 原生登录状态保存
- App 内隐私/用户协议页面
- 面向手机的欧圈信息流和发布体验

这样比单纯打开 `https://espanalife.app` 更像一个 App，降低审核 4.2 Minimum Functionality 被拒风险。

## App Store 信息草稿

- App 名称：西班牙生活通
- Subtitle：欧洲华人生活社区
- Bundle ID 建议：`com.xibanyalife.app`
- SKU 建议：`xibanyalife-ios`
- 隐私政策：`https://espanalife.app/privacy`
- 用户协议：`https://espanalife.app/terms`
- 支持网址：`https://espanalife.app/`
- 联系邮箱：`aladaya@gmail.com`
- 年龄分级建议：17+，因为平台包含用户生成内容、招聘、租房、交友/社区评论等内容。

## 需要账号侧完成

- Apple Developer Program 账号。
- App Store Connect 中创建 App 记录。
- macOS + Xcode 或云构建环境，用来签名并上传 iOS build。
- App Privacy 表单：需要声明手机号、昵称、城市、用户发布内容、图片/视频、互动数据、设备/诊断日志等收集用途。
- 提供审核账号或审核说明，方便 Apple 查看发布、详情、举报、联系方式等主要功能。

## 暂不建议

- 不要把后台管理端作为公开 App 上架。
- 不要写“淘宝西班牙”或使用第三方商标。
- 不要在 iOS App 内售卖纯数字曝光/VIP 权益并绕过 Apple 内购。当前主推“注册即 VIP、免费发布”更稳。

