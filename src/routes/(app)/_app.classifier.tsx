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

export const Route = createFileRoute('/(app)/_app/classifier')({
  component: RouteComponent,
})

function RouteComponent() {
  // Upload images, then redirect to classify page
  const handleSubmit = async () => {
    try {
      const uploaded: { url: string; name: string }[] = [];
      for (const item of files) {
        const parsed = mediaSchema.parse(item);
        const formData = new FormData();
        formData.append("filename", parsed.title);
        formData.append("album", "");
        formData.append("type", parsed.type);
        formData.append("image", parsed.image);
        const record = await pb.collection("media").create(formData);
        uploaded.push({ url: pb.files.getUrl(record, record.image), name: record.filename });
      }
      toast.success("All images uploaded successfully!");
      setFiles([]);
      // Save uploaded image info to localStorage and redirect
      localStorage.setItem('uploadedImages', JSON.stringify(uploaded));
      navigate({ to: '/classify' });
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Validation or upload failed!");
    }
  };
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<MediaItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files).map(file => ({
      title: file.name,
      type: "event" as const,
      image: file,
    }));
    setFiles(prev => [...prev, ...droppedFiles]);
  }

  const handleChooseFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const chosenFiles = Array.from(e.target.files).map(file => ({
      title: file.name,
      type: "event" as const,
      image: file,
    }));
    setFiles(prev => [...prev, ...chosenFiles]);
  }

  const updateFile = (index: number, updates: Partial<MediaItem>) => {
    setFiles(prev => {
      const newFiles = [...prev]
      newFiles[index] = { ...newFiles[index], ...updates }
      return newFiles
    })
  }

  // (removed fetchLibraryImages and misplaced return)
  return (
    <div className='w-full mx-6 my-5 flex flex-col'>
      <div className='my-4 flex flex-col gap-3'>
        <h1 className='text-3xl font-bold'>Upload Images</h1>
        <h2 className='text-muted-foreground'>Select images to upload. After uploading, you will proceed to classification.</h2>
      </div>
      <div className={`grow max-h-1/5 flex items-center justify-center border-2 border-dashed rounded-lg text-center transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="py-8 flex flex-col items-center gap-4">
          <div>
            <p className="text-lg font-medium text-foreground mb-1">Drop your images here</p>
            <p className="text-sm text-muted-foreground mb-4">Supports JPG, PNG, GIF up to 10MB each</p>
            <input
              type="file"
              multiple
              hidden
              ref={fileInputRef}
              onChange={handleChooseFiles}
            />
            <Button onClick={() => fileInputRef.current?.click()}>Choose Files</Button>
          </div>
        </div>
      </div>
      {files.length > 0 && (
        <>
          <ScrollArea className='bg-sidebar-primary-foreground rounded-md grow h-1 gap-2 my-4'>
            <div className='grid grid-cols-2 gap-4 m-4'>
              {files.map((item, i) => (
                <div key={i} className="bg-background border border-border rounded-md flex items-start justify-between gap-4 p-4">
                  <div className='flex flex-row gap-4'>
                    <img
                      src={URL.createObjectURL(item.image)}
                      alt={item.title}
                      className="w-30 h-30 object-cover rounded-md"
                    />
                    <div className='flex flex-col gap-2'>
                      <Label>Title</Label>
                      <Input
                        value={item.title}
                        onChange={e => updateFile(i, { title: e.target.value })}
                        placeholder="Enter title"
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                  >
                    <TrashIcon />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
          <Button onClick={handleSubmit}>Upload All</Button>
        </>
      )}
    </div>
  );
}
