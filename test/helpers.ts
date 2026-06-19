import * as path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path to a fixture project under test/fixtures. */
export function fixture(name: string): string {
  return path.join(here, "fixtures", name);
}
