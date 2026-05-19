# Release Notes

## 当前状态

- 本地 `main` 已包含前台、后台和 Supabase RLS 修复。
- 线上 `https://taobao-espana.vercel.app/` 仍是旧版本，需要推送 GitHub 后由 Vercel 重新部署。
- 当前本地分支领先 `origin/main`，但这台电脑尚未完成 GitHub 登录，直接 `git push` 会失败。

## 发布步骤

```powershell
cd C:\Users\LENOVO\Desktop\taobao-espana
git status
git push origin main
```

推送成功后，到 Vercel 查看 `taobao-espana` 项目部署状态。部署完成后检查：

- 首页不再出现乱码文案，如 `邮筱`、`汇獴`、`待上传`、`待设置`。
- 游客发布能提交为 `pending`，后台待审核能看到。
- 举报能提交，后台举报处理能看到。
- 后台必须先登录管理员账号，不能直接访问数据。

## 必做安全项

之前线上/历史代码暴露过 Supabase service role key。即使本地代码已经删除，也必须在 Supabase Dashboard 手动轮换：

1. 打开 Supabase 项目 `jfhpsxfnbpsvvtqsdvco`。
2. 进入 Project Settings / API。
3. Rotate service role secret。
4. 确认任何前端文件都没有 `service_role` 或 `SUPABASE_SERVICE_KEY`。

Supabase Security Advisor 还提示 leaked password protection 未开启，建议在 Auth 密码安全设置里启用。
