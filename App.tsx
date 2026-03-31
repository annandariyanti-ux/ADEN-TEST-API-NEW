/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  PenTool, 
  Download, 
  Loader2, 
  ChevronRight, 
  CheckCircle2, 
  FileText, 
  User, 
  Layers, 
  Type as TypeIcon,
  Sparkles,
  ArrowLeft,
  Printer
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import { Ebook, EbookInput, EbookChapter } from './types';
import { generateTableOfContents, generateChapterContent } from './services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [step, setStep] = useState<'input' | 'generating' | 'viewer'>('input');
  const [input, setInput] = useState<EbookInput>({
    topic: '',
    pageCount: 35,
    tone: 'Profesional & Informatif',
    author: ''
  });
  
  const [generatingStatus, setGeneratingStatus] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [ebook, setEbook] = useState<Ebook | null>(null);
  const ebookRef = useRef<HTMLDivElement>(null);

  const handleStartGeneration = async () => {
    if (!input.topic || !input.author) {
      alert('Mohon isi Topik dan Nama Penulis.');
      return;
    }

    setStep('generating');
    setGeneratingStatus('Merancang Struktur eBook (Daftar Isi)...');
    setProgress(5);

    try {
      const toc = await generateTableOfContents(input);
      if (toc.length === 0) throw new Error('Gagal membuat Daftar Isi');

      const chapters: EbookChapter[] = [];
      const totalSteps = toc.length;

      for (let i = 0; i < toc.length; i++) {
        const title = toc[i];
        setGeneratingStatus(`Menulis Bab ${i + 1}: ${title}...`);
        
        const content = await generateChapterContent(
          title, 
          input, 
          chapters.map(c => c.title)
        );
        
        chapters.push({
          title,
          content,
          summary: ''
        });
        
        setProgress(Math.round(10 + ((i + 1) / totalSteps) * 90));
      }

      setEbook({
        title: input.topic,
        author: input.author,
        niche: input.topic,
        tone: input.tone,
        chapters
      });
      setStep('viewer');
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan saat pembuatan eBook. Silakan coba lagi.');
      setStep('input');
    }
  };

  const downloadPDF = () => {
    if (!ebook) return;
    
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
    });

    let y = 40;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);

    // Cover Page
    doc.setFont('times', 'bold');
    doc.setFontSize(30);
    const titleLines = doc.splitTextToSize(ebook.title.toUpperCase(), contentWidth);
    doc.text(titleLines, pageWidth / 2, 80, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setFont('times', 'italic');
    doc.text(`Oleh: ${ebook.author}`, pageWidth / 2, 120, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    doc.text('Dibuat dengan Aden Generator Ebook AI', pageWidth / 2, 280, { align: 'center' });

    // Chapters
    ebook.chapters.forEach((chapter, index) => {
      doc.addPage();
      doc.setFont('times', 'bold');
      doc.setFontSize(20);
      doc.text(`Bab ${index + 1}: ${chapter.title}`, margin, 30);
      
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      
      // Basic markdown to text conversion for PDF (very simplified)
      const cleanContent = chapter.content.replace(/[#*`]/g, '');
      const lines = doc.splitTextToSize(cleanContent, contentWidth);
      
      let cursorY = 45;
      lines.forEach((line: string) => {
        if (cursorY > 270) {
          doc.addPage();
          cursorY = 20;
        }
        doc.text(line, margin, cursorY);
        cursorY += 7;
      });
    });

    doc.save(`${ebook.title.replace(/\s+/g, '_')}_Ebook.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#fdfcfb] selection:bg-orange-100">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
              <BookOpen size={24} />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold tracking-tight">Aden Generator</h1>
              <p className="text-[10px] uppercase tracking-widest font-bold text-orange-600 opacity-80">Ebook AI</p>
            </div>
          </div>
          
          {step === 'viewer' && (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setStep('input')}
                className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors"
              >
                <ArrowLeft size={16} /> Buat Baru
              </button>
              <button 
                onClick={downloadPDF}
                className="bg-orange-600 text-white px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-orange-700 transition-all shadow-md active:scale-95"
              >
                <Download size={18} /> Unduh PDF
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div 
              key="input-step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-12">
                <h2 className="font-serif text-4xl md:text-5xl font-bold mb-4">Tulis eBook Anda dalam Hitungan Menit.</h2>
                <p className="text-gray-500 text-lg">Hasilkan konten berkualitas tinggi, terstruktur, dan siap jual dengan kekuatan AI.</p>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                    <Sparkles size={14} className="text-orange-500" /> Topik atau Niche eBook
                  </label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Strategi Digital Marketing 2024"
                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 transition-all text-lg"
                    value={input.topic}
                    onChange={(e) => setInput({ ...input, topic: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                      <User size={14} className="text-orange-500" /> Nama Penulis
                    </label>
                    <input 
                      type="text" 
                      placeholder="Nama Anda"
                      className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 transition-all"
                      value={input.author}
                      onChange={(e) => setInput({ ...input, author: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                      <Layers size={14} className="text-orange-500" /> Target Halaman
                    </label>
                    <select 
                      className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-orange-500 transition-all appearance-none"
                      value={input.pageCount}
                      onChange={(e) => setInput({ ...input, pageCount: parseInt(e.target.value) })}
                    >
                      <option value={30}>30 Halaman</option>
                      <option value={35}>35 Halaman</option>
                      <option value={40}>40 Halaman</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                    <TypeIcon size={14} className="text-orange-500" /> Nada & Gaya Bahasa
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {['Profesional', 'Inspiratif', 'Teknis', 'Santai', 'To-the-point'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setInput({ ...input, tone: t })}
                        className={cn(
                          "px-4 py-3 rounded-xl text-sm font-medium transition-all border",
                          input.tone === t 
                            ? "bg-orange-50 border-orange-200 text-orange-700 shadow-sm" 
                            : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleStartGeneration}
                  className="w-full bg-orange-600 text-white py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-orange-700 transition-all shadow-lg shadow-orange-200 active:scale-[0.98] mt-4"
                >
                  <PenTool size={22} /> Mulai Generate eBook
                </button>
              </div>
            </motion.div>
          )}

          {step === 'generating' && (
            <motion.div 
              key="generating-step"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-xl mx-auto text-center py-20"
            >
              <div className="relative w-32 h-32 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-orange-100 rounded-full"></div>
                <motion.div 
                  className="absolute inset-0 border-4 border-orange-600 rounded-full border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                ></motion.div>
                <div className="absolute inset-0 flex items-center justify-center text-orange-600 font-bold text-xl">
                  {progress}%
                </div>
              </div>
              
              <h3 className="text-2xl font-bold mb-2">Sedang Menulis Karya Anda...</h3>
              <p className="text-gray-500 mb-8">{generatingStatus}</p>
              
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-orange-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
              
              <div className="mt-12 grid grid-cols-1 gap-4 text-left max-w-sm mx-auto">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckCircle2 size={18} className={progress > 5 ? "text-green-500" : "text-gray-300"} />
                  Struktur & Daftar Isi
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckCircle2 size={18} className={progress > 30 ? "text-green-500" : "text-gray-300"} />
                  Pengembangan Konten Bab
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckCircle2 size={18} className={progress > 70 ? "text-green-500" : "text-gray-300"} />
                  Optimasi Gaya Bahasa
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <CheckCircle2 size={18} className={progress === 100 ? "text-green-500" : "text-gray-300"} />
                  Finalisasi Format
                </div>
              </div>
            </motion.div>
          )}

          {step === 'viewer' && ebook && (
            <motion.div 
              key="viewer-step"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-4 gap-8"
            >
              {/* Sidebar Navigation */}
              <aside className="lg:col-span-1 space-y-4">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-28">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Daftar Isi</h4>
                  <nav className="space-y-1">
                    {ebook.chapters.map((chapter, idx) => (
                      <a 
                        key={idx}
                        href={`#chapter-${idx}`}
                        className="block py-2 px-3 text-sm text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                      >
                        Bab {idx + 1}: {chapter.title}
                      </a>
                    ))}
                  </nav>
                </div>
              </aside>

              {/* Ebook Content */}
              <div className="lg:col-span-3 space-y-12">
                <div className="bg-white p-12 md:p-20 rounded-[40px] shadow-sm border border-gray-100 min-h-[1000px] ebook-content" ref={ebookRef}>
                  {/* Cover */}
                  <div className="text-center py-20 border-b border-gray-100 mb-20">
                    <p className="text-orange-600 font-bold tracking-[0.3em] uppercase text-sm mb-8">Ebook Eksklusif</p>
                    <h1 className="text-5xl md:text-7xl font-serif font-bold mb-12 leading-tight">{ebook.title}</h1>
                    <div className="w-20 h-1 bg-orange-600 mx-auto mb-12"></div>
                    <p className="text-xl text-gray-500 font-serif italic">Oleh: {ebook.author}</p>
                  </div>

                  {/* Chapters */}
                  {ebook.chapters.map((chapter, idx) => (
                    <section key={idx} id={`#chapter-${idx}`} className="mb-20 scroll-mt-28">
                      <div className="flex items-center gap-4 mb-8">
                        <span className="text-orange-600 font-mono text-lg font-bold">0{idx + 1}</span>
                        <div className="h-px flex-1 bg-gray-100"></div>
                      </div>
                      <h2 className="text-3xl font-serif font-bold mb-8">{chapter.title}</h2>
                      <div className="prose prose-lg max-w-none">
                        <ReactMarkdown>{chapter.content}</ReactMarkdown>
                      </div>
                    </section>
                  ))}
                  
                  <footer className="mt-20 pt-12 border-t border-gray-100 text-center text-gray-400 text-sm">
                    &copy; {new Date().getFullYear()} {ebook.author}. Dibuat dengan Aden Generator Ebook AI.
                  </footer>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Info */}
      {step === 'input' && (
        <footer className="max-w-6xl mx-auto px-6 py-12 border-t border-gray-100 mt-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
            <div>
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 mb-4 mx-auto md:mx-0">
                <Sparkles size={20} />
              </div>
              <h4 className="font-bold mb-2">Konten Orisinal</h4>
              <p className="text-sm text-gray-500">Setiap eBook dihasilkan secara unik berdasarkan niche dan gaya bahasa Anda.</p>
            </div>
            <div>
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 mb-4 mx-auto md:mx-0">
                <FileText size={20} />
              </div>
              <h4 className="font-bold mb-2">Siap Jual</h4>
              <p className="text-sm text-gray-500">Format yang rapi dan profesional, cocok untuk Lead Magnet atau produk digital.</p>
            </div>
            <div>
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 mb-4 mx-auto md:mx-0">
                <Printer size={20} />
              </div>
              <h4 className="font-bold mb-2">Ekspor Mudah</h4>
              <p className="text-sm text-gray-500">Unduh hasil akhir dalam format PDF berkualitas tinggi dengan satu klik.</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
