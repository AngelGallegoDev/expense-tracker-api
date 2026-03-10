import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);

function commandExists(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { stdio: 'ignore' });
  return result.status === 0;
}

function resolveComposeCommand() {
  if (commandExists('docker', ['compose', 'version'])) {
    return { command: 'docker', prefix: ['compose'] };
  }

  if (
    commandExists('docker-compose', ['version']) ||
    commandExists('docker-compose', ['--version'])
  ) {
    return { command: 'docker-compose', prefix: [] };
  }

  return null;
}

const compose = resolveComposeCommand();

if (!compose) {
  console.error(
    'Docker Compose no está disponible. Instala/activa `docker compose` o `docker-compose`.',
  );
  process.exit(1);
}

const result = spawnSync(compose.command, [...compose.prefix, ...args], {
  stdio: 'inherit',
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

if (result.error) {
  console.error(result.error.message);
}

process.exit(1);
