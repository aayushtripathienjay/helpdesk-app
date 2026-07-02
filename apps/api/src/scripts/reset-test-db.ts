const testDatabaseUrl = process.env.DATABASE_URL;

if (!testDatabaseUrl?.includes("helpdesk_test")) {
  console.error(
    "Refusing to reset database because DATABASE_URL does not point to helpdesk_test."
  );
  process.exit(1);
}

function run(command: string[], cwd = process.cwd()) {
  const result = Bun.spawnSync(command, {
    cwd,
    env: process.env,
    stderr: "inherit",
    stdout: "inherit"
  });

  if (!result.success) {
    process.exit(result.exitCode || 1);
  }
}

run(["docker", "compose", "up", "-d", "postgres"], "../..");
run([
  "docker",
  "compose",
  "exec",
  "-T",
  "postgres",
  "dropdb",
  "-U",
  "helpdesk",
  "--if-exists",
  "--force",
  "helpdesk_test"
], "../..");
run([
  "docker",
  "compose",
  "exec",
  "-T",
  "postgres",
  "createdb",
  "-U",
  "helpdesk",
  "helpdesk_test"
], "../..");
run(["bunx", "prisma", "migrate", "deploy"]);

console.log("Reset test database: helpdesk_test");
