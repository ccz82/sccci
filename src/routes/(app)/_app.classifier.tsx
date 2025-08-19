import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Search, TrashIcon, Upload, PencilIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Button } from '~/components/ui/button';
import { useEffect, useRef, useState } from 'react';
import { pb } from '~/lib/pb';
import { toast } from 'sonner';
import { z } from 'zod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Input } from '~/components/ui/input';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Label } from '~/components/ui/label';

const mediaSchema = z.object({
  title: z.string().min(1, "Title is required."),
  type: z.enum(["event", "minute", "painting", "general"]),
  image: z.instanceof(File),
})

type MediaItem = z.infer<typeof mediaSchema> & {
  classification?: {
    label: 'casual' | 'diplomatic',
    analysis: string
  },
  _editingClassification?: boolean;
}

// Mock AI classification function
async function mockClassifyImage(file: File): Promise<{ label: 'casual' | 'diplomatic', analysis: string }> {
  await new Promise(res => setTimeout(res, 1000));
  const label = Math.random() > 0.5 ? 'casual' : 'diplomatic';
  const analysis = label === 'casual'
    ? 'The image contains informal attire and relaxed body language, indicating a casual event.'
    : 'The image shows formal clothing and structured setting, suggesting a diplomatic event.';
  return { label, analysis };
}


function RouteComponent() {
  const navigate = useNavigate();

  const handleFetchAndClassify = async () => {
    try {
  const records = await pb.collection('media').getFullList();
      const imgs = records.map((rec: any) => ({
        url: pb.files.getUrl(rec, rec.image),
        name: rec.filename || rec.title || rec.name || '',
        id: rec.id
      }));
      // Save fetched image info to localStorage and redirect
      localStorage.setItem('uploadedImages', JSON.stringify(imgs));
      navigate({ to: '/classify' });
    } catch (err) {
      toast.error('Failed to fetch images from PocketBase.');
    }
  };

  return (
    <div className='w-full mx-6 my-5 flex flex-col items-center justify-center'>
      <h1 className='text-3xl font-bold mb-4'>Fetch Images from PocketBase</h1>
      <Button onClick={handleFetchAndClassify}>Fetch and Classify Images from Album "event A"</Button>
    </div>
  );
}

export const Route = createFileRoute('/(app)/_app/classifier')({
  component: RouteComponent,
});
