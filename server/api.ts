import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { generateICalendarFeed, generateAllConferencesCalendarFeed } from './calendarGenerator.js';

// Get __dirname equivalent
const __dirname = path.dirname(new URL(import.meta.url).pathname);

// Initialize Express app
const app = express();
// API port priority:
// 1. API_PORT env var (explicitly set for API)
// 2. PORT env var (for backward compatibility, but should be unused in Docker)
// 3. Default 3001
const PORT = parseInt(process.env.API_PORT || process.env.PORT || '3001', 10);

// Enable CORS
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Cache for loaded conferences
let conferencesCache: Map<string, any> = new Map();
let allConferencesArray: any[] = [];

/**
 * Load all conference data from YAML files
 */
function loadAllConferences() {
  try {
    conferencesCache.clear();
    allConferencesArray = [];

    // Try multiple possible paths for the conferences directory
    // When running from dist/, we need to go up to the root level
    const possiblePaths = [
      path.join(__dirname, './src/data/conferences'),  // Development (ts-node)
      path.join(__dirname, '../src/data/conferences'),  // After compilation in dist/
      path.join(__dirname, '../../src/data/conferences'), // Fallback
      path.join(process.cwd(), 'src/data/conferences'),  // From cwd
    ];

    let conferencesDir = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        conferencesDir = p;
        break;
      }
    }

    if (!conferencesDir) {
      console.warn(`Conferences directory not found. Tried: ${possiblePaths.join(', ')}`);
      return;
    }

    const files = fs.readdirSync(conferencesDir).filter(f => f.endsWith('.yml'));

    files.forEach(file => {
      try {
        const filePath = path.join(conferencesDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const data = yaml.load(fileContent) as any[];

        if (Array.isArray(data)) {
          data.forEach(conference => {
            if (conference && conference.id) {
              conferencesCache.set(conference.id, conference);
              allConferencesArray.push(conference);
            }
          });
        }
      } catch (error) {
        console.error(`Error reading file ${file}:`, error);
      }
    });

    console.log(`✓ Loaded ${allConferencesArray.length} conferences from ${files.length} YAML files`);
  } catch (error) {
    console.error('Error loading conferences:', error);
  }
}

// Load conferences on startup
loadAllConferences();

/**
 * Cache refresh check - reload if needed
 */
const CACHE_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
setInterval(() => {
  loadAllConferences();
}, CACHE_REFRESH_INTERVAL);

/**
 * General calendar API endpoint - Get .ics file with all upcoming deadlines
 * Must be defined BEFORE the parameterized route to avoid routing conflicts
 */
app.get('/api/calendar/all.ics', (req: Request, res: Response) => {
  try {
    // Get all conferences from cache
    const allConferences = Array.from(conferencesCache.values());

    if (allConferences.length === 0) {
      return res.status(503).json({
        error: 'No conferences loaded',
        message: 'Please try again later',
      });
    }

    // Generate iCalendar content for all conferences
    const icsContent = generateAllConferencesCalendarFeed(allConferences);

    // Set proper headers for iCalendar file
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="ai-deadlines-all-conferences.ics"`
    );
    res.setHeader('Cache-Control', 'max-age=3600, public'); // Cache for 1 hour
    res.status(200).send(icsContent);
  } catch (error) {
    console.error('Error generating all conferences calendar feed:', error);
    res.status(500).json({
      error: 'Failed to generate calendar feed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Calendar API endpoint - Get .ics file for a specific conference
 */
app.get('/api/calendar/:conferenceId.ics', (req: Request, res: Response) => {
  try {
    const { conferenceId } = req.params;

    // Find the conference by ID
    const conference = conferencesCache.get(conferenceId);

    if (!conference) {
      return res.status(404).json({
        error: 'Conference not found',
        conferenceId,
        availableConferences: Array.from(conferencesCache.keys()).slice(0, 5),
      });
    }

    // Generate iCalendar content
    const icsContent = generateICalendarFeed(conference);

    // Set proper headers for iCalendar file
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${conference.title.toLowerCase().replace(/\s+/g, '-')}-deadlines.ics"`
    );
    res.setHeader('Cache-Control', 'max-age=3600, public'); // Cache for 1 hour
    res.status(200).send(icsContent);
  } catch (error) {
    console.error('Error generating calendar feed:', error);
    res.status(500).json({
      error: 'Failed to generate calendar feed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    conferencesCount: allConferencesArray.length,
    cachedConferences: conferencesCache.size,
  });
});

/**
 * List all available conferences
 */
app.get('/api/conferences', (req: Request, res: Response) => {
  try {
    const conferences = Array.from(conferencesCache.values()).map(conf => ({
      id: conf.id,
      title: conf.title,
      year: conf.year,
      deadline: conf.deadline,
    }));

    res.json({
      count: conferences.length,
      conferences,
    });
  } catch (error) {
    console.error('Error listing conferences:', error);
    res.status(500).json({ error: 'Failed to list conferences' });
  }
});

/**
 * 404 handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

/**
 * Error handler
 */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🗓️  Calendar API server running`);
  console.log(`📍 http://0.0.0.0:${PORT}`);
  console.log(`🏥 Health check: http://0.0.0.0:${PORT}/api/health`);
  console.log(`📋 List conferences: http://0.0.0.0:${PORT}/api/conferences`);
  console.log(`\n`);
});

export default app;
