const cron = require('node-cron');
const FeeModel = require('../models/feeModel');
const AuditModel = require('../models/auditModel');

/**
 * Current calendar month as YYYY-MM.
 */
function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Generate fee records for every active student for the given month
 * (defaults to the current month). Safe to call any number of times —
 * students who already have a record for that month are skipped.
 */
async function runMonthlyFeeGeneration(month = currentMonth()) {
  try {
    const { created, skipped } = await FeeModel.bulkGenerateForMonth(month, null);

    if (created > 0) {
      await AuditModel.log({
        userName: 'System (Auto)',
        userRole: 'system',
        action: 'FEES_AUTO_GENERATED',
        category: 'Fees',
        description: `Auto-generated ${created} fee record(s) for ${month} at the start of the month (${skipped} already existed)`,
        entityType: 'fee',
        entityLabel: month,
      });
    }

    console.log(`[FeeScheduler] ${month}: created ${created} fee record(s), skipped ${skipped} (already existed)`);
    return { created, skipped };
  } catch (err) {
    console.error('[FeeScheduler] Monthly fee generation failed:', err.message);
    return { created: 0, skipped: 0, error: err.message };
  }
}

/**
 * Starts the recurring monthly fee generation job.
 *  - Runs once immediately on server boot, so fees for the current month
 *    exist even if the server happened to be offline when the month
 *    actually rolled over.
 *  - Then runs at 00:05 on the 1st of every month.
 * Called once from app.js on startup.
 */
function startFeeScheduler() {
  runMonthlyFeeGeneration();

  cron.schedule('5 0 1 * *', () => {
    runMonthlyFeeGeneration();
  });

  console.log('[FeeScheduler] Monthly fee auto-generation scheduled (00:05 on the 1st of each month)');
}

module.exports = { startFeeScheduler, runMonthlyFeeGeneration };
