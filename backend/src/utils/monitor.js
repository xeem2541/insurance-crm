const checkDiskSpace = require('check-disk-space').default;
const axios = require('axios');
const os = require('os');
const path = require('path');
const { logger } = require('./logger');

// Define thresholds
const DISK_THRESHOLD_PERCENT = 15; // Alert if free space < 15%
const MEMORY_THRESHOLD_PERCENT = 90; // Alert if memory usage > 90%

// Get current system health (Disk and Memory)
async function getSystemHealth() {
  // Vercel Serverless environment: Disk space is read-only and memory is managed by Lambda.
  // Health checks for these hardware metrics don't apply.
  if (process.env.VERCEL === '1') {
    return {
      disk: { isHealthy: true, note: 'Skipped on Serverless' },
      memory: { isHealthy: true, note: 'Skipped on Serverless' }
    };
  }

  try {
    // Check disk space for the partition containing the uploads folder
    const diskPath = path.resolve(__dirname, '../../uploads');
    const diskSpace = await checkDiskSpace(diskPath);
    const diskFreePercent = (diskSpace.free / diskSpace.size) * 100;

    // Check system memory
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsedPercent = (usedMem / totalMem) * 100;

    return {
      disk: {
        totalGB: (diskSpace.size / (1024 ** 3)).toFixed(2),
        freeGB: (diskSpace.free / (1024 ** 3)).toFixed(2),
        freePercent: diskFreePercent.toFixed(2),
        isHealthy: diskFreePercent >= DISK_THRESHOLD_PERCENT,
      },
      memory: {
        totalGB: (totalMem / (1024 ** 3)).toFixed(2),
        usedGB: (usedMem / (1024 ** 3)).toFixed(2),
        usedPercent: memoryUsedPercent.toFixed(2),
        isHealthy: memoryUsedPercent <= MEMORY_THRESHOLD_PERCENT,
      },
    };
  } catch (error) {
    logger.error('Failed to get system health:', error);
    return null;
  }
}

// Send alert via Line Notify
async function sendLineAlert(message) {
  if (!process.env.LINE_NOTIFY_TOKEN) return;
  try {
    await axios.post(
      'https://notify-api.line.me/api/notify',
      `message=\n🚨 [SYSTEM ALERT] 🚨\n${message}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${process.env.LINE_NOTIFY_TOKEN}`,
        },
      }
    );
  } catch (err) {
    logger.error('Failed to send monitoring alert to Line:', err);
  }
}

let isAlertCooldown = false;

// Run the monitoring check
async function checkAndAlert() {
  const health = await getSystemHealth();
  if (!health) return;

  let alerts = [];

  if (!health.disk.isHealthy) {
    alerts.push(`Disk space is critically low: ${health.disk.freePercent}% free (${health.disk.freeGB}GB left).`);
  }

  if (!health.memory.isHealthy) {
    alerts.push(`Memory usage is critically high: ${health.memory.usedPercent}% used.`);
  }

  if (alerts.length > 0 && !isAlertCooldown) {
    const alertMessage = alerts.join('\n');
    logger.warn(`Triggering System Alert:\n${alertMessage}`);
    await sendLineAlert(alertMessage);
    
    // Cooldown 1 hour to prevent spamming
    isAlertCooldown = true;
    setTimeout(() => {
      isAlertCooldown = false;
    }, 60 * 60 * 1000);
  }
}

// Start monitoring every 5 minutes
function startSystemMonitor() {
  console.log('[Monitor] Starting background system monitoring (Disk/Memory)...');
  
  // Initial check
  checkAndAlert();

  // Schedule to run every 5 minutes
  setInterval(() => {
    checkAndAlert();
  }, 5 * 60 * 1000);
}

module.exports = {
  getSystemHealth,
  startSystemMonitor,
};
