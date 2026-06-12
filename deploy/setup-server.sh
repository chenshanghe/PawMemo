#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# 顽童记 — 火山引擎 ECS 一次性初始化脚本
# 在全新的 Ubuntu 22.04 实例上以 root 运行：
#   curl -fsSL https://raw.githubusercontent.com/YOUR_ORG/YOUR_REPO/main/deploy/setup-server.sh | sudo bash
# 或：
#   sudo bash setup-server.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_DIR=/app
APP_USER=ubuntu
REPO_URL="${REPO_URL:-}"   # 可选：预先填写 git 仓库地址，否则稍后手动 clone

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  顽童记 服务器初始化"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. 系统更新 + 基础工具 ────────────────────────────────────────────────
apt-get update -qq
apt-get install -y -qq curl git nginx certbot python3-certbot-nginx ufw htop

# ── 2. Node.js 20 LTS ────────────────────────────────────────────────────
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1) != "v20" ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node -v)"

# ── 3. pnpm ───────────────────────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  npm install -g pnpm
fi
echo "pnpm: $(pnpm -v)"

# ── 4. PM2 ────────────────────────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi
# 配置开机自启（无论是否刚安装）
pm2 startup systemd -u "$APP_USER" --hp "/home/$APP_USER" | tail -1 | bash || true
echo "PM2: $(pm2 -v)"

# 创建 PM2 日志目录并授权给应用用户
mkdir -p /var/log/pm2
chown -R "$APP_USER:$APP_USER" /var/log/pm2
echo "✓ /var/log/pm2 已创建并授权给 $APP_USER"

# ── 5. 应用目录 ───────────────────────────────────────────────────────────
mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# ── 6. 可选：从 Git 初始化代码 ────────────────────────────────────────────
if [[ -n "$REPO_URL" ]]; then
  if [[ ! -d "$APP_DIR/.git" ]]; then
    sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
    echo "✓ 代码已 clone 至 $APP_DIR"
  else
    echo "✓ $APP_DIR 已有 git 仓库，跳过 clone"
  fi
else
  echo "⚠  未设置 REPO_URL，跳过 git clone。"
  echo "   请手动将代码上传至 $APP_DIR，或设置 REPO_URL= 后重新运行。"
fi

# ── 7. 环境变量文件 ───────────────────────────────────────────────────────
if [[ ! -f "$APP_DIR/.env" ]]; then
  if [[ -f "$APP_DIR/deploy/.env.example" ]]; then
    cp "$APP_DIR/deploy/.env.example" "$APP_DIR/.env"
    echo "✓ 已复制 .env.example → $APP_DIR/.env"
    echo "  ⚠  请编辑 $APP_DIR/.env，填入正式密钥后再启动服务"
  fi
fi

# ── 8. Nginx 配置 ─────────────────────────────────────────────────────────
NGINX_CONF=/etc/nginx/sites-available/wantong
if [[ -f "$APP_DIR/deploy/nginx.conf" ]]; then
  cp "$APP_DIR/deploy/nginx.conf" "$NGINX_CONF"
  ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/wantong
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
  echo "✓ Nginx 已配置（HTTP 模式，HTTPS 待证书就绪后启用）"
fi

# ── 9. 防火墙 ─────────────────────────────────────────────────────────────
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo "✓ 防火墙已配置：22/80/443"

# ── 10. 完成 ─────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  初始化完成！后续步骤："
echo ""
echo "  1. 编辑环境变量：nano $APP_DIR/.env"
echo "  2. 申请 SSL 证书（替换 yourdomain.com）："
echo "     certbot --nginx -d yourdomain.com"
echo "  3. 在 Replit 中点击「Deploy to 火山引擎」完成首次部署"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
