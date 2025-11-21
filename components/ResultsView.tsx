
import React, { useState } from 'react';
import { Question, Subject } from '../types';
import { Trophy, RefreshCw, Home, XCircle, CheckCircle, Download, BrainCircuit, Loader2 } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getDeepExplanation } from '../services/geminiService';

interface ResultsViewProps {
  subject: Subject;
  questions: Question[];
  answers: { questionId: number; selectedIndex: number }[];
  onRetry: () => void;
  onHome: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ subject, questions, answers, onRetry, onHome }) => {
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

    // Title
    doc.setFontSize(20);
    doc.setTextColor(22, 163, 74); // Green-600
    doc.text("ZOT Dynamic Quizzes - Performance Report", 14, 22);

    // Meta Info
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Subject: ${subject}`, 14, 32);
    doc.text(`Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 14, 38);
    doc.text(`Score: ${score} / ${total} (${percentage}%)`, 14, 44);

    const tableRows = questions.map((q, index) => {
      const userAnswer = answers.find(a => a.questionId === q.id);
      const selectedIdx = userAnswer?.selectedIndex ?? -1;
      const isCorrect = selectedIdx === q.correctAnswerIndex;
      
      // Format the text for user answer and correct answer
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

    // Resolve autoTable function (handles ESM module { default: fn } vs fn)
    // @ts-ignore
    const autoTableFn = (autoTable && autoTable.default) ? autoTable.default : autoTable;

    const tableOptions = {
      startY: 55,
      head: [['#', 'Question', 'Your Answer', 'Correct Answer', 'Status']],
      body: tableRows,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [22, 163, 74], textColor: 255 }, // Green
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 70 },
        2: { cellWidth: 40 },
        3: { cellWidth: 40 },
        4: { cellWidth: 20, fontStyle: 'bold' }
      },
      didParseCell: (data: any) => {
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
    } else {
        console.error("jsPDF-AutoTable plugin not found");
    }
    
    // Add Explanations Section
    // Check final Y position after table
    // @ts-ignore
    let finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 150;
    
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Detailed Explanations", 14, 20);
    
    let yPos = 30;
    questions.forEach((q, idx) => {
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`Q${idx + 1}. Correct: ${String.fromCharCode(65 + q.correctAnswerIndex)}`, 14, yPos);
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        
        const splitExplanation = doc.splitTextToSize(q.explanation, 180);
        doc.text(splitExplanation, 14, yPos + 6);
        
        yPos += 10 + (splitExplanation.length * 5);
    });

    doc.save(`ZOT_Quiz_Report_${subject}_${Date.now()}.pdf`);
  };

  return (
    <div className="max-w-3xl mx-auto text-center animate-fade-in">
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-6">
          <Trophy className="w-10 h-10 text-yellow-600" />
        </div>
        
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{message}</h2>
        <p className="text-gray-500 mb-6">You completed the {subject} ECZ Prep Quiz</p>
        
        <div className="text-6xl font-bold text-gray-900 mb-2">
          {score}<span className="text-2xl text-gray-400 font-medium">/{total}</span>
        </div>
        <p className={`text-lg font-medium ${color} mb-8`}>{percentage}% Score</p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition-colors shadow-lg hover:shadow-xl"
          >
            <Download className="w-4 h-4" />
            Download Report (PDF)
          </button>
          <button
            onClick={onRetry}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Another Quiz
          </button>
          <button
            onClick={onHome}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            <Home className="w-4 h-4" />
            Subjects
          </button>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="bg-white rounded-2xl shadow-sm p-8 text-left">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Review Answers</h3>
        <div className="space-y-6">
          {questions.map((q, idx) => {
            const userAnswer = answers.find(a => a.questionId === q.id);
            const userIndex = userAnswer?.selectedIndex ?? -1;
            const isCorrect = userIndex === q.correctAnswerIndex;
            const isSkipped = userIndex === -1;
            const isThinkingAboutThis = deepThinkingId === q.id;
            
            return (
              <div key={q.id} className={`p-4 rounded-lg border ${isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {isCorrect ? 
                      <CheckCircle className="w-5 h-5 text-green-600" /> : 
                      <XCircle className="w-5 h-5 text-red-600" />
                    }
                  </div>
                  <div className="w-full">
                    <div className="flex justify-between items-start">
                        <p className="text-gray-900 font-medium mb-2">{idx + 1}. {q.text}</p>
                    </div>
                    <div className="text-sm space-y-1">
                       <p className={isCorrect ? "text-green-700" : "text-red-600"}>
                         <span className="font-semibold">Your Answer:</span> {isSkipped ? "Skipped (Time out)" : q.options[userIndex]}
                       </p>
                       {!isCorrect && (
                         <p className="text-green-700">
                           <span className="font-semibold">Correct Answer:</span> {q.options[q.correctAnswerIndex]}
                         </p>
                       )}
                       <p className="text-gray-600 mt-2 italic text-xs border-t border-gray-200/50 pt-2">
                         {q.explanation}
                       </p>
                       
                       {/* Feature: Thinking Mode Trigger - Styled as a clear button */}
                       {!isCorrect && !isThinkingAboutThis && (
                           <button 
                            onClick={() => handleDeepExplain(q)}
                            className="mt-2 inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm"
                           >
                               <BrainCircuit className="w-3 h-3 mr-2" />
                               Deep Explain with AI Tutor
                           </button>
                       )}

                       {/* Thinking Mode Output */}
                       {isThinkingAboutThis && (
                           <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-100 text-xs">
                               {isThinking ? (
                                   <div className="flex items-center text-blue-600">
                                       <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                       Thinking deeply about this concept...
                                   </div>
                               ) : (
                                   <div className="text-gray-800 whitespace-pre-line">
                                       <div className="font-bold text-blue-800 mb-1 flex items-center">
                                           <BrainCircuit className="w-3 h-3 mr-1" />
                                           Deep Explanation:
                                       </div>
                                       {deepExplanation}
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
