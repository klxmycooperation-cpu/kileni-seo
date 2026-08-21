import type { ServiceVisual as ServiceVisualContent } from "../../content/services";

export function ServiceVisual({ visual }: { visual: ServiceVisualContent }) {
  return (
    <figure className={`svc-visual svc-visual-${visual.kind}`}>
      <div className="svc-visual-heading">
        <span>{visual.label}</span>
        <b>{visual.summary}</b>
      </div>
      <svg className="svc-visual-canvas" viewBox="0 0 640 360" role="img" aria-labelledby={`visual-${visual.kind}`}>
        <title id={`visual-${visual.kind}`}>{visual.summary}</title>
        <VisualDiagram kind={visual.kind} />
      </svg>
      <dl>
        {visual.signals.map((signal, index) => (
          <div key={signal.label}>
            <dt>{String(index + 1).padStart(2, "0")} · {signal.label}</dt>
            <dd>{signal.value}</dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}

function VisualDiagram({ kind }: { kind: ServiceVisualContent["kind"] }) {
  if (kind === "audit-matrix") return (
    <>
      <path className="svc-guide" d="M64 84H576M64 180H576M64 276H576M160 48V312M320 48V312M480 48V312" />
      <rect className="svc-node" x="92" y="112" width="136" height="136" />
      <circle className="svc-node svc-node-fill" cx="320" cy="180" r="67" />
      <path className="svc-hot" d="M277 181l27 28 65-70" />
      <path className="svc-scan" d="M68 70H572" />
    </>
  );
  if (kind === "growth-loop") return (
    <>
      <circle className="svc-guide" cx="320" cy="180" r="124" />
      <path className="svc-node" d="M320 56a124 124 0 0 1 107 62M427 118l-4-37 34 18M430 241a124 124 0 0 1-108 63M322 304l31 20-3-37M212 242a124 124 0 0 1 0-124M212 118l-31 18 1-36" />
      <circle className="svc-node-fill" cx="320" cy="180" r="62" />
      <path className="svc-hot" d="M288 181h64M320 149v64" />
      <circle className="svc-hot-fill" cx="320" cy="56" r="10" />
      <circle className="svc-hot-fill" cx="430" cy="241" r="10" />
      <circle className="svc-hot-fill" cx="212" cy="242" r="10" />
    </>
  );
  if (kind === "card-stack") return (
    <>
      <rect className="svc-guide" x="92" y="73" width="270" height="212" rx="4" />
      <rect className="svc-node" x="136" y="47" width="270" height="212" rx="4" />
      <rect className="svc-node svc-node-fill" x="180" y="99" width="270" height="212" rx="4" />
      <rect className="svc-hot-fill" x="212" y="132" width="92" height="92" rx="46" />
      <path className="svc-hot" d="M329 142h88M329 171h64M212 249h205M212 276h148" />
      <path className="svc-scan" d="M480 99v212" />
    </>
  );
  if (kind === "build-system") return (
    <>
      <rect className="svc-guide" x="68" y="60" width="504" height="240" rx="4" />
      <path className="svc-guide" d="M68 106h504M214 106v194M420 106v194" />
      <rect className="svc-node-fill" x="92" y="135" width="98" height="56" />
      <rect className="svc-node" x="238" y="135" width="158" height="116" />
      <rect className="svc-hot-fill" x="444" y="135" width="104" height="116" />
      <path className="svc-hot" d="M190 163h48M396 193h48" />
      <circle className="svc-node" cx="92" cy="83" r="6" />
      <circle className="svc-node" cx="112" cy="83" r="6" />
      <circle className="svc-node" cx="132" cy="83" r="6" />
    </>
  );
  return (
    <>
      <path className="svc-guide" d="M70 64h500L488 130H152zm82 66h336l-78 66H230zm78 66h180l-62 96h-56z" />
      <path className="svc-node-fill" d="M70 64h500L488 130H152z" />
      <path className="svc-node" d="M152 130h336l-78 66H230z" />
      <path className="svc-hot-fill" d="M230 196h180l-62 96h-56z" />
      <path className="svc-hot" d="M320 292v34M302 310l18 18 18-18" />
    </>
  );
}
