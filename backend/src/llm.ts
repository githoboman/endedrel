/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Endedrel — LLM Provider (NVIDIA NIM → Groq → Gemini → null)
 * ═══════════════════════════════════════════════════════════════════════════
 * A single chat() helper the agents call. It tries providers in order of
 * preference and returns the first success, or null if none are configured
 * (callers then use their deterministic fallback, so agents always respond).
 *
 * NVIDIA NIM is OpenAI-compatible, so we reuse the groq-sdk client (also
 * OpenAI-shaped) pointed at integrate.api.nvidia.com — no new dependency.
 *
 * Keys are read from env ONLY. Never hardcode a key.
 *   NVIDIA_API_KEY=nvapi-...        NVIDIA_MODEL=nvidia/nemotron-3-ultra-550b-a55b (optional)
 *   GROQ_API_KEY=...                GEMINI_API_KEY=...
 * ═══════════════════════════════════════════════════════════════════════════
 */

import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';

const NVIDIA_KEY = process.env.NVIDIA_API_KEY || '';
// Nemotron 3.5 Lightning: fast, currently available, and returns clean output
// when thinking is disabled (see chat_template_kwargs below). Note that many
// NVIDIA models are gated per-account and some (e.g. meta/llama-3.3-70b-instruct)
// have reached end-of-life, so prefer a model verified against this key.
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'nvidia/nemotron-3.5-lightning-30b-a3b';
const NVIDIA_BASE = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const GROQ_KEY = process.env.GROQ_API_KEY || '';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

// NVIDIA NIM is a plain OpenAI-compatible REST endpoint. We call it with fetch
// rather than through groq-sdk: the SDK rewrites the request path under its own
// baseURL convention, which yields a 404 against integrate.api.nvidia.com.
const nvidia = NVIDIA_KEY ? { key: NVIDIA_KEY, base: NVIDIA_BASE.replace(/\/$/, '') } : null;
const groq = GROQ_KEY ? new Groq({ apiKey: GROQ_KEY }) : null;
const gemini = GEMINI_KEY ? new GoogleGenerativeAI(GEMINI_KEY).getGenerativeModel({ model: 'gemini-2.0-flash' }) : null;

export interface ChatOpts {
  system?: string;
  temperature?: number;
  maxTokens?: number;
  json?: boolean; // request a JSON object response where supported
}

/** Names of the providers that are actually configured, best first. */
export function llmProviders(): string[] {
  const out: string[] = [];
  if (nvidia) out.push('nvidia');
  if (groq) out.push('groq');
  if (gemini) out.push('gemini');
  return out;
}

export function llmAvailable(): boolean {
  return !!(nvidia || groq || gemini);
}

/**
 * Run a single-turn completion. Returns the text, or null if every configured
 * provider failed / none are configured. Strips Nemotron "thinking" content.
 */
export async function chat(prompt: string, opts: ChatOpts = {}): Promise<string | null> {
  const { system, temperature = 0.4, maxTokens = 800, json = false } = opts;
  const messages: { role: 'system' | 'user'; content: string }[] = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  // 1. NVIDIA NIM (OpenAI-compatible REST)
  if (nvidia) {
    try {
      const resp = await fetch(`${nvidia.base}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${nvidia.key}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          model: NVIDIA_MODEL,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false,
          // Nemotron models are reasoners: without this they return their
          // chain-of-thought as the answer. Disabling thinking yields the
          // clean, direct output worker agents need.
          chat_template_kwargs: { enable_thinking: false },
          ...(json ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status} ${(await resp.text()).slice(0, 160)}`);
      }
      const data: any = await resp.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text) return stripReasoning(text);
      console.warn('[llm] NVIDIA returned no content. Falling back.');
    } catch (e: any) {
      console.warn(`[llm] NVIDIA failed: ${e?.message}. Falling back.`);
    }
  }

  // 2. Groq
  if (groq) {
    try {
      const r = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature,
        max_tokens: maxTokens,
        ...(json ? { response_format: { type: 'json_object' } } as any : {}),
      });
      const text = r.choices?.[0]?.message?.content;
      if (text) return text.trim();
    } catch (e: any) {
      console.warn(`[llm] Groq failed: ${e?.message}. Falling back.`);
    }
  }

  // 3. Gemini
  if (gemini) {
    try {
      const full = (system ? system + '\n\n' : '') + prompt;
      const r = await gemini.generateContent(full);
      const text = r.response.text();
      if (text) return text.trim();
    } catch (e: any) {
      console.warn(`[llm] Gemini failed: ${e?.message}.`);
    }
  }

  return null;
}

/** Strip <think>…</think> reasoning blocks some Nemotron models prepend. */
function stripReasoning(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/^[\s\S]*?<\/think>/i, '').trim() || text.trim();
}
