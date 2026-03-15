import Link from 'next/link';

export default function FeatureShowcase() {
  return (
    <section className="py-24 px-6 md:px-12 lg:px-24">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-light tracking-tight text-black mb-6">
            Two powerful platforms based on the best audio AI models
          </h2>
          
          <div className="inline-flex bg-gray-100 rounded-full p-1 relative">
            {/* Active Toggle Background */}
            <div className="absolute left-1 top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full shadow-sm" />
            
            <button className="relative z-10 px-8 py-2.5 text-sm font-medium text-black rounded-full transition-colors">
              ElevenCreative
            </button>
            <button className="relative z-10 px-8 py-2.5 text-sm font-medium text-gray-500 rounded-full hover:text-black transition-colors">
              ElevenAgents
            </button>
          </div>
        </div>

        {/* Feature Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1 */}
          <div className="bg-[#F8F9FA] border border-gray-100 rounded-[2rem] p-10 hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between group">
            <div className="space-y-4 mb-12">
              <span className="inline-block px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-semibold text-black tracking-wide">
                Text to Speech
              </span>
              <h3 className="text-2xl font-medium text-black">
                Transform text into lifelike speech across 70+ languages
              </h3>
            </div>
            <div className="w-full aspect-video bg-red-600 rounded-2xl relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
                <div className="absolute inset-0 flex items-center justify-center text-white/50 font-bold tracking-widest text-sm">
                   [ TTS MOCKUP RED PLACEHOLDER ]
                </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#F8F9FA] border border-gray-100 rounded-[2rem] p-10 hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between group">
            <div className="space-y-4 mb-12">
              <span className="inline-block px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-semibold text-black tracking-wide">
                API
              </span>
              <h3 className="text-2xl font-medium text-black">
                Build sophisticated audio experiences at scale
              </h3>
            </div>
            <div className="w-full aspect-video bg-red-600 rounded-2xl relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
               <div className="absolute inset-0 flex items-center justify-center text-white/50 font-bold tracking-widest text-sm">
                   [ API MOCKUP RED PLACEHOLDER ]
                </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
