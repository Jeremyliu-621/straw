export default function TrustedBySection() {
  const logos = [
    { name: 'Washington Post', width: 'w-32' },
    { name: 'Spotify', width: 'w-28' },
    { name: 'Bloomberg', width: 'w-36' },
  ];

  return (
    <section className="w-full bg-[#FDFCFC]">
      <div className="w-full max-w-[1400px] mx-auto border-x border-gray-200 py-16 px-6 text-center">
      <h3 className="text-xs font-semibold tracking-widest text-gray-400 mb-8 uppercase text-center">
        Trusted by the world's most innovative engineering teams
      </h3>
      
      <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16 opacity-40 grayscale">
        {logos.map((logo, index) => (
          <div 
            key={index} 
            className={`h-8 bg-gray-900 rounded ${logo.width} flex items-center justify-center text-white text-xs font-bold tracking-wider`}
          >
            {logo.name}
          </div>
        ))}
      </div>
      </div>
    </section>
  );
}
