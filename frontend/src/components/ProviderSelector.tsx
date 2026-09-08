import { useState } from "react";
import type { ByokConfig, ProviderName } from "@pe-analyzer/shared-types";

interface ProviderSelectorProps {
  onGenerate: (mode: "hosted" | "byok", byokConfig?: ByokConfig) => void;
  disabled?: boolean;
}

export default function ProviderSelector({ onGenerate, disabled }: ProviderSelectorProps) {
  const [mode, setMode] = useState<"hosted" | "byok">("hosted");
  const [byokProvider, setByokProvider] = useState<ProviderName>("groq");
  const [apiKey, setApiKey] = useState("");

  const canSubmit = mode === "hosted" || apiKey.trim().length > 0;

  return (
    <div className="card">
      <h2>Generate AI report</h2>
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
              <option value="groq">Groq</option>
              <option value="openai">OpenAI</option>
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
          <p className="hint">
            Your key is sent directly to the backend for this one request and is never logged or
            stored. It is discarded immediately after the report is generated.
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={disabled || !canSubmit}
        onClick={() =>
          onGenerate(mode, mode === "byok" ? { provider: byokProvider, apiKey } : undefined)
        }
      >
        {disabled ? "Generating…" : "Generate report"}
      </button>
    </div>
  );
}
