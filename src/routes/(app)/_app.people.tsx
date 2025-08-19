import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react';
import { pb } from '~/lib/pb';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { ScrollArea } from '~/components/ui/scroll-area';
import { cn } from '~/lib/utils';
import { Grid, List, SquareDashedMousePointer, CheckSquare, PlayCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"

function RecognitionSession({ album, images, onCancel, onFinish }: {
  album: any,
  images: any[],
  onCancel: () => void,
  onFinish: () => void,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [faces, setFaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const currentImage = images[currentIndex];

  useEffect(() => {
    if (!currentImage) return;
    const runDetection = async () => {
      setLoading(true);
      try {
        const formData = new FormData();
        const fileUrl = pb.files.getURL(currentImage, currentImage.image);
        const resp = await fetch(fileUrl);
        const blob = await resp.blob();
        formData.append("image", blob, currentImage.filename);

        const detectResp = await fetch("http://localhost:5000/detect", {
          method: "POST",
          body: formData
        });
        const detectData = await detectResp.json();

        // batch identify
        const faceForm = new FormData();
        detectData.faces.forEach((f: any, i: number) => {
          const bstr = atob(f.face_base64);
          const arr = new Uint8Array(bstr.length);
          for (let j = 0; j < bstr.length; j++) arr[j] = bstr.charCodeAt(j);
          const blob = new Blob([arr], { type: "image/jpeg" });
          faceForm.append("faces", blob, `face${i}.jpg`);
        });

        const identifyResp = await fetch("http://localhost:5000/identify", {
          method: "POST",
          body: faceForm
        });
        const identifyData = await identifyResp.json();

        const enriched = detectData.faces.map((f: any, i: number) => ({
          ...f,
          suggestion: identifyData.results[i] ?? null,
          approvedPerson: identifyData.results[i]?.match
            ? identifyData.results[i].name
            : null
        }));
        setFaces(enriched);
      } catch (err) {
        console.error(err);
        toast.error("Failed to detect faces");
      } finally {
        setLoading(false);
      }
    };
    runDetection();
  }, [currentIndex, currentImage]);

  const handleApprove = async () => {
    try {
      // save recognised individuals
      const recognised_ids: string[] = [];
      for (const face of faces) {
        if (face.approvedPerson) {
          // find person in pocketbase by name
          const people = await pb.collection("people").getFullList({ filter: `name="${face.approvedPerson}"` });
          if (people.length > 0) {
            recognised_ids.push(people[0].id);
          }
        }
      }
      await pb.collection("media").update(currentImage.id, {
        facesProcessed: true,
        recognised_ids,
      });

      if (currentIndex + 1 < images.length) {
        setCurrentIndex(currentIndex + 1);
      } else {
        onFinish();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save results");
    }
  };

  if (!currentImage) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p>No unprocessed images found in this album.</p>
        <Button onClick={onCancel}>Back</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold">Facial Recognition Session</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleApprove} disabled={loading}>
            Approve & Next
          </Button>
        </div>
      </div>
      <div className="flex flex-row gap-4 grow">
        {/* image with bounding boxes */}
        <div className="relative flex-1 border rounded-md overflow-hidden">
          <img
            src={pb.files.getURL(currentImage, currentImage.image)}
            alt={currentImage.filename}
            className="w-full object-contain"
          />
          {faces.map((f, i) => (
            <div
              key={i}
              className="absolute border-2 border-red-500"
              style={{
                top: f.y,
                left: f.x,
                width: f.w,
                height: f.h,
              }}
            />
          ))}
        </div>
        {/* sidebar with faces */}
        <div className="w-64 border rounded-md p-2 overflow-y-auto">
          <h3 className="font-semibold mb-2">Detected Faces</h3>
          {faces.map((f, i) => (
            <div key={i} className="flex flex-col gap-1 mb-3 border-b pb-2">
              <img
                src={`data:image/jpeg;base64,${f.face_base64}`}
                alt={`face-${i}`}
                className="w-full h-24 object-cover rounded-md"
              />
              <p className="text-xs">
                {f.suggestion?.match
                  ? `Suggested: ${f.suggestion.name} (${(f.suggestion.confidence * 100).toFixed(1)}%)`
                  : "No match"}
              </p>
              <Input
                value={f.approvedPerson ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setFaces(prev =>
                    prev.map((ff, j) => j === i ? { ...ff, approvedPerson: val } : ff)
                  );
                }}
                placeholder="Assign person"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FaceGallery({ albums, media }: { albums: any[], media: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "processed" | "unprocessed">("all");

  const [recognitionMode, setRecognitionMode] = useState(false);

  // Only general albums
  const generalAlbums = albums.filter(a => a.type === "general");
  const filteredAlbums = generalAlbums.filter(a =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const albumImages = selectedAlbum
    ? media.filter(m => m.album === selectedAlbum.id)
      .filter(m =>
        filter === "all"
          ? true
          : filter === "processed"
            ? m.facesProcessed
            : !m.facesProcessed
      )
    : [];

  const toggleViewMode = () => setViewMode(prev => prev === "grid" ? "list" : "grid");

  const toggleSelect = (id: string) => {
    setSelectedImages(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // metrics
  const processedImages = media.filter(m => m.facesProcessed).length;
  const unprocessedImages = media.filter(m => !m.facesProcessed).length;
  const recognisedIndividuals = new Set(media.flatMap(m => m.recognised_ids ?? [])).size;

  if (recognitionMode && selectedAlbum) {
    return (
      <RecognitionSession
        album={selectedAlbum}
        images={albumImages.filter(img => !img.facesProcessed)}
        onCancel={() => setRecognitionMode(false)}
        onFinish={() => {
          toast.success("Recognition completed!");
          setRecognitionMode(false);
        }}
      />
    );
  }

  return (
    <div className='flex flex-col h-full'>
      <div className="mb-3 grid grid-cols-3 gap-4">
        <div className="p-4 border rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">Processed Images</p>
          <p className="text-2xl font-bold">{processedImages}</p>
        </div>
        <div className="p-4 border rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">Unprocessed Images</p>
          <p className="text-2xl font-bold">{unprocessedImages}</p>
        </div>
        <div className="p-4 border rounded-lg bg-muted">
          <p className="text-sm text-muted-foreground">Recognised Individuals</p>
          <p className="text-2xl font-bold">{recognisedIndividuals}</p>
        </div>
      </div>
      {!selectedAlbum ? (
        <div className="flex flex-col gap-3 h-full">
          <div className="flex items-center justify-between">
            <Input
              placeholder="Search albums..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-1/2"
            />
            <Button variant="outline" onClick={toggleViewMode}>
              {viewMode === "grid" ? <List /> : <Grid />}
            </Button>
          </div>
          <ScrollArea className="grow h-1 rounded-md border p-4">
            {filteredAlbums.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No general albums found.
              </div>
            ) : (
              <div
                className={cn(
                  "m-1 gap-4",
                  viewMode === "grid"
                    ? "grid grid-cols-2 md:grid-cols-3"
                    : "flex flex-col"
                )}
              >
                {filteredAlbums.map(album => {
                  const albumCount = media.filter(m => m.album === album.id).length;
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
                        setSelectedImages([]);
                        setSelectMode(false);
                      }}
                    >
                      {firstImage ? (
                        <img
                          src={pb.files.getURL(firstImage, firstImage.image)}
                          className={cn(
                            "object-cover",
                            viewMode === "grid" ? "w-full h-40" : "w-32 h-32 flex-shrink-0"
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
                        <div>
                          <p className="font-semibold">{album.name}</p>
                          <p className="text-xs text-muted-foreground">{albumCount} images</p>
                        </div>
                        <p className="text-sm text-blue-600">• general</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      ) : (
        <div className="h-full flex flex-col">
          {/* Album controls */}
          <div className="mb-3 flex flex-row justify-between items-center">
            <div className="flex gap-2">
              <Button onClick={() => setSelectedAlbum(null)}>← Back</Button>


              <Button
                variant={selectMode ? "outline" : "default"}
                onClick={() => {
                  setSelectMode(!selectMode)
                  setSelectedImages([])
                }}
              >
                <SquareDashedMousePointer />
                {selectMode ? "Exit Select Mode" : "Select Images"}
              </Button>

              {selectMode && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selectedImages.length === albumImages.length) {
                        setSelectedImages([])
                      } else {
                        setSelectedImages(albumImages.map(img => img.id))
                      }
                    }}
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    {selectedImages.length === albumImages.length ? "Deselect All" : "Select All"}
                  </Button>
                  <Button
                    onClick={() => setRecognitionMode(true)}
                  >
                    <PlayCircle className="mr-2 h-4 w-4" /> Run Facial Recognition
                  </Button>
                </>
              )}
            </div>
            <div className='flex flex-row items-center gap-2'>

              <p className="text-sm text-muted-foreground">
                {albumImages.length} images in this album
              </p>
              {/* Filter dropdown */}
              <Select
                value={filter}
                onValueChange={(val: "all" | "processed" | "unprocessed") => setFilter(val)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter images" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="unprocessed">Unprocessed</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={toggleViewMode}>
                {viewMode === "grid" ? <List /> : <Grid />}
              </Button>
            </div>
          </div>

          {/* Album image grid/list */}
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
                      if (selectMode) toggleSelect(img.id);
                    }}
                  >
                    <img
                      src={pb.files.getURL(img, img.image)}
                      alt={img.filename}
                      className={cn(
                        "object-cover",
                        viewMode === "grid" ? "w-full h-40" : "w-32 h-32 flex-shrink-0"
                      )}
                    />
                    <div className="p-2 flex flex-col">
                      <p className="truncate">{img.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {img.facesProcessed ? "Processed" : "Unprocessed"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  )
}

export const Route = createFileRoute('/(app)/_app/people')({
  loader: async () => {
    const albums = await pb.collection("albums").getFullList();
    const media = await pb.collection("media").getFullList();
    return { albums, media };
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { albums, media } = Route.useLoaderData();
  return (
    <div className="w-full mx-6 my-4 flex flex-col">
      <div className="my-4 flex flex-col gap-3">
        <h1 className="text-3xl font-bold">People</h1>
        <p className="text-muted-foreground">Browse through the list of individuals detected in images, and start facial recognition processing tasks.</p>
      </div>
      <FaceGallery albums={albums} media={media} />
    </div>
  )
}
