export default function TrustedBySection() {
  const logos = [
    { name: 'Washington Post', width: 'w-32' },
    { name: 'Vogue', width: 'w-24' },
    { name: 'The New York Times', width: 'w-40' },
    { name: 'Spotify', width: 'w-28' },
    { name: 'Bloomberg', width: 'w-36' },
  ];

  return (
    <section className="py-16 px-6 max-w-7xl mx-auto text-center border-t border-gray-100">
      <h3 className="text-xs font-semibold tracking-widest text-gray-400 mb-8 uppercase">
        Trusted by leading developers
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
    </section>
  );
}
