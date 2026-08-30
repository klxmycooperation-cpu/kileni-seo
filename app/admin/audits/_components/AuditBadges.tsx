import {
  auditStatusLabel,
  auditStatusTone,
  type EmailDeliveryView,
  severityLabel,
  severityTone,
} from "../../_lib/audit-view";

export function AuditStatusBadge({ status }: { status: unknown }) {
  const tone = auditStatusTone(status);
  return <span className={`admin-badge admin-badge--${tone}`}>{auditStatusLabel(status)}</span>;
}

export function EmailDeliveryBadge({ delivery }: { delivery: EmailDeliveryView }) {
  return (
    <span className={`admin-badge admin-badge--${delivery.tone}`} title={delivery.detail}>
      {delivery.label}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: unknown }) {
  return <span className={`admin-badge admin-badge--${severityTone(severity)}`}>{severityLabel(severity)}</span>;
}
