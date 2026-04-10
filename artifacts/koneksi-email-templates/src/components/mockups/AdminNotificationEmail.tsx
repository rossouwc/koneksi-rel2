
const TEAL_GRADIENT = "linear-gradient(135deg, #0f766e 0%, #10b981 100%)";
const FONT_FAMILY = "'Plus Jakarta Sans', 'Inter', Arial, sans-serif";

function EmailShell({
  greeting,
  bodyLines,
}: {
  greeting: string;
  bodyLines: string[];
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: TEAL_GRADIENT,
        fontFamily: FONT_FAMILY,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "32px 16px",
      }}
    >
      <div
        style={{
          width: 600,
          background: "#ffffff",
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
              }}
            >
              K
            </div>
            <span style={{ fontWeight: 800, fontSize: 22, color: "#fff", letterSpacing: "-0.5px" }}>
              Koneksi
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.78)", fontWeight: 500 }}>
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
          <div
            style={{
              background: "#f0fdfa",
              border: "1px solid #99f6e4",
              borderRadius: 8,
              padding: "10px 16px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 15, color: "#0f766e" }}>🔔</span>
            <span style={{ fontSize: 13, color: "#0f766e", fontWeight: 600 }}>
              New provider invitation submitted
            </span>
          </div>
          <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#111827" }}>
            {greeting}
          </p>
          {bodyLines.map((line, i) => (
            <p key={i} style={{ margin: "0 0 12px", fontSize: 14, color: "#374151", lineHeight: 1.65 }}>
              {line}
            </p>
          ))}
        </div>

        <div style={{ padding: "20px 40px 24px" }}>
          <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", marginBottom: 14 }} />
          <p style={{ margin: 0, fontSize: 12, color: "#9ca3af", textAlign: "center", lineHeight: 1.6 }}>
            &copy; {new Date().getFullYear()} Koneksi &mdash; Connecting estates &amp; trusted providers.
            <br />
            You received this as an estate admin for Fever Tree Estate.
            <br />
            <a href="#" style={{ color: "#6b7280", textDecoration: "underline" }}>Unsubscribe</a>
            &nbsp;&middot;&nbsp;
            <a href="#" style={{ color: "#6b7280", textDecoration: "underline" }}>Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminNotificationEmail() {
  return (
    <EmailShell
      greeting="Hi Rossouw,"
      bodyLines={[
        "A new provider invitation was sent from Fever Tree Estate on Koneksi.",
        "Provider name: Black Jack Electrical Services",
        "Category: Electrical",
        "Invited by: Bernize van der Merwe",
        "You'll be notified once the provider completes registration. You can then review and approve or reject their application from your estate admin panel.",
      ]}
    />
  );
}
