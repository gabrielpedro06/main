// GET /api/nif?q=<NIF> — ver api/_lib/nif.js
import nifLookup from "./_lib/nif.js";

export const config = { runtime: "nodejs", maxDuration: 15 };

export default function handler(req, res) {
  return nifLookup(req, res);
}
