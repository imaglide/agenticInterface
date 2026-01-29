import type { TestScenario, ScenarioMeeting, ScenarioCalendarEvent, ScenarioIntent } from './types';

/**
 * A simple seeded pseudo-random number generator (Linear Congruential Generator).
 * Used to ensure deterministic scenario generation from a seed.
 */
class SeededRandom {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    /**
     * Returns a random number between 0 (inclusive) and 1 (exclusive).
     */
    next(): number {
        // LCG parameters (glibc values)
        const a = 1103515245;
        const c = 12345;
        const m = 2147483648;
        this.seed = (a * this.seed + c) % m;
        return this.seed / m;
    }

    /**
     * Returns a random integer between min (inclusive) and max (inclusive).
     */
    nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    /**
     * Returns a random element from an array.
     */
    pick<T>(array: T[]): T {
        return array[this.nextInt(0, array.length - 1)];
    }

    /**
     * Returns true with the given probability (0-1).
     */
    bool(probability: number = 0.5): boolean {
        return this.next() < probability;
    }

    /**
     * Returns a random subset of an array.
     */
    sample<T>(array: T[], count: number): T[] {
        const shuffled = [...array].sort(() => 0.5 - this.next());
        return shuffled.slice(0, count);
    }
}

// Data pools for fuzzing
const MEETING_TITLES = [
    'Strategy Sync', 'Weekly Update', 'Client Kickoff', '1:1', 'Design Review',
    'Code Audit', 'Q4 Planning', 'Bug Bash', 'Retrospective', 'All Hands',
    'Marketing Standup', 'Sales Pipeline', 'Product Demo', 'Architecture Deep Dive'
];

const ATTENDEE_NAMES = [
    'Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace', 'Heidi',
    'Ivan', 'Judy', 'Mallory', 'Oscar', 'Peggy', 'Sybil', 'Trent', 'Victor'
];

const GOAL_TEMPLATES = [
    'Review {{topic}}', 'Decide on {{topic}}', 'Plan next steps for {{topic}}',
    'Align on {{topic}} timeline', 'Identify risks in {{topic}}'
];

const TOPICS = [
    'migration', 'launch', 'budget', 'hiring', 'roadmap', 'Q3 goals', 'backend refactor',
    'frontend redesign', 'mobile app', 'analytics'
];

const MARKER_LABELS = [
    'Approve budget', 'Delay launch', 'Hire contractor', 'Investigate outage',
    'Update documentation', 'Schedule follow-up', 'contact vendor', 'Risk: missing dependency'
];

/**
 * Generates a completely random but valid TestScenario based on a seed.
 */
export function generateRandomScenario(seed: number, complexity: 'low' | 'medium' | 'high' = 'medium'): TestScenario {
    const rng = new SeededRandom(seed);
    const scenarioId = `fuzz-${seed}-${complexity}`;

    // Config based on complexity
    const config = {
        meetingCount: complexity === 'low' ? rng.nextInt(0, 3) : complexity === 'medium' ? rng.nextInt(2, 6) : rng.nextInt(5, 15),
        eventCount: complexity === 'low' ? rng.nextInt(0, 3) : complexity === 'medium' ? rng.nextInt(2, 8) : rng.nextInt(8, 20),
        intentCount: complexity === 'low' ? rng.nextInt(0, 2) : complexity === 'medium' ? rng.nextInt(2, 5) : rng.nextInt(5, 12),
        chaosProbability: complexity === 'high' ? 0.3 : 0.05
    };

    const meetings: ScenarioMeeting[] = [];
    const calendarEvents: ScenarioCalendarEvent[] = [];
    const intents: ScenarioIntent[] = [];

    // 1. Generate Meetings
    for (let i = 0; i < config.meetingCount; i++) {
        // Distribute meetings around "now" (0)
        const startMinutes = rng.nextInt(-240, 240); // +/- 4 hours
        const durationMinutes = rng.pick([15, 30, 45, 60, 90, 120]);

        // Generate goal
        const topic = rng.pick(TOPICS);
        const goalText = rng.pick(GOAL_TEMPLATES).replace('{{topic}}', topic);

        // Generate attendees
        const attendeeCount = rng.nextInt(1, 5);
        const attendees = rng.sample(ATTENDEE_NAMES, attendeeCount);

        // Generate markers
        const markers: ScenarioMeeting['markers'] = [];
        const markerCount = rng.nextInt(0, 5);
        for (let m = 0; m < markerCount; m++) {
            markers.push({
                type: rng.pick(['decision', 'action', 'risk', 'question']),
                label: rng.bool(config.chaosProbability) ? generateChaosString(rng) : rng.pick(MARKER_LABELS),
                offsetMinutes: rng.nextInt(0, durationMinutes)
            });
        }

        meetings.push({
            id: `mtg-fuzz-${i}`,
            title: rng.bool(config.chaosProbability) ? generateChaosString(rng) : rng.pick(MEETING_TITLES),
            startMinutes,
            durationMinutes,
            attendees,
            goal: goalText,
            goals: rng.bool() ? [{ text: goalText, achieved: rng.bool() }] : [],
            markers,
            synthesisCompleted: startMinutes + durationMinutes < -10 && rng.bool(0.8) // Likely completed if ended
        });

        // Also add corresponding calendar event usually
        if (rng.bool(0.9)) {
            calendarEvents.push({
                id: `cal-fuzz-${i}`,
                title: meetings[i].title,
                startMinutes,
                durationMinutes,
                iCalUid: `ical-fuzz-${i}`,
                attendees: attendees.map(name => ({ email: `${name.toLowerCase()}@example.com`, name, responseStatus: 'accepted' }))
            });
        }
    }

    // 2. Generate Extra Calendar Events (Noise)
    for (let i = 0; i < config.eventCount; i++) {
        calendarEvents.push({
            id: `cal-noise-${i}`,
            title: rng.pick(MEETING_TITLES) + ' (Noise)',
            startMinutes: rng.nextInt(-300, 300),
            durationMinutes: rng.pick([15, 30, 60]),
            iCalUid: `ical-noise-${i}`
        });
    }

    // 3. Generate Intents
    for (let i = 0; i < config.intentCount; i++) {
        intents.push({
            scope: 'session',
            type: rng.pick(['goal', 'action', 'note']),
            text: rng.bool(config.chaosProbability) ? generateChaosString(rng) : `Remember to ${rng.pick(TOPICS)}`,
            status: 'open'
        });
    }

    return {
        id: scenarioId,
        name: `Fuzzed Scenario (Seed ${seed})`,
        description: `Procedurally generated scenario with ${config.meetingCount} meetings and ${config.chaosProbability * 100}% chaos.`,
        tags: ['fuzz', `complexity-${complexity}`],
        meetings,
        calendarEvents,
        intents,
        // Expected mode is tricky for random data, but we can guess based on nearest meeting
        expectedMode: 'neutral_intent'
    };
}

/**
 * Generates nasty strings for chaos testing.
 */
function generateChaosString(rng: SeededRandom): string {
    const nastyStrings = [
        '', // Empty
        '   ', // Whitespace
        'Very Long Title '.repeat(20), // Length
        '🎉 🔥 🚀 🙃', // Emojis
        '<script>alert(1)</script>', // Injection
        'Robert\'); DROP TABLE Students;--', // SQLi
        '\u202Ereversed text\u202C' // RTL override
    ];
    return rng.pick(nastyStrings);
}
