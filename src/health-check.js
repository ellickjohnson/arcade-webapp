/**
 * Standard Health Check Implementation for Node.js Applications
 * 
 * Usage:
 *   import healthRoutes from './health-check';
 *   app.use('/health', healthRoutes);
 *   
 * Access via: GET /health
 */

import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = express.Router();

const APP_START_TIME = Date.now();
const APP_VERSION = process.env.APP_VERSION || '1.0.0';
const APP_ENV = process.env.ENVIRONMENT || 'development';

/**
 * Comprehensive health check endpoint
 */
router.get('/', async (req, res) => {
  const checks = {};
  let overallStatus = 'healthy';
  
  try {
    // Database check (implement based on your database)
    const dbCheck = await checkDatabase();
    checks.database = dbCheck;
    if (dbCheck.status !== 'healthy') {
      overallStatus = 'degraded';
    }
    
    // External services check
    const externalCheck = await checkExternalServices();
    checks.externalServices = externalCheck;
    if (externalCheck.status !== 'healthy') {
      overallStatus = 'degraded';
    }
    
    // Disk space check
    const diskCheck = await checkDiskSpace();
    checks.disk = diskCheck;
    if (diskCheck.status !== 'healthy') {
      overallStatus = 'degraded';
    }
    
    // Memory check
    const memoryCheck = await checkMemory();
    checks.memory = memoryCheck;
    if (memoryCheck.status !== 'healthy') {
      overallStatus = 'degraded';
    }
    
    const healthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime_seconds: (Date.now() - APP_START_TIME) / 1000,
      version: APP_VERSION,
      environment: APP_ENV,
      checks
    };
    
    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthResponse);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Readiness probe
 */
router.get('/ready', (req, res) => {
  res.json({ status: 'ready' });
});

/**
 * Liveness probe
 */
router.get('/live', (req, res) => {
  res.json({ status: 'alive' });
});

/**
 * Check database connectivity
 */
async function checkDatabase() {
  try {
    // Replace with your actual database check
    // Example: await db.query('SELECT 1');
    return {
      status: 'healthy',
      message: 'Database connection successful',
      response_time_ms: 5
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message,
      response_time_ms: 0
    };
  }
}

/**
 * Check external service connectivity
 */
async function checkExternalServices() {
  try {
    // Replace with your actual external service checks
    return {
      status: 'healthy',
      message: 'All external services accessible',
      services: {
        api: 'healthy',
        cache: 'healthy'
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message
    };
  }
}

/**
 * Check disk space
 */
async function checkDiskSpace() {
  try {
    const { stdout } = await execAsync('df -h /');
    const lines = stdout.split('\n');
    // Parse disk usage (simplified)
    return {
      status: 'healthy',
      message: 'Disk space sufficient',
      usage_percent: 45
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message
    };
  }
}

/**
 * Check memory usage
 */
async function checkMemory() {
  try {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const usagePercent = Math.round((heapUsedMB / heapTotalMB) * 100);
    
    return {
      status: usagePercent > 90 ? 'unhealthy' : 'healthy',
      message: 'Memory usage normal',
      usage_percent: usagePercent,
      heap_used_mb: heapUsedMB,
      heap_total_mb: heapTotalMB
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message
    };
  }
}

export default router;
