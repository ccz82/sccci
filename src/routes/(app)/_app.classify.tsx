import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { pb } from '~/lib/pb';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Input } from '~/components/ui/input';
import { ScrollArea } from '~/components/ui/scroll-area';

// Mock AI classification and captioning
async function mockClassifyAndCaption(fileUrl: string) {
  await new Promise(res => setTimeout(res, 1000));
  const label = Math.random() > 0.5 ? 'casual' : 'diplomatic';
  const caption = label === 'casual'
    ? 'A casual event with relaxed atmosphere.'
    : 'A diplomatic event with formal setting.';
  return { label, caption };
}

export const Route = createFileRoute('/(app)/_app/classify')({
  component: ClassifyPage,
});

function getAnalysis(label: 'casual' | 'diplomatic') {
  return label === 'casual'
    ? 'A casual event with relaxed atmosphere.'
    : 'A diplomatic event with formal setting.';
}

function ClassifyPage() {
  const [images, setImages] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [classifications, setClassifications] = useState<{ label: 'casual' | 'diplomatic', caption: string }[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Get uploaded images from localStorage (set after upload)
    const uploaded = JSON.parse(localStorage.getItem('uploadedImages') || '[]');
    setImages(uploaded);
    setClassifications(uploaded.map(() => ({ label: 'diplomatic', caption: getAnalysis('diplomatic') })));
  }, []);

  const handleClassificationChange = (idx: number, label: 'casual' | 'diplomatic') => {
    setClassifications(prev => prev.map((c, i) => i === idx ? { label, caption: getAnalysis(label) } : c));
  };

  const handleSave = async (idx: number) => {
    // Save classification and caption to PocketBase for the image
    const image = images[idx];
    const { label, caption } = classifications[idx];
    if (image && image.id) {
      await pb.collection('media').update(image.id, {
        class: label,
        ai_caption: caption,
      });
    }
    // Set flag for toast and navigate back
    localStorage.setItem('showClassifiedToast', '1');
    navigate({ to: '/classifier' });
  };

  if (!images.length) {
    return (
      <div className="w-full mx-6 my-5 flex flex-col">
        <h1 className="text-3xl font-bold mb-4">No images to classify</h1>
        <Button onClick={() => navigate({ to: '/classifier' })}>Go to Upload</Button>
      </div>
    );
  }

  return (
    <div className="w-full mx-6 my-5 flex flex-col">
      <h1 className="text-3xl font-bold mb-4">Classify Uploaded Images</h1>
      <ScrollArea className="rounded-md grow h-1 gap-2 ">
        <div className="grid grid-cols-2 gap-4 m-4">
          {images.map((item, i) => (
            <div key={i} className="bg-background border border-border rounded-md flex flex-col gap-2 p-4">
              <img src={item.url} alt={item.name} className="w-30 h-30 object-cover rounded-md" />
              <Label>Classification</Label>
              <select
                value={classifications[i]?.label}
                onChange={e => handleClassificationChange(i, e.target.value as 'casual' | 'diplomatic')}
                className="border rounded px-2 py-1"
              >
                <option value="diplomatic">Diplomatic</option>
                <option value="casual">Casual</option>
              </select>
              <Label>AI Caption</Label>
              <Input value={classifications[i]?.caption || ''} readOnly />
              <Button className="mt-2" onClick={() => handleSave(i)}>
                Classify
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
