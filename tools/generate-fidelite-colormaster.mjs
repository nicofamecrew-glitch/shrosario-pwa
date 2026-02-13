const tones = [
  // Naturales
  "1","3","4","5","6","7","8","9",
  "5/0","6/0","7/0","8/0","9/0",
  "5/1","6/1","7/1","8/1","9/1",
  "5/11","6/11","7/11","8/11","9/11",
  "8/12","9/12",

  // Cenizas / irisados / dorados
  "6/7","7/7","8/7","9/7",
  "5/2","6/2","7/2","8/2","5/22","6/22",
  "5/3","6/3","7/3","8/3","9/3",
  "5/33","6/33","7/33","8/33","9/33",
  "6/31","7/31","8/31","9/31",

  // Dorados / cobrizos / chocolates / caobas
  "6/34","7/34","8/34",
  "5/8C","6/8C","7/8C","8/8C",
  "5/8F","6/8F","7/8F","8/8F",
  "6/4","7/4","8/4",
  "6/45","7/45","6/46","7/46",
  "4/5","5/5","6/5",

  // Rojizos / aclarantes / intensificadores
  "6/6","5/64","5/62","6/62","7/62",
  "5/66+R","6/66+R","7/66+R",
  "10","10/1","10/11","10/2","10/3",
  "10/4","100/0","100/1","100/2","100/3",
  "0/11","0/22","0/33","0/44","0/66","0/77","0/12","0/631"
];

function slugTone(t) {
  return t
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/\//g, "-");
}

const variants = tones.map(t => ({
  size: t,
  sku: `FID-CM-${slugTone(t)}`,
  priceRetail: 0,
  priceWholesale: 0,
  images: ["/product/fidelite-colormaster.png"]
}));

console.log(JSON.stringify(variants, null, 2));
