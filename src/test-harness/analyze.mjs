
import * as fs from 'fs';
import * as path from 'path';

const REPORTS_DIR = path.join(process.cwd(), 'ai-beta-reports');
const OUTPUT_FILE = path.join(process.cwd(), 'failure_repro.md');

function parseLogs() {
    if (!fs.existsSync(REPORTS_DIR)) {
        console.log(`No reports directory found at ${REPORTS_DIR}`);
        return [];
    }

    const files = fs.readdirSync(REPORTS_DIR);
    const logFiles = files.filter(f => f.endsWith('.log'));
    const runs = [];

    console.log(`Found ${logFiles.length} log files to analyze.`);

    for (const logFile of logFiles) {
        const logPath = path.join(REPORTS_DIR, logFile);
        const content = fs.readFileSync(logPath, 'utf-8');

        // Extract metadata from filename: beta_test_SCENARIO_TIMESTAMP.log
        // Example: beta_test_fuzz-29541-medium_20251229_145613.log
        const match = logFile.match(/beta_test_(.*)_(\d{8}_\d{6})\.log/);
        if (!match) continue;

        const scenario = match[1];
        const timestamp = match[2];

        // Extract seed if present
        const seedMatch = scenario.match(/fuzz-(\d+)-/);
        const seed = seedMatch ? seedMatch[1] : null;

        // Determine status
        // We look for exit code signs or specific success messages
        // Assuming the log capture captures stderr too.
        const isSuccess = !content.includes('Session failed') && !content.includes('Error:');

        let failureReason = undefined;
        if (!isSuccess) {
            if (content.includes('Could not resolve hostname')) failureReason = 'DNS/Network Error';
            else if (content.includes('Connection refused')) failureReason = 'Connection Refused';
            else if (content.includes('Timeout')) failureReason = 'Timeout';
            else failureReason = 'Unknown Error (Check Log)';
        }

        runs.push({
            id: logFile.replace('.log', ''),
            scenario,
            seed,
            timestamp,
            success: isSuccess,
            failureReason,
            logPath
        });
    }

    return runs;
}

function generateReport(runs) {
    const total = runs.length;
    const passed = runs.filter(r => r.success).length;
    const failed = runs.filter(r => !r.success);
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';

    console.log('\n========================================');
    console.log('📊 Fuzz Analysis Report');
    console.log('========================================');
    console.log(`Total Runs: ${total}`);
    console.log(`Passed:     ${passed}`);
    console.log(`Failed:     ${failed.length}`);
    console.log(`Pass Rate:  ${passRate}%`);
    console.log('========================================\n');

    if (failed.length > 0) {
        console.log('❌ Failures Detected:');
        let reproContent = '# Failure Reproduction Guide\n\nRun these commands to reproduce the specific failing scenarios:\n\n';

        failed.forEach(run => {
            console.log(`- ${run.scenario} (${run.failureReason})`);

            reproContent += `### ${run.scenario}\n`;
            reproContent += `**Reason**: ${run.failureReason}\n`;
            reproContent += `**Log**: ${run.logPath}\n`;
            reproContent += '```bash\n';
            // Use the helper script formatting
            if (run.seed) {
                // reconstruct complexity
                const complexity = run.scenario.split('-')[2] || 'medium';
                reproContent += `./scripts/fuzz-local.sh ${run.seed} ${complexity}\n`;
            } else {
                reproContent += `./scripts/run-ai-beta-tests.sh --scenario="${run.scenario}"\n`;
            }
            reproContent += '```\n\n';
        });

        fs.writeFileSync(OUTPUT_FILE, reproContent);
        console.log(`\n📝 Reproduction guide saved to: ${OUTPUT_FILE}`);
    } else {
        console.log('✅ No failures detected in this batch.');
        if (fs.existsSync(OUTPUT_FILE)) {
            fs.unlinkSync(OUTPUT_FILE);
        }
    }
}

// Main execution
const runs = parseLogs();
generateReport(runs);
