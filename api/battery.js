// In-memory state for serverless instance (persists across warm invocations)
let batteryState = {
  level: null,
  isCharging: true,
  updatedAt: null,
  alarmThreshold: 100,
  shouldRing: false,
};

export default function handler(req, res) {
  // Safe CORS headers without invalid credentials wildcard
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Handle reporting battery (from iPhone Shortcut or Web App)
  if (req.method === 'POST' || (req.method === 'GET' && req.query.level)) {
    const rawLevel = req.query.level ?? (req.body && req.body.level);
    const rawThreshold = req.query.threshold ?? (req.body && req.body.threshold);

    if (rawLevel !== undefined && rawLevel !== null) {
      const parsed = parseInt(String(rawLevel).trim(), 10);
      if (isNaN(parsed)) {
        return res.status(400).json({ ok: false, error: 'Invalid level parameter. Must be an integer 0-100.' });
      }

      batteryState.level = Math.min(100, Math.max(0, parsed));
      batteryState.updatedAt = Date.now();

      if (rawThreshold !== undefined && rawThreshold !== null) {
        const parsedThresh = parseInt(String(rawThreshold).trim(), 10);
        if (!isNaN(parsedThresh)) {
          batteryState.alarmThreshold = Math.min(100, Math.max(50, parsedThresh));
        }
      }

      batteryState.shouldRing = batteryState.level >= batteryState.alarmThreshold;

      return res.status(200).json({
        ok: true,
        level: batteryState.level,
        alarmThreshold: batteryState.alarmThreshold,
        shouldRing: batteryState.shouldRing,
        message: batteryState.shouldRing
          ? 'Battery full! Please unplug charger.'
          : 'Battery level updated.',
      });
    }
  }

  // Handle fetching current status
  return res.status(200).json({
    ok: true,
    ...batteryState,
    serverTime: Date.now(),
  });
}
