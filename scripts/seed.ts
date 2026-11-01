import { generateOrders } from "../src/lib/seed";
// Pure deterministic output only; this script does not connect to a database.
process.stdout.write(JSON.stringify(generateOrders(), null, 2) + "\n");
