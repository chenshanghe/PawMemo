#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# 顽童记 — 一键部署至火山引擎 ECS
#
# 需要在 Replit Secrets 中配置：
#   DEPLOY_HOST      服务器公网 IP 或域名
#   DEPLOY_USER      SSH 用户名（通常为 ubuntu）
#   DEPLOY_SSH_KEY   SSH 私钥内容（整段 PEM，含 -----BEGIN/END-----）
#
# 用法：直接在 Replit 中点击"Deploy to 火山引擎"Workflow，或运行：
#   bash deploy/deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}▶${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
die()     { echo -e "${RED}✗${NC}  $*" >&2; exit 1; }

# ── 1. 检查必要 Secrets ────────────────────────────────────────────────────
[[ -z "${DEPLOY_HOST:-}" ]]    && die "DEPLOY_HOST 未在 Replit Secrets 中配置"
[[ -z "${DEPLOY_USER:-}" ]]    && die "DEPLOY_USER 未在 Replit Secrets 中配置"
[[ -z "${DEPLOY_SSH_KEY:-}" ]] && die "DEPLOY_SSH_KEY 未在 Replit Secrets 中配置"

# ── 2. 写入临时 SSH 密钥 ──────────────────────────────────────────────────
KEYFILE=$(mktemp /tmp/deploy_key.XXXXXX)
chmod 600 "$KEYFILE"
echo "$DEPLOY_SSH_KEY" > "$KEYFILE"
trap "rm -f '$KEYFILE'" EXIT

SSH_OPTS="-i $KEYFILE -o StrictHostKeyChecking=no -o ConnectTimeout=15"
SSH="ssh $SSH_OPTS $DEPLOY_USER@$DEPLOY_HOST"
SCP="scp $SSH_OPTS"

info "目标服务器：$DEPLOY_USER@$DEPLOY_HOST"

# ── 3. 本地构建（提前发现错误） ─────────────────────────────────────────────
info "构建前端（BASE_PATH=/）..."
BASE_PATH=/ pnpm --filter @workspace/travel-diary run build

info "构建 API Server..."
pnpm --filter @workspace/api-server run build

# ── 4. 打包源码（不含 node_modules / .git / .env） ───────────────────────
info "打包部署包..."
TMPDIR_PACK=$(mktemp -d)
ARCHIVE="$TMPDIR_PACK/wantong-deploy.tar.gz"

tar czf "$ARCHIVE" \
  --exclude='*/node_modules' \
  --exclude='.git' \
  --exclude='**/.cache' \
  --exclude='**/.env' \
  --exclude='**/.env.local' \
  --exclude='**/dist/.vite' \
  --exclude='*.log' \
  --exclude='.local' \
  .

ARCHIVE_SIZE=$(du -sh "$ARCHIVE" | cut -f1)
info "包大小：$ARCHIVE_SIZE"

# ── 5. 上传到服务器 ────────────────────────────────────────────────────────
info "上传到服务器..."
$SCP "$ARCHIVE" "$DEPLOY_USER@$DEPLOY_HOST:/tmp/wantong-deploy.tar.gz"
rm -rf "$TMPDIR_PACK"

# ── 6. 服务器端：解压 → 安装依赖 → 构建 → 重启 ────────────────────────────
info "在服务器上部署..."
$SSH bash -s << 'REMOTE'
set -euo pipefail
APP_DIR=/app

# 解压（覆盖同名文件，保留 .env）
echo "  解压源码..."
cd "$APP_DIR"
# 备份 .env 防止被覆盖（tar 不包含 .env，但以防万一）
[[ -f .env ]] && cp .env /tmp/.env.bak
tar xzf /tmp/wantong-deploy.tar.gz -C "$APP_DIR"
[[ -f /tmp/.env.bak ]] && mv /tmp/.env.bak .env
rm -f /tmp/wantong-deploy.tar.gz

# 安装依赖
echo "  安装依赖..."
pnpm install --frozen-lockfile

# 构建 lib 包（TypeScript 项目引用）
echo "  构建 lib/db..."
cd lib/db && npx tsc --build && cd "$APP_DIR"

# 构建前端（生产模式，BASE_PATH=/）
echo "  构建前端..."
BASE_PATH=/ pnpm --filter @workspace/travel-diary run build

# 构建 API Server
echo "  构建 API Server..."
pnpm --filter @workspace/api-server run build

# 启动或重载 PM2
echo "  重启服务..."
if pm2 list | grep -q "wantong-api"; then
  pm2 reload "$APP_DIR/deploy/ecosystem.config.cjs" --update-env
else
  pm2 start "$APP_DIR/deploy/ecosystem.config.cjs"
fi
pm2 save

echo "  ✓ 部署完成"
REMOTE

info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
info "部署成功！服务器：http://$DEPLOY_HOST"
warn "如已配置域名和 SSL，请访问 https://yourdomain.com"
info "查看服务器日志：ssh ... 'pm2 logs wantong-api'"
