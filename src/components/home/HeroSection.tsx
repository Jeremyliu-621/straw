import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="relative w-full bg-[#FDFCFC] pt-[72px] overflow-hidden">
      
      {/* TOP HORIZONTAL BLOCK: Headline and Subheadline */}
      <div className="w-full border-b border-gray-200">
        <div className="w-full max-w-[1400px] mx-auto border-x border-gray-200 flex flex-col lg:flex-row">
          {/* Left Headline Area */}
          <div className="w-full lg:w-[65%] border-b lg:border-b-0 lg:border-r border-gray-200 p-8 sm:p-16 lg:p-20 xl:p-24 flex flex-col justify-end min-h-[400px] lg:min-h-[450px]">
            <h1 className="text-6xl sm:text-7xl lg:text-[84px] font-medium tracking-tight text-black leading-[1.05]">
              Bringing <br className="hidden sm:block" />
              technology to life
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-12">
              <Link
                href="#"
                className="bg-black text-white px-8 py-4 rounded-full text-[15px] font-medium hover:scale-105 transition-transform shadow-md shadow-black/10"
              >
                Sign up
              </Link>
              <Link
                href="#"
                className="bg-transparent border border-gray-300 text-black px-8 py-4 rounded-full text-[15px] font-medium hover:bg-black/5 transition-colors"
              >
                Contact sales
              </Link>
            </div>
          </div>

          {/* Right Sub-headline Area */}
          <div className="w-full lg:w-[35%] p-8 sm:p-16 lg:p-20 xl:p-24 flex flex-col justify-end">
            <p className="text-[#646464] text-[16px] leading-relaxed max-w-[320px]">
              Powering the best enterprises, creators, and developers. From the Agents Platform for customer experience, the Creative Platform for content creation, to the leading AI voice generator.
            </p>
          </div>
        </div>
      </div>

      {/* MAIN CARD BLOCK */}
      <div className="w-full border-b border-gray-200">
        <div className="w-full max-w-[1400px] mx-auto border-x border-gray-200 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-20 xl:p-24 relative bg-[#FDFCFC]">
          
          {/* Main App Card */}
          <div className="w-full max-w-5xl bg-[#F0F0F3] rounded-[32px] p-2 sm:p-2.5 shadow-[0_2px_4px_rgba(0,0,0,0.02),0_12px_40px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col border border-gray-200/50 relative z-10">
            
            {/* Nav Pills inside card */}
            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 p-1.5 sm:p-2 bg-white/60 m-1 sm:m-2 rounded-[24px] mb-2 sm:mb-4 backdrop-blur-sm shadow-sm ring-1 ring-black/5">
              {['Text to Speech', 'Agents', 'Music', 'Speech to Text', 'Voice Cloning'].map((tab, i) => (
                <span
                  key={tab}
                  className={`px-4 sm:px-6 py-2.5 rounded-full text-[13px] sm:text-[14px] font-medium cursor-pointer transition-colors ${
                    i === 0
                      ? 'bg-white shadow-sm text-black ring-1 ring-gray-100'
                      : 'text-gray-500 hover:text-black hover:bg-black/5'
                  }`}
                >
                  {tab}
                </span>
              ))}
            </div>

            {/* Inner Content Area */}
            <div className="flex flex-col lg:flex-row gap-2 sm:gap-4 p-1 sm:p-2 xl:min-h-[350px]">
              {/* Voice Sidebar */}
              <div className="w-full lg:w-1/3 flex flex-col gap-1.5 overflow-y-auto pr-1">
                {[
                  { name: 'Mark', tag: '', active: true, color: 'bg-blue-500' },
                  { name: 'Spuds Oxley', tag: 'Wise and Approachable', color: 'bg-orange-400' },
                  { name: 'James', tag: 'Husky, Engaging and Bold', color: 'bg-red-500' },
                  { name: 'Cassidy', tag: 'Crisp, Direct and Clear', color: 'bg-yellow-500' },
                  { name: 'Michael C. Vincent', tag: 'Confident, Expressive', color: 'bg-green-500' },
                ].map((voice) => (
                  <div
                    key={voice.name}
                    className={`flex items-center gap-4 p-3.5 rounded-[20px] cursor-pointer transition-colors ${
                      voice.active
                        ? 'bg-white shadow-sm ring-1 ring-gray-200/60'
                        : 'hover:bg-white/40'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full ${voice.color} flex items-center justify-center shrink-0 shadow-inner`}>
                      <div className="w-2.5 h-2.5 bg-white/90 rounded-full"></div>
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-[15px] font-medium text-black truncate">{voice.name}</span>
                      {voice.tag && <span className="text-[13px] text-gray-500 truncate">{voice.tag}</span>}
                    </div>
                    {voice.active && (
                      <div className="ml-auto bg-black text-white rounded-full p-2 w-8 h-8 flex items-center justify-center shadow-md shrink-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Text Input Area */}
              <div className="w-full lg:w-2/3 bg-white rounded-[24px] p-6 sm:p-8 relative flex flex-col shadow-sm border border-gray-100/50">
                <p className="text-gray-800 text-[16px] leading-relaxed">
                  In the ancient land of Eldoria, where skies shimmered and forests whispered secrets to the wind, lived a dragon named Zephyros.
                  <br />
                  <br />
                  <span className="text-gray-400 font-medium">[sarcastically]</span> Not the "burn it all down" kind...{' '}
                  <span className="text-gray-400 font-medium">[giggles]</span> but he was gentle, wise, with eyes like old stars.{' '}
                  <span className="text-gray-400 font-medium">[whispers]</span> Even the birds fell silent when he passed.
                </p>
                
                <div className="mt-8 lg:mt-auto pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <span className="text-[15px] font-medium text-gray-600 flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors w-max">
                    <span className="text-xl">🇺🇸</span> English
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                  </span>
                  <button className="bg-black text-white px-8 py-3.5 rounded-full text-[15px] font-semibold hover:scale-105 transition-transform shadow-[0_4px_14px_rgba(0,0,0,0.15)] w-full sm:w-auto">
                    Sign up
                  </button>
                </div>
              </div>
            </div>

            {/* Inner Card Footer */}
            <div className="flex justify-between items-center p-4 sm:px-6 sm:pb-4 sm:pt-4">
              <Link href="#" className="text-[14px] font-semibold text-gray-500 hover:text-black transition-colors">
                Explore 10,000+ voices
              </Link>
              <div className="flex gap-2">
                <button className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-black hover:border-gray-300 transition-colors shadow-sm">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-black hover:border-gray-300 transition-colors shadow-sm">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VIDEO/CREATIVE PORTRAIT CARDS BLOCK */}
      <div className="w-full border-b border-gray-200">
        <div className="w-full max-w-[1400px] mx-auto border-x border-gray-200 p-6 sm:p-12 lg:p-20 xl:p-24 bg-[#FDFCFC]">
          <div className="w-full max-w-5xl mx-auto flex flex-col md:flex-row gap-6">
            
            {/* Left column (Stacked images) */}
            <div className="flex-1 flex flex-col gap-6">
              {/* Top Video Card (Woman in forest) */}
              <div className="w-full aspect-[4/3] rounded-[32px] overflow-hidden relative shadow-[0_8px_30px_rgba(0,0,0,0.06)] group cursor-pointer">
                <img 
                  src="https://images.unsplash.com/photo-1542644917-06eb8d5e8db5?q=80&w=800&auto=format&fit=crop" 
                  alt="Woman in forest matching ElevenLabs aesthetic" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
                {/* Play button overlay */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center group-hover:bg-white/50 transition-colors">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="white" className="ml-1"><path d="M8 5v14l11-7z"/></svg>
                </div>
                {/* Tags overlay */}
                <div className="absolute bottom-4 left-4 flex gap-2">
                   <span className="bg-black/50 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-medium border border-white/10">Voiceover</span>
                   <span className="bg-black/50 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-medium border border-white/10">Nature</span>
                </div>
              </div>
              
              {/* Bottom Card (ElevenLabs Dark Logo Card) */}
              <div className="w-full aspect-[4/3] rounded-[32px] bg-[#0A0A0A] flex flex-col items-center justify-center p-8 text-center relative shadow-[0_8px_30px_rgba(0,0,0,0.08)] overflow-hidden">
                {/* Subtle light effect at top */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-white/5 blur-[50px] rounded-full"></div>
                
                <div className="flex items-center gap-1.5 tracking-tighter text-white font-semibold text-3xl sm:text-4xl mb-3 relative z-10">
                  <span className="font-light text-white/80">I I</span> ElevenLabs
                </div>
                <p className="text-white/60 text-[15px] relative z-10 max-w-[200px]">The leading AI voice generator platform</p>
              </div>
            </div>

            {/* Right column (Tall video card - Man on bike/treadmill) */}
            <div className="flex-[1.2] lg:flex-[1.5] w-full h-full min-h-[500px] md:min-h-0">
              <div className="w-full h-full rounded-[32px] overflow-hidden relative shadow-[0_8px_30px_rgba(0,0,0,0.06)] group cursor-pointer">
                <img 
                  src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=800&auto=format&fit=crop" 
                  alt="Man exercising with headphones" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                />
                {/* Play button overlay */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center group-hover:bg-white/50 transition-colors">
                   <svg width="22" height="22" viewBox="0 0 24 24" fill="white" className="ml-1"><path d="M8 5v14l11-7z"/></svg>
                </div>
                {/* Tags overlay */}
                <div className="absolute bottom-6 left-6 flex gap-2">
                   <span className="bg-black/40 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium border border-white/10">Podcast</span>
                   <span className="bg-black/40 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium border border-white/10">Fitness</span>
                </div>
                 <div className="absolute top-6 right-6">
                    <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden">
                       <img src="https://i.pravatar.cc/100?img=11" alt="Avatar" className="w-full h-full object-cover"/>
                    </div>
                 </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      
    </section>
  );
}
