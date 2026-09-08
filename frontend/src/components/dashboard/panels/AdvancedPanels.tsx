import { CheckCircle2 } from "lucide-react";
import type { IndicatorsJson } from "@pe-analyzer/shared-types";

function hex(n: number): string {
  return `0x${n.toString(16)}`;
}

export function OverlayPanel({ indicators }: { indicators: IndicatorsJson }) {
  const { overlay } = indicators;
  return (
    <div>
      <div className="panel-header">
        <h2>Overlay</h2>
        <p>Data appended after the last section's raw data — outside the loader's mapped image.</p>
      </div>
      {!overlay.present ? (
        <div className="empty-panel">
          <CheckCircle2 size={16} aria-hidden="true" />
          No overlay data — file ends at the last section's raw data.
        </div>
      ) : (
        <dl className="kv">
          <dt>Offset</dt>
          <dd className="mono">{hex(overlay.offset)}</dd>
          <dt>Size</dt>
          <dd>{overlay.size.toLocaleString()} bytes</dd>
          <dt>Entropy</dt>
          <dd>{overlay.entropy.toFixed(2)} / 8</dd>
        </dl>
      )}
    </div>
  );
}

export function TlsPanel({ indicators }: { indicators: IndicatorsJson }) {
  const { tls } = indicators;
  return (
    <div>
      <div className="panel-header">
        <h2>TLS Callbacks</h2>
        <p>Code that runs before the declared entry point — a known anti-sandbox technique.</p>
      </div>
      {tls.callbackCount === 0 ? (
        <div className="empty-panel">
          <CheckCircle2 size={16} aria-hidden="true" />
          {tls.present ? "TLS directory present, but no callbacks registered." : "No TLS directory."}
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            {tls.callbackAddresses.map((addr, i) => (
              <tr key={i}>
                <td>{i}</td>
                <td className="mono">{hex(addr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function DebugInfoPanel({ indicators }: { indicators: IndicatorsJson }) {
  const { debugInfo } = indicators;
  return (
    <div>
      <div className="panel-header">
        <h2>Debug Info</h2>
        <p>PE Debug Directory / CodeView PDB path — can leak build-machine paths or usernames.</p>
      </div>
      {!debugInfo.hasDebugDirectory ? (
        <div className="empty-panel">
          <CheckCircle2 size={16} aria-hidden="true" />
          No PE Debug Directory. (MinGW/GCC toolchains embed DWARF sections directly instead of a
          CodeView entry — this is expected for non-MSVC builds, not itself a finding.)
        </div>
      ) : (
        <dl className="kv">
          <dt>PDB path</dt>
          <dd className="mono" style={{ wordBreak: "break-all" }}>
            {debugInfo.pdbPath ?? "(present, but no CodeView PDB path found)"}
          </dd>
        </dl>
      )}
    </div>
  );
}

export function RichHeaderPanel({ indicators }: { indicators: IndicatorsJson }) {
  const { richHeader } = indicators;
  return (
    <div>
      <div className="panel-header">
        <h2>Rich Header</h2>
        <p>Undocumented MSVC linker toolchain fingerprint. Absent on non-MSVC-built binaries.</p>
      </div>
      {!richHeader.present ? (
        <div className="empty-panel">
          <CheckCircle2 size={16} aria-hidden="true" />
          No Rich header — expected for non-MSVC toolchains (GCC/Clang/Rust/Go don't emit one).
        </div>
      ) : (
        <>
          <dl className="kv" style={{ marginBottom: "1.25rem" }}>
            <dt>XOR key</dt>
            <dd className="mono">{hex(richHeader.xorKey)}</dd>
            <dt>Entries</dt>
            <dd>{richHeader.entries.length}</dd>
          </dl>
          <table className="data-table">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Build ID</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {richHeader.entries.map((e, i) => (
                <tr key={i}>
                  <td className="mono">{e.productId}</td>
                  <td className="mono">{e.buildId}</td>
                  <td>{e.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
