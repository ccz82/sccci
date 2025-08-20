import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { pb } from '~/lib/pb';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Progress } from '~/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { FileText, Loader2, CheckCircle, AlertCircle, Languages, FileBarChart, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { GoogleGenAI } from "@google/genai";

// Fake OCR responses based on filename
const getFakeOCRResponse = (filename: string): { text: string; confidence: number } => {
  const responses: Record<string, { text: string; confidence: number }> = {
    '-002.jpg': {
      text: '會議記錄\n日期：民國十二年三月十五日\n出席者：陳嘉庚、林文慶、黃奕住\n\n議程項目：\n一、審核上月財務報告\n二、討論新加坡中華總商會章程修訂\n三、商討教育基金籌募事宜\n\n決議事項：\n- 通過上月財務報告\n- 成立章程修訂委員會\n- 撥款十萬元作為教育基金',
      confidence: 0.95
    },
    '-003.jpg': {
      text: '新加坡中華總商會\n第二十三次董事會議記錄\n\n時間：民國十四年六月二十日上午十時\n地點：商會會所\n主席：陳嘉庚\n\n出席董事：林文慶、黃奕住、李光前、胡文虎等十二人\n\n議題：\n一、檢討商會組織架構\n二、審議新會員申請案\n三、討論與政府合作事宜\n\n會議決議：\n一、同意重組商會架構，增設秘書處\n二、批准五名新會員加入\n三、指派代表與殖民地政府洽談',
      confidence: 0.92
    },
    '-004.jpg': {
      text: '緊急會議記錄\n日期：民國十三年八月十日\n主題：應對經濟危機措施\n\n與會人員：\n主席：陳嘉庚\n副主席：林文慶\n財務主任：黃奕住\n各部門代表共八人\n\n討論要點：\n一、當前經濟形勢分析\n二、商會資金運用檢討\n三、會員企業援助方案\n四、與銀行協商貸款事宜\n\n重要決定：\n- 成立緊急應變小組\n- 設立緊急援助基金五十萬元\n- 暫緩非必要支出\n- 加強與政府及銀行聯繫',
      confidence: 0.88
    },
    '-005.jpg': {
      text: '中華總商會\n常務董事會會議紀要\n\n開會時間：民國十五年二月八日下午二時\n開會地點：總商會大樓三樓會議室\n\n出席人員：\n常務董事：陳嘉庚、林文慶、黃奕住、李光前\n秘書：王志明\n\n會議議程：\n一、上次會議記錄確認\n二、財務報告審核\n三、新年慶祝活動籌備\n四、會員福利制度討論\n\n會議結論：\n一、確認上次會議記錄無誤\n二、通過本月財務報告\n三、撥款三萬元辦理新年活動\n四、研議設立會員醫療互助基金',
      confidence: 0.91
    }
  };

  // Check if filename exactly matches any key
  if (responses[filename]) {
    return responses[filename];
  }

  // Check if filename contains any of the keys
  for (const [key, value] of Object.entries(responses)) {
    if (filename.includes(key)) {
      return value;
    }
  }

  // Default response for unmatched filenames
  return {
    text: `中華總商會會議記錄\n日期：民國年月日\n這是針對 ${filename} 的預設OCR回應文字內容。`,
    confidence: 0.85
  };
};

// Simulate OCR processing with fake delay
async function processFakeOCR(mediaItems: any[]) {
  try {
    // Simulate processing delay (2-4 seconds)
    const delay = Math.random() * 2000 + 2000; // 2-4 seconds
    await new Promise(resolve => setTimeout(resolve, delay));

    // Generate fake OCR results for each media item
    const ocrResults = mediaItems.map(mediaItem => {
      const response = getFakeOCRResponse(mediaItem.filename);
      return {
        success: true,
        text: response.text,
        confidences: [response.confidence], // Array format to match original structure
        error: null
      };
    });

    return {
      success: true,
      individual_results: ocrResults
    };
  } catch (error) {
    console.error('Fake OCR processing error:', error);
    throw error;
  }
}

// AI Translation function
async function translateText(chineseText: string): Promise<string> {
  // Use type assertion to access env
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    // Fallback translation when no API key is available
    return `[Fallback Translation - No API Key Available]\n\nMeeting Minutes\nDate: March 15, 1923 (Minguo 12)\nAttendees: Tan Kah Kee (陳嘉庚), Lim Boon Keng (林文慶), Wong Ah Fook (黃奕住)\n\nAgenda Items:\n1. Review of last month's financial report\n2. Discussion on Singapore Chinese Chamber of Commerce constitution amendments\n3. Deliberation on education fund raising matters\n\nResolutions:\n- Approved last month's financial report\n- Established constitution amendment committee\n- Allocated 100,000 yuan for education fund\n\nNote: This is a sample translation. Actual translation requires API key configuration.`;
  }


  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const translationPrompt = `You are an expert linguist and historian specialising in the translation of early 20th-century Chinese administrative documents. Your task and main objective is to provide a highly accurate and natural-sounding clear and formal English translation of the following historical council meeting minutes with NO additions or speculative inference.

Translation Objectives:
- Accuracy: Translate the Traditional Chinese text into clear, modern, and natural English. Ensure the translation precisely reflects the original historical meaning and content.
- Preserve Tone and Formality: Maintain the formal, administrative, and historically appropriate tone and formality of the original meeting minutes throughout the English translation.
- Contextual Consistency: Given the length of the document, ensure consistent terminology, phrasing, and historically factual representation across the entire translation. Avoid any changes in style or meaning.
- Handling Archaic/Specific Terminology:
  - For specific historical titles, organisational names, or unique cultural terms that might not have a direct, universally understood English equivalent, use the most fitting translation, and if necessary, follow it with the original Pinyin (Romanised) Chinese term or a brief, concise explanation in brackets (like this) or [like this] upon its first occurrence. Prioritise the natural English flow.
  - When rendering official titles or roles, provide the most historically plausible equivalent. Always include the original Chinese characters, followed by a concise English gloss, e.g., Taipu (太僕, Grand Minister of the Imperial Stud — a Qing dynasty honorific). If unclear, provide the transliteration (Pinyin) and explicitly note that the original may refer to a Qing dynasty office or honorific.
  - For personal names or place names, aim for standard Pinyin transliteration unless there is a well-established English equivalent that exists.

Strict Rules:
- Do not add facts not present in the source.
- If the source text is uncertain, garbled, or possibly the result of OCR error, translate it faithfully as-is but explicitly flag it in the English text using the unified format: [unclear, possibly OCR error: original text].
- If the likely intended wording can be reasonably inferred, include it after a comma, e.g., [unclear, possibly OCR error: 诸神, likely intended 诸商 ('merchants')].
- Always preserve numbers with units. If the source omits a unit (e.g., 「十萬元」), write the number and say "(currency unspecified)".
- Keep institutional names literal unless a standard English name is certain; otherwise add Hanyu Pinyin in parentheses on first mention, e.g., "Singapore Chinese General Chamber of Commerce (Zhonghua Zongshanghui)".
- Personal names: use established English if truly standard; else Pinyin with original Chinese in parentheses on first mention, e.g., "Tan Kah Kee (陳嘉庚, Chen Jiageng)".
- Dates: Convert ROC/Minguo dates to Gregorian and also show the original Chinese format. Always give the full conversion with year, month, and day to avoid vagueness. For example: “March 15, 1923 (Minguo 12, 3/15; 原文: 民國十二年三月十五日)”. If the exact ROC year cannot be confirmed, note it explicitly.
- Agenda verbs: translate faithfully (e.g., 「審核」 = "review/examine", not "approve").
- Agenda items: If the source contains numbered agenda points, render them in a numbered list (1., 2., 3., etc.) in English, retaining their original order. If an item is unclear, still include it in the list but flag it using the same [unclear, possibly OCR error: …] format.

Output Format:
- The translated text should mirror the original document's structure as closely as possible, including paragraph breaks, line breaks, and any sections or sub-headings.
- Numbered agenda items should be presented as a clear list.
- Do not add any introductory or concluding remarks, conversational language, or extra commentary outside of the translation itself. Provide only the translated text.

[START OF TRADITIONAL CHINESE DOCUMENT]
${chineseText}
[END OF TRADITIONAL CHINESE DOCUMENT]

Please provide the full, polished English translation below:`;

    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: translationPrompt,
    });

    return result.text || "Translation failed - no response received.";
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// AI Summarisation function
async function summariseText(englishText: string): Promise<string> {
  // Use type assertion to access env
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    // Fallback summary when no API key is available
    return `[Fallback Summary - No API Key Available]

Section 1: General Gist
This meeting of the Singapore Chinese Chamber of Commerce focused on routine administrative matters including financial review, constitutional amendments, and education funding initiatives. The session was chaired by key community leaders and resulted in several important decisions regarding organisational structure and resource allocation.

Section 2: Key Details
- Major decisions made: Approved financial report, established constitution amendment committee, allocated education funding
- Key attendees: Tan Kah Kee (Chairman), Lim Boon Keng, Wong Ah Fook
- Important dates: March 15, 1923 (Minguo 12)
- Primary topics discussed: Financial review, constitutional amendments, education fund raising
- Significant outcomes: 100,000 yuan allocated for education fund, new committee formation

Note: This is a sample summary. Actual summarisation requires API key configuration.`;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const summarisationPrompt = `You are an expert archivist and summariser. Your task and main objective is to provide a concise and comprehensive summary of the following historical council meeting minutes. Summarise the ENGLISH translation below with zero inference.

Your summary should have 2 distinct sections:

Section 1: General Gist (Short Paragraph)
Provide a single short paragraph (3-5 sentences) that captures the overall purpose, main topics, and general outcome of the meeting. This should give a high-level overview of the meeting minutes's content.

Section 2: Key Details (Bullet Point List)
Following the general gist paragraph, provide a detailed bulleted list highlighting the following specific information:
- All major decisions made
- Names of key attendees and their roles (if specified)
- Important dates or timeframes mentioned
- Primary topics or problems discussed
- Any significant historical context or outcomes (if present and relevant)

Strict Rules:
- Use only facts explicitly present in the translation text provided.
- If a field is not present, output null or an empty list (do not guess).
- Preserve the action verbs precisely (e.g., "reviewed", not "approved", unless "approved" is explicit).
- If the translation contains flagged text in the format [unclear, possibly OCR error: …], do not copy these phrases into the summary. Summarise only the portions that are clear and intelligible.
- At the end of the summary, add a short disclaimer note: "Note: Portions of the translated text marked as [unclear, possibly OCR error: …] were omitted to maintain accuracy."

Output Format:
- Start with the "Section 1: General Gist" paragraph
- Followed immediately with a clear heading for "Section 2: Key Details"
- Present the key details as a list of bullet points, with each bullet point directly addressing one of the categories above
- Ensure the language throughout the summary is formal, objective, and consistent with the historical nature of the council meeting minutes
• Do not add any introductory or concluding remarks, conversational language, or extra commentary outside of the summary itself. Provide only the 2-section summary.

[START OF TRANSLATED DOCUMENT]
${englishText}
[END OF TRANSLATED DOCUMENT]

Summary:`;

    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: summarisationPrompt,
    });

    return result.text || "Summarisation failed - no response received.";
  } catch (error) {
    console.error('Summarisation error:', error);
    throw new Error(`Summarisation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const Route = createFileRoute('/(app)/_app/ocr-processing')({
  component: OCRProcessingPage,
});

function OCRProcessingPage() {
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [ocrResults, setOcrResults] = useState<any[]>([]);
  const [processing, setProcessing] = useState(false);
  const [translating, setTranslating] = useState<number[]>([]);
  const [summarising, setSummarising] = useState<number[]>([]);
  const [currentProcessing, setCurrentProcessing] = useState(-1);
  const [meetingMinuteData, setMeetingMinuteData] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Get selected media items from localStorage
    const selected = JSON.parse(localStorage.getItem('selectedMediaForOCR') || '[]');
    setMediaItems(selected);
    setOcrResults(selected.map(() => ({ success: false, text: '', confidence: 0 })));
    
    // Initialize meeting minute data with default titles
    setMeetingMinuteData(selected.map((mediaItem: any) => ({
      title: `Meeting Minutes - ${mediaItem.filename}`,
      ocrText: '',
      translatedText: '',
      summarisedText: ''
    })));
  }, []);

  const processAllMedia = async () => {
    if (mediaItems.length === 0) return;

    setProcessing(true);
    setCurrentProcessing(0);
    
    try {
      toast.info('Starting OCR processing...');
      
      // Simulate processing each item (for visual feedback)
      for (let i = 0; i < mediaItems.length; i++) {
        setCurrentProcessing(i);
        // Small delay between items for visual effect
        if (i > 0) await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Process all media items with fake OCR
      const results = await processFakeOCR(mediaItems);
      
      // Update results and meeting minute data
      const processedResults = mediaItems.map((_, index) => {
        const result = results.individual_results[index];
        return {
          success: result?.success || false,
          text: result?.text || '',
          confidence: result?.confidences ? 
            result.confidences.reduce((a: number, b: number) => a + b, 0) / result.confidences.length : 0,
          error: result?.error
        };
      });

      setOcrResults(processedResults);
      
      // Update meeting minute data with OCR results
      setMeetingMinuteData(prev => prev.map((data, index) => ({
        ...data,
        ocrText: processedResults[index]?.text || ''
      })));
      
      toast.success('OCR processing completed!');
    } catch (error) {
      console.error('Error processing OCR:', error);
      toast.error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
      setCurrentProcessing(-1);
    }
  };

  const translateSingleText = async (idx: number) => {
    const data = meetingMinuteData[idx];
    if (!data?.ocrText?.trim()) {
      toast.error('No OCR text available to translate');
      return;
    }

    setTranslating(prev => [...prev, idx]);
    try {
      toast.info('Starting translation...');
      const translatedText = await translateText(data.ocrText);
      
      setMeetingMinuteData(prev => prev.map((item, i) => 
        i === idx ? { ...item, translatedText } : item
      ));
      
      toast.success('Translation completed!');
    } catch (error) {
      console.error('Translation error:', error);
      toast.error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTranslating(prev => prev.filter(i => i !== idx));
    }
  };

  const summariseSingleText = async (idx: number) => {
    const data = meetingMinuteData[idx];
    if (!data?.translatedText?.trim()) {
      toast.error('No translated text available to summarise');
      return;
    }

    setSummarising(prev => [...prev, idx]);
    try {
      toast.info('Starting summarisation...');
      const summarisedText = await summariseText(data.translatedText);
      
      setMeetingMinuteData(prev => prev.map((item, i) => 
        i === idx ? { ...item, summarisedText: summarisedText } : item
      ));
      
      toast.success('Summarisation completed!');
    } catch (error) {
      console.error('Summarisation error:', error);
      toast.error(`Summarisation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSummarising(prev => prev.filter(i => i !== idx));
    }
  };

  const handleDataChange = (idx: number, field: 'title' | 'ocrText' | 'translatedText' | 'summarisedText', value: string) => {
    setMeetingMinuteData(prev => prev.map((data, i) => 
      i === idx ? { ...data, [field]: value } : data
    ));
  };

  const handleSave = async (idx: number) => {
    try {
      const mediaItem = mediaItems[idx];
      const data = meetingMinuteData[idx];
      
      if (mediaItem && data) {
        // Check if a meeting minute already exists for this image
        const existingRecords = await pb.collection('meetingMinutes').getFullList({
          filter: `image = "${mediaItem.id}"`
        });
        
        if (existingRecords.length > 0) {
          // Update existing record
          await pb.collection('meetingMinutes').update(existingRecords[0].id, {
            title: data.title,
            ocrText: data.ocrText,
            translatedText: data.translatedText,
            summarisedText: data.summarisedText
          });
          toast.success(`Meeting minute updated: ${data.title}`);
        } else {
          // Create new meeting minute record
          await pb.collection('meetingMinutes').create({
            title: data.title,
            image: mediaItem.id, // Reference to the media item
            ocrText: data.ocrText,
            translatedText: data.translatedText,
            summarisedText: data.summarisedText
          });
          toast.success(`Meeting minute saved: ${data.title}`);
        }
      }
    } catch (error) {
      console.error('Error saving meeting minute:', error);
      toast.error('Failed to save meeting minute');
    }
  };

  const handleSaveAll = async () => {
    try {
      const savePromises = mediaItems.map(async (mediaItem, idx) => {
        const data = meetingMinuteData[idx];
        if (mediaItem && data && data.ocrText) {
          // Check if a meeting minute already exists for this image
          const existingRecords = await pb.collection('meetingMinutes').getFullList({
            filter: `image = "${mediaItem.id}"`
          });
          
          if (existingRecords.length > 0) {
            // Update existing record
            return pb.collection('meetingMinutes').update(existingRecords[0].id, {
              title: data.title,
              ocrText: data.ocrText,
              translatedText: data.translatedText,
              summarisedText: data.summarisedText
            });
          } else {
            // Create new meeting minute record
            return pb.collection('meetingMinutes').create({
              title: data.title,
              image: mediaItem.id, // Reference to the media item
              ocrText: data.ocrText,
              translatedText: data.translatedText,
              summarisedText: data.summarisedText
            });
          }
        }
        return Promise.resolve();
      });

      await Promise.all(savePromises);
      
      toast.success('All meeting minutes saved successfully!');
      
      // Set flag for toast and navigate back
      localStorage.setItem('showOCRProcessedToast', '1');
      localStorage.removeItem('selectedMediaForOCR');
      navigate({ to: '/ocr' });
    } catch (error) {
      console.error('Error saving all meeting minutes:', error);
      toast.error('Failed to save some meeting minutes');
    }
  };

  if (!mediaItems.length) {
    return (
      <div className="w-full min-h-screen p-8 flex flex-col">
        <h1 className="text-3xl font-bold mb-4">No media to process</h1>
        <Button onClick={() => navigate({ to: '/ocr' })}>Go to OCR Gallery</Button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen p-8 flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Meeting Minutes OCR Processing</h1>
        <p className="text-muted-foreground">Process media images with OCR, AI translation, and summarisation</p>
      </div>

      <div className="flex gap-4 mb-6">
        <Button 
          onClick={processAllMedia} 
          disabled={processing}
          className="flex items-center gap-2"
        >
          {processing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          {processing ? 'Processing...' : 'Process Images'}
        </Button>
        
        {ocrResults.some(r => r.success) && (
          <Button 
            variant="default" 
            onClick={handleSaveAll}
            className="flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Save All Meeting Minutes
          </Button>
        )}
        
        <Button 
          variant="outline" 
          onClick={() => navigate({ to: '/ocr' })}
        >
          Back to Gallery
        </Button>
      </div>

      {processing && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing Images...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={(currentProcessing + 1) / mediaItems.length * 100} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              Processing {Math.max(0, currentProcessing + 1)} of {mediaItems.length} images
            </p>
          </CardContent>
        </Card>
      )}

      <ScrollArea className="rounded-md flex-1">
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-8 pr-4">
          {mediaItems.map((mediaItem, i) => {
            const result = ocrResults[i];
            const data = meetingMinuteData[i];
            const hasResult = result && result.success;
            const hasError = result && !result.success && result.error;
            const isTranslating = translating.includes(i);
            const isSummarising = summarising.includes(i);

            return (
              <Card key={i} className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <img 
                      src={pb.files.getURL(mediaItem, mediaItem.image)} 
                      alt={mediaItem.filename} 
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <p className="truncate">{mediaItem.filename}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {hasResult && (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-xs">
                              Confidence: {(result.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {hasError && (
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs">Processing failed</span>
                          </div>
                        )}
                        {processing && currentProcessing === i && (
                          <div className="flex items-center gap-1 text-blue-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-xs">Processing...</span>
                          </div>
                        )}
                        {isTranslating && (
                          <div className="flex items-center gap-1 text-blue-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-xs">Translating...</span>
                          </div>
                        )}
                        {isSummarising && (
                          <div className="flex items-center gap-1 text-blue-600">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-xs">Summarising...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col gap-4">
                  <div className="flex-1">
                    <img 
                      src={pb.files.getURL(mediaItem, mediaItem.image)} 
                      alt={mediaItem.filename} 
                      className="w-full max-h-96 object-contain rounded border"
                    />
                  </div>

                  {/* Meeting Minute Title */}
                  <div className="flex flex-col gap-2">
                    <Label>Meeting Minute Title</Label>
                    <Input 
                      value={data?.title || ''} 
                      onChange={e => handleDataChange(i, 'title', e.target.value)}
                      placeholder="Enter meeting minute title..."
                    />
                  </div>
                  
                  {/* OCR Text */}
                  <div className="flex flex-col gap-2">
                    <Label>Extracted OCR Text (Chinese)</Label>
                    {hasError ? (
                      <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                        Error: {result.error}
                      </div>
                    ) : (
                      <Textarea 
                        value={data?.ocrText || ''} 
                        onChange={e => handleDataChange(i, 'ocrText', e.target.value)}
                        placeholder={hasResult ? "OCR text will appear here..." : "Process the image to extract text"}
                        className="min-h-32 resize-y"
                        disabled={!hasResult && !data?.ocrText}
                      />
                    )}
                  </div>

                  {/* Translation Section */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Label>English Translation</Label>
                      {data?.ocrText && !isTranslating && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => translateSingleText(i)}
                          disabled={!data.ocrText.trim()}
                          className="flex items-center gap-1"
                        >
                          <Languages className="h-3 w-3" />
                          Translate
                        </Button>
                      )}
                      {isTranslating && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-xs">Translating...</span>
                        </div>
                      )}
                    </div>
                    <Textarea 
                      value={data?.translatedText || ''} 
                      onChange={e => handleDataChange(i, 'translatedText', e.target.value)}
                      placeholder="Translated text will appear here after translation..."
                      className="min-h-32 resize-y"
                    />
                  </div>

                  {/* Summarisation Section */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <Label>Summary</Label>
                      {data?.translatedText && !isSummarising && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => summariseSingleText(i)}
                          disabled={!data.translatedText.trim()}
                          className="flex items-center gap-1"
                        >
                          <FileBarChart className="h-3 w-3" />
                          Summarise
                        </Button>
                      )}
                      {isSummarising && (
                        <div className="flex items-center gap-1 text-blue-600">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-xs">Summarising...</span>
                        </div>
                      )}
                    </div>
                    <Textarea 
                      value={data?.summarisedText || ''} 
                      onChange={e => handleDataChange(i, 'summarisedText', e.target.value)}
                      placeholder="Summary will appear here after summarisation..."
                      className="min-h-24 resize-y"
                    />
                  </div>
                  
                  {(hasResult || data?.ocrText) && (
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleSave(i)}
                        className="flex-1"
                      >
                        Save Meeting Minute
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          localStorage.setItem('selectedMediaForOCR', JSON.stringify([mediaItem]));
                          window.location.reload();
                        }}
                      >
                        Reprocess
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}