import React, { useState, useEffect } from 'react';
import { Question, Subject, EducationLevel, Difficulty } from '../types';
import { FileText, CheckCircle, Eye, EyeOff, Download, Printer, ArrowLeft, Edit3, Sparkles, School, User, Building2, Users, X, Save } from 'lucide-react';
import { jsPDF } from "jspdf";

interface TeacherPreviewProps {
  subject: Subject;
  questions: Question[];
  level: EducationLevel;
  topic: string;
  difficulty: Difficulty;
  onBack: () => void;
  onHome: () => void;
  teacherName?: string;
  schoolName?: string;
  department?: string;
  className?: string;
}

const TeacherPreview: React.FC<TeacherPreviewProps> = ({ 
  subject, 
  questions, 
  level, 
  topic, 
  difficulty,
  onBack,
  onHome,
  teacherName,
  schoolName,
  department,
  className
}) => {
  const [showAnswers, setShowAnswers] = useState(true);
  
  // Local state for header details to allow editing directly in preview
  const [lSchoolName, setLSchoolName] = useState(schoolName || '');
  const [lTeacherName, setLTeacherName] = useState(teacherName || '');
  const [lDepartment, setLDepartment] = useState(department || '');
  const [lClassName, setLClassName] = useState(className || '');
  
  const [isEditingHeader, setIsEditingHeader] = useState(false);

  // Sync with props if they change externally
  useEffect(() => {
      if(schoolName !== undefined) setLSchoolName(schoolName);
      if(teacherName !== undefined) setLTeacherName(teacherName);
      if(department !== undefined) setLDepartment(department);
      if(className !== undefined) setLClassName(className);
  }, [schoolName, teacherName, department, className]);

  // Helper to add Branding to PDF Pages
  const addBranding = (doc: jsPDF, pageWidth: number, pageHeight: number) => {
      const pageCount = doc.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          
          // HEADER: POWERED BY
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.setFont("helvetica", "bold");
          doc.text("POWERED BY: DIGITAL MASTERY WORKS", pageWidth / 2, 10, { align: 'center' });

          // FOOTER: FROM ZOT
          doc.text("FROM: ZEDDY ONLINE TUITIONS", pageWidth / 2, pageHeight - 10, { align: 'center' });
          
          // WATERMARK
          doc.saveGraphicsState();
          doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
          doc.setTextColor(200, 200, 200);
          doc.setFontSize(60);
          doc.text("ZOT DYNAMIC QUIZZES", pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
          doc.restoreGraphicsState();
      }
  };

  // Helper to generate PDF
  const generatePDF = (type: 'STUDENT' | 'TEACHER') => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const maxLineWidth = pageWidth - (margin * 2);
    let yPos = 25; // Start lower due to branding header

    // --- CUSTOM HEADER (Uses Local State) ---
    if (lSchoolName) {
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text(lSchoolName.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
        yPos += 8;
    }

    if (lDepartment) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80);
        doc.text(lDepartment.toUpperCase(), pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;
    } else if (lSchoolName) {
        yPos += 5;
    }

    // --- EXAM TITLE ---
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(type === 'STUDENT' ? "EXAMINATION PAPER" : "TEACHER MARKING KEY", pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 8;
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`${subject} - ${level}`, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 6;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Topic: ${topic} | Difficulty: ${difficulty}`, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 12;

    // --- DETAILS BLOCK (Teacher/Class/Date) ---
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos); // Top line
    yPos += 6;

    // Left Column
    if (lTeacherName) doc.text(`Teacher: ${lTeacherName}`, margin, yPos);
    if (lClassName) doc.text(`Class: ${lClassName}`, pageWidth - margin - 40, yPos);
    
    // If no teacher/class provided, standard student fields
    if (!lTeacherName && !lClassName && type === 'STUDENT') {
       doc.text("Name: __________________________________", margin, yPos);
       doc.text("Date: __________________", margin + 120, yPos);
    } else if (type === 'STUDENT') {
       // If teacher/class provided, add student name field on next line
       yPos += 6;
       doc.text("Name: __________________________________", margin, yPos);
       doc.text("Date: __________________", margin + 120, yPos);
    } else {
       // Teacher Key - maybe just date
       if (!lClassName) doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin - 50, yPos);
       else {
           yPos += 6;
           doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, margin, yPos);
       }
    }

    // Score Field
    if (type === 'STUDENT') {
        yPos += 6;
        doc.text("Score: ___________ / " + questions.length, margin, yPos);
    }

    yPos += 4;
    doc.line(margin, yPos, pageWidth - margin, yPos); // Bottom line
    yPos += 15;

    // --- QUESTIONS LOOP ---
    doc.setTextColor(0);
    
    questions.forEach((q, index) => {
        // Page Break Check
        if (yPos > 260) {
            doc.addPage();
            yPos = 30; // Start lower on new pages
        }

        // Question Number & Text
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        const questionPrefix = `${index + 1}. `;
        const questionTextLines = doc.splitTextToSize(q.text, maxLineWidth - 10);
        
        doc.text(questionPrefix, margin, yPos);
        doc.text(questionTextLines, margin + 10, yPos);
        
        yPos += (questionTextLines.length * 6) + 4;

        // Options
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        q.options.forEach((opt, optIndex) => {
            // Check page break inside options
            if (yPos > 280) {
                doc.addPage();
                yPos = 30;
            }

            const letter = String.fromCharCode(65 + optIndex);
            const isCorrect = optIndex === q.correctAnswerIndex;
            
            // Logic for Teacher Key vs Student Paper
            if (type === 'TEACHER' && isCorrect) {
                doc.setFont("helvetica", "bold");
                doc.setTextColor(0, 128, 0); // Green for correct
                doc.text(`${letter}. ${opt} (Correct)`, margin + 15, yPos);
                doc.setTextColor(0); // Reset
                doc.setFont("helvetica", "normal");
            } else {
                doc.text(`${letter}. ${opt}`, margin + 15, yPos);
            }
            
            yPos += 6;
        });

        // Explanation (Only for Teacher)
        if (type === 'TEACHER') {
            yPos += 2;
            doc.setFont("helvetica", "italic");
            doc.setTextColor(80);
            doc.setFontSize(9);
            const explanationPrefix = "Explanation: ";
            const explanationLines = doc.splitTextToSize(q.explanation, maxLineWidth - 15);
            
            doc.text(explanationPrefix, margin + 15, yPos);
            doc.text(explanationLines, margin + 35, yPos); // Indent explanation
            doc.setTextColor(0);
            
            yPos += (explanationLines.length * 5) + 2;
        }

        yPos += 8; // Space between questions
    });

    // Add Footer Page Numbers
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    // APPLY BRANDING (Watermark, Header, Footer)
    addBranding(doc, pageWidth, pageHeight);

    doc.save(`ZOT_Quiz_${type}_${subject}.pdf`);
  };

  // Helper to format text with superscripts (basic display for screen)
  const formatText = (text: string) => {
    if (!text) return "";
    const parts = text.split(/([_^](?:\([^)]+\)|\{[^}]+\}|-?\d+|[a-zA-Z0-9]+))/g);
    return parts.map((part, index) => {
      if (part.startsWith('^')) return <sup key={index} className="text-xs">{part.substring(1).replace(/[\(\)\{\}]/g, '')}</sup>;
      if (part.startsWith('_')) return <sub key={index} className="text-xs">{part.substring(1).replace(/[\(\)\{\}]/g, '')}</sub>;
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-20">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <button 
            onClick={onBack}
            className="flex items-center text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
        >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Edit Configuration
        </button>

        <div className="flex gap-3">
            <button
                onClick={() => generatePDF('STUDENT')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-colors shadow-sm"
            >
                <Printer className="w-4 h-4" />
                Student Paper
            </button>
            <button
                onClick={() => generatePDF('TEACHER')}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-md"
            >
                <Download className="w-4 h-4" />
                Teacher Key
            </button>
        </div>
      </div>

      {/* Main Preview Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-indigo-100 dark:border-gray-700 overflow-hidden">
        
        {/* Title Section */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-8 text-center border-b border-indigo-100 dark:border-gray-700 relative group">
            
            <div className="inline-flex items-center justify-center p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-300 mb-3">
                <Sparkles className="w-5 h-5 mr-2" />
                <span className="font-bold uppercase tracking-wide text-xs">Teacher Mode Preview</span>
            </div>
            
            {/* Edit Toggle Button */}
            <button 
                onClick={() => setIsEditingHeader(!isEditingHeader)}
                className="absolute top-4 right-4 p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-full transition-all opacity-60 group-hover:opacity-100"
                title="Edit Header Details"
            >
                {isEditingHeader ? <X className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
            </button>

            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{subject} Quiz</h1>
            <p className="text-gray-600 dark:text-gray-400 font-medium">{topic}</p>
            <div className="flex justify-center gap-4 mt-4 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                <span>{level}</span>
                <span>&bull;</span>
                <span>{difficulty}</span>
                <span>&bull;</span>
                <span>{questions.length} Questions</span>
            </div>
            
            {/* EDIT FORM OR DISPLAY */}
            {isEditingHeader ? (
                <div className="mt-6 bg-white dark:bg-gray-800 p-4 rounded-xl border border-indigo-200 dark:border-indigo-700 shadow-inner animate-fade-in max-w-2xl mx-auto text-left">
                    <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-3">Customize PDF Header</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">School Name</label>
                            <div className="relative">
                                <School className="w-3 h-3 absolute left-2.5 top-2.5 text-gray-400" />
                                <input 
                                    type="text" 
                                    value={lSchoolName} 
                                    onChange={(e) => setLSchoolName(e.target.value)}
                                    className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    placeholder="School Name"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Teacher Name</label>
                            <div className="relative">
                                <User className="w-3 h-3 absolute left-2.5 top-2.5 text-gray-400" />
                                <input 
                                    type="text" 
                                    value={lTeacherName} 
                                    onChange={(e) => setLTeacherName(e.target.value)}
                                    className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    placeholder="Teacher Name"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Department</label>
                            <div className="relative">
                                <Building2 className="w-3 h-3 absolute left-2.5 top-2.5 text-gray-400" />
                                <input 
                                    type="text" 
                                    value={lDepartment} 
                                    onChange={(e) => setLDepartment(e.target.value)}
                                    className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    placeholder="Department"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Class / Grade</label>
                            <div className="relative">
                                <Users className="w-3 h-3 absolute left-2.5 top-2.5 text-gray-400" />
                                <input 
                                    type="text" 
                                    value={lClassName} 
                                    onChange={(e) => setLClassName(e.target.value)}
                                    className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    placeholder="Class Name"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="mt-3 text-center">
                        <button 
                            onClick={() => setIsEditingHeader(false)}
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-md transition-colors flex items-center justify-center mx-auto gap-1"
                        >
                            <Save className="w-3 h-3" />
                            Done
                        </button>
                    </div>
                </div>
            ) : (
                /* Display Teacher Info if present */
                (lSchoolName || lTeacherName || lClassName || lDepartment) && (
                    <div className="mt-4 pt-4 border-t border-indigo-100 dark:border-indigo-800/50 flex flex-wrap justify-center gap-6 text-xs text-indigo-800 dark:text-indigo-200 font-medium">
                        {lSchoolName && <span className="flex items-center gap-1"><School className="w-3 h-3" /> {lSchoolName}</span>}
                        {lDepartment && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {lDepartment}</span>}
                        {lTeacherName && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {lTeacherName}</span>}
                        {lClassName && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {lClassName}</span>}
                    </div>
                )
            )}
        </div>

        {/* Toolbar */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase">Questions Preview</span>
            <button 
                onClick={() => setShowAnswers(!showAnswers)}
                className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-colors"
            >
                {showAnswers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showAnswers ? "Hide Answers" : "Show Answers"}
            </button>
        </div>

        {/* Questions List */}
        <div className="p-8 space-y-8">
            {questions.map((q, idx) => (
                <div key={q.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-8 last:pb-0">
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm mt-0.5">
                            {idx + 1}
                        </div>
                        <div className="flex-grow">
                            
                            {/* Generated Image Display */}
                            {q.imageUrl && (
                                <div className="mb-4 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 w-fit">
                                    <img 
                                        src={q.imageUrl} 
                                        alt={`Illustration for question ${idx + 1}`} 
                                        className="max-h-48 max-w-full object-contain rounded"
                                    />
                                    <div className="text-[10px] text-center text-gray-400 mt-1 uppercase tracking-wider">Generated Diagram</div>
                                </div>
                            )}

                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4 leading-relaxed">
                                {formatText(q.text)}
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {q.options.map((opt, optIdx) => {
                                    const isCorrect = optIdx === q.correctAnswerIndex;
                                    let style = "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300";
                                    
                                    if (showAnswers && isCorrect) {
                                        style = "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 font-medium";
                                    }

                                    return (
                                        <div key={optIdx} className={`flex items-center p-3 rounded-lg border ${style} text-sm`}>
                                            <span className="w-6 font-bold opacity-60">{String.fromCharCode(65 + optIdx)}.</span>
                                            <span>{formatText(opt)}</span>
                                            {showAnswers && isCorrect && <CheckCircle className="w-4 h-4 ml-auto text-green-600" />}
                                        </div>
                                    );
                                })}
                            </div>

                            {showAnswers && (
                                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Explanation</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                                        {formatText(q.explanation)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>
      
      <div className="mt-8 text-center">
          <button 
            onClick={onHome}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 text-sm font-medium underline"
          >
              Discard & Return Home
          </button>
      </div>
    </div>
  );
};

export default TeacherPreview;