import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { pb } from '~/lib/pb'
import { cn } from '~/lib/utils'
import { ArrowLeft, ChevronLeft, ChevronRight, Sparkles, Save } from 'lucide-react'
import { GoogleGenAI } from "@google/genai"
import { useSelectedImages } from '~/contexts/selected-images-context'

export const Route = createFileRoute('/(app)/_app/paintings-ai-desc')({
  loader: async () => {
    console.log('AI Description loader called!');
    // Just load all albums, we'll get media from context
    const allAlbums = await pb.collection("albums").getFullList();
    console.log('AI Description loader completed, albums:', allAlbums.length);
    return { allAlbums };
  },
  component: RouteComponent,
})

function RouteComponent() {
  console.log('AI Description page component rendered!');
  const { allAlbums } = Route.useLoaderData();
  const { selectedImageIds, clearSelection } = useSelectedImages();
  const navigate = useNavigate();
  const [media, setMedia] = useState<any[]>([]);
  const [paintings, setPaintings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [description, setDescription] = useState("");
  const [artist, setArtist] = useState("");
  const [year, setYear] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load media and paintings based on selected image IDs from context
  useEffect(() => {
    const loadData = async () => {
      if (selectedImageIds.length === 0) {
        setMedia([]);
        setPaintings([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Load media items
        const mediaItems = await Promise.all(
          selectedImageIds.map((id: string) => pb.collection("media").getOne(id))
        );
        setMedia(mediaItems);

        // Load or create painting records for each media item
        const paintingPromises = selectedImageIds.map(async (mediaId: string) => {
          try {
            // Try to find existing painting record
            const existingPaintings = await pb.collection("paintings").getList(1, 1, {
              filter: `media = "${mediaId}"`
            });
            
            if (existingPaintings.items.length > 0) {
              return existingPaintings.items[0];
            } else {
              // Create new painting record
              const newPainting = await pb.collection("paintings").create({
                media: mediaId,
                description: "",
                artist: "",
                year: ""
              });
              return newPainting;
            }
          } catch (error) {
            console.error(`Error loading/creating painting for media ${mediaId}:`, error);
            return null;
          }
        });

        const paintingResults = await Promise.all(paintingPromises);
        const validPaintings = paintingResults.filter(p => p !== null);
        setPaintings(validPaintings);
        
      } catch (error) {
        console.error('Error loading data:', error);
        setMedia([]);
        setPaintings([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedImageIds]);

  useEffect(() => {
    if (paintings[currentImageIndex]) {
      const painting = paintings[currentImageIndex];
      setDescription(painting.description || "");
      setArtist(painting.artist || "");
      setYear(painting.year || "");
    }
  }, [currentImageIndex, paintings]);

  const generateDescription = async () => {
    if (!media[currentImageIndex]) return;
    
    setIsGenerating(true);
    try {
      const currentImage = media[currentImageIndex];
      
      // For development, we'll use a direct API call
      // In production, this should be moved to a backend API
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        // Fallback description when no API key is available
        setDescription(`This is a traditional Chinese painting titled "${currentImage.filename}". The artwork demonstrates classical Chinese artistic techniques with careful attention to composition, brushwork, and cultural symbolism. The piece reflects the rich heritage of Chinese visual arts and showcases the artist's mastery of traditional painting methods.`);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const result = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: `Analyze this traditional Chinese painting and provide a detailed description focusing on the artistic elements, style, composition, and cultural significance. Write in a scholarly yet accessible tone. The painting filename is: ${currentImage.filename}`,
      });

      const text = result.text || "";
      setDescription(text);
    } catch (error) {
      console.error('Error generating description:', error);
      // Fallback description
      setDescription(`This is a traditional Chinese painting titled "${media[currentImageIndex].filename}". The artwork demonstrates classical Chinese artistic techniques with careful attention to composition, brushwork, and cultural symbolism. The piece reflects the rich heritage of Chinese visual arts and showcases the artist's mastery of traditional painting methods.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const saveDescription = async () => {
    if (!paintings[currentImageIndex]) return;
    
    // At least one field should have content
    if (!description.trim() && !artist.trim() && !year.trim()) return;
    
    setIsSaving(true);
    try {
      const currentPainting = paintings[currentImageIndex];
      const updatedPainting = await pb.collection("paintings").update(currentPainting.id, {
        description: description.trim(),
        artist: artist.trim(),
        year: year.trim()
      });
      
      // Update local data
      const updatedPaintings = [...paintings];
      updatedPaintings[currentImageIndex] = updatedPainting;
      setPaintings(updatedPaintings);
      
    } catch (error) {
      console.error('Error saving painting data:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const nextImage = () => {
    if (currentImageIndex < media.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const goBack = () => {
    clearSelection();
    navigate({ to: '/paintings' });
  };

  if (loading) {
    return (
      <div className="w-full mx-6 my-4 flex flex-col">
        <div className="my-4 flex flex-col gap-3">
          <h1 className="text-3xl font-bold">Painting Information</h1>
          <p className="text-muted-foreground">Loading images...</p>
        </div>
      </div>
    );
  }

  if (!media || media.length === 0) {
    return (
      <div className="w-full mx-6 my-4 flex flex-col">
        <div className="my-4 flex flex-col gap-3">
          <h1 className="text-3xl font-bold">Painting Information</h1>
          <p className="text-muted-foreground">No images selected. Please go back and select images first.</p>
        </div>
        <Button onClick={goBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Paintings
        </Button>
      </div>
    );
  }

  const currentImage = media[currentImageIndex];
  const album = allAlbums.find(a => a.id === currentImage.album);

  return (
    <div className="w-full mx-6 my-4 flex flex-col">
      <div className="my-4 flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <Button onClick={goBack} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Paintings
          </Button>
          <h1 className="text-3xl font-bold">Painting Information</h1>
        </div>
        <p className="text-muted-foreground">Add and edit painting details including AI-generated descriptions</p>
      </div>

      <div className="max-w-6xl mx-auto w-full">
        {/* Image Navigation */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevImage}
              disabled={currentImageIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentImageIndex + 1} of {media.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={nextImage}
              disabled={currentImageIndex === media.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={generateDescription}
              disabled={isGenerating}
              size="sm"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Description
                </>
              )}
            </Button>
            <Button
              onClick={saveDescription}
              disabled={isSaving || (!description.trim() && !artist.trim() && !year.trim())}
              variant="outline"
              size="sm"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Painting Info
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Display */}
          <div className="flex flex-col gap-4">
            <div className="flex justify-center bg-muted rounded-lg p-4">
              <img
                src={pb.files.getURL(currentImage, currentImage.image)}
                alt={currentImage.filename}
                className="max-h-[500px] object-contain rounded-lg"
              />
            </div>
            
            {/* Image Info */}
            <div className="text-center space-y-2">
              <h3 className="font-medium text-lg">{currentImage.filename}</h3>
              {album && (
                <p className="text-sm text-muted-foreground">
                  Album: {album.name}
                </p>
              )}
            </div>
          </div>

          {/* Description Editor */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Artist</label>
                <Input
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  placeholder="Artist name..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Year</label>
                <Input
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="Year created..."
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Click 'Generate Description' to create an AI-powered description for this painting, or write your own..."
                className="min-h-[350px] resize-none"
              />
            </div>
            
            <div className="text-xs text-muted-foreground">
              Tip: You can edit any field before saving the painting information to the database.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
