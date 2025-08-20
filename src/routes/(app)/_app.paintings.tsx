import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useMemo, useCallback, memo, useEffect } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { pb } from '~/lib/pb'
import { cn } from '~/lib/utils'
import { Search, Grid, List, CheckSquare, Square, ImageIcon, FolderIcon, Trash2, Cog, Sparkles, ArrowLeft } from 'lucide-react'
import { useSelectedImages } from '~/contexts/selected-images-context'

// Type definitions for better type safety
interface MediaItem {
  id: string;
  filename: string;
  image: string;
  album: string;
  description?: string;
  artist?: string;
  year?: string;
  [key: string]: any; // For PocketBase compatibility
}

interface Album {
  id: string;
  name: string;
  type: string;
  [key: string]: any; // For PocketBase compatibility
}

interface LoaderData {
  albums: Album[];
  media: MediaItem[];
  allAlbums: Album[];
}

type ViewMode = 'grid' | 'list';
type TabValue = 'all' | 'images' | 'albums';

// Reusable components for better code organization
interface ImageCardProps {
  item: MediaItem;
  viewMode: ViewMode;
  selectMode: boolean;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
}

const ImageCard = memo(({ item, viewMode, selectMode, isSelected, onToggleSelection }: ImageCardProps) => {
  const handleImageClick = useCallback(() => {
    if (selectMode) {
      onToggleSelection(item.id);
    }
  }, [selectMode, onToggleSelection, item.id]);

  const imageElement = (
    <img
      src={pb.files.getURL(item, item.image)}
      alt={item.filename}
      className={cn(
        "object-cover",
        viewMode === 'grid' ? "w-full h-40" : "w-32 h-32 flex-shrink-0"
      )}
    />
  );

  const cardContent = (
    <div 
      className={cn(
        "relative border rounded-md overflow-hidden cursor-pointer",
        isSelected && "outline-2 outline-primary",
        viewMode === 'list' && "flex flex-row items-center"
      )}
      onClick={selectMode ? handleImageClick : undefined}
    >
      {imageElement}
      <div className="p-2">
        <p className="truncate">{item.filename}</p>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {selectMode && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection(item.id);
          }}
        >
          {isSelected ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </Button>
      )}
      
      {!selectMode ? (
        <Dialog>
          <DialogTrigger asChild>
            {cardContent}
          </DialogTrigger>
          <DialogContent className="sm:max-w-[Npx] bg-background/95 backdrop-blur-sm border border-border/50 p-0">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle>{item.filename}</DialogTitle>
            </DialogHeader>
            <div className="flex gap-6 h-[calc(70vh-80px)] px-6 pb-6">
              <div className={cn(
                "flex items-center justify-center min-h-0",
                (item.description || item.artist || item.year) ? "flex-[0.7]" : "flex-1"
              )}>
                <img
                  src={pb.files.getURL(item, item.image)}
                  alt={item.filename}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                />
              </div>
              {(item.description || item.artist || item.year) && (
                <div className="flex-[0.3] flex-shrink-0 bg-card/50 backdrop-blur-sm border border-border/30 rounded-lg p-6 overflow-y-auto">
                  <h3 className="text-xl font-semibold text-foreground mb-6">Painting Details</h3>
                  {item.artist && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Artist</p>
                      <p className="text-base text-foreground">{item.artist}</p>
                    </div>
                  )}
                  {item.year && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Year</p>
                      <p className="text-base text-foreground">{item.year}</p>
                    </div>
                  )}
                  {item.description && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                      <p className="text-base text-foreground leading-relaxed">{item.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        cardContent
      )}
    </div>
  );
});

ImageCard.displayName = 'ImageCard';

interface AlbumCardProps {
  album: Album;
  albumMedia: MediaItem[];
  viewMode: ViewMode;
  selectMode: boolean;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onAlbumClick: (album: Album) => void;
}

const AlbumCard = memo(({ album, albumMedia, viewMode, selectMode, isSelected, onToggleSelection, onAlbumClick }: AlbumCardProps) => {
  const coverImage = albumMedia[0];
  
  const handleAlbumClick = useCallback((e: React.MouseEvent) => {
    if (selectMode) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelection(album.id);
    } else {
      onAlbumClick(album);
    }
  }, [selectMode, onToggleSelection, onAlbumClick, album]);

  return (
    <div className="relative">
      {selectMode && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelection(album.id);
          }}
        >
          {isSelected ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </Button>
      )}
      
      <div 
        className={cn(
          "rounded-md border overflow-hidden cursor-pointer hover:shadow-md transition",
          isSelected && "ring-2 ring-primary",
          viewMode === 'list' && "flex flex-row items-center"
        )}
        onClick={handleAlbumClick}
      >
        {coverImage ? (
          <img
            src={pb.files.getURL(coverImage, coverImage.image)}
            alt={album.name}
            className={cn(
              "object-cover",
              viewMode === 'grid'
                ? "w-full h-40"
                : "w-32 h-32 flex-shrink-0"
            )}
          />
        ) : (
          <div
            className={cn(
              "bg-muted flex items-center justify-center",
              viewMode === 'grid' ? "w-full h-40" : "w-32 h-32"
            )}
          >
            <FolderIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="p-2 flex flex-row justify-between items-center w-full">
          <div>
            <p className="font-semibold">{album.name}</p>
            <p className="text-xs text-muted-foreground">{albumMedia.length} images</p>
          </div>
          <p className='text-pink-700 text-sm'>
            • painting
          </p>
        </div>
      </div>
    </div>
  );
});

AlbumCard.displayName = 'AlbumCard';

// Empty state component
interface EmptyStateProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
}

const EmptyState = memo(({ icon: Icon, title, description }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
    <Icon size={50} className="mb-4" />
    <p className="text-lg font-medium">{title}</p>
    {description && <p className="text-sm mt-2">{description}</p>}
  </div>
));

EmptyState.displayName = 'EmptyState';

// Search functionality with debouncing for better performance
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const Route = createFileRoute('/(app)/_app/paintings')({
  loader: async (): Promise<LoaderData> => {
    try {
      // Load all data in parallel for better performance
      const [paintingAlbums, allMedia, allAlbums, paintings] = await Promise.all([
        pb.collection("albums").getFullList({
          filter: 'type = "painting"'
        }),
        pb.collection("media").getFullList(),
        pb.collection("albums").getFullList(),
        pb.collection("paintings").getFullList()
      ]);
      
      // Filter painting media efficiently using Set for O(1) lookup
      const paintingAlbumIds = new Set(paintingAlbums.map(album => album.id));
      const paintingMedia = allMedia.filter(media => paintingAlbumIds.has(media.album));
      
      // Create a map of image ID to painting details for efficient lookup
      const paintingsMap = new Map();
      paintings.forEach(painting => {
        paintingsMap.set(painting.image, painting);
      });
      
      // Merge media with painting details
      const enrichedPaintingMedia = paintingMedia.map(media => {
        const paintingDetails = paintingsMap.get(media.id);
        return {
          ...media,
          description: paintingDetails?.description || '',
          artist: paintingDetails?.artist || '',
          year: paintingDetails?.year || ''
        };
      });
      
      return { 
        albums: paintingAlbums as unknown as Album[], 
        media: enrichedPaintingMedia as unknown as MediaItem[],
        allAlbums: allAlbums as unknown as Album[]
      };
          } catch (error) {
        console.error('Failed to load paintings data:', error);
        // Return empty data on error to prevent app crash
        return {
          albums: [],
          media: [],
          allAlbums: []
        };
      }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { albums, media, allAlbums } = Route.useLoaderData();
  const navigate = useNavigate();
  const { setSelectedImageIds } = useSelectedImages();
  
  // UI State
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search for better performance
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedAlbums, setSelectedAlbums] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [showProcessDialog, setShowProcessDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Memoized filtered data for better performance
  const filteredData = useMemo(() => ({
    media: media.filter(item =>
      item.filename.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    ),
    albums: albums.filter(album =>
      album.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    )
  }), [media, albums, debouncedSearchTerm]);

  // Get current album images when inside an album
  const albumImages = useMemo(() => 
    selectedAlbum
      ? media.filter(m => m.album === selectedAlbum.id)
      : [], [selectedAlbum, media]
  );

  // Selection handlers with better performance
  const toggleItemSelection = useCallback((id: string) => {
    setSelectedItems(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }, []);

  const toggleAlbumSelection = useCallback((id: string) => {
    setSelectedAlbums(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }, []);

  // Navigation functions with better error handling
  const navigateToAIDescription = useCallback(() => {
    if (selectedItems.size === 0) return;
    
    try {
      const imageIds = Array.from(selectedItems);
      setSelectedImageIds(imageIds);
      setShowProcessDialog(false);
      
      navigate({
        to: '/paintings-ai-desc'
      });
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [selectedItems, setSelectedImageIds, navigate]);

  const navigateToElementDetection = useCallback(() => {
    if (selectedItems.size === 0) return;
    
    try {
      const imageIds = Array.from(selectedItems);
      setSelectedImageIds(imageIds);
      setShowProcessDialog(false);
      
      navigate({
        to: '/paintings-element-detect'
      });
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [selectedItems, setSelectedImageIds, navigate]);

  // Selection management
  const selectAllItems = useCallback(() => {
    if (selectedAlbum) {
      setSelectedItems(new Set(albumImages.map(item => item.id)));
    } else if (activeTab === 'images') {
      setSelectedItems(new Set(filteredData.media.map(item => item.id)));
    } else if (activeTab === 'albums') {
      setSelectedAlbums(new Set(filteredData.albums.map(album => album.id)));
    } else {
      setSelectedItems(new Set(filteredData.media.map(item => item.id)));
    }
  }, [selectedAlbum, albumImages, activeTab, filteredData]);

  const deselectAll = useCallback(() => {
    setSelectedItems(new Set());
    setSelectedAlbums(new Set());
  }, []);

  // Improved delete function with loading state and better error handling
  const deleteSelected = useCallback(async () => {
    if (isDeleting) return; // Prevent double deletion
    
    setIsDeleting(true);
    try {
      const deletePromises = [];
      
      if (selectedAlbum) {
        // In album view, delete selected images
        for (const itemId of selectedItems) {
          deletePromises.push(pb.collection("media").delete(itemId));
        }
      } else if (activeTab === 'images' || activeTab === 'all') {
        for (const itemId of selectedItems) {
          deletePromises.push(pb.collection("media").delete(itemId));
        }
      } else {
        for (const albumId of selectedAlbums) {
          deletePromises.push(pb.collection("albums").delete(albumId));
        }
      }
      
      await Promise.all(deletePromises);
      
      // Clear selections
      setSelectedItems(new Set());
      setSelectedAlbums(new Set());
      
      // Refresh the page data
      window.location.reload();
    } catch (error) {
      console.error('Error deleting items:', error);
      // TODO: Add proper error handling/toast notification
    } finally {
      setIsDeleting(false);
    }
  }, [selectedAlbum, selectedItems, selectedAlbums, activeTab, isDeleting]);

  // Exit select mode handler
  const handleExitSelectMode = useCallback(() => {
    setSelectMode(false);
    deselectAll();
  }, [deselectAll]);

  // Album selection handler
  const handleAlbumClick = useCallback((album: Album) => {
    setSelectedAlbum(album);
    setSelectMode(false);
    deselectAll();
  }, [deselectAll]);

  return (
    <div className='w-full mx-6 my-4 flex flex-col'>
      <div className='my-4 flex flex-col gap-3'>
        <h1 className='text-3xl font-bold'>Paintings Gallery</h1>
        <p className='text-muted-foreground'>Browse paintings</p>
      </div>

      {!selectedAlbum ? (
        <>
        <div className="flex flex-row gap-4 items-center mb-4">
          <Input
            placeholder="Search paintings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-3/5"
            aria-label="Search paintings"
          />            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant={selectMode ? 'default' : 'outline'}
              onClick={() => {
                if (selectMode) {
                  handleExitSelectMode();
                } else {
                  setSelectMode(true);
                }
              }}
            >
              <CheckSquare className="h-4 w-4 mr-2" />
              {selectMode ? 'Exit Select' : 'Select'}
            </Button>
          </div>

          {selectMode && (
            <div className="flex gap-2 mb-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const hasSelections = (activeTab === 'images' || activeTab === 'all') 
                    ? selectedItems.size > 0 
                    : selectedAlbums.size > 0;
                  
                  if (hasSelections) {
                    deselectAll();
                  } else {
                    selectAllItems();
                  }
                }}
              >
                {(((activeTab === 'images' || activeTab === 'all') && selectedItems.size > 0) || 
                  (activeTab === 'albums' && selectedAlbums.size > 0)) 
                  ? 'Deselect All' 
                  : `Select All`
                }
              </Button>
              {(activeTab === 'images' || activeTab === 'all') && selectedItems.size > 0 && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => setShowProcessDialog(true)}
                >
                  <Cog className="h-4 w-4 mr-2" />
                  Process ({selectedItems.size})
                </Button>
              )}
              {(((activeTab === 'images' || activeTab === 'all') && selectedItems.size > 0) || 
                (activeTab === 'albums' && selectedAlbums.size > 0)) && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={deleteSelected}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? 'Deleting...' : `Delete Selected (${(activeTab === 'images' || activeTab === 'all') ? selectedItems.size : selectedAlbums.size})`}
                </Button>
              )}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className='h-full w-full'>
            <TabsList>
              <TabsTrigger value="all">
                All ({filteredData.albums.length + filteredData.media.length})
              </TabsTrigger>
              <TabsTrigger value="images">
                <ImageIcon className="h-4 w-4 mr-2" />
                Images ({filteredData.media.length})
              </TabsTrigger>
              <TabsTrigger value="albums">
                <FolderIcon className="h-4 w-4 mr-2" />
                Albums ({filteredData.albums.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="flex flex-col gap-4">
              <ScrollArea className="h-1 grow rounded-md border">
                <div className="p-4 space-y-6">
                  {/* Albums Section */}
                  {filteredData.albums.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <FolderIcon className="h-5 w-5" />
                        Albums ({filteredData.albums.length})
                      </h3>
                      <div className={cn(
                        "gap-4",
                        viewMode === 'grid' 
                          ? "grid grid-cols-2 md:grid-cols-4"
                          : "flex flex-col gap-2"
                      )}>
                        {filteredData.albums.map((album) => {
                          const albumMedia = media.filter(item => item.album === album.id);
                          const isSelected = selectedAlbums.has(album.id);
                          
                          return (
                            <AlbumCard
                              key={album.id}
                              album={album}
                              albumMedia={albumMedia}
                              viewMode={viewMode}
                              selectMode={selectMode}
                              isSelected={isSelected}
                              onToggleSelection={toggleAlbumSelection}
                              onAlbumClick={handleAlbumClick}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Images Section */}
                  {filteredData.media.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" />
                        Images ({filteredData.media.length})
                      </h3>
                      <div className={cn(
                        "gap-4",
                        viewMode === 'grid' 
                          ? "grid grid-cols-2 md:grid-cols-4"
                          : "flex flex-col gap-2"
                      )}>
                        {filteredData.media.map((item) => (
                          <ImageCard
                            key={item.id}
                            item={item}
                            viewMode={viewMode}
                            selectMode={selectMode}
                            isSelected={selectedItems.has(item.id)}
                            onToggleSelection={toggleItemSelection}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {filteredData.albums.length === 0 && filteredData.media.length === 0 && (
                    <EmptyState 
                      icon={ImageIcon} 
                      title="No paintings found" 
                      description={debouncedSearchTerm ? `No results for "${debouncedSearchTerm}"` : "No paintings available in this gallery"}
                    />
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Images tab content with painting details */}
            <TabsContent value="images" className="flex flex-col gap-4">
              <ScrollArea className="h-1 grow rounded-md border">
                {filteredData.media.length === 0 ? (
                  <EmptyState 
                    icon={ImageIcon} 
                    title="No painting images found"
                    description={debouncedSearchTerm ? `No images match "${debouncedSearchTerm}"` : "No painting images available"}
                  />
                ) : (
                  <div className={cn(
                    "p-4",
                    viewMode === 'grid' 
                      ? "grid grid-cols-2 md:grid-cols-4 gap-4"
                      : "flex flex-col gap-2"
                  )}>
                    {filteredData.media.map((item) => (
                      <ImageCard
                        key={item.id}
                        item={item}
                        viewMode={viewMode}
                        selectMode={selectMode}
                        isSelected={selectedItems.has(item.id)}
                        onToggleSelection={toggleItemSelection}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Albums tab content */}
            <TabsContent value="albums" className="flex flex-col gap-4">
              <ScrollArea className="h-1 grow rounded-md border">
                {filteredData.albums.length === 0 ? (
                  <EmptyState 
                    icon={FolderIcon} 
                    title="No painting albums found"
                    description={debouncedSearchTerm ? `No albums match "${debouncedSearchTerm}"` : "No painting albums available"}
                  />
                ) : (
                  <div className={cn(
                    "p-4",
                    viewMode === 'grid' 
                      ? "grid grid-cols-2 md:grid-cols-4 gap-4"
                      : "flex flex-col gap-2"
                  )}>
                    {filteredData.albums.map((album) => {
                      const albumMedia = media.filter(item => item.album === album.id);
                      const isSelected = selectedAlbums.has(album.id);
                      
                      return (
                        <AlbumCard
                          key={album.id}
                          album={album}
                          albumMedia={albumMedia}
                          viewMode={viewMode}
                          selectMode={selectMode}
                          isSelected={isSelected}
                          onToggleSelection={toggleAlbumSelection}
                          onAlbumClick={handleAlbumClick}
                        />
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        // Album view (similar to media library)
        <div className="h-full flex flex-col gap-3">
          <div className="flex flex-row justify-between items-center">
            <div className="flex gap-2">
              <Button onClick={() => setSelectedAlbum(null)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                variant={selectMode ? "outline" : "default"}
                onClick={() => {
                  if (selectMode) {
                    handleExitSelectMode();
                  } else {
                    setSelectMode(true);
                  }
                }}
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                {selectMode ? "Exit Select Mode" : "Select Images"}
              </Button>

              {selectMode && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selectedItems.size === albumImages.length) {
                        setSelectedItems(new Set()); // Deselect all
                      } else {
                        setSelectedItems(new Set(albumImages.map(img => img.id))); // Select all
                      }
                    }}
                  >
                    <CheckSquare className="h-4 w-4 mr-2" />
                    {selectedItems.size === albumImages.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>

                  {selectedItems.size > 0 && (
                    <Button 
                      variant="default" 
                      onClick={() => setShowProcessDialog(true)}
                    >
                      <Cog className="h-4 w-4 mr-2" />
                      Process ({selectedItems.size})
                    </Button>
                  )}

                  {selectedItems.size > 0 && (
                    <Button
                      variant="destructive"
                      onClick={deleteSelected}
                      disabled={isDeleting}
                    >
                      <Trash2 className="mr-1" /> 
                      {isDeleting ? 'Deleting...' : `Delete (${selectedItems.size})`}
                    </Button>
                  )}
                </>
              )}
            </div>
            <div className='flex flex-row items-center gap-2'>
              <p className="text-sm text-muted-foreground ml-2">
                {albumImages.length} image{albumImages.length !== 1 ? "s" : ""}
              </p>
              <Button variant="outline" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
                {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <ScrollArea className="grow rounded-md border p-4">
            {albumImages.length === 0 ? (
              <EmptyState 
                icon={ImageIcon} 
                title="No images in this album"
                description="This album doesn't contain any images yet"
              />
            ) : (
              <div className={cn(
                "gap-4 m-1",
                viewMode === "grid"
                  ? "grid grid-cols-2 md:grid-cols-4"
                  : "flex flex-col"
              )}>
                {albumImages.map(img => (
                  <ImageCard
                    key={img.id}
                    item={img}
                    viewMode={viewMode}
                    selectMode={selectMode}
                    isSelected={selectedItems.has(img.id)}
                    onToggleSelection={toggleItemSelection}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Process Selection Dialog */}
      <Dialog open={showProcessDialog} onOpenChange={setShowProcessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Process Selected Images</DialogTitle>
            <DialogDescription>
              Choose how you want to process the {selectedItems.size} selected image{selectedItems.size > 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Button 
                onClick={navigateToAIDescription}
                className="justify-start"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI Description
              </Button>
              <Button 
                onClick={navigateToElementDetection}
                variant="outline"
                className="justify-start"
              >
                <Search className="h-4 w-4 mr-2" />
                Element Detection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
