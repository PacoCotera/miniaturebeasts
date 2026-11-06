#!/usr/bin/env node
// Prints the roster stage's rows as JSON (the studio's Library and `wb roster` read it): node tools/roster-rows.mjs [standsDir]
import { rosterRows } from "../framework/library-roster.mjs";

const rows = rosterRows({ standsDir: process.argv[2] });
process.stdout.write(JSON.stringify(rows) + "\n");
