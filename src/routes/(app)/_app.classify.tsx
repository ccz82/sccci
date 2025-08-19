import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
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


function ClassifyPage() {
  const [allImages, setAllImages] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [manualLabels, setManualLabels] = useState<Record<number, 'casual' | 'diplomatic' | ''>>({});
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch images from PocketBase where album is 'event A'
    (async () => {
      try {
        const records = await pb.collection('media').getFullList({
          filter: "album = 'event A'"
        });
        const imgs = records.map((rec: any) => ({
          url: pb.files.getUrl(rec, rec.image),
          name: rec.filename || rec.title || rec.name || '',
          id: rec.id
        }));
        setAllImages(imgs);
      } catch (err) {
        setAllImages([]);
      }
    })();
  }, []);

  const images = allImages.filter(img => selectedIds.includes(img.id));

  const handleClassify = async () => {
    const classified = await Promise.all(images.map(async (img, i) => {
      // If user selected a label, use it, otherwise use AI
      let label = manualLabels[i];
      let caption = '';
      if (!label) {
        const res = await mockClassifyAndCaption(img.url);
        label = res.label as 'casual' | 'diplomatic';
        caption = res.caption;
      } else {
        caption = label === 'casual'
          ? 'A casual event with relaxed atmosphere.'
          : 'A diplomatic event with formal setting.';
      }
      return { ...img, label, caption };
    }));
    setResults(classified);
  };

  const handleManualLabelChange = (index: number, value: 'casual' | 'diplomatic') => {
    setManualLabels(prev => ({ ...prev, [index]: value }));
    // If already classified, update result label/caption as well
    setResults(prev => prev.map((item, i) => i === index ? {
      ...item,
      label: value,
      caption: value === 'casual'
        ? 'A casual event with relaxed atmosphere.'
        : 'A diplomatic event with formal setting.'
    } : item));
  };


  if (!allImages.length) {
    return (
      <div className="w-full mx-6 my-5 flex flex-col">
        <h1 className="text-3xl font-bold mb-4">No images found in album 'event A'</h1>
        <Button onClick={() => navigate({ to: '/classifier' })}>Go to Upload</Button>
      </div>
    );
  }

  return (
    <div className="w-full mx-6 my-5 flex flex-col">
      <h1 className="text-3xl font-bold mb-4">Select Images to Classify</h1>
      <ScrollArea className="rounded-md grow h-1 gap-2 ">
        <div className="grid grid-cols-4 gap-4 m-4">
          {allImages.map((item) => (
            <div key={item.id} className={`bg-background border border-border rounded-md flex flex-col gap-2 p-4 ${selectedIds.includes(item.id) ? 'ring-2 ring-primary' : ''}`}>
              <img src={item.url} alt={item.name} className="w-30 h-30 object-cover rounded-md" />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={e => {
                    setSelectedIds(ids => e.target.checked ? [...ids, item.id] : ids.filter(id => id !== item.id));
                  }}
                />
                <Label>Select</Label>
              </div>
              <div className="text-xs text-muted-foreground">{item.name}</div>
            </div>
          ))}
        </div>
      </ScrollArea>
      {images.length > 0 && <>
        <h2 className="text-2xl font-bold mt-8 mb-4">Classify Selected Images</h2>
        <ScrollArea className="rounded-md grow h-1 gap-2 ">
          <div className="grid grid-cols-2 gap-4 m-4">
            {(results.length ? results : images).map((item, i) => (
              <div key={item.id} className="bg-background border border-border rounded-md flex flex-col gap-2 p-4">
                <img src={item.url} alt={item.name} className="w-30 h-30 object-cover rounded-md" />
                <Label>Classification</Label>
                <Select value={manualLabels[i] || item.label || ''} onValueChange={(val) => handleManualLabelChange(i, val as 'casual' | 'diplomatic')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="diplomatic">Diplomatic</SelectItem>
                  </SelectContent>
                </Select>
                {item.caption && <>
                  <Label>AI Caption</Label>
                  <div>{item.caption}</div>
                </>}
              </div>
            ))}
          </div>
        </ScrollArea>
        <Button className="mt-4" onClick={handleClassify} disabled={!!results.length}>Classify All</Button>
      </>}
    </div>
  );
}
