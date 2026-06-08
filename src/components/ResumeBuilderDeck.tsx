import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  FileUp, 
  Loader2, 
  RotateCcw, 
  SearchCheck, 
  Sparkles, 
  Download, 
  Copy, 
  Check, 
  Briefcase, 
  FileSpreadsheet, 
  Percent, 
  CheckCircle2, 
  XCircle,
  Sparkle
} from 'lucide-react';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import { sounds } from '../services/soundEffects';
import { analyzeResumeAlignment, generateOptimizedResume, MatchAnalysisResult } from '../services/resumeService';
import Markdown_MarkdownImport from 'react-markdown';

// Set PDF JS worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ResumeBuilderDeckProps {
  muted: boolean;
}

export default function ResumeBuilderDeck({ muted }: ResumeBuilderDeckProps) {
  // Update muted state in sound implementation
  sounds.setMuted(muted);

  // Master Resume state
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [masterText, setMasterText] = useState<string>('');
  const [isParsingMaster, setIsParsingMaster] = useState(false);
  const masterInputRef = useRef<HTMLInputElement>(null);

  // Job Description state
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [jdText, setJdText] = useState<string>('');
  const [isParsingJd, setIsParsingJd] = useState(false);
  const jdInputRef = useRef<HTMLInputElement>(null);

  // Excel Keywords state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelKeywords, setExcelKeywords] = useState<string[]>([]);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // Target role state
  const [targetRole, setTargetRole] = useState<'Product Manager' | 'Product Owner' | 'Solution Architect' | 'AI Product Manager'>('Product Manager');

  // Logic flow states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MatchAnalysisResult | null>(null);
  const [tailoredResume, setTailoredResume] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // File parsing logic
  const parseDocument = async (file: File): Promise<string> => {
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
      }
      return fullText;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } else {
      // Plain text files
      return await file.text();
    }
  };

  const handleMasterUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    sounds.playBubble();
    setMasterFile(file);
    setIsParsingMaster(true);
    setAnalysisResult(null);
    setTailoredResume(null);

    try {
      const text = await parseDocument(file);
      setMasterText(text);
      sounds.playTick();
    } catch (error) {
      console.error('Master Resume parsing error:', error);
      alert('Failed to parse Master Resume file. Please try PDF, DOCX or TXT.');
    } finally {
      setIsParsingMaster(false);
    }
  };

  const handleJdUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    sounds.playBubble();
    setJdFile(file);
    setIsParsingJd(true);
    setAnalysisResult(null);
    setTailoredResume(null);

    try {
      const text = await parseDocument(file);
      setJdText(text);
      sounds.playTick();
    } catch (error) {
      console.error('JD parsing error:', error);
      alert('Failed to parse Job Description file. Please try PDF, DOCX or TXT.');
    } finally {
      setIsParsingJd(false);
    }
  };

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    sounds.playBubble();
    setExcelFile(file);
    setIsParsingExcel(true);
    setExcelKeywords([]);
    setAnalysisResult(null);
    setTailoredResume(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });
      
      const keywords: string[] = [];
      json.forEach((row: any) => {
        if (Array.isArray(row)) {
          row.forEach(cell => {
            if (cell !== undefined && cell !== null) {
              const str = String(cell).trim();
              if (str.length > 2 && str.length < 60 && !str.includes('\n')) {
                keywords.push(str);
              }
            }
          });
        }
      });

      // Filter uniques
      const uniqueKeywords = Array.from(new Set(keywords)).slice(0, 50);
      setExcelKeywords(uniqueKeywords);
      sounds.playSuccess();
    } catch (error) {
      console.error('Excel keyword parsing error:', error);
      alert('Failed to parse Excel spreadsheet. Make sure it is a valid .xlsx or .xls file.');
    } finally {
      setIsParsingExcel(false);
    }
  };

  // Perform JD matching assessment
  const handleAnalyzeAndMatch = async () => {
    const actualResume = masterText.trim();
    const actualJd = jdText.trim();

    if (!actualResume) {
      alert("Please upload or type your Master Resume first!");
      return;
    }
    if (!actualJd) {
      alert("Please upload or type the Target Job Description (JD) first!");
      return;
    }

    sounds.playClick();
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setTailoredResume(null);

    try {
      const result = await analyzeResumeAlignment({
        masterResume: actualResume,
        jobDescription: actualJd,
        excelKeywords: excelKeywords,
        targetRole: targetRole
      });
      setAnalysisResult(result);
      sounds.playSuccess();
    } catch (err) {
      console.error(err);
      alert("Error occurred performing resume JD keywords alignment. Check API connectivity.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Tailor Resume based on standard layout maintaining
  const handleTailorResume = async () => {
    const actualResume = masterText.trim();
    const actualJd = jdText.trim();

    if (!actualResume || !actualJd) return;

    sounds.playClick();
    setIsGenerating(true);
    setTailoredResume(null);

    try {
      const result = await generateOptimizedResume({
        masterResume: actualResume,
        jobDescription: actualJd,
        excelKeywords: excelKeywords,
        targetRole: targetRole
      });
      setTailoredResume(result);
      sounds.playSuccess();
    } catch (err) {
      console.error(err);
      alert("Error occurred tailoring your resume. Check API connectivity.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Output utilities
  const downloadTailoredMd = () => {
    if (!tailoredResume) return;
    sounds.playSuccess();
    const blob = new Blob([tailoredResume], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Tailored_Resume_${targetRole.replace(/\s+/g, '_')}_${new Date().toISOString().substring(0,10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadTailoredDoc = () => {
    if (!tailoredResume) return;
    sounds.playSuccess();

    let bodyHtml = tailoredResume.replace(/\r/g, '');

    // Convert headings
    bodyHtml = bodyHtml.replace(/^# (.*)$/gm, '<h1>$1</h1>');
    bodyHtml = bodyHtml.replace(/^## (.*)$/gm, '<h2>$1</h2>');
    bodyHtml = bodyHtml.replace(/^### (.*)$/gm, '<h3>$1</h3>');
    bodyHtml = bodyHtml.replace(/^#### (.*)$/gm, '<h4>$1</h4>');

    // Bold/Italic
    bodyHtml = bodyHtml.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    bodyHtml = bodyHtml.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Bullet points
    bodyHtml = bodyHtml.replace(/^\s*-\s+(.*)$/gm, '<li>$1</li>');
    bodyHtml = bodyHtml.replace(/^\s*\*\s+(.*)$/gm, '<li>$1</li>');

    // Wrap plain text lines not styled
    bodyHtml = bodyHtml.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h') || trimmed.startsWith('<li') || trimmed.startsWith('</')) return line;
      return `<p>${line}</p>`;
    }).join('\n');

    const wordTemplate = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>Tailored Executive Resume</title>
        <style>
          body {
            font-family: "Calibri", "Arial", sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #1f2937;
            margin: 1.0in;
          }
          h1 {
            font-size: 20pt;
            color: #111827;
            text-align: center;
            margin-bottom: 2pt;
            font-weight: bold;
          }
          h2 {
            font-size: 13pt;
            color: #4f46e5;
            border-bottom: 1.5px solid #4f46e5;
            padding-bottom: 2pt;
            margin-top: 14pt;
            margin-bottom: 6pt;
          }
          h3 {
            font-size: 11pt;
            color: #111827;
            margin-top: 8pt;
            margin-bottom: 2pt;
            font-weight: bold;
          }
          p {
            margin: 0 0 4pt 0;
            color: #374151;
          }
          ul {
            margin: 0 0 6pt 0;
            padding-left: 18pt;
          }
          li {
            margin-bottom: 3pt;
            color: #374151;
          }
        </style>
      </head>
      <body>
        ${bodyHtml}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + wordTemplate], { type: 'application/msword;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Tailored_Resume_${targetRole.replace(/\s+/g, '_')}_${new Date().toISOString().substring(0,10)}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = () => {
    if (!tailoredResume) return;
    sounds.playSuccess();
    navigator.clipboard.writeText(tailoredResume);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetAll = () => {
    sounds.playClick();
    setMasterFile(null);
    setMasterText('');
    setJdFile(null);
    setJdText('');
    setExcelFile(null);
    setExcelKeywords([]);
    setAnalysisResult(null);
    setTailoredResume(null);
  };

  return (
    <div className="w-full flex flex-col gap-10">
      {/* Visual Alignment Pipeline Tracker */}
      <div className="w-full bg-[#111111] border border-[#222222] p-4 rounded-[16px] flex flex-wrap items-center justify-between gap-4 text-left">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[#38bdf8] rounded-full animate-pulse" />
          <span className="text-[11px] font-mono tracking-wider text-[#64748b] uppercase">CV Path Progress Tracker</span>
        </div>
        
        <div className="flex items-center gap-6 sm:gap-10 text-[10px] font-bold uppercase tracking-wider">
          <div className={`flex items-center gap-2 ${(!analysisResult && !tailoredResume) ? 'text-[#38bdf8]' : 'text-[#64748b]'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] border ${(!analysisResult && !tailoredResume) ? 'border-[#38bdf8] bg-[#38bdf8]/10 text-[#38bdf8]' : 'border-[#222222] text-[#64748b]'}`}>1</span>
            <span>Upload Inputs</span>
          </div>
          <div className="w-4 h-px bg-[#222222]" />
          <div className={`flex items-center gap-2 ${(analysisResult && !tailoredResume && !isGenerating) ? 'text-[#38bdf8]' : 'text-[#64748b]'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] border ${(analysisResult && !tailoredResume && !isGenerating) ? 'border-[#38bdf8] bg-[#38bdf8]/10 text-[#38bdf8]' : 'border-[#222222] text-[#64748b]'}`}>2</span>
            <span>View Match Score</span>
          </div>
          <div className="w-4 h-px bg-[#222222]" />
          <div className={`flex items-center gap-2 ${tailoredResume ? 'text-[#38bdf8]' : 'text-[#64748b]'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] border ${tailoredResume ? 'border-[#38bdf8] bg-[#38bdf8]/10 text-[#38bdf8]' : 'border-[#222222] text-[#64748b]'}`}>3</span>
            <span>Tailor & Download</span>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isAnalyzing && !isGenerating && !analysisResult && !tailoredResume && (
          <motion.div
            key="resume-inputs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left"
          >
            {/* Step 1: Master Resume Input */}
            <div className="bg-[#111111] rounded-[20px] border border-[#222222] p-6 flex flex-col min-h-[460px] relative shadow-xl hover:border-[#38bdf8]/50 transition-all duration-300">
              <div className="mb-4">
                <span className="text-[11px] text-[#38bdf8] uppercase font-semibold tracking-[0.12em] block mb-1">Step 01</span>
                <h3 className="text-lg font-bold text-white mt-1">Master Resume</h3>
                <p className="text-xs text-[#64748b] mt-0.5">Standard format target context source</p>
              </div>

              {/* Drag/Drop Upload Container */}
              <div className="flex-1 flex flex-col gap-4">
                <input
                  type="file"
                  id="master-upload-input"
                  ref={masterInputRef}
                  onChange={handleMasterUpload}
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                />
                
                {!masterFile ? (
                  <button
                    id="master-upload-trigger"
                    onClick={() => { sounds.playClick(); masterInputRef.current?.click(); }}
                    className="flex-1 flex flex-col items-center justify-center p-6 border border-dashed border-[#222222] rounded-[14px] hover:border-[#38bdf8]/50 bg-[#050505]/45 hover:bg-[#050505]/20 transition-all cursor-pointer group"
                  >
                    <FileUp className="w-8 h-8 text-[#38bdf8] group-hover:scale-110 transition-all duration-300" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] group-hover:text-slate-300 mt-3 text-center">
                      Upload PDF, DOCX, TXT
                    </span>
                    <span className="text-[9px] text-[#64748b]/60 mt-1">or write raw text below</span>
                  </button>
                ) : (
                  <div className="bg-[#38bdf8]/5 border border-[#38bdf8]/20 rounded-[14px] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-5 h-5 text-[#38bdf8]" />
                      <div className="flex flex-col text-left overflow-hidden">
                        <span className="text-xs font-bold text-white truncate max-w-[150px]">{masterFile.name}</span>
                        <span className="text-[9px] text-[#38bdf8] uppercase tracking-widest font-semibold">Successfully Parsed</span>
                      </div>
                    </div>
                    <button 
                      id="reset-master-btn"
                      onClick={() => { sounds.playSweep(); setMasterFile(null); setMasterText(''); }}
                      className="p-1 hover:bg-white/5 rounded text-white/30 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <textarea
                  id="master-resume-textarea"
                  value={masterText}
                  onChange={(e) => {
                    setMasterText(e.target.value);
                    if (e.target.value.length % 20 === 0) sounds.playTick();
                  }}
                  placeholder="Paste your current Master Resume content here..."
                  className="h-44 w-full bg-[#050505] rounded-[14px] border border-[#222222] p-3 text-xs text-[#f8fafc] placeholder:text-slate-600 focus:ring-1 focus:ring-[#38bdf8]/35 focus:border-[#38bdf8]/35 outline-none resize-none text-left custom-scrollbar font-mono leading-relaxed transition-all"
                />

                {isParsingMaster && (
                  <div className="flex items-center gap-2 justify-center text-[9px] text-[#38bdf8] uppercase tracking-widest font-bold py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#38bdf8]" />
                    Extracting File...
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Target Job Description (JD) */}
            <div className="bg-[#111111] rounded-[20px] border border-[#222222] p-6 flex flex-col min-h-[460px] relative shadow-xl hover:border-[#38bdf8]/50 transition-all duration-300">
              <div className="mb-4">
                <span className="text-[11px] text-[#38bdf8] uppercase font-semibold tracking-[0.12em] block mb-1">Step 02</span>
                <h3 className="text-lg font-bold text-white mt-1">Target JD</h3>
                <p className="text-xs text-[#64748b] mt-0.5">Role requirements & scope benchmark</p>
              </div>

              <div className="flex-1 flex flex-col gap-4">
                <input
                  type="file"
                  id="jd-upload-input"
                  ref={jdInputRef}
                  onChange={handleJdUpload}
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                />

                {!jdFile ? (
                  <button
                    id="jd-upload-trigger"
                    onClick={() => { sounds.playClick(); jdInputRef.current?.click(); }}
                    className="flex-1 flex flex-col items-center justify-center p-6 border border-dashed border-[#222222] rounded-[14px] hover:border-[#38bdf8]/50 bg-[#050505]/45 hover:bg-[#050505]/20 transition-all cursor-pointer group"
                  >
                    <FileUp className="w-8 h-8 text-[#38bdf8] group-hover:scale-110 transition-all duration-300" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] group-hover:text-slate-300 mt-3 text-center">
                      Upload PDF, DOCX, TXT
                    </span>
                    <span className="text-[9px] text-[#64748b]/60 mt-1">or write raw text below</span>
                  </button>
                ) : (
                  <div className="bg-[#38bdf8]/5 border border-[#38bdf8]/20 rounded-[14px] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-5 h-5 text-[#38bdf8]" />
                      <div className="flex flex-col text-left overflow-hidden">
                        <span className="text-xs font-bold text-white truncate max-w-[150px]">{jdFile.name}</span>
                        <span className="text-[9px] text-[#38bdf8] uppercase tracking-widest font-semibold">Successfully Parsed</span>
                      </div>
                    </div>
                    <button 
                      id="reset-jd-btn"
                      onClick={() => { sounds.playSweep(); setJdFile(null); setJdText(''); }}
                      className="p-1 hover:bg-white/5 rounded text-white/30 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <textarea
                  id="jd-textarea"
                  value={jdText}
                  onChange={(e) => {
                    setJdText(e.target.value);
                    if (e.target.value.length % 20 === 0) sounds.playTick();
                  }}
                  placeholder="Paste the target Job Description (JD) here..."
                  className="h-44 w-full bg-[#050505] rounded-[14px] border border-[#222222] p-3 text-xs text-[#f8fafc] placeholder:text-slate-600 focus:ring-1 focus:ring-[#38bdf8]/35 focus:border-[#38bdf8]/35 outline-none resize-none text-left custom-scrollbar font-mono leading-relaxed transition-all"
                />

                {isParsingJd && (
                  <div className="flex items-center gap-2 justify-center text-[9px] text-[#38bdf8] uppercase tracking-widest font-bold py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#38bdf8]" />
                    Extracting File...
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Excel Keyword Sheet + Target Role */}
            <div className="bg-[#111111] rounded-[20px] border border-[#222222] p-6 flex flex-col min-h-[460px] relative shadow-xl hover:border-[#38bdf8]/50 transition-all duration-300">
              <div className="mb-4">
                <span className="text-[11px] text-[#38bdf8] uppercase font-semibold tracking-[0.12em] block mb-1">Step 03</span>
                <h3 className="text-lg font-bold text-white mt-1">Keywords & Target</h3>
                <p className="text-xs text-[#64748b] mt-0.5">Excel uploader & target role criteria</p>
              </div>

              <div className="flex-1 flex flex-col gap-4">
                <input
                  type="file"
                  id="excel-upload-input"
                  ref={excelInputRef}
                  onChange={handleExcelUpload}
                  accept=".xlsx,.xls"
                  className="hidden"
                />

                {!excelFile ? (
                  <button
                    id="excel-upload-trigger"
                    onClick={() => { sounds.playClick(); excelInputRef.current?.click(); }}
                    className="h-24 flex flex-col items-center justify-center border border-dashed border-[#222222] rounded-[14px] hover:border-[#38bdf8]/40 bg-[#050505]/45 hover:bg-[#050505]/20 transition-all cursor-pointer group"
                  >
                    <FileSpreadsheet className="w-7 h-7 text-emerald-400 group-hover:scale-110 transition-all duration-300" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] group-hover:text-slate-300 mt-2 text-center">
                      Upload Keywords Excel (.XLSX)
                    </span>
                  </button>
                ) : (
                  <div className="bg-[#38bdf8]/5 border border-[#38bdf8]/20 rounded-[14px] p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div className="flex flex-col text-left overflow-hidden">
                        <span className="text-xs font-bold text-white truncate max-w-[140px]">{excelFile.name}</span>
                        <span className="text-[9px] text-emerald-400 uppercase tracking-widest font-bold">
                          {excelKeywords.length} Keywords Parsed
                        </span>
                      </div>
                    </div>
                    <button 
                      id="reset-excel-btn"
                      onClick={() => { sounds.playSweep(); setExcelFile(null); setExcelKeywords([]); }}
                      className="p-1 hover:bg-white/5 rounded text-white/30 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Display extracted keywords preview if exists */}
                {excelKeywords.length > 0 && (
                  <div className="bg-[#050505] border border-[#222222] rounded-[14px] p-3 h-20 overflow-y-auto custom-scrollbar flex flex-wrap gap-1.5 align-content-start">
                    {excelKeywords.map((tag, i) => (
                      <span key={i} className="text-[9px] font-medium bg-[#111111] border border-[#222222] rounded text-[#94a3b8] px-1.5 py-0.5">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Target Role Selector */}
                <div className="space-y-2 mt-2">
                  <label className="text-[10px] uppercase tracking-[0.1em] text-[#64748b] font-semibold block">Select Target Role Criteria</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['Product Manager', 'Product Owner', 'Solution Architect', 'AI Product Manager'] as const).map((role) => (
                      <button
                        key={role}
                        id={`role-btn-${role.replace(/\s+/g, '-')}`}
                        onClick={() => { sounds.playClick(); setTargetRole(role); }}
                        className={`text-[10px] font-bold uppercase py-2.5 px-2 rounded-[12px] transition-all duration-300 text-center border cursor-pointer ${
                          targetRole === role 
                            ? 'bg-[#38bdf8]/15 border-[#38bdf8]/40 text-white shadow-md' 
                            : 'bg-[#050505] border-[#222222] text-[#64748b] hover:border-[#38bdf8]/20 hover:text-white'
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                {isParsingExcel && (
                  <div className="flex items-center gap-2 justify-center text-[9px] text-[#38bdf8] uppercase tracking-widest font-bold py-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#38bdf8]" />
                    Parsing Spreadsheet...
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Trigger Matching Button */}
        {!isAnalyzing && !isGenerating && !analysisResult && !tailoredResume && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center"
          >
            <button
              id="analyze-and-match-btn"
              onClick={handleAnalyzeAndMatch}
              disabled={!masterText.trim() || !jdText.trim()}
              className={`flex items-center gap-3 px-12 py-4 rounded-full text-xs font-bold uppercase tracking-[0.2em] transition-all ${
                (masterText.trim() && jdText.trim()) 
                  ? 'bg-[#38bdf8] text-[#050505] hover:bg-[#0ea5e9] shadow-[0_0_20px_rgba(56,189,248,0.25)] hover:shadow-[0_0_30px_rgba(56,189,248,0.4)] cursor-pointer active:scale-95 duration-300' 
                  : 'bg-[#111111] text-slate-500 border border-[#222222] cursor-not-allowed opacity-50'
              }`}
            >
              <SearchCheck className="w-4 h-4 shrink-0" />
              Calculate Compliance Match
            </button>
          </motion.div>
        )}

        {/* Loading Assessment */}
        {isAnalyzing && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="relative">
              <div className="w-20 h-20 border-t-2 border-[#38bdf8] rounded-full animate-spin"></div>
              <div className="w-20 h-20 border-b-2 border-[#111111] rounded-full absolute top-0 left-0 rotate-45"></div>
              <Sparkle className="w-8 h-8 text-[#38bdf8] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <h2 className="mt-8 text-2xl font-bold text-white uppercase tracking-wider">Calculating Alignment</h2>
            <p className="text-[#64748b] mt-3 max-w-sm text-xs leading-relaxed">
              Evaluating master CV credentials, matching keyword dictionaries & counting missing vocabulary metrics...
            </p>
          </motion.div>
        )}

        {/* Loading tailoring */}
        {isGenerating && (
          <motion.div
            key="generating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="relative animate-bounce">
              <div className="w-20 h-20 border-t-2 border-[#38bdf8] rounded-full animate-spin"></div>
              <div className="w-20 h-20 border-b-2 border-[#111111] rounded-full absolute top-0 left-0 rotate-45"></div>
              <Sparkles className="w-8 h-8 text-[#38bdf8] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <h2 className="mt-8 text-2xl font-bold text-white uppercase tracking-wider">Tailoring Resume Layout</h2>
            <p className="text-[#64748b] mt-3 max-w-sm text-xs leading-relaxed">
              Mapping standard master format sections and rewriting active bullet points with high-value JD keywords...
            </p>
          </motion.div>
        )}

        {/* Analysis Result Screen */}
        {analysisResult && !tailoredResume && !isGenerating && (
          <motion.div
            key="analysis-result"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111111] rounded-[20px] border border-[#222222] overflow-hidden flex flex-col md:flex-row shadow-2xl relative z-10 w-full"
          >
            {/* Sidebar metrics feedback card */}
            <aside className="w-full md:w-80 bg-[#111111] border-r border-[#222222] p-8 flex flex-col">
              <div className="space-y-8 flex-1">
                <div className="text-center">
                  <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.14em] block mb-2">Match Rating</span>
                  
                  {/* Matching Radial Gauge */}
                  <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="54" className="stroke-[#222222]" strokeWidth="6" fill="transparent" />
                      <circle cx="64" cy="64" r="54" className="stroke-[#38bdf8]" strokeWidth="6" fill="transparent"
                        strokeDasharray={339}
                        strokeDashoffset={339 - (339 * Math.min(analysisResult.matchPercentage, 100)) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <span className="text-3xl font-bold font-sans text-white">
                        {analysisResult.matchPercentage}%
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#64748b] uppercase tracking-widest font-semibold mt-3">Overall Compliance</p>
                </div>

                {/* Keyword Analysis Lists */}
                <div className="space-y-4 pt-4 border-t border-[#222222] text-left">
                  <div>
                    <h4 className="text-[11px] font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                      Matched Keywords ({analysisResult.matchedKeywords.length})
                    </h4>
                    <div className="max-h-24 overflow-y-auto custom-scrollbar flex flex-wrap gap-1 align-content-start">
                      {analysisResult.matchedKeywords.slice(0, 15).map((kw, idx) => (
                        <span key={idx} className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-[4px] font-medium">
                          {kw}
                        </span>
                      ))}
                      {analysisResult.matchedKeywords.length === 0 && <span className="text-[9px] text-[#64748b]">None extracted</span>}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold uppercase text-orange-400 tracking-wider flex items-center gap-1.5 mb-2">
                      <XCircle className="w-3.5 h-3.5 shrink-0 text-orange-500" />
                      Missing Keywords ({analysisResult.missingKeywords.length})
                    </h4>
                    <div className="max-h-24 overflow-y-auto custom-scrollbar flex flex-wrap gap-1 align-content-start">
                      {analysisResult.missingKeywords.slice(0, 15).map((kw, idx) => (
                        <span key={idx} className="text-[9px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-[4px] font-medium">
                          {kw}
                        </span>
                      ))}
                      {analysisResult.missingKeywords.length === 0 && <span className="text-[9px] text-[#64748b]">None extracted</span>}
                    </div>
                  </div>
                </div>

                {/* Actions bottom sequence */}
                <div className="space-y-3 pt-6 border-t border-[#222222]">
                  <div className="space-y-1.5">
                    <button
                      id="tailor-resume-btn"
                      onClick={handleTailorResume}
                      className="w-full py-3.5 px-4 bg-[#38bdf8] hover:bg-[#0ea5e9] text-[#050505] font-extrabold rounded-[12px] text-[11px] uppercase tracking-widest transition-all text-center cursor-pointer shadow-[0_0_20px_rgba(56,189,248,0.25)] hover:shadow-[0_0_30px_rgba(56,189,248,0.4)] active:scale-[0.98]"
                    >
                      Tailor & Build Resume
                    </button>
                    <p className="text-[9px] text-[#64748b] leading-tight text-center">
                      Aligns content perfectly while strictly preserving master formatting.
                    </p>
                  </div>

                  <button
                    id="back-btn-1"
                    onClick={resetAll}
                    className="w-full py-2.5 px-4 bg-[#050505] hover:bg-[#111111] border border-[#222222] rounded-[12px] text-[10px] uppercase font-bold tracking-widest text-center text-[#64748b] hover:text-white transition-all cursor-pointer"
                  >
                    Back / Try Another
                  </button>
                </div>
              </div>
            </aside>

            {/* Analysis Review Report Panel */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#050505]">
              <div className="px-8 py-5 border-b border-[#222222] flex items-center justify-between bg-[#111111]/80 sticky top-0 z-20">
                <span className="text-[11px] font-bold text-[#fafafa] uppercase tracking-[0.15em] text-left">
                  Resumes Match Compliance Report
                </span>
                <span className="text-[10px] bg-[#38bdf8]/10 text-[#38bdf8] px-3 py-1 rounded-[6px] border border-[#38bdf8]/20 font-mono">
                  {targetRole} Alignment
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-10 md:p-14 scroll-smooth custom-scrollbar max-h-[60vh] text-left">
                <div className="markdown-body text-gray-300">
                  <Markdown_MarkdownImport>{analysisResult.analysisReport}</Markdown_MarkdownImport>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tailored CV Output Screen */}
        {tailoredResume && (
          <motion.div
            key="tailored-output"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111111] rounded-[20px] border border-[#222222] overflow-hidden flex flex-col md:flex-row shadow-2xl relative z-10 w-full text-left"
          >
            {/* Download side actions panel */}
            <aside className="w-full md:w-80 bg-[#111111] border-r border-[#222222] p-8 flex flex-col justify-between">
              <div className="space-y-8">
                <div>
                  <label className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.14em] mb-4 block">
                    Optimized Resume Deck
                  </label>
                  <p className="text-[11px] leading-relaxed text-[#94a3b8] text-left">
                    Your master resume was tailored to perfectly integrate high-priority keywords while rigidly preserving the exact layout structure you expect.
                  </p>
                </div>

                {/* Persisted Compliance Score Display */}
                {analysisResult && (
                  <div className="bg-[#38bdf8]/5 rounded-[12px] border border-[#38bdf8]/20 p-4">
                    <span className="text-[9px] uppercase tracking-wider text-[#64748b] block font-semibold">Resume Align Rating</span>
                    <div className="flex items-center gap-2.5 mt-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xl font-extrabold font-sans text-white">{analysisResult.matchPercentage}% Compliance</span>
                    </div>
                    <span className="text-[9px] text-[#64748b] mt-1 block">Successfully matched with {analysisResult.matchedKeywords.length} key attributes.</span>
                  </div>
                )}

                <div className="space-y-3 pt-6 border-t border-[#222222]">
                  <button 
                    id="download-word-btn"
                    onClick={downloadTailoredDoc}
                    className="w-full py-3.5 px-4 bg-[#111111] border border-[#222222] hover:border-[#38bdf8]/60 rounded-[12px] text-[10px] font-bold uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#38bdf8]" />
                    Download MS Word (.doc)
                  </button>

                  <button 
                    id="download-markdown-btn"
                    onClick={downloadTailoredMd}
                    className="w-full py-3 px-4 bg-[#111111] border border-[#222222] hover:border-[#38bdf8]/60 rounded-[12px] text-[10px] font-bold uppercase tracking-widest text-[#f8fafc] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#38bdf8]" />
                    Download Markdown (.md)
                  </button>

                  <button 
                    id="copy-markdown-btn"
                    onClick={copyToClipboard}
                    className="w-full py-3 px-4 bg-[#050505] border border-[#222222] hover:border-[#38bdf8]/60 rounded-[12px] text-[10px] font-bold uppercase tracking-widest text-white hover:text-[#38bdf8] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copied Markdown!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#38bdf8]" />
                        Copy Raw Markdown
                      </>
                    )}
                  </button>

                  <button 
                    id="print-cv-btn"
                    onClick={() => { sounds.playClick(); setTimeout(() => window.print(), 100); }}
                    className="w-full py-3 px-4 bg-[#050505] border border-[#222222] hover:border-white rounded-[12px] text-[10px] font-bold uppercase tracking-widest text-[#64748b] hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#64748b] hover:text-white" />
                    Print Tailored CV
                  </button>
                </div>
              </div>

              <div className="pt-8 border-t border-[#222222]">
                <button
                  id="restart-suite-btn"
                  onClick={resetAll}
                  className="w-full py-3 px-4 bg-[#050505] hover:bg-[#111111] rounded-[12px] text-[10px] uppercase font-bold text-[#38bdf8] tracking-widest border border-[#222222] cursor-pointer text-center flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restart Build Suite
                </button>
              </div>
            </aside>

            {/* Document preview panel */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#050505]">
              <div className="px-8 py-5 border-b border-[#222222] flex items-center justify-between bg-[#111111]/80 sticky top-0 z-20">
                <span className="text-[11px] font-bold text-white uppercase tracking-[0.15em] text-left">
                  Tailored Professional Resume Preview
                </span>
                <span className="text-[10px] bg-[#38bdf8]/10 text-[#38bdf8] px-3 py-1 rounded-[6px] border border-[#38bdf8]/20 font-bold uppercase tracking-widest">
                  Optimized
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-12 md:p-16 scroll-smooth custom-scrollbar max-h-[60vh] bg-white text-gray-900 border-t border-[#222222] relative selection:bg-indigo-200 text-left">
                <div className="prose prose-slate max-w-none text-left leading-relaxed">
                  <Markdown_MarkdownImport>{tailoredResume}</Markdown_MarkdownImport>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
