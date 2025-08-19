import { createContext, useContext, useState, ReactNode } from 'react'

interface SelectedImagesContextType {
  selectedImageIds: string[]
  setSelectedImageIds: (ids: string[]) => void
  clearSelection: () => void
}

const SelectedImagesContext = createContext<SelectedImagesContextType | undefined>(undefined)

export function SelectedImagesProvider({ children }: { children: ReactNode }) {
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([])

  const clearSelection = () => {
    setSelectedImageIds([])
  }

  return (
    <SelectedImagesContext.Provider 
      value={{ 
        selectedImageIds, 
        setSelectedImageIds, 
        clearSelection 
      }}
    >
      {children}
    </SelectedImagesContext.Provider>
  )
}

export function useSelectedImages() {
  const context = useContext(SelectedImagesContext)
  if (context === undefined) {
    throw new Error('useSelectedImages must be used within a SelectedImagesProvider')
  }
  return context
}
