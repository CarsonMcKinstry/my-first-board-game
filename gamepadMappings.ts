export interface ControllerMapping {
  A: string;
  B: string;
  X: string;
  Y: string;
  L1: string;
  L2: string;
  R1: string;
  R2: string;
}

export const mapping: Map<string, ControllerMapping> = new Map([
  [
    "0079",
    {
      A: "triangle",
      B: "cancel",
      X: "confirm",
      Y: "menu",
      L1: "l1",
      L2: "l2",
      R1: "r1",
      R2: "r2"
    }
  ],
  [
    "054c",
    {
      A: "confirm",
      B: "cancel",
      X: "menu",
      Y: "triangle",
      L1: "l1",
      L2: "l2",
      R1: "r1",
      R2: "r2"
    }
  ]
]);

interface ControlerInfo {
  vendor?: string;
  product?: string;
}

export const getMapping = (id: string) => {
  const { vendor } = id.split(" ").reduce((acc: ControlerInfo, val, i, arr) => {
    if (val === "Vendor:") {
      acc.vendor = arr[i + 1].replace(/\W+/gi, "");
    }

    if (val === "Product:") {
      acc.product = arr[i + 1].replace(/\W+/gi, "");
    }

    return acc;
  }, {});

  if (vendor && mapping.has(vendor)) {
    return mapping.get(vendor);
  }

  return;
};
