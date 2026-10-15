import { execFileSync } from 'node:child_process'
import path from 'node:path'

export default async function globalTeardown() {
  const projectRoot = path.resolve(process.cwd(), '..')

  const cleanupScript = path.join(
    projectRoot,
    'backend/tests/cleanup_playwright.py'
  )

  const python =
    process.env.PYTHON_PATH ??
    path.join(projectRoot, '.venv/bin/python')

  execFileSync(python, [cleanupScript], {
    cwd: projectRoot,
    env: {
      ...process.env,
      DB_NAME: 'mission_tracker_test',
    },
    stdio: 'inherit',
  })
}