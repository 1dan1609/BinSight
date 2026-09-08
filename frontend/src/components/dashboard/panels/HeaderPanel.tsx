import type { IndicatorsJson } from "@pe-analyzer/shared-types";

function hex(n: number): string {
  return `0x${n.toString(16)}`;
}

function formatTimestamp(unixSeconds: number): string {
  const date = new Date(unixSeconds * 1000);
  return Number.isNaN(date.getTime()) ? "invalid timestamp" : date.toISOString();
}

export default function HeaderPanel({ indicators }: { indicators: IndicatorsJson }) {
  const h = indicators.header;

  return (
    <div>
      <div className="panel-header">
        <h2>Header</h2>
        <p>Full raw DOS / NT / optional header fields.</p>
      </div>

      <div className="panel-section">
        <h3>File Header</h3>
        <dl className="kv">
          <dt>Machine</dt>
          <dd>{h.machine}</dd>
          <dt>Format</dt>
          <dd>{h.isPE32Plus ? "PE32+ (64-bit)" : "PE32 (32-bit)"}</dd>
          <dt>Number of sections</dt>
          <dd>{h.numberOfSections}</dd>
          <dt>Timestamp</dt>
          <dd>
            {formatTimestamp(h.timeDateStamp)} <span className="mono">({h.timeDateStamp})</span>
          </dd>
          <dt>Characteristics</dt>
          <dd>{h.characteristics.join(", ") || "—"}</dd>
        </dl>
      </div>

      <div className="panel-section">
        <h3>Optional Header</h3>
        <dl className="kv">
          <dt>Linker version</dt>
          <dd>
            {h.majorLinkerVersion}.{h.minorLinkerVersion}
          </dd>
          <dt>Entry point</dt>
          <dd className="mono">{hex(h.entryPointAddress)}</dd>
          <dt>Image base</dt>
          <dd className="mono">{hex(h.imageBase)}</dd>
          <dt>Base of code</dt>
          <dd className="mono">{hex(h.baseOfCode)}</dd>
          <dt>Size of code</dt>
          <dd>{h.sizeOfCode.toLocaleString()}</dd>
          <dt>Size of initialized data</dt>
          <dd>{h.sizeOfInitializedData.toLocaleString()}</dd>
          <dt>Size of uninitialized data</dt>
          <dd>{h.sizeOfUninitializedData.toLocaleString()}</dd>
          <dt>Section alignment</dt>
          <dd className="mono">{hex(h.sectionAlignment)}</dd>
          <dt>File alignment</dt>
          <dd className="mono">{hex(h.fileAlignment)}</dd>
          <dt>Size of image</dt>
          <dd>{h.sizeOfImage.toLocaleString()}</dd>
          <dt>Size of headers</dt>
          <dd>{h.sizeOfHeaders.toLocaleString()}</dd>
          <dt>Checksum</dt>
          <dd className="mono">{hex(h.checkSum)}</dd>
          <dt>OS version</dt>
          <dd>
            {h.majorOperatingSystemVersion}.{h.minorOperatingSystemVersion}
          </dd>
          <dt>Image version</dt>
          <dd>
            {h.majorImageVersion}.{h.minorImageVersion}
          </dd>
          <dt>Subsystem</dt>
          <dd>
            {h.subsystem} (v{h.majorSubsystemVersion}.{h.minorSubsystemVersion})
          </dd>
          <dt>DLL characteristics</dt>
          <dd>{h.dllCharacteristics.join(", ") || "—"}</dd>
          <dt>Stack reserve / commit</dt>
          <dd>
            {h.sizeOfStackReserve.toLocaleString()} / {h.sizeOfStackCommit.toLocaleString()}
          </dd>
          <dt>Heap reserve / commit</dt>
          <dd>
            {h.sizeOfHeapReserve.toLocaleString()} / {h.sizeOfHeapCommit.toLocaleString()}
          </dd>
          <dt>Loader flags</dt>
          <dd className="mono">{hex(h.loaderFlags)}</dd>
          <dt>Number of RVAs and sizes</dt>
          <dd>{h.numberOfRvaAndSizes}</dd>
        </dl>
      </div>
    </div>
  );
}
