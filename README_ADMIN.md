# Prompt Gallery 本地管理台

启动方式：
1. 在电脑上双击 `run-admin.bat`，不要关闭打开的命令窗口。
2. 电脑浏览器打开：`http://localhost:8787/admin`
3. iPad 和电脑在同一个 Wi-Fi 下时，启动窗口会显示类似 `http://192.168.x.x:8787/admin` 的地址，在 iPad Safari 中打开即可。

能做什么：
- 新建或编辑 Prompt 收藏。
- 上传图片，自动保存到 `assets/images/`。
- 选择分类、权限、类型。
- 填写中英文标题、作者、标签、来源链接、Prompt。
- 保存后自动更新 `data/prompts.json`、`prompts.js` 和 `download-assets.js`。
- 点击“一键上传 GitHub”会自动提交并推送。

注意：
- 管理台只适合在自己的电脑上运行，不要部署到公开 GitHub Pages。
- iPad 访问时，电脑必须开机，后台窗口必须保持运行，并且通常需要在同一个 Wi-Fi 下。
- 如果 iPad 无法打开，可能需要允许 Windows 防火墙放行 Node.js。
- 自动翻译按钮已预留，后续接入 API key 后再启用。