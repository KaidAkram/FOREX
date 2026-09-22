import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FX Macro Bias — Coming Soon",
  description: "Client-facing analytics dashboard — launching soon.",
};

export default function ClientPlaceholder() {
  return (
    <main className="min-h-screen bg-void flex items-center justify-center">
      <div className="text-center space-y-4 max-w-sm px-6">
        <div className="w-16 h-16 mx-auto rounded-card bg-cyan-glow border border-cyan-border flex items-center justify-center">
          <span className="font-clash text-2xl font-bold text-cyan">FX</span>
        </div>
        <h1 className="font-clash text-3xl font-bold text-text-primary">
          Coming Soon
        </h1>
        <p className="font-poppins text-sm text-text-muted">
          The client-facing FX Macro Bias platform is under construction.
          The admin panel is live at{" "}
          <a href="/admin/dashboard" className="text-cyan hover:underline">
            /admin/dashboard
          </a>
          .
        </p>
      </div>
    </main>
  );
}
