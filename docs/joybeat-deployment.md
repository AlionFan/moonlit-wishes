# Joybeat 部署

正式地址：https://mid-autumn.joybeat.cn/

- DNSPod：`mid-autumn` 的 A 记录指向 `82.156.0.31`，默认线路，TTL 600。
- SSH 别名：`joybeat`。
- 独立容器：`joybeat-mid-autumn`，加入现有 `coolify` 网络，无额外宿主机端口。
- 统计容器：`joybeat-mid-autumn-analytics`，仅在容器网络提供 `/api/`，使用 Python 标准库和 SQLite；无公开端口。
- 服务器目录：`/srv/apps/mid-autumn`。
- `current` 指向当前静态构建；`releases/` 保留历史构建，`previous-release` 记录上一版本。
- 现有 Traefik 通过 Docker 标签发现服务，并使用 `letsencrypt` 签发和续期证书。HTTP 自动跳转 HTTPS。
- `/srv/apps/mid-autumn/site.env` 中配置 `MOONLIT_DOMAIN=mid-autumn.joybeat.cn`。
- 音乐、插图和字体均由本站提供，不依赖外站播放链接。
- 统计数据库位于 `/srv/apps/mid-autumn/data/analytics.sqlite3`；访问口令保存在仅管理员可读的 `/srv/apps/mid-autumn/analytics.env`，部署脚本首次运行时生成。不要将口令提交到仓库。

## 更新

在本项目目录中运行：

```sh
npm ci
npm test
python3 -m unittest discover -s analytics -p 'test_*.py'
npm run build
./scripts/deploy-joybeat.sh
```

脚本上传新构建，校验必要文件后原子切换 `current`，保持域名配置，并重建本站两个容器以加载最新配置。Nginx 和 Python 镜像均固定版本，不修改共享代理和其他应用。每次完成后，请检查正式网址、音乐和统计页。

```sh
ssh joybeat 'curl -fsSI https://mid-autumn.joybeat.cn/'
ssh joybeat 'sudo docker inspect --format "{{.State.Status}} {{.State.Health.Status}}" joybeat-mid-autumn'
curl -I https://mid-autumn.joybeat.cn/stats.html
curl -I https://mid-autumn.joybeat.cn/api/stats # 无口令应为 401
```

`artifacts/latest-joybeat-release` 记录最近上传版本；当前部署与验证信息见 `docs/deployment-status.json` 和 `artifacts/joybeat-production-checks.json`。

## 恢复上一版本

以下命令仅供需要回滚时执行。先检查并确认 `previous-release` 指向希望恢复的构建，再切换链接：

```sh
ssh joybeat 'sudo bash -s' <<'REMOTE'
set -euo pipefail
base=/srv/apps/mid-autumn
previous=$(cat "$base/previous-release")
test -f "$base/$previous/index.html"
ln -s "$previous" "$base/current-rollback"
mv -Tf "$base/current-rollback" "$base/current"
docker exec joybeat-mid-autumn wget -qO- http://127.0.0.1/healthz
REMOTE
```

## 验证范围

2026-09-25 06:53 UTC 发布分享弹窗与末页调整（release `20260925T065340Z`），已确认正式统计页返回 200，主服务容器 healthy，线上首页引用新构建 `index-Cry23pF3.js` 和样式 `index-DtVx76CK.css`。分享弹窗显示右上角转发指引并突出海报制作，卡片最后一页移除了分享入口。

同日 06:48 UTC 发布楷体更新（release `20260925T064816Z`），正文、标题和生成海报统一使用设备可用的楷体；未安装楷体的设备会回退为系统衬线字体。

同日 06:44 UTC 发布分享指引更新（release `20260925T064422Z`），微信内显示右上角「···」转发指引，海报页提示长按图片分享；尚未在真实微信客户端验证长按菜单的具体选项。自定义微信分享预览仍需公众号 JS-SDK。

此前已验证公开 DNS、有效证书、HTTP 308 跳转、三个互不显示切换入口的七屏卡片、全部页面引用的本地资源、MP3 分段响应 206，以及浏览器中的首触播放、制作与还原定制卡片、复制链接、生成海报、390 像素手机布局。页面会尝试直接播放；受手机浏览器限制时，首次触碰恢复播放。

同日的大字版在 360 和 390 像素手机宽度检查：祝福信正文为 18px，长页出现上滑提示，滑动后署名和下一页按钮完整可见；制作表单与音乐列表的字号也已增大。
