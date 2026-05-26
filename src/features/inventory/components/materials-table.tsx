import { MaterialCard } from "./material-card";

interface Props {
  materials: any[];
}

export function MaterialsTable({ materials }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {materials.map((material) => (
        <MaterialCard
          key={material.id}
          material={material}
        />
      ))}
    </div>
  );
}