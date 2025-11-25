
import React, { useState, useMemo } from 'react';
import { EducationLevel, Subject, QuizHistoryItem } from '../types';
import { Trophy, Medal, Crown, Star, User, ArrowLeft, Filter, GraduationCap, BookOpen, TrendingUp } from 'lucide-react';
import { SUBJECT_TOPICS } from '../data/subjectTopics';

interface LeaderboardViewProps {
  history: QuizHistoryItem[];
  onHome: () => void;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  quizzesTaken: number;
  isUser?: boolean;
}

// Mock names for authentic Zambian context
const ZAMBIAN_NAMES = [
  "Chanda Bwalya", "Mulenga Phiri", "Thandiwe Banda", "Kondwani Tembo", 
  "Mutale Lungu", "Chilufya Mumba", "Bupe Mwape", "Mwila Sinkala", 
  "Chibwe Zulu", "Mapalo Chungu", "Natasha Sakala", "Brian Musonda",
  "Grace Katongo", "Joseph Kangwa", "Mary Nkhoma"
];

const LeaderboardView: React.FC<LeaderboardViewProps> = ({ history, onHome }) => {
  const [activeLevel, setActiveLevel] = useState<EducationLevel>(EducationLevel.SeniorSecondary);
  const [viewMode, setViewMode] = useState<'OVERALL' | 'SUBJECT'>('OVERALL');
  const [selectedSubject, setSelectedSubject] = useState<Subject | 'ALL'>('ALL');

  // Generate deterministic mock data based on level/subject seed
  const generateMockLeaderboard = (level: string, subject: string): LeaderboardEntry[] => {
    // Simple hash to make the random numbers consistent for the same view
    const seed = level.length + subject.length; 
    
    return ZAMBIAN_NAMES.map((name, index) => {
      // Create a deterministic "random" score
      const baseScore = 2000 - (index * 120); 
      const variance = ((name.length + seed + index) % 50) * 5;
      const score = Math.max(50, baseScore + variance);
      const quizzes = Math.floor(score / 80) + ((name.length % 3) + 1);

      return {
        rank: index + 1, // Will be recalculated after sort
        name,
        score,
        quizzesTaken: quizzes
      };
    }).sort((a, b) => b.score - a.score).map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  };

  // Calculate User's stats for the current view
  const userStats = useMemo(() => {
    let relevantHistory = history.filter(h => h.level === activeLevel);
    
    if (viewMode === 'SUBJECT' && selectedSubject !== 'ALL') {
      relevantHistory = relevantHistory.filter(h => h.subject === selectedSubject);
    }

    const totalScore = relevantHistory.reduce((acc, curr) => acc + (curr.score * 10), 0); // Assuming 10 pts per correct answer
    const totalQuizzes = relevantHistory.length;

    return { score: totalScore, quizzesTaken: totalQuizzes };
  }, [history, activeLevel, viewMode, selectedSubject]);

  // Merge Mock Data and User Data
  const leaderboardData = useMemo(() => {
    // 1. Get Base Mock Data
    const subjectKey = viewMode === 'SUBJECT' ? (selectedSubject as string) : 'General';
    let data = generateMockLeaderboard(activeLevel, subjectKey);

    // 2. Insert User if they have a score > 0
    if (userStats.score >= 0) { // Always show user even with 0 score for engagement
      const userEntry: LeaderboardEntry = {
        rank: 0,
        name: "You",
        score: userStats.score,
        quizzesTaken: userStats.quizzesTaken,
        isUser: true
      };
      
      data.push(userEntry);
      
      // 3. Re-sort and Re-rank
      data.sort((a, b) => b.score - a.score);
      data = data.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
    }
    
    return data.slice(0, 20); // Top 20
  }, [activeLevel, viewMode, selectedSubject, userStats]);

  // Get subjects available for the active level (for the dropdown)
  const availableSubjects = useMemo(() => {
      // We need to invert the SUBJECT_TOPICS or iterate keys to find valid subjects for this level
      // A simpler way based on existing SUBJECTS_BY_LEVEL in App.tsx (replicated logic here briefly)
      // Since we don't import SUBJECTS_BY_LEVEL from App, we filter keys from Subject enum if needed
      // Or just list all. For UI cleanliness, we'll iterate the enum.
      
      return Object.values(Subject).filter(subj => {
         // This is a rough filter. Ideally pass available subjects as prop. 
         // For now, listing all is okay, or we can assume most common ones.
         return true; 
      }).sort();
  }, []);

  return (
    <div className="max-w-5xl mx-auto animate-fade-in p-4 sm:p-0 pb-20">
      {/* Header Navigation */}
      <button 
        onClick={onHome}
        className="flex items-center text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 font-medium mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Home
      </button>

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-2xl mb-4 text-yellow-600 dark:text-yellow-500">
          <Trophy className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Leaderboard</h2>
        <p className="text-gray-600 dark:text-gray-400">See who is leading the charts in ZOT Dynamic Quizzes.</p>
      </div>

      {/* Level Tabs */}
      <div className="flex justify-center mb-8">
        <div className="bg-white dark:bg-gray-800 p-1.5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 inline-flex flex-wrap justify-center gap-2">
          {[EducationLevel.Primary, EducationLevel.JuniorSecondary, EducationLevel.SeniorSecondary].map((level) => (
            <button
              key={level}
              onClick={() => {
                  setActiveLevel(level);
                  setSelectedSubject('ALL'); // Reset subject on level change
              }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                activeLevel === level 
                ? 'bg-green-600 text-white shadow-md' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid lg:grid-cols-4 gap-6">
        
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Filter className="w-4 h-4 text-green-600" />
              Categories
            </h3>
            
            <div className="space-y-2">
              <button
                onClick={() => setViewMode('OVERALL')}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
                  viewMode === 'OVERALL' 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${viewMode === 'OVERALL' ? 'bg-green-200 dark:bg-green-800' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <Crown className="w-4 h-4" />
                  </div>
                  Overall Champions
                </div>
              </button>

              <button
                onClick={() => {
                    setViewMode('SUBJECT');
                    if (selectedSubject === 'ALL') setSelectedSubject(Subject.Mathematics); // Default to Math
                }}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
                  viewMode === 'SUBJECT' 
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                   <div className={`p-1.5 rounded-lg ${viewMode === 'SUBJECT' ? 'bg-blue-200 dark:bg-blue-800' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <BookOpen className="w-4 h-4" />
                  </div>
                  Subject Leaders
                </div>
              </button>
            </div>
            
            {/* Subject Dropdown - Only visible in Subject Mode */}
            {viewMode === 'SUBJECT' && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 animate-fade-in">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 block uppercase">Select Subject</label>
                <select 
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value as Subject)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {availableSubjects.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* User Stats Summary Card */}
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-5 shadow-lg text-white">
            <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
              <User className="w-5 h-5" />
              Your Stats
            </h3>
            <p className="text-green-100 text-xs mb-4 uppercase tracking-wide opacity-80">{activeLevel}</p>
            
            <div className="flex justify-between items-end">
               <div>
                  <div className="text-3xl font-bold">{userStats.score}</div>
                  <div className="text-green-100 text-xs">Total Points</div>
               </div>
               <div className="text-right">
                  <div className="text-xl font-bold">{userStats.quizzesTaken}</div>
                  <div className="text-green-100 text-xs">Quizzes</div>
               </div>
            </div>
          </div>
        </div>

        {/* Leaderboard List */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
             <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                <div>
                   <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                     {viewMode === 'OVERALL' ? `Top Students - ${activeLevel}` : `${selectedSubject} Leaders`}
                   </h3>
                   <p className="text-sm text-gray-500 dark:text-gray-400">
                     Based on cumulative quiz performance
                   </p>
                </div>
                <TrendingUp className="w-5 h-5 text-gray-400" />
             </div>

             <div className="divide-y divide-gray-100 dark:divide-gray-700">
               {leaderboardData.map((entry) => {
                 let rankIcon = <span className="text-gray-500 font-bold w-6 text-center">{entry.rank}</span>;
                 let rowClass = "hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors";
                 let scoreColor = "text-gray-600 dark:text-gray-300";

                 if (entry.rank === 1) {
                   rankIcon = <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center"><Medal className="w-5 h-5 text-yellow-600" /></div>;
                   scoreColor = "text-yellow-600 font-bold";
                 } else if (entry.rank === 2) {
                   rankIcon = <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"><Medal className="w-5 h-5 text-gray-500" /></div>;
                 } else if (entry.rank === 3) {
                   rankIcon = <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center"><Medal className="w-5 h-5 text-amber-700" /></div>;
                 }

                 if (entry.isUser) {
                   rowClass = "bg-green-50 dark:bg-green-900/10 hover:bg-green-100 dark:hover:bg-green-900/20 ring-1 ring-inset ring-green-200 dark:ring-green-800";
                 }

                 return (
                   <div key={entry.rank + entry.name} className={`p-4 flex items-center gap-4 ${rowClass}`}>
                     <div className="w-10 flex-shrink-0 flex justify-center">
                        {rankIcon}
                     </div>
                     
                     <div className="flex-grow">
                        <div className="flex items-center gap-2">
                           <span className={`font-bold ${entry.isUser ? 'text-green-700 dark:text-green-400' : 'text-gray-800 dark:text-white'}`}>
                             {entry.name} {entry.isUser && '(You)'}
                           </span>
                           {entry.rank <= 3 && <Star className="w-3 h-3 text-yellow-400 fill-current" />}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                           {entry.quizzesTaken} Quizzes Completed
                        </div>
                     </div>

                     <div className={`text-right ${scoreColor}`}>
                        <div className="text-lg">{entry.score.toLocaleString()}</div>
                        <div className="text-[10px] uppercase tracking-wider opacity-60">Points</div>
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardView;
