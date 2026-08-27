import fs from 'node:fs';
import path from 'node:path';

describe('GitHub Pages deployment workflow', () => {
  test('enables Pages when configuring a repository without an existing Pages site', () => {
    const workflowPath = path.resolve(process.cwd(), '.github/workflows/deploy.yml');
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    expect(workflow).toMatch(
      /uses: actions\/configure-pages@v6\s+with:\s+enablement: true/,
    );
  });

  test('builds asset URLs from the custom-domain root', () => {
    const workflowPath = path.resolve(process.cwd(), '.github/workflows/deploy.yml');
    const workflow = fs.readFileSync(workflowPath, 'utf8');

    expect(workflow).toMatch(/VITE_BASE_PATH: \/\n/);
  });
});
