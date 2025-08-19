import { createFileRoute } from '@tanstack/react-router'
import { Check, ChevronsUpDown, Filter, Search, SearchX, TrashIcon, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Button } from '~/components/ui/button';
import { useRef, useState } from 'react';
import { pb } from '~/lib/pb';
import { toast } from 'sonner';
import { z, ZodError } from 'zod';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Input } from '~/components/ui/input';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Label } from '~/components/ui/label';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command"
import { cn } from '~/lib/utils';

const mediaSchema = z.object({
  filename: z.string().min(1, "Title is required."),
  album: z.string().min(1, "Album is required."),
  image: z.instanceof(File),
})

type MediaItem = z.infer<typeof mediaSchema>

export const Route = createFileRoute('/(app)/_app/media')({
  loader: async () => {
    const albums = await pb.collection("albums").getFullList();
    const media = await pb.collection("media").getFullList();
    return { albums: albums, media: media };
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { albums: albums, media: media } = Route.useLoaderData();
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFiles = Array.from(e.dataTransfer.files).map(file => ({
      filename: file.name,
      album: "" as const,
      image: file,
    }))
    setFiles(prev => [...prev, ...droppedFiles])
  }

  const handleChooseFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const chosenFiles = Array.from(e.target.files).map(file => ({
      filename: file.name,
      album: "" as const,
      image: file,
    }))
    setFiles(prev => [...prev, ...chosenFiles])
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
        formData.append("filename", parsed.filename)
        formData.append("album", parsed.album)
        formData.append("image", parsed.image)

        const record = await pb.collection("media").create(formData)
        console.log("Uploaded:", record)
      }
      toast.success("All images uploaded successfully!")
      setFiles([])
    } catch (err: any) {
      console.error("Upload error:", err)
      // toast.error("Please fill in all the required fields.")
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAlbum, setSelectedAlbum] = useState("__all__");

  return (
    <div className='w-full mx-6 my-4 flex flex-col'>
      <div className='my-4 flex flex-col gap-3'>
        <h1 className='text-3xl font-bold'>Media Library</h1>
      </div>
      <Tabs defaultValue="view" className='h-full w-full'>
        <TabsList>
          <TabsTrigger value="view"><Search />Browse and Search</TabsTrigger>
          <TabsTrigger value="upload"><Upload />Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="view" className="flex flex-col gap-4">
          <div className="flex flex-row gap-4 items-center">
            <Input
              placeholder="Search by filename..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-3/5"
            />
            <Select
              value={selectedAlbum}
              onValueChange={(val) => setSelectedAlbum(val)}
            >
              <SelectTrigger className="w-1/5">
                <SelectValue placeholder="Filter by album" />
              </SelectTrigger>
              <SelectContent className='w-full'>
                <SelectItem value="__all__">All Albums</SelectItem>
                {albums.map((album) => (
                  <SelectItem className='w-full flex flex-row items-center justify-between' key={album.id} value={album.id}>
                    <div>
                      {album.name}
                    </div>
                    <div>

                      {album.type === "general" ?
                        <div className='text-blue-600'>
                          • General
                        </div>
                        :
                        album.type === "painting" ?
                          <div className='text-pink-700'>
                            • Painting
                          </div>
                          :
                          <div className='text-orange-700'>
                            • Meeting Minute
                          </div>
                      }
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAlbum !== "__all__" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAlbum("__all__")}
              >
                <Filter />
                Clear Filter
              </Button>
            )}
          </div>
          <ScrollArea className="h-1 grow rounded-md border">
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {media
                .filter((item) =>
                  item.filename.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .filter((item) =>
                  selectedAlbum && selectedAlbum !== "__all__"
                    ? item.album === selectedAlbum
                    : true
                ).length === 0 ? (
                <div className="flex flex-col items-center col-span-full text-center text-muted-foreground">
                  <SearchX size={50} />
                  No results found.
                </div>
              ) : (
                media
                  .filter((item) =>
                    item.filename.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .filter((item) =>
                    selectedAlbum && selectedAlbum !== "__all__"
                      ? item.album === selectedAlbum
                      : true
                  )
                  .map((item) => {
                    const album = albums.find((a) => a.id === item.album)
                    return (
                      <Dialog key={item.id}>
                        <DialogTrigger asChild>
                          <div className="cursor-pointer bg-background border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <img
                              src={pb.files.getURL(item, item.image)}
                              alt={item.filename}
                              className="w-full h-40 object-cover"
                            />
                            <div className="p-2 flex flex-col">
                              <p className="font-medium text-sm truncate">
                                {item.filename}
                              </p>
                              {album && (
                                <p className="w-full flex flex-row items-center justify-between text-xs text-muted-foreground">
                                  {album.name}{" "}
                                  {album.type === "general" ?
                                    <div className='text-blue-600'>
                                      • General
                                    </div>
                                    :
                                    album.type === "painting" ?
                                      <div className='text-pink-700'>
                                        • Painting
                                      </div>
                                      :
                                      <div className='text-orange-700'>
                                        • Meeting Minute
                                      </div>
                                  }
                                </p>
                              )}
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>{item.filename}</DialogTitle>
                            {album && (
                              <DialogDescription>
                                {album && (
                                  <p className="w-full flex flex-row items-center justify-between text-xs text-muted-foreground">
                                    {album.name}{" "}
                                    {album.type === "general" ?
                                      <div className='text-blue-600'>
                                        • General
                                      </div>
                                      :
                                      album.type === "painting" ?
                                        <div className='text-pink-700'>
                                          • Painting
                                        </div>
                                        :
                                        <div className='text-orange-700'>
                                          • Meeting Minute
                                        </div>
                                    }
                                  </p>
                                )}

                              </DialogDescription>
                            )}
                          </DialogHeader>
                          <div className="flex items-center justify-center">
                            <img
                              src={pb.files.getURL(item, item.image)}
                              alt={item.filename}
                              className="max-h-[70vh] object-contain rounded-lg"
                            />
                          </div>
                        </DialogContent>
                      </Dialog>
                    )
                  }))}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="upload" className='flex flex-col gap-3 h-full w-full'>
          {files.length > 0 ? (
            <>
              <div className="ml-3 flex flex-row items-center gap-2">
                <Label>Apply Album to All</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-64 justify-between",
                        !files.length && "pointer-events-none opacity-50",
                      )}
                      disabled={!files.length}
                    >
                      {files.length && files.every(f => f.album === files[0].album) && files[0].album
                        ? albums.find(a => a.id === files[0].album)?.name
                        : "Select album for all"}
                      <ChevronsUpDown className="opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search albums..." className="h-9" />
                      <CommandList>
                        <CommandEmpty>No album found.</CommandEmpty>
                        <CommandGroup>
                          {albums.map((album) => (
                            <CommandItem
                              value={album.name}
                              key={album.id}
                              onSelect={() => {
                                // Update ALL files with this album
                                setFiles(prev =>
                                  prev.map(file => ({ ...file, album: album.id }))
                                );
                              }}
                            >
                              <div className="flex flex-row items-center justify-between w-full">
                                <div className="flex flex-row items-center gap-3">
                                  <Check
                                    className={cn(
                                      "ml-auto",
                                      files.length &&
                                        files.every(f => f.album === album.id)
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <p className="mr-4">{album.name}</p>
                                </div>
                                <div>
                                  {album.type === "general" ?
                                    <div className="text-blue-600">• General</div>
                                    : album.type === "painting" ?
                                      <div className="text-pink-700">• Painting</div>
                                      : <div className="text-orange-700">• Meeting Minute</div>
                                  }
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <ScrollArea className='bg-muted rounded-md grow h-1 gap-2 '>
                <div
                  className={`m-4 grow max-h-1/5 flex items-center justify-center border-2 border-dashed rounded-lg text-center transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
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
                <div className='grid grid-cols-2 gap-4 m-4'>
                  {files.map((item, i) => (
                    <div key={i} className="bg-background border border-border rounded-md flex items-start justify-between gap-4 p-4">
                      <div className='flex flex-row gap-4'>
                        <img
                          src={URL.createObjectURL(item.image)}
                          alt={item.filename}
                          className="w-30 h-30 object-cover rounded-md"
                        />
                        <div className='flex flex-col gap-2'>
                          <Label>
                            Filename
                          </Label>
                          <Input
                            value={item.filename}
                            onChange={e => updateFile(i, { filename: e.target.value })}
                            placeholder="Enter filename"
                          />
                          <Label>
                            Album
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between",
                                  !item.album && "text-muted-foreground"
                                )}
                              >
                                {item.album
                                  ? albums.find(
                                    (album) => album.id === item.album
                                  )?.name
                                  : "Select language"}
                                <ChevronsUpDown className="opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-full p-0">
                              <Command>
                                <CommandInput
                                  placeholder="Search albums..."
                                  className="h-9"
                                />
                                <CommandList>
                                  <CommandEmpty>No album found.</CommandEmpty>
                                  <CommandGroup>
                                    {albums.map((album) =>
                                      <CommandItem
                                        value={album.name}
                                        key={album.id}
                                        onSelect={() => updateFile(i, { album: album.id })}
                                      >
                                        <div className='flex flex-row items-center justify-between w-full'>
                                          <div className='flex flex-row items-center gap-3'>
                                            <Check
                                              className={cn(
                                                "ml-auto",
                                                album.id === item.album
                                                  ? "opacity-100"
                                                  : "opacity-0"
                                              )}
                                            />
                                            <p className='mr-4'>
                                              {album.name}
                                            </p>
                                          </div>
                                          <div>
                                            {album.type === "general" ?
                                              <div className='text-blue-600'>
                                                • General
                                              </div>
                                              :
                                              album.type === "painting" ?
                                                <div className='text-pink-700'>
                                                  • Painting
                                                </div>
                                                :
                                                <div className='text-orange-700'>
                                                  • Meeting Minute
                                                </div>
                                            }
                                          </div>
                                        </div>
                                      </CommandItem>)
                                    }
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
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
              <Button onClick={handleSubmit}>Upload All</Button>
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
    </div >
  )

}
