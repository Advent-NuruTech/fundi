export function InventoryFilters() {
  return (
    <div className="flex flex-wrap gap-4 rounded-2xl border bg-white p-4">
      <input
        placeholder="Search fabrics..."
        className="rounded-xl border px-4 py-2"
      />

      <select className="rounded-xl border px-4 py-2">
        <option>All Categories</option>
        <option>Cotton</option>
        <option>Wool</option>
        <option>Silk</option>
      </select>

      <select className="rounded-xl border px-4 py-2">
        <option>All Colors</option>
        <option>Black</option>
        <option>Green</option>
        <option>Yellow</option>
      </select>

      <select className="rounded-xl border px-4 py-2">
        <option>All Sizes</option>
        <option>S</option>
        <option>M</option>
        <option>L</option>
        <option>XL</option>
      </select>
    </div>
  );
}