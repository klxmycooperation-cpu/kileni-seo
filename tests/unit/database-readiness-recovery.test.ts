import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  migrate: vi.fn(),
  execute: vi.fn(),
  close: vi.fn(),
}));
vi.mock("@libsql/client", () => ({ createClient: () => ({ execute: mocks.execute, close: mocks.close }) }));
vi.mock("../../src/db/migrations", () => ({ migrateLibsqlDatabase: mocks.migrate, migrateSqliteDatabase: vi.fn() }));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("TURSO_DATABASE_URL", "libsql://readiness-test.invalid");
  vi.stubEnv("TURSO_AUTH_TOKEN", "unit-test-only");
  vi.stubEnv("KILENI_ISOLATED_PREVIEW", "");
  mocks.execute.mockReset().mockResolvedValue({ rows: [{ alive: 1 }] });
  mocks.migrate.mockReset();
});

afterEach(async () => {
  const { closeDatabaseConnections } = await import("../../src/db/client");
  await closeDatabaseConnections();
  vi.unstubAllEnvs();
});

describe("Turso initialization recovery", () => {
  it("does not permanently poison later requests after a failed initialization", async () => {
    mocks.migrate.mockRejectedValueOnce(new Error("temporary database transport failure")).mockResolvedValueOnce(undefined);
    const { database } = await import("../../src/db/client");
    await expect(database.execute("SELECT 1")).rejects.toThrow("temporary database transport failure");
    await expect(database.execute("SELECT 1")).resolves.toMatchObject({ rows: [{ alive: 1 }] });
    expect(mocks.migrate).toHaveBeenCalledTimes(2);
    expect(mocks.execute).toHaveBeenCalledTimes(1);
  });

  it("shares initialization between concurrent requests without retrying their SQL", async () => {
    let release!: () => void;
    mocks.migrate.mockImplementation(() => new Promise<void>((resolve) => { release = resolve; }));
    const { database } = await import("../../src/db/client");
    const first = database.execute("SELECT 1");
    const second = database.execute("SELECT 2");
    expect(mocks.migrate).toHaveBeenCalledTimes(1);
    expect(mocks.execute).not.toHaveBeenCalled();
    release();
    await Promise.all([first, second]);
    expect(mocks.execute).toHaveBeenCalledTimes(2);
  });
});
