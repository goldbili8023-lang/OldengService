import { useState } from 'react';
import { useEffect } from 'react';
import { ChevronDown, Map, HelpCircle, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Card from '../../components/ui/Card';
import type { Tutorial } from '../../types';

const featureIcons: Record<string, React.ElementType> = {
  map: Map,
  help: HelpCircle,
  settings: Settings,
};

const defaultGuides = [
  {
    feature_name: 'map',
    title: 'How to Find Nearby Services',
    steps: [
      'Go to the "Map" tab.',
      'The map shows community services near you with colored dots.',
      'Tap "Near Me" to centre the map on your location.',
      'Use the filter buttons at the top to show only certain types of services.',
      'Tap on any dot to see details about that service.',
    ],
  },
  {
    feature_name: 'settings',
    title: 'How to Change Text Size and Contrast',
    steps: [
      'Tap the "Settings" icon (gear icon) in the navigation.',
      'Under "Font Size", choose Normal, Large, or Extra Large.',
      'Toggle "High Contrast Mode" on or off for easier reading.',
      'Your changes are saved automatically.',
    ],
  },
];

const faqs = [
  {
    q: 'What do the colored dots on the map mean?',
    a: 'Different colors represent different types of services: green for health, orange for food banks, blue for community centres, and so on.',
  },
  {
    q: 'Is my information private?',
    a: 'Yes. Your contacts, medications, and personal information are only visible to you when you are logged in.',
  },
];

const hiddenTutorialTitles = new Set([
  'Managing Your Emergency Contacts',
  'Setting Up Medication Reminders',
  'Staying Active with Exercise Resources',
]);

export default function HelpPage() {
  const [openGuide, setOpenGuide] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const visibleTutorials = tutorials.filter(
    tutorial => tutorial.feature_name !== 'contacts' && !hiddenTutorialTitles.has(tutorial.title),
  );

  useEffect(() => {
    supabase.from('tutorials').select('*').order('sort_order').then(({ data }) => {
      setTutorials(data || []);
    });
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Help & Tutorials</h1>
        <p className="text-gray-500 text-sm mt-1">Learn how to use SafeConnect</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Step-by-Step Guides</h2>
        <div className="space-y-3">
          {defaultGuides.map(guide => {
            const Icon = featureIcons[guide.feature_name] || HelpCircle;
            const isOpen = openGuide === guide.feature_name;
            return (
              <Card key={guide.feature_name} padding="sm">
                <button
                  onClick={() => setOpenGuide(isOpen ? null : guide.feature_name)}
                  className="w-full flex items-center gap-4 p-2 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-teal-600" />
                  </div>
                  <span className="flex-1 font-medium text-gray-900">{guide.title}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="mt-3 ml-16 space-y-3 pb-2">
                    <ol className="space-y-2">
                      {guide.steps.map((step, i) => (
                        <li key={i} className="flex gap-3 text-sm text-gray-600">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-semibold">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {visibleTutorials.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleTutorials.map(t => (
              <Card key={t.id} hover>
                <h3 className="font-semibold text-gray-900 mb-2">{t.title}</h3>
                <p className="text-sm text-gray-500">{t.content}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <Card key={i} padding="sm">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between p-2 text-left"
              >
                <span className="font-medium text-gray-900 pr-4">{faq.q}</span>
                <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <p className="mt-2 px-2 pb-2 text-sm text-gray-600">{faq.a}</p>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
