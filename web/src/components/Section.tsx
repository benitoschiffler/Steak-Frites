export function Section({
  title,
  subtitle,
  eyebrow,
  children,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        {eyebrow && <div className="kicker mb-1">{eyebrow}</div>}
        <h2 className="text-2xl font-black tracking-tight text-[#17140f]">{title}</h2>
        {subtitle && <p className="mt-1 max-w-3xl text-sm leading-6 text-[#6f6a60]">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`premium-panel rounded-lg p-4 ${className}`}>
      {children}
    </div>
  );
}
