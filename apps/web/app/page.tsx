import Link from 'next/link';
import { Button } from '@/components/ui/button';
import TreeDeciduous from 'lucide-react/dist/esm/icons/tree-deciduous';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TreeDeciduous className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">FamilyTree</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="flex-1 flex items-center justify-center">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Preserve Your Family History
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Create beautiful family trees, add photos and documents, and share your heritage with
            future generations.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg">Start Building Your Tree</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-secondary/50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              title="Multiple Family Trees"
              description="Create and manage multiple family trees for different branches of your family."
            />
            <FeatureCard
              title="Photo & Document Storage"
              description="Upload photos, documents, and certificates to preserve important family records."
            />
            <FeatureCard
              title="Visual Tree View"
              description="See your family history come to life with our interactive tree visualization."
            />
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>FamilyTree - Preserve your family history for generations to come.</p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-background rounded-lg p-6 shadow-sm border">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
