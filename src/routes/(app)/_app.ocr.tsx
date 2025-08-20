import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent } from '~/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { pb } from '~/lib/pb'
import { cn } from '~/lib/utils'
import { Search, Grid, List, CheckSquare, Square, ImageIcon, FolderIcon, Trash2, FileText } from 'lucide-react'

export const Route = createFileRoute('/(app)/_app/ocr')({
  loader: async () => {
    // Load albums with type="minute"
    const minuteAlbums = await pb.collection("albums").getFullList({
      filter: 'type = "minute"'
    });
    
    // Load individual media items from minute albums
    const allMedia = await pb.collection("media").getFullList();
    const minuteMedia = allMedia.filter(media => {
      const album = minuteAlbums.find(album => album.id === media.album);
      return album !== undefined;
    });
    
    // Load existing meeting minutes to check what's already processed
    const existingMeetingMinutes = await pb.collection("meetingMinutes").getFullList({
      expand: 'image'
    });
    
    return {
      albums: minuteAlbums,
      media: minuteMedia,
      allAlbums: await pb.collection("albums").getFullList(), // For lookup
      existingMeetingMinutes
    };
  },
  component: RouteComponent,
})

function RouteComponent() {
  const { albums, media, allAlbums, existingMeetingMinutes } = Route.useLoaderData();
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('showOCRProcessedToast')) {
      toast.success('OCR processing completed successfully!');
      localStorage.removeItem('showOCRProcessedToast');
    }
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedAlbums, setSelectedAlbums] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'images' | 'albums'>('images');

  const filteredMedia = media.filter(item =>
    item.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAlbums = albums.filter(album =>
    album.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if a media item has already been processed (exists in meetingMinutes)
  const isProcessed = (mediaId: string) => {
    return existingMeetingMinutes.some(minute => minute.image === mediaId);
  };

  // Get the corresponding meeting minute record for a media item
  const getMeetingMinute = (mediaId: string) => {
    return existingMeetingMinutes.find(minute => minute.image === mediaId);
  };

  const toggleItemSelection = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const toggleAlbumSelection = (id: string) => {
    const newSelected = new Set(selectedAlbums);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAlbums(newSelected);
  };

  const selectAllItems = () => {
    if (activeTab === 'images') {
      setSelectedItems(new Set(filteredMedia.map(item => item.id)));
    } else {
      setSelectedAlbums(new Set(filteredAlbums.map(album => album.id)));
    }
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
    setSelectedAlbums(new Set());
  };

  const deleteSelected = async () => {
    try {
      if (activeTab === 'images') {
        for (const itemId of selectedItems) {
          await pb.collection("media").delete(itemId);
        }
        setSelectedItems(new Set());
      } else {
        for (const albumId of selectedAlbums) {
          await pb.collection("albums").delete(albumId);
        }
        setSelectedAlbums(new Set());
      }
      // Refresh the page data
      window.location.reload();
    } catch (error) {
      console.error('Error deleting items:', error);
    }
  };

  return (
    <div className='w-full mx-6 my-4 flex flex-col'>
      <div className='my-4 flex flex-col gap-3'>
        <h1 className='text-3xl font-bold'>Meeting Minutes OCR</h1>
        <p className='text-muted-foreground'>Browse and process meeting minute images with OCR</p>
      </div>

      <div className="flex flex-row gap-4 items-center mb-4">
        <Input
          placeholder="Search meeting minute images..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-3/5"
        />
        
        <div className="flex gap-2">
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
            setSelectMode(!selectMode);
            if (selectMode) {
              // When exiting select mode, clear all selections
              deselectAll();
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
              const hasSelections = activeTab === 'images' 
                ? selectedItems.size > 0 
                : selectedAlbums.size > 0;
              if (hasSelections) {
                deselectAll();
              } else {
                selectAllItems();
              }
            }}
          >
            {((activeTab === 'images' && selectedItems.size > 0) || 
              (activeTab === 'albums' && selectedAlbums.size > 0)) 
              ? 'Deselect All' 
              : 'Select All'
            }
          </Button>
          {((activeTab === 'images' && selectedItems.size > 0) || 
            (activeTab === 'albums' && selectedAlbums.size > 0)) && (
            <>
              <Button variant="destructive" size="sm" onClick={deleteSelected}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({activeTab === 'images' ? selectedItems.size : selectedAlbums.size})
              </Button>
              {activeTab === 'images' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    // Get selected media objects
                    const selected = media.filter(item => selectedItems.has(item.id));
                    localStorage.setItem('selectedMediaForOCR', JSON.stringify(selected));
                    navigate({ to: '/ocr-processing' });
                  }}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Process OCR ({selectedItems.size})
                </Button>
              )}
            </>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'images' | 'albums')} className='h-full w-full'>
        <TabsList>
          <TabsTrigger value="images">
            <ImageIcon className="h-4 w-4 mr-2" />
            Images ({filteredMedia.length})
          </TabsTrigger>
          <TabsTrigger value="albums">
            <FolderIcon className="h-4 w-4 mr-2" />
            Albums ({filteredAlbums.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="images" className="flex flex-col gap-4">
          <ScrollArea className="h-1 grow rounded-md border">
            {filteredMedia.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                <ImageIcon size={50} />
                <p className="mt-4">No minute images found.</p>
              </div>
            ) : (
              <div className={cn(
                "p-4",
                viewMode === 'grid' 
                  ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                  : "flex flex-col gap-2"
              )}>
                {filteredMedia.map((item) => {
                  const album = allAlbums.find((a) => a.id === item.album);
                  const isSelected = selectedItems.has(item.id);
                  const processed = isProcessed(item.id);
                  const meetingMinute = getMeetingMinute(item.id);
                  
                  if (viewMode === 'grid') {
                    return (
                      <div key={item.id} className="relative">
                        {selectMode && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleItemSelection(item.id);
                            }}
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <div 
                              className={cn(
                                "cursor-pointer bg-background border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between",
                                isSelected && "ring-2 ring-primary"
                              )}
                              onClick={(e) => {
                                if (selectMode) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleItemSelection(item.id);
                                }
                              }}
                            >
                              <img
                                src={pb.files.getURL(item, item.image)}
                                alt={item.filename}
                                className="w-full h-40 object-cover"
                              />
                              <div className="p-2 flex flex-col flex-1">
                                <p className="font-medium text-sm truncate">
                                  {item.filename}
                                </p>
                                {album && (
                                  <p className="w-full flex flex-row items-center justify-between text-xs text-muted-foreground">
                                    {album.name}{" "}
                                    <div className={processed ? 'text-green-700' : 'text-orange-600'}>
                                      • {processed ? 'Processed' : 'Pending'}
                                    </div>
                                  </p>
                                )}
                                {meetingMinute?.ocrText && (
                                  <p className="text-xs mt-1"><b>OCR:</b> {meetingMinute.ocrText.substring(0, 50)}...</p>
                                )}
                                {meetingMinute?.title && (
                                  <p className="text-xs mt-1"><b>Title:</b> {meetingMinute.title}</p>
                                )}
                              </div>
                              <Button
                                className="m-2"
                                size="sm"
                                onClick={e => {
                                  e.stopPropagation();
                                  // Only process this item
                                  localStorage.setItem('selectedMediaForOCR', JSON.stringify([item]));
                                  navigate({ to: '/ocr-processing' });
                                }}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                {processed ? 'Reprocess' : 'Process OCR'}
                              </Button>
                            </div>
                          </DialogTrigger>
                          <DialogContent className="max-w-5xl w-[85vw] h-[90vh] flex flex-col overflow-hidden">
                            <DialogHeader className="flex-shrink-0 border-b pb-4">
                              <DialogTitle>{meetingMinute?.title || item.filename}</DialogTitle>
                            </DialogHeader>
                            
                            <div className="flex-1 overflow-y-auto mt-4 pr-2">
                              <div className="flex flex-col gap-6 pb-6">
                                {/* Image Section */}
                                <div className="flex justify-center">
                                  <img
                                    src={pb.files.getURL(item, item.image)}
                                    alt={item.filename}
                                    className="max-w-full max-h-[35vh] object-contain rounded-lg shadow-md"
                                  />
                                </div>
                                
                                {/* OCR Text Section */}
                                {meetingMinute?.ocrText && (
                                  <div className="space-y-3">
                                    <h3 className="text-lg font-semibold">Extracted Text:</h3>
                                    <div className="bg-muted p-4 rounded-lg">
                                      <pre className="text-sm whitespace-pre-wrap leading-relaxed">{meetingMinute.ocrText}</pre>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Translated Text Section */}
                                {meetingMinute?.translatedText && (
                                  <div className="space-y-3">
                                    <h3 className="text-lg font-semibold">Translated Text:</h3>
                                    <div className="bg-muted p-4 rounded-lg">
                                      <div className="text-sm whitespace-pre-wrap leading-relaxed">{meetingMinute.translatedText}</div>
                                    </div>
                                  </div>
                                )}

                                {/* Summary Section */}
                                {meetingMinute?.summarisedText && (
                                  <div className="space-y-3">
                                    <h3 className="text-lg font-semibold">Summary:</h3>
                                    <div className="bg-muted p-4 rounded-lg">
                                      <div 
                                        className="text-sm whitespace-pre-wrap leading-relaxed"
                                        dangerouslySetInnerHTML={{
                                          __html: meetingMinute.summarisedText
                                            .replace(/^(Section \d+: .+)$/gm, '<div class="text-base font-bold mb-2 mt-4">$1</div>')
                                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                            .replace(/\n/g, '<br/>')
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    );
                  } else {
                    // List view
                    return (
                      <div key={item.id} className="relative">
                        {selectMode && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleItemSelection(item.id);
                            }}
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Card 
                              className={cn(
                                "cursor-pointer transition-all hover:shadow-md flex flex-row",
                                isSelected && "ring-2 ring-primary"
                              )}
                              onClick={(e) => {
                                if (selectMode) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleItemSelection(item.id);
                                }
                              }}
                            >
                              <CardContent className="p-0 flex flex-row items-center w-full">
                                <img
                                  src={pb.files.getURL(item, item.image)}
                                  alt={item.filename}
                                  className="w-20 h-20 object-cover rounded-l-lg"
                                />
                                <div className="p-3 flex-1">
                                  <p className="font-medium text-sm truncate">
                                    {meetingMinute?.title || item.filename}
                                  </p>
                                  {album && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="secondary" className="text-xs">
                                        {album.name}
                                      </Badge>
                                      <div className={processed ? 'text-green-700 text-xs' : 'text-orange-600 text-xs'}>
                                        • {processed ? 'Processed' : 'Pending'}
                                      </div>
                                    </div>
                                  )}
                                  {meetingMinute?.ocrText && (
                                    <p className="text-xs mt-1 text-muted-foreground">
                                      OCR: {meetingMinute.ocrText.substring(0, 80)}...
                                    </p>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>{meetingMinute?.title || item.filename}</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col items-center justify-center gap-4">
                              <img
                                src={pb.files.getURL(item, item.image)}
                                alt={item.filename}
                                className="max-h-[50vh] object-contain rounded-lg"
                              />
                              {meetingMinute?.ocrText && (
                                <div className="w-full">
                                  <p className="text-base font-semibold mb-2">Extracted Text:</p>
                                  <div className="bg-muted p-4 rounded-lg max-h-[30vh] overflow-y-auto">
                                    <pre className="text-sm whitespace-pre-wrap">{meetingMinute.ocrText}</pre>
                                  </div>
                                </div>
                              )}
                              {meetingMinute?.translatedText && (
                                <div className="w-full">
                                  <p className="text-base font-semibold mb-2">Translated Text:</p>
                                  <div className="bg-muted p-4 rounded-lg max-h-[20vh] overflow-y-auto">
                                    <pre className="text-sm whitespace-pre-wrap">{meetingMinute.translatedText}</pre>
                                  </div>
                                </div>
                              )}
                              {meetingMinute?.summarisedText && (
                                <div className="w-full">
                                  <p className="text-base font-semibold mb-2">Summary:</p>
                                  <div className="bg-muted p-4 rounded-lg">
                                    <p className="text-sm">{meetingMinute.summarisedText}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="albums" className="flex flex-col gap-4">
          <ScrollArea className="h-1 grow rounded-md border">
            {filteredAlbums.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                <FolderIcon size={50} />
                <p className="mt-4">No minute albums found.</p>
              </div>
            ) : (
              <div className={cn(
                "p-4",
                viewMode === 'grid' 
                  ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
                  : "flex flex-col gap-2"
              )}>
                {filteredAlbums.map((album) => {
                  const albumMedia = media.filter(item => item.album === album.id);
                  const isSelected = selectedAlbums.has(album.id);
                  const coverImage = albumMedia[0]; // Use first image as cover
                  
                  if (viewMode === 'grid') {
                    return (
                      <div key={album.id} className="relative">
                        {selectMode && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAlbumSelection(album.id);
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
                            "cursor-pointer bg-background border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow",
                            isSelected && "ring-2 ring-primary"
                          )}
                          onClick={(e) => {
                            if (selectMode) {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleAlbumSelection(album.id);
                            }
                          }}
                        >
                          <div className="relative w-full h-40">
                            {coverImage ? (
                              <img
                                src={pb.files.getURL(coverImage, coverImage.image)}
                                alt={album.name}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <div className="flex items-center justify-center bg-muted text-muted-foreground w-full h-full">
                                <FolderIcon className="h-8 w-8" />
                              </div>
                            )}
                            <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded px-2 py-1 text-xs">
                              {albumMedia.length} images
                            </div>
                          </div>
                          <div className="p-2 flex flex-col">
                            <p className="font-medium text-sm truncate">
                              {album.name}
                            </p>
                            <p className="w-full flex flex-row items-center justify-between text-xs text-muted-foreground">
                              Album{" "}
                              <div className='text-green-700'>
                                • Minutes
                              </div>
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    // List view
                    return (
                      <div key={album.id} className="relative">
                        {selectMode && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 left-2 z-10 bg-background/80 backdrop-blur-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleAlbumSelection(album.id);
                            }}
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        
                        <Card 
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-md flex flex-row",
                            isSelected && "ring-2 ring-primary"
                          )}
                          onClick={(e) => {
                            if (selectMode) {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleAlbumSelection(album.id);
                            }
                          }}
                        >
                          <CardContent className="p-0 flex flex-row items-center w-full">
                            <div className="relative w-20 h-20">
                              {coverImage ? (
                                <img
                                  src={pb.files.getURL(coverImage, coverImage.image)}
                                  alt={album.name}
                                  className="object-cover w-full h-full rounded-l-lg"
                                />
                              ) : (
                                <div className="flex items-center justify-center bg-muted text-muted-foreground w-full h-full rounded-l-lg">
                                  <FolderIcon className="h-8 w-8" />
                                </div>
                              )}
                            </div>
                            <div className="p-3 flex-1">
                              <p className="font-medium text-sm truncate">
                                {album.name}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {albumMedia.length} images
                                </Badge>
                                <div className='text-green-700 text-xs'>
                                  • Minutes Album
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}