import { Route, Navigation, MapPinned, Compass, Signpost, LocateFixed, MoveRight, CornerDownRight } from "lucide-react";

const IconPreview = () => {
  const icons = [
    { name: "Route", Icon: Route },
    { name: "Navigation", Icon: Navigation },
    { name: "MapPinned", Icon: MapPinned },
    { name: "Compass", Icon: Compass },
    { name: "Signpost", Icon: Signpost },
    { name: "LocateFixed", Icon: LocateFixed },
    { name: "MoveRight", Icon: MoveRight },
    { name: "CornerDownRight", Icon: CornerDownRight },
  ];

  return (
    <div className="flex flex-wrap gap-6 p-10 bg-background min-h-screen items-start justify-center pt-24">
      {icons.map(({ name, Icon }) => (
        <div key={name} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border bg-card shadow-sm min-w-[100px]">
          <Icon className="h-8 w-8 text-foreground" />
          <span className="text-xs font-medium text-muted-foreground">{name}</span>
        </div>
      ))}
    </div>
  );
};

export default IconPreview;
