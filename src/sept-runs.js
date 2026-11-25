// Apariciones de los caballos del 29/11 en La Zarzuela del 20/09 al 04/10/2026 (participantes definitivos + llegada oficial).
// pos fuera de los 5 primeros: tomada de la forma del programa siguiente de ese caballo.
const SEPT_RUNS = [
 {date:"2026-09-20",course:"La Zarzuela",r:1,dist:1400,cat:"C",of:9,name:"MELLO MELLO",pos:2,kg:57.5},
 {date:"2026-09-20",course:"La Zarzuela",r:3,dist:2200,cat:"D",of:11,name:"DANCELOT",pos:1,kg:62},
 {date:"2026-09-20",course:"La Zarzuela",r:4,dist:2200,cat:"D",of:11,name:"NAT IMPACT",pos:1,kg:57.5},
 {date:"2026-09-20",course:"La Zarzuela",r:4,dist:2200,cat:"D",of:11,name:"EOLO",pos:3,kg:59.5},
 {date:"2026-09-24",course:"La Zarzuela",r:1,dist:1600,cat:"D",of:8,name:"ZAMA",pos:1,kg:55.5},
 {date:"2026-09-24",course:"La Zarzuela",r:1,dist:1600,cat:"D",of:8,name:"ADHONOREM",pos:2,kg:55.5},
 {date:"2026-09-27",course:"La Zarzuela",r:1,dist:1600,cat:"C",of:13,name:"SKYRED",pos:6,kg:57},
 {date:"2026-09-27",course:"La Zarzuela",r:1,dist:1600,cat:"C",of:13,name:"DJIANGO",pos:2,kg:55.5},
 {date:"2026-09-27",course:"La Zarzuela",r:2,dist:1500,cat:"D",of:14,name:"DIAS FELICES",pos:4,kg:59.5},
 {date:"2026-09-27",course:"La Zarzuela",r:4,dist:1500,cat:"D",of:12,name:"AMAZONICO",pos:1,kg:61.5},
 {date:"2026-09-27",course:"La Zarzuela",r:4,dist:1500,cat:"D",of:12,name:"ANOTHER ROSE",pos:12,kg:62.5},
 {date:"2026-09-27",course:"La Zarzuela",r:4,dist:1500,cat:"D",of:12,name:"LADY COCODY",pos:10,kg:60.5},
 {date:"2026-09-27",course:"La Zarzuela",r:5,dist:2800,cat:"A",of:8,name:"LIGHT L'AUDRIELLE",pos:5,kg:57},
 {date:"2026-09-27",course:"La Zarzuela",r:6,dist:2200,cat:"B",of:8,name:"KINDLEO",pos:8,kg:60},
 {date:"2026-09-27",course:"La Zarzuela",r:6,dist:2200,cat:"B",of:8,name:"MASTER CATH",pos:6,kg:60},
 {date:"2026-10-04",course:"La Zarzuela",r:1,dist:1500,cat:"C",of:6,name:"REQUEJO LEGEND",pos:1,kg:57},
 {date:"2026-10-04",course:"La Zarzuela",r:1,dist:1500,cat:"C",of:6,name:"MELLO MELLO",pos:3,kg:56.5},
 {date:"2026-10-04",course:"La Zarzuela",r:1,dist:1500,cat:"C",of:6,name:"CHISTERA",pos:4,kg:54}
];
// Otras actuaciones dentro de la ventana (San Sebastián, Francia, 10/09 en La Zarzuela) y puestos exactos
// de la 6ª en adelante que las jornadas de entrenamiento solo guardan como "6+". g: 0 bueno, 1 bueno a blando, 2 blando, 3 muy blando.
const EXTRA_RUNS = [
 {date:"2026-09-02",course:"San Sebastián",dist:1600,cat:"C",of:6,name:"LADY COCODY",pos:3,g:0},
 {date:"2026-09-10",course:"La Zarzuela",dist:1500,cat:"C",of:8,name:"NEVER EVER",pos:3},
 {date:"2026-09-10",course:"La Zarzuela",dist:2400,cat:"C",of:9,name:"LIGHT L'AUDRIELLE",pos:5},
 {date:"2026-09-10",course:"La Zarzuela (fibra)",dist:1200,cat:"D",of:7,name:"CUDILLERO",pos:5},
 {date:"2026-09-30",course:"San Sebastián",dist:1400,cat:"C",of:8,name:"CUDILLERO",pos:5,g:1},
 {date:"2026-09-30",course:"San Sebastián",dist:2200,cat:"C",of:7,name:"SWEET WISH",pos:1,g:1},
 {date:"2026-10-02",course:"Dax (Francia)",dist:2300,cat:"FR",of:8,name:"RONCAL",pos:2,g:2,txt:"GP de la Ville de Dax"},
 {date:"2026-10-18",course:"La Zarzuela",dist:1600,of:12,name:"ANOTHER ROSE",pos:6},
 {date:"2026-10-18",course:"La Zarzuela",of:18,name:"ASAHI",pos:11},
 {date:"2026-10-18",course:"La Zarzuela",of:18,name:"NEVER EVER",pos:9},
 {date:"2026-10-18",course:"La Zarzuela",of:14,name:"BALOOK",pos:7},
 {date:"2026-10-25",course:"La Zarzuela",of:7,name:"REQUEJO LEGEND",pos:7}
];
if (typeof module!=="undefined") module.exports={SEPT_RUNS,EXTRA_RUNS};
