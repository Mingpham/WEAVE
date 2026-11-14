/* global document */
export default async (page) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const root = 'D:/Android/WEAVE/output/playwright/weave-ui';
  const base = 'http://127.0.0.1:8081';
  const screens = [
    ['01', 'Welcome', '/'],
    ['02', 'My-Events', '/events'],
    ['03', 'Join-Code', '/join'],
    ['04', 'Consent', '/join/consent'],
    ['05', 'Join-Profile', '/join/profile'],
    ['06', 'Waiting', 'waiting'],
    ['07', 'Create-Event', '/create-event'],
    ['08', 'Plan-Studio', 'plan'],
    ['09', 'Draft-Editor', 'draft-item'],
    ['10', 'Plan-Review', 'plan-review'],
    ['11', 'Command-Center', 'command'],
    ['12', 'Task-Board', 'tasks'],
    ['13', 'Task-Detail', 'task'],
    ['14', 'Assign', 'assign'],
    ['15', 'Resources', 'resources'],
    ['16', 'People', 'people'],
    ['17', 'Timeline', 'timeline'],
    ['18', 'Settings', 'settings'],
    ['19', 'Close-Report', 'close'],
    ['20', 'Settlement', 'settlement'],
    ['21', 'Submission-Review', 'submission-review'],
    ['22', 'Incident', 'incident'],
    ['23', 'Manual-Decision', 'manual'],
    ['24', 'New-Incident', 'new-incident'],
    ['25', 'Participant-Home', 'home'],
    ['26', 'Inbox', 'inbox'],
    ['27', 'Me', 'me'],
    ['28', 'Composer', 'composer'],
    ['29', 'Report-Problem', 'report'],
    ['30', 'Answer-Probe', 'probe'],
    ['31', 'Resource-Report', 'resource-report'],
    ['32', 'Offer', 'offer'],
    ['33', 'Evidence-Detail', 'evidence'],
    ['34', 'Sign-In', '/auth'],
  ];
  const results = [];
  for (const [id, name, route] of screens) {
    const isProject = !route.startsWith('/');
    const url = base + (isProject ? '/p/not-connected/' + route : route);
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      const text = await page.locator('body').innerText();
      const blocked =
        /not connected|waiting for integration|needs a connected|connect your|connect the|not available|not found|not connected|not yet connected|couldn.t|unavailable|sign in to continue/i.test(
          text,
        ) ||
        (isProject && !page.url().includes('/p/'));
      const file = `SCR-${id}-${name}${blocked ? '-BLOCKED' : ''}.png`;
      await page.screenshot({ path: root + '/' + file, fullPage: true });
      results.push({
        id,
        name,
        requestedUrl: url,
        finalUrl: page.url(),
        file,
        blocked,
        isProject,
        text: text.slice(0, 900),
      });
    } catch (error) {
      const file = `SCR-${id}-${name}-ERROR.png`;
      await page.screenshot({ path: root + '/' + file, fullPage: true }).catch(() => {});
      results.push({
        id,
        name,
        requestedUrl: url,
        file,
        blocked: true,
        error: String(error).slice(0, 400),
      });
    }
  }
  console.log(JSON.stringify(results));
};
