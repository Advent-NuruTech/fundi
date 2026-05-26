export const inventoryMaterials = [
  {
    id: "FAB-0001",
    name: "Premium Cotton",
    category: "Cotton Fabric",
    image:
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518",
    colors: [
      {
        name: "Black",
        hex: "#000000",
        stock: 85,
      },
      {
        name: "Green",
        hex: "#008000",
        stock: 44,
      },
      {
        name: "Yellow",
        hex: "#FFD700",
        stock: 20,
      },
    ],
    width: "45 inch",
    gsm: 180,
    unit: "Meters",
    supplier: "Nairobi Textile Hub",
    costPrice: 350,
    sellingPrice: 550,
    sizes: ["S", "M", "L", "XL", "XXL"],
    availableStock: 149,
    reservedStock: 15,
    location: "Rack A-2",
  },

  {
    id: "FAB-0002",
    name: "Italian Wool",
    category: "Suit Fabric",
    image:
      "https://images.unsplash.com/photo-1512436991641-6745cdb1723f",
    colors: [
      {
        name: "Navy Blue",
        hex: "#1E3A8A",
        stock: 65,
      },
      {
        name: "Gray",
        hex: "#6B7280",
        stock: 32,
      },
    ],
    width: "60 inch",
    gsm: 240,
    unit: "Meters",
    supplier: "Elite Fabrics Kenya",
    costPrice: 1200,
    sellingPrice: 1800,
    sizes: ["M", "L", "XL"],
    availableStock: 97,
    reservedStock: 20,
    location: "Rack B-1",
  },
];