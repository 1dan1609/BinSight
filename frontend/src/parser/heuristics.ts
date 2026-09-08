import type { HeuristicFinding, HeuristicSeverity as Severity } from "@pe-analyzer/shared-types";

interface ApiCombo {
  id: string;
  apis: string[];
  severity: Severity;
  description: string;
}

/** Data-driven suspicious-API-combination table, checked against the full imported-function set. */
export const SUSPICIOUS_API_COMBOS: ApiCombo[] = [
  {
    id: "PROCESS_INJECTION_CLASSIC",
    apis: ["VirtualAllocEx", "WriteProcessMemory", "CreateRemoteThread"],
    severity: "HIGH",
    description:
      "Classic remote process injection primitives (VirtualAllocEx + WriteProcessMemory + CreateRemoteThread) are all imported.",
  },
  {
    id: "PROCESS_HOLLOWING",
    apis: ["NtUnmapViewOfSection", "WriteProcessMemory", "SetThreadContext"],
    severity: "HIGH",
    description: "Imports consistent with process hollowing (unmap + rewrite + resume a target process).",
  },
  {
    id: "SELF_INJECTION",
    apis: ["VirtualAlloc", "WriteProcessMemory", "CreateRemoteThread"],
    severity: "MEDIUM",
    description: "Memory allocation + write + remote thread creation, often used for shellcode injection.",
  },
  {
    id: "DYNAMIC_API_RESOLUTION",
    apis: ["LoadLibraryA", "GetProcAddress"],
    severity: "LOW",
    description:
      "Dynamic API resolution (LoadLibrary + GetProcAddress) — common in legitimate code, but also used to evade static import-table detection.",
  },
  {
    id: "ANTI_DEBUG",
    apis: ["IsDebuggerPresent", "CheckRemoteDebuggerPresent"],
    severity: "MEDIUM",
    description: "Anti-debugging checks present.",
  },
  {
    id: "C2_HTTP",
    apis: ["WinHttpOpen", "WinHttpConnect", "WinHttpSendRequest"],
    severity: "MEDIUM",
    description: "WinHTTP-based network communication (possible C2 or exfiltration channel).",
  },
  {
    id: "C2_WININET",
    apis: ["InternetOpenA", "InternetConnectA", "HttpSendRequestA"],
    severity: "MEDIUM",
    description: "WinINet-based network communication (possible C2 or exfiltration channel).",
  },
  {
    id: "PERSISTENCE_REGISTRY",
    apis: ["RegSetValueExA", "RegCreateKeyExA"],
    severity: "LOW",
    description: "Registry write APIs present — could be used to establish persistence (e.g. Run keys).",
  },
  {
    id: "KEYLOGGING",
    apis: ["SetWindowsHookExA", "GetAsyncKeyState"],
    severity: "MEDIUM",
    description: "Keyboard hooking/state-polling APIs consistent with keylogging.",
  },
  {
    id: "CRYPTO_API",
    apis: ["CryptEncrypt", "CryptAcquireContextA"],
    severity: "LOW",
    description: "Windows CryptoAPI usage — could indicate ransomware-style file encryption, or legitimate crypto use.",
  },
];

export const SUSPICIOUS_STRING_KEYWORDS = [
  "cmd.exe",
  "powershell",
  "-enc",
  "downloadstring",
  "invoke-expression",
  "vssadmin",
  "bcdedit",
  "wbadmin",
  "schtasks",
  "\\pipe\\",
  "svchost.exe",
  "explorer.exe /select",
  "bitcoin",
  "wallet",
  "ransom",
  "decrypt",
  "onion",
];

export function evaluateApiCombos(importedFunctionNames: Set<string>): HeuristicFinding[] {
  const findings: HeuristicFinding[] = [];
  for (const combo of SUSPICIOUS_API_COMBOS) {
    const allPresent = combo.apis.every((api) => importedFunctionNames.has(api));
    if (allPresent) {
      findings.push({
        id: combo.id,
        severity: combo.severity,
        description: combo.description,
        relatedIndicator: combo.apis.join(", "),
      });
    }
  }
  return findings;
}

const HIGH_ENTROPY_OVERLAY_THRESHOLD = 7.0;

export function evaluateOverlay(overlay: { present: boolean; size: number; entropy: number }): HeuristicFinding[] {
  if (!overlay.present) return [];
  const severity = overlay.entropy > HIGH_ENTROPY_OVERLAY_THRESHOLD ? "HIGH" : "LOW";
  const highEntropyNote =
    severity === "HIGH" ? " at high entropy — consistent with an embedded packed/encrypted payload" : "";
  return [
    {
      id: "OVERLAY_DATA_PRESENT",
      severity,
      description: `${overlay.size.toLocaleString()} bytes of data appended after the last declared section${highEntropyNote}. This region is outside the PE loader's mapped image and invisible to tools that only inspect declared sections.`,
    },
  ];
}

export function evaluateTls(tls: { callbackCount: number }): HeuristicFinding[] {
  if (tls.callbackCount === 0) return [];
  return [
    {
      id: "TLS_CALLBACKS_PRESENT",
      severity: "MEDIUM",
      description: `${tls.callbackCount} TLS callback(s) present — code here runs before the declared entry point, a known technique to evade tools that only hook the entry point.`,
    },
  ];
}
