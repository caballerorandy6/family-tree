import Link from 'next/link';
import TreeDeciduous from 'lucide-react/dist/esm/icons/tree-deciduous';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-secondary/30">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <TreeDeciduous className="h-10 w-10 text-primary" />
        <span className="text-2xl font-bold">Family Timeline</span>
      </Link>
      {children}
    </div>
  );
}
