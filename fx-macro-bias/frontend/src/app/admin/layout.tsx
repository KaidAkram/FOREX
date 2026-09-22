import { AdminSidebar } from "@/components/layout/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[#121418] text-white overflow-hidden font-sans antialiased relative z-0">
      
      {/* --- Ambient Background Layer --- */}
      {/* 1. Subtle Dot Grid Pattern */}
      <div 
        className="absolute inset-0 z-[-2] opacity-50"
        style={{
          backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.03) 1.5px, transparent 1.5px)",
          backgroundSize: "24px 24px"
        }}
      />

      {/* 2. Top-Left Glowing Orb (Lime) */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#D2F646]/5 blur-[120px] pointer-events-none z-[-1] animate-breathe" />

      {/* 3. Bottom-Right Glowing Orb (Ocean Blue/Cyan for depth) */}
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#00E5FF]/5 blur-[140px] pointer-events-none z-[-1] animate-breathe" style={{ animationDelay: "1.5s" }} />


      {/* --- Main Content --- */}
      <AdminSidebar />
      
      <div className="flex-1 flex flex-col h-full overflow-y-auto z-10 relative">
        {children}
      </div>
    </div>
  );
}
