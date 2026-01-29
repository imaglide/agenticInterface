
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Config
const INTERVIEW_URL = "http://localhost:3010/interview";
const AI_BETA_TESTER_DIR = "/Users/rob/Development/aiBetaTester";
const REPORTS_DIR = path.join(process.cwd(), 'ai-beta-reports');

if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR);

const AGENTS = [
    { name: 'speedrunner', expected: 'accepted_blindly' },
    { name: 'skeptical_exec', expected: 'read_details' },
    { name: 'chaos_gremlin', expected: 'chaos_clicked_hidden' },
    { name: 'methodical_newcomer', expected: 'read_details' }
];

async function runInterview() {
    console.log('🎤 Starting Agent Interviews...');
    console.log('================================');

    for (const agent of AGENTS) {
        console.log(`\nCreating Interview Room for: ${agent.name}...`);

        // We activate the venv and run the command
        // We use a custom goal to prompt them to act naturally in this generic context
        const goal = "Review the page content and take the action that best fits your personality.";
        const reportFile = path.join(REPORTS_DIR, `interview_${agent.name}.json`);

        const cmd = `source ${AI_BETA_TESTER_DIR}/.venv/bin/activate && ai-beta-test run "${INTERVIEW_URL}" --goal "${goal}" --agents "${agent.name}" --max-actions 5 --output "${reportFile}"`;

        try {
            const output = await execPromise(cmd);

            // Analyze Output for our [INTERVIEW_ACTION] tag
            // The tag is printed to browser console, which ai-beta-test *might* capture in logs if configured?
            // Actually, ai-beta-test (playwright) logs browser console to stdout usually.
            // Let's check if we captured the specific string.

            const actionMatch = output.match(/\[INTERVIEW_ACTION\]: (\w+)/);
            const action = actionMatch ? actionMatch[1] : 'VIDEO_TAPE_LOST (No action detected)';

            // Score
            const isMatch = action === agent.expected || (agent.name === 'chaos_gremlin' && action !== 'accepted_blindly');
            const score = isMatch ? "PASS" : "FAIL";

            console.log(`\n📋 Result for ${agent.name}:`);
            console.log(`   Action: ${action}`);
            console.log(`   Expected: ${agent.expected}`);
            console.log(`   Score: ${score}`);

        } catch (e) {
            console.error(`Error interviewing ${agent.name}:`, e.message);
        }
    }
}

function execPromise(command) {
    return new Promise((resolve, reject) => {
        // We want to capture specific shell setup e.g. zsh/bash
        exec(command, { shell: '/bin/bash', maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            // We resolve even on error to allow analysis of partial logs, but normally we check error
            if (error) {
                // It might "fail" if the agent finds a bug (which is good), so we pass stdout anyway for analysis
                resolve(stdout + stderr);
            } else {
                resolve(stdout + stderr);
            }
        });
    });
}

runInterview();
