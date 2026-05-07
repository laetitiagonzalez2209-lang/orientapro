/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { 
  FileText, Hammer, Users, Truck, Laptop, ShoppingBag, Utensils, 
  Factory, HardHat, Stethoscope, Sprout, Megaphone, Shield, 
  GraduationCap, Theater, CheckCircle2, ChevronRight, RotateCcw, 
  Info, AlertCircle, LayoutDashboard, Target, Zap, Copy, Check,
  BrainCircuit, FileSearch, Sparkles, GraduationCap as School, 
  ClipboardCheck, Lightbulb, UserRound, ArrowRightLeft, Upload,
  FileDown, X, File as FileIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { JOB_FAMILIES } from './constants';
import * as mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker using cdnjs for stable version 3.x loading
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface AnalysisResult {
  softSkills: string[];
  transferableSkills: string[];
  reconversionIdeas: {
    familyId: string;
    reason: string;
    suitability: number;
    specificJobs: string[];
  }[];
  trainingIdeas: {
    title: string;
    description: string;
    reasonForChoice: string;
  }[];
  constraintsIdentified: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function App() {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'results'>('input');
  const [isCopied, setIsCopied] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const [currentChatMessage, setCurrentChatMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setUploadedFileName(file.name);
    setError(null);

    try {
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        try {
          const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ');
            fullText += pageText + '\n';
          }
          setInputText(fullText.trim());
        } catch (pdfErr) {
          console.error("PDF.js Error:", pdfErr);
          throw new Error("Erreur technique lors du traitement du PDF. Assurez-vous que le fichier n'est pas protégé par mot de passe.");
        }
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setInputText(result.value.trim());
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const text = await file.text();
        setInputText(text.trim());
      } else {
        setError("Format de fichier non supporté. Veuillez utiliser PDF, Word (.docx) ou Texte (.txt).");
        setUploadedFileName(null);
      }
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la lecture du document. Vérifiez qu'il n'est pas corrompu ou protégé.");
      setUploadedFileName(null);
    } finally {
      setIsAnalyzing(false);
      // Reset input value so same file can be uploaded again if needed
      if (e.target) e.target.value = '';
    }
  };

  const removeFile = () => {
    setUploadedFileName(null);
    setInputText('');
  };

  const runAnalysis = async () => {
    if (!inputText.trim()) return;

    // Safety limit to avoid token limit issues (30k chars is plenty for a resume/notes)
    const safeInput = inputText.slice(0, 30000);

    setIsAnalyzing(true);
    setError(null);

    try {
      const prompt = `En tant qu'expert en insertion professionnelle et conseiller d'orientation, analyse le texte suivant (notes, CV ou profil) pour aider une personne dans sa reconversion de manière approfondie.
      
      Texte source : "${safeInput}"

      Génère un bilan EXTRÊMEMENT détaillé contenant :
      1. Les Soft Skills (savoir-être) - identifie au moins 5 points clés.
      2. Les Compétences Transférables (savoir-faire utilisables ailleurs) - identifie au moins 5 points clés.
      3. Des idées de reconversion parmi les familles suivantes : ${JOB_FAMILIES.map(f => f.name).join(', ')}.
         Pour chaque famille, fournis :
         - La raison précise du choix basée sur le profil (au moins 2-3 phrases).
         - Une liste de 4 à 6 MÉTIERS PRÉCIS au sein de cette famille.
         - Un score d'affinité sur 100.
      4. Les contraintes identifiées (rythme, physique, psychologique, environnement, etc.).
      5. Un plan de formation très détaillé avec au moins 3 à 5 options de formation concrètes. 
         Pour chaque formation :
         - Un titre clair.
         - Une description détaillée des objectifs.
         - La REASON (pourquoi ce choix spécifiquement pour ce bénéficiaire).

      Réponds impérativement au format JSON avec cette structure :
      {
        "softSkills": ["skill1", "skill2"],
        "transferableSkills": ["skill1", "skill2"],
        "reconversionIdeas": [
          {
            "familyId": "id_de_la_famille", 
            "reason": "explication très détaillée", 
            "suitability": 95,
            "specificJobs": ["Métier 1", "Métier 2"]
          }
        ],
        "constraintsIdentified": ["contrainte1", "contrainte2"],
        "trainingIdeas": [
          {"title": "nom", "description": "objectif détaillé", "reasonForChoice": "justification complète"}
        ]
      }
      
      Notes pour familyId : Utilise uniquement les IDs suivants : ${JOB_FAMILIES.map(f => f.id).join(', ')}.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const result = JSON.parse(response.text || '{}') as AnalysisResult;
      setAnalysis(result);
      setStep('results');
      setChatMessages([{
        role: 'assistant',
        content: `L'analyse est terminée ! J'ai identifié des pistes prometteuses dans les familles : ${result.reconversionIdeas.slice(0,3).map(i => JOB_FAMILIES.find(f => f.id === i.familyId)?.name).join(', ')}. Que souhaiteriez-vous approfondir ?`
      }]);
    } catch (err) {
      console.error(err);
      setError("Une erreur est survenue lors de l'analyse. Veuillez réessayer.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setInputText('');
    setAnalysis(null);
    setStep('input');
    setError(null);
    setChatMessages([]);
  };

  const sendChatMessage = async () => {
    if (!currentChatMessage.trim() || !analysis || isChatting) return;

    const newUserMessage: ChatMessage = { role: 'user', content: currentChatMessage };
    setChatMessages(prev => [...prev, newUserMessage]);
    setCurrentChatMessage('');
    setIsChatting(true);

    try {
      const chatContext = `Tu es un conseiller expert en insertion. On vient de faire l'analyse de reconversion suivante pour un bénéficiaire :
      
      PROFIL:
      - Soft Skills: ${analysis.softSkills.join(', ')}
      - Compétences Transférables: ${analysis.transferableSkills.join(', ')}
      - Contraintes: ${analysis.constraintsIdentified.join(', ')}
      
      PISTES IDENTIFIÉES:
      ${analysis.reconversionIdeas.map(i => `- ${JOB_FAMILIES.find(f => f.id === i.familyId)?.name}: ${i.reason} (${i.suitability}%)`).join('\n')}
      
      FORMATIONS SUGGÉRÉES:
      ${analysis.trainingIdeas.map(t => `- ${t.title}: ${t.description} (Raison: ${t.reasonForChoice})`).join('\n')}

      Réponds aux questions du conseiller ou du bénéficiaire de manière constructive, bienveillante et pragmatique. Reste concis.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: chatContext }] },
          ...chatMessages.map(msg => ({ 
            role: msg.role === 'assistant' ? 'model' : 'user', 
            parts: [{ text: msg.content }] 
          })),
          { role: 'user', parts: [{ text: currentChatMessage }] }
        ]
      });

      const assistantContent = result.text || "Désolé, je n'ai pas pu générer de réponse.";
      setChatMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Désolé, j'ai rencontré une petite difficulté technique pour vous répondre." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const copyResults = () => {
    if (!analysis) return;
    const text = `BILAN DE PROFILAGE AI\n\n` +
      `SOFT SKILLS: ${analysis.softSkills.join(', ')}\n` +
      `COMPÉTENCES TRANSFÉRABLES: ${analysis.transferableSkills.join(', ')}\n` +
      `CONTRAINTES IDENTIFIÉES: ${analysis.constraintsIdentified.join(', ')}\n\n` +
      `IDÉES DE RECONVERSION:\n` +
      analysis.reconversionIdeas.map(r => `- ${JOB_FAMILIES.find(f => f.id === r.familyId)?.name}: ${r.reason} (${r.suitability}%)`).join('\n') +
      `\n\nFORMATIONS:\n` +
      analysis.trainingIdeas.map(t => `- ${t.title}: ${t.description}`).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const exportToExcel = () => {
    if (!analysis) return;
    let csvContent = "Catégorie;Valeur;Description / Affinité\n";
    
    analysis.softSkills.forEach(s => csvContent += `Soft Skill;"${s}";\n`);
    analysis.transferableSkills.forEach(s => csvContent += `Compétence Transférable;"${s}";\n`);
    analysis.constraintsIdentified.forEach(c => csvContent += `Contrainte;"${c}";\n`);
    analysis.reconversionIdeas.forEach(i => {
      const name = JOB_FAMILIES.find(f => f.id === i.familyId)?.name || i.familyId;
      csvContent += `Reconversion;"${name}";"${i.suitability}% - ${i.reason.replace(/"/g, '""')}"\n`;
    });
    analysis.trainingIdeas.forEach(t => csvContent += `Formation;"${t.title}";"${t.description.replace(/"/g, '""')}"\n`);

    const blob = new Blob(["\uFEFF", csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "bilan_orientapro_excel.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToWord = () => {
    if (!analysis) return;
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h1 style="color: #2c3e50;">Bilan de Reconversion Professionnelle - OrientaPro AI</h1>
          <hr/>
          <h2 style="color: #2980b9;">Soft Skills (Savoir-être)</h2>
          <ul>${analysis.softSkills.map(s => `<li>${s}</li>`).join('')}</ul>
          
          <h2 style="color: #2980b9;">Compétences Transférables</h2>
          <ul>${analysis.transferableSkills.map(s => `<li>${s}</li>`).join('')}</ul>
          
          <h2 style="color: #2980b9;">Pistes de Reconversion</h2>
          ${analysis.reconversionIdeas.map(i => {
            const name = JOB_FAMILIES.find(f => f.id === i.familyId)?.name || i.familyId;
            return `
              <div style="margin-bottom: 10px; padding: 10px; border: 1px solid #eee;">
                <strong>${name} - Affinité : ${i.suitability}%</strong><br/>
                <em>${i.reason}</em>
              </div>`;
          }).join('')}
          
          <h2 style="color: #2980b9;">Plan de Formation Suggéré</h2>
          ${analysis.trainingIdeas.map(t => `
            <div style="margin-bottom: 15px;">
              <strong>${t.title}</strong><br/>
              <span>${t.description}</span>
            </div>`).join('')}
        </body>
      </html>
    `;
    const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "bilan_orientapro_word.doc");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const printResults = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] font-sans selection:bg-almond-100 pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-almond-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-almond-200">
              <BrainCircuit size={24} fill="currentColor" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight leading-tight uppercase font-mono">OrientaPro <span className="text-almond-600 underline decoration-2">AI</span></h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold italic">Analyseur de Profil & Reconversion</p>
            </div>
          </div>
          <div className="flex items-center gap-4 print:hidden">
            {analysis && (
              <button 
                onClick={reset}
                className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
              >
                <RotateCcw size={16} />
                <span>Nouv. Analyse</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 mt-10">
        <AnimatePresence mode="wait">
          {step === 'input' && (
            <motion.div 
              key="input"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-3xl mx-auto space-y-8"
            >
              <div className="text-center space-y-4 mb-12">
                <div className="inline-block px-4 py-1.5 bg-almond-50 text-almond-700 rounded-full text-xs font-black uppercase tracking-widest mb-2">
                  Intelligence Artificielle RH
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-tight">
                  Déposer votre CV, une prise de note manuscrite ou un profil
                </h2>
                <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto">
                  pour identifier instantanément les soft skills et opportunités de reconversion.
                </p>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
                <div className="relative">
                  <textarea 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Collez ici le contenu du CV, les notes d'entretien ou le descriptif du parcours..."
                    className="w-full h-80 p-6 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-almond-100 focus:border-almond-500 font-mono text-sm leading-relaxed resize-none transition-all outline-none placeholder:text-slate-400"
                  />
                  {inputText.length > 0 && (
                    <button 
                      onClick={() => setInputText('')}
                      className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xs font-bold bg-white px-2 py-1 rounded border border-slate-200"
                    >
                      Effacer
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {uploadedFileName ? (
                    <div className="flex-1 flex items-center justify-between gap-3 px-6 py-4 bg-almond-50 border-2 border-almond-200 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg text-almond-600 shadow-sm">
                          <FileIcon size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-almond-900 line-clamp-1">{uploadedFileName}</p>
                          <p className="text-[10px] font-bold text-almond-600 uppercase tracking-widest">Document chargé</p>
                        </div>
                      </div>
                      <button 
                        onClick={removeFile}
                        className="p-2 hover:bg-white rounded-full text-almond-400 hover:text-red-500 transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-slate-200 rounded-2xl hover:border-almond-400 hover:bg-almond-50 cursor-pointer transition-all group">
                      <Upload size={20} className="text-slate-400 group-hover:text-almond-500" />
                      <span className="text-sm font-bold text-slate-500 group-hover:text-almond-600">Charger un CV ou Document (PDF, DOCX)</span>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept=".txt,.docx,.pdf" 
                        onChange={handleFileUpload} 
                      />
                    </label>
                  )}
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm font-bold">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}

                <div className="flex justify-center pt-4">
                  <button 
                    onClick={runAnalysis}
                    disabled={!inputText.trim() || isAnalyzing}
                    className={`flex items-center gap-3 px-12 py-5 rounded-2xl font-bold text-xl shadow-2xl transition-all ${
                      inputText.trim() && !isAnalyzing 
                        ? 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isAnalyzing ? (
                      <>
                        <RotateCcw className="animate-spin" size={24} />
                        Analyse en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles size={24} />
                        Commencer l'analyse
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
                {[
                  { icon: FileSearch, title: "Analyse Sémantique", desc: "Extraction des compétences cachées" },
                  { icon: ArrowRightLeft, title: "Transférabilité", desc: "Ponts entre anciens et nouveaux métiers" },
                  { icon: School, title: "Plan de Formation", desc: "Parcours de montée en compétences" }
                ].map((item, i) => (
                  <div key={i} className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm text-left group hover:border-almond-200 transition-colors">
                    <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-almond-600 mb-4 group-hover:bg-almond-50 transition-colors">
                      <item.icon size={20} />
                    </div>
                    <h3 className="font-bold text-slate-900 group-hover:text-almond-700 transition-colors">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'results' && analysis && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-10"
            >
              {/* Header Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-2 bg-slate-900 text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden group">
                  <div className="relative z-10">
                    <h2 className="text-4xl font-black mb-4 tracking-tighter">Bilan de Compétences Flash</h2>
                    <p className="text-slate-400 max-w-2xl text-lg font-medium">
                      Analyse terminée. Nous avons extrait les marqueurs clés du profil.
                    </p>
                  </div>
                  <BrainCircuit className="absolute -bottom-10 -right-10 text-almond-500 size-64 opacity-10 group-hover:rotate-12 transition-transform duration-700" />
                </div>
                
                <div className="lg:col-span-2 grid grid-cols-2 gap-4 print:hidden">
                  <button 
                    onClick={copyResults}
                    className={`h-full bg-white border border-slate-200 rounded-[32px] flex flex-col items-center justify-center gap-2 transition-all hover:shadow-xl group ${
                      isCopied ? 'border-green-500 bg-green-50' : 'hover:border-almond-400'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isCopied ? 'bg-green-600 text-white' : 'bg-almond-50 text-almond-600 group-hover:bg-almond-600 group-hover:text-white'
                    }`}>
                      {isCopied ? <Check size={20} /> : <Copy size={20} />}
                    </div>
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${isCopied ? 'text-green-700' : 'text-slate-500'}`}>
                      {isCopied ? 'Copié' : 'Presse-papier'}
                    </span>
                  </button>

                  <div className="grid grid-rows-2 gap-4">
                    <button 
                      onClick={exportToExcel}
                      className="print:hidden bg-white border border-slate-200 rounded-[20px] flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:border-green-400 group h-12"
                    >
                      <div className="p-1.5 bg-green-50 text-green-600 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-colors">
                        <FileText size={16} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Excel (.csv)</span>
                    </button>
                    <button 
                      onClick={exportToWord}
                      className="print:hidden bg-white border border-slate-200 rounded-[20px] flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:border-blue-400 group h-12"
                    >
                      <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <FileDown size={16} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Word (.doc)</span>
                    </button>
                  </div>
                  <button 
                    onClick={printResults}
                    className="print:hidden lg:col-span-4 bg-slate-100 border border-slate-200 rounded-2xl py-3 text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Target size={14} /> Télécharger le bilan complet (PDF / Impression)
                  </button>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-8">
                {/* Section Skills */}
                <div className="space-y-8">
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm border-t-8 border-almond-600">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-almond-50 text-almond-600 rounded-lg">
                        <UserRound size={20} />
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tight">Soft Skills</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.softSkills.map((s, i) => (
                        <span key={i} className="px-4 py-2 bg-slate-50 text-slate-700 text-sm font-bold border border-slate-100 rounded-xl hover:bg-almond-50 hover:border-almond-100 transition-colors">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm border-t-8 border-cyan-500">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg">
                        <ArrowRightLeft size={20} />
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tight">Compétences Transférables</h3>
                    </div>
                    <ul className="space-y-3">
                      {analysis.transferableSkills.map((s, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-600">
                          <div className="mt-1.5 w-1.5 h-1.5 bg-cyan-500 rounded-full flex-shrink-0" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm border-t-8 border-amber-500">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                        <ClipboardCheck size={20} />
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tight">Contraintes Détourées</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {analysis.constraintsIdentified.map((c, i) => (
                        <span key={i} className="px-3 py-1 bg-amber-50 text-amber-800 text-[11px] font-black uppercase tracking-wider rounded-lg border border-amber-100 italic">
                          {c}
                        </span>
                      ))}
                      {analysis.constraintsIdentified.length === 0 && <p className="text-slate-400 italic text-sm">Aucune contrainte majeure à signaler.</p>}
                    </div>
                  </div>
                </div>

                {/* Section Reconversion & Formation */}
                <div className="space-y-8">
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm border-t-8 border-green-600">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                        <Lightbulb size={20} />
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tight">Pistes de Reconversion</h3>
                    </div>
                    <div className="space-y-6">
                      {analysis.reconversionIdeas.map((idea, i) => {
                        const family = JOB_FAMILIES.find(f => f.id === idea.familyId);
                        return (
                          <div key={i} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl group hover:border-green-300 transition-colors">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-black text-slate-900 group-hover:text-green-700 transition-colors">
                                {family?.name || idea.familyId}
                              </h4>
                              <span className="text-sm font-black text-green-600">{idea.suitability}%</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed italic mb-3">
                              {idea.reason}
                            </p>
                            <div className="space-y-1.5 pt-3 border-t border-slate-100">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Métiers suggérés :</p>
                              <div className="flex flex-wrap gap-1.5">
                                {idea.specificJobs?.map((job, jIdx) => (
                                  <span key={jIdx} className="px-2 py-0.5 bg-white text-[10px] font-bold text-green-700 border border-green-100 rounded-md">
                                    {job}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm border-t-8 border-violet-600">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-violet-50 text-violet-600 rounded-lg">
                        <School size={20} />
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tight">Plan de Formation</h3>
                    </div>
                    <div className="space-y-6">
                      {analysis.trainingIdeas.map((t, i) => (
                        <div key={i} className="flex gap-4">
                          <div className="flex-shrink-0 w-10 h-10 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center font-black">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <h5 className="font-bold text-slate-900 text-sm">{t.title}</h5>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{t.description}</p>
                            <div className="mt-2 text-[10px] bg-violet-50 text-violet-700 p-2 rounded-lg border border-violet-100 italic">
                              <span className="font-bold uppercase tracking-tight mr-1">Pourquoi ce choix :</span>
                              {t.reasonForChoice}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Section */}
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-xl overflow-hidden flex flex-col h-[600px] print:hidden">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-900 text-white rounded-xl">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight">Conversation avec l'IA</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Questions sur l'analyse ?</p>
                    </div>
                  </div>
                </div>

                <div className="flex-grow overflow-y-auto mb-6 p-4 space-y-4 scrollbar-hide">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-slate-900 text-white rounded-tr-none' 
                          : 'bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isChatting && (
                    <div className="flex justify-start">
                      <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100 italic text-sm text-slate-400">
                        L'IA réfléchit...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="relative">
                  <input 
                    type="text"
                    value={currentChatMessage}
                    onChange={(e) => setCurrentChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Posez une question sur ces pistes de reconversion..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-6 pr-14 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-900 transition-all placeholder:text-slate-400"
                  />
                  <button 
                    onClick={sendChatMessage}
                    disabled={isChatting || !currentChatMessage.trim()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowRightLeft size={18} className="rotate-90" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-5xl mx-auto px-6 py-12 mt-12 border-t border-slate-200 text-center print:hidden">
        <div className="flex flex-col items-center gap-4 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5"><Shield size={12} /> Confidentialité Totale</div>
            <div className="w-1 h-1 bg-slate-300 rounded-full" />
            <div>IA Analysis Dashboard v2.1</div>
          </div>
          <p className="italic opacity-50">Aucun historique n'est conservé après la fermeture de la session.</p>
        </div>
      </footer>
    </div>
  );
}

