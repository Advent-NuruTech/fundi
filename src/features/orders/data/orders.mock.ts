export const orders = [
  {
    id: "ORD-001",

    customerName: "Grace Wanjiku",
    customerPhone: "0712345678",

    status: "In Progress",
    stage: "Cutting",
    employee: "John Tailor",

    total: 3000,
    paid: 2000,
    balanceDue: 1000,

    // 👇 snapshot from customer DB
    customerMeasurements: {
      chest: "34",
      waist: "28",
      hips: "38",
      height: "5'4\"",
    },

    // 👇 actual tailoring adjustments
    orderSizes: {
      chest: "34.5",
      waist: "27.5",
      hips: "38",
      sleeve: "22",
    },

    images: [
      "/orders/ord1-1.jpg",
      "/orders/ord1-2.jpg",
    ],
  },
];