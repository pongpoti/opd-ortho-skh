export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-center overflow-y-auto p-6"
      style={{ minHeight: "var(--app-vh)" }}
    >
      {children}
    </div>
  );
}
