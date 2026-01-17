import Link from 'next/link';
import { Button } from '@/components/ui/button';
import TreeDeciduous from 'lucide-react/dist/esm/icons/tree-deciduous';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b sticky top-0 bg-background z-50">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TreeDeciduous className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <span className="text-lg sm:text-xl font-bold">Family Timeline</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="sm:size-default">Login</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="sm:size-default">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="flex-1 flex items-center justify-center">
        <div className="container mx-auto px-4 py-8 sm:py-16 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight mb-4 sm:mb-6">
            Preserve Your Family History
          </h1>
          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 px-2">
            Create beautiful family timelines, add photos and documents, and share your heritage with
            future generations.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">Start Building Your Timeline</Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-secondary/50 py-10 sm:py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">Features</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <FeatureCard
              title="Multiple Timelines"
              description="Create and manage multiple timelines for different branches of your family."
            />
            <FeatureCard
              title="Photo & Document Storage"
              description="Upload photos, documents, and certificates to preserve important family records."
            />
            <FeatureCard
              title="Visual Timeline View"
              description="See your family history come to life with our interactive timeline visualization."
            />
          </div>
        </div>
      </section>

      <footer className="border-t py-6 sm:py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm sm:text-base">
          <p>Family Timeline - Preserve your family history for generations to come.</p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-background rounded-lg p-4 sm:p-6 shadow-sm border">
      <h3 className="text-lg sm:text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm sm:text-base text-muted-foreground">{description}</p>
    </div>
  );
}
