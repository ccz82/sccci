import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/tabs"
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react';
import { pb } from '~/lib/pb';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Progress } from '~/components/ui/progress';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { cn } from '~/lib/utils';
import {
  Grid,
  List,
  SquareDashedMousePointer,
  CheckSquare,
  PlayCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  UserPlus,
  Check,
  Edit,
  X,
  User,
  Save
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select"

// const FACIAL_RECOGNITION_API_URL = "/api/facial_recognition";
const FACIAL_RECOGNITION_API_URL = 'http://152.69.221.68:3000';

interface DetectedFace {
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
  face_base64: string;
  embedding_extracted: boolean;
  suggestion?: {
    match: boolean;
    name?: string;
    confidence?: number;
    person_id?: string;
  } | null;
  approvedPerson?: string | null;
  approvedPersonId?: string | null;
  status?: 'pending' | 'approved' | 'new' | 'edited';
}

interface Person {
  id: string;
  name: string;
  pocketbase_id?: string;
  face_count: number;
  created_at: string;
}

function FaceRecognitionSession({ album, images, onCancel, onFinish }: {
  album: any,
  images: any[],
  onCancel: () => void,
  onFinish: () => void,
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentFaceIndex, setCurrentFaceIndex] = useState(0);
  const [faces, setFaces] = useState<DetectedFace[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAllBoundingBoxes, setShowAllBoundingBoxes] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [editPersonName, setEditPersonName] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [imgSize, setImgSize] = useState<{ width: number, height: number }>({ width: 0, height: 0 });
  const [saving, setSaving] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const currentImage = images[currentImageIndex];
  const currentFace = faces[currentFaceIndex];

  // Load people from Python backend
  useEffect(() => {
    const loadPeople = async () => {
      try {
        console.log(`${FACIAL_RECOGNITION_API_URL}/people`)
        const response = await fetch(`${FACIAL_RECOGNITION_API_URL}/people`);
        if (response.ok) {
          const data = await response.json();
          setPeople(data.people);
        }
      } catch (err) {
        console.error('Failed to load people:', err);
      }
    };
    loadPeople();
  }, []);

  // Detect faces when image changes
  useEffect(() => {
    if (!currentImage) return;

    const runDetection = async () => {
      setLoading(true);
      setCurrentFaceIndex(0);

      try {
        const formData = new FormData();
        const fileUrl = pb.files.getURL(currentImage, currentImage.image);
        const resp = await fetch(fileUrl);
        const blob = await resp.blob();
        formData.append("image", blob, currentImage.filename);
        formData.append("pocketbase_media_id", currentImage.id);

        // Detect faces
        const detectResp = await fetch(`${FACIAL_RECOGNITION_API_URL}/detect`, {
          method: "POST",
          body: formData
        });
        const detectData = await detectResp.json();

        if (detectData.faces && detectData.faces.length > 0) {
          // Batch identify faces
          const faceForm = new FormData();
          detectData.faces.forEach((f: any, i: number) => {
            if (f.embedding_extracted) {
              const bstr = atob(f.face_base64);
              const arr = new Uint8Array(bstr.length);
              for (let j = 0; j < bstr.length; j++) arr[j] = bstr.charCodeAt(j);
              const blob = new Blob([arr], { type: "image/jpeg" });
              faceForm.append("faces", blob, `face${i}.jpg`);
            }
          });

          // Only identify if we have faces with embeddings
          if (faceForm.has("faces")) {
            const identifyResp = await fetch(`${FACIAL_RECOGNITION_API_URL}/identify`, {
              method: "POST",
              body: faceForm
            });
            const identifyData = await identifyResp.json();

            const enrichedFaces = detectData.faces.map((f: any, i: number) => ({
              ...f,
              suggestion: f.embedding_extracted ? (identifyData.results[i] ?? null) : null,
              status: 'pending' as const
            }));

            setFaces(enrichedFaces);
          } else {
            // No embeddings extracted, set all faces as pending
            const facesWithoutSuggestions = detectData.faces.map((f: any) => ({
              ...f,
              suggestion: null,
              status: 'pending' as const
            }));
            setFaces(facesWithoutSuggestions);
          }
        } else {
          setFaces([]);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to detect faces");
      } finally {
        setLoading(false);
      }
    };

    runDetection();
  }, [currentImageIndex, currentImage]);

  const handleAddNewPerson = async () => {
    if (!newPersonName.trim() || !currentFace) return;

    try {
      // Create new person in PocketBase first
      console.log(`Creating new person in PocketBase: ${newPersonName.trim()}`);
      const newPbPerson = await pb.collection("people").create({
        name: newPersonName.trim()
      });
      console.log("Created PocketBase person:", newPbPerson);

      // Register face in the facial recognition system
      const bstr = atob(currentFace.face_base64);
      const arr = new Uint8Array(bstr.length);
      for (let j = 0; j < bstr.length; j++) arr[j] = bstr.charCodeAt(j);
      const blob = new Blob([arr], { type: "image/jpeg" });

      const registerForm = new FormData();
      registerForm.append("image", blob, `${newPersonName.trim()}.jpg`);
      registerForm.append("name", newPersonName.trim());
      registerForm.append("pocketbase_id", newPbPerson.id);

      console.log(`Registering face in facial recognition API for: ${newPersonName.trim()}`);
      const registerResp = await fetch(`${FACIAL_RECOGNITION_API_URL}/register`, {
        method: "POST",
        body: registerForm
      });

      if (!registerResp.ok) {
        throw new Error("Failed to register face in backend");
      }

      const registerData = await registerResp.json();
      console.log("Facial recognition API response:", registerData);

      // Update face status
      const updatedFaces = [...faces];
      updatedFaces[currentFaceIndex] = {
        ...currentFace,
        approvedPerson: newPersonName.trim(),
        status: 'new'
      };
      setFaces(updatedFaces);

      // Add to local people list with the correct PocketBase ID
      const newPerson: Person = {
        id: registerData.person_id, // This is the facial recognition API ID
        name: newPersonName.trim(),
        pocketbase_id: newPbPerson.id, // This is the PocketBase ID
        face_count: 1,
        created_at: new Date().toISOString()
      };

      console.log("Adding to local people list:", newPerson);
      setPeople([...people, newPerson]);
      setNewPersonName('');

      toast.success(`Added new person: ${newPersonName.trim()}`);
      moveToNextFace();
    } catch (err) {
      console.error("Error in handleAddNewPerson:", err);
      toast.error("Failed to add new person");
    }
  };

  const handleApproveMatch = () => {
    if (!currentFace?.suggestion?.name) return;

    const matchedPerson = people.find(p => p.name === currentFace.suggestion?.name);

    const updatedFaces = [...faces];
    updatedFaces[currentFaceIndex] = {
      ...currentFace,
      approvedPerson: currentFace.suggestion.name,
      approvedPersonId: matchedPerson?.pocketbase_id || null, // <-- assign PB ID
      status: 'approved'
    };
    setFaces(updatedFaces);

    toast.success(`Approved match: ${currentFace.suggestion.name}`);
    moveToNextFace();
  };

  const handleEditMatch = async () => {
    if (!editPersonName.trim() || !currentFace) return;

    try {
      let selectedPerson = people.find(p => p.name === editPersonName.trim());
      if (!selectedPerson) {
        toast.error("Person not found");
        return;
      }

      const updatedFaces = [...faces];
      updatedFaces[currentFaceIndex] = {
        ...currentFace,
        approvedPerson: editPersonName.trim(),
        approvedPersonId: selectedPerson?.pocketbase_id || null,  // ✅ must exist
        status: 'edited'
      };
      setFaces(updatedFaces);
      setEditPersonName('');

      toast.success(`Updated to: ${editPersonName.trim()}`);
      moveToNextFace();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update match");
    }
  };
  const moveToNextFace = () => {
    if (currentFaceIndex + 1 < faces.length) {
      setCurrentFaceIndex(currentFaceIndex + 1);
    } else {
      // All faces processed, save and move to next image
      saveImageResults();
    }
  };

  const saveImageResults = async () => {
    setSaving(true);
    try {
      const facesData = faces.map(face => ({
        face_base64: face.face_base64,
        approved_person: face.approvedPerson,
        approved_person_id: face.approvedPersonId,
        status: face.status,
        x: face.x,
        y: face.y,
        w: face.w,
        h: face.h,
        confidence: face.confidence
      }));

      const result = await fetch(`${FACIAL_RECOGNITION_API_URL}/media/${currentImage.id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faces: facesData })
      });

      console.log(result)

      const unique_people_ids = [...new Set(
        faces
          .map(face => face.approvedPersonId)
          .filter((id): id is string => !!id)
      )];

      console.log(unique_people_ids)

      await pb.collection("media").update(currentImage.id, {
        facesProcessed: true,
        people: unique_people_ids,  // ✅ should now contain PB IDs
      });

      if (currentImageIndex + 1 < images.length) {
        setCurrentImageIndex(currentImageIndex + 1);
      } else {
        onFinish();
      }
    } catch (err) {
      console.error("An error occurred during the save process:", err);
      toast.error("Failed to save results. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const selectFace = (index: number) => {
    setCurrentFaceIndex(index);
  };

  if (!currentImage) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p>No images found for processing.</p>
        <Button onClick={onCancel}>Back</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4">Detecting faces and extracting embeddings...</p>
      </div>
    );
  }

  if (saving) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4">Saving recognition results...</p>
      </div>
    );
  }

  if (faces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p>No faces detected in this image.</p>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => {
            if (currentImageIndex + 1 < images.length) {
              setCurrentImageIndex(currentImageIndex + 1);
            } else {
              onFinish();
            }
          }}>
            Next Image
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">Facial Recognition Session</h2>
          <p className="text-muted-foreground">
            Image {currentImageIndex + 1} of {images.length} • Face {currentFaceIndex + 1} of {faces.length}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>

          <div className="flex gap-3 justify-between items-center">
            <Button
              variant="outline"
              disabled={currentImageIndex === 0}
              onClick={() => setCurrentImageIndex(currentImageIndex - 1)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous Image
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentImage.filename}
            </span>
            <Button
              variant="outline"
              disabled={currentImageIndex === images.length - 1}
              onClick={() => setCurrentImageIndex(currentImageIndex + 1)}
            >
              Next Image
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowAllBoundingBoxes(!showAllBoundingBoxes)}
          >
            {showAllBoundingBoxes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>

          <Button
            onClick={saveImageResults}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Save & Continue
          </Button>
        </div>
      </div>

      <div className="flex gap-6 w-full h-full">
        {/* Left side - Image with bounding boxes */}
        <div className="flex flex-col gap-6 grow">
          <div className="relative border rounded-lg overflow-hidden bg-black max-h-[90vh]">
            <img
              ref={imgRef}
              src={pb.files.getURL(currentImage, currentImage.image)}
              alt={currentImage.filename}
              className="w-full h-auto max-h-[90vh] mx-auto"
              onLoad={() => {
                if (imgRef.current) {
                  setImgSize({
                    width: imgRef.current.naturalWidth,
                    height: imgRef.current.naturalHeight
                  });
                }
              }}
            />

            {/* Bounding boxes */}
            {faces.map((face, i) => {
              const isSelected = i === currentFaceIndex;
              const shouldShow = showAllBoundingBoxes || isSelected;
              if (!shouldShow || !imgSize.width || !imgSize.height) return null;

              return (
                <div
                  key={i}
                  className={cn(
                    "absolute border-2 cursor-pointer transition-colors",
                    isSelected
                      ? "border-primary border-4"
                      : face.status === 'approved' || face.status === 'new' || face.status === 'edited'
                        ? "border-green-500"
                        : "border-red-500"
                  )}
                  style={{
                    top: `${(face.y / imgSize.height) * 100}%`,
                    left: `${(face.x / imgSize.width) * 100}%`,
                    width: `${(face.w / imgSize.width) * 100}%`,
                    height: `${(face.h / imgSize.height) * 100}%`,
                  }}
                  onClick={() => selectFace(i)}
                >
                  <div className={cn(
                    "absolute -top-6 left-0 px-2 py-1 text-xs rounded text-white",
                    isSelected
                      ? "bg-primary"
                      : face.status === 'approved' || face.status === 'new' || face.status === 'edited'
                        ? "bg-green-500"
                        : "bg-red-500"
                  )}>
                    {i + 1}
                    {!face.embedding_extracted && " (No Embedding)"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right side - Face list and processing */}
        <div className="h-full w-1/3 flex flex-col gap-4">
          {/* Current face processing */}
          {currentFace && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Processing Face {currentFaceIndex + 1}</CardTitle>
                {!currentFace.embedding_extracted && (
                  <CardDescription className="text-orange-600">
                    ⚠️ Embedding not extracted - manual identification only
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Match suggestion - only show if embedding was extracted */}
                {currentFace.embedding_extracted && currentFace.suggestion?.match && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Suggested Match:</span>
                      <span className="text-sm">{currentFace.suggestion.name}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Confidence</span>
                        <span>{((currentFace.suggestion.confidence || 0) * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={(currentFace.suggestion.confidence || 0) * 100} />
                    </div>
                    <Button
                      onClick={handleApproveMatch}
                      className="w-full"
                      size="sm"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve Match
                    </Button>
                    {/* Divider */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          or
                        </span>
                      </div>
                    </div>

                    {/* Add new person option */}
                    <div className="space-y-2">
                      <Input
                        value={newPersonName}
                        onChange={(e) => setNewPersonName(e.target.value)}
                        placeholder="Enter new person's name"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newPersonName.trim()) {
                            handleAddNewPerson();
                          }
                        }}
                      />
                      <Button
                        onClick={handleAddNewPerson}
                        disabled={!newPersonName.trim()}
                        size="sm"
                        className="w-full"
                        variant="outline"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add New Person Instead
                      </Button>
                    </div>
                  </div>
                )}

                {/* No match or edit option */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {currentFace.embedding_extracted && currentFace.suggestion?.match ? "Edit Match:" : "Assign Person:"}
                    </span>
                  </div>

                  {currentFace.embedding_extracted && currentFace.suggestion?.match ? (
                    <div className="space-y-2">
                      <Select value={editPersonName} onValueChange={setEditPersonName}>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder="Select person" />
                        </SelectTrigger>
                        <SelectContent>
                          {people.map(person => (
                            <SelectItem key={person.id} value={person.name}>
                              {person.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleEditMatch}
                        disabled={!editPersonName.trim()}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Update Match
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Option to select existing person */}
                      <Select value={editPersonName} onValueChange={setEditPersonName}>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder="Select existing person" />
                        </SelectTrigger>
                        <SelectContent>
                          {people.map(person => (
                            <SelectItem key={person.id} value={person.name}>
                              {person.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {editPersonName && (
                        <Button
                          onClick={handleEditMatch}
                          size="sm"
                          className="w-full"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Assign to {editPersonName}
                        </Button>
                      )}

                      {/* Divider */}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">
                            or
                          </span>
                        </div>
                      </div>

                      {/* Add new person */}
                      <Input
                        value={newPersonName}
                        onChange={(e) => setNewPersonName(e.target.value)}
                        placeholder="Enter new person's name"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newPersonName.trim()) {
                            handleAddNewPerson();
                          }
                        }}
                      />
                      <Button
                        onClick={handleAddNewPerson}
                        disabled={!newPersonName.trim()}
                        size="sm"
                        className="w-full"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add New Person
                      </Button>
                    </div>
                  )}
                </div>

                {/* Skip face */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={moveToNextFace}
                  className="w-full"
                >
                  Skip This Face
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Face list */}
          <Card>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {faces.map((face, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-md cursor-pointer border transition-colors",
                        i === currentFaceIndex
                          ? "border-primary bg-primary/10"
                          : "hover:bg-muted"
                      )}
                      onClick={() => selectFace(i)}
                    >
                      <img
                        src={`data:image/jpeg;base64,${face.face_base64}`}
                        alt={`Face ${i + 1}`}
                        className="w-12 h-12 rounded-md object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Face {i + 1}</span>
                          {face.status && (
                            <Badge variant={
                              face.status === 'approved' || face.status === 'new' || face.status === 'edited'
                                ? 'default'
                                : 'secondary'
                            }>
                              {face.status}
                            </Badge>
                          )}
                          {!face.embedding_extracted && (
                            <Badge variant="outline" className="text-xs">
                              Manual
                            </Badge>
                          )}
                        </div>
                        {face.approvedPerson && (
                          <p className="text-xs text-muted-foreground truncate">
                            {face.approvedPerson}
                          </p>
                        )}
                        {face.suggestion?.match && !face.approvedPerson && (
                          <p className="text-xs text-blue-600 truncate">
                            Suggested: {face.suggestion.name}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Rest of the component remains the same...
function FaceGallery({ recognitionMode, setRecognitionMode, albums, media }: { albums: any[], media: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "processed" | "unprocessed">("all");

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

  const processedImages = media.filter(m => m.facesProcessed).length;
  const unprocessedImages = media.filter(m => !m.facesProcessed).length;
  const recognisedIndividuals = new Set(media.flatMap(m => m.recognised_ids ?? [])).size;

  if (recognitionMode && selectedAlbum) {
    const imagesToProcess = selectMode && selectedImages.length > 0
      ? albumImages.filter(img => selectedImages.includes(img.id))
      : albumImages;

    return (
      <FaceRecognitionSession
        album={selectedAlbum}
        images={imagesToProcess}
        onCancel={() => {
          setRecognitionMode(false);
          setSelectMode(false);
          setSelectedImages([]);
        }}
        onFinish={() => {
          toast.success("Recognition session completed!");
          setRecognitionMode(false);
          setSelectMode(false);
          setSelectedImages([]);
          // Reload the page data
          // window.location.reload();
        }}
      />
    );
  }

  return (
    <>
      <div className='flex flex-col w-full h-full'>
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
            <ScrollArea className="grow rounded-md border p-4">
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
                  </>
                )}

                {selectMode && selectedImages.length > 0 && (
                  <Button onClick={() => setRecognitionMode(true)}>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Start Recognition
                  </Button>
                )}
              </div>

              <div className='flex flex-row items-center gap-2'>
                <p className="text-sm text-muted-foreground">
                  {selectMode && selectedImages.length > 0
                    ? `${selectedImages.length} selected`
                    : `${albumImages.length} images in this album`}
                </p>

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
                        "relative border rounded-md overflow-hidden cursor-pointer transition-all",
                        selectedImages.includes(img.id) && "ring-2 ring-primary ring-offset-2",
                        viewMode === "list" && "flex flex-row items-center"
                      )}
                      onClick={() => {
                        if (selectMode) toggleSelect(img.id)
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
    </>
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
  const [people, setPeople] = useState<Person[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(true);

  // Load people from Python backend
  useEffect(() => {
    const loadPeople = async () => {
      try {
        const response = await fetch(`${FACIAL_RECOGNITION_API_URL}/people`);
        if (response.ok) {
          const data = await response.json();
          setPeople(data.people);
        }
      } catch (err) {
        console.error('Failed to load people:', err);
      } finally {
        setLoadingPeople(false);
      }
    };
    loadPeople();
  }, []);

  const [recognitionMode, setRecognitionMode] = useState(false);

  return (
    <div className="w-full mx-6 my-4 flex flex-col">
      <Tabs defaultValue="albums" className="h-full w-full">
        <div className="my-4 flex flex-col gap-3">
          {recognitionMode ? (
            null
          ) : (
            <>
              <h1 className="text-3xl font-bold">People</h1>
              <p className="text-muted-foreground">Browse through the list of individuals detected in images, and start facial recognition processing tasks.</p>
            </>
          )}
        </div>
        {
          !recognitionMode &&
          <TabsList>
            <TabsTrigger value="albums">Albums & Processing</TabsTrigger>
            <TabsTrigger value="individuals">Recognised Individuals</TabsTrigger>
          </TabsList>
        }

        <TabsContent value="albums" className="mt-4">
          <FaceGallery recognitionMode={recognitionMode} setRecognitionMode={setRecognitionMode} albums={albums} media={media}
          />
        </TabsContent>

        <TabsContent value="individuals" className="mt-4">
          <RecognisedIndividuals people={people} media={media} loading={loadingPeople} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function RecognisedIndividuals({ people, media, loading }: {
  people: Person[],
  media: any[],
  loading: boolean
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  const filteredPeople = people.filter(person =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get images for selected person
  const personImages = selectedPerson
    ? media.filter(m => m.people && m.people.includes(selectedPerson.pocketbase_id))
    : [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4">Loading recognised individuals...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {!selectedPerson ? (
        <div className="flex flex-col gap-4 h-full">
          {/* Search */}
          <div className="flex items-center justify-between">
            <Input
              placeholder="Search individuals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-1/2"
            />
            <p className="text-sm text-muted-foreground">
              {filteredPeople.length} individuals found
            </p>
          </div>

          {/* People Grid */}
          <ScrollArea className="grow rounded-md border p-4">
            {filteredPeople.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {searchTerm ? "No individuals found matching your search." : "No individuals recognised yet."}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredPeople.map(person => {
                  const imageCount = media.filter(m => m.people && m.people.includes(person.pocketbase_id)).length;
                  const firstImage = media.find(m => m.people && m.people.includes(person.pocketbase_id));

                  return (
                    <Card
                      key={person.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedPerson(person)}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center gap-3">
                          {firstImage ? (
                            <img
                              src={pb.files.getURL(firstImage, firstImage.image)}
                              alt={person.name}
                              className="w-20 h-20 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="text-center">
                            <p className="font-semibold">{person.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {imageCount} photos
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      ) : (
        <div className="h-full flex flex-col gap-4">
          {/* Person Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setSelectedPerson(null)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h2 className="text-2xl font-bold">{selectedPerson.name}</h2>
                <p className="text-muted-foreground">
                  Appears in {personImages.length} photos
                </p>
              </div>
            </div>
          </div>

          {/* Person's Images */}
          <ScrollArea className="grow rounded-md border p-4">
            {personImages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No photos found for this person.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {personImages.map(img => (
                  <div
                    key={img.id}
                    className="relative border rounded-md overflow-hidden"
                  >
                    <img
                      src={pb.files.getURL(img, img.image)}
                      alt={img.filename}
                      className="w-full h-32 object-cover"
                    />
                    <div className="p-2">
                      <p className="text-xs truncate">{img.filename}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
