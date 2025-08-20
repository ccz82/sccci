import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import { Label } from '~/components/ui/label'
import { Slider } from '~/components/ui/slider'
import { Badge } from '~/components/ui/badge'
import { Separator } from '~/components/ui/separator'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Loader2, BookOpen, Sparkles, Settings, FileText } from 'lucide-react'
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY
});

export const Route = createFileRoute('/(app)/_app/csc')({
  component: RouteComponent,
})

function RouteComponent() {
  const [temperature, setTemperature] = useState([0.7])
  const [userContext, setUserContext] = useState('')
  const [generatedStory, setGeneratedStory] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')

  const baseContext = `You are creating cultural stories for the Singapore Chinese Chamber of Commerce and Industry (SCCCI).

Background: SCCCI is the apex business organization representing the interests of the Chinese business community in Singapore. Established in 1906, it has over a century of history fostering trade, commerce, and cultural exchange between Singapore and the Chinese-speaking world.

Your stories should:
- Celebrate Chinese cultural heritage and traditions
- Highlight the entrepreneurial spirit of the Chinese business community in Singapore
- Showcase the multicultural harmony of Singapore
- Include themes of perseverance, community, innovation, and cultural preservation
- Be appropriate for business and cultural events
- Inspire pride in Chinese heritage while embracing Singapore's multicultural identity`


  const generateStory = async () => {
    if (!userContext.trim()) {
      setError("Please provide some context for your story")
      return
    }

    setIsGenerating(true)
    setError("")
    setGeneratedStory("")

    try {
      const fullPrompt = `${baseContext}

Additional Context: ${userContext}

Please create an engaging cultural story based on the above context.
The story should be approximately 300–500 words long.`

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash", // or "gemini-2.5-pro" if you want higher quality
        contents: [
          {
            role: "user",
            parts: [{ text: fullPrompt }],
          },
        ],
        config: {
          temperature: temperature[0],
        },
      })

      setGeneratedStory(response.text)
    } catch (err) {
      setError("Failed to generate story. Please try again.")
      console.error("Error generating story:", err)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className='w-full mx-6 my-4 flex flex-col'>
      <div className='my-4 flex flex-col gap-3'>
      <h1 className='text-3xl font-bold'>
        Cultural Story Creator
      </h1>
      <p className='text-muted-foreground'>
        Create engaging cultural stories about SCCCI.
      </p>
        </div>

      <div className="grid lg:grid-cols-2 gap-6 ">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Story Configuration
              </CardTitle>
              <CardDescription>
                Adjust the creativity and provide context for your cultural story
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="temperature">
                  Creativity Level: {temperature[0].toFixed(1)}
                </Label>
                <div className="mt-2">
                  <Slider
                    id="temperature"
                    min={0.1}
                    max={1.0}
                    step={0.1}
                    value={temperature}
                    onValueChange={setTemperature}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>More Focused</span>
                    <span>More Creative</span>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="context">Your Story Context</Label>
                <Textarea
                  id="context"
                  placeholder="Describe the theme, characters, setting, or specific elements you'd like in your cultural story. For example: 'A story about a young entrepreneur who honors traditional values while building a modern tech business' or 'A tale of how Chinese festivals bring the community together in Singapore'"
                  value={userContext}
                  onChange={(e) => setUserContext(e.target.value)}
                  rows={6}
                  className="mt-2"
                />
              </div>

              <Button
                onClick={generateStory}
                disabled={isGenerating || !userContext.trim()}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Story...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Cultural Story
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Base Context</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-40">
                <p className="text-sm text-gray-600 leading-relaxed">
                  {baseContext}
                </p>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Output Section */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Generated Story
              </CardTitle>
              <CardDescription>
                Your culturally-rich story will appear here
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generatedStory ? (
                <ScrollArea className="h-96">
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {generatedStory}
                    </div>
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-96 text-gray-400">
                  <div className="text-center">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Your generated story will appear here</p>
                    <p className="text-sm mt-1">Provide context and click generate to begin</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div >
  )
}
