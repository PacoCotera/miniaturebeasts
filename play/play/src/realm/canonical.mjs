// The realm's bytes of the fixed written form (the form itself is core/base/written.mjs).
import { canonical } from "../../../core/base/written.mjs";
import { utf8 } from "./b64.mjs";

export const canonicalBytes = (x) => utf8(canonical(x));
