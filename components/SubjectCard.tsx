
import React from 'react';
import { Subject } from '../types';
import { 
  BookOpen, Calculator, Dna, FlaskConical, Globe, Zap,
  Landmark, Map, BookHeart, TrendingUp, BarChart3, Monitor,
  Sprout, Feather, Sigma, Microscope, Users, Wrench, ChefHat,
  Briefcase, DraftingCompass, Palette, MessageCircle, UtensilsCrossed,
  Brain, Grid3X3, Music, Activity, Languages
} from 'lucide-react';

interface SubjectCardProps {
  subject: Subject;
  onClick: (subject: Subject) => void;
  isTeacherMode?: boolean; // Prop kept for API compatibility but not used for icon color
}

const SubjectCard: React.FC<SubjectCardProps> = ({ subject, onClick }) => {
  
  const getIconAndColor = () => {
    switch (subject) {
      case Subject.Mathematics: 
        return { icon: <Calculator className="w-8 h-8 text-blue-600" />, colorClass: "hover:border-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30" };
      case Subject.Biology: 
        return { icon: <Dna className="w-8 h-8 text-green-600" />, colorClass: "hover:border-green-400 group-hover:bg-green-50 dark:group-hover:bg-green-900/30" };
      case Subject.Physics: 
        return { icon: <Zap className="w-8 h-8 text-purple-600" />, colorClass: "hover:border-purple-400 group-hover:bg-purple-50 dark:group-hover:bg-purple-900/30" };
      case Subject.Chemistry: 
        return { icon: <FlaskConical className="w-8 h-8 text-teal-600" />, colorClass: "hover:border-teal-400 group-hover:bg-teal-50 dark:group-hover:bg-teal-900/30" };
      case Subject.Civics: 
        return { icon: <Globe className="w-8 h-8 text-orange-600" />, colorClass: "hover:border-orange-400 group-hover:bg-orange-50 dark:group-hover:bg-orange-900/30" };
      case Subject.English: 
        return { icon: <BookOpen className="w-8 h-8 text-pink-600" />, colorClass: "hover:border-pink-400 group-hover:bg-pink-50 dark:group-hover:bg-pink-900/30" };
      
      case Subject.History: 
        return { icon: <Landmark className="w-8 h-8 text-amber-600" />, colorClass: "hover:border-amber-400 group-hover:bg-amber-50 dark:group-hover:bg-amber-900/30" };
      case Subject.Geography: 
        return { icon: <Map className="w-8 h-8 text-emerald-600" />, colorClass: "hover:border-emerald-400 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30" };
      case Subject.ReligiousEducation: 
        return { icon: <BookHeart className="w-8 h-8 text-indigo-600" />, colorClass: "hover:border-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30" };
      case Subject.Commerce: 
        return { icon: <TrendingUp className="w-8 h-8 text-cyan-600" />, colorClass: "hover:border-cyan-400 group-hover:bg-cyan-50 dark:group-hover:bg-cyan-900/30" };
      case Subject.Accounts: 
        return { icon: <BarChart3 className="w-8 h-8 text-slate-600 dark:text-slate-400" />, colorClass: "hover:border-slate-400 group-hover:bg-slate-50 dark:group-hover:bg-slate-800" };
      case Subject.ComputerStudies: 
        return { icon: <Monitor className="w-8 h-8 text-gray-700 dark:text-gray-300" />, colorClass: "hover:border-gray-400 group-hover:bg-gray-100 dark:group-hover:bg-gray-700" };
      case Subject.AgriculturalScience: 
        return { icon: <Sprout className="w-8 h-8 text-lime-600" />, colorClass: "hover:border-lime-400 group-hover:bg-lime-50 dark:group-hover:bg-lime-900/30" };
      case Subject.Literature: 
        return { icon: <Feather className="w-8 h-8 text-rose-600" />, colorClass: "hover:border-rose-400 group-hover:bg-rose-50 dark:group-hover:bg-rose-900/30" };
      case Subject.AdditionalMathematics: 
        return { icon: <Sigma className="w-8 h-8 text-blue-700" />, colorClass: "hover:border-blue-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40" };
      
      case Subject.IntegratedScience: 
        return { icon: <Microscope className="w-8 h-8 text-teal-500" />, colorClass: "hover:border-teal-400 group-hover:bg-teal-50 dark:group-hover:bg-teal-900/30" };
      case Subject.SocialStudies: 
        return { icon: <Users className="w-8 h-8 text-orange-500" />, colorClass: "hover:border-orange-400 group-hover:bg-orange-50 dark:group-hover:bg-orange-900/30" };

      // New Subjects
      case Subject.CTS: 
        return { icon: <Wrench className="w-8 h-8 text-indigo-500" />, colorClass: "hover:border-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30" };
      case Subject.HomeEconomics: 
        return { icon: <ChefHat className="w-8 h-8 text-pink-500" />, colorClass: "hover:border-pink-400 group-hover:bg-pink-50 dark:group-hover:bg-pink-900/30" };
      case Subject.BusinessStudies: 
        return { icon: <Briefcase className="w-8 h-8 text-blue-800" />, colorClass: "hover:border-blue-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40" };
      case Subject.DesignAndTechnology: 
        return { icon: <DraftingCompass className="w-8 h-8 text-cyan-700" />, colorClass: "hover:border-cyan-500 group-hover:bg-cyan-100 dark:group-hover:bg-cyan-900/40" };
      case Subject.ArtAndDesign: 
        return { icon: <Palette className="w-8 h-8 text-fuchsia-600" />, colorClass: "hover:border-fuchsia-400 group-hover:bg-fuchsia-50 dark:group-hover:bg-fuchsia-900/30" };
      case Subject.ZambianLanguages: 
        return { icon: <MessageCircle className="w-8 h-8 text-yellow-600" />, colorClass: "hover:border-yellow-400 group-hover:bg-yellow-50 dark:group-hover:bg-yellow-900/30" };
      case Subject.French: 
        return { icon: <Globe className="w-8 h-8 text-blue-500" />, colorClass: "hover:border-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30" }; 
      case Subject.Chinese: 
        return { icon: <Languages className="w-8 h-8 text-red-600" />, colorClass: "hover:border-red-400 group-hover:bg-red-50 dark:group-hover:bg-red-900/30" };
      case Subject.FoodAndNutrition: 
        return { icon: <UtensilsCrossed className="w-8 h-8 text-orange-600" />, colorClass: "hover:border-orange-400 group-hover:bg-orange-50 dark:group-hover:bg-orange-900/30" };
      case Subject.Music: 
        return { icon: <Music className="w-8 h-8 text-violet-600" />, colorClass: "hover:border-violet-400 group-hover:bg-violet-50 dark:group-hover:bg-violet-900/30" };
      case Subject.MusicalArtsEducation: 
        return { icon: <Music className="w-8 h-8 text-violet-700" />, colorClass: "hover:border-violet-500 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/40" };
      case Subject.PhysicalEducation: 
        return { icon: <Activity className="w-8 h-8 text-green-500" />, colorClass: "hover:border-green-400 group-hover:bg-green-50 dark:group-hover:bg-green-900/30" };

      case Subject.SpecialPaper1: 
        return { icon: <Brain className="w-8 h-8 text-indigo-500" />, colorClass: "hover:border-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30" };
      case Subject.SpecialPaper2: 
        return { icon: <Grid3X3 className="w-8 h-8 text-purple-500" />, colorClass: "hover:border-purple-400 group-hover:bg-purple-50 dark:group-hover:bg-purple-900/30" };

      default: return { icon: <BookOpen className="w-8 h-8 text-gray-600" />, colorClass: "hover:border-gray-400 group-hover:bg-gray-50" };
    }
  };

  const { icon, colorClass } = getIconAndColor();

  const getDescription = () => {
     switch (subject) {
      case Subject.Mathematics: return "Algebra, Geometry, Calculus & Statistics";
      case Subject.Biology: return "Living organisms, Ecology & Genetics";
      case Subject.Physics: return "Mechanics, Electricity, Energy & Matter";
      case Subject.Chemistry: return "Atomic structure, Bonding & Reactions";
      case Subject.Civics: return "Governance, Human Rights & Development";
      case Subject.English: return "Grammar, Comprehension & Structure";

      case Subject.History: return "Zambian, African & World History";
      case Subject.Geography: return "Physical, Human & Economic Geography";
      case Subject.ReligiousEducation: return "Biblical studies & Moral values";
      case Subject.Commerce: return "Trade, Banking, Insurance & Transport";
      case Subject.Accounts: return "Financial statements, Ledgers & Balancing";
      case Subject.ComputerStudies: return "Hardware, Software, Networks & Coding";
      case Subject.AgriculturalScience: return "Crop production, Livestock & Soil science";
      case Subject.Literature: return "Novels, Plays, Poetry & Analysis";
      case Subject.AdditionalMathematics: return "Advanced Algebra, Trig & Calculus";
      
      case Subject.IntegratedScience: return "General Science, Health & Environment";
      case Subject.SocialStudies: return "History, Civics & Geography Combined";

      case Subject.CTS: return "Technology, Crafts & Entrepreneurship";
      case Subject.HomeEconomics: return "Hygiene, Food, Sewing & Home Management";
      case Subject.BusinessStudies: return "Office Practice, Trade & Entrepreneurship";
      case Subject.DesignAndTechnology: return "Technical Drawing, Materials & Design";
      case Subject.ArtAndDesign: return "Visual Arts, Crafts & Graphic Design";
      case Subject.ZambianLanguages: return "Local Languages Comprehension & Grammar";
      case Subject.French: return "Language Structure, Vocabulary & Translation";
      case Subject.Chinese: return "Mandarin grammar, vocabulary & culture";
      case Subject.FoodAndNutrition: return "Diet, Cooking, Preservation & Health";
      case Subject.Music: return "Rhythm, Melody, Harmony & Performance";
      case Subject.MusicalArtsEducation: return "Performance, Composition & Analysis";
      case Subject.PhysicalEducation: return "Fitness, Sports Skills & Health";

      case Subject.SpecialPaper1: return "Verbal Reasoning & English Aptitude";
      case Subject.SpecialPaper2: return "Non-Verbal Reasoning & Patterns";

      default: return "General Knowledge";
    }
  };

  return (
    <button
      onClick={() => onClick(subject)}
      className={`flex flex-col items-start p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 transition-all ${colorClass} hover:-translate-y-1 w-full text-left group`}
      aria-label={`Select subject ${subject}: ${getDescription()}`}
    >
      <div className={`p-3 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4 transition-colors`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{subject}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">{getDescription()}</p>
    </button>
  );
};

export default SubjectCard;
