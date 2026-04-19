const UNIQUE_GLB_PATHS = [
  "/office-assets/models/furniture/desk.glb",
  "/office-assets/models/furniture/deskCorner.glb",
  "/office-assets/models/furniture/chairDesk.glb",
  "/office-assets/models/furniture/tableRound.glb",
  "/office-assets/models/furniture/loungeSofa.glb",
  "/office-assets/models/furniture/loungeDesignChair.glb",
  "/office-assets/models/furniture/bookcaseClosed.glb",
  "/office-assets/models/furniture/pottedPlant.glb",
  "/office-assets/models/furniture/table.glb",
  "/office-assets/models/furniture/kitchenCoffeeMachine.glb",
  "/office-assets/models/furniture/kitchenFridgeSmall.glb",
  "/office-assets/models/furniture/kitchenCabinet.glb",
  "/office-assets/models/furniture/computerScreen.glb",
  "/office-assets/models/furniture/lampRoundFloor.glb",
  "/office-assets/models/furniture/plantSmall1.glb",
];

export default function ArenaPreload() {
  return (
    <>
      {UNIQUE_GLB_PATHS.map((src) => (
        <link key={src} rel="preload" as="fetch" href={src} crossOrigin="anonymous" />
      ))}
    </>
  );
}
