
import React, { useState } from 'react';
import { Question, Subject, EducationLevel, Difficulty } from '../types';
import { Trophy, RefreshCw, Home, XCircle, CheckCircle, Download, BrainCircuit, Loader2, FileText, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getDeepExplanation } from '../services/geminiService';

interface ResultsViewProps {
  subject: Subject;
  questions: Question[];
  answers: { questionId: number; selectedIndex: number }[];
  onRetry: () => void;
  onRetake: () => void;
  onHome: () => void;
  level: EducationLevel;
  topic: string;
  difficulty: Difficulty;
}

const ResultsView: React.FC<ResultsViewProps> = ({ subject, questions, answers, onRetry, onRetake, onHome, level, topic, difficulty }) => {
  const [deepThinkingId, setDeepThinkingId] = useState<number | null>(null);
  const [deepExplanation, setDeepExplanation] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);

  const calculateScore = () => {
    let correct = 0;
    answers.forEach(ans => {
      const question = questions.find(q => q.id === ans.questionId);
      if (question && question.correctAnswerIndex === ans.selectedIndex) {
        correct++;
      }
    });
    return correct;
  };

  const score = calculateScore();
  const total = questions.length;
  const percentage = Math.round((score / total) * 100);

  let message = "Keep practicing!";
  let color = "text-red-500";
  
  if (percentage >= 80) {
    message = "Excellent Job!";
    color = "text-green-600";
  } else if (percentage >= 50) {
    message = "Good Effort!";
    color = "text-yellow-600";
  }

  const handleDeepExplain = async (q: Question) => {
      if (isThinking) return;
      setDeepThinkingId(q.id);
      setIsThinking(true);
      setDeepExplanation(null);

      const correctAnswer = q.options[q.correctAnswerIndex];
      const explanation = await getDeepExplanation(subject, q.text, correctAnswer);
      
      setDeepExplanation(explanation);
      setIsThinking(false);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    // --- Header Section ---
    doc.setFillColor(240, 253, 244); // Light green background for header
    doc.rect(0, 0, 210, 40, 'F');

    doc.setFontSize(22);
    doc.setTextColor(22, 163, 74); // Green-600
    doc.setFont("helvetica", "bold");
    doc.text("ZOT Dynamic Quizzes", 14, 20);
    doc.setFontSize(14);
    doc.setTextColor(60, 60, 60);
    doc.setFont("helvetica", "normal");
    doc.text("Performance Report", 14, 28);

    // --- Meta Info Box ---
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    doc.line(14, 45, 196, 45);

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    
    // Left Column
    doc.setFont("helvetica", "bold");
    doc.text("Student Level:", 14, 52);
    doc.setFont("helvetica", "normal");
    doc.text(level, 45, 52);

    doc.setFont("helvetica", "bold");
    doc.text("Subject:", 14, 58);
    doc.setFont("helvetica", "normal");
    doc.text(subject, 45, 58);

    doc.setFont("helvetica", "bold");
    doc.text("Topic:", 14, 64);
    doc.setFont("helvetica", "normal");
    // Handle long topic names
    if (topic.length > 40) {
        doc.setFontSize(9);
        doc.text(topic, 45, 64);
        doc.setFontSize(10);
    } else {
        doc.text(topic, 45, 64);
    }

    // Right Column
    doc.setFont("helvetica", "bold");
    doc.text("Date:", 120, 52);
    doc.setFont("helvetica", "normal");
    doc.text(`${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 145, 52);

    doc.setFont("helvetica", "bold");
    doc.text("Quiz Level:", 120, 58);
    doc.setFont("helvetica", "normal");
    doc.text(difficulty, 145, 58);

    doc.setFont("helvetica", "bold");
    doc.text("Score:", 120, 64);
    doc.setTextColor(percentage >= 50 ? 0 : 200, percentage >= 50 ? 128 : 0, 0); // Green if pass, Red if fail
    doc.text(`${score} / ${total}  (${percentage}%)`, 145, 64);

    doc.setTextColor(80, 80, 80); // Reset text color
    doc.line(14, 70, 196, 70);

    const tableRows = questions.map((q, index) => {
      const userAnswer = answers.find(a => a.questionId === q.id);
      const selectedIdx = userAnswer?.selectedIndex ?? -1;
      const isCorrect = selectedIdx === q.correctAnswerIndex;
      
      const userAnsText = selectedIdx === -1 
          ? "(No Answer)" 
          : `${String.fromCharCode(65 + selectedIdx)}. ${q.options[selectedIdx]}`;
      
      const correctAnsText = `${String.fromCharCode(65 + q.correctAnswerIndex)}. ${q.options[q.correctAnswerIndex]}`;

      return [
        index + 1,
        q.text,
        userAnsText,
        correctAnsText,
        isCorrect ? "Correct" : "Wrong"
      ];
    });

    // Resolve autoTable function
    // @ts-ignore
    const autoTableFn = (autoTable && autoTable.default) ? autoTable.default : autoTable;

    const tableOptions = {
      startY: 75,
      head: [['#', 'Question', 'Your Answer', 'Correct Answer', 'Status']],
      body: tableRows,
      styles: { fontSize: 9, cellPadding: 4, valign: 'middle', overflow: 'linebreak' },
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 75 }, // Question text
        2: { cellWidth: 40 },
        3: { cellWidth: 40 },
        4: { cellWidth: 20, fontStyle: 'bold', halign: 'center' }
      },
      didParseCell: (data: any) => {
        // Status Color Logic
        if (data.section === 'body' && data.column.index === 4) {
            const status = data.cell.raw;
            if (status === "Correct") {
                data.cell.styles.textColor = [0, 128, 0];
            } else {
                data.cell.styles.textColor = [200, 0, 0];
            }
        }
      }
    };

    if (typeof autoTableFn === 'function') {
        autoTableFn(doc, tableOptions);
    } else if ((doc as any).autoTable) {
        (doc as any).autoTable(tableOptions);
    }

    // Add Explanations Section
    // @ts-ignore
    let finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 150;
    
    // Add spacing
    finalY += 15;
    
    // check if we need a new page
    if (finalY > 250) {
        doc.addPage();
        finalY = 20;
    }

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text("Detailed Explanations", 14, finalY);
    
    let yPos = finalY + 10;
    
    questions.forEach((q, idx) => {
        // Safe check for page break
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(50, 50, 50);
        doc.text(`Q${idx + 1} (${q.correctAnswerIndex === answers.find(a => a.questionId === q.id)?.selectedIndex ? 'Correct' : 'Incorrect'})`, 14, yPos);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        
        const splitExplanation = doc.splitTextToSize(q.explanation, 170);
        doc.text(splitExplanation, 25, yPos + 5);
        
        yPos += 10 + (splitExplanation.length * 5);
    });

    const safeFilename = `ZOT_Report_${subject}_${topic.substring(0, 10).replace(/[^a-z0-9]/gi, '_')}.pdf`;
    doc.save(safeFilename);
  };

  // Helper for rendering math superscripts (e.g. 2^3 -> 2³) and subscripts (H_2O -> H₂O)
  const formatText = (text: string) => {
    if (!text) return "";
    const parts = text.split(/([_^](?:\([^)]+\)|\{[^}]+\}|-?\d+|[a-zA-Z0-9]+))/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('^')) {
        let content = part.substring(1);
        if ((content.startsWith('(') && content.endsWith(')')) || 
            (content.startsWith('{') && content.endsWith('}'))) {
          content = content.substring(1, content.length - 1);
        }
        return <sup key={index} className="text-xs align-super font-semibold">{content}</sup>;
      }
      if (part.startsWith('_')) {
        let content = part.substring(1);
        if ((content.startsWith('(') && content.endsWith(')')) || 
            (content.startsWith('{') && content.endsWith('}'))) {
          content = content.substring(1, content.length - 1);
        }
        return <sub key={index} className="text-xs align-sub font-semibold">{content}</sub>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="max-w-3xl mx-auto text-center animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-6">
          <Trophy className="w-10 h-10 text-yellow-600 dark:text-yellow-500" />
        </div>
        
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{message}</h2>
        <div className="flex flex-wrap justify-center gap-2 mb-6">
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">{level}</span>
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">{topic}</span>
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">{difficulty}</span>
        </div>
        
        <div className="text-6xl font-bold text-gray-900 dark:text-white mb-2">
          {score}<span className="text-2xl text-gray-400 dark:text-gray-500 font-medium">/{total}</span>
        </div>
        <p className={`text-lg font-medium ${color} mb-8`}>{percentage}% Score</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 dark:bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-900 dark:hover:bg-gray-600 transition-colors shadow-lg hover:shadow-xl"
            aria-label="Download performance report as PDF"
          >
            <Download className="w-4 h-4" />
            Download Report (PDF)
          </button>
          
          <button
            onClick={onRetake}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors shadow-lg hover:shadow-xl"
            aria-label="Retake the same quiz"
          >
            <RotateCcw className="w-4 h-4" />
            Retry Quiz
          </button>

          <button
            onClick={onRetry}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
            aria-label="Try another quiz with same settings"
          >
            <RefreshCw className="w-4 h-4" />
            Try Another Quiz
          </button>
          
          <button
            onClick={onHome}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            aria-label="Return to subject selection"
          >
            <Home className="w-4 h-4" />
            Subjects
          </button>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 text-left">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Review Answers</h3>
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const userAnswer = answers.find(a => a.questionId === q.id);
            const userIndex = userAnswer?.selectedIndex ?? -1;
            const isCorrect = userIndex === q.correctAnswerIndex;
            const isSkipped = userIndex === -1;
            const isThinkingAboutThis = deepThinkingId === q.id;
            
            return (
              <div key={q.id} className={`p-4 rounded-lg border ${isCorrect ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/20' : 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/20'}`}>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {isCorrect ? 
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" /> : 
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    }
                  </div>
                  <div className="w-full">
                    {/* Image Preview in Results */}
                    {q.imageUrl && (
                        <div className="mb-3 w-full max-w-xs rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                             <img src={q.imageUrl} alt="Question Diagram" className="w-full h-auto object-cover" />
                             <div className="px-2 py-1 bg-gray-50 dark:bg-gray-900 text-[10px] text-gray-500 text-center uppercase tracking-wide">Diagram</div>
                        </div>
                    )}

                    <div className="flex justify-between items-start">
                        <p className="text-gray-900 dark:text-gray-100 font-medium mb-2">{idx + 1}. {formatText(q.text)}</p>
                    </div>
                    <div className="text-sm space-y-1">
                       <p className={isCorrect ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                         <span className="font-semibold">Your Answer:</span> {isSkipped ? "Skipped (Time out)" : formatText(q.options[userIndex])}
                       </p>
                       {!isCorrect && (
                         <p className="text-green-700 dark:text-green-400">
                           <span className="font-semibold">Correct Answer:</span> {formatText(q.options[q.correctAnswerIndex])}
                         </p>
                       )}
                       <p className="text-gray-600 dark:text-gray-400 mt-2 italic text-xs border-t border-gray-200/50 dark:border-gray-700/50 pt-2">
                         {formatText(q.explanation)}
                       </p>
                       
                       {/* Feature: Thinking Mode Trigger */}
                       {!isCorrect && !isThinkingAboutThis && (
                           <button 
                            onClick={() => handleDeepExplain(q)}
                            className="mt-2 inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 hover:border-blue-300 transition-all shadow-sm"
                            aria-label="Get a deep explanation for this question from the Virtual Tutor"
                           >
                               <BrainCircuit className="w-3 h-3 mr-2" />
                               Deep Explain with Virtual Tutor
                           </button>
                       )}

                       {/* Thinking Mode Output */}
                       {isThinkingAboutThis && (
                           <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-800 text-xs">
                               {isThinking ? (
                                   <div className="flex items-center text-blue-600 dark:text-blue-400">
                                       <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                       Thinking deeply about this concept...
                                   </div>
                               ) : (
                                   <div className="text-gray-800 dark:text-gray-200 whitespace-pre-line">
                                       <div className="font-bold text-blue-800 dark:text-blue-400 mb-1 flex items-center">
                                           <BrainCircuit className="w-3 h-3 mr-1" />
                                           Deep Explanation:
                                       </div>
                                       {formatText(deepExplanation || "")}
                                   </div>
                               )}
                           </div>
                       )}

                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ResultsView;
