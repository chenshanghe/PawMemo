/**
 * PM2 进程管理配置
 * 使用：
 *   pm2 start  deploy/ecosystem.config.cjs   # 首次启动
 *   pm2 reload deploy/ecosystem.config.cjs   # 零停机重启（部署时用）
 *   pm2 save                                  # 保存进程列表（开机自启）
 */
module.exports = {
  apps: [
    {
      name: "wantong-api",

      // 使用 node --enable-source-maps 启动编译后的单包
      interpreter: "node",
      interpreter_args: "--enable-source-maps",
      script: "./artifacts/api-server/dist/index.mjs",
      cwd: "/app",

      // 环境变量从 /app/.env 读取（通过 env_file 或手动 source）
      // PM2 不直接支持 .env 文件，在 setup-server.sh 中通过 dotenv 加载
      env: {
        NODE_ENV: "production",
        PORT: "8080",
      },

      // 内存超限自动重启
      max_memory_restart: "800M",

      // 实例数（单核服务器设为 1，多核可设为 "max"）
      instances: 1,

      // 日志（优先写到 /var/log/pm2，不存在则回落到 PM2 默认的 ~/.pm2/logs/）
      error_file: process.env.PM2_LOG_DIR
        ? `${process.env.PM2_LOG_DIR}/wantong-error.log`
        : "/var/log/pm2/wantong-error.log",
      out_file: process.env.PM2_LOG_DIR
        ? `${process.env.PM2_LOG_DIR}/wantong-out.log`
        : "/var/log/pm2/wantong-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,

      // 崩溃后自动重启
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,

      // 等待端口就绪后才认为启动成功（ready 信号）
      wait_ready: false,
      listen_timeout: 10000,
    },
  ],
};
