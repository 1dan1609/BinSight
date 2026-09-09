import { Loader2 } from "lucide-react";
import { useState } from "react";
import type { ByokConfig, ProviderName } from "@pe-analyzer/shared-types";

interface ProviderSelectorProps {
  onGenerate: (mode: "hosted" | "byok", byokConfig?: ByokConfig) => void;
  disabled?: boolean;
}

/**
 * Label and model-field hint per provider, roughly most-useful-first. `modelHint` mirrors the
 * backend's defaultModel purely as placeholder text — the backend still owns the actual default.
 */
const PROVIDERS: { value: ProviderName; label: string; modelHint: string }[] = [
  { value: "groq", label: "Groq", modelHint: "llama-3.3-70b-versatile" },
  { value: "openai", label: "OpenAI", modelHint: "gpt-4o-mini" },
  {
    value: "openrouter",
    label: "OpenRouter (Claude, Gemini, Llama…)",
    modelHint: "anthropic/claude-sonnet-4.5",
  },
  { value: "gemini", label: "Google Gemini", modelHint: "gemini-2.0-flash" },
  { value: "deepseek", label: "DeepSeek", modelHint: "deepseek-chat" },
  { value: "mistral", label: "Mistral", modelHint: "mistral-small-latest" },
  { value: "together", label: "Together AI", modelHint: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
  { value: "cerebras", label: "Cerebras", modelHint: "llama-3.3-70b" },
  { value: "xai", label: "xAI (Grok)", modelHint: "grok-2-latest" },
];

export default function ProviderSelector({ onGenerate, disabled }: ProviderSelectorProps) {
  const [mode, setMode] = useState<"hosted" | "byok">("hosted");
  const [byokProvider, setByokProvider] = useState<ProviderName>("groq");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");

  const canSubmit = mode === "hosted" || apiKey.trim().length > 0;
  const activeProvider = PROVIDERS.find((p) => p.value === byokProvider);

  return (
    <div>
      <div className="provider-options">
        <label>
          <input
            type="radio"
            name="mode"
            checked={mode === "hosted"}
            onChange={() => setMode("hosted")}
            disabled={disabled}
          />
          Use the free hosted key (rate-limited)
        </label>
        <label>
          <input
            type="radio"
            name="mode"
            checked={mode === "byok"}
            onChange={() => setMode("byok")}
            disabled={disabled}
          />
          Bring your own API key (unlimited)
        </label>
      </div>

      {mode === "byok" && (
        <div className="byok-fields">
          <label>
            Provider
            <select
              value={byokProvider}
              onChange={(e) => setByokProvider(e.target.value as ProviderName)}
              disabled={disabled}
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            API key
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Sent only for this request, never stored"
              disabled={disabled}
              autoComplete="off"
            />
          </label>
          <label>
            {/* Wrapped: the label is a flex column, so bare siblings become separate rows. */}
            <span>
              Model <span className="optional">(optional)</span>
            </span>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={activeProvider ? `Default: ${activeProvider.modelHint}` : "Provider default"}
              disabled={disabled}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <p className="hint">
            Your key is sent directly to the backend for this one request and is never logged or
            stored. It is discarded immediately after the report is generated.
          </p>
        </div>
      )}

      <button
        type="button"
        className="primary"
        disabled={disabled || !canSubmit}
        onClick={() =>
          onGenerate(
            mode,
            mode === "byok"
              ? { provider: byokProvider, apiKey, ...(model.trim() ? { model: model.trim() } : {}) }
              : undefined,
          )
        }
      >
        {disabled ? (
          <>
            <Loader2 size={14} className="spin" aria-hidden="true" />
            Generating…
          </>
        ) : (
          "Generate report"
        )}
      </button>
    </div>
  );
}
