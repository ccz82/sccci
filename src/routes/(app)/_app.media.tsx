import { createFileRoute } from '@tanstack/react-router'
import { Check, ChevronsUpDown, Filter, Grid, List, Pencil, Plus, Search, SearchX, Trash2, TrashIcon, Upload } from 'lucide-react';
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



export default function MediaView({ albums, media }: { albums: any[], media: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid"); // unified view mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [newAlbumType, setNewAlbumType] = useState("general");
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  // Edit Album state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAlbumName, setEditAlbumName] = useState("");
  const [editAlbumType, setEditAlbumType] = useState("general");

  const filteredAlbums = albums.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const albumImages = selectedAlbum
    ? selectedAlbum.id
      ? media.filter(m => m.album === selectedAlbum.id)
      : media.filter(m => !m.album) // unassigned
    : [];

  // toggle album view/list
  const toggleViewMode = () => {
    setViewMode(prev => (prev === "grid" ? "list" : "grid"));
  };

  const toggleSelect = (id: string) => {
    setSelectedImages(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<string | null>(null);

  return (
    <TabsContent value="view" className="flex flex-col gap-4">

      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Images</DialogTitle>
            <DialogDescription>
              {moveTarget
                ? `Move ${selectedImages.length} images to "${albums.find(a => a.id === moveTarget)?.name ?? "Unknown"
                }"?`
                : `Move ${selectedImages.length} images to Unassigned?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  for (const id of selectedImages) {
                    await pb.collection("media").update(id, {
                      album: moveTarget, // null = unassigned
                    });
                  }
                  toast.success("Images moved successfully!");
                  setSelectedImages([]);
                  setSelectMode(false);
                  setMoveDialogOpen(false);
                } catch (err) {
                  toast.error("Failed to move images.");
                }
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Search + Create Album only in album list view */}
      {!selectedAlbum && (
        <div className="justify-between flex flex-row gap-4 items-center">
          <Input
            placeholder="Search albums..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-3/5"
          />

          <div className='flex flex-row items-center  gap-2'>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus />New Album</Button>
              </DialogTrigger>
            </Dialog>
            <Button variant="outline" onClick={toggleViewMode}>
              {viewMode === "grid" ? <List /> : <Grid />}
            </Button>
          </div>
        </div>
      )}

      {/* Album list or Album view */}
      {!selectedAlbum ? (
        <ScrollArea className="grow h-1 rounded-md border p-4">
          {filteredAlbums.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No albums found.
            </div>
          ) : (
            <div
              className={cn(
                "gap-4",
                viewMode === "grid"
                  ? "grid grid-cols-2 md:grid-cols-3"
                  : "flex flex-col"
              )}
            >
              {filteredAlbums.map(album => {
                const firstImage = media.find(m => m.album === album.id);
                return (
                  <div
                    key={album.id}
                    className={cn(
                      "rounded-md border overflow-hidden cursor-pointer hover:shadow-md transition",
                      viewMode === "list" && "flex flex-row items-center"
                    )}
                    onClick={() => {
                      setSelectedAlbum(album);
                      setEditAlbumName(album.name);
                      setEditAlbumType(album.type);
                    }}
                  >
                    {firstImage ? (
                      <img
                        src={pb.files.getUrl(firstImage, firstImage.image)}
                        className={cn(
                          "object-cover",
                          viewMode === "grid"
                            ? "w-full h-40"
                            : "w-32 h-32 flex-shrink-0"
                        )}
                      />
                    ) : (
                      <div
                        className={cn(
                          "bg-muted flex items-center justify-center",
                          viewMode === "grid" ? "w-full h-40" : "w-32 h-32"
                        )}
                      >
                        No image
                      </div>
                    )}
                    <div className="p-2 flex flex-row justify-between items-center w-full">
                      <p className="font-semibold">{album.name}</p>
                      <p
                        className={cn(
                          "text-sm",
                          album.type === "general"
                            ? "text-blue-600"
                            : album.type === "painting"
                              ? "text-pink-700"
                              : "text-orange-700"
                        )}
                      >
                        • {album.type}
                      </p>
                    </div>
                  </div>
                );
              })}
              {/* Add "Unassigned" album */}
              <div
                key="__unassigned__"
                className={cn(
                  "rounded-md border overflow-hidden cursor-pointer hover:shadow-md transition",
                  viewMode === "list" && "flex flex-row items-center"
                )}
                onClick={() => setSelectedAlbum({ id: null, name: "Unassigned", type: "general" })}
              >
                <div
                  className={cn(
                    "bg-muted flex items-center justify-center",
                    viewMode === "grid" ? "w-full h-40" : "w-32 h-32"
                  )}
                >
                  No image
                </div>
                <div className="p-2 flex flex-row justify-between items-center w-full">
                  <p className="font-semibold">Unassigned</p>
                  <p className="text-sm text-gray-500">• unassigned</p>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>
      ) : (
        <div className="h-full flex flex-col gap-3">
          {/* inside album controls */}
          <div className="flex flex-row justify-between items-center">
            <div className="flex gap-2">
              <Button onClick={() => setSelectedAlbum(null)}>← Back</Button>
              <Button
                variant={selectMode ? "outline" : "default"}
                onClick={() => {
                  setSelectMode(!selectMode)
                  setSelectedImages([]) // reset on exit
                }}
              >
                {selectMode ? "Exit Select Mode" : "Select Images"}
              </Button>

              {selectMode && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selectedImages.length === albumImages.length) {
                        setSelectedImages([]) // Deselect all
                      } else {
                        setSelectedImages(albumImages.map(img => img.id)) // Select all
                      }
                    }}
                  >
                    {selectedImages.length === albumImages.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>

                  {/* Move to Album */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline">
                        Move to Album
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0">
                      <Command>
                        <CommandInput placeholder="Search albums..." className="h-9" />
                        <CommandList>
                          <CommandEmpty>No album found.</CommandEmpty>
                          <CommandGroup>
                            {albums.map((album) => (
                              <CommandItem
                                key={album.id}
                                value={album.name}
                                onSelect={() => {
                                  setMoveTarget(album.id);
                                  setMoveDialogOpen(true);
                                }}
                              >
                                {album.name}
                              </CommandItem>
                            ))}

                            {/* Add "Unassigned" as an option */}
                            <CommandItem
                              key="__unassigned__"
                              value="Unassigned"
                              onSelect={() => {
                                setMoveTarget(null);
                                setMoveDialogOpen(true);
                              }}
                            >
                              Unassigned
                            </CommandItem>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Delete Images */}
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      try {
                        for (const id of selectedImages) {
                          await pb.collection("media").delete(id);
                        }
                        toast.success("Images deleted.");
                        setSelectedImages([]);
                        setSelectMode(false);
                      } catch (err) {
                        toast.error("Failed to delete images.");
                      }
                    }}
                  >
                    <Trash2 className="mr-1" /> Delete
                  </Button>
                </>
              )}
            </div>
            <div className='flex flex-row items-center  gap-2'>
              <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                <Pencil /> Edit Album
              </Button>
              <Button variant="outline" onClick={toggleViewMode}>
                {viewMode === "grid" ? <List /> : <Grid />}
              </Button>
            </div>
          </div>
          <ScrollArea className="grow rounded-md border p-4">
            {albumImages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No images in this album.
              </div>
            ) : (
              <div
                className={cn(
                  "gap-4 m-1",
                  viewMode === "grid"
                    ? "grid grid-cols-2 md:grid-cols-4"
                    : "flex flex-col"
                )}
              >
                {albumImages.map(img => (
                  <div
                    key={img.id}
                    className={cn(
                      "relative border rounded-md overflow-hidden cursor-pointer",
                      selectedImages.includes(img.id) && "outline-2 outline-primary",
                      viewMode === "list" && "flex flex-row items-center"
                    )}
                    onClick={() => {
                      if (selectMode) {
                        toggleSelect(img.id);
                      } else {
                        setEnlargedImage(pb.files.getUrl(img, img.image));
                      }
                    }}
                  >
                    <img
                      src={pb.files.getUrl(img, img.image)}
                      alt={img.filename}
                      className={cn(
                        "object-cover",
                        viewMode === "grid"
                          ? "w-full h-40"
                          : "w-32 h-32 flex-shrink-0"
                      )}
                    />
                    <div className="p-2">
                      <p className="truncate">{img.filename}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Enlarged image & edit album dialogs remain same */}

      <Dialog open={!!enlargedImage} onOpenChange={() => setEnlargedImage(null)}>
        <DialogContent className="max-w-4xl p-0">
          {enlargedImage && (
            <img
              src={enlargedImage}
              alt="Enlarged"
              className="w-full h-auto object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>

    </TabsContent>
  );
}



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
        <MediaView albums={albums} media={media} />

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
                                  : "Select album"}
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
