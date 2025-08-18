import { createFileRoute } from '@tanstack/react-router'
import { Search, TrashIcon, Upload, PencilIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Button } from '~/components/ui/button';
import { useRef, useState } from 'react';
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
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState<MediaItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFiles = await Promise.all(Array.from(e.dataTransfer.files).map(async file => {
      const classification = await mockClassifyImage(file);
      return {
        title: file.name,
  type: "event" as const,
        image: file,
        classification,
      };
    }));
    setFiles(prev => [...prev, ...droppedFiles]);
  }

  const handleChooseFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const chosenFiles = await Promise.all(Array.from(e.target.files).map(async file => {
      const classification = await mockClassifyImage(file);
      return {
        title: file.name,
  type: "event" as const,
        image: file,
        classification,
      };
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

  const handleSubmit = async () => {
    try {
      for (const item of files) {
        const parsed = mediaSchema.parse(item) // validate with zod
        const formData = new FormData()
        formData.append("title", parsed.title)
        formData.append("type", "event")
        formData.append("image", parsed.image)
        if (item.classification) {
          formData.append("analysis", item.classification.analysis)
          formData.append("classification_label", item.classification.label)
        }

        const record = await pb.collection("events").create(formData)
        console.log("Uploaded:", record)
      }
      toast.success("All images uploaded successfully!")
      setFiles([])
    } catch (err) {
      console.error("Upload error:", err)
      toast.error("Validation or upload failed!")
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className='w-full mx-6 my-5 flex flex-col'>
      <div className='my-4 flex flex-col gap-3'>
        <h1 className='text-3xl font-bold'>Event Classifier</h1>
        <h2 className='text-muted-foreground'>Upload your images here.</h2>
      </div>
      <Tabs defaultValue="upload" className='h-full w-full'>
        <TabsList>
          <TabsTrigger value="view"><Search />Browse and Search</TabsTrigger>
          <TabsTrigger value="upload"><Upload />Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="view">
          {/* TODO: gallery / search */}
        </TabsContent>

        <TabsContent value="upload" className='flex flex-col gap-6 h-full w-full'>
          {files.length > 0 ? (
            <>
              <div
                className={`grow max-h-1/5 flex items-center justify-center border-2 border-dashed rounded-lg text-center transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
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
              <ScrollArea className='bg-sidebar-primary-foreground rounded-md grow h-1 gap-2 '>
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
                          <Label>
                            Title
                          </Label>
                          <Input
                            value={item.title}
                            onChange={e => updateFile(i, { title: e.target.value })}
                            placeholder="Enter title"
                          />
                          <Label>
                            Type
                          </Label>
                          <Select
                            value={item.type}
                            onValueChange={(val: "minute" | "painting" | "general" | "event") => updateFile(i, { type: val })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="minute">Meeting Minute</SelectItem>
                              <SelectItem value="painting">Painting</SelectItem>
                              <SelectItem value="general">General</SelectItem>
                              <SelectItem value="event">Event</SelectItem>
                            </SelectContent>
                          </Select>
                          {item.classification && (
                            <div className="mt-2 p-2 border rounded bg-muted">
                              <div className="font-semibold flex items-center gap-2">
                                Classified as: <span className={item.classification.label === 'casual' ? 'text-blue-600' : 'text-green-700'}>{item.classification.label.charAt(0).toUpperCase() + item.classification.label.slice(1)}</span>
                                <Button size="icon" variant="ghost" onClick={() => updateFile(i, { _editingClassification: true })} aria-label="Edit classification">
                                  <PencilIcon className="w-4 h-4" />
                                </Button>
                              </div>
                              {item._editingClassification ? (
                                <div className="flex flex-col gap-2 mt-2">
                                  <Select value={item.classification.label} onValueChange={val => updateFile(i, { classification: { ...item.classification!, label: val as 'casual' | 'diplomatic' } })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="casual">Casual</SelectItem>
                                      <SelectItem value="diplomatic">Diplomatic</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Input value={item.classification.analysis} onChange={e => updateFile(i, { classification: { ...item.classification!, analysis: e.target.value } })} placeholder="Analysis" />
                                  <div className="flex gap-2">
                                    <Button size="sm" onClick={() => updateFile(i, { _editingClassification: false })}>Save</Button>
                                    <Button size="sm" variant="ghost" onClick={() => updateFile(i, { _editingClassification: false })}>Cancel</Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {item.classification.analysis}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => removeFile(i)}
                      >
                        <TrashIcon />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <Button onClick={handleSubmit}>Submit All</Button>
            </>
          ) :
            <div
              className={`h-full w-full flex items-center justify-center border-2 border-dashed rounded-lg text-center transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-muted">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
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
          }
        </TabsContent>
      </Tabs>
    </div>
  )

}
