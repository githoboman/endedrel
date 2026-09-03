/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Endedrel — Skill Agents
 * ═══════════════════════════════════════════════════════════════════════════
 * A catalogue of worker agents with REAL, working skill functions. Each skill
 * runs with zero external API keys (Node built-ins only), so every agent
 * actually performs its task in any environment — including the live demo.
 *
 * This module is self-contained: it exports the agent metadata (for the
 * on-chain-mirror registry, pricing, and tool discovery) plus an Express
 * router that mounts one paid endpoint per agent. index.ts wires it in with a
 * few lines, reusing the existing x402 paid-route middleware and payment log.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import express, { Request, Response, NextFunction, Router } from 'express';
import crypto from 'crypto';
import { onchainReady, workerAddressForId, settleJob } from './onchain.js';

// ── Public shapes (kept structurally identical to index.ts) ────────────────

export interface SkillAgentMeta {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  category: string;
  priceUSDC: number;
  reputation: number;   // 0-100
  jobsCompleted: number;
  params: Record<string, string>;
}

/** A skill fn takes the request body and returns a JSON-serializable result. */
type SkillFn = (body: any) => Record<string, any>;

interface SkillAgentDef extends SkillAgentMeta {
  run: SkillFn;
}

// Dependencies index.ts injects so we reuse its payment machinery verbatim.
export interface SkillDeps {
  createPaidRoute: (config: { usdcAmount: number; stxAmount: number; sbtcSats: number; description: string; category: string }) => (req: Request, res: Response, next: NextFunction) => void;
  logPayment: (
    req: Request,
    endpoint: string,
    token: string,
    priceConfig: { usdcAmount: number; stxAmount: number; sbtcSats: number; description: string; category: string },
    opts?: { workerName?: string },
  ) => any;
}

// ═══════════════════════════════════════════════════════════════════════════
// Skill implementations — real logic, no external services
// ═══════════════════════════════════════════════════════════════════════════

/** JSON validate + pretty-print with precise error location. */
function jsonToolSkill(body: any) {
  const input = String(body.json ?? body.text ?? '');
  if (!input.trim()) return { error: 'Missing "json" field.' };
  try {
    const parsed = JSON.parse(input);
    const pretty = JSON.stringify(parsed, null, 2);
    const minified = JSON.stringify(parsed);
    const keys = countKeys(parsed);
    return {
      valid: true,
      pretty,
      minified,
      stats: { characters: input.length, keys, depth: jsonDepth(parsed), minifiedBytes: minified.length },
    };
  } catch (e: any) {
    const m = /position (\d+)/.exec(e.message);
    const pos = m ? parseInt(m[1], 10) : null;
    return {
      valid: false,
      error: e.message,
      errorPosition: pos,
      context: pos !== null ? input.slice(Math.max(0, pos - 20), pos + 20) : undefined,
    };
  }
}

function countKeys(v: any): number {
  if (Array.isArray(v)) return v.reduce((n, x) => n + countKeys(x), 0);
  if (v && typeof v === 'object') return Object.keys(v).length + Object.values(v).reduce((n: number, x) => n + countKeys(x), 0);
  return 0;
}
function jsonDepth(v: any): number {
  if (Array.isArray(v)) return 1 + (v.length ? Math.max(...v.map(jsonDepth)) : 0);
  if (v && typeof v === 'object') { const vals = Object.values(v); return 1 + (vals.length ? Math.max(...vals.map(jsonDepth)) : 0); }
  return 0;
}

/** Cryptographic hashing + encoding (SHA-256/512, MD5, base64, hex). */
function hashSkill(body: any) {
  const input = String(body.text ?? body.input ?? '');
  if (!input) return { error: 'Missing "text" field.' };
  const algo = String(body.algorithm ?? 'sha256').toLowerCase();
  const supported = ['sha256', 'sha512', 'sha1', 'md5'];
  if (!supported.includes(algo)) return { error: `Unsupported algorithm. Use one of: ${supported.join(', ')}` };
  return {
    algorithm: algo,
    input_length: input.length,
    hash: crypto.createHash(algo).update(input).digest('hex'),
    hashes: {
      sha256: crypto.createHash('sha256').update(input).digest('hex'),
      sha512: crypto.createHash('sha512').update(input).digest('hex'),
      md5: crypto.createHash('md5').update(input).digest('hex'),
    },
    encodings: {
      base64: Buffer.from(input, 'utf8').toString('base64'),
      hex: Buffer.from(input, 'utf8').toString('hex'),
      urlEncoded: encodeURIComponent(input),
    },
  };
}

/** Unit conversion across length, mass, temperature, and data. */
const UNIT_TABLE: Record<string, Record<string, number>> = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, ft: 0.3048, in: 0.0254, yd: 0.9144 },
  mass: { g: 1, kg: 1000, mg: 0.001, lb: 453.592, oz: 28.3495, t: 1_000_000 },
  data: { b: 1, kb: 1024, mb: 1048576, gb: 1073741824, tb: 1099511627776 },
};
function unitSkill(body: any) {
  const value = Number(body.value);
  const from = String(body.from ?? '').toLowerCase();
  const to = String(body.to ?? '').toLowerCase();
  if (!isFinite(value) || !from || !to) return { error: 'Provide numeric "value", "from", and "to" units.' };
  // Temperature is affine, handled specially.
  const temp = ['c', 'f', 'k'];
  if (temp.includes(from) && temp.includes(to)) {
    const c = from === 'c' ? value : from === 'f' ? (value - 32) * 5 / 9 : value - 273.15;
    const out = to === 'c' ? c : to === 'f' ? c * 9 / 5 + 32 : c + 273.15;
    return { value, from, to, result: round(out), dimension: 'temperature' };
  }
  const dim = Object.keys(UNIT_TABLE).find(d => UNIT_TABLE[d][from] != null && UNIT_TABLE[d][to] != null);
  if (!dim) return { error: `No shared dimension for "${from}" → "${to}".` };
  const result = value * UNIT_TABLE[dim][from] / UNIT_TABLE[dim][to];
  return { value, from, to, result: round(result), dimension: dim };
}
function round(n: number) { return Math.round(n * 1e6) / 1e6; }

/** Regex tester — compiles a pattern, returns all matches + groups. */
function regexSkill(body: any) {
  const pattern = String(body.pattern ?? '');
  const text = String(body.text ?? '');
  const flags = String(body.flags ?? 'g');
  if (!pattern) return { error: 'Missing "pattern" field.' };
  try {
    const re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
    const matches = [...text.matchAll(re)].map(m => ({ match: m[0], index: m.index, groups: m.slice(1) }));
    return { pattern, flags, matchCount: matches.length, matches: matches.slice(0, 100), isMatch: matches.length > 0 };
  } catch (e: any) {
    return { error: `Invalid regex: ${e.message}` };
  }
}

/** Text analytics — words, sentences, reading time, top terms. */
function textStatsSkill(body: any) {
  const text = String(body.text ?? '');
  if (!text.trim()) return { error: 'Missing "text" field.' };
  const words = text.trim().split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chars = text.length;
  const freq: Record<string, number> = {};
  for (const w of words) {
    const k = w.toLowerCase().replace(/[^a-z0-9']/g, '');
    if (k.length > 3) freq[k] = (freq[k] || 0) + 1;
  }
  const topTerms = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([term, count]) => ({ term, count }));
  return {
    characters: chars,
    charactersNoSpaces: text.replace(/\s/g, '').length,
    words: words.length,
    sentences: sentences.length,
    paragraphs: text.split(/\n\s*\n/).filter(p => p.trim()).length,
    avgWordsPerSentence: sentences.length ? round(words.length / sentences.length) : 0,
    readingTimeMinutes: round(words.length / 200),
    topTerms,
  };
}

/** Password/entropy strength estimator (Shannon-ish charset entropy). */
function entropySkill(body: any) {
  const pw = String(body.password ?? body.text ?? '');
  if (!pw) return { error: 'Missing "password" field.' };
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 33;
  const bits = pw.length * Math.log2(pool || 1);
  const strength = bits < 28 ? 'Very Weak' : bits < 36 ? 'Weak' : bits < 60 ? 'Reasonable' : bits < 128 ? 'Strong' : 'Very Strong';
  // crack-time estimate at 1e10 guesses/sec
  const combos = Math.pow(pool || 1, pw.length);
  const seconds = combos / 1e10;
  return {
    length: pw.length,
    charsetSize: pool,
    entropyBits: round(bits),
    strength,
    estimatedCrackTime: humanTime(seconds),
    suggestions: bits < 60 ? ['Increase length to 16+', 'Mix upper, lower, digits, symbols'] : ['Password strength is good'],
  };
}
function humanTime(s: number): string {
  if (s < 1) return 'instant';
  const units: [number, string][] = [[60, 'seconds'], [60, 'minutes'], [24, 'hours'], [365, 'days'], [1000, 'years']];
  let v = s, label = 'seconds';
  for (const [div, name] of units) { if (v < div) { label = name; break; } v /= div; label = name; }
  return `${v < 1000 ? round(v) : v.toExponential(2)} ${label}`;
}

/** ID/token generator — UUID v4, nanoid-style, api keys, hex. */
function idGenSkill(body: any) {
  const count = Math.min(Math.max(parseInt(body.count) || 1, 1), 50);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const nano = () => Array.from(crypto.randomBytes(21)).map(b => alphabet[b % alphabet.length]).join('');
  const gen = (n: number, fn: () => string) => Array.from({ length: n }, fn);
  return {
    count,
    uuidv4: gen(count, () => crypto.randomUUID()),
    nanoid: gen(count, nano),
    apiKey: gen(count, () => 'sk_' + crypto.randomBytes(24).toString('hex')),
    hex32: gen(count, () => crypto.randomBytes(16).toString('hex')),
  };
}

/** Color converter — hex ⇄ rgb ⇄ hsl. */
function colorSkill(body: any) {
  const input = String(body.color ?? '').trim();
  if (!input) return { error: 'Missing "color" field (e.g. "#4b32c3" or "75,92,255").' };
  let r: number, g: number, b: number;
  const hex = /^#?([0-9a-f]{6})$/i.exec(input);
  if (hex) {
    const n = parseInt(hex[1], 16); r = (n >> 16) & 255; g = (n >> 8) & 255; b = n & 255;
  } else {
    const parts = input.split(/[,\s]+/).map(Number);
    if (parts.length < 3 || parts.some(x => !isFinite(x))) return { error: 'Provide hex (#RRGGBB) or "r,g,b".' };
    [r, g, b] = parts;
  }
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  const hsl = rgbToHsl(r, g, b);
  return {
    hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
    rgb: `rgb(${r}, ${g}, ${b})`,
    hsl: `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`,
    values: { r, g, b, h: hsl[0], s: hsl[1], l: hsl[2] },
    relativeLuminance: round(0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255)),
  };
}
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/** Base-N number converter (2/8/10/16 + arbitrary 2-36). */
function baseConvertSkill(body: any) {
  const value = String(body.value ?? '').trim();
  const fromBase = parseInt(body.fromBase) || 10;
  if (!value) return { error: 'Missing "value" field.' };
  if (fromBase < 2 || fromBase > 36) return { error: 'fromBase must be 2-36.' };
  const n = parseInt(value, fromBase);
  if (isNaN(n)) return { error: `"${value}" is not valid in base ${fromBase}.` };
  return {
    input: value, fromBase, decimal: n,
    binary: n.toString(2), octal: n.toString(8), hexadecimal: n.toString(16), base36: n.toString(36),
    bytes: n.toString(2).length,
  };
}

/** Timestamp / date utilities. */
function timeSkill(body: any) {
  const input = body.timestamp ?? body.date;
  let d: Date;
  if (input == null || input === '') d = new Date();
  else if (/^\d+$/.test(String(input))) d = new Date(Number(input) * (String(input).length <= 10 ? 1000 : 1));
  else d = new Date(String(input));
  if (isNaN(d.getTime())) return { error: 'Unparseable date/timestamp.' };
  return {
    iso8601: d.toISOString(),
    unixSeconds: Math.floor(d.getTime() / 1000),
    unixMillis: d.getTime(),
    utc: d.toUTCString(),
    dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()],
    relative: relativeTime(d.getTime() - Date.now()),
  };
}
function relativeTime(ms: number): string {
  const abs = Math.abs(ms), suffix = ms < 0 ? 'ago' : 'from now';
  const table: [number, string][] = [[1000, 'ms'], [60, 'seconds'], [60, 'minutes'], [24, 'hours'], [365, 'days']];
  let v = abs, label = 'ms';
  for (const [div, name] of table) { if (v < div) { label = name; break; } v /= div; label = name; }
  return `${round(v)} ${label} ${suffix}`;
}

/** Simple financial calc — compound interest / loan payment. */
function financeSkill(body: any) {
  const principal = Number(body.principal);
  const rate = Number(body.annualRatePct);
  const years = Number(body.years);
  if (![principal, rate, years].every(isFinite)) return { error: 'Provide numeric principal, annualRatePct, years.' };
  const r = rate / 100;
  const compound = principal * Math.pow(1 + r, years);
  const monthlyRate = r / 12, months = years * 12;
  const loanPayment = monthlyRate === 0 ? principal / months : principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
  return {
    principal, annualRatePct: rate, years,
    compoundInterest: { futureValue: round(compound), interestEarned: round(compound - principal) },
    loan: { monthlyPayment: round(loanPayment), totalPaid: round(loanPayment * months), totalInterest: round(loanPayment * months - principal) },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Agent catalogue
// ═══════════════════════════════════════════════════════════════════════════

export const SKILL_AGENTS: SkillAgentDef[] = [
  { id: 'json-agent', name: 'JSON Architect', description: 'Validates, formats, and analyzes JSON — pinpoints syntax errors, computes depth/key stats, minifies.', endpoint: '/api/skill/json', category: 'dev', priceUSDC: 0.002, reputation: 96, jobsCompleted: 412, params: { json: 'string (required)' }, run: jsonToolSkill },
  { id: 'hash-agent', name: 'CryptoHash Engine', description: 'Cryptographic hashing (SHA-256/512, MD5) and encoding (base64/hex/url) via Node crypto.', endpoint: '/api/skill/hash', category: 'security', priceUSDC: 0.003, reputation: 98, jobsCompleted: 689, params: { text: 'string (required)', algorithm: 'sha256|sha512|sha1|md5 (optional)' }, run: hashSkill },
  { id: 'unit-agent', name: 'UnitConverter Pro', description: 'Converts length, mass, temperature, and data units with high precision.', endpoint: '/api/skill/convert', category: 'compute', priceUSDC: 0.001, reputation: 93, jobsCompleted: 534, params: { value: 'number (required)', from: 'string (required)', to: 'string (required)' }, run: unitSkill },
  { id: 'regex-agent', name: 'RegexMaster', description: 'Compiles and tests regular expressions, returning all matches and capture groups.', endpoint: '/api/skill/regex', category: 'dev', priceUSDC: 0.003, reputation: 91, jobsCompleted: 278, params: { pattern: 'string (required)', text: 'string (required)', flags: 'string (optional)' }, run: regexSkill },
  { id: 'textstats-agent', name: 'TextAnalytica', description: 'Computes word/sentence counts, reading time, and top-term frequency for any text.', endpoint: '/api/skill/text-stats', category: 'nlp', priceUSDC: 0.002, reputation: 89, jobsCompleted: 356, params: { text: 'string (required)' }, run: textStatsSkill },
  { id: 'entropy-agent', name: 'PassGuard Auditor', description: 'Estimates password entropy, strength tier, and crack-time from charset analysis.', endpoint: '/api/skill/password', category: 'security', priceUSDC: 0.002, reputation: 94, jobsCompleted: 421, params: { password: 'string (required)' }, run: entropySkill },
  { id: 'idgen-agent', name: 'TokenForge', description: 'Generates cryptographically-secure UUIDs, nanoids, API keys, and hex tokens.', endpoint: '/api/skill/generate-id', category: 'security', priceUSDC: 0.001, reputation: 95, jobsCompleted: 612, params: { count: 'number (optional, max 50)' }, run: idGenSkill },
  { id: 'color-agent', name: 'ChromaConvert', description: 'Converts colors between hex, RGB, and HSL and computes relative luminance.', endpoint: '/api/skill/color', category: 'design', priceUSDC: 0.001, reputation: 90, jobsCompleted: 244, params: { color: 'string (required) — "#RRGGBB" or "r,g,b"' }, run: colorSkill },
  { id: 'base-agent', name: 'RadixShift', description: 'Converts numbers between binary, octal, decimal, hex, and any base 2-36.', endpoint: '/api/skill/base-convert', category: 'compute', priceUSDC: 0.001, reputation: 92, jobsCompleted: 301, params: { value: 'string (required)', fromBase: 'number (optional, default 10)' }, run: baseConvertSkill },
  { id: 'time-agent', name: 'ChronoSync', description: 'Parses and converts timestamps across ISO-8601, Unix, UTC, and relative formats.', endpoint: '/api/skill/time', category: 'data', priceUSDC: 0.001, reputation: 88, jobsCompleted: 199, params: { timestamp: 'string|number (optional, default now)' }, run: timeSkill },
  { id: 'finance-agent', name: 'FinCalc Advisor', description: 'Computes compound-interest growth and loan amortization payments.', endpoint: '/api/skill/finance', category: 'finance', priceUSDC: 0.004, reputation: 93, jobsCompleted: 187, params: { principal: 'number (required)', annualRatePct: 'number (required)', years: 'number (required)' }, run: financeSkill },
];

// ═══════════════════════════════════════════════════════════════════════════
// Router factory — mounts one paid endpoint per skill agent
// ═══════════════════════════════════════════════════════════════════════════

export function buildSkillRouter(deps: SkillDeps): Router {
  const router = express.Router();

  for (const agent of SKILL_AGENTS) {
    const priceConfig = {
      usdcAmount: agent.priceUSDC,
      stxAmount: agent.priceUSDC,
      sbtcSats: 0,
      description: agent.description,
      category: agent.category,
    };

    router.post(agent.endpoint, deps.createPaidRoute(priceConfig), async (req: Request, res: Response) => {
      const paymentEntry = deps.logPayment(req, agent.endpoint, 'USDC', priceConfig, { workerName: agent.name });
      let result: Record<string, any>;
      try {
        result = agent.run(req.body || {});
      } catch (e: any) {
        result = { error: `Skill execution failed: ${e?.message || e}` };
      }

      // On-chain settlement: if the client hired this agent on-chain and passed
      // the confirmed jobId, release escrow by calling completeJob from the
      // worker's key. The skill result is returned regardless of settlement.
      let settlement: { txHash: string; explorerUrl: string } | null = null;
      const rawJobId = req.body?.jobId ?? req.headers['x-job-id'];
      if (!result.error && rawJobId != null && onchainReady()) {
        try {
          const s = await settleJob(agent.id, BigInt(String(rawJobId)));
          if (s) settlement = { txHash: s.txHash, explorerUrl: s.explorerUrl };
        } catch (e: any) {
          console.warn(`[skill:${agent.id}] settlement failed for job ${rawJobId}: ${e?.message}`);
        }
      }

      const httpStatus = result.error ? 400 : 200;
      res.status(httpStatus).json({
        ...result,
        source: `${agent.name} Agent`,
        agentId: agent.id,
        onchainAddress: workerAddressForId(agent.id),  // the address a user pays to hire this agent
        settlement,                                     // completeJob tx, if escrow was released
        payment: paymentEntry ? {
          transaction: settlement?.txHash || paymentEntry.transaction,
          token: paymentEntry.token,
          amount: paymentEntry.amount,
          explorerUrl: settlement?.explorerUrl || paymentEntry.explorerUrl,
        } : null,
      });
    });
  }

  return router;
}

/** Registry entries for the on-chain-mirror registry in index.ts. */
export function skillRegistryEntries(serverAddress: string) {
  return SKILL_AGENTS.map((a, i) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    // Real on-chain worker address (where the user's USDC is paid) when the
    // on-chain bridge is configured; falls back to the server address otherwise.
    address: workerAddressForId(a.id) || serverAddress,
    onchainAddress: workerAddressForId(a.id) || null,
    endpoint: a.endpoint,
    category: a.category,
    priceSTX: a.priceUSDC,
    priceSats: Math.round(a.priceUSDC * 100000000),
    reputation: a.reputation,
    jobsCompleted: a.jobsCompleted,
    jobsFailed: Math.floor(a.jobsCompleted * 0.02),
    totalEarned: round(a.jobsCompleted * a.priceUSDC),
    isActive: true,
    efficiency: (a.reputation * a.reputation) / (a.priceUSDC * 10000),
  }));
}

/** Tool-discovery entries for GET /api/tools. */
export function skillToolEntries() {
  return SKILL_AGENTS.map(a => ({
    id: a.id,
    name: a.name,
    endpoint: a.endpoint,
    method: 'POST' as const,
    price: { USDC: a.priceUSDC, STX: a.priceUSDC, sBTC_sats: 0 },
    category: a.category,
    description: a.description,
    reputation: a.reputation,
    jobsCompleted: a.jobsCompleted,
    efficiency: (a.reputation * a.reputation) / (a.priceUSDC * 10000),
    canHireSubAgents: false,
    params: a.params,
    isExternal: false,
    isSkillAgent: true,
    onchainAddress: workerAddressForId(a.id) || null,  // pay this address to hire
  }));
}
