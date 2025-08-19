import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Button } from '~/components/ui/button'
import { pb } from '~/lib/pb'
import { cn } from '~/lib/utils'
import { ArrowLeft, ChevronLeft, ChevronRight, Search, Check, X, RefreshCw } from 'lucide-react'
import { useSelectedImages } from '~/contexts/selected-images-context'

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  class: string;
  confidence: number;
}

interface DetectionResult {
  bounding_boxes: BoundingBox[];
  processed_image_base64: string;
}

export const Route = createFileRoute('/(app)/_app/paintings-element-detect')({
  loader: async () => {
    console.log('Element Detection loader called!');
    // Just load all albums, we'll get media from context
    const allAlbums = await pb.collection("albums").getFullList();
    console.log('Element Detection loader completed, albums:', allAlbums.length);
    return { allAlbums };
  },
  component: RouteComponent,
})

function RouteComponent() {
  console.log('Element Detection page component rendered!');
  const { allAlbums } = Route.useLoaderData();
  const { selectedImageIds, clearSelection } = useSelectedImages();
  const navigate = useNavigate();
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load media based on selected image IDs from context
  useEffect(() => {
    const loadData = async () => {
      if (selectedImageIds.length === 0) {
        setMedia([]);
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
        
      } catch (error) {
        console.error('Error loading data:', error);
        setMedia([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedImageIds]);

  const detectElements = async () => {
    if (!media[currentImageIndex]) return;
    
    setIsDetecting(true);
    setDetectionResult(null);
    
    try {
      const currentImage = media[currentImageIndex];
      
      // Get the image file from PocketBase
      const imageUrl = pb.files.getURL(currentImage, currentImage.image);
      
      // Fetch the image as a blob
      const imageResponse = await fetch(imageUrl);
      const imageBlob = await imageResponse.blob();
      
      // Create FormData for the API request
      const formData = new FormData();
      formData.append('image', imageBlob, currentImage.filename);
      
      // Call the detection API
      const response = await fetch('http://152.69.221.68:3001/detect-visualize', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      setDetectionResult(result);
      
    } catch (error) {
      console.error('Error detecting elements:', error);
      
      // Show user-friendly error message based on error type
      if (error instanceof TypeError && error.message.includes('fetch')) {
        alert('Network error: Unable to connect to the detection service. Please check your internet connection and try again.');
      } else if (error instanceof Error && error.message.includes('API request failed')) {
        alert('Detection service error: The server returned an error. Please try again later.');
      } else {
        alert('An unexpected error occurred during element detection. Please try again.');
      }
    } finally {
      setIsDetecting(false);
    }
  };

  const acceptDetection = async () => {
    if (!detectionResult || !media[currentImageIndex]) return;
    
    setIsSaving(true);
    try {
      const currentImage = media[currentImageIndex];
      
      // Try to find existing element detection record
      let detectionRecord;
      try {
        const existingDetections = await pb.collection("element_detections").getList(1, 1, {
          filter: `media = "${currentImage.id}"`
        });
        
        if (existingDetections.items.length > 0) {
          detectionRecord = existingDetections.items[0];
        }
      } catch (error) {
        console.log('No existing detection record found, will create new one');
      }
      
      const detectionData = {
        media: currentImage.id,
        bounding_boxes: JSON.stringify(detectionResult.bounding_boxes),
        processed_image: detectionResult.processed_image_base64,
        status: 'accepted'
      };
      
      if (detectionRecord) {
        // Update existing record
        await pb.collection("element_detections").update(detectionRecord.id, detectionData);
      } else {
        // Create new record
        await pb.collection("element_detections").create(detectionData);
      }
      
      // Move to next image if available
      if (currentImageIndex < media.length - 1) {
        setCurrentImageIndex(currentImageIndex + 1);
        setDetectionResult(null);
        setShowOriginal(false);
      }
      
    } catch (error) {
      console.error('Error saving detection:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const rejectDetection = () => {
    setDetectionResult(null);
    setShowOriginal(false);
  };

  const nextImage = () => {
    if (currentImageIndex < media.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      setDetectionResult(null);
      setShowOriginal(false);
    }
  };

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
      setDetectionResult(null);
      setShowOriginal(false);
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
          <h1 className="text-3xl font-bold">Element Detection</h1>
          <p className="text-muted-foreground">Loading images...</p>
        </div>
      </div>
    );
  }

  if (!media || media.length === 0) {
    return (
      <div className="w-full mx-6 my-4 flex flex-col">
        <div className="my-4 flex flex-col gap-3">
          <h1 className="text-3xl font-bold">Element Detection</h1>
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
          <h1 className="text-3xl font-bold">Element Detection</h1>
        </div>
        <p className="text-muted-foreground">Detect and analyze elements in landscape paintings</p>
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
            {!detectionResult && (
              <Button
                onClick={detectElements}
                disabled={isDetecting}
                size="sm"
              >
                {isDetecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Detecting...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Detect Elements
                  </>
                )}
              </Button>
            )}
            
            {detectionResult && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOriginal(!showOriginal)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {showOriginal ? 'Show Detections' : 'Show Original'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={rejectDetection}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={acceptDetection}
                  disabled={isSaving}
                  size="sm"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Accept
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Image Display */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex justify-center bg-muted rounded-lg p-4">
              {detectionResult && !showOriginal ? (
                <img
                  src={`data:image/jpeg;base64,${detectionResult.processed_image_base64}`}
                  alt={`${currentImage.filename} with detections`}
                  className="max-h-[600px] object-contain rounded-lg"
                />
              ) : (
                <img
                  src={pb.files.getURL(currentImage, currentImage.image)}
                  alt={currentImage.filename}
                  className="max-h-[600px] object-contain rounded-lg"
                />
              )}
            </div>
            
            {/* Image Info */}
            <div className="text-center space-y-2">
              <h3 className="font-medium text-lg">{currentImage.filename}</h3>
              {album && (
                <p className="text-sm text-muted-foreground">
                  Album: {album.name}
                </p>
              )}
              {detectionResult && (
                <p className="text-sm text-green-600">
                  {detectionResult.bounding_boxes.length} element{detectionResult.bounding_boxes.length !== 1 ? 's' : ''} detected
                </p>
              )}
            </div>
          </div>

          {/* Detection Results */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold">Detection Results</h3>
            
            {!detectionResult && !isDetecting && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Click "Detect Elements" to analyze this landscape painting for natural elements.</p>
              </div>
            )}
            
            {isDetecting && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Analyzing image for landscape elements...</p>
              </div>
            )}
            
            {detectionResult && (
              <div className="space-y-4">
                <div className="bg-muted rounded-lg p-4">
                  <h4 className="font-medium mb-2">Detected Elements</h4>
                  <div className="space-y-2">
                    {detectionResult.bounding_boxes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No elements detected in this image.</p>
                    ) : (
                      detectionResult.bounding_boxes.map((box, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="capitalize">{box.class}</span>
                          <span className="text-muted-foreground">
                            {(box.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Next Steps</h4>
                  <p className="text-sm text-blue-800 mb-3">
                    Review the detected elements in the image. You can toggle between the original and annotated versions.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={rejectDetection}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      onClick={acceptDetection}
                      disabled={isSaving}
                      size="sm"
                      className="flex-1"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
