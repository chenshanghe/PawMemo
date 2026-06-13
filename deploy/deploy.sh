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
# 用 Python 重建密钥：
#   - 处理字面 \n（部分 Secret 管理器以转义符存储）
#   - 处理单行存储（Replit Secret UI 把换行符转成空格的情况）
printf '%s\n' "$DEPLOY_SSH_KEY" | python3 -c "
import sys, re
key = sys.stdin.read().strip()
# 先把字面 \n 换成真换行
key = key.replace('\\\\n', '\n')
# 如果整个 key 仍只有一行（换行被空格替换的情况），重建结构
if '\n' not in key:
    key = re.sub(r'----- +', '-----\n', key)   # BEGIN/END 之后的空格 → 换行
    key = re.sub(r' +-----', '\n-----', key)    # -----END 之前的空格 → 换行
    lines = key.split('\n')
    out = []
    for line in lines:
        if line.startswith('-----'):
            out.append(line)
        else:
            out.extend(line.split())            # base64 块以空格分隔 → 每块独立一行
    key = '\n'.join(out)
print(key)
" > "$KEYFILE"
trap "rm -f '$KEYFILE'" EXIT

# 验证密钥文件有效（快速失败，避免等到 scp 再报错）
KEY_LINES=$(wc -l < "$KEYFILE")
info "密钥文件：${KEY_LINES} 行"
ssh-keygen -l -f "$KEYFILE" > /dev/null 2>&1 \
  || die "SSH 私钥格式无效，请检查 DEPLOY_SSH_KEY Secret 是否完整粘贴了 PEM 私钥"

# ── 3. 预取服务器 SSH 主机密钥（防中间人攻击）──────────────────────────────
info "验证服务器主机密钥..."
KNOWN_HOSTS=$(mktemp /tmp/known_hosts.XXXXXX)
trap "rm -f '$KEYFILE' '$KNOWN_HOSTS'" EXIT

# ssh-keyscan 获取服务器公钥并写入临时 known_hosts
ssh-keyscan -H -T 10 "$DEPLOY_HOST" >> "$KNOWN_HOSTS" 2>/dev/null \
  || die "无法获取服务器主机密钥（$DEPLOY_HOST），请检查网络连通性和防火墙"

# 如果配置了 DEPLOY_HOST_FINGERPRINT，额外验证指纹匹配
if [[ -n "${DEPLOY_HOST_FINGERPRINT:-}" ]]; then
  ACTUAL=$(ssh-keygen -l -f "$KNOWN_HOSTS" | awk '{print $2}')
  if [[ "$ACTUAL" != "$DEPLOY_HOST_FINGERPRINT" ]]; then
    die "主机密钥指纹不匹配！\n  期望：$DEPLOY_HOST_FINGERPRINT\n  实际：$ACTUAL\n  疑似中间人攻击，部署已中止。"
  fi
  info "主机指纹验证通过：$ACTUAL"
fi

SSH_OPTS="-i $KEYFILE -o StrictHostKeyChecking=yes -o UserKnownHostsFile=$KNOWN_HOSTS -o ConnectTimeout=15"
SSH="ssh $SSH_OPTS $DEPLOY_USER@$DEPLOY_HOST"
SCP="scp $SSH_OPTS"

info "目标服务器：$DEPLOY_USER@$DEPLOY_HOST"

# ── 4. 本地构建（提前发现错误） ─────────────────────────────────────────────
info "构建前端（BASE_PATH=/）..."
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/travel-diary run build

info "构建 API Server..."
pnpm --filter @workspace/api-server run build

# ── 6. 打包源码（不含 node_modules / .git / .env） ───────────────────────
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

# ── 7. 上传到服务器 ────────────────────────────────────────────────────────
info "上传到服务器..."
$SCP "$ARCHIVE" "$DEPLOY_USER@$DEPLOY_HOST:/tmp/wantong-deploy.tar.gz"
rm -rf "$TMPDIR_PACK"

# ── 8. 服务器端：解压 → 安装依赖 → 构建 → 重启 ────────────────────────────
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

# 加载 .env 到当前 shell 环境（让 PM2 通过 --update-env 继承）
if [[ -f "$APP_DIR/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$APP_DIR/.env"
  set +a
  echo "  ✓ 已加载 $APP_DIR/.env"
else
  echo "  ⚠  未找到 $APP_DIR/.env，跳过加载（确保已手动配置环境变量）"
fi

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
