
const TEAL_GRADIENT = "linear-gradient(135deg, #0f766e 0%, #10b981 100%)";
const FONT_FAMILY = "'Plus Jakarta Sans', 'Inter', Arial, sans-serif";

interface EmailTemplateProps {
  subject: string;
  previewText: string;
  greeting: string;
  bodyLines: string[];
  ctaLabel?: string;
  ctaHref?: string;
  showRejectedAccent?: boolean;
}

function EmailTemplate({
  subject,
  previewText,
  greeting,
  bodyLines,
  ctaLabel,
  ctaHref,
  showRejectedAccent,
}: EmailTemplateProps) {
  return (
    <div
      style={{
        width: 600,
        minWidth: 600,
        maxWidth: 600,
        backgroundColor: "#ffffff",
        fontFamily: FONT_FAMILY,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
      }}
    >
      <div
        style={{
          background: TEAL_GRADIENT,
          padding: "32px 40px 28px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 6,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "rgba(255,255,255,0.22)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 18,
              color: "#fff",
              letterSpacing: -1,
            }}
          >
            K
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: 22,
              color: "#fff",
              letterSpacing: "-0.5px",
            }}
          >
            Koneksi
          </span>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "rgba(255,255,255,0.78)",
            fontWeight: 500,
            letterSpacing: "0.01em",
          }}
        >
          Connecting estates &amp; trusted providers
        </p>
      </div>

      <div
        style={{
          background: "#fff",
          margin: "0 20px",
          borderRadius: "0 0 12px 12px",
          padding: "32px 36px 28px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        {showRejectedAccent && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              padding: "10px 16px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 15, color: "#dc2626" }}>✕</span>
            <span style={{ fontSize: 13, color: "#b91c1c", fontWeight: 600 }}>
              Application not approved
            </span>
          </div>
        )}

        <p
          style={{
            margin: "0 0 16px",
            fontSize: 15,
            fontWeight: 700,
            color: "#111827",
          }}
        >
          {greeting}
        </p>

        {bodyLines.map((line, i) => (
          <p
            key={i}
            style={{
              margin: "0 0 12px",
              fontSize: 14,
              color: "#374151",
              lineHeight: 1.65,
            }}
          >
            {line}
          </p>
        ))}

        {ctaLabel && (
          <div style={{ margin: "24px 0 8px" }}>
            <a
              href={ctaHref || "#"}
              style={{
                display: "inline-block",
                background: TEAL_GRADIENT,
                color: "#fff",
                fontWeight: 700,
                fontSize: 14,
                padding: "12px 28px",
                borderRadius: 8,
                textDecoration: "none",
                letterSpacing: "0.01em",
              }}
            >
              {ctaLabel}
            </a>
          </div>
        )}
      </div>

      <div style={{ padding: "20px 40px 24px" }}>
        <hr
          style={{
            border: "none",
            borderTop: "1px solid #e5e7eb",
            marginBottom: 14,
          }}
        />
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "#9ca3af",
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          &copy; {new Date().getFullYear()} Koneksi &mdash; Connecting estates &amp; trusted providers.
          <br />
          This email was sent to you because you or someone on your behalf initiated an action on Koneksi.
          <br />
          <a href="#" style={{ color: "#6b7280", textDecoration: "underline" }}>
            Unsubscribe
          </a>
          &nbsp;&middot;&nbsp;
          <a href="#" style={{ color: "#6b7280", textDecoration: "underline" }}>
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}

const TEMPLATES: {
  label: string;
  badge: string;
  badgeColor: string;
  props: EmailTemplateProps;
}[] = [
  {
    label: "Provider Invitation",
    badge: "To: Black Jack (provider)",
    badgeColor: "#0f766e",
    props: {
      subject: "You've been invited to join Fever Tree Estate on Koneksi",
      previewText: "Bernize has invited you to join Koneksi as a provider.",
      greeting: "Hi Black Jack,",
      bodyLines: [
        "You've been invited by Bernize van der Merwe to join Koneksi as a provider for Fever Tree Estate.",
        "Category: Electrical",
        "Click the button below to complete your registration and start receiving service requests from residents.",
      ],
      ctaLabel: "Register Now",
      ctaHref: "https://koneksi.app/join-provider?token=abc123",
    },
  },
  {
    label: "Admin Notification",
    badge: "To: Rossouw (estate admin)",
    badgeColor: "#0284c7",
    props: {
      subject: "New provider invitation sent for Fever Tree Estate",
      previewText: "A new provider invitation was sent to Black Jack.",
      greeting: "Hi Rossouw,",
      bodyLines: [
        "A new provider invitation was sent from Fever Tree Estate on Koneksi.",
        "Provider name: Black Jack Electrical Services",
        "Category: Electrical",
        "Invited by: Bernize van der Merwe",
        "You'll be notified once the provider completes registration and can be reviewed for approval.",
      ],
    },
  },
  {
    label: "Provider Approved",
    badge: "To: Black Jack (provider)",
    badgeColor: "#15803d",
    props: {
      subject: "You've been approved for Fever Tree Estate on Koneksi",
      previewText: "Great news! You're now approved as a provider.",
      greeting: "Hi Black Jack,",
      bodyLines: [
        "Great news! Rossouw at Fever Tree Estate has approved your provider application on Koneksi.",
        "You can now log in to your provider portal to view and respond to service requests from estate residents.",
        "Welcome to the Koneksi network!",
      ],
      ctaLabel: "Log In to Your Portal",
      ctaHref: "https://koneksi.app/supplier",
    },
  },
  {
    label: "Provider Rejected",
    badge: "To: Black Jack (provider)",
    badgeColor: "#b91c1c",
    props: {
      subject: "Update on your provider application for Fever Tree Estate",
      previewText: "An update regarding your Koneksi provider application.",
      greeting: "Hi Black Jack,",
      bodyLines: [
        "Thank you for your interest in joining Fever Tree Estate on Koneksi. After careful consideration, the estate admin has decided not to proceed with your application at this time.",
        "We appreciate your interest and encourage you to explore other estate opportunities on the Koneksi network.",
        "If you believe this decision was made in error, please contact the estate directly.",
      ],
      showRejectedAccent: true,
    },
  },
];

export default function EmailTemplates() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: TEAL_GRADIENT,
        fontFamily: FONT_FAMILY,
        padding: "40px 32px",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ marginBottom: 36, textAlign: "center" }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "#ffffff",
              margin: "0 0 8px",
              letterSpacing: "-0.5px",
            }}
          >
            Koneksi — Email Template Mockups
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", margin: 0 }}>
            All 4 transactional email designs · 600px width · Plus Jakarta Sans · Teal gradient (#0f766e → #10b981)
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 600px)",
            gap: 40,
            justifyContent: "center",
          }}
        >
          {TEMPLATES.map(({ label, badge, badgeColor, props }) => (
            <div key={label}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#ffffff",
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#fff",
                    background: badgeColor,
                    borderRadius: 20,
                    padding: "3px 10px",
                    letterSpacing: "0.02em",
                  }}
                >
                  {badge}
                </span>
              </div>
              <EmailTemplate {...props} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
