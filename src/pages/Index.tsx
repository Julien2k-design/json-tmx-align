import { JsonTmxConverter } from '@/components/json-tmx-converter';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-glow absolute inset-0 pointer-events-none" />
      <div className="relative">
        <div className="container mx-auto px-4 py-12">
          <JsonTmxConverter />
        </div>
      </div>
    </div>
  );
};

export default Index;
