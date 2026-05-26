export const customers = [
  {
    id: "CUST-001",
    name: "Grace Wanjiku",
    phone: "0712345678",

    totalOrders: 3,
    activeOrders: 1,
    lastVisit: "2026-05-20",

    balance: 2000,

    preferences: {
      style: "Ankara Modern",
      fit: "Slim",
    },

    measurements: {
      chest: "34",
      waist: "28",
      hips: "38",
      height: "5'4",
      shoulder: "16",
      sleeve: "24",
    },

    orders: [
      {
        id: "ORD-001",
        type: "Ankara Dress",
        status: "In Progress",

        images: [
          "/orders/ankara-1.jpg",
          "/orders/ankara-2.jpg",
          "/orders/ankara-3.jpg",
        ],

        employee: "John Tailor",

        total: 5000,
        paid: 3000,
        balance: 2000,

        progress: 65,

        collectionDate: "2026-05-30",
      },

      {
        id: "ORD-002",
        type: "Corporate Suit",
        status: "Completed",

        images: [
          "/orders/suit-1.jpg",
          "/orders/suit-2.jpg",
        ],

        employee: "Mary Tailor",

        total: 12000,
        paid: 12000,
        balance: 0,

        progress: 100,

        collectionDate: "2026-05-10",
      },

      {
        id: "ORD-003",
        type: "Casual Shirt",
        status: "Delivered",

        images: [
          "/orders/shirt-1.jpg",
        ],

        employee: "David Tailor",

        total: 2500,
        paid: 2500,
        balance: 0,

        progress: 100,

        collectionDate: "2026-05-01",
      },
    ],

    payments: [
      {
        id: "PAY-001",
        date: "2026-05-01",
        amount: 2000,
      },
      {
        id: "PAY-002",
        date: "2026-05-15",
        amount: 1500,
      },
      {
        id: "PAY-003",
        date: "2026-05-25",
        amount: 3000,
      },
    ],
  },

  {
    id: "CUST-002",
    name: "Peter Mwangi",
    phone: "0722334455",

    totalOrders: 2,
    activeOrders: 1,
    lastVisit: "2026-05-22",

    balance: 1500,

    preferences: {
      style: "Corporate Wear",
      fit: "Regular",
    },

    measurements: {
      chest: "40",
      waist: "36",
      hips: "38",
      height: "5'9",
      shoulder: "18",
      sleeve: "26",
    },

    orders: [
      {
        id: "ORD-010",
        type: "Office Suit",

        status: "In Progress",

        images: [
          "/orders/suit-male-1.jpg",
          "/orders/suit-male-2.jpg",
        ],

        employee: "John Tailor",

        total: 8000,
        paid: 6500,
        balance: 1500,

        progress: 80,

        collectionDate: "2026-05-28",
      },
    ],

    payments: [
      {
        id: "PAY-010",
        date: "2026-05-10",
        amount: 3000,
      },
      {
        id: "PAY-011",
        date: "2026-05-18",
        amount: 3500,
      },
    ],
  },

  {
    id: "CUST-003",
    name: "Amina Noor",
    phone: "0700112233",

    totalOrders: 1,
    activeOrders: 1,
    lastVisit: "2026-05-24",

    balance: 0,

    preferences: {
      style: "Hijab Fashion",
      fit: "Loose Elegant",
    },

    measurements: {
      chest: "36",
      waist: "30",
      hips: "40",
      height: "5'6",
    },

    orders: [
      {
        id: "ORD-020",
        type: "Elegant Gown",

        status: "In Progress",

        images: [
          "/orders/gown-1.jpg",
          "/orders/gown-2.jpg",
        ],

        employee: "Mary Tailor",

        total: 10000,
        paid: 10000,
        balance: 0,

        progress: 50,

        collectionDate: "2026-06-02",
      },
    ],

    payments: [
      {
        id: "PAY-020",
        date: "2026-05-20",
        amount: 10000,
      },
    ],
  },
];