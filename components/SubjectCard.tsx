
import React from 'react';
import { Subject } from '../types';
import { 
  BookOpen, Calculator, Dna, FlaskConical, Globe, Zap,
  Landmark, Map, BookHeart, TrendingUp, BarChart3, Monitor,
  Sprout, Feather, Sigma, Microscope, Users, Wrench, ChefHat,
  Briefcase, DraftingCompass, Palette, MessageCircle, UtensilsCrossed,
  Brain, Grid3X3
} from 'lucide-react';

interface SubjectCardProps {
  subject: Subject;
  onClick: (subject: Subject) => void;
}

const SubjectCard: React.FC<SubjectCardProps> = ({ subject, onClick }) => {
  const getIcon = () => {
    switch (subject) {
      case Subject.Mathematics: return <Calculator className="w-8 h-8 text-blue-500" />;
      case Subject.Biology: return <Dna className="w-8 h-8 text-green-500" />;
      case Subject.Physics: return <Zap className="w-8 h-8 text-yellow-500" />;
      case Subject.Chemistry: return <FlaskConical className="w-8 h-8 text-purple-500" />;
      case Subject.Civics: return <Globe className="w-8 h-8 text-orange-500" />;
      case Subject.English: return <BookOpen className="w-8 h-8 text-red-500" />;
      
      case Subject.History: return <Landmark className="w-8 h-8 text-amber-700" />;
      case Subject.Geography: return <Map className="w-8 h-8 text-emerald-600" />;
      case Subject.ReligiousEducation: return <BookHeart className="w-8 h-8 text-pink-500" />;
      case Subject.Commerce: return <TrendingUp className="w-8 h-8 text-indigo-500" />;
      case Subject.Accounts: return <BarChart3 className="w-8 h-8 text-slate-600" />;
      case Subject.ComputerStudies: return <Monitor className="w-8 h-8 text-cyan-500" />;
      case Subject.AgriculturalScience: return <Sprout className="w-8 h-8 text-lime-600" />;
      case Subject.Literature: return <Feather className="w-8 h-8 text-rose-400" />;
      case Subject.AdditionalMathematics: return <Sigma className="w-8 h-8 text-blue-700" />;
      
      case Subject.IntegratedScience: return <Microscope className="w-8 h-8 text-teal-500" />;
      case Subject.SocialStudies: return <Users className="w-8 h-8 text-orange-600" />;

      // New Subjects
      case Subject.CTS: return <Wrench className="w-8 h-8 text-stone-500" />;
      case Subject.HomeEconomics: return <ChefHat className="w-8 h-8 text-pink-400" />;
      case Subject.BusinessStudies: return <Briefcase className="w-8 h-8 text-indigo-600" />;
      case Subject.DesignAndTechnology: return <DraftingCompass className="w-8 h-8 text-slate-700" />;
      case Subject.ArtAndDesign: return <Palette className="w-8 h-8 text-fuchsia-500" />;
      case Subject.ZambianLanguages: return <MessageCircle className="w-8 h-8 text-amber-600" />;
      case Subject.French: return <Globe className="w-8 h-8 text-blue-400" />; // Reusing Globe or generic
      case Subject.FoodAndNutrition: return <UtensilsCrossed className="w-8 h-8 text-red-400" />;

      case Subject.SpecialPaper1: return <Brain className="w-8 h-8 text-violet-600" />;
      case Subject.SpecialPaper2: return <Grid3X3 className="w-8 h-8 text-cyan-600" />;

      default: return <BookOpen className="w-8 h-8 text-gray-500" />;
    }
  };

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
      case Subject.FoodAndNutrition: return "Diet, Cooking, Preservation & Health";

      case Subject.SpecialPaper1: return "Verbal Reasoning & English Aptitude";
      case Subject.SpecialPaper2: return "Non-Verbal Reasoning & Patterns";

      default: return "General Knowledge";
    }
  };

  return (
    <button
      onClick={() => onClick(subject)}
      className="flex flex-col items-start p-6 bg-white rounded-xl shadow-sm hover:shadow-md border border-gray-100 transition-all hover:border-green-400 hover:-translate-y-1 w-full text-left group"
    >
      <div className="p-3 bg-gray-50 rounded-lg mb-4 group-hover:bg-green-50 transition-colors">
        {getIcon()}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">{subject}</h3>
      <p className="text-sm text-gray-500">{getDescription()}</p>
    </button>
  );
};

export default SubjectCard;