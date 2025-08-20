import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import { pb } from '~/lib/pb'
import { cn } from '~/lib/utils'
import { ArrowLeft, ChevronLeft, ChevronRight, Search, Check, X, RefreshCw } from 'lucide-react'
import { useSelectedImages } from '~/contexts/selected-images-context'

// Component to display image with bounding boxes
interface ImageWithBoundingBoxesProps {
  imageUrl: string;
  detections: Detection[];
  filename: string;
  showBoxes: boolean;
}

function ImageWithBoundingBoxes({ imageUrl, detections, filename, showBoxes }: ImageWithBoundingBoxesProps) {
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [displayDimensions, setDisplayDimensions] = useState({ width: 0, height: 0 });

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    setDisplayDimensions({ width: img.clientWidth, height: img.clientHeight });
  };

  // Color map for different classes
  const getClassColor = (className: string) => {
    const colors: Record<string, string> = {
      'mountain': '#3B82F6', // blue
      'tree': '#10B981',     // green
      'building': '#F59E0B', // amber
      'people': '#EF4444',   // red
      'animal': '#8B5CF6',   // purple
    };
    return colors[className] || '#6B7280'; // default gray
  };

  return (
    <div className="relative inline-block">
      <img
        src={imageUrl}
        alt={filename}
        className="max-h-[80vh] max-w-full object-contain rounded-lg"
        onLoad={handleImageLoad}
      />
      {showBoxes && detections && imageDimensions.width > 0 && (
        <svg
          className="absolute top-0 left-0 pointer-events-none"
          width={displayDimensions.width}
          height={displayDimensions.height}
          style={{
            width: displayDimensions.width,
            height: displayDimensions.height,
          }}
        >
          {detections.map((detection, index) => {
            const [x1, y1, x2, y2] = detection.box;

            // Scale coordinates from original image to display size
            const scaleX = displayDimensions.width / imageDimensions.width;
            const scaleY = displayDimensions.height / imageDimensions.height;

            const scaledX = x1 * scaleX;
            const scaledY = y1 * scaleY;
            const scaledWidth = (x2 - x1) * scaleX;
            const scaledHeight = (y2 - y1) * scaleY;

            const color = getClassColor(detection.class_name);

            return (
              <g key={index}>
                {/* Bounding box rectangle */}
                <rect
                  x={scaledX}
                  y={scaledY}
                  width={scaledWidth}
                  height={scaledHeight}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeOpacity="0.8"
                />
                {/* Label background */}
                <rect
                  x={scaledX}
                  y={scaledY - 20}
                  width={`${detection.class_name.length * 8 + 40}`}
                  height="20"
                  fill={color}
                  fillOpacity="0.8"
                />
                {/* Label text */}
                <text
                  x={scaledX + 4}
                  y={scaledY - 6}
                  fill="white"
                  fontSize="12"
                  fontWeight="bold"
                >
                  {detection.class_name} {Math.round(detection.confidence * 100)}%
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

interface Detection {
  box: [number, number, number, number]; // [x1, y1, x2, y2]
  class_id: number;
  class_name: string;
  confidence: number;
}

interface DetectionResult {
  class_distribution: {
    animal: number;
    building: number;
    mountain: number;
    people: number;
    tree: number;
  };
  detection_count: number;
  detections: Detection[];
  status: string;
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
  const [isSaving, setIsSaving] = useState(false);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [highlights, setHighlights] = useState('');

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

      // Call the detection API with CORS proxy
      const apiUrl = 'https://painting2.rmbr.app/detect'

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      setDetectionResult(result);
      setShowBoundingBoxes(true);

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
        detections: JSON.stringify(detectionResult.detections),
        class_distribution: JSON.stringify(detectionResult.class_distribution),
        detection_count: detectionResult.detection_count,
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
        setShowBoundingBoxes(true);
      }

    } catch (error) {
      console.error('Error saving detection:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const rejectDetection = () => {
    setDetectionResult(null);
    setShowBoundingBoxes(true);
  };

  const nextImage = () => {
    if (currentImageIndex < media.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
      setDetectionResult(null);
      setShowBoundingBoxes(true);
      setHighlights('');
    }
  };

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
      setDetectionResult(null);
      setShowBoundingBoxes(true);
      setHighlights('');
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

      <div className="max-w-[95vw] mx-auto w-full">
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {showBoundingBoxes ? 'Hide Boxes' : 'Show Boxes'}
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Image Display */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex justify-center bg-muted rounded-lg p-4">
              <ImageWithBoundingBoxes
                imageUrl={pb.files.getURL(currentImage, currentImage.image)}
                detections={detectionResult?.detections || []}
                filename={currentImage.filename}
                showBoxes={showBoundingBoxes && !!detectionResult}
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
              {detectionResult && (
                <p className="text-sm text-green-600">
                  {detectionResult.detection_count} element{detectionResult.detection_count !== 1 ? 's' : ''} detected
                </p>
              )}

              {/* Color Legend */}
              {detectionResult && showBoundingBoxes && (
                <div className="bg-white/90 rounded-lg p-3 inline-block">
                  <h4 className="text-xs font-semibold mb-2 text-gray-700">Detection Colors:</h4>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {Object.entries(detectionResult.class_distribution).map(([className, count]) => (
                      count > 0 && (
                        <div key={className} className="flex items-center gap-1">
                          <div
                            className="w-3 h-3 rounded border"
                            style={{
                              backgroundColor: (() => {
                                const colors: Record<string, string> = {
                                  'mountain': '#3B82F6',
                                  'tree': '#10B981',
                                  'building': '#F59E0B',
                                  'people': '#EF4444',
                                  'animal': '#8B5CF6',
                                };
                                return colors[className] || '#6B7280';
                              })()
                            }}
                          />
                          <span className="capitalize text-gray-700">{className}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
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
                    {detectionResult.detections.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No elements detected in this image.</p>
                    ) : (
                      detectionResult.detections.map((detection, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="capitalize">{detection.class_name}</span>
                          <span className="text-muted-foreground">
                            {(detection.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Class Distribution */}
                <div className="bg-muted rounded-lg p-4">
                  <h4 className="font-medium mb-2">Element Summary</h4>
                  <div className="space-y-2">
                    {Object.entries(detectionResult.class_distribution).map(([className, count]) => (
                      count > 0 && (
                        <div key={className} className="flex justify-between items-center text-sm">
                          <span className="capitalize">{className}</span>
                          <span className="text-muted-foreground">{count}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>

                {/* Painting Highlights Input */}
                <div className="bg-muted rounded-lg p-4">
                  <h4 className="font-medium mb-2">Painting Highlights</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Describe the key highlights or notable features of this painting:
                  </p>
                  <Textarea
                    placeholder="Enter the highlights of this painting..."
                    value={highlights}
                    onChange={(e) => setHighlights(e.target.value)}
                    className="min-h-[100px] resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
